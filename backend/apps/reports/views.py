from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import HasOrgAccess, HasRole, IsStaffRole
from apps.core.views import TenantViewSetMixin

from . import analytics
from .models import Report
from .serializers import ReportSerializer
from .tasks import generate_report


class AnalyticsViewSet(viewsets.GenericViewSet):
    """Read-only analytics + role dashboards (tenant-scoped)."""

    permission_classes = [HasOrgAccess]

    def _org(self):
        return self.request.user.organization

    def get_permissions(self):
        if self.action == "patient_dashboard":
            return [HasOrgAccess(), HasRole("PATIENT")]
        if self.action in ("appointments", "revenue", "clinical", "laboratory", "pharmacy",
                           "admin_dashboard", "doctor_dashboard", "receptionist_dashboard"):
            return [HasOrgAccess(), IsStaffRole()]
        return super().get_permissions()

    def _params(self):
        qp = self.request.query_params
        return qp.get("from"), qp.get("to")

    @action(detail=False, methods=["get"])
    def appointments(self, request):
        frm, to = self._params()
        data = analytics.appointment_analytics(
            self._org(),
            from_date=frm,
            to_date=to,
            department=request.query_params.get("department"),
            doctor=request.query_params.get("doctor"),
        )
        return Response(data)

    @action(detail=False, methods=["get"])
    def revenue(self, request):
        frm, to = self._params()
        return Response(analytics.revenue_analytics(self._org(), from_date=frm, to_date=to))

    @action(detail=False, methods=["get"])
    def clinical(self, request):
        frm, to = self._params()
        return Response(analytics.clinical_analytics(self._org(), from_date=frm, to_date=to))

    @action(detail=False, methods=["get"])
    def laboratory(self, request):
        frm, to = self._params()
        return Response(analytics.laboratory_analytics(self._org(), from_date=frm, to_date=to))

    @action(detail=False, methods=["get"])
    def pharmacy(self, request):
        frm, to = self._params()
        return Response(analytics.pharmacy_analytics(self._org(), from_date=frm, to_date=to))

    @action(detail=False, methods=["get"], url_path="dashboards/admin")
    def admin_dashboard(self, request):
        return Response(analytics.admin_dashboard(self._org()))

    @action(detail=False, methods=["get"], url_path="dashboards/doctor")
    def doctor_dashboard(self, request):
        return Response(analytics.doctor_dashboard(request.user, self._org()))

    @action(detail=False, methods=["get"], url_path="dashboards/receptionist")
    def receptionist_dashboard(self, request):
        return Response(analytics.receptionist_dashboard(self._org()))

    @action(detail=False, methods=["get"], url_path="dashboards/patient")
    def patient_dashboard(self, request):
        profile = getattr(request.user, "patient_profile", None)
        if profile is None:
            return Response(
                {"detail": "No patient profile linked to this account."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(analytics.patient_dashboard(profile, self._org()))


class ReportViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Async report generation.

    - ``GET/POST /reports/generated/``  (``?kind=``, POST body
      ``{kind, title?, params?}``) — POST enqueues the Celery job
    - ``GET /reports/generated/<id>/``  poll ``status`` (PENDING/READY/FAILED)
    - ``GET /reports/generated/<id>/download/``  XLSX file when READY
    """

    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [HasOrgAccess, IsStaffRole]
    filterset_fields = ["kind", "status"]

    def perform_create(self, serializer):
        report = serializer.save(generated_by=self.request.user, status="PENDING")
        generate_report.delay(report.id)

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        report = self.get_object()
        if report.status != "READY" or not report.file:
            return Response(
                {"detail": "Report is not ready yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from django.http import FileResponse

        return FileResponse(
            report.file.open("rb"),
            as_attachment=True,
            filename=f"report_{report.kind}_{report.id}.xlsx",
        )
