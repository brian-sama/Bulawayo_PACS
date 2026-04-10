from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import (
    User, Department, Architect, StandProperty, Plan,
    PlanVersion, Comment, Flag, Receipt, Approval, AuditLog,
    DepartmentReview, ChecklistTemplate, RequiredDocument,
    SubmittedDocument, ProformaInvoice, ProformaLineItem,
    PaymentReceipt, FinalDecision, Notification
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


class MeUpdateSerializer(UserSerializer):
    class Meta(UserSerializer.Meta):
        read_only_fields = UserSerializer.Meta.read_only_fields + [
            'role', 'user_type', 'department', 'is_active', 'is_email_verified'
        ]


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
# DEPARTMENT REVIEW  (dedicated serializer — replaces PlanDetailSerializer misuse)
# ─────────────────────────────────────────────

class DepartmentReviewSerializer(serializers.ModelSerializer):
    department_name  = serializers.CharField(source='department.name', read_only=True)
    officer_name     = serializers.CharField(source='officer.full_name', read_only=True)
    head_name        = serializers.CharField(source='head.full_name', read_only=True)
    plan_id          = serializers.CharField(source='plan_version.plan.plan_id', read_only=True)
    plan_pk          = serializers.IntegerField(source='plan_version.plan.id', read_only=True)
    version_number   = serializers.IntegerField(source='plan_version.version_number', read_only=True)
    plan_file        = serializers.FileField(source='plan_version.file', read_only=True)

    class Meta:
        model = DepartmentReview
        fields = [
            'id', 'plan_version', 'plan_id', 'plan_pk', 'version_number', 'plan_file',
            'department', 'department_name',
            'officer', 'officer_name', 'officer_status', 'officer_comment', 'officer_acted_at',
            'head', 'head_name', 'head_status', 'head_comment', 'head_acted_at',
            'assigned_at', 'deadline', 'escalated',
        ]
        read_only_fields = [
            'id', 'plan_version', 'plan_id', 'plan_pk', 'version_number', 'plan_file',
            'department_name', 'officer_name', 'head_name',
            'officer_acted_at', 'head_acted_at', 'assigned_at',
        ]


# ─────────────────────────────────────────────
# CHECKLIST TEMPLATES
# ─────────────────────────────────────────────

class RequiredDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = RequiredDocument
        fields = ['id', 'template', 'code', 'label', 'is_rates_payment', 'is_optional']
        read_only_fields = ['id']


class ChecklistTemplateSerializer(serializers.ModelSerializer):
    required_documents = RequiredDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = ChecklistTemplate
        fields = ['id', 'name', 'plan_type', 'created_at', 'required_documents']
        read_only_fields = ['id', 'created_at']


# ─────────────────────────────────────────────
# SUBMITTED DOCUMENTS
# ─────────────────────────────────────────────

class SubmittedDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.full_name', read_only=True)
    required_doc_label = serializers.CharField(source='required_doc.label', read_only=True)

    class Meta:
        model = SubmittedDocument
        fields = [
            'id', 'plan', 'required_doc', 'required_doc_label', 'label', 'file',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at',
            'verified_by', 'verified_by_name', 'verified_at', 'is_verified', 'comment',
        ]
        read_only_fields = ['id', 'uploaded_by', 'uploaded_at', 'verified_by', 'verified_at', 'is_verified', 'comment']
        extra_kwargs = {
            'label': {'required': False, 'allow_blank': True},
            'required_doc': {'required': False, 'allow_null': True},
        }

    def create(self, validated_data):
        validated_data['uploaded_by'] = self.context['request'].user
        # Copy label from required_doc if not provided
        if not validated_data.get('label') and validated_data.get('required_doc'):
            validated_data['label'] = validated_data['required_doc'].label
        return super().create(validated_data)


# ─────────────────────────────────────────────
# PROFORMA INVOICE
# ─────────────────────────────────────────────

class ProformaLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProformaLineItem
        fields = ['id', 'invoice', 'label', 'vote_no', 'amount_zwl', 'amount_usd', 'is_rates_payment']
        read_only_fields = ['id']


class PaymentReceiptSerializer(serializers.ModelSerializer):
    paid_by_name     = serializers.CharField(source='paid_by.full_name', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.full_name', read_only=True)

    class Meta:
        model = PaymentReceipt
        fields = [
            'id', 'invoice', 'amount_zwl', 'amount_usd', 'receipt_number',
            'paid_by', 'paid_by_name', 'payment_date', 'payment_method',
            'evidence_file', 'recorded_by', 'recorded_by_name', 'recorded_at',
        ]
        read_only_fields = ['id', 'paid_by', 'recorded_by', 'recorded_at']


class ProformaInvoiceSerializer(serializers.ModelSerializer):
    issued_by_name  = serializers.CharField(source='issued_by.full_name', read_only=True)
    line_items      = ProformaLineItemSerializer(many=True, read_only=True)
    payment_receipts = PaymentReceiptSerializer(many=True, read_only=True)

    class Meta:
        model = ProformaInvoice
        fields = [
            'id', 'plan', 'invoice_number', 'issued_by', 'issued_by_name',
            'issued_at', 'status', 'notes', 'reception_contacts', 'rates_comment',
            'total_zwl', 'total_usd', 'line_items', 'payment_receipts',
        ]
        read_only_fields = ['id', 'invoice_number', 'issued_by', 'issued_at', 'total_zwl', 'total_usd']


# ─────────────────────────────────────────────
# FINAL DECISION
# ─────────────────────────────────────────────

class FinalDecisionSerializer(serializers.ModelSerializer):
    final_approver_name = serializers.CharField(source='final_approver.full_name', read_only=True)

    class Meta:
        model = FinalDecision
        fields = ['id', 'plan', 'final_approver', 'final_approver_name',
                  'decision', 'reason', 'decided_at']
        read_only_fields = ['id', 'final_approver', 'decided_at']

    def validate_reason(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError(
                "A reason of at least 10 characters is required for the final decision."
            )
        return value


# ─────────────────────────────────────────────
# NOTIFICATION
# ─────────────────────────────────────────────

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'type', 'channel', 'subject', 'message', 'is_read', 'sent_at', 'read_at']
        read_only_fields = ['id', 'sent_at']


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


# ─────────────────────────────────────────────
# PLAN (list)
# ─────────────────────────────────────────────

class PlanListSerializer(serializers.ModelSerializer):
    client_name    = serializers.CharField(source='client.full_name', read_only=True)
    stand_addr     = serializers.CharField(source='stand.address', read_only=True)
    stand_number   = serializers.CharField(source='stand.stand_number', read_only=True)
    architect_name = serializers.CharField(source='architect.full_name', read_only=True)
    flag_count     = serializers.SerializerMethodField()

    class Meta:
        model = Plan
        fields = [
            'id', 'plan_id', 'plan_number', 'client', 'client_name',
            'stand', 'stand_addr', 'stand_number',
            'architect', 'architect_name', 'suburb', 'category', 'stand_type',
            'status', 'submission_type',
            'is_owner', 'owner_name',
            'is_representative', 'represents_owner_name', 'represents_owner_contact',
            'power_of_attorney', 'title_deed', 'structural_cert', 'receipt_scan',
            'development_description',
            'declared_area', 'calculated_area',
            'submitted_at', 'created_at', 'updated_at', 'flag_count',
        ]
        read_only_fields = ['id', 'plan_id', 'plan_number', 'created_at', 'updated_at']

    def get_flag_count(self, obj):
        return obj.flags.filter(is_resolved=False).count()


class PlanUpdateSerializer(PlanListSerializer):
    class Meta(PlanListSerializer.Meta):
        read_only_fields = PlanListSerializer.Meta.read_only_fields + [
            'status', 'submission_type', 'client', 'plan_id', 'plan_number', 
            'calculated_area', 'declared_area', 'submitted_at'
        ]


# ─────────────────────────────────────────────
# PLAN (detail — nested)
# ─────────────────────────────────────────────

class PlanDetailSerializer(PlanListSerializer):
    versions            = PlanVersionSerializer(many=True, read_only=True)
    flags               = FlagSerializer(many=True, read_only=True)
    receipt             = ReceiptSerializer(read_only=True)
    approval            = ApprovalSerializer(read_only=True)
    department_reviews  = serializers.SerializerMethodField()
    submitted_documents = SubmittedDocumentSerializer(many=True, read_only=True)
    proforma_invoices   = ProformaInvoiceSerializer(many=True, read_only=True)
    final_decision      = FinalDecisionSerializer(read_only=True)

    class Meta(PlanListSerializer.Meta):
        fields = PlanListSerializer.Meta.fields + [
            'versions', 'flags', 'receipt', 'approval',
            'department_reviews', 'submitted_documents',
            'proforma_invoices', 'final_decision',
        ]

    def get_department_reviews(self, obj):
        """Return reviews for the current (latest) version only."""
        current_version = obj.get_current_version()
        if not current_version:
            return []
        reviews = obj.get_current_reviews()
        return DepartmentReviewSerializer(reviews, many=True, context=self.context).data
