from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.views import TenantViewSetMixin
from apps.notifications.services import notify

from .models import Task
from .serializers import TaskSerializer


class TaskViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Org-scoped task CRUD.

    - ``GET/POST /``            filters: ``?assignee=<id>&status=&priority=``
    - ``GET/PATCH/DELETE /<id>/``
    - ``POST /<id>/complete/``   sets status DONE + ``completed_at``

    Creating a task with an assignee (or reassigning one) notifies the new
    assignee via :func:`apps.notifications.services.notify` (type ``TASK``).
    """

    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    filterset_fields = ["assignee", "status", "priority"]

    def perform_create(self, serializer):
        super().perform_create(serializer)
        self._notify_assignee(serializer.instance)

    def perform_update(self, serializer):
        previous_assignee_id = serializer.instance.assignee_id
        super().perform_update(serializer)
        task = serializer.instance
        if task.assignee_id != previous_assignee_id:
            self._notify_assignee(task)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        task = self.get_object()
        task.status = Task.Status.DONE
        task.completed_at = timezone.now()
        task.save(update_fields=["status", "completed_at", "updated_at"])
        return Response(TaskSerializer(task, context=self.get_serializer_context()).data)

    def _notify_assignee(self, task):
        if not task.assignee_id or task.assignee_id == self.request.user.id:
            return
        notify(
            recipient=task.assignee,
            type="TASK",
            title=f"Task assigned: {task.title}",
            body=task.description
            or f"You have been assigned a {task.get_priority_display().lower()} priority task.",
            data={
                "task_id": task.id,
                "priority": task.priority,
                "status": task.status,
                "due_date": task.due_date.isoformat() if task.due_date else None,
                "related_type": task.related_type or None,
                "related_id": task.related_id or None,
            },
        )
