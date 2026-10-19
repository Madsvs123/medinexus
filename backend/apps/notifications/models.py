from django.conf import settings
from django.db import models

from apps.core.models import TenantModel


class Notification(TenantModel):
    """A user-facing notification (in-app list + WebSocket push)."""

    class Type(models.TextChoices):
        APPOINTMENT = "APPOINTMENT", "Appointment"
        LAB = "LAB", "Laboratory"
        RADIOLOGY = "RADIOLOGY", "Radiology"
        BILLING = "BILLING", "Billing"
        TASK = "TASK", "Task"
        PRESCRIPTION = "PRESCRIPTION", "Prescription"
        MESSAGE = "MESSAGE", "Message"
        SYSTEM = "SYSTEM", "System"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type = models.CharField(max_length=20, choices=Type.choices)
    title = models.CharField(max_length=255)
    body = models.TextField()
    data = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "notification"
        verbose_name_plural = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read", "-created_at"]),
            models.Index(fields=["organization", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"[{self.type}] {self.title} -> {self.recipient}"
