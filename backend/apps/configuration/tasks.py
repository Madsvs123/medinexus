"""Celery task: process bulk imports (CSV/XLSX) into tenant-scoped rows."""

import csv
import io
from datetime import date, datetime

from celery import shared_task
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from openpyxl import load_workbook

from .models import ImportJob

TRUE_VALUES = {"true", "yes", "1", "y", "on"}


def _parse_bool(value):
    if value is None or value == "":
        return None
    return str(value).strip().lower() in TRUE_VALUES


def _parse_number(value):
    if value is None or value == "":
        return None
    return float(value)


def _parse_date(value):
    if value is None or value == "":
        return None
    try:
        return date.fromisoformat(str(value))
    except ValueError:
        return datetime.strptime(str(value), "%m/%d/%Y").date()


def _clean_row(row):
    """Strip whitespace from every cell and drop empty keys."""
    return {str(k).strip(): (str(v).strip() if isinstance(v, str) else v) for k, v in (row or {}).items() if k is not None}


def _read_rows(job):
    """Yield header + rows regardless of .csv or .xlsx upload."""
    filename = (job.file.name or "").lower()
    job.file.open("rb")
    raw = job.file.read()
    job.file.close()
    if filename.endswith(".xlsx"):
        wb = load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            return [], []
        headers = [str(h).strip() if h is not None else "" for h in rows[0]]
        data = []
        for values in rows[1:]:
            data.append({headers[i]: values[i] for i in range(len(headers)) if i < len(values)})
        return headers, data
    # default: CSV
    text = raw.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    return reader.fieldnames or [], list(reader)


def _build_model(kind, org, actor, row):
    """Instantiate (unsaved) model for a kind; raises on invalid data."""
    if kind == "patients":
        from apps.patients.models import Patient

        obj = Patient(
            organization=org,
            created_by=actor,
            first_name=row.get("first_name", ""),
            last_name=row.get("last_name", ""),
            date_of_birth=_parse_date(row.get("date_of_birth")),
            gender=(row.get("gender") or "").upper() or None,
            phone=row.get("phone") or None,
            email=row.get("email") or None,
            address=row.get("address") or "",
            city=row.get("city") or "",
            nationality=row.get("nationality") or "",
            marital_status=row.get("marital_status") or "",
            occupation=row.get("occupation") or "",
            status=(row.get("status") or "ACTIVE").upper(),
            notes=row.get("notes") or "",
        )
        if row.get("mrn"):
            obj.mrn = row["mrn"]
        return obj

    if kind == "medications":
        from apps.pharmacy.models import Medication

        return Medication(
            organization=org,
            created_by=actor,
            code=row.get("code", ""),
            name=row.get("name", ""),
            generic_name=row.get("generic_name") or "",
            category=(row.get("category") or "OTHER").upper(),
            form=(row.get("form") or "").upper() or None,
            strength=row.get("strength") or "",
            unit=row.get("unit") or "",
            price=_parse_number(row.get("price")) or 0,
            reorder_level=int(_parse_number(row.get("reorder_level")) or 0),
            current_stock=int(_parse_number(row.get("current_stock")) or 0),
            is_controlled=bool(_parse_bool(row.get("is_controlled")) or False),
            active=not (_parse_bool(row.get("active")) is False),
        )

    if kind == "services":
        from apps.billing.models import Service

        return Service(
            organization=org,
            created_by=actor,
            code=row.get("code", ""),
            name=row.get("name", ""),
            category=(row.get("category") or "OTHER").upper(),
            price=_parse_number(row.get("price")) or 0,
            tax_rate=_parse_number(row.get("tax_rate")) or 0,
            active=not (_parse_bool(row.get("active")) is False),
        )

    if kind == "tests":
        from apps.laboratory.models import LabTest

        return LabTest(
            organization=org,
            created_by=actor,
            code=row.get("code", ""),
            name=row.get("name", ""),
            category=(row.get("category") or "OTHER").upper(),
            sample_type=(row.get("sample_type") or "OTHER").upper(),
            unit=row.get("unit") or "",
            ref_range_low=row.get("ref_range_low") or None,
            ref_range_high=row.get("ref_range_high") or None,
            price=_parse_number(row.get("price")) or 0,
            active=not (_parse_bool(row.get("active")) is False),
        )

    raise ValueError(f"Unsupported import kind: {kind}")


@shared_task
def process_import(job_id):
    """Parse the uploaded file and create tenant-scoped rows per row."""
    try:
        job = ImportJob._base_manager.get(pk=job_id)
    except ImportJob.DoesNotExist:
        return

    job.status = "PROCESSING"
    job.started_at = timezone.now()
    job.summary = {"total": 0, "created": 0, "skipped": 0}
    job.errors = []
    job.save(update_fields=["status", "started_at", "summary", "errors", "updated_at"])

    created = 0
    skipped = 0
    errors = []

    try:
        headers, rows = _read_rows(job)
        if not headers:
            raise ValueError("The file has no header row.")
        job.summary["total"] = len(rows)

        for idx, raw_row in enumerate(rows, start=2):
            row = _clean_row(raw_row)
            try:
                if not any(row.values()):
                    skipped += 1
                    continue
                with transaction.atomic():
                    obj = _build_model(job.kind, job.organization, job.processed_by, row)
                    obj.save()
                created += 1
            except (IntegrityError, ValidationError, ValueError, TypeError) as exc:
                message = str(exc)
                if "UNIQUE" in message.upper() or "unique" in message:
                    message = "Duplicate row (unique constraint)."
                errors.append({"row": idx, "error": message[:500]})
                skipped += 1

        job.summary.update({"created": created, "skipped": skipped})
        job.status = "COMPLETED"
    except Exception as exc:  # pragma: no cover - file-level failure
        job.status = "FAILED"
        job.summary.update({"created": created, "skipped": skipped})
        errors.append({"row": 0, "error": f"File could not be processed: {exc}"[:500]})

    job.errors = errors[:200]
    job.summary["error_count"] = len(errors)
    job.finished_at = timezone.now()
    job.save(
        update_fields=["status", "summary", "errors", "finished_at", "updated_at"]
    )
