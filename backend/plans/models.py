from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone


# ─────────────────────────────────────────────
# CHOICES
# ─────────────────────────────────────────────

class UserRole(models.TextChoices):
    CLIENT         = 'CLIENT',         'Client'
    RECEPTION      = 'RECEPTION',      'Reception'
    DEPT_OFFICER   = 'DEPT_OFFICER',   'Department Officer'
    DEPT_HEAD      = 'DEPT_HEAD',      'Department Head'
    FINAL_APPROVER = 'FINAL_APPROVER', 'Final Approver'
    ADMIN          = 'ADMIN',          'System Administrator'

class UserType(models.TextChoices):
    OWNER        = 'OWNER',        'Property Owner'
    PROFESSIONAL = 'PROFESSIONAL', 'Registered Professional'

class PlanCategory(models.TextChoices):
    RESIDENTIAL = 'RESIDENTIAL', 'Residential'
    COMMERCIAL  = 'COMMERCIAL',  'Commercial'
    INDUSTRIAL  = 'INDUSTRIAL',  'Industrial'
    MIXED       = 'MIXED',       'Mixed Use'

class StandType(models.TextChoices):
    RESIDENTIAL_HIGH_DENSITY = 'RESIDENTIAL_HIGH_DENSITY', 'Residential High Density'
    RESIDENTIAL_LOW_DENSITY  = 'RESIDENTIAL_LOW_DENSITY',  'Residential Low Density'
    COMMERCIAL               = 'COMMERCIAL',               'Commercial'
    INDUSTRIAL               = 'INDUSTRIAL',               'Industrial'
    INSTITUTIONAL            = 'INSTITUTIONAL',            'Institutional'


class PlanStatus(models.TextChoices):
    # ── Preliminary flow ──────────────────────────────────────────────────
    DRAFT                          = 'DRAFT',                          'Draft'
    PRELIMINARY_SUBMITTED          = 'PRELIMINARY_SUBMITTED',          'Preliminary Submitted'
    PROFORMA_ISSUED                = 'PROFORMA_ISSUED',                'Proforma Issued'
    PAYMENT_PENDING                = 'PAYMENT_PENDING',                'Payment Pending'
    PAID                           = 'PAID',                           'Paid'
    DOCUMENTS_PENDING_VERIFICATION = 'DOCUMENTS_PENDING_VERIFICATION', 'Documents Pending Verification'
    VERIFIED_BY_RECEPTION          = 'VERIFIED_BY_RECEPTION',          'Verified by Reception'
    # ── Full submission flow ──────────────────────────────────────────────
    SUBMITTED                      = 'SUBMITTED',                      'Submitted'
    PRE_SCREENING                  = 'PRE_SCREENING',                  'Pre-Screening'
    FINAL_SUBMITTED                = 'FINAL_SUBMITTED',                'Final Submitted'
    REVIEW_POOL                    = 'REVIEW_POOL',                    'Review Pool'
    IN_REVIEW                      = 'IN_REVIEW',                      'In Review'
    CORRECTIONS_REQUIRED           = 'CORRECTIONS_REQUIRED',           'Corrections Required'
    AWAITING_FINAL_DECISION        = 'AWAITING_FINAL_DECISION',        'Awaiting Final Decision'
    # ── Terminal states ───────────────────────────────────────────────────
    REJECTED                       = 'REJECTED',                       'Rejected'
    REJECTED_PRE_SCREEN            = 'REJECTED_PRE_SCREEN',            'Rejected at Pre-Screening'
    APPROVED                       = 'APPROVED',                       'Approved'


class SubmissionType(models.TextChoices):
    PRELIMINARY = 'PRELIMINARY', 'Preliminary'
    FINAL       = 'FINAL',       'Final'


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


class NotificationChannel(models.TextChoices):
    EMAIL  = 'EMAIL',  'Email'
    SMS    = 'SMS',    'SMS'
    IN_APP = 'IN_APP', 'In-App'


# ─────────────────────────────────────────────
# DEPARTMENT
# ─────────────────────────────────────────────

class Department(models.Model):
    name         = models.CharField(max_length=100, unique=True)
    code         = models.CharField(max_length=20, blank=True)
    is_required  = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order']

    def __str__(self):
        return self.name


class CategoryDepartmentMapping(models.Model):
    """
    Maps Plan Categories to specific Departments that MUST review them.
    Example: 'Industrial' plans must always route to 'Factories & Works'.
    """
    category   = models.CharField(max_length=20, choices=PlanCategory.choices)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='category_mappings')

    class Meta:
        unique_together = ('category', 'department')
        verbose_name = 'Workflow: Category to Department'

    def __str__(self):
        return f'{self.category} -> {self.department.name}'


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
    role        = models.CharField(max_length=50, choices=UserRole.choices, default=UserRole.CLIENT)
    user_type   = models.CharField(max_length=20, choices=UserType.choices, default=UserType.OWNER)
    professional_reg_no = models.CharField(max_length=100, blank=True, null=True)
    is_email_verified = models.BooleanField(default=False)
    department  = models.ForeignKey(
        Department, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='staff'
    )
    is_active        = models.BooleanField(default=True)
    is_staff         = models.BooleanField(default=False)
    signing_password = models.CharField(max_length=128, null=True, blank=True)
    created_at       = models.DateTimeField(default=timezone.now)
    last_login       = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD  = 'username'
    REQUIRED_FIELDS = ['email', 'full_name']

    def set_signing_password(self, raw_password):
        from django.contrib.auth.hashers import make_password
        self.signing_password = make_password(raw_password)

    def check_signing_password(self, raw_password):
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.signing_password)

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
    id             = models.AutoField(primary_key=True)
    plan_id        = models.CharField(max_length=50, unique=True, editable=False)
    plan_number    = models.CharField(
        max_length=50, unique=True, null=True, blank=True,
        help_text="Official BUL/PACS/YYYY/XXXXXX number. Assigned only after payment & doc verification."
    )
    client         = models.ForeignKey(User, on_delete=models.PROTECT, related_name='plans')
    stand          = models.ForeignKey(StandProperty, on_delete=models.PROTECT, related_name='plans')
    architect      = models.ForeignKey(
        Architect, on_delete=models.SET_NULL, null=True, blank=True, related_name='plans'
    )
    suburb         = models.CharField(max_length=100, blank=True)
    category       = models.CharField(max_length=20, choices=PlanCategory.choices)
    stand_type     = models.CharField(max_length=50, choices=StandType.choices, default=StandType.RESIDENTIAL_HIGH_DENSITY)
    status         = models.CharField(max_length=40, choices=PlanStatus.choices, default=PlanStatus.DRAFT)
    submission_type = models.CharField(
        max_length=20, choices=SubmissionType.choices, default=SubmissionType.PRELIMINARY
    )

    # Ownership & Authority
    is_owner              = models.BooleanField(default=True)
    owner_name            = models.CharField(max_length=255, blank=True)
    is_representative     = models.BooleanField(
        default=False, help_text="True if applicant is acting on behalf of the owner."
    )
    represents_owner_name    = models.CharField(max_length=255, blank=True)
    represents_owner_contact = models.CharField(max_length=100, blank=True)
    power_of_attorney        = models.FileField(upload_to='docs/auth/%Y/%m/', null=True, blank=True)

    # Documents
    title_deed      = models.FileField(upload_to='docs/legal/%Y/%m/', null=True, blank=True)
    structural_cert = models.FileField(upload_to='docs/technical/%Y/%m/', null=True, blank=True)
    receipt_scan    = models.FileField(upload_to='docs/payments/%Y/%m/', null=True, blank=True)

    declared_area   = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    calculated_area = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    development_description = models.TextField(blank=True, null=True, help_text="e.g. church, factory, new residence, etc.")
    submitted_at    = models.DateTimeField(null=True, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

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

    def assign_plan_number(self):
        """
        Generate and persist the official plan number.
        Idempotent — does nothing if a plan_number already exists.
        Must only be called after payment & docs are verified by reception.
        """
        if self.plan_number:
            return self.plan_number
        year  = timezone.now().year
        count = Plan.objects.filter(
            plan_number__startswith=f'BUL/PACS/{year}/'
        ).count()
        self.plan_number = f'BUL/PACS/{year}/{str(count + 1).zfill(6)}'
        self.save(update_fields=['plan_number'])
        return self.plan_number

    def get_current_version(self):
        return self.versions.order_by('-version_number').first()

    def get_global_status(self):
        """
        Calculates the global status based on DepartmentReview states.
        """
        if self.status == PlanStatus.REJECTED:
            return 'RED', 'REJECTED'
        if self.status == PlanStatus.APPROVED:
            return 'GREEN', 'APPROVED'

        current_version = self.get_current_version()
        if not current_version:
            if self.status == PlanStatus.DRAFT:
                return 'GRAY', 'DRAFT'
            return 'BLUE', 'IN_REVIEW'

        reviews = self.get_current_reviews()
        if not reviews.exists():
            if self.status in [PlanStatus.SUBMITTED, PlanStatus.PRE_SCREENING]:
                return 'BLUE', self.status
            return 'BLUE', 'IN_REVIEW'

        # Check for Rejections (head or officer)
        for review in reviews:
            if review.head_status == DepartmentReviewStatus.HEAD_REJECTED or \
               review.officer_status == DepartmentReviewStatus.OFFICER_REJECTED:
                return 'RED', 'REJECTED'

        # Check for Corrections
        for review in reviews:
            if review.officer_status == DepartmentReviewStatus.OFFICER_CORRECTIONS:
                return 'AMBER', 'CORRECTIONS_REQUIRED'

        # All departments head-confirmed → ready for final decision
        all_confirmed = all(
            r.head_status == DepartmentReviewStatus.HEAD_CONFIRMED
            for r in reviews
        )
        if all_confirmed:
            return 'GREEN', 'AWAITING_FINAL_DECISION'

        return 'BLUE', 'IN_REVIEW'

    def get_current_reviews(self):
        current_version = self.get_current_version()
        if not current_version:
            return DepartmentReview.objects.none()
        return DepartmentReview.objects.filter(plan_version=current_version)

    @property
    def status_color(self):
        color, _ = self.get_global_status()
        return color

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
    pdf_pin_x    = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    pdf_pin_y    = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
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
# RECEIPT  (legacy single-receipt per plan)
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
    plan            = models.OneToOneField(Plan, on_delete=models.PROTECT, related_name='approval')
    approved_by     = models.ForeignKey(User, on_delete=models.PROTECT, related_name='approvals')
    signature_hash  = models.CharField(max_length=512)
    qr_code         = models.ImageField(upload_to='qr_codes/', null=True, blank=True)
    sealed_document = models.FileField(upload_to='approved_plans/%Y/%m/', null=True, blank=True)
    timestamp       = models.DateTimeField(auto_now_add=True)
    is_locked       = models.BooleanField(default=True)
    notes           = models.TextField(blank=True)

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


# ─────────────────────────────────────────────
# ENTERPRISE WORKFLOW ENGINE
# ─────────────────────────────────────────────

class DepartmentReviewStatus(models.TextChoices):
    PENDING             = 'PENDING',             'Pending Review'
    OFFICER_APPROVED    = 'OFFICER_APPROVED',    'Officer Approved'
    OFFICER_CORRECTIONS = 'OFFICER_CORRECTIONS', 'Officer Requested Corrections'
    OFFICER_REJECTED    = 'OFFICER_REJECTED',    'Officer Rejected'
    HEAD_CONFIRMED      = 'HEAD_CONFIRMED',      'Head Confirmed'
    HEAD_REJECTED       = 'HEAD_REJECTED',       'Head Rejected'


class DepartmentReview(models.Model):
    plan_version = models.ForeignKey(
        PlanVersion, on_delete=models.CASCADE, related_name='department_reviews'
    )
    department = models.ForeignKey(
        Department, on_delete=models.PROTECT, related_name='reviews'
    )

    # Officer Level
    officer = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='officer_reviews'
    )
    officer_status = models.CharField(
        max_length=30, choices=DepartmentReviewStatus.choices, default=DepartmentReviewStatus.PENDING
    )
    officer_comment  = models.TextField(blank=True)
    officer_acted_at = models.DateTimeField(null=True, blank=True)

    # Head Level
    head = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='head_reviews'
    )
    head_status = models.CharField(
        max_length=30, choices=DepartmentReviewStatus.choices, default=DepartmentReviewStatus.PENDING
    )
    head_comment  = models.TextField(blank=True)
    head_acted_at = models.DateTimeField(null=True, blank=True)

    # SLA & Escalation
    assigned_at = models.DateTimeField(auto_now_add=True)
    deadline    = models.DateTimeField(null=True, blank=True)
    escalated   = models.BooleanField(default=False)

    class Meta:
        unique_together = ('plan_version', 'department')
        ordering = ['department__display_order']

    def __str__(self):
        return f'{self.department.name} Review for {self.plan_version}'


class WorkflowLog(models.Model):
    plan       = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name='workflow_logs')
    user       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action     = models.CharField(max_length=100)
    old_status = models.CharField(max_length=50, blank=True)
    new_status = models.CharField(max_length=50, blank=True)
    metadata   = models.JSONField(null=True, blank=True)
    timestamp  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f'{self.plan.plan_id}: {self.old_status} -> {self.new_status} by {self.user}'


# ==========================================================
# CHECKLIST TEMPLATES
# ==========================================================

class ChecklistTemplate(models.Model):
    """
    Defines a set of required documents for a specific plan type.
    Receptionist selects the template; the system requests those docs from the applicant.
    """
    name       = models.CharField(max_length=100)
    plan_type  = models.CharField(max_length=50)   # e.g. 'RESIDENTIAL_MINOR', 'COMMERCIAL'
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.name} ({self.plan_type})'


class RequiredDocument(models.Model):
    """A single document item within a checklist template."""
    template         = models.ForeignKey(ChecklistTemplate, on_delete=models.CASCADE,
                                         related_name='required_documents')
    code             = models.CharField(max_length=50)    # e.g. 'TITLE_DEED'
    label            = models.CharField(max_length=200)
    is_rates_payment = models.BooleanField(
        default=False,
        help_text="When True, the receptionist can also add a rates payment amount to the proforma."
    )
    is_optional      = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.label} [{self.code}]'


class SubmittedDocument(models.Model):
    """Tracks a supporting document uploaded by the applicant for a specific plan."""
    plan         = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name='submitted_documents')
    required_doc = models.ForeignKey(RequiredDocument, on_delete=models.SET_NULL,
                                     null=True, blank=True, related_name='submissions')
    label        = models.CharField(max_length=200)    # copied from RequiredDocument at upload time
    file         = models.FileField(upload_to='submitted_docs/%Y/%m/')
    uploaded_by  = models.ForeignKey(User, on_delete=models.PROTECT,
                                     related_name='uploaded_documents')
    uploaded_at  = models.DateTimeField(auto_now_add=True)
    verified_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name='verified_documents')
    verified_at  = models.DateTimeField(null=True, blank=True)
    is_verified  = models.BooleanField(default=False)
    comment      = models.TextField(blank=True)

    def __str__(self):
        return f'{self.label} for {self.plan.plan_id}'


# ==========================================================
# PROFORMA INVOICE SYSTEM
# ==========================================================

class ProformaInvoiceStatus(models.TextChoices):
    ISSUED    = 'ISSUED',    'Issued'
    PAID      = 'PAID',      'Paid'
    CANCELLED = 'CANCELLED', 'Cancelled'


class ProformaInvoice(models.Model):
    """
    Proforma invoice issued by the receptionist after a preliminary submission.
    Shows itemised fees in ZWL and USD with BCC vote numbers.
    The plan number is NOT assigned until this invoice is paid and docs are verified.
    """
    plan           = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name='proforma_invoices')
    invoice_number = models.CharField(max_length=50, unique=True, editable=False)
    issued_by      = models.ForeignKey(User, on_delete=models.PROTECT, related_name='issued_invoices')
    issued_at      = models.DateTimeField(auto_now_add=True)
    status         = models.CharField(max_length=20, choices=ProformaInvoiceStatus.choices,
                                      default=ProformaInvoiceStatus.ISSUED)
    notes          = models.TextField(blank=True)
    reception_contacts = models.TextField(blank=True, help_text="Contacts for the client to follow up with.")
    rates_comment      = models.TextField(blank=True, help_text="Comment to clear rates balance.")
    total_zwl      = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_usd      = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            year  = timezone.now().year
            count = ProformaInvoice.objects.filter(
                invoice_number__startswith=f'INV-{year}-'
            ).count()
            self.invoice_number = f'INV-{year}-{str(count + 1).zfill(5)}'
        super().save(*args, **kwargs)

    def recalculate_totals(self):
        """Recalculate totals from line items and save."""
        agg = self.line_items.aggregate(
            zwl=models.Sum('amount_zwl'),
            usd=models.Sum('amount_usd')
        )
        self.total_zwl = agg['zwl'] or 0
        self.total_usd = agg['usd'] or 0
        self.save(update_fields=['total_zwl', 'total_usd'])

    def __str__(self):
        return self.invoice_number


class ProformaLineItem(models.Model):
    """
    A single fee line on the proforma.
    Labels and vote numbers mirror the BCC Building Inspectorate proforma template.
    """
    invoice          = models.ForeignKey(ProformaInvoice, on_delete=models.CASCADE, related_name='line_items')
    label            = models.CharField(max_length=200)
    vote_no          = models.CharField(max_length=50, blank=True,
                                        help_text="BCC vote number e.g. 0074/50363")
    amount_zwl       = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    amount_usd       = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    is_rates_payment = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.label} ({self.invoice.invoice_number})'


class PaymentReceipt(models.Model):
    """Payment evidence submitted by the applicant / recorded by the receptionist."""
    invoice        = models.ForeignKey(ProformaInvoice, on_delete=models.CASCADE,
                                       related_name='payment_receipts')
    amount_zwl     = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    amount_usd     = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    receipt_number = models.CharField(max_length=100, unique=True)
    paid_by        = models.ForeignKey(User, on_delete=models.PROTECT, related_name='payments')
    payment_date   = models.DateField()
    payment_method = models.CharField(max_length=50, blank=True)
    evidence_file  = models.FileField(upload_to='payment_evidence/%Y/%m/', null=True, blank=True)
    recorded_by    = models.ForeignKey(User, on_delete=models.PROTECT,
                                       related_name='recorded_payments')
    recorded_at    = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Receipt #{self.receipt_number}'


# ==========================================================
# FINAL DECISION
# ==========================================================

class FinalDecision(models.Model):
    """
    The final approver's binding decision after all departmental reviews are complete.
    Stored separately from the legacy Approval model (which handles PDF stamping).
    """
    plan           = models.OneToOneField(Plan, on_delete=models.CASCADE,
                                          related_name='final_decision')
    final_approver = models.ForeignKey(User, on_delete=models.PROTECT,
                                       related_name='final_decisions')
    decision       = models.CharField(max_length=20,
                                      choices=[('APPROVED', 'Approved'), ('REJECTED', 'Rejected')])
    reason         = models.TextField(help_text="Mandatory reason for the final decision.")
    decided_at     = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.decision} — {self.plan.plan_id}'


# ==========================================================
# NOTIFICATIONS
# ==========================================================

class Notification(models.Model):
    """
    In-app notification. Stub email/SMS fields for future integration.
    """
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type      = models.CharField(max_length=100)      # e.g. 'PROFORMA_ISSUED'
    channel   = models.CharField(max_length=20, choices=NotificationChannel.choices,
                                 default=NotificationChannel.IN_APP)
    subject   = models.CharField(max_length=255, blank=True)
    message   = models.TextField()
    is_read   = models.BooleanField(default=False)
    sent_at   = models.DateTimeField(auto_now_add=True)
    read_at   = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        return f'[{self.type}] → {self.recipient.email}'


# ==========================================================
# PLAN DOCUMENTS (legacy enterprise extension — kept for backward-compat)
# ==========================================================

class PlanDocument(models.Model):
    plan           = models.ForeignKey("Plan", on_delete=models.CASCADE, related_name="documents")
    file           = models.FileField(upload_to="plan_documents/")
    version_number = models.IntegerField(default=1)
    uploaded_by    = models.ForeignKey("User", on_delete=models.SET_NULL, null=True)
    uploaded_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-version_number"]
