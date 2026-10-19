from django.conf import settings
from django.db import models

from apps.core.models import TenantModel


class RadiologyOrder(TenantModel):
    """An imaging order for a patient."""

    class Modality(models.TextChoices):
        XRAY = "XRAY", "X-Ray"
        CT = "CT", "CT"
        MRI = "MRI", "MRI"
        ULTRASOUND = "ULTRASOUND", "Ultrasound"
        ECG = "ECG", "ECG"
        ECHO = "ECHO", "Echo"
        MAMMOGRAPHY = "MAMMOGRAPHY", "Mammography"
        OTHER = "OTHER", "Other"

    class Priority(models.TextChoices):
        ROUTINE = "ROUTINE", "Routine"
        URGENT = "URGENT", "Urgent"
        STAT = "STAT", "Stat"

    class Status(models.TextChoices):
        ORDERED = "ORDERED", "Ordered"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    patient = models.ForeignKey(
        "patients.Patient", on_delete=models.CASCADE, related_name="radiology_orders"
    )
    encounter = models.ForeignKey(
        "clinical.Encounter",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="radiology_orders",
    )
    modality = models.CharField(max_length=15, choices=Modality.choices)
    body_part = models.CharField(max_length=100, blank=True, verbose_name="Body part")
    clinical_indication = models.TextField(blank=True, verbose_name="Clinical indication")
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.ROUTINE
    )
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.ORDERED
    )
    ordered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="radiology_orders_ordered",
        verbose_name="Ordered by",
    )
    ordered_at = models.DateTimeField(auto_now_add=True, verbose_name="Ordered at")
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = "radiology order"
        verbose_name_plural = "radiology orders"
        ordering = ["-ordered_at"]
        indexes = [
            models.Index(fields=["organization", "patient", "-ordered_at"]),
            models.Index(fields=["organization", "status", "modality"]),
        ]

    def __str__(self) -> str:
        return f"RadiologyOrder #{self.pk} — {self.get_modality_display()} ({self.status})"


class RadiologyReport(TenantModel):
    """The report attached to a radiology order (one per order)."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        FINAL = "FINAL", "Final"

    order = models.OneToOneField(
        RadiologyOrder, on_delete=models.CASCADE, related_name="report"
    )
    radiologist = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="radiology_reports",
    )
    findings = models.TextField(blank=True)
    impression = models.TextField(blank=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.DRAFT
    )
    finalized_at = models.DateTimeField(null=True, blank=True, verbose_name="Finalized at")
    attachment = models.FileField(upload_to="radiology_reports/", null=True, blank=True)

    class Meta:
        verbose_name = "radiology report"
        verbose_name_plural = "radiology reports"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Report for order #{self.order_id} ({self.status})"
