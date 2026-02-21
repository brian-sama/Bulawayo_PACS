import hashlib
import hmac
import qrcode
import fitz  # PyMuPDF
import io
from io import BytesIO
from django.core.files.base import ContentFile
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, generics, status, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import (
    User, Department, Architect, StandProperty, Plan,
    PlanVersion, Comment, Flag, Receipt, Approval, AuditLog,
    PlanStatus, UserRole, FlagType, FlagCategory,
    CategoryDepartmentMapping, DepartmentReview, DepartmentReviewStatus
)
from .engines import AreaCalculationEngine, AutoFlaggingEngine
from .serializers import (
    RegisterSerializer, UserSerializer, CreateUserSerializer, AdminUpdateUserSerializer,
    DepartmentSerializer, ArchitectSerializer, StandPropertySerializer,
    PlanListSerializer, PlanDetailSerializer, PlanVersionSerializer,
    CommentSerializer, FlagSerializer, ReceiptSerializer,
    ApprovalSerializer, AuditLogSerializer
)
from .permissions import IsAdmin, IsStaffOrAbove, IsReceptionOrAbove, IsOwnerOrStaff


def log_action(user, action, target_model, target_id, old_value=None, new_value=None, request=None):
    ip = None
    if request:
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        ip = x_forwarded.split(',')[0] if x_forwarded else request.META.get('REMOTE_ADDR')
    AuditLog.objects.create(
        user=user, action=action, target_model=target_model,
        target_id=target_id, old_value=old_value, new_value=new_value, ip_address=ip
    )


# ─────────────────────────────────────────────
# AUTH VIEWS
# ─────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        log_action(user, 'USER_REGISTERED', 'User', user.id)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


# ─────────────────────────────────────────────
# USER MANAGEMENT (Admin only)
# ─────────────────────────────────────────────

class UserViewSet(viewsets.ModelViewSet):
    """Admin-only endpoint for managing staff accounts."""
    queryset = User.objects.all().order_by('role', 'full_name')
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['email', 'full_name', 'id_number']
    ordering_fields = ['role', 'full_name', 'created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateUserSerializer
        if self.action in ['update', 'partial_update']:
            return AdminUpdateUserSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        log_action(
            self.request.user, 'USER_CREATED', 'User', user.id,
            new_value={'email': user.email, 'role': user.role},
            request=self.request
        )

    def perform_update(self, serializer):
        old_role = serializer.instance.role
        user = serializer.save()
        log_action(
            self.request.user, 'USER_UPDATED', 'User', user.id,
            old_value={'role': old_role},
            new_value={'role': user.role},
            request=self.request
        )

        return Response({'detail': f'{user.email} has been deactivated.'}, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        """Soft-delete: deactivate instead of deleting."""
        user = self.get_object()
        if user == request.user:
            return Response(
                {'error': 'You cannot deactivate your own account.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        old_active = user.is_active
        user.is_active = False
        user.save()
        log_action(
            request.user, 'USER_DEACTIVATED', 'User', user.id,
            old_value={'is_active': old_active},
            new_value={'is_active': False},
            request=request
        )
        return Response({'detail': f'{user.email} has been deactivated.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def permanently_delete(self, request, pk=None):
        """Permanent deletion of a user account."""
        user = self.get_object()
        if user == request.user:
            return Response(
                {'error': 'You cannot delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        email = user.email
        user.delete()
        log_action(
            request.user, 'USER_DELETED', 'User', pk,
            old_value={'email': email},
            request=request
        )
        return Response({'detail': f'User {email} has been permanently deleted.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def reactivate(self, request, *args, **kwargs):
        """Reactivate a previously deactivated user."""
        user = self.get_object()
        if user.is_active:
            return Response(
                {'error': 'This account is already active.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        old_active = user.is_active
        user.is_active = True
        user.save()
        log_action(
            request.user, 'USER_REACTIVATED', 'User', user.id,
            old_value={'is_active': old_active},
            new_value={'is_active': True},
            request=request
        )
        return Response({'detail': f'{user.email} has been reactivated.'}, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────
# DEPARTMENT
# ─────────────────────────────────────────────

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdmin()]


# ─────────────────────────────────────────────
# ARCHITECT
# ─────────────────────────────────────────────

class ArchitectViewSet(viewsets.ModelViewSet):
    queryset = Architect.objects.all()
    serializer_class = ArchitectSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['full_name', 'registration_no']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdmin()]


# ─────────────────────────────────────────────
# PROPERTY
# ─────────────────────────────────────────────

class PropertyViewSet(viewsets.ModelViewSet):
    queryset = StandProperty.objects.all()
    serializer_class = StandPropertySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['stand_number', 'address', 'suburb']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsReceptionOrAbove()]


# ─────────────────────────────────────────────
# PLAN
# ─────────────────────────────────────────────

class PlanViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwnerOrStaff]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['plan_id', 'stand__address', 'stand__stand_number']
    ordering_fields = ['created_at', 'status', 'category']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        qs = Plan.objects.select_related('stand', 'architect', 'client').prefetch_related('flags', 'versions')

        if user.role == UserRole.CLIENT:
            return qs.filter(client=user)
        
        if user.role == UserRole.RECEPTION:
            # Reception sees plans in SUBMITTED, PRE_SCREENING or REJECTED_PRE_SCREEN
            return qs.filter(status__in=[PlanStatus.SUBMITTED, PlanStatus.PRE_SCREENING, PlanStatus.REJECTED_PRE_SCREEN])
        
        if user.role in [UserRole.DEPT_OFFICER, UserRole.DEPT_HEAD]:
            # Technical staff see plans that HAVE a review record for their department
            if user.department:
                return qs.filter(
                    versions__department_reviews__department=user.department
                ).distinct()
            return qs.none()
            
        if user.role == UserRole.FINAL_APPROVER:
            # Final Approver sees plans that are ready for seal (e.g. IN_REVIEW but all depts approved)
            # We can filter here or let the frontend filter, but backend is safer.
            return qs.filter(status=PlanStatus.IN_REVIEW)
            
        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PlanDetailSerializer
        return PlanListSerializer

    def create(self, request, *args, **kwargs):
        # 1. Extract and Handle Property (StandProperty)
        stand_number = request.data.get('stand_number')
        suburb = request.data.get('suburb', '')
        
        if not stand_number:
            return Response({'error': 'Stand number is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        stand, created = StandProperty.objects.get_or_create(
            stand_number=stand_number,
            defaults={'address': f"{stand_number}, {suburb}", 'suburb': suburb}
        )
        
        # 2. Prepare Plan Data
        data = request.data.copy()
        data['stand'] = stand.id
        data['client'] = request.user.id
        
        # 3. Handle Boolean Toggles (from string "true"/"false")
        if 'is_owner' in data:
            data['is_owner'] = data['is_owner'].lower() == 'true'
            
        # 4. Serialize and Save
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        plan = serializer.save(client=request.user)
        
        # 5. Handle Architectural Plans (Multiple files)
        # Frontend sends plan_file_0, plan_file_1...
        plan_files = [v for k, v in request.FILES.items() if k.startswith('plan_file_')]
        if plan_files:
            # Create the first version with the first file
            version = PlanVersion.objects.create(
                plan=plan,
                version_number=1,
                file=plan_files[0],
                uploaded_by=request.user,
                notes="Initial submission"
            )
            # Log version creation
            log_action(request.user, 'VERSION_ADDED', 'PlanVersion', version.id, request=request)
            
        # 6. Parse and Save Shapes (Engine A)
        shapes_raw = request.data.get('shapes')
        if shapes_raw:
            try:
                import json
                shapes_list = json.loads(shapes_raw)
                # We can store shapes or run Engine A immediately
                area_engine = AreaCalculationEngine()
                result = area_engine.verify_plan_area(float(request.data.get('declared_area', 0)), shapes_list)
                calc_area = result['calculated_area']
                plan.calculated_area = calc_area
                plan.save()
            except Exception as e:
                print(f"Error parsing shapes: {e}")

        # 7. Finalize Status
        plan.status = PlanStatus.SUBMITTED # Or PRE_SCREENING as per user flow
        plan.save()
        
        log_action(request.user, 'PLAN_SUBMITTED', 'Plan', plan.id,
                   new_value={'plan_id': plan.plan_id}, request=request)
                   
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        # Overridden by create() above
        pass

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        plan = serializer.save()
        if old_status != plan.status:
            log_action(self.request.user, 'STATUS_CHANGED', 'Plan', plan.id,
                       old_value={'status': old_status},
                       new_value={'status': plan.status}, request=self.request)

    @action(detail=True, methods=['post'], permission_classes=[IsReceptionOrAbove])
    def submit_to_review(self, request, pk=None):
        """Reception approves plan to enter the review pool."""
        plan = self.get_object()
        if plan.status not in [PlanStatus.PRE_SCREENING, PlanStatus.SUBMITTED]:
            return Response({'error': 'Plan must be in PRE_SCREENING or SUBMITTED status.'}, 
                             status=status.HTTP_400_BAD_REQUEST)
        
        # Check if there are any unresolved ERROR flags
        error_flags = plan.flags.filter(flag_type='ERROR', is_resolved=False)
        if error_flags.exists():
            return Response({'error': 'Cannot submit to review. There are unresolved ERROR flags.',
                            'flags': list(error_flags.values_list('message', flat=True))},
                            status=status.HTTP_400_BAD_REQUEST)

        current_version = plan.get_current_version()
        if not current_version:
             return Response({'error': 'No plan version found to attach reviews to.'}, 
                            status=status.HTTP_400_BAD_REQUEST)

        # WORKFLOW ENGINE: Create Department Reviews
        # 1. Identify required departments based on Category
        required_mappings = CategoryDepartmentMapping.objects.filter(category=plan.category)
        
        target_depts = []
        if required_mappings.exists():
            target_depts = [m.department for m in required_mappings]
        else:
            # Fallback: All departments marked as 'is_required' globally
            target_depts = list(Department.objects.filter(is_required=True))

        created_count = 0
        for dept in target_depts:
            # Create review record if not exists
            review, created = DepartmentReview.objects.get_or_create(
                plan_version=current_version,
                department=dept,
                defaults={
                    'officer_status': DepartmentReviewStatus.PENDING,
                    'head_status': DepartmentReviewStatus.PENDING
                }
            )
            if created:
                created_count += 1

        old = plan.status
        plan.status = PlanStatus.IN_REVIEW # Updated from REVIEW_POOL to IN_REVIEW per new spec
        plan.save()
        
        log_action(request.user, 'STATUS_CHANGED', 'Plan', plan.id,
                   old_value={'status': old}, new_value={'status': plan.status}, request=request)
                   
        return Response({
            'status': plan.status,
            'reviews_created': created_count,
            'departments': [d.name for d in target_depts]
        })


class DepartmentReviewViewSet(viewsets.ModelViewSet):
    """
    Handles Officer and Head reviews for specific departments.
    """
    # queryset = DepartmentReview.objects.all() # We'll define distinct querysets per action or role
    serializer_class = PlanDetailSerializer # Placeholder, we need a specific serializer usually
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Users should only see reviews relevant to their department
        user = self.request.user
        if user.role in [UserRole.DEPT_OFFICER, UserRole.DEPT_HEAD] and user.department:
            return DepartmentReview.objects.filter(department=user.department)
        if user.role in [UserRole.ADMIN, UserRole.FINAL_APPROVER, UserRole.RECEPTION]:
            return DepartmentReview.objects.all()
        return DepartmentReview.objects.none()

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAbove])
    def evaluate(self, request, pk=None):
        """
        Generic endpoint for Officer or Head to submit their evaluation.
        Payload: { "role": "OFFICER"|"HEAD", "status": "APPROVED"|"REJECTED"|"CORRECTIONS", "comment": "..." }
        """
        review = self.get_object()
        user = request.user
        
        # Security check: Ensure user belongs to this department (unless Admin)
        if user.role != UserRole.ADMIN and user.department != review.department:
             return Response({'error': 'You do not belong to this department.'}, status=403)

        role = request.data.get('role') # OFFICER or HEAD
        decision = request.data.get('status')
        comment = request.data.get('comment', '')

        if role == 'OFFICER':
            if user.role not in [UserRole.DEPT_OFFICER, UserRole.DEPT_HEAD, UserRole.ADMIN]:
                 return Response({'error': 'Role mismatch.'}, status=403)
            
            # Map frontend basic status to internal enum
            status_map = {
                'APPROVED': DepartmentReviewStatus.OFFICER_APPROVED,
                'REJECTED': DepartmentReviewStatus.OFFICER_REJECTED,
                'CORRECTIONS': DepartmentReviewStatus.OFFICER_CORRECTIONS
            }
            if decision not in status_map:
                 return Response({'error': 'Invalid status.'}, status=400)

            review.officer = user
            review.officer_status = status_map[decision]
            review.officer_comment = comment
            review.officer_acted_at = timezone.now()
            review.save()

        elif role == 'HEAD':
            if user.role not in [UserRole.DEPT_HEAD, UserRole.ADMIN]:
                 return Response({'error': 'Only Department Head can perform this action.'}, status=403)

            status_map = {
                'APPROVED': DepartmentReviewStatus.HEAD_CONFIRMED,
                'REJECTED': DepartmentReviewStatus.HEAD_REJECTED
            }
            if decision not in status_map:
                 return Response({'error': 'Invalid status. Head can only Confirm or Reject.'}, status=400)

            review.head = user
            review.head_status = status_map[decision]
            review.head_comment = comment
            review.head_acted_at = timezone.now()
            review.save()
            
        else:
            return Response({'error': 'Invalid role specified.'}, status=400)
            
        # Trigger Global Status Update
        plan = review.plan_version.plan
        old_global = plan.status
        plan.get_global_status() # This just returns color, we need to apply it.
        # Check current global status
        color, new_global_status = plan.get_global_status()
        
        if plan.status != new_global_status:
            plan.status = new_global_status
            plan.save()
            log_action(user, 'GLOBAL_STATUS_UPDATE', 'Plan', plan.id, 
                       old_value={'status': old_global}, new_value={'status': plan.status})

        return Response({'status': 'Success', 'review_status': review.officer_status if role=='OFFICER' else review.head_status})

    @action(detail=True, methods=['post'], permission_classes=[IsOwnerOrStaff])
    def run_auto_checks(self, request, pk=None):
        """Trigger Engine B (Auto-Flagging) to check for pre-screening issues."""
        plan = self.get_object()
        engine = AutoFlaggingEngine()
        suggested_flags = engine.run_pre_screening(plan)
        
        flags_created = []
        for f_data in suggested_flags:
            # Check if an identical unresolved flag already exists
            if not Flag.objects.filter(plan=plan, category=f_data['category'], 
                                     message=f_data['message'], is_resolved=False).exists():
                flag = Flag.objects.create(
                    plan=plan,
                    flag_type=f_data['flag_type'],
                    category=f_data['category'],
                    message=f_data['message']
                )
                flags_created.append(FlagSerializer(flag).data)
        
        return Response({
            'detail': f'Auto-checks completed. {len(flags_created)} new flags raised.',
            'new_flags': flags_created
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def verify_area(self, request, pk=None):
        """Engine A: Calculate area from shapes and verify against declared area."""
        plan = self.get_object()
        declared_area = request.data.get('declared_area')
        shapes = request.data.get('shapes', [])
        
        if declared_area is None:
            return Response({'error': 'declared_area is required.'}, status=400)
        
        engine = AreaCalculationEngine()
        result = engine.verify_plan_area(float(declared_area), shapes)
        
        # Save results to plan
        plan.declared_area = result['declared_area']
        plan.calculated_area = result['calculated_area']
        plan.save()
        
        # Auto-raise flag if mismatch
        if result['flag_triggered']:
            Flag.objects.get_or_create(
                plan=plan,
                category=FlagCategory.AREA_MISMATCH,
                is_resolved=False,
                defaults={
                    'flag_type': FlagType.ERROR,
                    'message': result['message']
                }
            )
            
        return Response(result)

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAbove])
    def compute_status(self, request, pk=None):
        """Force re-calculation of global status based on Department Reviews."""
        plan = self.get_object()
        current_version = plan.get_current_version()
        if not current_version:
             return Response({'error': 'No plan version found.'}, status=400)

        # Use the central logic in models.py
        color, new_status = plan.get_global_status()
        
        old_status = plan.status
        if old_status != new_status:
            plan.status = new_status
            plan.save()
            log_action(request.user, 'STATUS_COMPUTED', 'Plan', plan.id,
                    old_value={'status': old_status},
                    new_value={'status': plan.status}, request=request)
        
        return Response({'status': plan.status, 'color': color})

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAbove])
    def approve_final(self, request, pk=None):
        """Apply final approval and lock the plan."""
        plan = self.get_object()
        
        # 1. Verification Checklist
        if request.user.role != UserRole.FINAL_APPROVER and request.user.role != UserRole.ADMIN:
            return Response({'error': 'Only the Final Approver or Admin can seal a plan.'}, 
                            status=status.HTTP_403_FORBIDDEN)

        current_version = plan.get_current_version()
        if not current_version:
            return Response({'error': 'No plan version found.'}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Check Secondary Signing Password
        signing_password = request.data.get('signing_password')
        if not signing_password or not request.user.check_signing_password(signing_password):
            return Response({'error': 'Invalid signing password.'}, status=status.HTTP_401_UNAUTHORIZED)

        # 3. Ensure all required departments have voted APPROVED
        required_depts = Department.objects.filter(is_required=True)
        approved_dept_ids = set(
            Comment.objects.filter(
                plan_version=current_version,
                status_vote='APPROVED'
            ).values_list('department_id', flat=True)
        )
        missing = required_depts.exclude(id__in=approved_dept_ids)
        if missing.exists():
            return Response({
                'error': 'Not all required departments have approved.',
                'missing': list(missing.values_list('name', flat=True))
            }, status=status.HTTP_400_BAD_REQUEST)

        # 4. Generate Cryptographic Signature Hash
        timestamp = timezone.now()
        hash_input = f'{plan.plan_id}:{current_version.id}:{request.user.id}:{timestamp.isoformat()}'
        sig_hash = hashlib.sha256(hash_input.encode()).hexdigest()

        # 5. Create Approval Record
        approval = Approval(
            plan=plan,
            approved_by=request.user,
            signature_hash=sig_hash,
            notes=request.data.get('notes', ''),
            timestamp=timestamp
        )

        # 6. Apply Executive Seal to PDF
        current_version = plan.get_current_version()
        if current_version and current_version.file:
            try:
                # Open the existing PDF from storage
                # Generate QR Code
                import qrcode
                from datetime import datetime
                qr = qrcode.QRCode(version=1, box_size=10, border=5)
                qr.add_data(f"BCC APPROVED: {plan.plan_id} | {datetime.now().date()}")
                qr.make(fit=True)
                img = qr.make_image(fill_color="black", back_color="white")
                
                input_path = current_version.file.path
                doc = fitz.open(input_path)
                page = doc[0]
                
                # Stamp coordinates
                page_width = page.rect.width
                rect = fitz.Rect(page_width - 150, 50, page_width - 50, 150)
                
                # Insert Image
                buffer = BytesIO()
                img.save(buffer, format='PNG')
                page.insert_image(rect, stream=buffer.getvalue())
                
                # Red Text Stamp
                text_point = fitz.Point(page_width - 165, 165)
                stamp_text = f"BCC APPROVED: {plan.plan_id}"
                page.insert_text(text_point, stamp_text, fontsize=12, color=(1, 0, 0), fontname="helv", bold=True)
                
                # Save to a new buffer and then back to approval model
                out_buffer = BytesIO()
                doc.save(out_buffer, garbage=4, deflate=True)
                doc.close()
                
                final_pdf = ContentFile(out_buffer.getvalue(), name=f'APPROVED_{plan.plan_id}.pdf')
                # Optional: We could save this to a new field in Approval or replace the original
                # For now, let's store it as the 'sealed_document' in the approval record
                approval.qr_code.save(f'qr_{plan.plan_id}.png', ContentFile(buffer.getvalue()), save=False)
                approval.sealed_document = final_pdf
                approval.save()
            except Exception as e:
                log_action(request.user, 'STAMPING_FAILED', 'Plan', plan.id, new_value={'error': str(e)}, request=request)
                # Fallback to just saving the approval record without stamping if it fails
                approval.save()

        # 7. Finalize Plan Status
        plan.status = PlanStatus.APPROVED
        plan.save()

        log_action(request.user, 'PLAN_APPROVED', 'Plan', plan.id,
                   new_value={'signature_hash': sig_hash}, request=request)
        
        return Response(ApprovalSerializer(approval).data)


# ─────────────────────────────────────────────
# COMMENT
# ─────────────────────────────────────────────

class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Comment.objects.select_related('department', 'author', 'plan_version')
        if user.role == UserRole.CLIENT:
            # Clients only see non-internal comments on their own plans
            return qs.filter(
                plan_version__plan__client=user,
                is_internal=False
            )
        
        if user.role in [UserRole.DEPT_OFFICER, UserRole.DEPT_HEAD]:
            # Staff see comments for plans they have access to
            # But they should probably see ALL comments for those plans (Round Table)
            return qs.filter(plan_version__plan__in=PlanViewSet().get_queryset(self.request))
            
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsStaffOrAbove()]
        return [IsAuthenticated()]


# ─────────────────────────────────────────────
# FLAG
# ─────────────────────────────────────────────

class FlagViewSet(viewsets.ModelViewSet):
    queryset = Flag.objects.select_related('plan', 'plan_version', 'resolved_by')
    serializer_class = FlagSerializer
    permission_classes = [IsReceptionOrAbove]

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        flag = self.get_object()
        flag.is_resolved = True
        flag.resolved_by = request.user
        flag.resolved_at = timezone.now()
        flag.save()
        log_action(request.user, 'FLAG_RESOLVED', 'Flag', flag.id, request=request)
        return Response(FlagSerializer(flag).data)


# ─────────────────────────────────────────────
# AUDIT LOG
# ─────────────────────────────────────────────

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('user').order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ['action', 'target_model', 'user__full_name']
