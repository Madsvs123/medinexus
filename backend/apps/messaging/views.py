import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.views import TenantViewSetMixin

from .models import Message, MessageRead, Thread
from .serializers import MessageSerializer, ThreadSerializer

logger = logging.getLogger(__name__)


def _broadcast_message(thread: Thread, message: Message) -> None:
    """Push a serialized message to the thread's WS group (best effort)."""
    payload = {"type": "chat.message", "message": MessageSerializer(message).data}
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        async_to_sync(channel_layer.group_send)(f"chat_{thread.id}", payload)
    except Exception:  # pragma: no cover - channel layer unavailable in tests/dev
        logger.exception("Failed to broadcast chat message for thread %s", thread.id)


class ThreadViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Conversation threads. ``GET /threads/`` lists the user's threads.

    - ``POST /threads/``  ``{"participant_ids": [...], "title": "?"}`` auto-adds self
    - ``GET /threads/<id>/``  embeds participants, last message and unread count
    - ``POST /threads/<id>/read/``  marks all messages in the thread read by me
    - ``GET/POST /threads/<id>/messages/``  list (``?before=<ts>``) / send
    """

    queryset = Thread.objects.all()
    serializer_class = ThreadSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return Thread.objects.filter(participants=self.request.user)

    def perform_create(self, serializer):
        super().perform_create(serializer)
        thread = serializer.instance
        thread.participants.add(self.request.user)
        raw_ids = self.request.data.get("participant_ids") or []
        ids = {int(pid) for pid in raw_ids if str(pid).isdigit()}
        ids.discard(self.request.user.id)
        valid_ids = get_user_model().objects.filter(id__in=ids).values_list("id", flat=True)
        if valid_ids:
            thread.participants.add(*valid_ids)

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        thread = self.get_object()
        unread = thread.messages.exclude(sender=request.user).exclude(read_by=request.user)
        marked = 0
        for message in unread.iterator():
            MessageRead.objects.create(
                message=message, user=request.user, organization=thread.organization
            )
            marked += 1
        return Response({"status": "ok", "marked": marked})

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        thread = self.get_object()
        if request.method == "GET":
            qs = thread.messages.order_by("sent_at", "id")
            before = request.query_params.get("before")
            if before:
                qs = qs.filter(sent_at__lt=before)
            page = self.paginate_queryset(qs)
            serializer = MessageSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        body = (request.data.get("body") or "").strip()
        attachment = request.FILES.get("attachment")
        message = Message.objects.create(
            thread=thread,
            sender=request.user,
            body=body,
            attachment=attachment,
            organization=thread.organization,
        )
        thread.last_message_at = message.sent_at
        thread.save(update_fields=["last_message_at", "updated_at"])
        _broadcast_message(thread, message)
        return Response(MessageSerializer(message).data, status=201)


class MessageViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Flat message list/create scoped to threads the user participates in.

    - ``GET /messages/?thread=<id>&before=<ts>``  ascending, paginated
    - ``POST /messages/``  ``{"thread": <id>, "body": "...", "attachment": file?}``
      persists and broadcasts to ``chat_{thread_id}``
    """

    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = Message.objects.filter(thread__participants=self.request.user).order_by(
            "sent_at", "id"
        )
        thread_id = self.request.query_params.get("thread")
        if thread_id:
            qs = qs.filter(thread_id=thread_id)
        before = self.request.query_params.get("before")
        if before:
            qs = qs.filter(sent_at__lt=before)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        thread = serializer.validated_data["thread"]
        message = serializer.save(sender=request.user, organization=thread.organization)
        thread.last_message_at = message.sent_at
        thread.save(update_fields=["last_message_at", "updated_at"])
        _broadcast_message(thread, message)
        return Response(MessageSerializer(message).data, status=201)
