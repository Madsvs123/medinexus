"""Patients API routes.

config/urls.py includes this module at "patients/", so the patterns here are
matched against the remainder of the path (empty for the collection root).
"""
from django.urls import path

from .views import (
    ConsentRecordViewSet,
    EmergencyContactViewSet,
    PatientAllergyViewSet,
    PatientConditionViewSet,
    PatientDocumentViewSet,
    PatientViewSet,
)

LIST_ACTIONS = {"get": "list", "post": "create"}
DETAIL_ACTIONS = {
    "get": "retrieve",
    "put": "update",
    "patch": "partial_update",
    "delete": "destroy",
}

urlpatterns = [
    path("", PatientViewSet.as_view(LIST_ACTIONS), name="patient-list"),
    path("<int:pk>/", PatientViewSet.as_view(DETAIL_ACTIONS), name="patient-detail"),
    path("<int:pk>/timeline/", PatientViewSet.as_view({"get": "timeline"}), name="patient-timeline"),
    path(
        "<int:patient_pk>/allergies/",
        PatientAllergyViewSet.as_view(LIST_ACTIONS),
        name="patient-allergies-list",
    ),
    path(
        "<int:patient_pk>/allergies/<int:pk>/",
        PatientAllergyViewSet.as_view(DETAIL_ACTIONS),
        name="patient-allergies-detail",
    ),
    path(
        "<int:patient_pk>/conditions/",
        PatientConditionViewSet.as_view(LIST_ACTIONS),
        name="patient-conditions-list",
    ),
    path(
        "<int:patient_pk>/conditions/<int:pk>/",
        PatientConditionViewSet.as_view(DETAIL_ACTIONS),
        name="patient-conditions-detail",
    ),
    path(
        "<int:patient_pk>/contacts/",
        EmergencyContactViewSet.as_view(LIST_ACTIONS),
        name="patient-contacts-list",
    ),
    path(
        "<int:patient_pk>/contacts/<int:pk>/",
        EmergencyContactViewSet.as_view(DETAIL_ACTIONS),
        name="patient-contacts-detail",
    ),
    path(
        "<int:patient_pk>/documents/",
        PatientDocumentViewSet.as_view(LIST_ACTIONS),
        name="patient-documents-list",
    ),
    path(
        "<int:patient_pk>/documents/<int:pk>/",
        PatientDocumentViewSet.as_view(DETAIL_ACTIONS),
        name="patient-documents-detail",
    ),
    path(
        "<int:patient_pk>/consents/",
        ConsentRecordViewSet.as_view(LIST_ACTIONS),
        name="patient-consents-list",
    ),
    path(
        "<int:patient_pk>/consents/<int:pk>/",
        ConsentRecordViewSet.as_view(DETAIL_ACTIONS),
        name="patient-consents-detail",
    ),
]
