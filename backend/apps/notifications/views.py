from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.response import Response

from apps.core.views import TenantViewSetMixin

from .models import Notification
from .serializers import NotificationSerializer
from .services import broadcast_unread_count


class NotificationViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """The current user's notifications (read-only + mark-read semantics).

    - ``GET /``          list mine, ``?unread=true`` filters, newest first
    - ``PATCH /<id>/``   marks the notification read (any payload)
    - ``POST mark-all-read/``  marks every notification read
    - ``GET unread-count/``    ``{"count": N}``
    """

    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user)
        if self.request.query_params.get("unread") == "true":
            qs = qs.filter(is_read=False)
        return qs

    def create(self, request, *args, **kwargs):
        raise MethodNotAllowed("POST")

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE")

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        now = timezone.now()
        Notification.objects.filter(pk=instance.pk).update(
            is_read=True, read_at=now, updated_at=now
        )
        instance.refresh_from_db()
        broadcast_unread_count(instance.recipient)
        return Response(self.get_serializer(instance).data)

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        now = timezone.now()
        marked = Notification.objects.filter(recipient=request.user, is_read=False).update(
            is_read=True, read_at=now, updated_at=now
        )
        broadcast_unread_count(request.user)
        return Response({"marked": marked})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({"count": count})
