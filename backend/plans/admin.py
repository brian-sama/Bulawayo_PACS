from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Department, Architect, StandProperty, Plan,
    PlanVersion, Comment, Flag, Receipt, Approval, AuditLog,
    DepartmentReview, CategoryDepartmentMapping,
    ChecklistTemplate, RequiredDocument, SubmittedDocument,
    ProformaInvoice, ProformaLineItem, PaymentReceipt,
    FinalDecision, Notification,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ['email', 'full_name', 'role', 'department', 'is_active']
    list_filter   = ['role', 'is_active', 'department']
    search_fields = ['email', 'full_name', 'id_number']
    ordering      = ['email']
    fieldsets = (
        (None,            {'fields': ('email', 'password')}),
        ('Personal',      {'fields': ('full_name', 'id_number', 'phone')}),
        ('Role & Dept',   {'fields': ('role', 'user_type', 'professional_reg_no', 'department')}),
        ('Permissions',   {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('email', 'full_name', 'role', 'password1', 'password2')}),
    )


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display  = ['name', 'code', 'is_required', 'display_order']
    ordering      = ['display_order']


@admin.register(CategoryDepartmentMapping)
class CategoryDepartmentMappingAdmin(admin.ModelAdmin):
    list_display = ['category', 'department']
    list_filter  = ['category']


@admin.register(Architect)
class ArchitectAdmin(admin.ModelAdmin):
    list_display  = ['full_name', 'registration_no', 'is_registered', 'expiry_date']
    search_fields = ['full_name', 'registration_no']
    list_filter   = ['is_registered']


@admin.register(StandProperty)
class StandPropertyAdmin(admin.ModelAdmin):
    list_display  = ['stand_number', 'address', 'suburb', 'rates_status', 'within_boundary']
    search_fields = ['stand_number', 'address']
    list_filter   = ['rates_status', 'within_boundary']


class PlanVersionInline(admin.TabularInline):
    model   = PlanVersion
    extra   = 0
    fields  = ['version_number', 'file', 'file_type', 'uploaded_by', 'created_at']
    readonly_fields = ['version_number', 'created_at']


class FlagInline(admin.TabularInline):
    model  = Flag
    extra  = 0
    fields = ['flag_type', 'category', 'message', 'is_resolved']


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display    = ['plan_id', 'plan_number', 'client', 'stand', 'category', 'status', 'submitted_at']
    list_filter     = ['status', 'category', 'submission_type']
    search_fields   = ['plan_id', 'plan_number', 'client__full_name', 'stand__stand_number']
    readonly_fields = ['plan_id', 'plan_number', 'created_at', 'updated_at']
    inlines         = [PlanVersionInline, FlagInline]


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display  = ['plan_version', 'department', 'author', 'status_vote', 'is_internal', 'created_at']
    list_filter   = ['status_vote', 'department', 'is_internal']


@admin.register(Flag)
class FlagAdmin(admin.ModelAdmin):
    list_display  = ['plan', 'flag_type', 'category', 'is_resolved', 'created_at']
    list_filter   = ['flag_type', 'category', 'is_resolved']


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display  = ['plan', 'receipt_number', 'amount', 'verified', 'verified_by']
    list_filter   = ['verified']


@admin.register(Approval)
class ApprovalAdmin(admin.ModelAdmin):
    list_display    = ['plan', 'approved_by', 'timestamp', 'is_locked']
    readonly_fields = ['signature_hash', 'timestamp']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display    = ['timestamp', 'user', 'action', 'target_model', 'target_id']
    list_filter     = ['action', 'target_model']
    search_fields   = ['user__full_name', 'action']
    readonly_fields = [f.name for f in AuditLog._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(DepartmentReview)
class DepartmentReviewAdmin(admin.ModelAdmin):
    list_display  = ['plan_version', 'department', 'officer_status', 'head_status', 'assigned_at']
    list_filter   = ['officer_status', 'head_status', 'department']
    search_fields = ['plan_version__plan__plan_id', 'department__name']


# ─────────────────────────────────────────────
# CHECKLIST TEMPLATES
# ─────────────────────────────────────────────

class RequiredDocumentInline(admin.TabularInline):
    model  = RequiredDocument
    extra  = 1
    fields = ['code', 'label', 'is_rates_payment', 'is_optional']


@admin.register(ChecklistTemplate)
class ChecklistTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'plan_type', 'created_at']
    inlines      = [RequiredDocumentInline]


@admin.register(SubmittedDocument)
class SubmittedDocumentAdmin(admin.ModelAdmin):
    list_display  = ['plan', 'label', 'is_verified', 'uploaded_by', 'uploaded_at', 'verified_by']
    list_filter   = ['is_verified']
    search_fields = ['plan__plan_id', 'label']


# ─────────────────────────────────────────────
# PROFORMA INVOICE
# ─────────────────────────────────────────────

class ProformaLineItemInline(admin.TabularInline):
    model  = ProformaLineItem
    extra  = 1
    fields = ['label', 'vote_no', 'amount_zwl', 'amount_usd', 'is_rates_payment']


class PaymentReceiptInline(admin.TabularInline):
    model   = PaymentReceipt
    extra   = 0
    fields  = ['receipt_number', 'amount_zwl', 'amount_usd', 'payment_date', 'payment_method', 'recorded_by']
    readonly_fields = ['recorded_at']


@admin.register(ProformaInvoice)
class ProformaInvoiceAdmin(admin.ModelAdmin):
    list_display    = ['invoice_number', 'plan', 'issued_by', 'status', 'total_zwl', 'total_usd', 'issued_at']
    list_filter     = ['status']
    search_fields   = ['invoice_number', 'plan__plan_id']
    readonly_fields = ['invoice_number', 'issued_at', 'total_zwl', 'total_usd']
    inlines         = [ProformaLineItemInline, PaymentReceiptInline]


# ─────────────────────────────────────────────
# FINAL DECISION
# ─────────────────────────────────────────────

@admin.register(FinalDecision)
class FinalDecisionAdmin(admin.ModelAdmin):
    list_display    = ['plan', 'final_approver', 'decision', 'decided_at']
    list_filter     = ['decision']
    search_fields   = ['plan__plan_id', 'plan__plan_number']
    readonly_fields = ['decided_at']


# ─────────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────────

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ['recipient', 'type', 'channel', 'is_read', 'sent_at']
    list_filter   = ['type', 'channel', 'is_read']
    search_fields = ['recipient__email', 'type', 'subject']
    readonly_fields = ['sent_at', 'read_at']
