"""
Celery tasks for Bulawayo PACS — async email notifications.
"""

from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_plan_status_email(self, to_email: str, plan_id: str, new_status: str, plan_address: str):
    """
    Send a status-change email to a plan applicant.

    Retried up to 3 times with a 60-second back-off on transient mail errors.
    """
    subject = f'[Bulawayo PACS] Plan {plan_id} — Status Update'
    body = (
        f'Your building plan application for {plan_address} has been updated.\n\n'
        f'New status: {new_status.replace("_", " ").title()}\n\n'
        f'Log in to the Bulawayo PACS portal to view details.\n\n'
        f'Bulawayo City Council — Plan Approval and Control System'
    )
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to_email])
    except Exception as exc:
        raise self.retry(exc=exc)
