from django.conf import settings
from django.db import models

from apps.core.models import TenantModel


class Report(TenantModel):
    """An asynchronously generated export (XLSX via openpyxl).

    ``kind`` selects the generator; ``params`` carries date-range/filter
    options echoed back on download.
    """

    KIND_CHOICES = [
        ("patients", "Patients"),
        ("invoices", "Invoices"),
        ("payments", "Payments"),
        ("lab_results", "Lab Results"),
        ("dispensation", "Dispensations"),
    ]
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("READY", "Ready"),
        ("FAILED", "Failed"),
    ]

    kind = models.CharField(max_length=20, choices=KIND_CHOICES, db_index=True)
    title = models.CharField(max_length=255)
    params = models.JSONField(default=dict, blank=True)
    file = models.FileField(upload_to="reports/%Y/%m/", null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="PENDING", db_index=True
    )
    error = models.TextField(blank=True)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="generated_reports",
    )
    generated_at = models.DateTimeField(null=True, blank=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Report"
        verbose_name_plural = "Reports"

    def __str__(self):
        return f"{self.title} ({self.status})"
