from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone


# ─────────────────────────────────────────────
# CHOICES
# ─────────────────────────────────────────────

class UserRole(models.TextChoices):
    CLIENT     = 'CLIENT',     'Client'
    RECEPTION  = 'RECEPTION',  'Reception'
    STAFF      = 'STAFF',      'Staff'
    EXECUTIVE  = 'EXECUTIVE',  'Executive'
    ADMIN      = 'ADMIN',      'Admin'


class PlanCategory(models.TextChoices):
    RESIDENTIAL = 'RESIDENTIAL', 'Residential'
    COMMERCIAL  = 'COMMERCIAL',  'Commercial'
    INDUSTRIAL  = 'INDUSTRIAL',  'Industrial'
    MIXED       = 'MIXED',       'Mixed Use'


class PlanStatus(models.TextChoices):
    DRAFT                = 'DRAFT',                'Draft'
    SUBMITTED            = 'SUBMITTED',            'Submitted'
    PRE_SCREENING        = 'PRE_SCREENING',        'Pre-Screening'
    IN_REVIEW            = 'IN_REVIEW',            'In Review'
    CORRECTIONS_REQUIRED = 'CORRECTIONS_REQUIRED', 'Corrections Required'
    REJECTED             = 'REJECTED',             'Rejected'
    APPROVED             = 'APPROVED',             'Approved'


class DepartmentVote(models.TextChoices):
    APPROVED             = 'APPROVED',             'Approved'
    CORRECTIONS_REQUIRED = 'CORRECTIONS_REQUIRED', 'Corrections Required'
    REJECTED             = 'REJECTED',             'Rejected'


class FileType(models.TextChoices):
    DWG   = 'DWG',   'AutoCAD DWG'
    PLN   = 'PLN',   'ArchiCAD PLN'
    PDF   = 'PDF',   'PDF'
    OTHER = 'OTHER', 'Other'


class FlagType(models.TextChoices):
    WARNING = 'WARNING', 'Warning'
    ERROR   = 'ERROR',   'Error'
    INFO    = 'INFO',    'Info'


class FlagCategory(models.TextChoices):
    BOUNDARY      = 'BOUNDARY',      'Outside Boundary'
    RATES         = 'RATES',         'Outstanding Rates'
    LEASE         = 'LEASE',         'Invalid Lease'
    ARCHITECT     = 'ARCHITECT',     'Architect Not Registered'
    AREA_MISMATCH = 'AREA_MISMATCH', 'Area Mismatch'
    DEPT_MISSING  = 'DEPT_MISSING',  'Required Department Missing'
    OTHER         = 'OTHER',         'Other'


class RatesStatus(models.TextChoices):
    CLEAR       = 'CLEAR',       'Clear'
    OUTSTANDING = 'OUTSTANDING', 'Outstanding'
    UNKNOWN     = 'UNKNOWN',     'Unknown'


# ─────────────────────────────────────────────
# DEPARTMENT
# ─────────────────────────────────────────────

class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_required = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order']

    def __str__(self):
        return self.name


# ─────────────────────────────────────────────
# CUSTOM USER
# ─────────────────────────────────────────────

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        # Auto-generate username from email prefix if not provided
        if 'username' not in extra_fields or not extra_fields['username']:
            base = email.split('@')[0].lower().replace('.', '_').replace('-', '_')
            username = base
            counter = 1
            while self.model.objects.filter(username=username).exists():
                username = f'{base}{counter}'
                counter += 1
            extra_fields['username'] = username
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('role', UserRole.ADMIN)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    username    = models.CharField(max_length=150, unique=True)
    email       = models.EmailField(unique=True)
    full_name   = models.CharField(max_length=255)
    id_number   = models.CharField(max_length=50, unique=True, null=True, blank=True)
    phone       = models.CharField(max_length=20, blank=True)
    role        = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.CLIENT)
    department  = models.ForeignKey(
        Department, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='staff'
    )
    is_active   = models.BooleanField(default=True)
    is_staff    = models.BooleanField(default=False)
    created_at  = models.DateTimeField(default=timezone.now)
    last_login  = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD  = 'username'
    REQUIRED_FIELDS = ['email', 'full_name']

    def __str__(self):
        return f'{self.full_name} ({self.email})'


# ─────────────────────────────────────────────
# ARCHITECT
# ─────────────────────────────────────────────

class Architect(models.Model):
    full_name       = models.CharField(max_length=255)
    registration_no = models.CharField(max_length=100, unique=True)
    email           = models.EmailField(blank=True)
    phone           = models.CharField(max_length=20, blank=True)
    is_registered   = models.BooleanField(default=True)
    expiry_date     = models.DateField(null=True, blank=True)

    def __str__(self):
        return f'{self.full_name} ({self.registration_no})'


# ─────────────────────────────────────────────
# STAND PROPERTY
# Renamed from Property to avoid shadowing Python's built-in `property` decorator
# ─────────────────────────────────────────────

class StandProperty(models.Model):
    stand_number    = models.CharField(max_length=100, unique=True)
    address         = models.CharField(max_length=255)
    suburb          = models.CharField(max_length=100, blank=True)
    gps_lat         = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    gps_lng         = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    within_boundary = models.BooleanField(default=True)
    rates_status    = models.CharField(
        max_length=20, choices=RatesStatus.choices, default=RatesStatus.UNKNOWN
    )
    owner_name      = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name        = 'Property'
        verbose_name_plural = 'Properties'

    def __str__(self):
        return f'{self.stand_number} — {self.address}'


# ─────────────────────────────────────────────
# PLAN
# ─────────────────────────────────────────────

class Plan(models.Model):
    plan_id      = models.CharField(max_length=30, unique=True, editable=False)
    client       = models.ForeignKey(User, on_delete=models.PROTECT, related_name='plans')
    stand        = models.ForeignKey(StandProperty, on_delete=models.PROTECT, related_name='plans')
    architect    = models.ForeignKey(
        Architect, on_delete=models.SET_NULL, null=True, blank=True, related_name='plans'
    )
    category     = models.CharField(max_length=20, choices=PlanCategory.choices)
    status       = models.CharField(
        max_length=30, choices=PlanStatus.choices, default=PlanStatus.DRAFT
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.plan_id:
            self.plan_id = self._generate_plan_id()
        super().save(*args, **kwargs)

    def _generate_plan_id(self):
        year = timezone.now().year
        cat  = self.category[:3].upper() if self.category else 'GEN'
        last = Plan.objects.filter(
            plan_id__startswith=f'BCC-{year}-{cat}-'
        ).count()
        seq  = str(last + 1).zfill(4)
        return f'BCC-{year}-{cat}-{seq}'

    def get_current_version(self):
        return self.versions.order_by('-version_number').first()

    def __str__(self):
        return self.plan_id


# ─────────────────────────────────────────────
# PLAN VERSION
# ─────────────────────────────────────────────

class PlanVersion(models.Model):
    plan           = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()
    uploaded_by    = models.ForeignKey(User, on_delete=models.PROTECT, related_name='uploaded_versions')
    file           = models.FileField(upload_to='plan_files/%Y/%m/')
    file_type      = models.CharField(max_length=10, choices=FileType.choices, default=FileType.PDF)
    file_size_kb   = models.PositiveIntegerField(default=0)
    notes          = models.TextField(blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('plan', 'version_number')
        ordering = ['-version_number']

    def save(self, *args, **kwargs):
        if not self.version_number:
            last = PlanVersion.objects.filter(plan=self.plan).count()
            self.version_number = last + 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.plan.plan_id} v{self.version_number}'


# ─────────────────────────────────────────────
# COMMENT
# ─────────────────────────────────────────────

class Comment(models.Model):
    plan_version = models.ForeignKey(PlanVersion, on_delete=models.CASCADE, related_name='comments')
    department   = models.ForeignKey(Department, on_delete=models.PROTECT, related_name='comments')
    author       = models.ForeignKey(User, on_delete=models.PROTECT, related_name='comments')
    text         = models.TextField()
    status_vote  = models.CharField(max_length=30, choices=DepartmentVote.choices)
    is_internal  = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.department} on {self.plan_version} — {self.status_vote}'


# ─────────────────────────────────────────────
# FLAG
# ─────────────────────────────────────────────

class Flag(models.Model):
    plan         = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name='flags')
    plan_version = models.ForeignKey(
        PlanVersion, on_delete=models.SET_NULL, null=True, blank=True, related_name='flags'
    )
    flag_type    = models.CharField(max_length=10, choices=FlagType.choices)
    category     = models.CharField(max_length=20, choices=FlagCategory.choices)
    message      = models.TextField()
    is_resolved  = models.BooleanField(default=False)
    resolved_by  = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_flags'
    )
    resolved_at  = models.DateTimeField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'[{self.flag_type}] {self.category} — {self.plan.plan_id}'


# ─────────────────────────────────────────────
# RECEIPT
# ─────────────────────────────────────────────

class Receipt(models.Model):
    plan           = models.OneToOneField(Plan, on_delete=models.CASCADE, related_name='receipt')
    uploaded_by    = models.ForeignKey(User, on_delete=models.PROTECT, related_name='uploaded_receipts')
    file           = models.FileField(upload_to='receipts/%Y/%m/')
    amount         = models.DecimalField(max_digits=10, decimal_places=2)
    receipt_number = models.CharField(max_length=100)
    verified       = models.BooleanField(default=False)
    verified_by    = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_receipts'
    )
    verified_at    = models.DateTimeField(null=True, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Receipt #{self.receipt_number} for {self.plan.plan_id}'


# ─────────────────────────────────────────────
# APPROVAL (Final — OneToOne, irreversible)
# ─────────────────────────────────────────────

class Approval(models.Model):
    plan           = models.OneToOneField(Plan, on_delete=models.PROTECT, related_name='approval')
    approved_by    = models.ForeignKey(User, on_delete=models.PROTECT, related_name='approvals')
    signature_hash = models.CharField(max_length=512)
    qr_code        = models.ImageField(upload_to='qr_codes/', null=True, blank=True)
    timestamp      = models.DateTimeField(auto_now_add=True)
    is_locked      = models.BooleanField(default=True)
    notes          = models.TextField(blank=True)

    def __str__(self):
        return f'Approval for {self.plan.plan_id} by {self.approved_by}'


# ─────────────────────────────────────────────
# AUDIT LOG
# ─────────────────────────────────────────────

class AuditLog(models.Model):
    user         = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs'
    )
    action       = models.CharField(max_length=100)
    target_model = models.CharField(max_length=100)
    target_id    = models.PositiveIntegerField()
    old_value    = models.JSONField(null=True, blank=True)
    new_value    = models.JSONField(null=True, blank=True)
    ip_address   = models.GenericIPAddressField(null=True, blank=True)
    timestamp    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f'[{self.timestamp}] {self.action} on {self.target_model}#{self.target_id}'
