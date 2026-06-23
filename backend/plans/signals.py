
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Plan, DepartmentReview, CategoryDepartmentMapping


@receiver(post_save, sender=Plan)
def create_department_reviews(sender, instance, created, **kwargs):
    # Only trigger when moved to IN_REVIEW or REVIEW_POOL
    if instance.status in ["REVIEW_POOL", "IN_REVIEW"]:
        current_version = instance.get_current_version()
        if not current_version:
            return

        # Avoid duplicate creation on the current version
        if current_version.department_reviews.exists():
            return

        mappings = CategoryDepartmentMapping.objects.filter(
            category=instance.category
        )

        for mapping in mappings:
            DepartmentReview.objects.create(
                plan_version=current_version,
                department=mapping.department,
                officer_status="PENDING",
                head_status="PENDING",
                deadline=timezone.now() + timezone.timedelta(days=7)
            )


@receiver(post_save, sender=Plan)
def on_plan_status_change(sender, instance, created, update_fields, **kwargs):
    """
    Fire an async Celery email whenever a plan's status field changes.
    Skipped on creation and when status was not part of the update.
    """
    if created:
        return
    if update_fields is not None and 'status' not in update_fields:
        return

    email = instance.client.email if instance.client else None
    if not email:
        return

    from .tasks import send_plan_status_email
    send_plan_status_email.delay(
        email,
        instance.plan_id or str(instance.id),
        instance.status,
        instance.stand_addr or 'N/A',
    )
