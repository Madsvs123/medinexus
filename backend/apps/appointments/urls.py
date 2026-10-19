"""Appointments API routes.

config/urls.py includes this module at "appointments/", so the patterns here are
matched against the remainder of the path.
"""
from django.urls import path

from .views import (
    AppointmentViewSet,
    AvailabilityViewSet,
    QueueViewSet,
    RecurringRuleViewSet,
    RoomViewSet,
)

LIST_ACTIONS = {"get": "list", "post": "create"}
DETAIL_ACTIONS = {
    "get": "retrieve",
    "put": "update",
    "patch": "partial_update",
    "delete": "destroy",
}

urlpatterns = [
    path("", AppointmentViewSet.as_view(LIST_ACTIONS), name="appointment-list"),
    path("<int:pk>/", AppointmentViewSet.as_view(DETAIL_ACTIONS), name="appointment-detail"),
    path("<int:pk>/confirm/", AppointmentViewSet.as_view({"post": "confirm"}), name="appointment-confirm"),
    path("<int:pk>/checkin/", AppointmentViewSet.as_view({"post": "checkin"}), name="appointment-checkin"),
    path("<int:pk>/start/", AppointmentViewSet.as_view({"post": "start"}), name="appointment-start"),
    path("<int:pk>/complete/", AppointmentViewSet.as_view({"post": "complete"}), name="appointment-complete"),
    path("<int:pk>/noshow/", AppointmentViewSet.as_view({"post": "noshow"}), name="appointment-noshow"),
    path("<int:pk>/cancel/", AppointmentViewSet.as_view({"post": "cancel"}), name="appointment-cancel"),
    path("availability/", AvailabilityViewSet.as_view(LIST_ACTIONS), name="availability-list"),
    path("availability/<int:pk>/", AvailabilityViewSet.as_view(DETAIL_ACTIONS), name="availability-detail"),
    path("rooms/", RoomViewSet.as_view(LIST_ACTIONS), name="room-list"),
    path("rooms/<int:pk>/", RoomViewSet.as_view(DETAIL_ACTIONS), name="room-detail"),
    path("recurring/", RecurringRuleViewSet.as_view(LIST_ACTIONS), name="recurring-rule-list"),
    path("recurring/<int:pk>/", RecurringRuleViewSet.as_view(DETAIL_ACTIONS), name="recurring-rule-detail"),
    path("queue/", QueueViewSet.as_view(LIST_ACTIONS), name="queue-list"),
    path("queue/<int:pk>/", QueueViewSet.as_view(DETAIL_ACTIONS), name="queue-detail"),
    path("queue/next/", QueueViewSet.as_view({"post": "next"}), name="queue-next"),
]
