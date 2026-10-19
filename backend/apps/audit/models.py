from django.conf import settings
from django.db import models

from apps.core.models import TenantModel


class AuditLog(TenantModel):
    """Immutable trail of significant actions within an organization."""

    class Action(models.TextChoices):
        CREATE = "CREATE", "Create"
        UPDATE = "UPDATE", "Update"
        DELETE = "DELETE", "Delete"
        LOGIN = "LOGIN", "Login"
        EXPORT = "EXPORT", "Export"
        OTHER = "OTHER", "Other"

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    resource_type = models.CharField(max_length=100)
    resource_id = models.CharField(max_length=64, blank=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        verbose_name = "audit log"
        verbose_name_plural = "audit logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "action", "-created_at"]),
            models.Index(fields=["resource_type", "resource_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.action} {self.resource_type} {self.resource_id or ''}".strip()
