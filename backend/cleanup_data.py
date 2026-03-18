import os
import django
import sys

# Add the current directory to sys.path to find bcc_backend
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bcc_backend.settings')
django.setup()

from plans.models import (
    Plan, PlanVersion, Comment, Flag, DepartmentReview,
    ProformaInvoice, FinalDecision, Notification, AuditLog
)

print("Cleaning up database...")
try:
    Notification.objects.all().delete()
    print("- Deleted Notifications")
    FinalDecision.objects.all().delete()
    print("- Deleted Final Decisions")
    ProformaInvoice.objects.all().delete()
    print("- Deleted Proforma Invoices")
    DepartmentReview.objects.all().delete()
    print("- Deleted Department Reviews")
    Comment.objects.all().delete()
    print("- Deleted Comments")
    Flag.objects.all().delete()
    print("- Deleted Flags")
    PlanVersion.objects.all().delete()
    print("- Deleted Plan Versions")
    Plan.objects.all().delete()
    print("- Deleted Plans")
    AuditLog.objects.all().delete()
    print("- Deleted Audit Logs")
    print("Cleanup complete.")
except Exception as e:
    print(f"Error during cleanup: {e}")
