"""Encounter API routes. config/urls.py includes this module at "encounters/"."""
from django.urls import path

from .views import EncounterViewSet

LIST_ACTIONS = {"get": "list", "post": "create"}
DETAIL_ACTIONS = {
    "get": "retrieve",
    "put": "update",
    "patch": "partial_update",
    "delete": "destroy",
}

urlpatterns = [
    path("", EncounterViewSet.as_view(LIST_ACTIONS), name="encounter-list"),
    path("<int:pk>/", EncounterViewSet.as_view(DETAIL_ACTIONS), name="encounter-detail"),
    path("<int:pk>/complete/", EncounterViewSet.as_view({"post": "complete"}), name="encounter-complete"),
]
