
from django.db.models import Count, Q

def can_finalize(plan):
    version = plan.get_current_version()
    if not version:
        return False

    reviews = version.department_reviews.all()

    if not reviews.exists():
        return False

    # If any rejected by head, cannot finalize
    if reviews.filter(head_status="HEAD_REJECTED").exists():
        return False

    # All must be confirmed by head
    total = reviews.count()
    approved = reviews.filter(head_status="HEAD_CONFIRMED").count()

    return total == approved
