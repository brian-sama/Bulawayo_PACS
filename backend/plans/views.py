import hashlib
from django.utils import timezone
from rest_framework import viewsets, generics, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import (
    User, Department, Architect, StandProperty, Plan,
    PlanVersion, Comment, Flag, Receipt, Approval, AuditLog,
    PlanStatus, UserRole
)
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
    search_fields = ['plan_id', 'property__address', 'property__stand_number']
    ordering_fields = ['created_at', 'status', 'category']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.CLIENT:
            return Plan.objects.filter(client=user).select_related(
                'property', 'architect', 'client'
            ).prefetch_related('flags', 'versions')
        return Plan.objects.all().select_related(
            'property', 'architect', 'client'
        ).prefetch_related('flags', 'versions')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PlanDetailSerializer
        return PlanListSerializer

    def perform_create(self, serializer):
        plan = serializer.save(client=self.request.user)
        log_action(self.request.user, 'PLAN_CREATED', 'Plan', plan.id,
                   new_value={'plan_id': plan.plan_id}, request=self.request)

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
        if plan.status != PlanStatus.PRE_SCREENING:
            return Response({'error': 'Plan must be in PRE_SCREENING status.'},
                            status=status.HTTP_400_BAD_REQUEST)
        old = plan.status
        plan.status = PlanStatus.IN_REVIEW
        plan.save()
        log_action(request.user, 'STATUS_CHANGED', 'Plan', plan.id,
                   old_value={'status': old}, new_value={'status': plan.status}, request=request)
        return Response({'status': plan.status})

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAbove])
    def compute_status(self, request, pk=None):
        """Aggregate all department votes and update plan status."""
        plan = self.get_object()
        current_version = plan.current_version
        if not current_version:
            return Response({'error': 'No plan version uploaded.'}, status=400)

        votes = Comment.objects.filter(plan_version=current_version).values_list('status_vote', flat=True)
        if not votes:
            return Response({'status': plan.status, 'message': 'No votes yet.'})

        old_status = plan.status
        if 'REJECTED' in votes:
            plan.status = PlanStatus.REJECTED
        elif 'CORRECTIONS_REQUIRED' in votes:
            plan.status = PlanStatus.CORRECTIONS_REQUIRED
        else:
            plan.status = PlanStatus.IN_REVIEW  # all approved but no final signature yet

        plan.save()
        log_action(request.user, 'STATUS_COMPUTED', 'Plan', plan.id,
                   old_value={'status': old_status},
                   new_value={'status': plan.status}, request=request)
        return Response({'status': plan.status})

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAbove])
    def approve_final(self, request, pk=None):
        """Apply final approval and lock the plan."""
        plan = self.get_object()
        current_version = plan.current_version
        if not current_version:
            return Response({'error': 'No plan version found.'}, status=400)

        # Ensure all required departments have voted APPROVED
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
            }, status=400)

        # Generate signature hash
        hash_input = f'{plan.plan_id}:{current_version.id}:{request.user.id}:{timezone.now().isoformat()}'
        sig_hash = hashlib.sha256(hash_input.encode()).hexdigest()

        approval = Approval.objects.create(
            plan=plan,
            approved_by=request.user,
            signature_hash=sig_hash,
            notes=request.data.get('notes', '')
        )
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
