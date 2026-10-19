from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .models import Message, Thread
from .serializers import MessageSerializer, UserBriefSerializer


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """Realtime chat for a single thread.

    Joins ``chat_{thread_id}`` after validating that the authenticated user is
    a participant. Client messages:

    - ``{"type": "chat.message", "body": "..."}``  → persisted + broadcast to the group
    - ``{"type": "chat.typing"}``                  → typing indicator broadcast

    Server pushes:

    - ``{"type": "chat.message", "message": {...serialized Message...}}``
    - ``{"type": "chat.typing", "thread_id": N, "user": {...brief user...}}``
    """

    async def connect(self):
        user = self.scope.get("user")
        if user is None or not user.is_authenticated:
            await self.close(code=4001)
            return
        self.user = user
        try:
            self.thread_id = int(self.scope["url_route"]["kwargs"]["thread_id"])
        except (KeyError, TypeError, ValueError):
            await self.close(code=4004)
            return
        if not await self._is_member(self.thread_id):
            await self.close(code=4003)
            return
        await self.channel_layer.group_add(f"chat_{self.thread_id}", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "thread_id"):
            await self.channel_layer.group_discard(
                f"chat_{self.thread_id}", self.channel_name
            )

    async def receive_json(self, content, **kwargs):
        msg_type = content.get("type")
        if msg_type == "chat.message":
            body = (content.get("body") or "").strip()
            if not body:
                return
            message = await self._create_message(body)
            if message is None:
                return
            await self.channel_layer.group_send(
                f"chat_{self.thread_id}",
                {"type": "chat.message", "message": MessageSerializer(message).data},
            )
        elif msg_type == "chat.typing":
            await self.channel_layer.group_send(
                f"chat_{self.thread_id}",
                {
                    "type": "chat.typing",
                    "thread_id": self.thread_id,
                    "user": UserBriefSerializer(self.user).data,
                },
            )

    async def chat_message(self, event):
        await self.send_json({"type": "chat.message", "message": event["message"]})

    async def chat_typing(self, event):
        await self.send_json(
            {
                "type": "chat.typing",
                "thread_id": event["thread_id"],
                "user": event["user"],
            }
        )

    @database_sync_to_async
    def _is_member(self, thread_id):
        return Thread.objects.filter(id=thread_id, participants=self.user).exists()

    @database_sync_to_async
    def _create_message(self, body):
        try:
            thread = Thread.objects.get(id=self.thread_id)
        except Thread.DoesNotExist:
            return None
        message = Message.objects.create(
            thread=thread,
            sender=self.user,
            body=body,
            organization=thread.organization,
        )
        thread.last_message_at = message.sent_at
        thread.save(update_fields=["last_message_at", "updated_at"])
        return message
