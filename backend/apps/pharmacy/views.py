from datetime import timedelta

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.core.views import TenantViewSetMixin

from .models import (
    Dispensation,
    DrugInteraction,
    Medication,
    MedicationBatch,
    StockReturn,
    StockTransfer,
    Supplier,
)
from .serializers import (
    DispensationSerializer,
    DrugInteractionSerializer,
    MedicationBatchSerializer,
    MedicationSerializer,
    StockReturnSerializer,
    StockTransferSerializer,
    SupplierSerializer,
)


class MedicationViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Org-scoped medication catalog.

    - ``GET/POST /``            filters: ``?search=&category=&low_stock=true``
    - ``GET/PATCH/DELETE /<id>/``
    - ``POST /<id>/stock-adjust/``  body ``{quantity, reason}`` — signed delta.
    """

    queryset = Medication.objects.all()
    serializer_class = MedicationSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category", "active", "is_controlled"]
    search_fields = ["name", "generic_name", "code"]
    ordering_fields = ["name", "price", "current_stock", "created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("low_stock") == "true":
            qs = qs.filter(current_stock__lte=F("reorder_level"), active=True)
        return qs

    @action(detail=True, methods=["post"])
    def stock_adjust(self, request, pk=None):
        """Adjust medication stock by a signed delta."""
        medication = self.get_object()
        try:
            quantity = int(request.data.get("quantity"))
        except (TypeError, ValueError):
            raise ValidationError({"quantity": "A signed integer quantity is required."})
        reason = str(request.data.get("reason", "")).strip()
        new_stock = medication.current_stock + quantity
        if new_stock < 0:
            raise ValidationError(
                {"quantity": f"Cannot reduce below zero (current stock {medication.current_stock})."}
            )
        medication.current_stock = new_stock
        medication.save(update_fields=["current_stock", "updated_at"])
        return Response(
            {
                "id": medication.id,
                "current_stock": medication.current_stock,
                "delta": quantity,
                "reason": reason,
            }
        )


class DrugInteractionViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Org-scoped drug interaction catalog (``?severity=&medication_a=&medication_b=``)."""

    queryset = DrugInteraction.objects.all()
    serializer_class = DrugInteractionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["severity", "medication_a", "medication_b"]


class SupplierViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Org-scoped suppliers (``?search=&is_active=``)."""

    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["is_active"]
    search_fields = ["name", "contact_person", "email", "phone"]
    ordering_fields = ["name", "created_at"]


class MedicationBatchViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Org-scoped medication batches.

    Filters: ``?medication=&supplier=&expiring_soon=true&expired=true``
    """

    queryset = MedicationBatch.objects.all()
    serializer_class = MedicationBatchSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["medication", "supplier"]
    ordering_fields = ["expiry_date", "received_date", "quantity", "created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        today = timezone.localdate()
        params = self.request.query_params
        if params.get("expiring_soon") == "true":
            qs = qs.filter(expiry_date__lte=today + timedelta(days=90), expiry_date__gte=today)
        if params.get("expired") == "true":
            qs = qs.filter(expiry_date__lt=today)
        return qs


class DispensationViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Prescription dispensations.

    ``POST /`` body ``{prescription_id, items, notes}`` — validates stock and
    returns 400 on shortage; on success decrements batch + medication stock and
    advances the prescription status to DISPENSED / PARTIALLY_DISPENSED.
    """

    queryset = Dispensation.objects.all()
    serializer_class = DispensationSerializer
    http_method_names = ["get", "post", "head", "options"]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["prescription", "status", "dispensed_by"]
    ordering_fields = ["dispensed_at", "created_at"]


class StockTransferViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Inter-branch stock transfers.

    - ``POST /<id>/complete/`` — validates availability of every item batch and
      records the completion (batches are org-wide per the data model, so the
      transfer record itself represents the branch movement).
    - ``POST /<id>/cancel/``   — cancels a pending transfer.
    """

    queryset = StockTransfer.objects.all()
    serializer_class = StockTransferSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["status", "from_branch", "to_branch"]
    ordering_fields = ["created_at", "completed_at"]

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status != StockTransfer.Status.PENDING:
            raise ValidationError({"detail": "Only pending transfers can be completed."})
        with transaction.atomic():
            for item in transfer.items or []:
                batch = MedicationBatch.objects.select_for_update().filter(
                    pk=item.get("batch_id")
                ).first()
                if batch is None:
                    raise ValidationError(
                        {"detail": f"Batch {item.get('batch_id')} no longer exists."}
                    )
                try:
                    quantity = int(item.get("quantity"))
                except (TypeError, ValueError):
                    raise ValidationError({"detail": "Invalid quantity in transfer items."})
                if quantity <= 0 or batch.quantity < quantity:
                    raise ValidationError(
                        {"detail": f"Insufficient stock in batch {batch.batch_no} "
                                   f"(available {batch.quantity}, requested {quantity})."}
                    )
            transfer.status = StockTransfer.Status.COMPLETED
            transfer.completed_at = timezone.now()
            transfer.completed_by = request.user
            transfer.save(update_fields=["status", "completed_at", "completed_by", "updated_at"])
        return Response(StockTransferSerializer(transfer, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status != StockTransfer.Status.PENDING:
            raise ValidationError({"detail": "Only pending transfers can be cancelled."})
        transfer.status = StockTransfer.Status.CANCELLED
        transfer.save(update_fields=["status", "updated_at"])
        return Response(StockTransferSerializer(transfer, context=self.get_serializer_context()).data)


class StockReturnViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Stock returns; ``POST /`` adds the quantity back to batch + medication stock."""

    queryset = StockReturn.objects.all()
    serializer_class = StockReturnSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["batch", "returned_by"]
    ordering_fields = ["returned_at", "created_at"]


class AlertsViewSet(TenantViewSetMixin, viewsets.ViewSet):
    """Pharmacy stock alerts.

    ``GET /alerts/`` → ``{low_stock: [medications], expiring: [batches], expired: [batches]}``
    """

    def list(self, request):
        today = timezone.localdate()
        low_stock = list(
            Medication.objects.all().filter(
                active=True, current_stock__lte=F("reorder_level")
            ).order_by("name")[:50]
        )
        expiring = list(
            MedicationBatch.objects.all().filter(
                expiry_date__lte=today + timedelta(days=90), expiry_date__gte=today
            ).order_by("expiry_date")[:50]
        )
        expired = list(
            MedicationBatch.objects.all().filter(
                expiry_date__lt=today
            ).order_by("expiry_date")[:50]
        )
        med_context = {"request": request}
        batch_context = {"request": request}
        return Response(
            {
                "low_stock": MedicationSerializer(low_stock, many=True, context=med_context).data,
                "expiring": MedicationBatchSerializer(expiring, many=True, context=batch_context).data,
                "expired": MedicationBatchSerializer(expired, many=True, context=batch_context).data,
            }
        )
