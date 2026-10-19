"""Prescriptions API routes. config/urls.py includes this module at "prescriptions/"."""
from django.urls import path

from .views import PrescriptionViewSet

LIST_ACTIONS = {"get": "list", "post": "create"}
DETAIL_ACTIONS = {
    "get": "retrieve",
    "put": "update",
    "patch": "partial_update",
    "delete": "destroy",
}

urlpatterns = [
    path("", PrescriptionViewSet.as_view(LIST_ACTIONS), name="prescription-list"),
    path("<int:pk>/", PrescriptionViewSet.as_view(DETAIL_ACTIONS), name="prescription-detail"),
    path("<int:pk>/cancel/", PrescriptionViewSet.as_view({"post": "cancel"}), name="prescription-cancel"),
]
