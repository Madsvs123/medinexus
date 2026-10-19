from django.conf import settings
from django.db import models

from apps.core.models import TenantModel


class OrganizationSettings(TenantModel):
    """Singleton settings per organization (get_or_create by org)."""

    appointment_window_days = models.IntegerField(default=90)
    slot_minutes = models.IntegerField(default=15)
    block_severe_prescriptions = models.BooleanField(default=False)
    auto_issue_invoice_on_checkout = models.BooleanField(default=False)
    currency = models.CharField(max_length=8, default="USD")
    date_format = models.CharField(max_length=20, default="YYYY-MM-DD")
    notification_prefs = models.JSONField(default=dict, blank=True)
    clinical_defaults = models.JSONField(default=dict, blank=True)
    billing_defaults = models.JSONField(default=dict, blank=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Organization settings"
        verbose_name_plural = "Organization settings"
        constraints = [
            models.UniqueConstraint(
                fields=["organization"], name="unique_org_settings_per_organization"
            )
        ]

    def __str__(self):
        return f"Settings for {self.organization}"


class ImportJob(TenantModel):
    """A bulk CSV/XLSX import of master data rows."""

    KIND_CHOICES = [
        ("patients", "Patients"),
        ("medications", "Medications"),
        ("services", "Services"),
        ("tests", "Tests"),
    ]
    STATUS_CHOICES = [
        ("UPLOADED", "Uploaded"),
        ("PROCESSING", "Processing"),
        ("COMPLETED", "Completed"),
        ("FAILED", "Failed"),
    ]

    kind = models.CharField(max_length=20, choices=KIND_CHOICES, db_index=True)
    file = models.FileField(upload_to="imports/%Y/%m/")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="UPLOADED", db_index=True
    )
    summary = models.JSONField(default=dict, blank=True)
    errors = models.JSONField(default=list, blank=True)
    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="processed_imports",
    )
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Import job"
        verbose_name_plural = "Import jobs"

    def __str__(self):
        return f"{self.kind} import #{self.pk} ({self.status})"
