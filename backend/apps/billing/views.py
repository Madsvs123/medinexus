"""Billing & Insurance API views (per conventions §4.10, prefix /api/v1/billing/)."""

from decimal import Decimal

from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import status as http_status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import HasOrgAccess
from apps.core.pagination import StandardPagination
from apps.core.views import TenantViewSetMixin

from .models import (
    Deposit,
    InsuranceClaim,
    InsurancePlan,
    Invoice,
    InvoiceItem,
    PatientInsurance,
    Payment,
    Refund,
    Service,
)
from .serializers import (
    ClaimSerializer,
    DepositSerializer,
    InsurancePlanSerializer,
    InvoiceDetailSerializer,
    InvoiceSerializer,
    PatientInsuranceSerializer,
    PaymentSerializer,
    RefundSerializer,
    ServiceSerializer,
)
from .services import apply_payment, recalc

try:  # pragma: no cover - defensive import
    from apps.audit.services import record_audit
except Exception:  # pragma: no cover - app not ready yet
    record_audit = None

AUDIT_RESOURCE = "invoice"


def _audit(request, action, resource_type, resource_id=None, details=None):
    """Best-effort audit logging; never breaks the request."""
    if record_audit is None:
        return
    try:
        record_audit(
            actor=request.user if getattr(request, "user", None) else None,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            request=request,
        )
    except Exception:  # pragma: no cover
        pass


class BillingViewSetMixin(TenantViewSetMixin):
    """Base for all billing viewsets: authenticated + org-scoped (defense in depth)."""

    permission_classes = [IsAuthenticated, HasOrgAccess]
    pagination_class = StandardPagination


class ServiceViewSet(BillingViewSetMixin, viewsets.ModelViewSet):
    """``GET/POST services/``, ``PATCH services/<id>/``."""

    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("active") is not None:
            qs = qs.filter(active=self.request.query_params["active"].lower() == "true")
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search))
        return qs


class InvoiceViewSet(BillingViewSetMixin, viewsets.ModelViewSet):
    """``GET/POST invoices/`` (?patient=&status=&date=), ``GET/PATCH invoices/<id>/``."""

    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return InvoiceDetailSerializer
        return InvoiceSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        if params.get("patient"):
            qs = qs.filter(patient_id=params["patient"])
        if params.get("status"):
            qs = qs.filter(status=params["status"].upper())
        if params.get("date"):
            qs = qs.filter(created_at__date=params["date"])
        return qs

    def perform_create(self, serializer):
        invoice = serializer.save()
        _audit(self.request, "CREATE", AUDIT_RESOURCE, invoice.id,
               {"invoice_number": invoice.invoice_number})

    def perform_update(self, serializer):
        instance = serializer.save()
        _audit(self.request, "UPDATE", AUDIT_RESOURCE, instance.id,
               {"invoice_number": instance.invoice_number})

    @action(detail=True, methods=["post"])
    def issue(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status != "DRAFT":
            raise ValidationError({"status": "Only draft invoices can be issued."})
        if not invoice.items.exists():
            raise ValidationError({"items": "Cannot issue an invoice without line items."})
        invoice.issued_at = timezone.now()
        invoice.status = "ISSUED"
        invoice.save(update_fields=["issued_at", "status", "updated_at"])
        _audit(request, "UPDATE", AUDIT_RESOURCE, invoice.id, {"action": "issue"})
        return Response(self.get_serializer(invoice).data)

    @action(detail=True, methods=["post"])
    def void(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status in ("PAID", "REFUNDED", "VOID"):
            raise ValidationError({"status": f"Cannot void an invoice in state {invoice.status}."})
        reason = (request.data.get("reason") or "").strip()
        invoice.status = "VOID"
        if reason and not invoice.notes:
            invoice.notes = reason
        invoice.save(update_fields=["status", "notes", "updated_at"])
        _audit(request, "UPDATE", AUDIT_RESOURCE, invoice.id,
               {"action": "void", "reason": reason})
        return Response(self.get_serializer(invoice).data)

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        invoice = self.get_object()
        amount = request.data.get("amount")
        method = request.data.get("method")
        reference = request.data.get("reference", "")
        deposit_id = request.data.get("deposit_id")
        try:
            amount = Decimal(str(amount))
        except (TypeError, ValueError):
            raise ValidationError({"amount": "A valid amount is required."})
        if not method:
            raise ValidationError({"method": "Payment method is required."})
        if amount <= 0:
            raise ValidationError({"amount": "Amount must be positive."})
        if amount > invoice.outstanding():
            raise ValidationError(
                {"amount": f"Amount exceeds outstanding balance ({invoice.outstanding()})."}
            )

        deposit = None
        if deposit_id:
            try:
                deposit = Deposit.objects.get(pk=deposit_id, patient_id=invoice.patient_id)
            except Deposit.DoesNotExist:
                raise ValidationError({"deposit_id": "Deposit not found for this patient."})

        try:
            payment = apply_payment(
                invoice,
                amount,
                method,
                reference,
                deposit=deposit,
                received_by=request.user if request.user.is_authenticated else None,
            )
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})

        _audit(request, "UPDATE", AUDIT_RESOURCE, invoice.id,
               {"action": "pay", "payment_id": payment.id, "amount": str(amount)})
        invoice.refresh_from_db()
        return Response(
            {"payment": PaymentSerializer(payment).data, "invoice": self.get_serializer(invoice).data},
            status=http_status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="add-item")
    def add_item(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status in ("PAID", "VOID", "REFUNDED"):
            raise ValidationError(
                {"status": f"Items cannot be added to an invoice in state {invoice.status}."}
            )
        service_id = request.data.get("service_id")
        quantity = request.data.get("quantity", 1)
        unit_price = request.data.get("unit_price")
        discount = request.data.get("discount", Decimal("0.00"))
        try:
            service = Service.objects.get(pk=service_id)
        except Service.DoesNotExist:
            raise ValidationError({"service_id": "Service not found."})
        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            raise ValidationError({"quantity": "Quantity must be an integer."})
        if quantity <= 0:
            raise ValidationError({"quantity": "Quantity must be positive."})
        item = InvoiceItem.objects.create(
            invoice=invoice,
            service=service,
            quantity=quantity,
            unit_price=Decimal(str(unit_price)) if unit_price else service.price,
            discount=Decimal(str(discount)),
        )
        invoice.recalculate()
        _audit(request, "UPDATE", AUDIT_RESOURCE, invoice.id,
               {"action": "add_item", "item_id": item.id})
        return Response(self.get_serializer(invoice).data, status=http_status.HTTP_201_CREATED)


class PaymentViewSet(BillingViewSetMixin, viewsets.ModelViewSet):
    """``GET/POST payments/`` (?patient=&invoice=), ``GET payments/<id>/``, refund."""

    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        if params.get("patient"):
            qs = qs.filter(patient_id=params["patient"])
        if params.get("invoice"):
            qs = qs.filter(invoice_id=params["invoice"])
        return qs

    def perform_create(self, serializer):
        payment = serializer.save(
            received_by=self.request.user if self.request.user.is_authenticated else None
        )
        if payment.invoice_id:
            recalc(payment.invoice)
        _audit(self.request, "CREATE", "payment", payment.id,
               {"invoice_id": payment.invoice_id, "amount": str(payment.amount)})

    @action(detail=True, methods=["post"])
    def refund(self, request, pk=None):
        payment = self.get_object()
        amount = request.data.get("amount")
        reason = (request.data.get("reason") or "").strip()
        try:
            amount = Decimal(str(amount))
        except (TypeError, ValueError):
            raise ValidationError({"amount": "A valid amount is required."})
        if not reason:
            raise ValidationError({"reason": "A refund reason is required."})
        if amount <= 0:
            raise ValidationError({"amount": "Amount must be positive."})
        if payment.status != "COMPLETED":
            raise ValidationError({"payment": "Only completed payments can be refunded."})
        if amount > payment.amount:
            raise ValidationError({"amount": "Refund cannot exceed the payment amount."})
        refund = Refund.objects.create(
            payment=payment, amount=amount, reason=reason, status="PENDING"
        )
        _audit(request, "CREATE", "refund", refund.id,
               {"payment_id": payment.id, "amount": str(amount), "reason": reason})
        return Response(RefundSerializer(refund).data, status=http_status.HTTP_201_CREATED)


class RefundViewSet(BillingViewSetMixin, viewsets.ModelViewSet):
    """``GET/POST refunds/`` (?status=), ``POST refunds/<id>/process/`` {approved: bool}."""

    queryset = Refund.objects.all()
    serializer_class = RefundSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        return qs

    @action(detail=True, methods=["post"])
    def process(self, request, pk=None):
        refund = self.get_object()
        if refund.status != "PENDING":
            raise ValidationError({"status": "Only pending refunds can be processed."})
        approved = request.data.get("approved")
        if not isinstance(approved, bool):
            raise ValidationError({"approved": "A boolean 'approved' value is required."})

        payment = refund.payment
        if approved:
            if payment.status != "COMPLETED":
                raise ValidationError({"payment": "Payment is not refundable."})
            refund.status = "COMPLETED"
            payment.status = "REFUNDED"
            payment.save(update_fields=["status", "updated_at"])
            invoice = payment.invoice
            if invoice is not None and invoice.status not in ("VOID", "REFUNDED"):
                was_paid = invoice.status == "PAID"
                invoice.paid_amount = max(invoice.paid_amount - refund.amount, Decimal("0.00"))
                if invoice.paid_amount <= 0:
                    invoice.status = "REFUNDED" if was_paid else (
                        "ISSUED" if invoice.issued_at else "DRAFT"
                    )
                else:
                    invoice.status = "PARTIAL"
                invoice.save(update_fields=["paid_amount", "status", "updated_at"])
        else:
            refund.status = "REJECTED"
        refund.processed_by = request.user if request.user.is_authenticated else None
        refund.processed_at = timezone.now()
        refund.save(update_fields=["status", "processed_by", "processed_at", "updated_at"])
        _audit(request, "UPDATE", "refund", refund.id,
               {"action": "process", "approved": approved})
        return Response(RefundSerializer(refund).data)


class DepositViewSet(BillingViewSetMixin, viewsets.ModelViewSet):
    """``GET/POST deposits/`` (?patient=), ``GET deposits/<id>/``, apply."""

    queryset = Deposit.objects.all()
    serializer_class = DepositSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        patient = self.request.query_params.get("patient")
        if patient:
            qs = qs.filter(patient_id=patient)
        return qs

    def perform_create(self, serializer):
        serializer.save(received_by=self.request.user if self.request.user.is_authenticated else None)

    @action(detail=True, methods=["post"])
    def apply(self, request, pk=None):
        deposit = self.get_object()
        invoice_id = request.data.get("invoice_id")
        amount = request.data.get("amount")
        try:
            amount = Decimal(str(amount))
        except (TypeError, ValueError):
            raise ValidationError({"amount": "A valid amount is required."})
        if amount <= 0:
            raise ValidationError({"amount": "Amount must be positive."})
        if deposit.status != "ACTIVE":
            raise ValidationError({"status": "Only active deposits can be applied."})
        if amount > deposit.balance:
            raise ValidationError({"amount": f"Amount exceeds deposit balance ({deposit.balance})."})
        try:
            invoice = Invoice.objects.get(pk=invoice_id)
        except Invoice.DoesNotExist:
            raise ValidationError({"invoice_id": "Invoice not found."})
        if invoice.patient_id != deposit.patient_id:
            raise ValidationError({"invoice_id": "Invoice belongs to a different patient."})

        payment = apply_payment(
            invoice,
            amount,
            method=deposit.method,
            reference=f"deposit:{deposit.id}",
            deposit=deposit,
            received_by=request.user if request.user.is_authenticated else None,
        )
        _audit(request, "UPDATE", "deposit", deposit.id,
               {"action": "apply", "invoice_id": invoice.id, "amount": str(amount)})
        return Response(
            {"payment": PaymentSerializer(payment).data, "deposit": DepositSerializer(deposit).data},
            status=http_status.HTTP_201_CREATED,
        )


class InsurancePlanViewSet(BillingViewSetMixin, viewsets.ModelViewSet):
    """``GET/POST insurance-plans/``, ``PATCH insurance-plans/<id>/``."""

    queryset = InsurancePlan.objects.all()
    serializer_class = InsurancePlanSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]


class PatientInsuranceViewSet(BillingViewSetMixin, viewsets.ModelViewSet):
    """``GET/POST patient-insurance/`` (?patient=), ``PATCH/DELETE patient-insurance/<id>/``.

    ``is_primary`` exclusivity per patient is enforced in the model.
    """

    queryset = PatientInsurance.objects.all()
    serializer_class = PatientInsuranceSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        patient = self.request.query_params.get("patient")
        if patient:
            qs = qs.filter(patient_id=patient)
        return qs


class InsuranceClaimViewSet(BillingViewSetMixin, viewsets.ModelViewSet):
    """Claims lifecycle: submit → approve/reject → resubmit → mark-paid."""

    queryset = InsuranceClaim.objects.all()
    serializer_class = ClaimSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        if params.get("status"):
            qs = qs.filter(status=params["status"].upper())
        if params.get("patient"):
            qs = qs.filter(invoice__patient_id=params["patient"])
        return qs

    def perform_create(self, serializer):
        claim = serializer.save()
        _audit(self.request, "CREATE", "claim", claim.id,
               {"claim_number": claim.claim_number})

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        claim = self.get_object()
        if claim.status not in ("DRAFT", "RESUBMITTED"):
            raise ValidationError({"status": f"Cannot submit a claim in state {claim.status}."})
        claim.status = "SUBMITTED"
        claim.submitted_at = timezone.now()
        claim.save(update_fields=["status", "submitted_at", "updated_at"])
        _audit(request, "UPDATE", "claim", claim.id, {"action": "submit"})
        return Response(ClaimSerializer(claim).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        claim = self.get_object()
        if claim.status != "SUBMITTED":
            raise ValidationError({"status": "Only submitted claims can be approved."})
        approved_amount = request.data.get("approved_amount")
        try:
            approved_amount = Decimal(str(approved_amount))
        except (TypeError, ValueError):
            raise ValidationError({"approved_amount": "A valid approved_amount is required."})
        if approved_amount < 0:
            raise ValidationError({"approved_amount": "Approved amount cannot be negative."})
        claim.approved_amount = approved_amount
        claim.status = "APPROVED"
        claim.approved_at = timezone.now()
        claim.rejection_reason = ""
        claim.save(update_fields=["approved_amount", "status", "approved_at", "rejection_reason", "updated_at"])
        _audit(request, "UPDATE", "claim", claim.id,
               {"action": "approve", "approved_amount": str(approved_amount)})
        return Response(ClaimSerializer(claim).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        claim = self.get_object()
        if claim.status != "SUBMITTED":
            raise ValidationError({"status": "Only submitted claims can be rejected."})
        reason = (request.data.get("reason") or "").strip()
        if not reason:
            raise ValidationError({"reason": "A rejection reason is required."})
        claim.status = "REJECTED"
        claim.rejection_reason = reason
        claim.save(update_fields=["status", "rejection_reason", "updated_at"])
        _audit(request, "UPDATE", "claim", claim.id,
               {"action": "reject", "reason": reason})
        return Response(ClaimSerializer(claim).data)

    @action(detail=True, methods=["post"])
    def resubmit(self, request, pk=None):
        claim = self.get_object()
        if claim.status != "REJECTED":
            raise ValidationError({"status": "Only rejected claims can be resubmitted."})
        claim.status = "RESUBMITTED"
        claim.save(update_fields=["status", "updated_at"])
        _audit(request, "UPDATE", "claim", claim.id, {"action": "resubmit"})
        return Response(ClaimSerializer(claim).data)

    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        claim = self.get_object()
        if claim.status != "APPROVED":
            raise ValidationError({"status": "Only approved claims can be marked paid."})
        claim.status = "PAID"
        claim.save(update_fields=["status", "updated_at"])
        _audit(request, "UPDATE", "claim", claim.id, {"action": "mark_paid"})
        return Response(ClaimSerializer(claim).data)


class StatsViewSet(BillingViewSetMixin, viewsets.ViewSet):
    """``GET stats/`` → revenue / outstanding / claims summary."""

    def list(self, request):
        today = timezone.localdate()
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        payments = Payment.objects.filter(status="COMPLETED")
        revenue_today = payments.filter(paid_at__date=today).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        revenue_month = payments.filter(paid_at__gte=month_start).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

        open_invoices = Invoice.objects.exclude(status__in=["VOID", "REFUNDED", "PAID"])
        outstanding = Decimal("0.00")
        overdue = Decimal("0.00")
        for invoice in open_invoices:
            outstanding += invoice.outstanding()
            if invoice.is_overdue():
                overdue += invoice.outstanding()

        claims = InsuranceClaim.objects.all()
        claims_pending = claims.filter(status__in=["SUBMITTED", "RESUBMITTED"]).count()
        claims_approved = claims.filter(status="APPROVED").count()

        return Response(
            {
                "revenue_today": revenue_today,
                "revenue_month": revenue_month,
                "outstanding": outstanding,
                "overdue": overdue,
                "claims_pending": claims_pending,
                "claims_approved": claims_approved,
            }
        )
