from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import TenantModel


class Medication(TenantModel):
    """A drug / item in the organization's formulary."""

    class Category(models.TextChoices):
        ANALGESIC = "ANALGESIC", "Analgesic"
        ANTIBIOTIC = "ANTIBIOTIC", "Antibiotic"
        CARDIOVASCULAR = "CARDIOVASCULAR", "Cardiovascular"
        DIABETES = "DIABETES", "Diabetes"
        RESPIRATORY = "RESPIRATORY", "Respiratory"
        GASTRO = "GASTRO", "Gastro"
        NEURO = "NEURO", "Neuro"
        OTHER = "OTHER", "Other"

    class Form(models.TextChoices):
        TABLET = "TABLET", "Tablet"
        CAPSULE = "CAPSULE", "Capsule"
        SYRUP = "SYRUP", "Syrup"
        INJECTION = "INJECTION", "Injection"
        CREAM = "CREAM", "Cream"
        INHALER = "INHALER", "Inhaler"
        DROPS = "DROPS", "Drops"

    code = models.CharField(max_length=50, verbose_name="Code")
    name = models.CharField(max_length=200, verbose_name="Name")
    generic_name = models.CharField(max_length=200, blank=True, verbose_name="Generic name")
    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.OTHER, verbose_name="Category"
    )
    form = models.CharField(
        max_length=20, choices=Form.choices, default=Form.TABLET, verbose_name="Form"
    )
    strength = models.CharField(max_length=50, blank=True, verbose_name="Strength")
    unit = models.CharField(max_length=20, blank=True, verbose_name="Unit")
    price = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00"), verbose_name="Price"
    )
    reorder_level = models.PositiveIntegerField(default=10, verbose_name="Reorder level")
    current_stock = models.PositiveIntegerField(default=0, verbose_name="Current stock")
    is_controlled = models.BooleanField(default=False, verbose_name="Is controlled")
    active = models.BooleanField(default=True, verbose_name="Active")

    class Meta:
        verbose_name = "medication"
        verbose_name_plural = "medications"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "code"], name="uniq_org_medication_code"
            )
        ]
        indexes = [
            models.Index(fields=["organization", "category", "active"]),
            models.Index(fields=["organization", "current_stock"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.code})" if self.code else self.name

    @property
    def is_low_stock(self) -> bool:
        """True when current stock is at or below the reorder level."""
        return self.current_stock <= self.reorder_level


class DrugInteraction(TenantModel):
    """A known interaction between two medications."""

    class Severity(models.TextChoices):
        MILD = "MILD", "Mild"
        MODERATE = "MODERATE", "Moderate"
        SEVERE = "SEVERE", "Severe"

    medication_a = models.ForeignKey(
        Medication, on_delete=models.CASCADE, related_name="interactions_a"
    )
    medication_b = models.ForeignKey(
        Medication, on_delete=models.CASCADE, related_name="interactions_b"
    )
    severity = models.CharField(
        max_length=10, choices=Severity.choices, default=Severity.MODERATE
    )
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = "drug interaction"
        verbose_name_plural = "drug interactions"
        ordering = ["medication_a__name", "medication_b__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "medication_a", "medication_b"],
                name="uniq_org_drug_interaction",
            )
        ]

    def __str__(self) -> str:
        return f"{self.medication_a} <-> {self.medication_b} ({self.get_severity_display()})"


class Supplier(TenantModel):
    """A medication supplier / vendor."""

    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "supplier"
        verbose_name_plural = "suppliers"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class MedicationBatch(TenantModel):
    """A received lot of a medication with expiry tracking."""

    medication = models.ForeignKey(
        Medication, on_delete=models.CASCADE, related_name="batches"
    )
    batch_no = models.CharField(max_length=100)
    supplier = models.ForeignKey(
        Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name="batches"
    )
    quantity = models.PositiveIntegerField(default=0, verbose_name="Quantity")
    expiry_date = models.DateField(verbose_name="Expiry date")
    received_date = models.DateField(default=timezone.localdate, verbose_name="Received date")
    unit_cost = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00"), verbose_name="Unit cost"
    )

    class Meta:
        verbose_name = "medication batch"
        verbose_name_plural = "medication batches"
        ordering = ["expiry_date"]
        indexes = [
            models.Index(fields=["organization", "medication", "expiry_date"]),
            models.Index(fields=["organization", "expiry_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.medication} — {self.batch_no} (x{self.quantity})"

    @property
    def is_expired(self) -> bool:
        return self.expiry_date < timezone.localdate()

    @property
    def days_to_expiry(self) -> int:
        return (self.expiry_date - timezone.localdate()).days

    @property
    def expiring_soon(self, within_days: int = 90) -> bool:
        """True when the batch expires within ``within_days`` (not yet expired)."""
        days = self.days_to_expiry
        return 0 <= days <= within_days


class Dispensation(TenantModel):
    """A prescription fill; validates stock and decrements batches + medication."""

    class Status(models.TextChoices):
        COMPLETED = "COMPLETED", "Completed"
        PARTIAL = "PARTIAL", "Partial"
        RETURNED = "RETURNED", "Returned"

    prescription = models.ForeignKey(
        "clinical.Prescription",
        on_delete=models.CASCADE,
        related_name="dispensations",
        verbose_name="Prescription",
    )
    dispensed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="dispensations",
        verbose_name="Dispensed by",
    )
    dispensed_at = models.DateTimeField(auto_now_add=True, verbose_name="Dispensed at")
    items = models.JSONField(
        default=list,
        help_text='List of {"medication_id", "batch_id", "quantity", "price"}',
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.COMPLETED
    )
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = "dispensation"
        verbose_name_plural = "dispensations"
        ordering = ["-dispensed_at"]
        indexes = [models.Index(fields=["organization", "prescription", "-dispensed_at"])]

    def __str__(self) -> str:
        return f"Dispensation #{self.pk} for prescription #{self.prescription_id}"


class StockTransfer(TenantModel):
    """A movement of stock between two branches of the organization."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    from_branch = models.ForeignKey(
        "organizations.Branch",
        on_delete=models.PROTECT,
        related_name="stock_transfers_out",
        verbose_name="From branch",
    )
    to_branch = models.ForeignKey(
        "organizations.Branch",
        on_delete=models.PROTECT,
        related_name="stock_transfers_in",
        verbose_name="To branch",
    )
    items = models.JSONField(
        default=list,
        help_text='List of {"medication_id", "batch_id", "quantity"}',
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="stock_transfers_requested",
        verbose_name="Requested by",
    )
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="Completed at")
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="stock_transfers_completed",
        verbose_name="Completed by",
    )

    class Meta:
        verbose_name = "stock transfer"
        verbose_name_plural = "stock transfers"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Transfer {self.from_branch} → {self.to_branch} ({self.status})"


class StockReturn(TenantModel):
    """Stock returned to a batch (e.g. patient return, damaged goods)."""

    batch = models.ForeignKey(
        MedicationBatch, on_delete=models.CASCADE, related_name="returns"
    )
    quantity = models.PositiveIntegerField(verbose_name="Quantity")
    reason = models.TextField(blank=True, verbose_name="Reason")
    returned_at = models.DateTimeField(auto_now_add=True, verbose_name="Returned at")
    returned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="stock_returns",
        verbose_name="Returned by",
    )

    class Meta:
        verbose_name = "stock return"
        verbose_name_plural = "stock returns"
        ordering = ["-returned_at"]

    def __str__(self) -> str:
        return f"Return x{self.quantity} of {self.batch} ({self.reason or 'no reason'})"
