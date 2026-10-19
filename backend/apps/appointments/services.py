"""Business logic for appointments: availability expansion, recurring instances, booking."""
from datetime import date, datetime, time, timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .models import Appointment, Availability, RecurringRule


def _combine(date_value, time_value):
    return datetime.combine(date_value, time_value)


def _is_available_on(availability, day):
    if not availability.is_active:
        return False
    if availability.valid_from and day < availability.valid_from:
        return False
    if availability.valid_until and day > availability.valid_until:
        return False
    return True


def expand_availability(doctor, day=None, department=None):
    """Return concrete bookable slots for a doctor on a given date.

    Slots are generated from the doctor's Availability rows for the weekday,
    stepping by slot_minutes + buffer_minutes, and excluding times that
    already have an active appointment.
    """
    if day is None:
        day = timezone.localdate()
    if isinstance(day, datetime):
        day = day.date()

    slots = []
    availabilities = Availability.objects.filter(doctor=doctor, weekday=day.weekday())
    if department:
        availabilities = availabilities.filter(department=department)

    booked = set()
    day_start = datetime.combine(day, time.min)
    day_end = datetime.combine(day, time.max)
    active_appointments = Appointment.objects.filter(
        doctor=doctor,
        start__gte=day_start,
        start__lte=day_end,
        status__in=["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"],
    ).values_list("start", "end")
    for appt_start, appt_end in active_appointments:
        cursor = appt_start
        while cursor < appt_end:
            booked.add(cursor)
            cursor += timedelta(minutes=1)

    for availability in availabilities:
        if not _is_available_on(availability, day):
            continue
        step = timedelta(minutes=availability.slot_minutes + availability.buffer_minutes)
        slot_duration = timedelta(minutes=availability.slot_minutes)
        cursor = _combine(day, availability.start_time)
        end_of_day = _combine(day, availability.end_time)
        while cursor + slot_duration <= end_of_day:
            slot_end = cursor + slot_duration
            if cursor not in booked and not any(
                booked_start < slot_end and booked_start >= cursor for booked_start in booked
            ):
                slots.append({"start": cursor.isoformat(), "end": slot_end.isoformat()})
            cursor += step

    slots.sort(key=lambda slot: slot["start"])
    return slots


def generate_recurring_instances(rule, created_by=None):
    """Create Appointment instances for every occurrence of a RecurringRule."""
    from .serializers import check_double_booking

    instances = []
    cursor = rule.start_date
    end_date = rule.end_date or rule.start_date + timedelta(days=365)
    count = 0
    while cursor <= end_date and count < 500:
        if rule.frequency == "WEEKLY" and rule.weekday is not None and cursor.weekday() != rule.weekday:
            cursor += timedelta(days=1)
            continue
        start = _combine(cursor, rule.time)
        end = start + timedelta(minutes=rule.duration_minutes)
        try:
            with transaction.atomic():
                check_double_booking(rule.doctor, start, end)
                appointment = Appointment.objects.create(
                    patient=rule.patient,
                    doctor=rule.doctor,
                    department=rule.department,
                    start=start,
                    end=end,
                    type="CONSULTATION",
                    status="SCHEDULED",
                    recurring_rule=rule,
                    created_by=created_by,
                )
                instances.append(appointment)
        except Exception:
            # Skip occurrences that clash with existing bookings.
            pass
        count += 1
        if rule.frequency == "DAILY":
            cursor += timedelta(days=rule.interval)
        elif rule.frequency == "WEEKLY":
            cursor += timedelta(days=7 * rule.interval)
        else:  # MONTHLY
            month = cursor.month - 1 + rule.interval
            year = cursor.year + month // 12
            month = month % 12 + 1
            day = min(cursor.day, 28)
            cursor = date(year, month, day)
    return instances


def create_appointment(*, patient, doctor, start, end=None, department=None, room=None,
                       appointment_type="CONSULTATION", reason="", notes="", created_by=None,
                       organization=None):
    """Create an appointment with full booking validation (no overlap, doctor availability)."""
    if end is None:
        end = start + timedelta(minutes=30)
    if end <= start:
        raise ValueError("Appointment end must be after start.")

    from .serializers import check_double_booking

    with transaction.atomic():
        check_double_booking(doctor, start, end)

        # Doctor availability check: if the doctor has availability defined for
        # that weekday, the appointment must fall inside one of the windows.
        weekday = start.date().weekday()
        windows = Availability.objects.filter(doctor=doctor, weekday=weekday, is_active=True)
        if windows.exists():
            inside = any(
                _combine(start.date(), window.start_time) <= start
                and end <= _combine(start.date(), window.end_time)
                for window in windows
            )
            if not inside:
                raise ValueError("Appointment is outside the doctor's availability.")

        kwargs = {"created_by": created_by} if created_by else {}
        if organization is not None:
            kwargs["organization"] = organization
        return Appointment.objects.create(
            patient=patient,
            doctor=doctor,
            department=department,
            room=room,
            start=start,
            end=end,
            type=appointment_type,
            reason=reason,
            notes=notes,
            **kwargs,
        )
