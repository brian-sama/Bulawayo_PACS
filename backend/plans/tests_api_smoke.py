import shutil
import tempfile
from pathlib import Path

import fitz
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    Approval,
    CategoryDepartmentMapping,
    ChecklistTemplate,
    Department,
    DepartmentReview,
    DepartmentReviewStage,
    Notification,
    Plan,
    PlanStatus,
    RequiredDocument,
    User,
    UserRole,
    UserType,
)


TEST_MEDIA_ROOT = Path(tempfile.mkdtemp(prefix="pacs-test-media-"))


@override_settings(
    MEDIA_ROOT=str(TEST_MEDIA_ROOT),
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class ApiSmokeTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEST_MEDIA_ROOT, ignore_errors=True)

    def setUp(self):
        self.department = Department.objects.create(name="Planning", code="PLAN", display_order=1)
        self.housing_department = Department.objects.create(name="Housing Office", code="HOUSING", display_order=2)
        self.estates_department = Department.objects.create(name="Estates Department", code="ESTATES", display_order=3)
        self.valuation_department = Department.objects.create(name="Valuation Department", code="VALUATION", display_order=4)

        self.client_user = User.objects.create_user(
            username="client",
            email="client@example.com",
            password="ClientPass123!",
            full_name="Client User",
            role=UserRole.CLIENT,
            user_type=UserType.OWNER,
        )
        self.reception_user = User.objects.create_user(
            username="reception",
            email="reception@example.com",
            password="ReceptionPass123!",
            full_name="Reception User",
            role=UserRole.RECEPTION,
        )
        self.officer_user = User.objects.create_user(
            username="officer",
            email="officer@example.com",
            password="OfficerPass123!",
            full_name="Officer User",
            role=UserRole.DEPT_OFFICER,
            department=self.department,
        )
        self.housing_user = User.objects.create_user(
            username="housing",
            email="housing@example.com",
            password="HousingPass123!",
            full_name="Housing Officer",
            role=UserRole.DEPT_OFFICER,
            department=self.housing_department,
        )
        self.estates_user = User.objects.create_user(
            username="estates",
            email="estates@example.com",
            password="EstatesPass123!",
            full_name="Estates Officer",
            role=UserRole.DEPT_OFFICER,
            department=self.estates_department,
        )
        self.valuation_user = User.objects.create_user(
            username="valuation",
            email="valuation@example.com",
            password="ValuationPass123!",
            full_name="Valuation Officer",
            role=UserRole.DEPT_OFFICER,
            department=self.valuation_department,
        )
        self.head_user = User.objects.create_user(
            username="head",
            email="head@example.com",
            password="HeadPass123!",
            full_name="Head User",
            role=UserRole.DEPT_HEAD,
            department=self.department,
        )
        self.final_user = User.objects.create_user(
            username="final",
            email="final@example.com",
            password="FinalPass123!",
            full_name="Final Approver",
            role=UserRole.FINAL_APPROVER,
        )
        self.final_user.set_signing_password("SealPass123!")
        self.final_user.save(update_fields=["signing_password"])

        CategoryDepartmentMapping.objects.create(
            category="RESIDENTIAL",
            department=self.department,
        )

        template = ChecklistTemplate.objects.create(name="Residential", plan_type="RESIDENTIAL")
        self.required_doc = RequiredDocument.objects.create(
            template=template,
            code="ARCH_PLANS",
            label="Architectural Drawings (PDF)",
            is_optional=False,
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def pdf_upload(self, name="sample.pdf"):
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((72, 72), "Bulawayo PACS Test PDF", fontsize=12)
        pdf_bytes = doc.tobytes(garbage=4, deflate=True)
        doc.close()
        return SimpleUploadedFile(name, pdf_bytes, content_type="application/pdf")

    def test_register_login_and_me(self):
        register_response = self.client.post(
            "/api/auth/register/",
            {
                "email": "newclient@example.com",
                "full_name": "New Client",
                "id_number": "12345678",
                "phone": "0772000000",
                "password": "NewClientPass123!",
                "user_type": UserType.OWNER,
            },
            format="json",
        )
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)

        login_response = self.client.post(
            "/api/auth/login/",
            {
                "username": "newclient@example.com",
                "password": "NewClientPass123!",
            },
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        access = login_response.data["tokens"]["access"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        me_response = self.client.get("/api/auth/me/")
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["email"], "newclient@example.com")

    def test_submission_flow_and_key_api_routes(self):
        self.authenticate(self.client_user)
        plan_response = self.client.post(
            "/api/plans/",
            {
                "stand_number": "12345",
                "suburb": "Selbourne Park",
                "category": "RESIDENTIAL",
                "stand_type": "RESIDENTIAL_LOW_DENSITY",
                "development_description": "New residential house",
            },
            format="multipart",
        )
        self.assertEqual(plan_response.status_code, status.HTTP_201_CREATED)
        plan_id = plan_response.data["id"]

        prelim_response = self.client.post(
            f"/api/plans/{plan_id}/submit_preliminary/",
            {"plan_file": self.pdf_upload("preliminary.pdf")},
            format="multipart",
        )
        self.assertEqual(prelim_response.status_code, status.HTTP_200_OK)

        preliminary_reviews = DepartmentReview.objects.filter(
            plan_version__plan_id=plan_id,
            review_stage=DepartmentReviewStage.PRELIMINARY,
        )
        self.assertEqual(preliminary_reviews.count(), 3)

        self.authenticate(self.housing_user)
        housing_response = self.client.post(
            f"/api/department-reviews/{preliminary_reviews.get(department=self.housing_department).id}/evaluate/",
            {"role": "OFFICER", "status": "APPROVED", "comment": ""},
            format="json",
        )
        self.assertEqual(housing_response.status_code, status.HTTP_200_OK)

        self.authenticate(self.estates_user)
        estates_response = self.client.post(
            f"/api/department-reviews/{preliminary_reviews.get(department=self.estates_department).id}/evaluate/",
            {"role": "OFFICER", "status": "APPROVED", "comment": ""},
            format="json",
        )
        self.assertEqual(estates_response.status_code, status.HTTP_200_OK)

        self.authenticate(self.valuation_user)
        valuation_response = self.client.post(
            f"/api/department-reviews/{preliminary_reviews.get(department=self.valuation_department).id}/evaluate/",
            {"role": "OFFICER", "status": "APPROVED", "comment": "", "amount_payable": "100.00"},
            format="json",
        )
        self.assertEqual(valuation_response.status_code, status.HTTP_200_OK)

        download_plan_response = self.client.get(f"/api/plans/{plan_id}/download/")
        self.assertEqual(download_plan_response.status_code, status.HTTP_200_OK)
        self.assertEqual(download_plan_response["Content-Type"], "application/pdf")

        self.authenticate(self.reception_user)
        invoice_response = self.client.post(
            "/api/proforma-invoices/",
            {
                "plan": plan_id,
                "notes": "Initial proforma",
                "line_items": [
                    {
                        "label": "Plan review fee",
                        "vote_no": "0074/50363",
                        "amount_zwl": "100.00",
                        "amount_usd": "10.00",
                        "is_rates_payment": False,
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(invoice_response.status_code, status.HTTP_201_CREATED)
        invoice_id = invoice_response.data["id"]

        self.authenticate(self.client_user)
        download_invoice_response = self.client.get(f"/api/proforma-invoices/{invoice_id}/download/")
        self.assertEqual(download_invoice_response.status_code, status.HTTP_200_OK)
        self.assertEqual(download_invoice_response["Content-Type"], "application/pdf")

        self.authenticate(self.reception_user)
        payment_response = self.client.post(
            f"/api/proforma-invoices/{invoice_id}/confirm_payment/",
            {
                "receipt_number": "RCT-1001",
                "payment_date": "2026-04-09",
                "amount_zwl": "100.00",
                "amount_usd": "10.00",
                "payment_method": "Cash",
            },
            format="multipart",
        )
        self.assertEqual(payment_response.status_code, status.HTTP_200_OK)

        self.authenticate(self.client_user)
        submitted_doc_response = self.client.post(
            "/api/submitted-documents/",
            {
                "plan": str(plan_id),
                "required_doc": str(self.required_doc.id),
                "file": self.pdf_upload("supporting.pdf"),
            },
            format="multipart",
        )
        self.assertEqual(submitted_doc_response.status_code, status.HTTP_201_CREATED)
        doc_id = submitted_doc_response.data["id"]

        submit_docs_response = self.client.post(f"/api/plans/{plan_id}/submit_documents/")
        self.assertEqual(submit_docs_response.status_code, status.HTTP_200_OK)

        self.authenticate(self.reception_user)
        verify_response = self.client.post(
            f"/api/submitted-documents/{doc_id}/verify/",
            {"comment": "Verified"},
            format="json",
        )
        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)

        submit_review_response = self.client.post(f"/api/plans/{plan_id}/submit_to_review/")
        self.assertEqual(submit_review_response.status_code, status.HTTP_200_OK)
        self.assertEqual(submit_review_response.data["status"], PlanStatus.REVIEW_POOL)

        review = DepartmentReview.objects.get(plan_version__plan_id=plan_id, department=self.department)

        self.authenticate(self.officer_user)
        officer_response = self.client.post(
            f"/api/department-reviews/{review.id}/evaluate/",
            {"role": "OFFICER", "status": "APPROVED", "comment": ""},
            format="json",
        )
        self.assertEqual(officer_response.status_code, status.HTTP_200_OK)

        self.authenticate(self.head_user)
        head_response = self.client.post(
            f"/api/department-reviews/{review.id}/evaluate/",
            {"role": "HEAD", "status": "APPROVED", "comment": ""},
            format="json",
        )
        self.assertEqual(head_response.status_code, status.HTTP_200_OK)

        plan = Plan.objects.get(pk=plan_id)
        self.assertEqual(plan.status, PlanStatus.AWAITING_FINAL_DECISION)

        self.authenticate(self.final_user)
        approval_response = self.client.post(
            f"/api/plans/{plan_id}/approve_final/",
            {"signing_password": "SealPass123!", "notes": "Approved after all checks."},
            format="json",
        )
        self.assertEqual(approval_response.status_code, status.HTTP_200_OK)

        plan.refresh_from_db()
        self.assertEqual(plan.status, PlanStatus.APPROVED)
        self.assertTrue(Approval.objects.filter(plan=plan).exists())

        self.authenticate(self.client_user)
        notifications_response = self.client.get("/api/notifications/")
        self.assertEqual(notifications_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(notifications_response.data), 1)

        mark_all_read_response = self.client.post("/api/notifications/mark_all_read/")
        self.assertEqual(mark_all_read_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            Notification.objects.filter(recipient=self.client_user, is_read=False).count(),
            0,
        )
