"""Celery tasks for async report generation (openpyxl XLSX)."""

import io
from datetime import timedelta

from celery import shared_task
from django.core.files.base import ContentFile
from django.utils import timezone
from openpyxl import Workbook

from apps.billing.models import Invoice, Payment
from apps.laboratory.models import LabResult
from apps.patients.models import Patient
from apps.pharmacy.models import Dispensation

from .models import Report

KIND_COLUMNS = {
    "patients": [
        ("mrn", "MRN"),
        ("full_name", "Patient"),
        ("date_of_birth", "Date of Birth"),
        ("gender", "Gender"),
        ("phone", "Phone"),
        ("email", "Email"),
        ("status", "Status"),
        ("registration_date", "Registered"),
    ],
    "invoices": [
        ("invoice_number", "Invoice #"),
        ("patient_name", "Patient"),
        ("issued_at", "Issued At"),
        ("status", "Status"),
        ("total", "Total"),
        ("paid_amount", "Paid"),
        ("balance", "Balance"),
    ],
    "payments": [
        ("patient_name", "Patient"),
        ("amount", "Amount"),
        ("method", "Method"),
        ("reference", "Reference"),
        ("status", "Status"),
        ("paid_at", "Paid At"),
        ("received_by", "Received By"),
    ],
    "lab_results": [
        ("patient_name", "Patient"),
        ("test_name", "Test"),
        ("value", "Value"),
        ("unit", "Unit"),
        ("flag", "Flag"),
        ("status", "Status"),
        ("reviewed_at", "Reviewed At"),
    ],
    "dispensation": [
        ("prescription_id", "Prescription #"),
        ("patient_name", "Patient"),
        ("dispensed_by", "Dispensed By"),
        ("dispensed_at", "Dispensed At"),
        ("status", "Status"),
        ("items_count", "Items"),
        ("notes", "Notes"),
    ],
}


def _range(params):
    """Return (from_dt, to_dt) from report params, defaulting to last 30 days."""
    now = timezone.now()
    frm = params.get("from")
    to = params.get("to")
    from_dt = now - timedelta(days=30)
    to_dt = now
    if frm:
        try:
            from_dt = timezone.make_aware(timezone.datetime.fromisoformat(str(frm)))
        except ValueError:
            from_dt = now - timedelta(days=30)
    if to:
        try:
            to_dt = timezone.make_aware(timezone.datetime.fromisoformat(str(to)))
        except ValueError:
            to_dt = now
    return from_dt, to_dt


def _patient_name(patient):
    return patient.full_name if patient else ""


def _collect_rows(kind, org_id, params):
    """Return a list of row dicts keyed by the KIND_COLUMNS keys."""
    from_dt, to_dt = _range(params)

    if kind == "patients":
        qs = Patient._base_manager.filter(
            organization_id=org_id, registration_date__gte=from_dt, registration_date__lte=to_dt
        )
        return [
            {
                "mrn": p.mrn,
                "full_name": p.full_name,
                "date_of_birth": p.date_of_birth.isoformat() if p.date_of_birth else "",
                "gender": p.gender,
                "phone": p.phone or "",
                "email": p.email or "",
                "status": p.status,
                "registration_date": p.registration_date.isoformat() if p.registration_date else "",
            }
            for p in qs
        ]

    if kind == "invoices":
        qs = Invoice._base_manager.filter(
            organization_id=org_id, issued_at__gte=from_dt, issued_at__lte=to_dt
        )
        return [
            {
                "invoice_number": inv.invoice_number,
                "patient_name": _patient_name(inv.patient),
                "issued_at": inv.issued_at.isoformat() if inv.issued_at else "",
                "status": inv.status,
                "total": float(inv.total),
                "paid_amount": float(inv.paid_amount),
                "balance": float(inv.total - inv.paid_amount),
            }
            for inv in qs
        ]

    if kind == "payments":
        qs = Payment._base_manager.filter(
            organization_id=org_id, paid_at__gte=from_dt, paid_at__lte=to_dt
        )
        return [
            {
                "patient_name": _patient_name(p.patient),
                "amount": float(p.amount),
                "method": p.method,
                "reference": p.reference or "",
                "status": p.status,
                "paid_at": p.paid_at.isoformat() if p.paid_at else "",
                "received_by": p.received_by.get_full_name() if p.received_by else "",
            }
            for p in qs
        ]

    if kind == "lab_results":
        qs = LabResult._base_manager.filter(
            organization_id=org_id,
            order__ordered_at__gte=from_dt,
            order__ordered_at__lte=to_dt,
        )
        return [
            {
                "patient_name": _patient_name(r.order.patient) if r.order else "",
                "test_name": r.test.name if r.test else "",
                "value": r.value,
                "unit": r.unit or "",
                "flag": r.flag,
                "status": r.status,
                "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else "",
            }
            for r in qs
        ]

    if kind == "dispensation":
        qs = Dispensation._base_manager.filter(
            organization_id=org_id, dispensed_at__gte=from_dt, dispensed_at__lte=to_dt
        )
        return [
            {
                "prescription_id": d.prescription_id or "",
                "patient_name": _patient_name(d.prescription.encounter.patient)
                if d.prescription_id and d.prescription and d.prescription.encounter
                else "",
                "dispensed_by": d.dispensed_by.get_full_name() if d.dispensed_by else "",
                "dispensed_at": d.dispensed_at.isoformat() if d.dispensed_at else "",
                "status": d.status,
                "items_count": len(d.items or []),
                "notes": d.notes or "",
            }
            for d in qs
        ]

    return []


def build_workbook(kind, org_id, params):
    """Build an in-memory XLSX workbook for a report kind (pure function)."""
    wb = Workbook()
    ws = wb.active
    ws.title = kind.title()
    headers = KIND_COLUMNS[kind]
    ws.append([label for _, label in headers])
    for row in _collect_rows(kind, org_id, params or {}):
        ws.append([row.get(key, "") for key, _ in headers])
    return wb


@shared_task
def generate_report(report_id):
    """Generate the XLSX file for a Report and flip status to READY/FAILED."""
    try:
        report = Report._base_manager.get(pk=report_id)
    except Report.DoesNotExist:
        return

    try:
        wb = build_workbook(report.kind, report.organization_id, report.params)
        buffer = io.BytesIO()
        wb.save(buffer)
        filename = f"report_{report.kind}_{report.id}.xlsx"
        report.file.save(filename, ContentFile(buffer.getvalue()), save=False)
        report.status = "READY"
        report.generated_at = timezone.now()
        report.error = ""
        report.save(update_fields=["file", "status", "generated_at", "error", "updated_at"])
    except Exception as exc:  # pragma: no cover - surfaced via Report.status
        report.status = "FAILED"
        report.error = str(exc)[:2000]
        report.save(update_fields=["status", "error", "updated_at"])
