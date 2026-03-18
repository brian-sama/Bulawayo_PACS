"""
Notification dispatch service for Bulawayo PACS.

Currently creates IN_APP notifications.
Email and SMS are stubbed — integrate with a mail/SMS provider later.
"""

from django.utils import timezone


from django.core.mail import send_mail
from django.conf import settings


def dispatch_notification(user, notification_type: str, message: str, subject: str = ''):
    """
    Create an in-app notification and dispatch to external channels (Email/SMS).
    """
    from plans.models import Notification, NotificationChannel

    # 1. In-app notification
    Notification.objects.create(
        recipient=user,
        type=notification_type,
        channel=NotificationChannel.IN_APP,
        subject=subject,
        message=message,
    )

    # 2. Real Email
    _send_real_email(user, subject or notification_type, message)

    # 3. SMS stub (SMS gateways usually require paid API keys, keeping as log for now)
    _send_sms_stub(user, message)


def _send_real_email(user, subject: str, body: str):
    """Send email via Django configured backend."""
    email = getattr(user, 'email', None)
    if not email:
        return

    try:
        send_mail(
            subject=f"Bulawayo PACS: {subject}",
            message=body,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'pacs@bulawayo.co.zw'),
            recipient_list=[email],
            fail_silently=True,
        )
    except Exception as e:
        print(f"Error sending email to {email}: {str(e)}")


def _send_sms_stub(user, body: str):
    """Stub: log SMS to console."""
    phone = getattr(user, 'phone', None)
    if phone:
        # Truncate to 160 chars
        sms_body = body[:160]
        print(f"[SMS DISPATCH] To: {phone} | {sms_body}")


# ──────────────────────────────────────────────────────────────────
# NOTIFICATION MESSAGE TEMPLATES
# (reference — used by views when calling dispatch_notification)
# ──────────────────────────────────────────────────────────────────

TEMPLATES = {
    'PROFORMA_ISSUED': {
        'subject': 'Proforma Invoice Issued — {invoice_number}',
        'sms':     'Bulawayo PACS: Proforma {invoice_number} issued for {plan_id}. Pay & upload receipt.',
        'email':   (
            'Dear {client_name},\n\n'
            'A proforma invoice ({invoice_number}) has been issued for your planning application ({plan_id}).\n'
            'Total Due: ZWL {total_zwl} / USD {total_usd}\n\n'
            'Please pay at the Bulawayo City Council cashier and upload your receipt on the PACS portal.\n\n'
            'Bulawayo PACS'
        ),
    },
    'PAYMENT_CONFIRMED': {
        'subject': 'Payment Confirmed for {plan_id}',
        'sms':     'Bulawayo PACS: Payment confirmed for {plan_id}. Docs being verified.',
        'email':   (
            'Dear {client_name},\n\n'
            'Your payment (Receipt #{receipt_number}) for application {plan_id} has been confirmed.\n'
            'Your documents will now be verified by the receptionist.\n\n'
            'Bulawayo PACS'
        ),
    },
    'PLAN_NUMBER_ASSIGNED': {
        'subject': 'Plan Number Assigned — {plan_number}',
        'sms':     'Bulawayo PACS: Plan number {plan_number} assigned to your application {plan_id}.',
        'email':   (
            'Dear {client_name},\n\n'
            'Your application has been fully verified. '
            'Your official plan number is: {plan_number}\n\n'
            'Your plans will now be circulated to the relevant departments for review.\n\n'
            'Bulawayo PACS'
        ),
    },
    'DEPT_DECISION': {
        'subject': 'Department Decision — {plan_id}',
        'sms':     '{dept_name} has reviewed {plan_id}: {decision}.',
        'email':   (
            'Dear {client_name},\n\n'
            '{dept_name} has submitted a review decision on your application {plan_id}:\n'
            'Decision: {decision}\n'
            'Comments: {comment}\n\n'
            'Bulawayo PACS'
        ),
    },
    'FINAL_DECISION': {
        'subject': 'Final Decision — {plan_id}',
        'sms':     'Bulawayo PACS: Final decision on {plan_id}: {decision}.',
        'email':   (
            'Dear {client_name},\n\n'
            'A final decision has been made on your planning application {plan_id}.\n'
            'Decision: {decision}\n'
            'Reason: {reason}\n\n'
            'Bulawayo PACS'
        ),
    },
    'PLAN_REJECTED': {
        'subject': 'Application Rejected — {plan_id}',
        'sms':     'Bulawayo PACS: Application {plan_id} rejected. Reason: {reason}',
        'email':   (
            'Dear {client_name},\n\n'
            'Your planning application {plan_id} has been rejected at pre-screening.\n'
            'Reason: {reason}\n\n'
            'You may resubmit your application after addressing the issues noted above.\n\n'
            'Bulawayo PACS'
        ),
    },
    'DOCUMENTS_REQUESTED': {
        'subject': 'Documents Required — {plan_id}',
        'sms':     'Bulawayo PACS: Missing/rejected documents for {plan_id}. Please re-upload.',
        'email':   (
            'Dear {client_name},\n\n'
            'The following document for your application {plan_id} requires re-upload:\n'
            '{doc_label}\n'
            'Reason: {reason}\n\n'
            'Please log in to the PACS portal and upload the corrected document.\n\n'
            'Bulawayo PACS'
        ),
    },
}
