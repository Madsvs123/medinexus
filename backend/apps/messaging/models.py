from django.conf import settings
from django.db import models

from apps.core.models import TenantModel


class Thread(TenantModel):
    """A direct/group conversation between users of the same organization."""

    title = models.CharField(max_length=255, blank=True)
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="threads",
        blank=True,
    )
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "thread"
        verbose_name_plural = "threads"
        ordering = ["-last_message_at", "-created_at"]
        indexes = [
            models.Index(fields=["organization", "-last_message_at"]),
        ]

    def __str__(self) -> str:
        return self.title or f"Thread #{self.pk}"


class MessageRead(TenantModel):
    """Read receipt: a user has seen a message."""

    message = models.ForeignKey(
        "Message",
        on_delete=models.CASCADE,
        related_name="reads",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="+",
    )
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "message read receipt"
        verbose_name_plural = "message read receipts"
        ordering = ["-read_at"]
        constraints = [
            models.UniqueConstraint(fields=["message", "user"], name="uniq_message_user_read"),
        ]

    def __str__(self) -> str:
        return f"{self.user} read message #{self.message_id}"


class Message(TenantModel):
    """A single chat message inside a Thread."""

    thread = models.ForeignKey(
        Thread,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )
    body = models.TextField()
    attachment = models.FileField(
        upload_to="chat/attachments/%Y/%m/", null=True, blank=True
    )
    sent_at = models.DateTimeField(auto_now_add=True)
    read_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through=MessageRead,
        through_fields=("message", "user"),
        related_name="read_messages",
        blank=True,
    )

    class Meta:
        verbose_name = "message"
        verbose_name_plural = "messages"
        ordering = ["-sent_at", "-id"]
        indexes = [
            models.Index(fields=["thread", "sent_at"]),
        ]

    def __str__(self) -> str:
        return f"#{self.pk} in thread {self.thread_id} by {self.sender}"
