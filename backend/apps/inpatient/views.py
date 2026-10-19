from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import HasOrgAccess, IsStaffRole
from apps.core.views import TenantViewSetMixin

from .models import (
    Admission,
    Bed,
    CarePlan,
    Discharge,
    DoctorRound,
    InpatientRoom,
    MedicationAdministration,
    NursingObservation,
    PatientTransfer,
    Ward,
)
from .serializers import (
    AdmissionDetailSerializer,
    AdmissionListSerializer,
    BedSerializer,
    CarePlanSerializer,
    DischargeSerializer,
    DoctorRoundSerializer,
    InpatientRoomSerializer,
    MedicationAdministrationSerializer,
    NursingObservationSerializer,
    PatientTransferSerializer,
    WardSerializer,
)


def _inject_tenant_and_creator(serializer, request, extra=None):
    kwargs = {"created_by": request.user}
    organization = getattr(request.user, "organization", None)
    if organization is not None:
        kwargs["organization"] = organization
    if extra:
        kwargs.update(extra)
    serializer.save(**kwargs)


class WardViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Ward.objects.all()
    serializer_class = WardSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]
    filterset_fields = ["department", "is_active"]

    def perform_create(self, serializer):
        _inject_tenant_and_creator(serializer, self.request)

    @action(detail=True, methods=["get"])
    def rooms(self, request, pk=None):
        ward = self.get_object()
        rooms = ward.rooms.all()
        return Response(InpatientRoomSerializer(rooms, many=True).data)


class InpatientRoomViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = InpatientRoom.objects.all()
    serializer_class = InpatientRoomSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]
    filterset_fields = ["ward", "room_type", "is_active"]

    def get_queryset(self):
        return super().get_queryset().prefetch_related("beds")

    def perform_create(self, serializer):
        _inject_tenant_and_creator(serializer, self.request)


class BedViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Bed.objects.all()
    serializer_class = BedSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]
    filterset_fields = ["room", "status"]

    def get_queryset(self):
        return super().get_queryset().select_related("room", "room__ward")

    def perform_create(self, serializer):
        _inject_tenant_and_creator(serializer, self.request)

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        bed = self.get_object()
        admission_id = request.data.get("admission_id")
        if not admission_id:
            return Response({"admission_id": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)
        if bed.status != "AVAILABLE":
            return Response({"detail": "Bed is not available for assignment."}, status=status.HTTP_400_BAD_REQUEST)
        admission = Admission.objects.filter(pk=admission_id, status="ACTIVE").first()
        if admission is None:
            return Response({"detail": "No active admission with that id."}, status=status.HTTP_404_NOT_FOUND)
        if admission.bed_id and admission.bed_id != bed.pk:
            admission.bed.status = "AVAILABLE"
            admission.bed.save(update_fields=["status", "updated_at"])
        admission.bed = bed
        admission.save(update_fields=["bed", "updated_at"])
        bed.status = "OCCUPIED"
        bed.save(update_fields=["status", "updated_at"])
        return Response(BedSerializer(bed).data)

    @action(detail=True, methods=["post"])
    def free(self, request, pk=None):
        bed = self.get_object()
        bed.status = "AVAILABLE"
        bed.save(update_fields=["status", "updated_at"])
        return Response(BedSerializer(bed).data)

    @action(detail=True, methods=["post"])
    def maintenance(self, request, pk=None):
        bed = self.get_object()
        bed.status = "MAINTENANCE"
        bed.save(update_fields=["status", "updated_at"])
        return Response(BedSerializer(bed).data)


class AdmissionViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Admission.objects.all()
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]
    filterset_fields = ["patient", "status", "admission_type"]

    def get_serializer_class(self):
        if self.action in ("list", "create"):
            return AdmissionListSerializer
        return AdmissionDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        ward = self.request.query_params.get("ward")
        if ward:
            queryset = queryset.filter(bed__room__ward_id=ward)
        return queryset.select_related("patient", "bed", "bed__room", "bed__room__ward")

    def perform_create(self, serializer):
        _inject_tenant_and_creator(serializer, self.request)

    def _admission(self, pk):
        admission = self.get_queryset().filter(pk=pk).first()
        if admission is None:
            return None
        return admission

    @action(detail=True, methods=["post"])
    def transfer(self, request, pk=None):
        admission = self._admission(pk)
        if admission is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if admission.status != "ACTIVE":
            return Response({"detail": "Only active admissions can be transferred."}, status=status.HTTP_400_BAD_REQUEST)
        bed_id = request.data.get("bed_id")
        if not bed_id:
            return Response({"bed_id": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)
        to_bed = Bed.objects.filter(pk=bed_id).first()
        if to_bed is None:
            return Response({"detail": "Target bed not found."}, status=status.HTTP_404_NOT_FOUND)
        if to_bed.status != "AVAILABLE":
            return Response({"detail": "Target bed is not available."}, status=status.HTTP_400_BAD_REQUEST)

        from_bed = admission.bed
        PatientTransfer.objects.create(
            admission=admission,
            from_bed=from_bed,
            to_bed=to_bed,
            reason=request.data.get("reason", ""),
            transferred_by=request.user,
            created_by=request.user,
            organization=admission.organization,
        )
        if from_bed:
            from_bed.status = "AVAILABLE"
            from_bed.save(update_fields=["status", "updated_at"])
        to_bed.status = "OCCUPIED"
        to_bed.save(update_fields=["status", "updated_at"])
        admission.bed = to_bed
        admission.status = "TRANSFERRED"
        admission.save(update_fields=["bed", "status", "updated_at"])
        return Response(AdmissionDetailSerializer(admission).data)

    @action(detail=True, methods=["post"])
    def discharge(self, request, pk=None):
        admission = self._admission(pk)
        if admission is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if admission.status == "DISCHARGED":
            return Response({"detail": "Admission is already discharged."}, status=status.HTTP_400_BAD_REQUEST)
        if hasattr(admission, "discharge"):
            return Response({"detail": "A discharge record already exists for this admission."}, status=status.HTTP_400_BAD_REQUEST)

        discharge = Discharge.objects.create(
            admission=admission,
            discharged_by=request.user,
            discharged_at=timezone.now(),
            discharge_type=request.data.get("discharge_type", "HOME"),
            summary=request.data.get("summary", ""),
            medications_at_discharge=request.data.get("medications_at_discharge", ""),
            follow_up_instructions=request.data.get("follow_up_instructions", ""),
            status="DRAFT",
            created_by=request.user,
            organization=admission.organization,
        )
        if admission.bed:
            admission.bed.status = "AVAILABLE"
            admission.bed.save(update_fields=["status", "updated_at"])
        admission.status = "DISCHARGED"
        admission.discharged_at = discharge.discharged_at
        admission.discharged_by = request.user
        admission.save(update_fields=["status", "discharged_at", "discharged_by", "updated_at"])
        return Response(DischargeSerializer(discharge).data)


class PatientTransferViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = PatientTransfer.objects.all()
    serializer_class = PatientTransferSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]
    filterset_fields = ["admission"]

    def get_queryset(self):
        return super().get_queryset().select_related("admission", "from_bed", "to_bed", "transferred_by")

    def perform_create(self, serializer):
        serializer.save(transferred_by=self.request.user)


class NursingObservationViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = NursingObservation.objects.all()
    serializer_class = NursingObservationSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]
    filterset_fields = ["admission", "consciousness"]

    def get_queryset(self):
        queryset = super().get_queryset()
        patient_id = self.request.query_params.get("patient")
        if patient_id:
            queryset = queryset.filter(admission__patient_id=patient_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)


class MedicationAdministrationViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = MedicationAdministration.objects.all()
    serializer_class = MedicationAdministrationSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]
    filterset_fields = ["admission", "status", "route"]

    def get_queryset(self):
        queryset = super().get_queryset().select_related("medication", "admission")
        patient_id = self.request.query_params.get("patient")
        if patient_id:
            queryset = queryset.filter(admission__patient_id=patient_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(given_by=self.request.user)


class DoctorRoundViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = DoctorRound.objects.all()
    serializer_class = DoctorRoundSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]
    filterset_fields = ["admission", "doctor"]

    def perform_create(self, serializer):
        serializer.save(doctor=self.request.user)


class CarePlanViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = CarePlan.objects.all()
    serializer_class = CarePlanSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]
    filterset_fields = ["admission", "status"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class DischargeViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Discharge.objects.all()
    serializer_class = DischargeSerializer
    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]
    filterset_fields = ["admission", "status", "discharge_type"]

    def get_queryset(self):
        return super().get_queryset().select_related("admission", "admission__patient", "discharged_by")

    def perform_create(self, serializer):
        serializer.save(discharged_by=self.request.user, discharged_at=timezone.now())

    @action(detail=True, methods=["post"])
    def finalize(self, request, pk=None):
        discharge = self.get_object()
        if discharge.status == "FINAL":
            return Response({"detail": "Discharge is already final."}, status=status.HTTP_400_BAD_REQUEST)
        discharge.status = "FINAL"
        discharge.discharged_by = request.user
        discharge.discharged_at = timezone.now()
        discharge.save(update_fields=["status", "discharged_by", "discharged_at", "updated_at"])
        return Response(DischargeSerializer(discharge).data)


class InpatientStatsViewSet(TenantViewSetMixin, viewsets.ViewSet):
    """GET /api/v1/inpatient/stats/ — ward occupancy and admission KPIs."""

    permission_classes = [IsAuthenticated, HasOrgAccess, IsStaffRole]

    def list(self, request):
        today = timezone.localdate()
        total_beds = Bed.objects.count()
        available_beds = Bed.objects.filter(status="AVAILABLE").count()
        occupied_beds = Bed.objects.filter(status="OCCUPIED").count()
        active_admissions = Admission.objects.filter(status="ACTIVE").count()
        admissions_today = Admission.objects.filter(admitted_at__date=today).count()
        discharges_today = Discharge.objects.filter(discharged_at__date=today).count()
        return Response(
            {
                "total_beds": total_beds,
                "available_beds": available_beds,
                "occupied_beds": occupied_beds,
                "active_admissions": active_admissions,
                "admissions_today": admissions_today,
                "discharges_today": discharges_today,
            }
        )
