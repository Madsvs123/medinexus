from rest_framework import viewsets

from apps.core.permissions import IsOrgAdmin
from apps.core.views import TenantReadOnlyMixin

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(TenantReadOnlyMixin, viewsets.ReadOnlyModelViewSet):
    """Org-admin read-only audit trail.

    - ``GET /logs/``         filters: ``?actor=<id>&action=&resource_type=
      &from=YYYY-MM-DD&to=YYYY-MM-DD``, newest first, paginated
    - ``GET /logs/<id>/``    single entry
    """

    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsOrgAdmin]
    filterset_fields = ["actor", "action", "resource_type"]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        if params.get("from"):
            qs = qs.filter(created_at__date__gte=params["from"])
        if params.get("to"):
            qs = qs.filter(created_at__date__lte=params["to"])
        return qs
