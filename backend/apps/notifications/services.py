"""Notification fan-out helpers used across every MediNexus module."""

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Notification
from .serializers import NotificationSerializer

logger = logging.getLogger(__name__)


def _group_send_safe(group: str, payload: dict) -> None:
    """Best-effort channel-layer send; never raises (WS is best effort)."""
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        async_to_sync(channel_layer.group_send)(group, payload)
    except Exception:  # pragma: no cover - channel layer unavailable in tests/dev
        logger.exception("Failed to send WebSocket payload to group %s", group)


def notify(*, recipient, type, title, body, data=None, organization=None):
    """Create a Notification row and push it to the recipient's WS group.

    The notification is fanned out to the group ``user_{recipient.id}`` with the
    exact payload ``{"type": "notification", "notification": {...}}`` where the
    nested object is the serialized Notification. The organization defaults to
    ``recipient.organization`` when not passed explicitly (TenantModel assigns
    from the request context as a final fallback). Returns the Notification.
    """
    organization = organization or getattr(recipient, "organization", None)
    notification = Notification.objects.create(
        organization=organization,
        recipient=recipient,
        type=type,
        title=title,
        body=body,
        data=data or {},
    )
    _group_send_safe(
        f"user_{recipient.id}",
        {"type": "notification", "notification": NotificationSerializer(notification).data},
    )
    return notification


def broadcast_unread_count(user) -> int:
    """Recompute and push the user's unread count to group ``user_{id}``.

    Payload: ``{"type": "unread_count", "count": N}``. Returns the count.
    """
    count = Notification.objects.filter(recipient=user, is_read=False).count()
    _group_send_safe(f"user_{user.id}", {"type": "unread_count", "count": count})
    return count
