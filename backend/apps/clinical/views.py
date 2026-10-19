from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import HasOrgAccess, IsStaffRole
from apps.core.views import TenantViewSetMixin

from .models import (
    ClinicalNote,
    Diagnosis,
    DischargeSummary,
    Encounter,
    FollowUp,
    Prescription,
    ProcedureRecord,
    Referral,
    TreatmentPlan,
    VitalSigns,
)
from .serializers import (
    ClinicalNoteSerializer,
    DiagnosisSerializer,
    DischargeSummarySerializer,
    EncounterDetailSerializer,
    EncounterListSerializer,
    FollowUpSerializer,
    PrescriptionSerializer,
    ProcedureRecordSerializer,
    ReferralSerializer,
    TreatmentPlanSerializer,
    VitalSignsSerializer,
)


def _inject_tenant_and_creator(serializer, request):
    kwargs = {"created_by": request.user}
    organization = getattr(request.user, "organization", None)
    if organization is not None:
        kwargs["organization"] = organization
    serializer.save(**kwargs)


class EncounterViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Encounter.objects.all()
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]
    filterset_fields = ["patient", "doctor", "department", "status"]

    def get_serializer_class(self):
        if self.action in ("list", "create"):
            return EncounterListSerializer
        return EncounterDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        day = self.request.query_params.get("date")
        if day:
            queryset = queryset.filter(started_at__date=day)
        return queryset.select_related("patient", "doctor", "department")

    def perform_create(self, serializer):
        _inject_tenant_and_creator(serializer, self.request)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        encounter = self.get_object()
        if encounter.status == "COMPLETED":
            return Response({"detail": "Encounter is already completed."}, status=status.HTTP_400_BAD_REQUEST)
        encounter.status = "COMPLETED"
        encounter.ended_at = timezone.now()
        encounter.save(update_fields=["status", "ended_at", "updated_at"])
        return Response(EncounterDetailSerializer(encounter).data)


class _EncounterScopedMixin:
    """Shared filtering for clinical sub-resources (?encounter= and ?patient=)."""

    def get_queryset(self):
        queryset = super().get_queryset()
        encounter_id = self.request.query_params.get("encounter")
        if encounter_id:
            queryset = queryset.filter(encounter_id=encounter_id)
        patient_id = self.request.query_params.get("patient")
        if patient_id:
            queryset = queryset.filter(encounter__patient_id=patient_id)
        return queryset


class VitalSignsViewSet(_EncounterScopedMixin, TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = VitalSigns.objects.all()
    serializer_class = VitalSignsSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]

    def perform_create(self, serializer):
        _inject_tenant_and_creator(serializer, self.request)


class DiagnosisViewSet(_EncounterScopedMixin, TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Diagnosis.objects.all()
    serializer_class = DiagnosisSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]

    def perform_create(self, serializer):
        _inject_tenant_and_creator(serializer, self.request)


class ClinicalNoteViewSet(_EncounterScopedMixin, TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = ClinicalNote.objects.all()
    serializer_class = ClinicalNoteSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=["post"])
    def sign(self, request, pk=None):
        note = self.get_object()
        if note.is_signed:
            return Response({"detail": "Note is already signed."}, status=status.HTTP_400_BAD_REQUEST)
        note.is_signed = True
        note.signed_at = timezone.now()
        note.save(update_fields=["is_signed", "signed_at", "updated_at"])
        return Response(ClinicalNoteSerializer(note).data)


class TreatmentPlanViewSet(_EncounterScopedMixin, TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = TreatmentPlan.objects.all()
    serializer_class = TreatmentPlanSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]

    def perform_create(self, serializer):
        _inject_tenant_and_creator(serializer, self.request)


class PrescriptionViewSet(_EncounterScopedMixin, TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Prescription.objects.all()
    serializer_class = PrescriptionSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]

    def get_queryset(self):
        return super().get_queryset().select_related("medication", "encounter", "encounter__patient")

    def perform_create(self, serializer):
        _inject_tenant_and_creator(serializer, self.request)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        prescription = self.get_object()
        if prescription.status == "CANCELLED":
            return Response({"detail": "Prescription is already cancelled."}, status=status.HTTP_400_BAD_REQUEST)
        prescription.status = "CANCELLED"
        prescription.save(update_fields=["status", "updated_at"])
        return Response(PrescriptionSerializer(prescription).data)


class ProcedureRecordViewSet(_EncounterScopedMixin, TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = ProcedureRecord.objects.all()
    serializer_class = ProcedureRecordSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]

    def perform_create(self, serializer):
        serializer.save(performed_by=self.request.user)


class ReferralViewSet(_EncounterScopedMixin, TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Referral.objects.all()
    serializer_class = ReferralSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]

    def perform_create(self, serializer):
        serializer.save(referring_doctor=self.request.user)

    def _set_status(self, request, pk, new_status):
        referral = self.get_object()
        referral.status = new_status
        referral.save(update_fields=["status", "updated_at"])
        return Response(ReferralSerializer(referral).data)

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        return self._set_status(request, pk, "ACCEPTED")

    @action(detail=True, methods=["post"])
    def decline(self, request, pk=None):
        return self._set_status(request, pk, "DECLINED")


class FollowUpViewSet(_EncounterScopedMixin, TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = FollowUp.objects.all()
    serializer_class = FollowUpSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]

    def perform_create(self, serializer):
        _inject_tenant_and_creator(serializer, self.request)


class DischargeSummaryViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = DischargeSummary.objects.all()
    serializer_class = DischargeSummarySerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]
    filterset_fields = ["status"]

    def get_queryset(self):
        queryset = super().get_queryset()
        encounter_id = self.request.query_params.get("encounter")
        if encounter_id:
            queryset = queryset.filter(encounter_id=encounter_id)
        patient_id = self.request.query_params.get("patient")
        if patient_id:
            queryset = queryset.filter(encounter__patient_id=patient_id)
        admission_id = self.request.query_params.get("admission")
        if admission_id:
            queryset = queryset.filter(admission_id=admission_id)
        return queryset

    def perform_create(self, serializer):
        _inject_tenant_and_creator(serializer, self.request)

    @action(detail=True, methods=["post"])
    def finalize(self, request, pk=None):
        summary = self.get_object()
        if summary.status == "FINAL":
            return Response({"detail": "Summary is already final."}, status=status.HTTP_400_BAD_REQUEST)
        summary.status = "FINAL"
        summary.signed_by = request.user
        summary.signed_at = timezone.now()
        summary.save(update_fields=["status", "signed_by", "signed_at", "updated_at"])
        return Response(DischargeSummarySerializer(summary).data)


class LabOrderViewSet(TenantViewSetMixin, viewsets.GenericViewSet):
    """Creates laboratory.LabOrder records from the clinical workflow."""

    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]

    def get_queryset(self):
        from apps.laboratory.models import LabOrder

        queryset = LabOrder.objects.all().select_related("patient", "encounter", "ordered_by")
        patient_id = self.request.query_params.get("patient")
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        encounter_id = self.request.query_params.get("encounter")
        if encounter_id:
            queryset = queryset.filter(encounter_id=encounter_id)
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        day = self.request.query_params.get("date")
        if day:
            queryset = queryset.filter(ordered_at__date=day)
        return queryset

    def _payload(self, order):
        return {
            "id": order.id,
            "patient": order.patient_id,
            "patient_name": order.patient.full_name,
            "encounter": order.encounter_id,
            "priority": order.priority,
            "status": order.status,
            "ordered_by": order.ordered_by_id,
            "ordered_by_name": order.ordered_by.get_full_name() if order.ordered_by else None,
            "ordered_at": order.ordered_at,
            "notes": order.notes,
            "result_reported_at": order.result_reported_at,
            "tests": [
                {"id": test.id, "name": test.name, "code": test.code}
                for test in order.tests.all()
            ],
        }

    def list(self, request):
        queryset = self.get_queryset()
        from apps.core.pagination import StandardPagination

        page = StandardPagination().paginate_queryset(queryset, request)
        payload = [self._payload(order) for order in (page if page is not None else queryset)]
        if page is not None:
            return StandardPagination().get_paginated_response(payload)
        return Response(payload)

    def retrieve(self, request, pk=None):
        order = self.get_queryset().filter(pk=pk).first()
        if order is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(self._payload(order))

    def create(self, request):
        data = request.data
        patient_id = data.get("patient")
        if not patient_id:
            return Response({"patient": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)
        from apps.laboratory.models import LabOrder

        order = LabOrder.objects.create(
            patient_id=patient_id,
            encounter_id=data.get("encounter") or None,
            priority=(data.get("priority") or "ROUTINE").upper(),
            ordered_by=request.user,
            notes=data.get("notes", ""),
            created_by=request.user,
        )
        tests = data.get("tests") or []
        if isinstance(tests, (list, tuple)) and tests:
            order.tests.set(tests)
        order.refresh_from_db()
        return Response(self._payload(order), status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        order = self.get_queryset().filter(pk=pk).first()
        if order is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if "priority" in request.data:
            order.priority = request.data["priority"].upper()
        if "notes" in request.data:
            order.notes = request.data["notes"]
        order.save()
        return Response(self._payload(order))

    def destroy(self, request, pk=None):
        order = self.get_queryset().filter(pk=pk).first()
        if order is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        order.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RadiologyOrderViewSet(TenantViewSetMixin, viewsets.GenericViewSet):
    """Creates radiology.RadiologyOrder records from the clinical workflow."""

    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]

    def get_queryset(self):
        from apps.radiology.models import RadiologyOrder

        queryset = RadiologyOrder.objects.all().select_related("patient", "encounter", "ordered_by")
        patient_id = self.request.query_params.get("patient")
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        encounter_id = self.request.query_params.get("encounter")
        if encounter_id:
            queryset = queryset.filter(encounter_id=encounter_id)
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        modality = self.request.query_params.get("modality")
        if modality:
            queryset = queryset.filter(modality=modality.upper())
        return queryset

    def _payload(self, order):
        return {
            "id": order.id,
            "patient": order.patient_id,
            "patient_name": order.patient.full_name,
            "encounter": order.encounter_id,
            "modality": order.modality,
            "body_part": order.body_part,
            "clinical_indication": order.clinical_indication,
            "priority": order.priority,
            "status": order.status,
            "ordered_by": order.ordered_by_id,
            "ordered_by_name": order.ordered_by.get_full_name() if order.ordered_by else None,
            "ordered_at": order.ordered_at,
            "notes": order.notes,
        }

    def list(self, request):
        queryset = self.get_queryset()
        from apps.core.pagination import StandardPagination

        page = StandardPagination().paginate_queryset(queryset, request)
        payload = [self._payload(order) for order in (page if page is not None else queryset)]
        if page is not None:
            return StandardPagination().get_paginated_response(payload)
        return Response(payload)

    def retrieve(self, request, pk=None):
        order = self.get_queryset().filter(pk=pk).first()
        if order is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(self._payload(order))

    def create(self, request):
        data = request.data
        patient_id = data.get("patient")
        if not patient_id:
            return Response({"patient": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)
        from apps.radiology.models import RadiologyOrder

        order = RadiologyOrder.objects.create(
            patient_id=patient_id,
            encounter_id=data.get("encounter") or None,
            modality=(data.get("modality") or "XRAY").upper(),
            body_part=data.get("body_part", ""),
            clinical_indication=data.get("clinical_indication", ""),
            priority=(data.get("priority") or "ROUTINE").upper(),
            ordered_by=request.user,
            notes=data.get("notes", ""),
            created_by=request.user,
        )
        return Response(self._payload(order), status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        order = self.get_queryset().filter(pk=pk).first()
        if order is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        for field in ("modality", "body_part", "clinical_indication", "priority", "notes"):
            if field in request.data:
                value = request.data[field]
                setattr(order, field, value.upper() if field in ("modality", "priority") else value)
        order.save()
        return Response(self._payload(order))

    def destroy(self, request, pk=None):
        order = self.get_queryset().filter(pk=pk).first()
        if order is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        order.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
