"""Celery tasks for the appointments app."""
from datetime import timedelta

from celery import shared_task
from django.utils import timezone


@shared_task
def send_appointment_reminders():
    """Remind patients of SCHEDULED/CONFIRMED appointments in the next 24 hours.

    Name is referenced by the beat schedule in config/settings.py.
    """
    from apps.appointments.models import Appointment

    now = timezone.now()
    window_end = now + timedelta(hours=24)
    appointments = Appointment.objects.filter(
        start__gte=now,
        start__lte=window_end,
        status__in=["SCHEDULED", "CONFIRMED"],
    ).select_related("patient", "patient__user", "doctor")

    reminded = 0
    for appointment in appointments:
        user = appointment.patient.user
        if user is None:
            continue
        try:
            from apps.notifications.services import notify

            notify(
                recipient=user,
                type="APPOINTMENT",
                title="Upcoming appointment reminder",
                body=(
                    f"You have an appointment with {appointment.doctor.get_full_name()} "
                    f"on {appointment.start.strftime('%Y-%m-%d %H:%M')}."
                ),
                data={"appointment_id": appointment.id, "start": appointment.start.isoformat()},
            )
            reminded += 1
        except Exception:
            continue
    return {"reminded": reminded}
