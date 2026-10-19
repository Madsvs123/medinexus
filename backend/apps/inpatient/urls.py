"""Inpatient API routes. config/urls.py includes this module at "inpatient/"."""
from django.urls import path

from .views import (
    AdmissionViewSet,
    BedViewSet,
    CarePlanViewSet,
    DischargeViewSet,
    DoctorRoundViewSet,
    InpatientRoomViewSet,
    InpatientStatsViewSet,
    MedicationAdministrationViewSet,
    NursingObservationViewSet,
    PatientTransferViewSet,
    WardViewSet,
)

LIST_ACTIONS = {"get": "list", "post": "create"}
DETAIL_ACTIONS = {
    "get": "retrieve",
    "put": "update",
    "patch": "partial_update",
    "delete": "destroy",
}

urlpatterns = [
    path("wards/", WardViewSet.as_view(LIST_ACTIONS), name="wards-list"),
    path("wards/<int:pk>/", WardViewSet.as_view(DETAIL_ACTIONS), name="wards-detail"),
    path("wards/<int:pk>/rooms/", WardViewSet.as_view({"get": "rooms"}), name="wards-rooms"),
    path("rooms/", InpatientRoomViewSet.as_view(LIST_ACTIONS), name="inpatient-room-list"),
    path("rooms/<int:pk>/", InpatientRoomViewSet.as_view(DETAIL_ACTIONS), name="inpatient-room-detail"),
    path("beds/", BedViewSet.as_view(LIST_ACTIONS), name="bed-list"),
    path("beds/<int:pk>/", BedViewSet.as_view(DETAIL_ACTIONS), name="bed-detail"),
    path("beds/<int:pk>/assign/", BedViewSet.as_view({"post": "assign"}), name="bed-assign"),
    path("beds/<int:pk>/free/", BedViewSet.as_view({"post": "free"}), name="bed-free"),
    path("beds/<int:pk>/maintenance/", BedViewSet.as_view({"post": "maintenance"}), name="bed-maintenance"),
    path("admissions/", AdmissionViewSet.as_view(LIST_ACTIONS), name="admission-list"),
    path("admissions/<int:pk>/", AdmissionViewSet.as_view(DETAIL_ACTIONS), name="admission-detail"),
    path(
        "admissions/<int:pk>/transfer/",
        AdmissionViewSet.as_view({"post": "transfer"}),
        name="admission-transfer",
    ),
    path(
        "admissions/<int:pk>/discharge/",
        AdmissionViewSet.as_view({"post": "discharge"}),
        name="admission-discharge",
    ),
    path("transfers/", PatientTransferViewSet.as_view(LIST_ACTIONS), name="patient-transfer-list"),
    path("transfers/<int:pk>/", PatientTransferViewSet.as_view(DETAIL_ACTIONS), name="patient-transfer-detail"),
    path("observations/", NursingObservationViewSet.as_view(LIST_ACTIONS), name="observation-list"),
    path("observations/<int:pk>/", NursingObservationViewSet.as_view(DETAIL_ACTIONS), name="observation-detail"),
    path(
        "medication-administrations/",
        MedicationAdministrationViewSet.as_view(LIST_ACTIONS),
        name="medication-administration-list",
    ),
    path(
        "medication-administrations/<int:pk>/",
        MedicationAdministrationViewSet.as_view(DETAIL_ACTIONS),
        name="medication-administration-detail",
    ),
    path("rounds/", DoctorRoundViewSet.as_view(LIST_ACTIONS), name="doctor-round-list"),
    path("rounds/<int:pk>/", DoctorRoundViewSet.as_view(DETAIL_ACTIONS), name="doctor-round-detail"),
    path("care-plans/", CarePlanViewSet.as_view(LIST_ACTIONS), name="care-plan-list"),
    path("care-plans/<int:pk>/", CarePlanViewSet.as_view(DETAIL_ACTIONS), name="care-plan-detail"),
    path("discharges/", DischargeViewSet.as_view(LIST_ACTIONS), name="discharge-list"),
    path("discharges/<int:pk>/", DischargeViewSet.as_view(DETAIL_ACTIONS), name="discharge-detail"),
    path(
        "discharges/<int:pk>/finalize/",
        DischargeViewSet.as_view({"post": "finalize"}),
        name="discharge-finalize",
    ),
    path("stats/", InpatientStatsViewSet.as_view({"get": "list"}), name="inpatient-stats"),
]
