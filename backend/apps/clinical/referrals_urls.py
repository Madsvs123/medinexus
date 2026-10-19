"""Referrals API routes. config/urls.py includes this module at "referrals/"."""
from django.urls import path

from .views import ReferralViewSet

LIST_ACTIONS = {"get": "list", "post": "create"}
DETAIL_ACTIONS = {
    "get": "retrieve",
    "put": "update",
    "patch": "partial_update",
    "delete": "destroy",
}

urlpatterns = [
    path("", ReferralViewSet.as_view(LIST_ACTIONS), name="referral-list"),
    path("<int:pk>/", ReferralViewSet.as_view(DETAIL_ACTIONS), name="referral-detail"),
    path("<int:pk>/accept/", ReferralViewSet.as_view({"post": "accept"}), name="referral-accept"),
    path("<int:pk>/decline/", ReferralViewSet.as_view({"post": "decline"}), name="referral-decline"),
]
