from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import TenantModel, current_org

from .services import compute_flag


class LabTest(TenantModel):
    """A test in the laboratory catalog with its reference range."""

    class Category(models.TextChoices):
        HEMATOLOGY = "HEMATOLOGY", "Hematology"
        BIOCHEMISTRY = "BIOCHEMISTRY", "Biochemistry"
        MICROBIOLOGY = "MICROBIOLOGY", "Microbiology"
        IMMUNOLOGY = "IMMUNOLOGY", "Immunology"
        URINALYSIS = "URINALYSIS", "Urinalysis"
        OTHER = "OTHER", "Other"

    class SampleType(models.TextChoices):
        BLOOD = "BLOOD", "Blood"
        URINE = "URINE", "Urine"
        STOOL = "STOOL", "Stool"
        SWAB = "SWAB", "Swab"
        CSF = "CSF", "CSF"
        OTHER = "OTHER", "Other"

    code = models.CharField(max_length=50, verbose_name="Code")
    name = models.CharField(max_length=200, verbose_name="Name")
    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.BIOCHEMISTRY
    )
    sample_type = models.CharField(
        max_length=10, choices=SampleType.choices, default=SampleType.BLOOD
    )
    unit = models.CharField(max_length=30, blank=True)
    ref_range_low = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Ref range low"
    )
    ref_range_high = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Ref range high"
    )
    price = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "lab test"
        verbose_name_plural = "lab tests"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["organization", "code"], name="uniq_org_labtest_code")
        ]
        indexes = [models.Index(fields=["organization", "category", "active"])]

    def __str__(self) -> str:
        return f"{self.name} ({self.code})" if self.code else self.name


class LabOrder(TenantModel):
    """A laboratory order for one patient, possibly spanning several tests."""

    class Priority(models.TextChoices):
        ROUTINE = "ROUTINE", "Routine"
        URGENT = "URGENT", "Urgent"
        STAT = "STAT", "Stat"

    class Status(models.TextChoices):
        ORDERED = "ORDERED", "Ordered"
        SAMPLES_COLLECTED = "SAMPLES_COLLECTED", "Samples collected"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    patient = models.ForeignKey(
        "patients.Patient", on_delete=models.CASCADE, related_name="lab_orders"
    )
    encounter = models.ForeignKey(
        "clinical.Encounter",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lab_orders",
    )
    tests = models.ManyToManyField(LabTest, related_name="orders")
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.ROUTINE
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ORDERED
    )
    ordered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="lab_orders_ordered",
        verbose_name="Ordered by",
    )
    ordered_at = models.DateTimeField(auto_now_add=True, verbose_name="Ordered at")
    notes = models.TextField(blank=True)
    result_reported_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "lab order"
        verbose_name_plural = "lab orders"
        ordering = ["-ordered_at"]
        indexes = [
            models.Index(fields=["organization", "patient", "-ordered_at"]),
            models.Index(fields=["organization", "status", "-ordered_at"]),
        ]

    def __str__(self) -> str:
        return f"LabOrder #{self.pk} — patient {self.patient_id} ({self.status})"


class LabSample(TenantModel):
    """A physical sample drawn for one test of an order."""

    class Status(models.TextChoices):
        COLLECTED = "COLLECTED", "Collected"
        IN_TRANSIT = "IN_TRANSIT", "In transit"
        RECEIVED = "RECEIVED", "Received"
        REJECTED = "REJECTED", "Rejected"

    order = models.ForeignKey(LabOrder, on_delete=models.CASCADE, related_name="samples")
    test = models.ForeignKey(LabTest, on_delete=models.CASCADE, related_name="samples")
    sample_id = models.CharField(max_length=64, unique=True, blank=True, verbose_name="Sample ID")
    collected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="samples_collected",
        verbose_name="Collected by",
    )
    collected_at = models.DateTimeField(null=True, blank=True, verbose_name="Collected at")
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.COLLECTED
    )
    rejection_reason = models.TextField(blank=True, verbose_name="Rejection reason")

    class Meta:
        verbose_name = "lab sample"
        verbose_name_plural = "lab samples"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["organization", "order", "test"]),
        ]

    def __str__(self) -> str:
        return f"{self.sample_id} — {self.test} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.sample_id:
            org_id = self.organization_id
            if org_id is None:
                org_id = current_org.get()
            org_code = "ORG"
            if org_id is not None:
                from apps.organizations.models import Organization

                org = Organization.objects.filter(pk=org_id).only("code").first()
                org_code = org.code if org else "ORG"
            year = timezone.now().year
            prefix = f"{org_code}-{year}"
            seq = (
                LabSample.objects.all_orgs()
                .filter(sample_id__startswith=prefix)
                .count()
                + 1
            )
            self.sample_id = f"{prefix}-{seq:04d}"
        super().save(*args, **kwargs)


class LabResult(TenantModel):
    """A result value for one test of an order; flag computed from ref range."""

    class Flag(models.TextChoices):
        NORMAL = "NORMAL", "Normal"
        ABNORMAL = "ABNORMAL", "Abnormal"
        CRITICAL = "CRITICAL", "Critical"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        REVIEWED = "REVIEWED", "Reviewed"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    order = models.ForeignKey(LabOrder, on_delete=models.CASCADE, related_name="results")
    test = models.ForeignKey(LabTest, on_delete=models.CASCADE, related_name="results")
    value = models.CharField(max_length=100, verbose_name="Value")
    unit = models.CharField(max_length=30, blank=True)
    flag = models.CharField(
        max_length=10, choices=Flag.choices, default=Flag.NORMAL
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lab_results_reviewed",
        verbose_name="Reviewed by",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name="Reviewed at")
    notes = models.TextField(blank=True)
    attachment = models.FileField(upload_to="lab_results/", null=True, blank=True)

    class Meta:
        verbose_name = "lab result"
        verbose_name_plural = "lab results"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "order"]),
            models.Index(fields=["organization", "status", "flag"]),
        ]

    def __str__(self) -> str:
        return f"{self.test} = {self.value} ({self.flag})"

    def save(self, *args, **kwargs):
        self.flag = compute_flag(self.test, self.value)
        super().save(*args, **kwargs)


class LabReport(TenantModel):
    """Generated PDF report for a completed lab order (one per order)."""

    order = models.OneToOneField(
        LabOrder, on_delete=models.CASCADE, related_name="report"
    )
    file = models.FileField(upload_to="lab_reports/", verbose_name="File")
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lab_reports_generated",
        verbose_name="Generated by",
    )
    generated_at = models.DateTimeField(auto_now_add=True, verbose_name="Generated at")

    class Meta:
        verbose_name = "lab report"
        verbose_name_plural = "lab reports"
        ordering = ["-generated_at"]

    def __str__(self) -> str:
        return f"Report for order #{self.order_id}"
