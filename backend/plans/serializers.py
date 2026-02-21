from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import (
    User, Department, Architect, StandProperty, Plan,
    PlanVersion, Comment, Flag, Receipt, Approval, AuditLog
)


# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ['email', 'full_name', 'id_number', 'phone', 'password', 'user_type', 'professional_reg_no']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class CreateUserSerializer(serializers.ModelSerializer):
    """Used by admins to create staff/reception/executive accounts."""
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ['username', 'email', 'full_name', 'id_number', 'phone',
                  'role', 'department', 'password']
        extra_kwargs = {
            'username': {'required': False},  # auto-generated from email if omitted
        }

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class AdminUpdateUserSerializer(serializers.ModelSerializer):
    """Used by admins to update user details (role, department, active status)."""
    class Meta:
        model = User
        fields = ['username', 'email', 'full_name', 'id_number', 'phone',
                  'role', 'department', 'is_active']

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class UserSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'id_number', 'phone',
                  'role', 'user_type', 'professional_reg_no', 'department', 
                  'department_name', 'is_active', 'is_email_verified', 'created_at']
        read_only_fields = ['id', 'created_at']


# ─────────────────────────────────────────────
# DEPARTMENT
# ─────────────────────────────────────────────

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'


# ─────────────────────────────────────────────
# ARCHITECT
# ─────────────────────────────────────────────

class ArchitectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Architect
        fields = '__all__'


# ─────────────────────────────────────────────
# PROPERTY
# ─────────────────────────────────────────────

class StandPropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = StandProperty
        fields = '__all__'


# ─────────────────────────────────────────────
# PLAN VERSION
# ─────────────────────────────────────────────

class PlanVersionSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)

    class Meta:
        model = PlanVersion
        fields = ['id', 'plan', 'version_number', 'uploaded_by', 'uploaded_by_name',
                  'file', 'file_type', 'file_size_kb', 'notes', 'created_at']
        read_only_fields = ['id', 'version_number', 'created_at']


# ─────────────────────────────────────────────
# COMMENT
# ─────────────────────────────────────────────

class CommentSerializer(serializers.ModelSerializer):
    author_name     = serializers.CharField(source='author.full_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = Comment
        fields = [
            'id', 'plan_version', 'department', 'department_name',
            'author', 'author_name', 'text', 'status_vote',
            'pdf_pin_x', 'pdf_pin_y', 'is_internal', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)


# ─────────────────────────────────────────────
# FLAG
# ─────────────────────────────────────────────

class FlagSerializer(serializers.ModelSerializer):
    resolved_by_name = serializers.CharField(source='resolved_by.full_name', read_only=True)

    class Meta:
        model = Flag
        fields = ['id', 'plan', 'plan_version', 'flag_type', 'category', 'message',
                  'is_resolved', 'resolved_by', 'resolved_by_name', 'resolved_at', 'created_at']
        read_only_fields = ['id', 'created_at']


# ─────────────────────────────────────────────
# RECEIPT
# ─────────────────────────────────────────────

class ReceiptSerializer(serializers.ModelSerializer):
    verified_by_name = serializers.CharField(source='verified_by.full_name', read_only=True)

    class Meta:
        model = Receipt
        fields = ['id', 'plan', 'uploaded_by', 'file', 'amount', 'receipt_number',
                  'verified', 'verified_by', 'verified_by_name', 'verified_at', 'created_at']
        read_only_fields = ['id', 'uploaded_by', 'created_at']

    def create(self, validated_data):
        validated_data['uploaded_by'] = self.context['request'].user
        return super().create(validated_data)


# ─────────────────────────────────────────────
# APPROVAL
# ─────────────────────────────────────────────

class ApprovalSerializer(serializers.ModelSerializer):
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True)

    class Meta:
        model = Approval
        fields = ['id', 'plan', 'approved_by', 'approved_by_name',
                  'signature_hash', 'qr_code', 'timestamp', 'is_locked', 'notes']
        read_only_fields = ['id', 'approved_by', 'signature_hash', 'timestamp', 'is_locked']


# ─────────────────────────────────────────────
# PLAN (list)
# ─────────────────────────────────────────────

class PlanListSerializer(serializers.ModelSerializer):
    client_name   = serializers.CharField(source='client.full_name', read_only=True)
    stand_addr    = serializers.CharField(source='stand.address', read_only=True)
    architect_name = serializers.CharField(source='architect.full_name', read_only=True)
    flag_count    = serializers.SerializerMethodField()

    class Meta:
        model = Plan
        fields = [
            'id', 'plan_id', 'client', 'client_name', 'stand', 'stand_addr',
            'architect', 'architect_name', 'suburb', 'category', 'status',
            'is_owner', 'owner_name', 'power_of_attorney',
            'title_deed', 'structural_cert', 'receipt_scan',
            'declared_area', 'calculated_area',
            'submitted_at', 'created_at', 'updated_at', 'flag_count'
        ]
        read_only_fields = ['id', 'plan_id', 'created_at', 'updated_at']

    def get_flag_count(self, obj):
        return obj.flags.filter(is_resolved=False).count()


# ─────────────────────────────────────────────
# PLAN (detail — nested)
# ─────────────────────────────────────────────

class PlanDetailSerializer(PlanListSerializer):
    versions = PlanVersionSerializer(many=True, read_only=True)
    flags    = FlagSerializer(many=True, read_only=True)
    receipt  = ReceiptSerializer(read_only=True)
    approval = ApprovalSerializer(read_only=True)

    class Meta(PlanListSerializer.Meta):
        fields = PlanListSerializer.Meta.fields + ['versions', 'flags', 'receipt', 'approval']


# ─────────────────────────────────────────────
# AUDIT LOG
# ─────────────────────────────────────────────

class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'user_name', 'action', 'target_model',
                  'target_id', 'old_value', 'new_value', 'ip_address', 'timestamp']
        read_only_fields = fields
