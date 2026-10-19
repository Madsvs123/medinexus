"""Lab order API routes (clinical workflow). config/urls.py includes this module at "lab-orders/"."""
from django.urls import path

from .views import LabOrderViewSet

LIST_ACTIONS = {"get": "list", "post": "create"}
DETAIL_ACTIONS = {
    "get": "retrieve",
    "put": "update",
    "delete": "destroy",
}

urlpatterns = [
    path("", LabOrderViewSet.as_view(LIST_ACTIONS), name="lab-order-list"),
    path("<int:pk>/", LabOrderViewSet.as_view(DETAIL_ACTIONS), name="lab-order-detail"),
]
