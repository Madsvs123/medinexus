"""Diagnoses API routes. config/urls.py includes this module at "diagnoses/"."""
from django.urls import path

from .views import DiagnosisViewSet

LIST_ACTIONS = {"get": "list", "post": "create"}
DETAIL_ACTIONS = {
    "get": "retrieve",
    "put": "update",
    "patch": "partial_update",
    "delete": "destroy",
}

urlpatterns = [
    path("", DiagnosisViewSet.as_view(LIST_ACTIONS), name="diagnosis-list"),
    path("<int:pk>/", DiagnosisViewSet.as_view(DETAIL_ACTIONS), name="diagnosis-detail"),
]
