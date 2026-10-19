"""Treatment plans API routes. config/urls.py includes this module at "treatment-plans/"."""
from django.urls import path

from .views import TreatmentPlanViewSet

LIST_ACTIONS = {"get": "list", "post": "create"}
DETAIL_ACTIONS = {
    "get": "retrieve",
    "put": "update",
    "patch": "partial_update",
    "delete": "destroy",
}

urlpatterns = [
    path("", TreatmentPlanViewSet.as_view(LIST_ACTIONS), name="treatment-plan-list"),
    path("<int:pk>/", TreatmentPlanViewSet.as_view(DETAIL_ACTIONS), name="treatment-plan-detail"),
]
