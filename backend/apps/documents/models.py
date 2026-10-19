from django.conf import settings
from django.db import models

from apps.core.models import TenantModel


class Document(TenantModel):
    """A tenant-scoped file attachment (clinical, administrative, etc.).

    ``category`` values align with the document screen filter; ``tags`` is a
    free-form JSON list used by the ``?search=`` endpoint.
    """

    CATEGORY_CHOICES = [
        ("CLINICAL", "Clinical"),
        ("ADMIN", "Administrative"),
        ("FINANCIAL", "Financial"),
        ("LEGAL", "Legal"),
        ("OTHER", "Other"),
    ]

    title = models.CharField(max_length=255)
    category = models.CharField(
        max_length=20, choices=CATEGORY_CHOICES, default="OTHER", db_index=True
    )
    patient = models.ForeignKey(
        "patients.Patient",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="patient_documents",
    )
    file = models.FileField(upload_to="documents/%Y/%m/")
    tags = models.JSONField(default=list, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="uploaded_documents",
    )
    notes = models.TextField(blank=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Document"
        verbose_name_plural = "Documents"

    def __str__(self):
        return self.title
