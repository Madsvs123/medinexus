"""Billing & Insurance models (per conventions §4.10).

All models are tenant-scoped (``TenantModel``). Cross-app references to
``patients.Patient`` and ``clinical.Encounter`` use lazy string FKs so this
app stays importable while those apps are being built in parallel.
"""

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.core.models import TenantModel, current_org

MONEY = dict(max_digits=12, decimal_places=2)


def _next_sequence_number(model, prefix):
    """Return ``{PREFIX}-{YYYY}-{seq}`` with a monotonically increasing seq.

    The sequence is global per year (across the whole model), so the resulting
    number is unique at the database level for every tenant.
    """
    year = timezone.now().year
    base = f"{prefix}-{year}-"
    existing = model.objects.all_orgs().filter(
        # field name differs per model; caller passes the lookup column
        **{model._sequence_field: f"{base}%"}
    ).values_list(model._sequence_field, flat=True)
    seq = 0
    for value in existing:
        try:
            seq = max(seq, int(value.rsplit("-", 1)[-1]))
        except (ValueError, IndexError):
            continue
    while True:
        seq += 1
        candidate = f"{base}{seq}"
        if not model.objects.all_orgs().filter(**{model._sequence_field: candidate}).exists():
            return candidate


class Service(TenantModel):
    """Billable service / price-list entry."""

    CATEGORY_CHOICES = [
        ("CONSULTATION", "Consultation"),
        ("PROCEDURE", "Procedure"),
        ("LABORATORY", "Laboratory"),
        ("RADIOLOGY", "Radiology"),
        ("PHARMACY", "Pharmacy"),
        ("INPATIENT", "Inpatient"),
        ("OTHER", "Other"),
    ]

    code = models.CharField(max_length=32, verbose_name="Code")
    name = models.CharField(max_length=200, verbose_name="Name")
    category = models.CharField(
        max_length=20, choices=CATEGORY_CHOICES, default="OTHER", verbose_name="Category"
    )
    price = models.DecimalField(**MONEY, verbose_name="Price")
    tax_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("0.00"), verbose_name="Tax rate (%)"
    )
    active = models.BooleanField(default=True, verbose_name="Active")

    class Meta(TenantModel.Meta):
        verbose_name = "Service"
        verbose_name_plural = "Services"
        ordering = ["name"]

    def __str__(self):
        return f"{self.code} — {self.name}"


class InvoiceItem(TenantModel):
    """Line item on an invoice (through-model for Invoice.items M2M)."""

    invoice = models.ForeignKey(
        "Invoice", on_delete=models.CASCADE, related_name="invoice_items", verbose_name="Invoice"
    )
    service = models.ForeignKey(
        Service, on_delete=models.PROTECT, related_name="invoice_items", verbose_name="Service"
    )
    quantity = models.PositiveIntegerField(default=1, verbose_name="Quantity")
    unit_price = models.DecimalField(**MONEY, verbose_name="Unit price")
    discount = models.DecimalField(**MONEY, default=Decimal("0.00"), verbose_name="Discount")
    tax = models.DecimalField(**MONEY, default=Decimal("0.00"), verbose_name="Tax")

    class Meta(TenantModel.Meta):
        verbose_name = "Invoice item"
        verbose_name_plural = "Invoice items"
        ordering = ["id"]

    def __str__(self):
        return f"{self.service.name} × {self.quantity}"

    def line_total(self):
        return self.unit_price * self.quantity - self.discount + self.tax

    def save(self, *args, **kwargs):
        if self.unit_price is None:
            self.unit_price = self.service.price
        if self.tax is None or self.tax == Decimal("0.00"):
            self.tax = (
                self.unit_price * self.quantity * (self.service.tax_rate or Decimal("0.00"))
            ) / Decimal("100")
        super().save(*args, **kwargs)
        if self.invoice_id:
            self.invoice.recalculate()


class Invoice(TenantModel):
    """Patient invoice with computed totals."""

    _sequence_field = "invoice_number"

    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("ISSUED", "Issued"),
        ("PARTIAL", "Partially paid"),
        ("PAID", "Paid"),
        ("VOID", "Void"),
        ("REFUNDED", "Refunded"),
    ]

    patient = models.ForeignKey(
        "patients.Patient", on_delete=models.PROTECT, related_name="invoices", verbose_name="Patient"
    )
    encounter = models.ForeignKey(
        "clinical.Encounter",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
        verbose_name="Encounter",
    )
    invoice_number = models.CharField(
        max_length=32, unique=True, editable=False, verbose_name="Invoice number"
    )
    items = models.ManyToManyField(
        Service, through=InvoiceItem, related_name="invoices", verbose_name="Items"
    )
    subtotal = models.DecimalField(**MONEY, default=Decimal("0.00"), verbose_name="Subtotal")
    discount_total = models.DecimalField(
        **MONEY, default=Decimal("0.00"), verbose_name="Discount total"
    )
    tax_total = models.DecimalField(**MONEY, default=Decimal("0.00"), verbose_name="Tax total")
    total = models.DecimalField(**MONEY, default=Decimal("0.00"), verbose_name="Total")
    paid_amount = models.DecimalField(**MONEY, default=Decimal("0.00"), verbose_name="Paid amount")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="DRAFT", verbose_name="Status"
    )
    issued_at = models.DateTimeField(null=True, blank=True, verbose_name="Issued at")
    due_date = models.DateField(null=True, blank=True, verbose_name="Due date")
    notes = models.TextField(blank=True, verbose_name="Notes")

    class Meta(TenantModel.Meta):
        verbose_name = "Invoice"
        verbose_name_plural = "Invoices"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["patient", "status"])]

    def __str__(self):
        return self.invoice_number

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = _next_sequence_number(Invoice, "INV")
        super().save(*args, **kwargs)

    def outstanding(self):
        return max(self.total - self.paid_amount, Decimal("0.00"))

    def is_overdue(self):
        if self.status not in ("ISSUED", "PARTIAL"):
            return False
        if self.due_date is None:
            return False
        return self.due_date < timezone.localdate()

    def recalculate(self):
        """Recompute totals from persisted line items (no save recursion)."""
        items = InvoiceItem.objects.filter(invoice=self)
        subtotal = Decimal("0.00")
        discount_total = Decimal("0.00")
        tax_total = Decimal("0.00")
        for item in items:
            subtotal += item.unit_price * item.quantity
            discount_total += item.discount
            tax_total += item.tax
        total = subtotal - discount_total + tax_total
        paid = min(self.paid_amount, total)
        Invoice.objects.filter(pk=self.pk).update(
            subtotal=subtotal,
            discount_total=discount_total,
            tax_total=tax_total,
            total=total,
            paid_amount=paid,
        )
        self.refresh_from_db(fields=["subtotal", "discount_total", "tax_total", "total", "paid_amount"])

    def _update_status(self):
        """Sync status from paid amount; ``paid_amount`` must be current."""
        if self.status == "VOID":
            return
        total = self.total or Decimal("0.00")
        paid = self.paid_amount or Decimal("0.00")
        if total > Decimal("0.00") and paid >= total:
            new_status = "PAID"
        elif paid > Decimal("0.00"):
            new_status = "PARTIAL"
        elif self.issued_at is not None:
            new_status = "ISSUED"
        else:
            new_status = "DRAFT"
        if new_status != self.status:
            Invoice.objects.filter(pk=self.pk).update(status=new_status)
            self.status = new_status


class Payment(TenantModel):
    """Payment against an invoice, or a deposit-only payment (invoice null)."""

    METHOD_CHOICES = [
        ("CASH", "Cash"),
        ("CARD", "Card"),
        ("BANK", "Bank transfer"),
        ("INSURANCE", "Insurance"),
        ("ONLINE", "Online"),
    ]
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("COMPLETED", "Completed"),
        ("FAILED", "Failed"),
        ("REFUNDED", "Refunded"),
    ]

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
        verbose_name="Invoice",
    )
    patient = models.ForeignKey(
        "patients.Patient", on_delete=models.PROTECT, related_name="payments", verbose_name="Patient"
    )
    amount = models.DecimalField(**MONEY, verbose_name="Amount")
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, verbose_name="Method")
    reference = models.CharField(max_length=100, blank=True, verbose_name="Reference")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="PENDING", verbose_name="Status"
    )
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name="Paid at")
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        verbose_name="Received by",
    )

    class Meta(TenantModel.Meta):
        verbose_name = "Payment"
        verbose_name_plural = "Payments"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment {self.pk} — {self.amount}"


class Refund(TenantModel):
    """Refund request tied to a completed payment."""

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("COMPLETED", "Completed"),
        ("REJECTED", "Rejected"),
    ]

    payment = models.ForeignKey(
        Payment, on_delete=models.CASCADE, related_name="refunds", verbose_name="Payment"
    )
    amount = models.DecimalField(**MONEY, verbose_name="Amount")
    reason = models.TextField(verbose_name="Reason")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="PENDING", verbose_name="Status"
    )
    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        verbose_name="Processed by",
    )
    processed_at = models.DateTimeField(null=True, blank=True, verbose_name="Processed at")

    class Meta(TenantModel.Meta):
        verbose_name = "Refund"
        verbose_name_plural = "Refunds"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Refund {self.pk} — {self.amount}"


class Deposit(TenantModel):
    """Patient prepayment wallet. ``balance`` auto = amount − applied."""

    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("APPLIED", "Applied"),
        ("REFUNDED", "Refunded"),
    ]
    METHOD_CHOICES = Payment.METHOD_CHOICES

    patient = models.ForeignKey(
        "patients.Patient", on_delete=models.PROTECT, related_name="deposits", verbose_name="Patient"
    )
    amount = models.DecimalField(**MONEY, verbose_name="Amount")
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, verbose_name="Method")
    reference = models.CharField(max_length=100, blank=True, verbose_name="Reference")
    applied_amount = models.DecimalField(
        **MONEY, default=Decimal("0.00"), verbose_name="Applied amount"
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="ACTIVE", verbose_name="Status"
    )
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        verbose_name="Received by",
    )

    class Meta(TenantModel.Meta):
        verbose_name = "Deposit"
        verbose_name_plural = "Deposits"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Deposit {self.pk} — {self.amount}"

    @property
    def balance(self):
        return max(self.amount - self.applied_amount, Decimal("0.00"))


class InsurancePlan(TenantModel):
    """Insurance product offered by an organization."""

    name = models.CharField(max_length=200, verbose_name="Name")
    carrier = models.CharField(max_length=200, verbose_name="Carrier")
    coverage_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("0.00"), verbose_name="Coverage (%)"
    )
    notes = models.TextField(blank=True, verbose_name="Notes")
    active = models.BooleanField(default=True, verbose_name="Active")

    class Meta(TenantModel.Meta):
        verbose_name = "Insurance plan"
        verbose_name_plural = "Insurance plans"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.carrier})"


class PatientInsurance(TenantModel):
    """A patient's enrollment in an insurance plan."""

    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="insurances",
        verbose_name="Patient",
    )
    plan = models.ForeignKey(
        InsurancePlan, on_delete=models.PROTECT, related_name="patient_enrollments", verbose_name="Plan"
    )
    policy_number = models.CharField(max_length=100, verbose_name="Policy number")
    coverage_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="Coverage (%) (override)"
    )
    valid_until = models.DateField(null=True, blank=True, verbose_name="Valid until")
    is_primary = models.BooleanField(default=False, verbose_name="Primary")

    class Meta(TenantModel.Meta):
        verbose_name = "Patient insurance"
        verbose_name_plural = "Patient insurances"
        ordering = ["-is_primary", "-created_at"]

    def __str__(self):
        return f"{self.patient} — {self.plan.name}"

    def clean(self):
        super().clean()
        if self.is_primary:
            siblings = PatientInsurance.objects.filter(
                patient_id=self.patient_id, is_primary=True
            ).exclude(pk=self.pk)
            if siblings.exists():
                raise ValidationError(
                    {"is_primary": "This patient already has a primary insurance policy."}
                )

    def save(self, *args, **kwargs):
        if self.organization_id is None:
            self.organization_id = current_org.get()
        self.full_clean()
        if self.is_primary:
            # Demote any other primary policy for the same patient.
            PatientInsurance.objects.filter(patient_id=self.patient_id, is_primary=True).exclude(
                pk=self.pk
            ).update(is_primary=False)
        super().save(*args, **kwargs)

    @property
    def effective_coverage(self):
        if self.coverage_percentage is not None:
            return self.coverage_percentage
        return self.plan.coverage_percentage


class InsuranceClaim(TenantModel):
    """Claim submitted to an insurer for an invoice."""

    _sequence_field = "claim_number"

    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("SUBMITTED", "Submitted"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
        ("RESUBMITTED", "Resubmitted"),
        ("PAID", "Paid"),
    ]

    invoice = models.ForeignKey(
        Invoice, on_delete=models.PROTECT, related_name="claims", verbose_name="Invoice"
    )
    patient_insurance = models.ForeignKey(
        PatientInsurance,
        on_delete=models.PROTECT,
        related_name="claims",
        verbose_name="Patient insurance",
    )
    claim_number = models.CharField(
        max_length=32, unique=True, editable=False, verbose_name="Claim number"
    )
    submitted_amount = models.DecimalField(**MONEY, verbose_name="Submitted amount")
    approved_amount = models.DecimalField(
        **MONEY, null=True, blank=True, verbose_name="Approved amount"
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="DRAFT", verbose_name="Status"
    )
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name="Submitted at")
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name="Approved at")
    rejection_reason = models.TextField(blank=True, verbose_name="Rejection reason")
    notes = models.TextField(blank=True, verbose_name="Notes")

    class Meta(TenantModel.Meta):
        verbose_name = "Insurance claim"
        verbose_name_plural = "Insurance claims"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status"])]

    def __str__(self):
        return self.claim_number

    def save(self, *args, **kwargs):
        if not self.claim_number:
            self.claim_number = _next_sequence_number(InsuranceClaim, "CLM")
        super().save(*args, **kwargs)
