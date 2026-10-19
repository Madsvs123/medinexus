from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.utils import timezone

from .models import Notification


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """Personal + org-wide realtime notification stream.

    Joins ``user_{user.id}`` and (when the user has an organization)
    ``org_{org.id}``. Receives ``{"type": "notification", "notification": {...}}``
    events from :func:`apps.notifications.services.notify` and
    ``{"type": "unread_count", "count": N}`` events; client-to-server messages
    support ``{"type": "mark_read", "ids": [1, 2, ...]}``.
    """

    async def connect(self):
        user = self.scope.get("user")
        if user is None or not user.is_authenticated:
            await self.close(code=4001)
            return
        self.user = user
        self.groups = [f"user_{user.id}"]
        if getattr(user, "organization_id", None):
            self.groups.append(f"org_{user.organization_id}")
        for group in self.groups:
            await self.channel_layer.group_add(group, self.channel_name)
        await self.accept()
        # Initial state: current unread count so clients can sync on connect.
        await self.send_json({"type": "unread_count", "count": await self._unread_count()})

    async def disconnect(self, close_code):
        for group in getattr(self, "groups", []):
            await self.channel_layer.group_discard(group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        msg_type = content.get("type")
        if msg_type == "mark_read":
            ids = content.get("ids") or []
            if ids:
                await self._mark_read(ids)
            # Broadcast the fresh count to every connection of this user.
            await self.channel_layer.group_send(
                f"user_{self.user.id}",
                {"type": "unread_count", "count": await self._unread_count()},
            )

    async def notification(self, event):
        await self.send_json({"type": "notification", "notification": event["notification"]})

    async def unread_count(self, event):
        await self.send_json({"type": "unread_count", "count": event["count"]})

    @database_sync_to_async
    def _mark_read(self, ids):
        now = timezone.now()
        Notification.objects.filter(recipient=self.user, id__in=ids, is_read=False).update(
            is_read=True, read_at=now, updated_at=now
        )

    @database_sync_to_async
    def _unread_count(self):
        return Notification.objects.filter(recipient=self.user, is_read=False).count()
