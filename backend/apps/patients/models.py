from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import TenantModel


class Patient(TenantModel):
    """Patient master record. MRN is auto-generated as {ORG_CODE}-{YYYY}-{seq:05d}."""

    GENDER_CHOICES = [
        ("MALE", "Male"),
        ("FEMALE", "Female"),
        ("OTHER", "Other"),
    ]
    BLOOD_TYPE_CHOICES = [
        ("A+", "A+"),
        ("A-", "A-"),
        ("B+", "B+"),
        ("B-", "B-"),
        ("AB+", "AB+"),
        ("AB-", "AB-"),
        ("O+", "O+"),
        ("O-", "O-"),
        ("UNKNOWN", "Unknown"),
    ]
    MARITAL_STATUS_CHOICES = [
        ("SINGLE", "Single"),
        ("MARRIED", "Married"),
        ("DIVORCED", "Divorced"),
        ("WIDOWED", "Widowed"),
        ("OTHER", "Other"),
    ]
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("INACTIVE", "Inactive"),
        ("DECEASED", "Deceased"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="patient_profile",
    )
    mrn = models.CharField(max_length=32, unique=True, editable=False)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, null=True, blank=True)
    blood_type = models.CharField(max_length=10, choices=BLOOD_TYPE_CHOICES, default="UNKNOWN")
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    nationality = models.CharField(max_length=100, blank=True)
    marital_status = models.CharField(
        max_length=10, choices=MARITAL_STATUS_CHOICES, null=True, blank=True
    )
    occupation = models.CharField(max_length=150, blank=True)
    photo = models.ImageField(upload_to="patient_photos/", null=True, blank=True)
    registration_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="ACTIVE")
    notes = models.TextField(blank=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Patient"
        verbose_name_plural = "Patients"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} ({self.mrn})"

    @property
    def full_name(self):
        return " ".join(part for part in (self.first_name, self.last_name) if part) or "(no name)"

    def _resolve_organization(self):
        """Resolve the tenant org: explicit FK first, then the tenant context var (an org id)."""
        if self.organization_id:
            return self.organization
        try:
            from apps.core.models import current_org

            org_id = current_org.get()
            if org_id is not None:
                from apps.organizations.models import Organization

                return Organization.objects.filter(pk=org_id).first()
        except Exception:
            pass
        return None

    def _generate_mrn(self, org=None):
        code = (getattr(org, "code", None) or "ORG").upper()
        if code == "ORG" and self.organization_id:
            try:
                from apps.organizations.models import Organization

                code = (
                    Organization.objects.filter(pk=self.organization_id)
                    .values_list("code", flat=True)
                    .first()
                    or "ORG"
                )
            except Exception:
                pass
        year = timezone.now().year
        prefix = f"{code}-{year}-"
        last_mrn = (
            Patient.objects.filter(mrn__startswith=prefix)
            .order_by("-mrn")
            .values_list("mrn", flat=True)
            .first()
        )
        seq = 1
        if last_mrn:
            try:
                seq = int(last_mrn.rsplit("-", 1)[1]) + 1
            except (ValueError, IndexError):
                seq = 1
        return f"{prefix}{seq:05d}"

    def save(self, *args, **kwargs):
        if not self.mrn:
            if self.organization_id is None:
                # Mirror TenantModel.save so the MRN carries the real org code.
                org = self._resolve_organization()
                if org is not None:
                    self.organization = org
            self.mrn = self._generate_mrn(self.organization if self.organization_id else None)
        super().save(*args, **kwargs)


class PatientAllergy(TenantModel):
    SEVERITY_CHOICES = [
        ("MILD", "Mild"),
        ("MODERATE", "Moderate"),
        ("SEVERE", "Severe"),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="allergies")
    allergen = models.CharField(max_length=255)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default="MILD")
    reaction = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Patient Allergy"
        verbose_name_plural = "Patient Allergies"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.patient.mrn} — {self.allergen}"


class PatientCondition(TenantModel):
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("RESOLVED", "Resolved"),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="conditions")
    name = models.CharField(max_length=255)
    icd_code = models.CharField(max_length=20, blank=True)
    diagnosed_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="ACTIVE")
    notes = models.TextField(blank=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Patient Condition"
        verbose_name_plural = "Patient Conditions"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.patient.mrn} — {self.name}"


class EmergencyContact(TenantModel):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="emergency_contacts")
    name = models.CharField(max_length=150)
    relation = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20)
    notes = models.TextField(blank=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Emergency Contact"
        verbose_name_plural = "Emergency Contacts"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.patient.mrn} — {self.name}"


class PatientDocument(TenantModel):
    CATEGORY_CHOICES = [
        ("LAB", "Lab"),
        ("IMAGING", "Imaging"),
        ("PRESCRIPTION", "Prescription"),
        ("ID", "ID"),
        ("INSURANCE", "Insurance"),
        ("CONSENT", "Consent"),
        ("OTHER", "Other"),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="documents")
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="OTHER")
    file = models.FileField(upload_to="patient_documents/")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    notes = models.TextField(blank=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Patient Document"
        verbose_name_plural = "Patient Documents"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.patient.mrn} — {self.title}"


class ConsentRecord(TenantModel):
    TYPE_CHOICES = [
        ("TREATMENT", "Treatment"),
        ("SURGERY", "Surgery"),
        ("RESEARCH", "Research"),
        ("PRIVACY", "Privacy"),
        ("OTHER", "Other"),
    ]
    STATUS_CHOICES = [
        ("SIGNED", "Signed"),
        ("PENDING", "Pending"),
        ("REVOKED", "Revoked"),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="consents")
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="TREATMENT")
    description = models.TextField(blank=True)
    document = models.FileField(upload_to="consents/", null=True, blank=True)
    signed_by = models.CharField(max_length=150, blank=True)
    signed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="PENDING")

    class Meta(TenantModel.Meta):
        verbose_name = "Consent Record"
        verbose_name_plural = "Consent Records"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.patient.mrn} — {self.get_type_display()}"
