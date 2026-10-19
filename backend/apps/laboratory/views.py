from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.core.views import TenantViewSetMixin
from apps.notifications.services import notify

from .models import LabOrder, LabReport, LabResult, LabSample, LabTest
from .serializers import (
    LabOrderSerializer,
    LabReportSerializer,
    LabResultSerializer,
    LabSampleSerializer,
    LabTestSerializer,
)
from .services import build_order_pdf


class LabTestViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Lab test catalog (``?search=&category=&sample_type=&active=``)."""

    queryset = LabTest.objects.all()
    serializer_class = LabTestSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category", "sample_type", "active"]
    search_fields = ["name", "code"]
    ordering_fields = ["name", "category", "price", "created_at"]


class LabOrderViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Lab orders.

    - ``GET/POST /``            filters: ``?patient=&status=&date=``
    - ``GET/PATCH /<id>/``
    - ``POST /<id>/collect/``    stamps collection on all samples (batch)
    - ``POST /<id>/cancel/``
    """

    queryset = LabOrder.objects.all()
    serializer_class = LabOrderSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["patient", "status", "priority", "encounter"]
    ordering_fields = ["ordered_at", "created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        date_param = self.request.query_params.get("date")
        if date_param:
            qs = qs.filter(ordered_at__date=date_param)
        return qs

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=["post"])
    def collect(self, request, pk=None):
        """Mark all samples of the order as collected (batch)."""
        order = self.get_object()
        if order.status == LabOrder.Status.CANCELLED:
            raise ValidationError({"detail": "A cancelled order cannot be collected."})
        samples = order.samples.all()
        if not samples.exists():
            raise ValidationError({"detail": "This order has no samples."})
        for sample in samples:
            if sample.status != LabSample.Status.REJECTED:
                sample.status = LabSample.Status.COLLECTED
                sample.collected_by = request.user
                sample.collected_at = timezone.now()
                sample.save(update_fields=["status", "collected_by", "collected_at", "updated_at"])
        order.status = LabOrder.Status.SAMPLES_COLLECTED
        order.save(update_fields=["status", "updated_at"])
        return Response(LabOrderSerializer(order, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status not in (
            LabOrder.Status.ORDERED,
            LabOrder.Status.SAMPLES_COLLECTED,
        ):
            raise ValidationError({"detail": "Only ordered / collected orders can be cancelled."})
        order.status = LabOrder.Status.CANCELLED
        order.save(update_fields=["status", "updated_at"])
        return Response(LabOrderSerializer(order, context=self.get_serializer_context()).data)


class LabSampleViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Lab samples (``?status=&order=``).

    ``PATCH /<id>/`` with ``status`` (RECEIVED / REJECTED) + ``rejection_reason``
    drives the receive / reject workflow.
    """

    queryset = LabSample.objects.all()
    serializer_class = LabSampleSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["status", "order", "test"]
    ordering_fields = ["created_at", "collected_at"]


class LabResultViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Lab results.

    - ``GET/POST /``            filters: ``?order=&status=&flag=``
    - ``PATCH /<id>/``          flag auto-computed from the reference range
    - ``POST /<id>/approve/``   APPROVED; CRITICAL → urgent notification
    - ``POST /<id>/reject/``    ``{reason}``
    - ``GET /workqueue/``       samples awaiting results entry (by category)
    """

    queryset = LabResult.objects.all()
    serializer_class = LabResultSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["order", "status", "flag", "test"]
    ordering_fields = ["created_at", "reviewed_at"]

    def perform_create(self, serializer):
        result = serializer.save()
        order = result.order
        if order.status in (
            LabOrder.Status.ORDERED,
            LabOrder.Status.SAMPLES_COLLECTED,
        ):
            order.status = LabOrder.Status.IN_PROGRESS
            order.save(update_fields=["status", "updated_at"])

    def _complete_order_if_done(self, order):
        total = order.results.count()
        if total and order.results.filter(status=LabResult.Status.APPROVED).count() == total:
            order.status = LabOrder.Status.COMPLETED
            order.result_reported_at = timezone.now()
            order.save(update_fields=["status", "result_reported_at", "updated_at"])

    def _notify_critical(self, result):
        order = result.order
        body = (
            f"CRITICAL result: {result.test.name} = {result.value} "
            f"({result.get_flag_display()}) for patient {order.patient}."
        )
        data = {
            "order_id": order.id,
            "result_id": result.id,
            "test": result.test.name,
            "value": result.value,
            "flag": result.flag,
            "priority": order.priority,
        }
        if order.ordered_by_id:
            notify(
                recipient=order.ordered_by,
                type="LAB",
                title="Critical lab result",
                body=body,
                data=data,
                organization=order.organization,
            )
        User = get_user_model()
        admins = User.objects.filter(
            organization=order.organization, role="ADMIN", is_active=True
        )
        for admin in admins:
            notify(
                recipient=admin,
                type="LAB",
                title="Critical lab result",
                body=body,
                data=data,
                organization=order.organization,
            )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        result = self.get_object()
        if result.status == LabResult.Status.REJECTED:
            raise ValidationError({"detail": "A rejected result cannot be approved."})
        result.status = LabResult.Status.APPROVED
        result.reviewed_by = request.user
        result.reviewed_at = timezone.now()
        result.save(update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"])
        if result.flag == LabResult.Flag.CRITICAL:
            self._notify_critical(result)
        self._complete_order_if_done(result.order)
        return Response(LabResultSerializer(result, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        result = self.get_object()
        reason = str(request.data.get("reason", "")).strip()
        if not reason:
            raise ValidationError({"reason": "A rejection reason is required."})
        result.status = LabResult.Status.REJECTED
        result.reviewed_by = request.user
        result.reviewed_at = timezone.now()
        result.notes = f"{result.notes}\nRejected: {reason}".strip()
        result.save(update_fields=["status", "reviewed_by", "reviewed_at", "notes", "updated_at"])
        return Response(LabResultSerializer(result, context=self.get_serializer_context()).data)

    @action(detail=False, methods=["get"])
    def workqueue(self, request):
        """Pending work: COLLECTED samples awaiting results entry, grouped by category."""
        samples = (
            LabSample.objects.all()
            .filter(status=LabSample.Status.COLLECTED)
            .select_related("test", "order", "order__patient")
            .order_by("test__category", "order__ordered_at")
        )
        groups = []
        for category, group in samples.order_by("test__category").values(
            "test__category"
        ).annotate(count=Count("id")):
            items = [
                {
                    "sample_id": s.sample_id,
                    "sample_pk": s.id,
                    "test_id": s.test_id,
                    "test_name": s.test.name,
                    "test_code": s.test.code,
                    "category": s.test.category,
                    "order_id": s.order_id,
                    "patient_id": s.order.patient_id,
                    "patient_name": s.order.patient.full_name,
                    "priority": s.order.priority,
                    "ordered_at": s.order.ordered_at.isoformat(),
                }
                for s in samples.filter(test__category=category)
            ]
            groups.append({"category": category, "count": len(items), "items": items})
        return Response({"groups": groups, "total": samples.count()})


class LabReportViewSet(TenantViewSetMixin, viewsets.ReadOnlyModelViewSet):
    """Generated lab reports.

    - ``GET /``                     filters: ``?order=``
    - ``GET /<order_id>/pdf/``      generates (or reuses) the branded PDF.
    """

    queryset = LabReport.objects.all()
    serializer_class = LabReportSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["order"]

    @action(detail=False, methods=["get"], url_path=r"(?P<order_id>[0-9]+)/pdf")
    def pdf(self, request, order_id=None):
        from django.http import FileResponse

        order = LabOrder.objects.all().filter(pk=order_id).first()
        if order is None:
            raise ValidationError({"detail": "Order not found."})
        report = build_order_pdf(order, generated_by=request.user)
        return FileResponse(
            report.file.open("rb"),
            as_attachment=False,
            filename=f"lab_report_order_{order.pk}.pdf",
            content_type="application/pdf",
        )
