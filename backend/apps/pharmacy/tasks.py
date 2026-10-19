"""Celery tasks for pharmacy stock monitoring.

Beat schedule (config/settings.py) references these EXACT dotted paths:
- ``apps.pharmacy.tasks.check_stock_alerts``   (daily, low stock → org admins)
- ``apps.pharmacy.tasks.check_expiring_batches`` (daily, expiring ≤ 90 days)
"""

import logging
from datetime import timedelta

from celery import shared_task
from django.contrib.auth import get_user_model
from django.db.models import F
from django.utils import timezone

from .models import Medication, MedicationBatch

logger = logging.getLogger(__name__)

NOTIFICATION_TYPE = "TASK"
TITLE_LOW_STOCK = "Low stock alert"
TITLE_EXPIRING = "Batch expiring soon"


def _org_admins(organization):
    """All active ADMIN users of an organization (bypasses tenant filtering)."""
    User = get_user_model()
    return list(
        User.objects.filter(organization=organization, role="ADMIN", is_active=True)
    )


def _notify_admins(organization, title, body, data):
    from apps.notifications.services import notify

    for admin in _org_admins(organization):
        try:
            notify(
                recipient=admin,
                type=NOTIFICATION_TYPE,
                title=title,
                body=body,
                data=data,
                organization=organization,
            )
        except Exception:  # pragma: no cover - one bad recipient must not kill the task
            logger.exception("Failed to notify admin %s", admin.pk)


@shared_task
def check_stock_alerts():
    """Notify org admins about medications at or below their reorder level."""
    from apps.organizations.models import Organization

    today = timezone.localdate()
    notified = 0
    for organization in Organization.objects.filter(is_active=True):
        low_stock = (
            Medication.objects.all_orgs()
            .filter(
                organization=organization,
                active=True,
                current_stock__lte=F("reorder_level"),
            )
            .order_by("name")
        )
        low_ids = list(low_stock.values_list("id", flat=True)[:50])
        if not low_ids:
            continue
        meds = list(Medication.objects.all_orgs().filter(id__in=low_ids).order_by("name"))
        _notify_admins(
            organization,
            TITLE_LOW_STOCK,
            f"{len(meds)} medication(s) at or below reorder level.",
            {
                "kind": "low_stock",
                "count": len(meds),
                "medication_ids": low_ids,
                "date": today.isoformat(),
            },
        )
        notified += len(meds)
    logger.info("check_stock_alerts: %d low-stock medications notified", notified)
    return notified


@shared_task
def check_expiring_batches():
    """Notify org admins about batches expiring within 90 days (incl. expired)."""
    from apps.organizations.models import Organization

    today = timezone.localdate()
    cutoff = today + timedelta(days=90)
    notified = 0
    for organization in Organization.objects.filter(is_active=True):
        batches = (
            MedicationBatch.objects.all_orgs()
            .filter(organization=organization, expiry_date__lte=cutoff)
            .select_related("medication")
            .order_by("expiry_date")
        )
        batch_ids = list(batches.values_list("id", flat=True)[:50])
        if not batch_ids:
            continue
        items = list(
            MedicationBatch.objects.all_orgs()
            .filter(id__in=batch_ids)
            .select_related("medication")
            .order_by("expiry_date")
        )
        expired_count = sum(1 for b in items if b.expiry_date < today)
        _notify_admins(
            organization,
            TITLE_EXPIRING,
            f"{len(items)} batch(es) expiring within 90 days ({expired_count} already expired).",
            {
                "kind": "expiring",
                "count": len(items),
                "expired_count": expired_count,
                "batch_ids": batch_ids,
                "date": today.isoformat(),
            },
        )
        notified += len(items)
    logger.info("check_expiring_batches: %d expiring batches notified", notified)
    return notified
