from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.organizations.views import BranchViewSet, DepartmentViewSet, OrganizationView, SpecialtyViewSet

router = DefaultRouter()
router.register("branches", BranchViewSet, basename="branch")
router.register("departments", DepartmentViewSet, basename="department")
router.register("specialties", SpecialtyViewSet, basename="specialty")

urlpatterns = [
    path("", OrganizationView.as_view({"get": "list"}), name="org-list"),
    path("me/", OrganizationView.as_view({"get": "me", "patch": "me"}), name="org-me"),
    path("", include(router.urls)),
]
