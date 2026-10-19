"""Pure analytics functions (reports app, A6).

Every function is tenant-explicit: it receives the organization and filters
every queryset by ``organization`` so the same code is safe both inside
request context (tenant manager) and from Celery tasks (no context).
"""

from datetime import date, timedelta

from django.db.models import Count, F, Sum
from django.utils import timezone

from apps.appointments.models import Appointment, AppointmentQueue
from apps.billing.models import Invoice, InvoiceItem, Payment
from apps.clinical.models import Diagnosis, Encounter, FollowUp
from apps.inpatient.models import Admission, Bed
from apps.laboratory.models import LabOrder, LabResult
from apps.notifications.models import Notification
from apps.patients.models import Patient
from apps.pharmacy.models import Dispensation, Medication, MedicationBatch


def _parse_date(value, default):
    if not value:
        return default
    try:
        return date.fromisoformat(str(value))
    except ValueError:
        return default


def _default_range():
    today = timezone.localdate()
    return today, today


def appointment_analytics(org, from_date=None, to_date=None, department=None, doctor=None):
    """Appointments by status + by day + average wait time (minutes)."""
    from_d, to_d = _default_range()
    from_d = _parse_date(from_date, from_d)
    to_d = _parse_date(to_date, to_d)

    qs = Appointment.objects.filter(organization=org, start__date__gte=from_d, start__date__lte=to_d)
    if department:
        qs = qs.filter(department_id=department)
    if doctor:
        qs = qs.filter(doctor_id=doctor)

    by_status = {row["status"]: row["count"] for row in qs.values("status").annotate(count=Count("id"))}
    by_day = [
        {"date": row["start__date"].isoformat(), "count": row["count"]}
        for row in qs.values("start__date").annotate(count=Count("id")).order_by("start__date")
    ]

    queue = AppointmentQueue.objects.filter(
        organization=org,
        called_at__isnull=False,
        appointment__start__date__gte=from_d,
        appointment__start__date__lte=to_d,
    )
    waits = [
        (entry.called_at - entry.appointment.start).total_seconds() / 60.0
        for entry in queue
        if entry.called_at and entry.appointment.start
    ]
    avg_wait = round(sum(waits) / len(waits), 1) if waits else 0.0

    return {
        "total": qs.count(),
        "by_status": by_status,
        "by_day": by_day,
        "avg_wait_minutes": avg_wait,
    }


def revenue_analytics(org, from_date=None, to_date=None):
    """Payments by day + by invoice category + outstanding balance."""
    from_d, to_d = _default_range()
    from_d = _parse_date(from_date, from_d)
    to_d = _parse_date(to_date, to_d)

    payments = Payment.objects.filter(
        organization=org,
        status="COMPLETED",
        paid_at__date__gte=from_d,
        paid_at__date__lte=to_d,
    )
    total = payments.aggregate(total=Sum("amount"))["total"] or 0

    by_day = [
        {"date": row["paid_at__date"].isoformat(), "total": float(row["total"])}
        for row in payments.values("paid_at__date").annotate(total=Sum("amount")).order_by("paid_at__date")
    ]

    by_category = {}
    item_qs = InvoiceItem.objects.filter(
        invoice__organization=org,
        invoice__issued_at__date__gte=from_d,
        invoice__issued_at__date__lte=to_d,
    )
    for item in item_qs:
        category = item.service.category if item.service else "OTHER"
        line_total = float(item.unit_price * item.quantity - (item.discount or 0))
        by_category[category] = by_category.get(category, 0) + line_total

    outstanding_qs = Invoice.objects.filter(organization=org, status__in=["ISSUED", "PARTIAL"])
    outstanding = 0
    for inv in outstanding_qs:
        outstanding += float(inv.total - inv.paid_amount)

    return {
        "total": float(total),
        "by_day": by_day,
        "by_category": by_category,
        "outstanding": round(outstanding, 2),
    }


def clinical_analytics(org, from_date=None, to_date=None):
    """Encounters, top diagnoses, admissions and average length of stay."""
    from_d, to_d = _default_range()
    from_d = _parse_date(from_date, from_d)
    to_d = _parse_date(to_date, to_d)

    encounters = Encounter.objects.filter(
        organization=org, started_at__date__gte=from_d, started_at__date__lte=to_d
    )
    top_diagnoses = [
        {"name": row["name"], "count": row["count"]}
        for row in Diagnosis.objects.filter(
            organization=org, encounter__started_at__date__gte=from_d,
            encounter__started_at__date__lte=to_d,
        ).values("name").annotate(count=Count("id")).order_by("-count")[:10]
    ]

    admissions = Admission.objects.filter(
        organization=org, admitted_at__date__gte=from_d, admitted_at__date__lte=to_d
    )
    los = []
    for adm in admissions.filter(discharged_at__isnull=False):
        delta = adm.discharged_at - adm.admitted_at
        los.append(delta.total_seconds() / 86400.0)

    return {
        "encounters": encounters.count(),
        "top_diagnoses": top_diagnoses,
        "admissions": admissions.count(),
        "avg_length_of_stay_days": round(sum(los) / len(los), 2) if los else 0.0,
    }


def laboratory_analytics(org, from_date=None, to_date=None):
    """Lab orders, abnormal rate, critical count and turnaround time."""
    from_d, to_d = _default_range()
    from_d = _parse_date(from_date, from_d)
    to_d = _parse_date(to_date, to_d)

    orders = LabOrder.objects.filter(
        organization=org, ordered_at__date__gte=from_d, ordered_at__date__lte=to_d
    )
    completed = orders.filter(status="COMPLETED").count()

    results = LabResult.objects.filter(
        organization=org,
        status__in=["REVIEWED", "APPROVED"],
        order__ordered_at__date__gte=from_d,
        order__ordered_at__date__lte=to_d,
    )
    flagged = results.exclude(flag__in=["NORMAL", "ABNORMAL", "CRITICAL"]).count()
    scorable = results.exclude(flag="CRITICAL").count() - flagged
    abnormal = results.filter(flag="ABNORMAL").count()
    abnormal_rate = round(abnormal / scorable, 4) if scorable else 0.0

    critical_count = LabResult.objects.filter(
        organization=org,
        flag="CRITICAL",
        order__ordered_at__date__gte=from_d,
        order__ordered_at__date__lte=to_d,
    ).count()

    tat = []
    for order in orders.filter(result_reported_at__isnull=False):
        delta = order.result_reported_at - order.ordered_at
        tat.append(delta.total_seconds() / 3600.0)

    return {
        "orders": orders.count(),
        "completed": completed,
        "abnormal_rate": abnormal_rate,
        "critical_count": critical_count,
        "avg_turnaround_hours": round(sum(tat) / len(tat), 2) if tat else 0.0,
    }


def pharmacy_analytics(org, from_date=None, to_date=None):
    """Dispensations, pharmacy revenue and stock health counts."""
    from_d, to_d = _default_range()
    from_d = _parse_date(from_date, from_d)
    to_d = _parse_date(to_date, to_d)

    dispensations = Dispensation.objects.filter(
        organization=org, dispensed_at__date__gte=from_d, dispensed_at__date__lte=to_d
    )
    revenue = 0.0
    for disp in dispensations:
        for item in disp.items or []:
            revenue += float(item.get("price", 0) or 0) * int(item.get("quantity", 0) or 0)

    low_stock = Medication.objects.filter(
        organization=org, active=True, current_stock__lte=F("reorder_level")
    ).count()
    horizon = timezone.now().date() + timedelta(days=90)
    expiring = MedicationBatch.objects.filter(
        organization=org, expiry_date__lte=horizon, expiry_date__gte=timezone.now().date()
    ).count()

    return {
        "dispensations": dispensations.count(),
        "revenue": round(revenue, 2),
        "low_stock_count": low_stock,
        "expiring_soon_count": expiring,
    }


def admin_dashboard(org):
    today = timezone.localdate()
    now = timezone.now()

    revenue_today = (
        Payment.objects.filter(organization=org, status="COMPLETED", paid_at__date=today)
        .aggregate(total=Sum("amount"))["total"]
        or 0
    )
    appointments_today = Appointment.objects.filter(organization=org, start__date=today).count()
    active_admissions = Admission.objects.filter(organization=org, status="ACTIVE").count()
    pending_lab = LabResult.objects.filter(organization=org, status="PENDING").count()

    total_beds = Bed.objects.filter(organization=org).count()
    occupied_beds = Bed.objects.filter(organization=org, status="OCCUPIED").count()
    occupancy = round(occupied_beds / total_beds, 4) if total_beds else 0.0

    unread_claims = Invoice.objects.filter(
        organization=org, status="ISSUED"
    ).count()  # claims pending proxy: invoices issued not paid
    return {
        "revenue_today": float(revenue_today),
        "appointments_today": appointments_today,
        "active_admissions": active_admissions,
        "pending_lab_results": pending_lab,
        "occupancy_rate": occupancy,
        "unread_claims": unread_claims,
    }


def doctor_dashboard(user, org):
    today = timezone.localdate()
    my_appointments = Appointment.objects.filter(
        organization=org, doctor=user, start__date=today
    ).exclude(status__in=["CANCELLED", "NO_SHOW"]).count()
    open_encounters = Encounter.objects.filter(
        organization=org, doctor=user, status__in=["OPEN", "IN_PROGRESS"]
    ).count()
    critical = LabResult.objects.filter(organization=org, flag="CRITICAL").count()
    pending_followups = FollowUp.objects.filter(
        organization=org, status="PENDING", scheduled_date__gte=today
    ).count()
    return {
        "appointments_today": my_appointments,
        "open_encounters": open_encounters,
        "critical_results": critical,
        "pending_followups": pending_followups,
    }


def receptionist_dashboard(org):
    today = timezone.localdate()
    appts = Appointment.objects.filter(organization=org, start__date=today)
    by_status = {row["status"]: row["count"] for row in appts.values("status").annotate(count=Count("id"))}
    waiting = AppointmentQueue.objects.filter(
        organization=org, status="WAITING", appointment__start__date=today
    ).count()
    new_registrations = Patient.objects.filter(organization=org, registration_date__date=today).count()
    return {
        "appointments_today": appts.count(),
        "by_status": by_status,
        "waiting_queue": waiting,
        "new_registrations": new_registrations,
    }


def patient_dashboard(patient, org):
    upcoming = Appointment.objects.filter(
        organization=org, patient=patient, start__gte=timezone.now()
    ).exclude(status__in=["CANCELLED", "NO_SHOW"]).order_by("start")[:5]
    unread = Notification.objects.filter(
        organization=org, recipient=patient.user_id if patient.user_id else -1, is_read=False
    ).count()
    recent_results = LabResult.objects.filter(
        organization=org, order__patient=patient, status="APPROVED"
    ).order_by("-reviewed_at")[:5]
    outstanding = 0.0
    for inv in Invoice.objects.filter(organization=org, patient=patient, status__in=["ISSUED", "PARTIAL"]):
        outstanding += float(inv.total - inv.paid_amount)
    return {
        "upcoming_appointments": [
            {
                "id": a.id,
                "doctor": a.doctor.get_full_name() if a.doctor else None,
                "department": a.department.name if a.department else None,
                "start": a.start.isoformat(),
                "status": a.status,
            }
            for a in upcoming
        ],
        "unread_notifications": unread,
        "recent_results": [
            {
                "id": r.id,
                "test": r.test.name if r.test else None,
                "value": r.value,
                "flag": r.flag,
                "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
            }
            for r in recent_results
        ],
        "outstanding_balance": round(outstanding, 2),
    }
