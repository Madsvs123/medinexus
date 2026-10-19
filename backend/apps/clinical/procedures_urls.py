"""Procedure records API routes. config/urls.py includes this module at "procedures/"."""
from django.urls import path

from .views import ProcedureRecordViewSet

LIST_ACTIONS = {"get": "list", "post": "create"}
DETAIL_ACTIONS = {
    "get": "retrieve",
    "put": "update",
    "patch": "partial_update",
    "delete": "destroy",
}

urlpatterns = [
    path("", ProcedureRecordViewSet.as_view(LIST_ACTIONS), name="procedure-list"),
    path("<int:pk>/", ProcedureRecordViewSet.as_view(DETAIL_ACTIONS), name="procedure-detail"),
]
