import csv
import io

from django.http import HttpResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import HasOrgAccess, IsOrgAdmin
from apps.core.views import TenantViewSetMixin

from .models import ImportJob, OrganizationSettings
from .serializers import ImportJobSerializer, OrganizationSettingsSerializer
from .tasks import process_import

TEMPLATE_HEADERS = {
    "patients": [
        "mrn", "first_name", "last_name", "date_of_birth", "gender",
        "phone", "email", "address", "city", "nationality",
        "marital_status", "occupation", "status", "notes",
    ],
    "medications": [
        "code", "name", "generic_name", "category", "form", "strength",
        "unit", "price", "reorder_level", "current_stock", "is_controlled", "active",
    ],
    "services": [
        "code", "name", "category", "price", "tax_rate", "active",
    ],
    "tests": [
        "code", "name", "category", "sample_type", "unit",
        "ref_range_low", "ref_range_high", "price", "active",
    ],
}


class OrganizationSettingsViewSet(TenantViewSetMixin, viewsets.GenericViewSet):
    """Org settings singleton.

    - ``GET /configuration/settings/``
    - ``PATCH /configuration/settings/``
    """

    serializer_class = OrganizationSettingsSerializer
    permission_classes = [HasOrgAccess, IsOrgAdmin]

    def _get_or_create(self):
        settings, _ = OrganizationSettings._base_manager.get_or_create(
            organization=self.request.user.organization
        )
        return settings

    def list(self, request):
        return self.retrieve(request)

    def retrieve(self, request, pk=None):
        serializer = self.get_serializer(self._get_or_create())
        return Response(serializer.data)

    def partial_update(self, request, pk=None):
        settings = self._get_or_create()
        serializer = self.get_serializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ImportJobViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Bulk data imports.

    - ``GET /configuration/imports/``   (``?kind=&status=``)
    - ``POST /configuration/imports/``  multipart ``{kind, file}`` — async
      processing starts immediately
    - ``GET /configuration/imports/<id>/``  poll status/errors
    - ``GET /configuration/imports/<id>/download-template/``  CSV headers
    """

    queryset = ImportJob.objects.all()
    serializer_class = ImportJobSerializer
    permission_classes = [HasOrgAccess, IsOrgAdmin]
    filterset_fields = ["kind", "status"]

    def perform_create(self, serializer):
        job = serializer.save(processed_by=self.request.user)
        process_import.delay(job.id)

    @action(detail=True, methods=["get"])
    def download_template(self, request, pk=None):
        job = self.get_object()
        headers = TEMPLATE_HEADERS.get(job.kind, [])
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(headers)
        response = HttpResponse(buffer.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="template_{job.kind}.csv"'
        )
        return response
