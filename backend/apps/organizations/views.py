from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import HasOrgAccess, IsOrgAdmin, IsStaffRole
from apps.core.views import TenantViewSetMixin
from apps.organizations.models import Branch, Department, Organization, Specialty
from apps.organizations.serializers import (
    BranchSerializer,
    DepartmentSerializer,
    OrganizationSerializer,
    SpecialtySerializer,
)


class OrganizationView(viewsets.GenericViewSet):
    """My organizations + org profile (GET/PATCH me/)."""

    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Organization.objects.filter(is_active=True)
        if user.organization_id:
            return Organization.objects.filter(id=user.organization_id, is_active=True)
        return Organization.objects.none()

    def list(self, request):
        return Response(self.get_serializer(self.get_queryset(), many=True).data)

    @action(detail=False, methods=["get", "patch"])
    def me(self, request):
        org = self.get_queryset().first()
        if org is None:
            return Response({"detail": "No organization associated with your account."}, status=404)
        if request.method == "PATCH":
            if request.user.role != "ADMIN" and not request.user.is_superuser:
                return Response({"detail": "Only org admins can update organization settings."}, status=403)
            serializer = self.get_serializer(org, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(self.get_serializer(org).data)


class TenantOrgCrudMixin(TenantViewSetMixin):
    """Shared read (staff) / write (org admin) behavior for tenant org structures."""

    permission_classes = [IsStaffRole, HasOrgAccess]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsOrgAdmin()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user if self.request.user.is_authenticated else None)


class BranchViewSet(TenantOrgCrudMixin, viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer


class DepartmentViewSet(TenantOrgCrudMixin, viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        branch = self.request.query_params.get("branch")
        if branch:
            qs = qs.filter(branch_id=branch)
        return qs


class SpecialtyViewSet(TenantOrgCrudMixin, viewsets.ModelViewSet):
    queryset = Specialty.objects.all()
    serializer_class = SpecialtySerializer
