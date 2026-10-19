from datetime import datetime, timedelta

from django.db import transaction
from django.db.models import Q
from rest_framework import serializers

from .models import Appointment, AppointmentQueue, Availability, RecurringRule, Room

ACTIVE_APPOINTMENT_STATUSES = ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"]


def check_double_booking(doctor, start, end, exclude_id=None):
    """Raise a ValidationError when the doctor already has an overlapping appointment."""
    queryset = Appointment.objects.select_for_update().filter(doctor=doctor).filter(
        Q(start__lt=end, end__gt=start), status__in=ACTIVE_APPOINTMENT_STATUSES
    )
    if exclude_id:
        queryset = queryset.exclude(pk=exclude_id)
    if queryset.exists():
        raise serializers.ValidationError(
            {"detail": "The doctor is already booked during this time slot."}
        )


class RoomSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Room
        fields = ["id", "name", "department", "department_name", "type", "status"]
        read_only_fields = []


class AvailabilitySerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source="doctor.get_full_name", read_only=True)

    class Meta:
        model = Availability
        fields = [
            "id",
            "doctor",
            "doctor_name",
            "department",
            "weekday",
            "start_time",
            "end_time",
            "slot_minutes",
            "buffer_minutes",
            "valid_from",
            "valid_until",
            "is_active",
        ]
        read_only_fields = []

    def validate(self, attrs):
        start_time = attrs.get("start_time") or getattr(self.instance, "start_time", None)
        end_time = attrs.get("end_time") or getattr(self.instance, "end_time", None)
        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})
        weekday = attrs.get("weekday")
        if weekday is not None and not 0 <= weekday <= 6:
            raise serializers.ValidationError({"weekday": "Weekday must be between 0 and 6."})
        return attrs


class RecurringRuleSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    doctor_name = serializers.CharField(source="doctor.get_full_name", read_only=True)

    class Meta:
        model = RecurringRule
        fields = [
            "id",
            "patient",
            "patient_name",
            "doctor",
            "doctor_name",
            "department",
            "start_date",
            "time",
            "duration_minutes",
            "frequency",
            "interval",
            "weekday",
            "end_date",
            "is_active",
        ]
        read_only_fields = []

    def validate(self, attrs):
        frequency = attrs.get("frequency") or getattr(self.instance, "frequency", None)
        if frequency == "WEEKLY" and not (attrs.get("weekday") or getattr(self.instance, "weekday", None)):
            raise serializers.ValidationError({"weekday": "Weekly rules require a weekday."})
        return attrs


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    doctor_name = serializers.CharField(source="doctor.get_full_name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    room_name = serializers.CharField(source="room.name", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "patient",
            "patient_name",
            "doctor",
            "doctor_name",
            "department",
            "department_name",
            "room",
            "room_name",
            "start",
            "end",
            "type",
            "status",
            "reason",
            "notes",
            "checked_in_at",
            "cancelled_by",
            "cancelled_at",
            "cancellation_reason",
            "recurring_rule",
            "created_at",
        ]
        read_only_fields = [
            "checked_in_at",
            "cancelled_by",
            "cancelled_at",
            "cancellation_reason",
            "created_at",
        ]

    def validate(self, attrs):
        start = attrs.get("start") or getattr(self.instance, "start", None)
        end = attrs.get("end")
        if not end and start:
            end = start + timedelta(minutes=30)
            attrs["end"] = end
        if start and end and end <= start:
            raise serializers.ValidationError({"end": "End time must be after start time."})
        doctor = attrs.get("doctor") or getattr(self.instance, "doctor", None)
        if doctor and start and end:
            with transaction.atomic():
                check_double_booking(
                    doctor, start, end, exclude_id=self.instance.pk if self.instance else None
                )
        return attrs


class AppointmentQueueSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="appointment.patient.full_name", read_only=True)
    patient_id = serializers.IntegerField(source="appointment.patient_id", read_only=True)
    doctor_name = serializers.CharField(source="appointment.doctor.get_full_name", read_only=True)
    appointment_start = serializers.DateTimeField(source="appointment.start", read_only=True)

    class Meta:
        model = AppointmentQueue
        fields = [
            "id",
            "appointment",
            "patient_id",
            "patient_name",
            "doctor_name",
            "appointment_start",
            "position",
            "status",
            "called_at",
        ]
        read_only_fields = ["position", "called_at"]
