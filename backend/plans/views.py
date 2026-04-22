import hashlib
import fitz  # PyMuPDF
from decimal import Decimal, InvalidOperation
from io import BytesIO
from django.core.files.base import ContentFile
from django.http import FileResponse
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
    CategoryDepartmentMapping, DepartmentReview, DepartmentReviewStatus,
    DepartmentReviewStage,
    ChecklistTemplate, RequiredDocument, SubmittedDocument,
    ProformaInvoice, ProformaLineItem, PaymentReceipt, ProformaInvoiceStatus,
    FinalDecision, Notification,
)
from .engines import AreaCalculationEngine, AutoFlaggingEngine
from .serializers import (
    RegisterSerializer, UserSerializer, CreateUserSerializer, AdminUpdateUserSerializer,
    DepartmentSerializer, ArchitectSerializer, StandPropertySerializer,
    PlanListSerializer, PlanDetailSerializer, PlanVersionSerializer,
    CommentSerializer, FlagSerializer, ReceiptSerializer,
    ApprovalSerializer, AuditLogSerializer, DepartmentReviewSerializer,
    ChecklistTemplateSerializer, RequiredDocumentSerializer,
    SubmittedDocumentSerializer, ProformaInvoiceSerializer,
    ProformaLineItemSerializer, PaymentReceiptSerializer,
    FinalDecisionSerializer, NotificationSerializer,
)
from .permissions import IsAdmin, IsStaffOrAbove, IsReceptionOrAbove, IsOwnerOrStaff
from .services.notifications import dispatch_notification


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def log_action(user, action, target_model, target_id, old_value=None, new_value=None, request=None):
    ip = None
    if request:
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        ip = x_forwarded.split(',')[0] if x_forwarded else request.META.get('REMOTE_ADDR')
    AuditLog.objects.create(
        user=user, action=action, target_model=target_model,
        target_id=target_id, old_value=old_value, new_value=new_value, ip_address=ip
    )


PRELIMINARY_DEPARTMENTS = (
    ('Housing Office', 'HOUSING', 1),
    ('Estates Department', 'ESTATES', 2),
    ('Valuation Department', 'VALUATION', 3),
)


def _get_or_create_preliminary_departments():
    departments = []
    for name, code, order in PRELIMINARY_DEPARTMENTS:
        dept, _ = Department.objects.get_or_create(
            name=name,
            defaults={'code': code, 'display_order': order, 'is_required': True},
        )
        updated = False
        if not dept.code:
            dept.code = code
            updated = True
        if dept.display_order != order:
            dept.display_order = order
            updated = True
        if not dept.is_required:
            dept.is_required = True
            updated = True
        if updated:
            dept.save(update_fields=['code', 'display_order', 'is_required'])
        departments.append(dept)
    return departments


def _preliminary_reviews_complete(plan):
    reviews = plan.get_current_reviews(DepartmentReviewStage.PRELIMINARY)
    if reviews.count() < len(PRELIMINARY_DEPARTMENTS):
        return False

    valuation_seen = False
    for review in reviews:
        if review.officer_status != DepartmentReviewStatus.OFFICER_APPROVED:
            return False
        code = (review.department.code or '').upper()
        if code == 'VALUATION':
            valuation_seen = True
            if review.amount_payable is None or review.amount_payable <= 0:
                return False
    return valuation_seen


def _stream_field_file(instance, field_name, filename):
    file_field = getattr(instance, field_name, None)
    if not file_field:
        return Response({'error': 'No file found.'}, status=status.HTTP_404_NOT_FOUND)
    try:
        file_handle = open(file_field.path, 'rb')
        response = FileResponse(file_handle, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response
    except FileNotFoundError:
        return Response({'error': 'File not found on server.'}, status=status.HTTP_404_NOT_FOUND)


def _check_and_advance_to_final_decision(plan):
    """
    After a department review is submitted, check if all departments are resolved.
    If every review is head-confirmed, transition plan to AWAITING_FINAL_DECISION.
    """
    reviews = plan.get_current_reviews(DepartmentReviewStage.TECHNICAL)
    if not reviews.exists():
        return

    all_confirmed = all(
        r.head_status == DepartmentReviewStatus.HEAD_CONFIRMED
        for r in reviews
    )
    any_rejected = any(
        r.head_status == DepartmentReviewStatus.HEAD_REJECTED or
        r.officer_status == DepartmentReviewStatus.OFFICER_REJECTED
        for r in reviews
    )

    if any_rejected:
        plan.status = PlanStatus.REJECTED
        plan.save(update_fields=['status'])
    elif all_confirmed:
        plan.status = PlanStatus.AWAITING_FINAL_DECISION
        plan.save(update_fields=['status'])


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
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            from .serializers import MeUpdateSerializer
            return MeUpdateSerializer
        from .serializers import UserSerializer
        return UserSerializer

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
        if user.is_superuser:
            return Response(
                {'error': 'Superuser accounts cannot be permanently deleted.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        email = user.email
        try:
            user.delete()
        except Exception as e:
            return Response(
                {'error': f'Cannot delete user: {str(e)}. Deactivate instead.'},
                status=status.HTTP_409_CONFLICT
            )
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
        user.is_active = True
        user.save()
        log_action(
            request.user, 'USER_REACTIVATED', 'User', user.id,
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
    search_fields = ['plan_id', 'plan_number', 'stand__address', 'stand__stand_number']
    ordering_fields = ['created_at', 'status', 'category']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        qs = Plan.objects.select_related('stand', 'architect', 'client').prefetch_related('flags', 'versions')

        if user.role == UserRole.CLIENT:
            return qs.filter(client=user)

        if user.role == UserRole.RECEPTION:
            # Reception only sees plans up to the handoff into technical review.
            return qs.exclude(status__in=[
                PlanStatus.REVIEW_POOL,
                PlanStatus.IN_REVIEW,
                PlanStatus.AWAITING_FINAL_DECISION,
                PlanStatus.APPROVED,
            ])

        if user.role == UserRole.DEPT_OFFICER:
            if user.department:
                return qs.filter(
                    versions__department_reviews__department=user.department,
                ).distinct()
            return qs.none()

        if user.role == UserRole.DEPT_HEAD:
            if user.department:
                return qs.filter(
                    versions__department_reviews__department=user.department,
                ).distinct()
            return qs.none()

        if user.role == UserRole.FINAL_APPROVER:
            return qs.filter(status=PlanStatus.AWAITING_FINAL_DECISION)

        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PlanDetailSerializer
        if self.action in ['update', 'partial_update']:
            from .serializers import PlanUpdateSerializer
            return PlanUpdateSerializer
        return PlanListSerializer

    def create(self, request, *args, **kwargs):
        stand_number = request.data.get('stand_number')
        suburb = request.data.get('suburb', '')

        if not stand_number:
            return Response({'error': 'Stand number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        stand, _ = StandProperty.objects.get_or_create(
            stand_number=stand_number,
            defaults={'address': f"{stand_number}, {suburb}", 'suburb': suburb}
        )

        data = request.data.copy()
        data['stand'] = stand.id
        data['client'] = request.user.id

        if 'is_owner' in data:
            data['is_owner'] = str(data['is_owner']).lower() == 'true'
        if 'is_representative' in data:
            data['is_representative'] = str(data['is_representative']).lower() == 'true'

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        plan = serializer.save(client=request.user)

        # Handle plan files
        plan_files = [v for k, v in request.FILES.items() if k.startswith('plan_file_')]
        if plan_files:
            version = PlanVersion.objects.create(
                plan=plan,
                version_number=1,
                file=plan_files[0],
                uploaded_by=request.user,
                notes="Initial submission"
            )
            log_action(request.user, 'VERSION_ADDED', 'PlanVersion', version.id, request=request)

        # Parse shapes for area calculation (Engine A)
        shapes_raw = request.data.get('shapes')
        if shapes_raw:
            try:
                import json
                shapes_list = json.loads(shapes_raw)
                area_engine = AreaCalculationEngine()
                result = area_engine.verify_plan_area(float(request.data.get('declared_area', 0)), shapes_list)
                plan.calculated_area = result['calculated_area']
                plan.save(update_fields=['calculated_area'])
            except Exception as e:
                print(f"Error parsing shapes: {e}")

        plan.status = PlanStatus.DRAFT
        plan.save(update_fields=['status'])
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def submit_documents(self, request, pk=None):
        """
        Transition plan from PAID/PROFORMA_ISSUED to DOCUMENTS_PENDING_VERIFICATION
        after the client has uploaded all required documents.
        """
        plan = self.get_object()
        
        # We allow submission if they've paid or just received proforma
        # (The receptionist will verify the actually uploaded docs anyway)
        valid_statuses = [PlanStatus.PROFORMA_ISSUED, PlanStatus.PAID, PlanStatus.PAYMENT_PENDING]
        if plan.status not in valid_statuses:
             return Response(
                {'error': f'Cannot submit documents for plan in {plan.status} status.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_status = plan.status
        plan.status = PlanStatus.DOCUMENTS_PENDING_VERIFICATION
        plan.save(update_fields=['status'])

        log_action(request.user, 'DOCUMENTS_SUBMITTED', 'Plan', plan.id, 
                   old_value={'status': old_status}, new_value={'status': plan.status},
                   request=request)

        # Notify Reception
        from django.contrib.auth import get_user_model
        User = get_user_model()
        receptionists = User.objects.filter(role='RECEPTION', is_active=True)
        for rec in receptionists:
            dispatch_notification(
                rec, 'DOCUMENTS_SUBMITTED',
                f'New documents have been submitted for {plan.plan_id} ({plan.stand.address}). Please verify.',
                subject=f'Documents Submitted: {plan.plan_id}'
            )

        return Response({'status': 'DOCUMENTS_PENDING_VERIFICATION'})

    def perform_create(self, serializer):
        pass  # Overridden by create() above

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        plan = serializer.save()
        if old_status != plan.status:
            log_action(self.request.user, 'STATUS_CHANGED', 'Plan', plan.id,
                       old_value={'status': old_status},
                       new_value={'status': plan.status}, request=self.request)

    # ── Preliminary submission ────────────────────────────────────────────

    @action(detail=True, methods=['post'], permission_classes=[IsOwnerOrStaff])
    def submit_preliminary(self, request, pk=None):
        """
        Client submits plan file(s) for fee calculation only.
        No plan number assigned at this stage.
        """
        plan = self.get_object()
        if plan.status != PlanStatus.DRAFT:
            return Response({'error': 'Only DRAFT plans can be submitted as preliminary.'},
                            status=status.HTTP_400_BAD_REQUEST)

        plan_file = request.FILES.get('plan_file')
        if not plan_file:
            return Response({'error': 'A plan file (PDF) is required.'},
                            status=status.HTTP_400_BAD_REQUEST)

        last = plan.versions.order_by('-version_number').first()
        next_num = (last.version_number + 1) if last else 1
        version = PlanVersion.objects.create(
            plan=plan, version_number=next_num,
            file=plan_file, uploaded_by=request.user,
            notes='Preliminary submission'
        )

        old = plan.status
        plan.status = PlanStatus.PRELIMINARY_SUBMITTED
        plan.submission_type = 'PRELIMINARY'
        plan.submitted_at = timezone.now()
        plan.save(update_fields=['status', 'submission_type', 'submitted_at'])

        preliminary_departments = _get_or_create_preliminary_departments()
        for dept in preliminary_departments:
            DepartmentReview.objects.get_or_create(
                plan_version=version,
                department=dept,
                review_stage=DepartmentReviewStage.PRELIMINARY,
                defaults={
                    'officer_status': DepartmentReviewStatus.PENDING,
                    'head_status': DepartmentReviewStatus.PENDING,
                },
            )

        log_action(request.user, 'PRELIMINARY_SUBMITTED', 'Plan', plan.id,
                   old_value={'status': old}, new_value={'status': plan.status},
                   request=request)

        # Notify preliminary verification departments
        from django.contrib.auth import get_user_model
        User = get_user_model()
        for dept in preliminary_departments:
            officers = User.objects.filter(
                role__in=[UserRole.DEPT_OFFICER, UserRole.DEPT_HEAD],
                department=dept,
                is_active=True,
            )
            for officer in officers:
                dispatch_notification(
                    officer, 'PRELIMINARY_REVIEW_REQUESTED',
                    f'Plan {plan.plan_id} requires preliminary verification by {dept.name}.',
                    subject=f'Preliminary Review Required: {plan.plan_id}'
                )

        return Response({'status': plan.status, 'plan_id': plan.plan_id})

    # ── Resubmission ─────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], permission_classes=[IsOwnerOrStaff])
    def resubmit(self, request, pk=None):
        """Client uploads a revised plan (creates a new PlanVersion)."""
        plan = self.get_object()
        if plan.status not in [PlanStatus.CORRECTIONS_REQUIRED, PlanStatus.REJECTED_PRE_SCREEN]:
            return Response(
                {'error': 'Resubmission is only allowed for plans with CORRECTIONS_REQUIRED or REJECTED_PRE_SCREEN status.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        plan_file = request.FILES.get('plan_file')
        if not plan_file:
            return Response({'error': 'A plan file is required for resubmission.'}, status=status.HTTP_400_BAD_REQUEST)

        last = plan.versions.order_by('-version_number').first()
        next_num = (last.version_number + 1) if last else 1
        notes = request.data.get('notes', f'Version {next_num} resubmission')
        version = PlanVersion.objects.create(
            plan=plan, version_number=next_num,
            file=plan_file, uploaded_by=request.user, notes=notes
        )

        old = plan.status
        next_status = PlanStatus.SUBMITTED
        if plan.submission_type == 'PRELIMINARY':
            next_status = PlanStatus.PRELIMINARY_SUBMITTED
            preliminary_departments = _get_or_create_preliminary_departments()
            for dept in preliminary_departments:
                DepartmentReview.objects.get_or_create(
                    plan_version=version,
                    department=dept,
                    review_stage=DepartmentReviewStage.PRELIMINARY,
                    defaults={
                        'officer_status': DepartmentReviewStatus.PENDING,
                        'head_status': DepartmentReviewStatus.PENDING,
                    },
                )

        plan.status = next_status
        plan.save(update_fields=['status'])

        log_action(request.user, 'PLAN_RESUBMITTED', 'Plan', plan.id,
                   old_value={'status': old},
                   new_value={'status': plan.status, 'version': next_num},
                   request=request)

        return Response(PlanVersionSerializer(version).data, status=status.HTTP_201_CREATED)

    # ── Pre-screen rejection ──────────────────────────────────────────────

    @action(detail=True, methods=['post'], permission_classes=[IsReceptionOrAbove])
    def reject_pre_screen(self, request, pk=None):
        """Reception rejects plan during pre-screening; mandatory reason required."""
        if request.user.role not in [UserRole.RECEPTION, UserRole.ADMIN]:
            return Response({'error': 'Only Reception or Admin can reject a preliminary submission.'}, status=403)
        plan = self.get_object()
        if plan.status not in [PlanStatus.PRE_SCREENING, PlanStatus.SUBMITTED,
                                PlanStatus.PRELIMINARY_SUBMITTED]:
            return Response(
                {'error': 'Plan must be in PRE_SCREENING, SUBMITTED, or PRELIMINARY_SUBMITTED status to reject.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reason = request.data.get('reason', '').strip()
        if len(reason) < 10:
            return Response(
                {'error': 'A rejection reason of at least 10 characters is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old = plan.status
        plan.status = PlanStatus.REJECTED_PRE_SCREEN
        plan.save(update_fields=['status'])

        Flag.objects.create(
            plan=plan,
            flag_type=FlagType.ERROR,
            category=FlagCategory.OTHER,
            message=f'Pre-screening rejection: {reason}'
        )

        log_action(
            request.user, 'PLAN_REJECTED_PRE_SCREEN', 'Plan', plan.id,
            old_value={'status': old},
            new_value={'status': plan.status, 'reason': reason},
            request=request
        )

        dispatch_notification(
            plan.client, 'PLAN_REJECTED',
            f'Your application {plan.plan_id} has been rejected. Reason: {reason}',
            subject=f'Application Rejected — {plan.plan_id}'
        )

        return Response({'status': plan.status, 'reason': reason})

    # ── Submit to Review Pool ─────────────────────────────────────────────

    @action(detail=True, methods=['post'], permission_classes=[IsReceptionOrAbove])
    def submit_to_review(self, request, pk=None):
        """
        Reception verifies final docs and submits plan to the department review pool.
        Creates DepartmentReview records for all required departments.
        """
        if request.user.role not in [UserRole.RECEPTION, UserRole.ADMIN]:
            return Response({'error': 'Only Reception or Admin can move plans to technical review.'}, status=403)
        plan = self.get_object()
        allowed = [PlanStatus.FINAL_SUBMITTED]
        if plan.status not in allowed:
            return Response({'error': f'Plan must be in one of {allowed} to submit to review.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Block if there are unresolved ERROR flags
        error_flags = plan.flags.filter(flag_type='ERROR', is_resolved=False)
        if error_flags.exists():
            return Response(
                {'error': 'Cannot submit to review. Unresolved ERROR flags exist.',
                 'flags': list(error_flags.values_list('message', flat=True))},
                status=status.HTTP_400_BAD_REQUEST
            )

        current_version = plan.get_current_version()
        if not current_version:
            return Response({'error': 'No plan version found.'}, status=status.HTTP_400_BAD_REQUEST)

        # Determine required departments
        required_mappings = CategoryDepartmentMapping.objects.filter(category=plan.category)
        target_depts = ([m.department for m in required_mappings]
                        if required_mappings.exists()
                        else list(Department.objects.filter(is_required=True)))

        created_count = 0
        for dept in target_depts:
            _, created = DepartmentReview.objects.get_or_create(
                plan_version=current_version,
                department=dept,
                review_stage=DepartmentReviewStage.TECHNICAL,
                defaults={
                    'officer_status': DepartmentReviewStatus.PENDING,
                    'head_status': DepartmentReviewStatus.PENDING
                }
            )
            if created:
                created_count += 1

        old = plan.status
        plan.status = PlanStatus.REVIEW_POOL
        plan.save(update_fields=['status'])

        log_action(request.user, 'SUBMITTED_TO_REVIEW', 'Plan', plan.id,
                   old_value={'status': old}, new_value={'status': plan.status},
                   request=request)

        # Notify relevant officers
        from django.contrib.auth import get_user_model
        User = get_user_model()
        for dept in target_depts:
            officers = User.objects.filter(role='DEPT_OFFICER', department=dept, is_active=True)
            for officer in officers:
                dispatch_notification(
                    officer, 'REVIEW_REQUESTED',
                    f'Plan {plan.plan_id} has been added to the {dept.name} review pool.',
                    subject=f'Review Required ({dept.name})'
                )

        return Response({
            'status': plan.status,
            'reviews_created': created_count,
            'departments': [d.name for d in target_depts]
        })

    # ── Secure file download ──────────────────────────────────────────────

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated], url_path='download')
    def download_file(self, request, pk=None):
        """Authenticated, secure download of the current plan version file."""
        plan = self.get_object()
        current_version = plan.get_current_version()
        if not current_version or not current_version.file:
            return Response({'error': 'No file found for this plan.'}, status=status.HTTP_404_NOT_FOUND)
        filename = f'{plan.plan_id}_v{current_version.version_number}.pdf'
        return _stream_field_file(current_version, 'file', filename)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated], url_path='download-title-deed')
    def download_title_deed(self, request, pk=None):
        plan = self.get_object()
        return _stream_field_file(plan, 'title_deed', f'{plan.plan_id}_title_deed.pdf')

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated], url_path='download-power-of-attorney')
    def download_power_of_attorney(self, request, pk=None):
        plan = self.get_object()
        return _stream_field_file(plan, 'power_of_attorney', f'{plan.plan_id}_power_of_attorney.pdf')

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated], url_path='download-structural-cert')
    def download_structural_cert(self, request, pk=None):
        plan = self.get_object()
        return _stream_field_file(plan, 'structural_cert', f'{plan.plan_id}_structural_cert.pdf')

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated], url_path='download-receipt-scan')
    def download_receipt_scan(self, request, pk=None):
        plan = self.get_object()
        return _stream_field_file(plan, 'receipt_scan', f'{plan.plan_id}_receipt_scan.pdf')

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated], url_path='download-sealed-document')
    def download_sealed_document(self, request, pk=None):
        plan = self.get_object()
        approval = getattr(plan, 'approval', None)
        if not approval:
            return Response({'error': 'No sealed document found.'}, status=status.HTTP_404_NOT_FOUND)
        return _stream_field_file(approval, 'sealed_document', f'{plan.plan_id}_approved.pdf')

    # ── Auto-checks ───────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], permission_classes=[IsOwnerOrStaff])
    def run_auto_checks(self, request, pk=None):
        """Trigger Engine B (Auto-Flagging) to check for pre-screening issues."""
        plan = self.get_object()
        engine = AutoFlaggingEngine()
        suggested_flags = engine.run_pre_screening(plan)

        flags_created = []
        for f_data in suggested_flags:
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
        plan = self.get_object()
        declared_area = request.data.get('declared_area')
        shapes = request.data.get('shapes', [])
        if declared_area is None:
            return Response({'error': 'declared_area is required.'}, status=400)

        engine = AreaCalculationEngine()
        result = engine.verify_plan_area(float(declared_area), shapes)
        plan.declared_area = result['declared_area']
        plan.calculated_area = result['calculated_area']
        plan.save(update_fields=['declared_area', 'calculated_area'])

        if result['flag_triggered']:
            Flag.objects.get_or_create(
                plan=plan, category=FlagCategory.AREA_MISMATCH, is_resolved=False,
                defaults={'flag_type': FlagType.ERROR, 'message': result['message']}
            )
        return Response(result)

    # ── Final approval (PDF stamping) ─────────────────────────────────────

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAbove])
    def approve_final(self, request, pk=None):
        """Apply final approval and lock the plan (PDF stamp + QR code)."""
        plan = self.get_object()

        if request.user.role not in [UserRole.FINAL_APPROVER, UserRole.ADMIN]:
            return Response({'error': 'Only the Final Approver or Admin can seal a plan.'},
                            status=status.HTTP_403_FORBIDDEN)

        if plan.status != PlanStatus.AWAITING_FINAL_DECISION:
            return Response({'error': 'Plan must be in AWAITING_FINAL_DECISION status.'},
                            status=status.HTTP_400_BAD_REQUEST)

        current_version = plan.get_current_version()
        if not current_version:
            return Response({'error': 'No plan version found.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check signing password
        signing_password = request.data.get('signing_password')
        if not signing_password or not request.user.check_signing_password(signing_password):
            return Response({'error': 'Invalid signing password.'}, status=status.HTTP_401_UNAUTHORIZED)

        # Verify all department heads have confirmed — uses DepartmentReview, NOT Comment votes
        required_reviews = DepartmentReview.objects.filter(
            plan_version=current_version,
            review_stage=DepartmentReviewStage.TECHNICAL,
        )
        if not required_reviews.exists():
            return Response({'error': 'No department reviews found for current version.'},
                            status=status.HTTP_400_BAD_REQUEST)

        unconfirmed = required_reviews.exclude(head_status=DepartmentReviewStatus.HEAD_CONFIRMED)
        if unconfirmed.exists():
            return Response({
                'error': 'Not all department heads have confirmed approval.',
                'pending': list(unconfirmed.values_list('department__name', flat=True))
            }, status=status.HTTP_400_BAD_REQUEST)

        # Generate cryptographic hash
        ts = timezone.now()
        hash_input = f'{plan.plan_id}:{current_version.id}:{request.user.id}:{ts.isoformat()}'
        sig_hash = hashlib.sha256(hash_input.encode()).hexdigest()

        approval = Approval(
            plan=plan, approved_by=request.user,
            signature_hash=sig_hash,
            notes=request.data.get('notes', ''),
        )

        # PDF stamping
        if current_version.file:
            try:
                import qrcode
                from datetime import datetime
                qr = qrcode.QRCode(version=1, box_size=10, border=5)
                qr.add_data(f"BCC APPROVED: {plan.plan_id} | {datetime.now().date()}")
                qr.make(fit=True)
                img = qr.make_image(fill_color="black", back_color="white")

                doc = fitz.open(current_version.file.path)
                page = doc[0]
                page_width = page.rect.width
                rect = fitz.Rect(page_width - 150, 50, page_width - 50, 150)

                buffer = BytesIO()
                img.save(buffer, format='PNG')
                page.insert_image(rect, stream=buffer.getvalue())

                text_point = fitz.Point(page_width - 165, 165)
                page.insert_text(text_point, f"BCC APPROVED: {plan.plan_id}",
                                 fontsize=12, color=(1, 0, 0), fontname="helv", bold=True)

                out_buffer = BytesIO()
                doc.save(out_buffer, garbage=4, deflate=True)
                doc.close()

                final_pdf = ContentFile(out_buffer.getvalue(), name=f'APPROVED_{plan.plan_id}.pdf')
                approval.qr_code.save(f'qr_{plan.plan_id}.png', ContentFile(buffer.getvalue()), save=False)
                approval.sealed_document = final_pdf
            except Exception as e:
                log_action(request.user, 'STAMPING_FAILED', 'Plan', plan.id,
                           new_value={'error': str(e)}, request=request)

        approval.save()
        plan.status = PlanStatus.APPROVED
        plan.save(update_fields=['status'])

        log_action(request.user, 'PLAN_APPROVED', 'Plan', plan.id,
                   new_value={'signature_hash': sig_hash}, request=request)

        dispatch_notification(
            plan.client, 'FINAL_DECISION',
            f'Congratulations! Your application {plan.plan_id} has been APPROVED.',
            subject=f'Final Approval Granted — {plan.plan_id}'
        )

        return Response(ApprovalSerializer(approval).data)


# ─────────────────────────────────────────────
# DEPARTMENT REVIEW
# ─────────────────────────────────────────────

class DepartmentReviewViewSet(viewsets.ModelViewSet):
    """Handles Officer and Head reviews for specific departments."""
    serializer_class = DepartmentReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in [UserRole.DEPT_OFFICER, UserRole.DEPT_HEAD] and user.department:
            return DepartmentReview.objects.filter(
                department=user.department
            ).select_related('plan_version__plan', 'department', 'officer', 'head')
        if user.role == UserRole.RECEPTION:
            return DepartmentReview.objects.filter(
                review_stage=DepartmentReviewStage.PRELIMINARY
            ).select_related('plan_version__plan', 'department', 'officer', 'head')
        if user.role in [UserRole.ADMIN, UserRole.FINAL_APPROVER]:
            return DepartmentReview.objects.all().select_related(
                'plan_version__plan', 'department', 'officer', 'head'
            )
        return DepartmentReview.objects.none()

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAbove])
    def evaluate(self, request, pk=None):
        """
        Officer or Head submits their evaluation.
        Payload: { "role": "OFFICER"|"HEAD", "status": "APPROVED"|"REJECTED"|"CORRECTIONS", "comment": "..." }
        Rejection and Corrections require a comment of at least 10 characters.
        """
        review = self.get_object()
        user = request.user

        # Security: must belong to this department (unless Admin)
        if user.role != UserRole.ADMIN and user.department != review.department:
            return Response({'error': 'You do not belong to this department.'}, status=403)

        role     = request.data.get('role')
        decision = request.data.get('status', '').upper()
        comment  = request.data.get('comment', '').strip()

        # Enforce mandatory comment for rejection / corrections
        if decision in ('REJECTED', 'CORRECTIONS') and len(comment) < 10:
            return Response(
                {'error': 'A reason of at least 10 characters is required when rejecting or requesting corrections.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if role == 'OFFICER':
            if user.role not in [UserRole.DEPT_OFFICER, UserRole.ADMIN]:
                return Response({'error': 'Role mismatch.'}, status=403)

            status_map = {
                'APPROVED':    DepartmentReviewStatus.OFFICER_APPROVED,
                'REJECTED':    DepartmentReviewStatus.OFFICER_REJECTED,
                'CORRECTIONS': DepartmentReviewStatus.OFFICER_CORRECTIONS,
            }
            if decision not in status_map:
                return Response({'error': f'Invalid status. Valid options: {list(status_map.keys())}'}, status=400)

            amount_payable = review.amount_payable
            if review.review_stage == DepartmentReviewStage.PRELIMINARY:
                raw_amount = request.data.get('amount_payable')
                if (review.department.code or '').upper() == 'VALUATION':
                    if raw_amount in [None, '']:
                        return Response(
                            {'error': 'Valuation must provide amount_payable before approval.'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    try:
                        amount_payable = Decimal(str(raw_amount))
                    except (InvalidOperation, TypeError):
                        return Response({'error': 'amount_payable must be a valid number.'}, status=400)
                    if amount_payable <= 0:
                        return Response({'error': 'amount_payable must be greater than zero.'}, status=400)

            review.officer         = user
            review.officer_status  = status_map[decision]
            review.officer_comment = comment
            review.amount_payable  = amount_payable
            review.officer_acted_at = timezone.now()
            review.save()

            plan = review.plan_version.plan
            if review.review_stage == DepartmentReviewStage.TECHNICAL:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                heads = User.objects.filter(role='DEPT_HEAD', department=review.department, is_active=True)
                for head in heads:
                    dispatch_notification(
                        head, 'REVIEW_COMPLETED',
                        f'Officer {user.full_name or user.username} has completed the {decision} review for plan {plan.plan_id}.',
                        subject=f'Officer Review Complete: {plan.plan_id}'
                    )

        elif role == 'HEAD':
            if user.role not in [UserRole.DEPT_HEAD, UserRole.ADMIN]:
                return Response({'error': 'Only Department Head can perform this action.'}, status=403)

            status_map = {
                'APPROVED': DepartmentReviewStatus.HEAD_CONFIRMED,
                'REJECTED': DepartmentReviewStatus.HEAD_REJECTED,
            }
            if decision not in status_map:
                return Response({'error': 'Invalid status. Head can only APPROVED or REJECTED.'}, status=400)

            review.head         = user
            review.head_status  = status_map[decision]
            review.head_comment = comment
            review.head_acted_at = timezone.now()
            review.save()

        else:
            return Response({'error': 'Invalid role. Must be OFFICER or HEAD.'}, status=400)

        # Log to audit trail
        plan = review.plan_version.plan
        log_action(user, f'DEPT_REVIEW_{role}_{decision}', 'DepartmentReview', review.id,
                   new_value={'decision': decision, 'comment': comment}, request=request)

        # Notify applicant only when the HEAD makes a decision
        if role == 'HEAD':
            dispatch_notification(
                plan.client, 'DEPT_DECISION',
                f'{review.department.name} has submitted a final review on your application {plan.plan_id}: {decision}.',
                subject=f'Department Decision — {plan.plan_id}'
            )

        if review.review_stage == DepartmentReviewStage.PRELIMINARY:
            if decision in ('REJECTED', 'CORRECTIONS'):
                plan.status = PlanStatus.CORRECTIONS_REQUIRED
                plan.save(update_fields=['status'])
                dispatch_notification(
                    plan.client, 'PRELIMINARY_CORRECTIONS_REQUIRED',
                    f'{review.department.name} requested corrections on your preliminary submission {plan.plan_id}.',
                    subject=f'Corrections Required — {plan.plan_id}'
                )
            elif role == 'OFFICER' and _preliminary_reviews_complete(plan):
                from django.contrib.auth import get_user_model
                User = get_user_model()
                receptionists = User.objects.filter(role=UserRole.RECEPTION, is_active=True)
                for rec in receptionists:
                    dispatch_notification(
                        rec, 'PRELIMINARY_READY_FOR_PROFORMA',
                        f'Plan {plan.plan_id} has completed Housing, Estates, and Valuation verification and is ready for proforma issuance.',
                        subject=f'Preliminary Complete: {plan.plan_id}'
                    )
        else:
            # Check if all departments are resolved and advance plan status
            _check_and_advance_to_final_decision(plan)

        return Response({
            'status': 'Success',
            'review_status': review.officer_status if role == 'OFFICER' else review.head_status
        })


# ─────────────────────────────────────────────
# COMMENT
# ─────────────────────────────────────────────

class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Comment.objects.select_related('department', 'author', 'plan_version')

        # Filter by plan_version if provided in query params
        version_id = self.request.query_params.get('plan_version')
        if version_id:
            qs = qs.filter(plan_version_id=version_id)

        if user.role == UserRole.CLIENT:
            return qs.filter(plan_version__plan__client=user, is_internal=False)

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
    permission_classes = [IsStaffOrAbove]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['action', 'target_model', 'user__full_name']


# ─────────────────────────────────────────────
# CHECKLIST TEMPLATES
# ─────────────────────────────────────────────

class ChecklistTemplateViewSet(viewsets.ModelViewSet):
    queryset = ChecklistTemplate.objects.prefetch_related('required_documents').all()
    serializer_class = ChecklistTemplateSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdmin()]


# ─────────────────────────────────────────────
# SUBMITTED DOCUMENTS
# ─────────────────────────────────────────────

class SubmittedDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = SubmittedDocumentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['label', 'plan__plan_id']

    def get_queryset(self):
        user = self.request.user
        qs = SubmittedDocument.objects.select_related('plan', 'required_doc', 'uploaded_by', 'verified_by')

        plan_id = self.request.query_params.get('plan')
        if plan_id:
            qs = qs.filter(plan_id=plan_id)

        if user.role == UserRole.CLIENT:
            return qs.filter(plan__client=user)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        plan = serializer.validated_data.get('plan')
        if user.role == UserRole.CLIENT and plan and plan.client != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only upload documents for your own plans.")
        serializer.save()

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated], url_path='download')
    def download(self, request, pk=None):
        doc = self.get_object()
        safe_label = ''.join(ch if ch.isalnum() or ch in ('_', '-') else '_' for ch in doc.label.lower())
        filename = f'{doc.plan.plan_id}_{safe_label or "document"}.pdf'
        return _stream_field_file(doc, 'file', filename)

    @action(detail=True, methods=['post'], permission_classes=[IsReceptionOrAbove])
    def verify(self, request, pk=None):
        """
        Receptionist marks a submitted document as verified.
        When ALL required (non-optional) documents for the plan are verified,
        automatically assigns the plan number and moves the plan to REVIEW_POOL.
        """
        if request.user.role not in [UserRole.RECEPTION, UserRole.ADMIN]:
            return Response({'error': 'Only Reception or Admin can verify submitted documents.'}, status=403)
        doc = self.get_object()
        comment = request.data.get('comment', '').strip()

        doc.is_verified  = True
        doc.verified_by  = request.user
        doc.verified_at  = timezone.now()
        doc.comment      = comment
        doc.save()

        log_action(request.user, 'DOCUMENT_VERIFIED', 'SubmittedDocument', doc.id,
                   new_value={'label': doc.label, 'comment': comment}, request=request)

        # Check if all required documents for this plan are now verified
        plan = doc.plan
        all_docs = plan.submitted_documents.all()
        required_docs = all_docs.filter(required_doc__is_optional=False)
        unverified = required_docs.filter(is_verified=False)

        if not unverified.exists() and required_docs.exists():
            old = plan.status
            plan.status = PlanStatus.VERIFIED_BY_RECEPTION
            plan.save(update_fields=['status'])

            # Assign the official plan number
            plan_number = plan.assign_plan_number()

            log_action(request.user, 'PLAN_NUMBER_ASSIGNED', 'Plan', plan.id,
                       old_value={'status': old},
                       new_value={'status': plan.status, 'plan_number': plan_number},
                       request=request)

            dispatch_notification(
                plan.client, 'PLAN_NUMBER_ASSIGNED',
                f'Your application has been verified. Your official plan number is {plan_number}.',
                subject=f'Plan Number Assigned — {plan_number}'
            )

            # Advance to FINAL_SUBMITTED → then submit_to_review will take it to REVIEW_POOL
            plan.status = PlanStatus.FINAL_SUBMITTED
            plan.save(update_fields=['status'])

        return Response(SubmittedDocumentSerializer(doc, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[IsReceptionOrAbove])
    def reject_document(self, request, pk=None):
        """Receptionist rejects a document and requests re-upload from applicant."""
        if request.user.role not in [UserRole.RECEPTION, UserRole.ADMIN]:
            return Response({'error': 'Only Reception or Admin can reject submitted documents.'}, status=403)
        doc = self.get_object()
        reason = request.data.get('reason', '').strip()
        if len(reason) < 10:
            return Response({'error': 'A rejection reason of at least 10 characters is required.'},
                            status=status.HTTP_400_BAD_REQUEST)

        doc.is_verified = False
        doc.comment = f'REJECTED: {reason}'
        doc.save(update_fields=['is_verified', 'comment'])

        log_action(request.user, 'DOCUMENT_REJECTED', 'SubmittedDocument', doc.id,
                   new_value={'reason': reason}, request=request)

        dispatch_notification(
            doc.plan.client, 'DOCUMENTS_REQUESTED',
            f'Document "{doc.label}" was rejected for your application {doc.plan.plan_id}. Reason: {reason}. Please re-upload.',
            subject=f'Document Re-upload Required — {doc.plan.plan_id}'
        )

        return Response({'detail': 'Document rejected. Applicant notified.'})


# ─────────────────────────────────────────────
# PROFORMA INVOICE
# ─────────────────────────────────────────────

class ProformaInvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = ProformaInvoiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['invoice_number', 'plan__plan_id']

    def get_queryset(self):
        user = self.request.user
        qs = ProformaInvoice.objects.select_related('plan', 'issued_by').prefetch_related(
            'line_items', 'payment_receipts'
        )
        plan_id = self.request.query_params.get('plan')
        if plan_id:
            qs = qs.filter(plan_id=plan_id)
        if user.role == UserRole.CLIENT:
            return qs.filter(plan__client=user)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'confirm_payment']:
            return [IsReceptionOrAbove()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        if request.user.role not in [UserRole.RECEPTION, UserRole.ADMIN]:
            return Response({'error': 'Only Reception or Admin can issue proforma invoices.'}, status=403)
        plan_id = request.data.get('plan')
        if not plan_id:
            return Response({'error': 'plan field is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan = Plan.objects.get(pk=plan_id)
        except Plan.DoesNotExist:
            return Response({'error': 'Plan not found.'}, status=status.HTTP_404_NOT_FOUND)

        if plan.status != PlanStatus.PRELIMINARY_SUBMITTED:
            return Response(
                {'error': 'Proforma can only be issued for PRELIMINARY_SUBMITTED plans.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not _preliminary_reviews_complete(plan):
            return Response(
                {'error': 'Housing, Estates, and Valuation must all approve the preliminary submission before issuing a proforma.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        valuation_review = plan.get_current_reviews(DepartmentReviewStage.PRELIMINARY).filter(
            department__code='VALUATION'
        ).first()
        expected_amount = valuation_review.amount_payable if valuation_review else None

        invoice = ProformaInvoice.objects.create(
            plan=plan,
            issued_by=request.user,
            notes=request.data.get('notes', ''),
        )

        # Create line items
        line_items_data = request.data.get('line_items', [])
        if not line_items_data and expected_amount:
            line_items_data = [{
                'label': 'Preliminary valuation fee',
                'vote_no': '',
                'amount_zwl': expected_amount,
                'amount_usd': 0,
                'is_rates_payment': False,
            }]

        if expected_amount and line_items_data:
            total_zwl = Decimal('0')
            for item in line_items_data:
                try:
                    total_zwl += Decimal(str(item.get('amount_zwl', 0) or 0))
                except (InvalidOperation, TypeError):
                    return Response({'error': 'Each line item amount_zwl must be a valid number.'}, status=400)
            if total_zwl != expected_amount:
                return Response(
                    {'error': f'Line item total must match the valuation amount of {expected_amount} ZWL.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        for item in line_items_data:
            ProformaLineItem.objects.create(
                invoice=invoice,
                label=item.get('label', ''),
                vote_no=item.get('vote_no', ''),
                amount_zwl=item.get('amount_zwl', 0),
                amount_usd=item.get('amount_usd', 0),
                is_rates_payment=item.get('is_rates_payment', False),
            )

        invoice.recalculate_totals()

        old = plan.status
        plan.status = PlanStatus.PROFORMA_ISSUED
        plan.save(update_fields=['status'])

        log_action(request.user, 'PROFORMA_ISSUED', 'ProformaInvoice', invoice.id,
                   new_value={'invoice_number': invoice.invoice_number, 'plan_id': plan.plan_id},
                   request=request)

        dispatch_notification(
            plan.client, 'PROFORMA_ISSUED',
            f'Proforma invoice {invoice.invoice_number} has been issued for your application {plan.plan_id}. '
            f'Total: ZWL {invoice.total_zwl} / USD {invoice.total_usd}. Please pay and upload your receipt.',
            subject=f'Proforma Invoice Issued — {invoice.invoice_number}'
        )

        return Response(
            ProformaInvoiceSerializer(invoice, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated], url_path='download')
    def download(self, request, pk=None):
        """Render a simple PDF version of the proforma invoice for client download/viewing."""
        invoice = self.get_object()

        doc = fitz.open()
        page = doc.new_page()

        lines = [
            "Bulawayo PACS Proforma Invoice",
            "",
            f"Invoice Number: {invoice.invoice_number}",
            f"Plan ID: {invoice.plan.plan_id}",
            f"Status: {invoice.status}",
            f"Issued At: {invoice.issued_at.strftime('%Y-%m-%d %H:%M')}",
            "",
            "Line Items:",
        ]

        for item in invoice.line_items.all():
            lines.append(
                f"- {item.label} | Vote {item.vote_no or 'N/A'} | "
                f"ZWL {item.amount_zwl} | USD {item.amount_usd}"
            )

        lines.extend(
            [
                "",
                f"Total ZWL: {invoice.total_zwl}",
                f"Total USD: {invoice.total_usd}",
            ]
        )

        if invoice.notes:
            lines.extend(["", f"Notes: {invoice.notes}"])
        if invoice.reception_contacts:
            lines.extend(["", f"Reception Contacts: {invoice.reception_contacts}"])
        if invoice.rates_comment:
            lines.extend(["", f"Rates Comment: {invoice.rates_comment}"])

        y = 72
        for line in lines:
            page.insert_text((72, y), str(line), fontsize=11, fontname="helv")
            y += 18

        pdf_bytes = doc.tobytes(garbage=4, deflate=True)
        doc.close()

        response = FileResponse(
            BytesIO(pdf_bytes),
            content_type='application/pdf'
        )
        response['Content-Disposition'] = f'inline; filename="{invoice.invoice_number}.pdf"'
        return response

    @action(detail=True, methods=['post'], permission_classes=[IsReceptionOrAbove])
    def confirm_payment(self, request, pk=None):
        """
        Receptionist confirms payment by recording the receipt number.
        receipt_number must be unique across all PaymentReceipt records.
        """
        if request.user.role not in [UserRole.RECEPTION, UserRole.ADMIN]:
            return Response({'error': 'Only Reception or Admin can confirm payments.'}, status=403)
        invoice = self.get_object()

        receipt_number = request.data.get('receipt_number', '').strip()
        if not receipt_number:
            return Response({'error': 'receipt_number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if PaymentReceipt.objects.filter(receipt_number=receipt_number).exists():
            return Response({'error': f'Receipt number "{receipt_number}" has already been recorded.'},
                            status=status.HTTP_400_BAD_REQUEST)

        payment_date = request.data.get('payment_date')
        if not payment_date:
            return Response({'error': 'payment_date is required (YYYY-MM-DD).'}, status=status.HTTP_400_BAD_REQUEST)

        receipt = PaymentReceipt.objects.create(
            invoice=invoice,
            receipt_number=receipt_number,
            amount_zwl=request.data.get('amount_zwl', invoice.total_zwl),
            amount_usd=request.data.get('amount_usd', invoice.total_usd),
            paid_by=invoice.plan.client,
            payment_date=payment_date,
            payment_method=request.data.get('payment_method', ''),
            evidence_file=request.FILES.get('evidence_file'),
            recorded_by=request.user,
        )

        invoice.status = ProformaInvoiceStatus.PAID
        invoice.save(update_fields=['status'])

        plan = invoice.plan
        old = plan.status
        plan.status = PlanStatus.PAID
        plan.save(update_fields=['status'])

        log_action(request.user, 'PAYMENT_CONFIRMED', 'PaymentReceipt', receipt.id,
                   new_value={'receipt_number': receipt_number, 'plan_id': plan.plan_id},
                   request=request)

        dispatch_notification(
            plan.client, 'PAYMENT_CONFIRMED',
            f'Payment for {plan.plan_id} (Receipt #{receipt_number}) has been confirmed. '
            f'Your documents will now be verified.',
            subject=f'Payment Confirmed for {plan.plan_id}'
        )

        return Response(PaymentReceiptSerializer(receipt, context={'request': request}).data)


# ─────────────────────────────────────────────
# FINAL DECISION
# ─────────────────────────────────────────────

class FinalDecisionViewSet(viewsets.ModelViewSet):
    serializer_class = FinalDecisionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = FinalDecision.objects.select_related('plan', 'final_approver')
        if user.role == UserRole.CLIENT:
            return qs.filter(plan__client=user)
        return qs

    def get_permissions(self):
        if self.action == 'create':
            return [IsStaffOrAbove()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        if request.user.role not in [UserRole.FINAL_APPROVER, UserRole.ADMIN]:
            return Response({'error': 'Only Final Approver or Admin can submit a final decision.'},
                            status=status.HTTP_403_FORBIDDEN)

        plan_id  = request.data.get('plan')
        decision = request.data.get('decision', '').upper()
        reason   = request.data.get('reason', '').strip()

        if decision not in ('APPROVED', 'REJECTED'):
            return Response({'error': 'decision must be APPROVED or REJECTED.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(reason) < 10:
            return Response({'error': 'A reason of at least 10 characters is required.'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            plan = Plan.objects.get(pk=plan_id)
        except Plan.DoesNotExist:
            return Response({'error': 'Plan not found.'}, status=status.HTTP_404_NOT_FOUND)

        if plan.status != PlanStatus.AWAITING_FINAL_DECISION:
            return Response({'error': 'Plan must be in AWAITING_FINAL_DECISION status.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if hasattr(plan, 'final_decision'):
            return Response({'error': 'A final decision has already been made for this plan.'},
                            status=status.HTTP_400_BAD_REQUEST)

        fd = FinalDecision.objects.create(
            plan=plan, final_approver=request.user,
            decision=decision, reason=reason
        )

        old = plan.status
        plan.status = PlanStatus.APPROVED if decision == 'APPROVED' else PlanStatus.REJECTED
        plan.save(update_fields=['status'])

        log_action(request.user, f'FINAL_{decision}', 'FinalDecision', fd.id,
                   old_value={'status': old},
                   new_value={'status': plan.status, 'reason': reason},
                   request=request)

        msg = (f'Your application {plan.plan_id} has been APPROVED by the final authority. '
               if decision == 'APPROVED'
               else f'Your application {plan.plan_id} has been REJECTED. Reason: {reason}')

        dispatch_notification(
            plan.client, 'FINAL_DECISION', msg,
            subject=f'Final Decision — {plan.plan_id}'
        )

        return Response(FinalDecisionSerializer(fd, context={'request': request}).data,
                        status=status.HTTP_201_CREATED)


# ─────────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────────

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).order_by('-sent_at')

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        if not notif.is_read:
            notif.is_read = True
            notif.read_at = timezone.now()
            notif.save(update_fields=['is_read', 'read_at'])
        return Response(NotificationSerializer(notif).data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True, read_at=timezone.now())
        return Response({'marked_read': count})
