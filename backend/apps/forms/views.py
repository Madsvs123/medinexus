from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import HasOrgAccess, IsStaffRole
from apps.core.views import TenantViewSetMixin

from .models import FormSubmission, FormTemplate
from .serializers import FormSubmissionSerializer, FormTemplateSerializer


class FormTemplateViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Staff form template management.

    - ``GET /forms/templates/``   filter ``?category=``
    - ``GET/PATCH /forms/templates/<id>/``  returns the schema
    - ``POST /forms/templates/<id>/duplicate/``  clones the template
    """

    queryset = FormTemplate.objects.all()
    serializer_class = FormTemplateSerializer
    permission_classes = [HasOrgAccess, IsStaffRole]
    filterset_fields = ["category", "active"]

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        source = self.get_object()
        clone = FormTemplate.objects.create(
            organization=source.organization,
            created_by=request.user,
            name=f"{source.name} (copy)",
            category=source.category,
            schema=source.schema,
            active=False,
        )
        return Response(
            FormTemplateSerializer(clone, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )


class FormSubmissionViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Staff form submission management.

    - ``GET/POST /forms/submissions/``  filters ``?template=&patient=&status=``
    - ``GET/PATCH /forms/submissions/<id>/``
    - ``POST /forms/submissions/<id>/submit/``
    - ``POST /forms/submissions/<id>/approve/``
    - ``POST /forms/submissions/<id>/reject/``  body ``{reason}``
    """

    queryset = FormSubmission.objects.all()
    serializer_class = FormSubmissionSerializer
    permission_classes = [HasOrgAccess, IsStaffRole]
    filterset_fields = ["template", "patient", "status"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        submission = self.get_object()
        if submission.status not in ("DRAFT", "REJECTED"):
            return Response(
                {"detail": f"Cannot submit a {submission.status.lower()} form."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        submission.status = "SUBMITTED"
        submission.submitted_by = request.user
        submission.submitted_at = timezone.now()
        submission.save(update_fields=["status", "submitted_by", "submitted_at", "updated_at"])
        return Response(self.get_serializer(submission).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        submission = self.get_object()
        if submission.status != "SUBMITTED":
            return Response(
                {"detail": "Only submitted forms can be approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        submission.status = "APPROVED"
        submission.reviewed_by = request.user
        submission.reviewed_at = timezone.now()
        submission.save(
            update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"]
        )
        return Response(self.get_serializer(submission).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        submission = self.get_object()
        if submission.status != "SUBMITTED":
            return Response(
                {"detail": "Only submitted forms can be rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reason = (request.data or {}).get("reason")
        if not reason:
            return Response(
                {"reason": "A rejection reason is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        submission.status = "REJECTED"
        submission.reviewed_by = request.user
        submission.reviewed_at = timezone.now()
        submission.rejection_reason = str(reason)
        submission.save(
            update_fields=[
                "status",
                "reviewed_by",
                "reviewed_at",
                "rejection_reason",
                "updated_at",
            ]
        )
        return Response(self.get_serializer(submission).data)
