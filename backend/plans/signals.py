
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
