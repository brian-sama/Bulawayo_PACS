from rest_framework.test import APITestCase
from rest_framework import status
from .models import (
    User, UserRole, Plan, PlanStatus, StandProperty, ChecklistTemplate,
    RequiredDocument, SubmittedDocument, Department, DepartmentReview, DepartmentReviewStage,
    PlanVersion,
)

class SecurityRegressionTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email='client1@test.com',
            password='password123',
            role=UserRole.CLIENT,
            full_name='Test Client 1'
        )
        self.other_user = User.objects.create_user(
            email='client2@test.com',
            password='password123',
            role=UserRole.CLIENT,
            full_name='Test Client 2'
        )
        
        self.stand = StandProperty.objects.create(
            stand_number='1234', address='1234 Test Way'
        )
        
        self.plan = Plan.objects.create(
            client=self.user,
            stand=self.stand,
            category='RESIDENTIAL',
            status=PlanStatus.DRAFT
        )

        self.other_plan = Plan.objects.create(
            client=self.other_user,
            stand=self.stand,
            category='RESIDENTIAL',
            status=PlanStatus.DRAFT
        )

        self.template = ChecklistTemplate.objects.create(name="Default Template")
        self.req_doc = RequiredDocument.objects.create(
            template=self.template, code="RD1", label="Required Doc 1"
        )
        
        self.client.force_authenticate(user=self.user)

    def test_me_view_prevents_role_escalation(self):
        """Test that a user cannot elevate their own role to ADMIN."""
        response = self.client.patch('/api/auth/me/', {'role': 'ADMIN'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Fetch fresh user
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, UserRole.CLIENT, "User role should not be updated by PATCH /api/auth/me/")

    def test_plan_update_prevents_state_tampering(self):
        """Test that a client cannot change their plan status directly."""
        response = self.client.patch(f'/api/plans/{self.plan.id}/', {'status': 'APPROVED'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.plan.refresh_from_db()
        self.assertEqual(self.plan.status, PlanStatus.DRAFT, "Plan status should not be modifiable by clients.")

    def test_submitted_document_prevents_cross_account_upload(self):
        """Test that a client cannot upload a document against someone else's plan."""
        from django.core.files.uploadedfile import SimpleUploadedFile
        test_file = SimpleUploadedFile("test.pdf", b"file_content", content_type="application/pdf")
        
        response = self.client.post('/api/submitted-documents/', {
            'plan': self.other_plan.id,
            'required_doc': self.req_doc.id,
            'file': test_file
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, "Cross-account document uploads should be strictly forbidden.")

    def test_submitted_document_prevents_self_verification(self):
        """Test that a client cannot mark their own uploaded document as verified."""
        from django.core.files.uploadedfile import SimpleUploadedFile
        test_file = SimpleUploadedFile("test2.pdf", b"file_content", content_type="application/pdf")
        
        response = self.client.post('/api/submitted-documents/', {
            'plan': self.plan.id,
            'required_doc': self.req_doc.id,
            'file': test_file,
            'is_verified': True,
            'comment': 'I verified this myself.'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        doc_id = response.data['id']
        doc = SubmittedDocument.objects.get(id=doc_id)
        self.assertFalse(doc.is_verified, "is_verified should be ignored and set to False defaulting to standard upload logic.")
        self.assertEqual(doc.comment, '', "comment should be ignored on upload.")

    def test_reception_cannot_view_technical_review_pool_records(self):
        """Reception should only see preliminary reviews, not technical review pool records."""
        reception = User.objects.create_user(
            email='reception@test.com',
            password='password123',
            role=UserRole.RECEPTION,
            full_name='Reception User'
        )
        department = Department.objects.create(name='Planning', code='PLAN', display_order=1)
        version = PlanVersion.objects.create(
            plan=self.plan,
            version_number=1,
            uploaded_by=self.user,
            file='plans/test.pdf',
            notes='Test version',
        )
        DepartmentReview.objects.create(
            plan_version=version,
            department=department,
            review_stage=DepartmentReviewStage.TECHNICAL,
        )

        self.client.force_authenticate(user=reception)
        response = self.client.get('/api/department-reviews/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get('results', response.data)), 0)
