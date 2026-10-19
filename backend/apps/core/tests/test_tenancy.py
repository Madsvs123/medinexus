from django.test import TestCase, override_settings

from apps.accounts.models import User
from apps.core.models import current_org, tenant_context
from apps.organizations.models import Organization


@override_settings(USE_TZ=True)
class TenancyIsolationTests(TestCase):
    """Real tenant isolation test: org A users cannot see org B patients."""

    @classmethod
    def setUpTestData(cls):
        cls.org_a = Organization.objects.create(name="Org A", code="ORGA")
        cls.org_b = Organization.objects.create(name="Org B", code="ORGB")
        cls.user_a = User.objects.create_user(
            email="a@test.dev", password="pass1234", organization=cls.org_a, role=User.DOCTOR
        )
        cls.user_b = User.objects.create_user(
            email="b@test.dev", password="pass1234", organization=cls.org_b, role=User.DOCTOR
        )

    def test_tenant_manager_filters_by_context(self):
        from apps.patients.models import Patient

        with tenant_context(self.org_a.id):
            p1 = Patient.objects.create(first_name="Alice", last_name="A")
        with tenant_context(self.org_b.id):
            p2 = Patient.objects.create(first_name="Bob", last_name="B")

        with tenant_context(self.org_a.id):
            visible = list(Patient.objects.all())
            self.assertIn(p1, visible)
            self.assertNotIn(p2, visible)

        with tenant_context(self.org_b.id):
            visible = list(Patient.objects.all())
            self.assertIn(p2, visible)
            self.assertNotIn(p1, visible)

    def test_save_assigns_organization_from_context(self):
        from apps.patients.models import Patient

        with tenant_context(self.org_a.id):
            patient = Patient.objects.create(first_name="Carol", last_name="C")
        patient.refresh_from_db()
        self.assertEqual(patient.organization_id, self.org_a.id)

    def test_object_access_permission_denies_cross_org(self):
        from apps.core.permissions import HasOrgAccess

        from apps.patients.models import Patient

        with tenant_context(self.org_b.id):
            foreign = Patient.objects.create(first_name="Dave", last_name="D")

        from rest_framework.test import APIRequestFactory

        request = APIRequestFactory().get("/")
        request.user = self.user_a
        with self.assertRaises(Exception) as ctx:
            HasOrgAccess().has_object_permission(request, None, foreign)
        self.assertIn("access", str(ctx.exception).lower())
