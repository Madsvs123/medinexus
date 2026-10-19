"""Follow-ups API routes. config/urls.py includes this module at "follow-ups/"."""
from django.urls import path

from .views import FollowUpViewSet

LIST_ACTIONS = {"get": "list", "post": "create"}
DETAIL_ACTIONS = {
    "get": "retrieve",
    "put": "update",
    "patch": "partial_update",
    "delete": "destroy",
}

urlpatterns = [
    path("", FollowUpViewSet.as_view(LIST_ACTIONS), name="follow-up-list"),
    path("<int:pk>/", FollowUpViewSet.as_view(DETAIL_ACTIONS), name="follow-up-detail"),
]
