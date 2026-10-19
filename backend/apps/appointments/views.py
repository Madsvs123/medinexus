from datetime import date, datetime

from django.db.models import Max
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import HasOrgAccess, IsStaffRole
from apps.core.views import TenantViewSetMixin

from .models import Appointment, AppointmentQueue, Availability, RecurringRule, Room
from .serializers import (
    AppointmentQueueSerializer,
    AppointmentSerializer,
    AvailabilitySerializer,
    RecurringRuleSerializer,
    RoomSerializer,
)
from .services import expand_availability, generate_recurring_instances


def _parse_date(value):
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


class AppointmentViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]
    filterset_fields = ["patient", "doctor", "department", "status"]

    def get_queryset(self):
        queryset = super().get_queryset()
        day = _parse_date(self.request.query_params.get("date"))
        if day:
            queryset = queryset.filter(start__date=day)
        return queryset.select_related("patient", "doctor", "department", "room")

    def perform_create(self, serializer):
        kwargs = {"created_by": self.request.user}
        organization = getattr(self.request.user, "organization", None)
        if organization is not None:
            kwargs["organization"] = organization
        serializer.save(**kwargs)

    def _transition(self, instance, new_status, extra=None):
        instance.status = new_status
        if extra:
            for field, value in extra.items():
                setattr(instance, field, value)
        instance.save(update_fields=["status", "updated_at"] + list((extra or {}).keys()))
        return Response(AppointmentSerializer(instance).data)

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        return self._transition(self.get_object(), "CONFIRMED")

    @action(detail=True, methods=["post"])
    def checkin(self, request, pk=None):
        appointment = self.get_object()
        self._transition(appointment, "CHECKED_IN", {"checked_in_at": timezone.now()})
        if not hasattr(appointment, "queue_entry"):
            next_position = (
                AppointmentQueue.objects.filter(
                    appointment__department=appointment.department
                ).aggregate(max_position=Max("position"))["max_position"]
                or 0
            ) + 1
            AppointmentQueue.objects.create(
                appointment=appointment,
                position=next_position,
                created_by=request.user,
                organization=appointment.organization,
            )
        return Response(AppointmentSerializer(appointment).data)

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        return self._transition(self.get_object(), "IN_PROGRESS")

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        appointment = self.get_object()
        if hasattr(appointment, "queue_entry"):
            appointment.queue_entry.status = "DONE"
            appointment.queue_entry.save(update_fields=["status"])
        return self._transition(appointment, "COMPLETED")

    @action(detail=True, methods=["post"])
    def noshow(self, request, pk=None):
        appointment = self.get_object()
        if hasattr(appointment, "queue_entry"):
            appointment.queue_entry.status = "SKIPPED"
            appointment.queue_entry.save(update_fields=["status"])
        return self._transition(appointment, "NO_SHOW")

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        reason = request.data.get("reason", "")
        return self._transition(
            self.get_object(),
            "CANCELLED",
            {"cancelled_by": request.user, "cancelled_at": timezone.now(), "cancellation_reason": reason},
        )


class AvailabilityViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Availability.objects.all()
    serializer_class = AvailabilitySerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]
    filterset_fields = ["doctor", "department", "weekday", "is_active"]

    def get_queryset(self):
        queryset = super().get_queryset()
        doctor = self.request.query_params.get("doctor")
        if doctor:
            queryset = queryset.filter(doctor_id=doctor)
        return queryset

    def list(self, request, *args, **kwargs):
        doctor = request.query_params.get("doctor")
        day = _parse_date(request.query_params.get("date"))
        if doctor and day:
            slots = expand_availability(doctor_id=int(doctor), day=day)
            return Response({"date": day.isoformat(), "slots": slots})
        return super().list(request, *args, **kwargs)


class RoomViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]
    filterset_fields = ["department", "type", "status"]


class RecurringRuleViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = RecurringRule.objects.all()
    serializer_class = RecurringRuleSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]
    filterset_fields = ["patient", "doctor", "frequency", "is_active"]

    def perform_create(self, serializer):
        kwargs = {"created_by": self.request.user}
        organization = getattr(self.request.user, "organization", None)
        if organization is not None:
            kwargs["organization"] = organization
        rule = serializer.save(**kwargs)
        generate_recurring_instances(rule, created_by=self.request.user)


class QueueViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = AppointmentQueue.objects.all()
    serializer_class = AppointmentQueueSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]
    filterset_fields = ["status"]

    def get_queryset(self):
        queryset = super().get_queryset()
        department = self.request.query_params.get("department")
        day = _parse_date(self.request.query_params.get("date"))
        if department:
            queryset = queryset.filter(appointment__department_id=department)
        if day:
            queryset = queryset.filter(appointment__start__date=day)
        return queryset.select_related("appointment", "appointment__patient", "appointment__doctor")

    @action(detail=False, methods=["post"])
    def next(self, request):
        department = request.data.get("department") or request.query_params.get("department")
        day = _parse_date(request.data.get("date") or request.query_params.get("date")) or timezone.localdate()
        queryset = self.get_queryset().filter(
            status="WAITING", appointment__start__date=day, appointment__status__in=["CHECKED_IN", "SCHEDULED", "CONFIRMED"]
        )
        if department:
            queryset = queryset.filter(appointment__department_id=department)
        entry = queryset.order_by("position", "appointment__start").first()
        if entry is None:
            return Response({"detail": "No patients waiting in the queue."}, status=status.HTTP_404_NOT_FOUND)
        entry.status = "IN_PROGRESS"
        entry.called_at = timezone.now()
        entry.save(update_fields=["status", "called_at"])
        entry.appointment.status = "IN_PROGRESS"
        entry.appointment.save(update_fields=["status", "updated_at"])
        return Response(AppointmentQueueSerializer(entry).data)
