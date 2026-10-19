"""Discharge summaries API routes.

config/urls.py includes this module at "discharge-summaries/".
"""
from django.urls import path

from .views import DischargeSummaryViewSet

LIST_ACTIONS = {"get": "list", "post": "create"}
DETAIL_ACTIONS = {
    "get": "retrieve",
    "put": "update",
    "patch": "partial_update",
    "delete": "destroy",
}

urlpatterns = [
    path("", DischargeSummaryViewSet.as_view(LIST_ACTIONS), name="discharge-summary-list"),
    path("<int:pk>/", DischargeSummaryViewSet.as_view(DETAIL_ACTIONS), name="discharge-summary-detail"),
    path(
        "<int:pk>/finalize/",
        DischargeSummaryViewSet.as_view({"post": "finalize"}),
        name="discharge-summary-finalize",
    ),
]
