"""Clinical notes API routes. config/urls.py includes this module at "notes/"."""
from django.urls import path

from .views import ClinicalNoteViewSet

LIST_ACTIONS = {"get": "list", "post": "create"}
DETAIL_ACTIONS = {
    "get": "retrieve",
    "put": "update",
    "patch": "partial_update",
    "delete": "destroy",
}

urlpatterns = [
    path("", ClinicalNoteViewSet.as_view(LIST_ACTIONS), name="note-list"),
    path("<int:pk>/", ClinicalNoteViewSet.as_view(DETAIL_ACTIONS), name="note-detail"),
    path("<int:pk>/sign/", ClinicalNoteViewSet.as_view({"post": "sign"}), name="note-sign"),
]
