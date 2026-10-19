"""Radiology order API routes (clinical workflow).

config/urls.py includes this module at "radiology-orders/".
"""
from django.urls import path

from .views import RadiologyOrderViewSet

LIST_ACTIONS = {"get": "list", "post": "create"}
DETAIL_ACTIONS = {
    "get": "retrieve",
    "put": "update",
    "delete": "destroy",
}

urlpatterns = [
    path("", RadiologyOrderViewSet.as_view(LIST_ACTIONS), name="radiology-order-list"),
    path("<int:pk>/", RadiologyOrderViewSet.as_view(DETAIL_ACTIONS), name="radiology-order-detail"),
]
