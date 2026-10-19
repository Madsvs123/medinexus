from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.core.views import TenantViewSetMixin
from apps.notifications.services import notify

from .models import RadiologyOrder, RadiologyReport
from .serializers import RadiologyOrderSerializer, RadiologyReportSerializer


class RadiologyOrderViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Radiology orders.

    - ``GET/POST /``            filters: ``?patient=&status=&modality=&priority=``
    - ``GET/PATCH /<id>/``
    - ``POST /<id>/start/``     ORDERED → IN_PROGRESS
    - ``POST /<id>/complete/``  IN_PROGRESS → COMPLETED
    - ``POST /<id>/cancel/``
    """

    queryset = RadiologyOrder.objects.all()
    serializer_class = RadiologyOrderSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["patient", "status", "modality", "priority", "encounter"]
    search_fields = ["body_part", "clinical_indication", "notes"]
    ordering_fields = ["ordered_at", "created_at"]

    def perform_create(self, serializer):
        serializer.save(ordered_by=self.request.user)

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        order = self.get_object()
        if order.status != RadiologyOrder.Status.ORDERED:
            raise ValidationError({"detail": "Only ordered exams can be started."})
        order.status = RadiologyOrder.Status.IN_PROGRESS
        order.save(update_fields=["status", "updated_at"])
        return Response(RadiologyOrderSerializer(order, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        order = self.get_object()
        if order.status != RadiologyOrder.Status.IN_PROGRESS:
            raise ValidationError({"detail": "Only in-progress exams can be completed."})
        order.status = RadiologyOrder.Status.COMPLETED
        order.save(update_fields=["status", "updated_at"])
        return Response(RadiologyOrderSerializer(order, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status == RadiologyOrder.Status.COMPLETED:
            raise ValidationError({"detail": "A completed exam cannot be cancelled."})
        order.status = RadiologyOrder.Status.CANCELLED
        order.save(update_fields=["status", "updated_at"])
        return Response(RadiologyOrderSerializer(order, context=self.get_serializer_context()).data)


class RadiologyReportViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Radiology reports.

    - ``GET/POST /``            filters: ``?order=`` (one report per order)
    - ``GET/PATCH /<id>/``
    - ``POST /<id>/finalize/``  status FINAL → notifies the ordering doctor
    """

    queryset = RadiologyReport.objects.all()
    serializer_class = RadiologyReportSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["order", "status"]
    ordering_fields = ["created_at", "finalized_at"]

    def perform_create(self, serializer):
        serializer.save(radiologist=self.request.user)

    @action(detail=True, methods=["post"])
    def finalize(self, request, pk=None):
        report = self.get_object()
        if report.status == RadiologyReport.Status.FINAL:
            raise ValidationError({"detail": "This report is already final."})
        report.status = RadiologyReport.Status.FINAL
        report.finalized_at = timezone.now()
        report.save(update_fields=["status", "finalized_at", "updated_at"])

        order = report.order
        body = (
            f"Radiology report finalized for {order.get_modality_display()} "
            f"({order.body_part or 'n/a'}) — patient {order.patient}."
        )
        data = {
            "order_id": order.id,
            "report_id": report.id,
            "modality": order.modality,
            "body_part": order.body_part,
            "status": report.status,
        }
        if order.ordered_by_id:
            notify(
                recipient=order.ordered_by,
                type="RADIOLOGY",
                title="Radiology report finalized",
                body=body,
                data=data,
                organization=order.organization,
            )
        return Response(RadiologyReportSerializer(report, context=self.get_serializer_context()).data)
