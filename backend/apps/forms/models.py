from django.conf import settings
from django.db import models

from apps.core.models import TenantModel


class FormTemplate(TenantModel):
    """A reusable form definition whose fields live in the ``schema`` JSON.

    Each schema entry: ``{key, label, type, options?, required?, placeholder?}``
    where ``type`` is one of ``text|textarea|number|date|select|multiselect|
    checkbox``.
    """

    FIELD_TYPES = [
        "text",
        "textarea",
        "number",
        "date",
        "select",
        "multiselect",
        "checkbox",
    ]

    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, db_index=True)
    schema = models.JSONField(default=list)
    active = models.BooleanField(default=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Form template"
        verbose_name_plural = "Form templates"
        ordering = ["name"]

    def __str__(self):
        return self.name


class FormSubmission(TenantModel):
    """A completed instance of a :class:`FormTemplate`.

    ``data`` keys must match the template schema (enforced by the serializer).
    """

    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("SUBMITTED", "Submitted"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    ]

    template = models.ForeignKey(
        FormTemplate,
        on_delete=models.PROTECT,
        related_name="submissions",
    )
    patient = models.ForeignKey(
        "patients.Patient",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="form_submissions",
    )
    encounter = models.ForeignKey(
        "clinical.Encounter",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="form_submissions",
    )
    data = models.JSONField(default=dict)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="DRAFT", db_index=True
    )
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="submitted_forms",
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_forms",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Form submission"
        verbose_name_plural = "Form submissions"

    def __str__(self):
        return f"{self.template.name} #{self.pk}"
