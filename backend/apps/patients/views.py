from datetime import datetime

from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import HasOrgAccess, IsStaffRole
from apps.core.views import TenantViewSetMixin

from .models import (
    ConsentRecord,
    EmergencyContact,
    Patient,
    PatientAllergy,
    PatientCondition,
    PatientDocument,
)
from .serializers import (
    ConsentRecordSerializer,
    EmergencyContactSerializer,
    PatientAllergySerializer,
    PatientConditionSerializer,
    PatientDetailSerializer,
    PatientDocumentSerializer,
    PatientListSerializer,
)


class PatientViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Patient.objects.all()
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]
    filterset_fields = ["status"]
    search_fields = ["first_name", "last_name", "mrn", "phone", "email"]

    def get_serializer_class(self):
        if self.action == "list":
            return PatientListSerializer
        return PatientDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(mrn__icontains=search)
                | Q(phone__icontains=search)
                | Q(email__icontains=search)
            )
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        return queryset

    def perform_destroy(self, instance):
        """Soft delete: mark the patient INACTIVE instead of removing the record."""
        instance.status = Patient.STATUS_CHOICES[1][0]  # INACTIVE
        instance.save(update_fields=["status", "updated_at"])

    @action(detail=True, methods=["get"])
    def timeline(self, request, pk=None):
        patient = self.get_object()
        events = []

        def _dt(value):
            """Normalize date, datetime or None to a sortable datetime."""
            if value is None:
                return datetime.min
            if isinstance(value, datetime):
                return value
            return datetime.combine(value, datetime.min.time())

        # Encounters
        try:
            from apps.clinical.models import Encounter

            for encounter in Encounter.objects.filter(patient=patient):
                events.append(
                    {
                        "date": _dt(encounter.started_at),
                        "type": "ENCOUNTER",
                        "title": f"Encounter — {encounter.get_type_display()}",
                        "description": encounter.chief_complaint or "",
                        "ref_id": encounter.id,
                    }
                )
        except ImportError:
            pass

        # Prescriptions
        try:
            from apps.clinical.models import Prescription

            for prescription in Prescription.objects.filter(encounter__patient=patient):
                events.append(
                    {
                        "date": _dt(prescription.created_at),
                        "type": "PRESCRIPTION",
                        "title": f"Prescription — {prescription.medication.name}",
                        "description": f"{prescription.dosage} {prescription.frequency}".strip(),
                        "ref_id": prescription.id,
                    }
                )
        except ImportError:
            pass

        # Admissions
        try:
            from apps.inpatient.models import Admission

            for admission in Admission.objects.filter(patient=patient):
                events.append(
                    {
                        "date": _dt(admission.admitted_at),
                        "type": "ADMISSION",
                        "title": f"Admission — {admission.get_admission_type_display()}",
                        "description": admission.diagnosis_on_admission or "",
                        "ref_id": admission.id,
                    }
                )
        except ImportError:
            pass

        # Approved lab results
        try:
            from apps.laboratory.models import LabResult

            for result in LabResult.objects.filter(
                order__patient=patient, status="APPROVED"
            ).select_related("order", "test"):
                events.append(
                    {
                        "date": _dt(result.reviewed_at or result.order.ordered_at),
                        "type": "LAB_RESULT",
                        "title": f"Lab result — {result.test.name}",
                        "description": f"{result.value} {result.unit} ({result.get_flag_display()})".strip(),
                        "ref_id": result.id,
                    }
                )
        except ImportError:
            pass

        # Final radiology reports
        try:
            from apps.radiology.models import RadiologyReport

            for report in RadiologyReport.objects.filter(
                order__patient=patient, status="FINAL"
            ).select_related("order"):
                events.append(
                    {
                        "date": _dt(report.finalized_at or report.order.ordered_at),
                        "type": "RADIOLOGY",
                        "title": f"Radiology report — {report.order.get_modality_display()} {report.order.body_part}".strip(),
                        "description": report.impression or report.findings or "",
                        "ref_id": report.id,
                    }
                )
        except ImportError:
            pass

        # Invoices
        try:
            from apps.billing.models import Invoice

            for invoice in Invoice.objects.filter(patient=patient):
                events.append(
                    {
                        "date": _dt(invoice.issued_at or invoice.created_at),
                        "type": "INVOICE",
                        "title": f"Invoice {invoice.invoice_number}",
                        "description": f"{invoice.get_status_display()} — total {invoice.total}",
                        "ref_id": invoice.id,
                    }
                )
        except ImportError:
            pass

        # Documents
        for document in patient.documents.all():
            events.append(
                {
                    "date": _dt(document.created_at),
                    "type": "DOCUMENT",
                    "title": document.title,
                    "description": document.get_category_display(),
                    "ref_id": document.id,
                }
            )

        events.sort(key=lambda event: event["date"])
        return Response(events)


class _NestedPatientMixin:
    """Shared logic for patient-scoped nested viewsets."""

    def _patient_id(self):
        patient_id = self.kwargs.get("patient_pk")
        if patient_id:
            return patient_id
        return self.request.data.get("patient")

    def get_queryset(self):
        queryset = super().get_queryset()
        patient_id = self.kwargs.get("patient_pk")
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset

    def perform_create(self, serializer):
        kwargs = {"created_by": self.request.user}
        organization = getattr(self.request.user, "organization", None)
        if organization is not None:
            kwargs["organization"] = organization
        patient_id = self._patient_id()
        if patient_id:
            kwargs["patient_id"] = patient_id
        serializer.save(**kwargs)


class PatientAllergyViewSet(_NestedPatientMixin, TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = PatientAllergy.objects.all()
    serializer_class = PatientAllergySerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]


class PatientConditionViewSet(_NestedPatientMixin, TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = PatientCondition.objects.all()
    serializer_class = PatientConditionSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]


class EmergencyContactViewSet(_NestedPatientMixin, TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = EmergencyContact.objects.all()
    serializer_class = EmergencyContactSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]


class PatientDocumentViewSet(_NestedPatientMixin, TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = PatientDocument.objects.all()
    serializer_class = PatientDocumentSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]

    def perform_create(self, serializer):
        kwargs = {"uploaded_by": self.request.user}
        organization = getattr(self.request.user, "organization", None)
        if organization is not None:
            kwargs["organization"] = organization
        patient_id = self._patient_id()
        if patient_id:
            kwargs["patient_id"] = patient_id
        serializer.save(**kwargs)


class ConsentRecordViewSet(_NestedPatientMixin, TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = ConsentRecord.objects.all()
    serializer_class = ConsentRecordSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]
