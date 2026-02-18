from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Department, Architect, StandProperty, Plan,
    PlanVersion, Comment, Flag, Receipt, Approval, AuditLog
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ['email', 'full_name', 'role', 'department', 'is_active']
    list_filter   = ['role', 'is_active', 'department']
    search_fields = ['email', 'full_name', 'id_number']
    ordering      = ['email']
    fieldsets = (
        (None,           {'fields': ('email', 'password')}),
        ('Personal',     {'fields': ('full_name', 'id_number', 'phone')}),
        ('Role & Dept',  {'fields': ('role', 'department')}),
        ('Permissions',  {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('email', 'full_name', 'role', 'password1', 'password2')}),
    )


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display  = ['name', 'is_required', 'display_order']
    ordering      = ['display_order']


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
    model  = PlanVersion
    extra  = 0
    fields = ['version_number', 'file', 'file_type', 'uploaded_by', 'created_at']
    readonly_fields = ['version_number', 'created_at']


class FlagInline(admin.TabularInline):
    model  = Flag
    extra  = 0
    fields = ['type', 'category', 'message', 'is_resolved']


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display  = ['plan_id', 'client', 'stand', 'category', 'status', 'submitted_at']
    list_filter   = ['status', 'category']
    search_fields = ['plan_id', 'client__full_name', 'stand__stand_number']
    readonly_fields = ['plan_id', 'created_at', 'updated_at']
    inlines       = [PlanVersionInline, FlagInline]


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
    list_display  = ['plan', 'approved_by', 'timestamp', 'is_locked']
    readonly_fields = ['signature_hash', 'timestamp']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display  = ['timestamp', 'user', 'action', 'target_model', 'target_id']
    list_filter   = ['action', 'target_model']
    search_fields = ['user__full_name', 'action']
    readonly_fields = [f.name for f in AuditLog._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
