import os
from urllib.parse import quote

from django.http import FileResponse
from rest_framework import viewsets
from rest_framework.decorators import action

from apps.core.permissions import HasOrgAccess, IsStaffRole
from apps.core.views import TenantViewSetMixin

from .models import Document
from .serializers import DocumentSerializer


class DocumentViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Staff document management.

    - ``GET /documents/``       filters ``?patient=&category=&search=``
    - ``POST /documents/``      multipart upload (``file``, ``title``,
      ``category``, optional ``patient``/``tags``/``notes``)
    - ``GET/PATCH/DELETE /documents/<id>/``
    - ``GET /documents/<id>/download/``  streams the stored file
    """

    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [HasOrgAccess, IsStaffRole]
    filterset_fields = ["category", "patient"]

    def get_queryset(self):
        return DocumentSerializer.apply_filters(super().get_queryset(), self.request.query_params)

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        document = self.get_object()
        filename = os.path.basename(document.file.name) or f"document-{document.pk}"
        response = FileResponse(
            document.file.open("rb"), as_attachment=True, filename=filename
        )
        response["Content-Disposition"] = (
            f'attachment; filename="{quote(filename)}"'
        )
        return response
