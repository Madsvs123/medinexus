"""Vital signs API routes. config/urls.py includes this module at "vitals/"."""
from django.urls import path

from .views import VitalSignsViewSet

LIST_ACTIONS = {"get": "list", "post": "create"}
DETAIL_ACTIONS = {
    "get": "retrieve",
    "put": "update",
    "patch": "partial_update",
    "delete": "destroy",
}

urlpatterns = [
    path("", VitalSignsViewSet.as_view(LIST_ACTIONS), name="vitals-list"),
    path("<int:pk>/", VitalSignsViewSet.as_view(DETAIL_ACTIONS), name="vitals-detail"),
]
