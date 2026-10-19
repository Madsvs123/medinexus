"""Billing service layer: payment application, totals, notifications.

Cross-app helpers are imported defensively so this module loads even while
``patients`` / ``clinical`` / ``notifications`` are being built in parallel.
"""

from decimal import Decimal

from django.utils import timezone

from .models import Deposit, Invoice, Payment

try:  # pragma: no cover - defensive import
    from apps.notifications.services import notify
except Exception:  # pragma: no cover - app not ready yet
    notify = None


def _notify_patient(patient, title, body, data=None):
    """Notify the patient's linked user when available (best effort)."""
    if notify is None:
        return None
    user = getattr(patient, "user", None)
    if user is None:
        return None
    try:
        return notify(
            recipient=user,
            type="BILLING",
            title=title,
            body=body,
            data=data,
            organization=getattr(patient, "organization", None),
        )
    except Exception:  # pragma: no cover - never break billing for a notification
        return None


def recalc(invoice):
    """Recompute an invoice's totals from its line items."""
    invoice.recalculate()
    invoice._update_status()
    return invoice


def apply_payment(invoice, amount, method, reference="", deposit=None, received_by=None):
    """Apply a payment to an invoice.

    Creates a COMPLETED ``Payment``, updates ``paid_amount`` / status, applies
    an optional deposit (reducing its balance), and notifies the patient.
    Returns the created ``Payment``.
    """
    amount = Decimal(amount)
    if amount <= 0:
        raise ValueError("Payment amount must be positive.")
    if invoice.status == "VOID":
        raise ValueError("Cannot pay a void invoice.")

    if deposit is not None:
        if deposit.patient_id != invoice.patient_id:
            raise ValueError("Deposit belongs to a different patient.")
        if deposit.balance < amount:
            raise ValueError(
                f"Deposit balance ({deposit.balance}) is less than the payment amount ({amount})."
            )

    if deposit is not None:
        deposit.applied_amount = deposit.applied_amount + amount
        if deposit.balance <= 0:
            deposit.status = "APPLIED"
        deposit.save()

    payment = Payment.objects.create(
        organization_id=invoice.organization_id,
        invoice=invoice,
        patient_id=invoice.patient_id,
        amount=amount,
        method=method,
        reference=reference,
        status="COMPLETED",
        paid_at=timezone.now(),
        received_by=received_by,
    )

    invoice.paid_amount = Decimal(invoice.paid_amount or 0) + amount
    if invoice.paid_amount >= invoice.total and invoice.total > 0:
        invoice.status = "PAID"
    elif invoice.paid_amount > 0:
        invoice.status = "PARTIAL"
    invoice.save(update_fields=["paid_amount", "status", "updated_at"])

    _notify_patient(
        invoice.patient,
        "Payment received",
        f"Payment of {amount} received for invoice {invoice.invoice_number}.",
        data={"invoice_id": invoice.id, "payment_id": payment.id, "amount": str(amount)},
    )
    return payment
