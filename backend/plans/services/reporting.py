
from django.db.models import Avg, Count
from django.utils.timezone import now

def average_review_time(queryset):
    return queryset.aggregate(avg_time=Avg("reviewed_at"))

def department_review_stats(model):
    return model.objects.values("department__name").annotate(
        total=Count("id"),
        approved=Count("id", filter=Q(status="APPROVED")),
        rejected=Count("id", filter=Q(status="REJECTED"))
    )
