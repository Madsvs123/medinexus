from rest_framework import serializers

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


class WardSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Ward
        fields = ["id", "name", "department", "department_name", "location", "is_active"]


class BedSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(source="room.room_number", read_only=True)
    ward_id = serializers.IntegerField(source="room.ward_id", read_only=True)
    ward_name = serializers.CharField(source="room.ward.name", read_only=True)

    class Meta:
        model = Bed
        fields = [
            "id",
            "room",
            "room_number",
            "ward_id",
            "ward_name",
            "bed_number",
            "status",
            "notes",
        ]


class InpatientRoomSerializer(serializers.ModelSerializer):
    ward_name = serializers.CharField(source="ward.name", read_only=True)
    beds = BedSerializer(many=True, read_only=True)
    bed_count = serializers.IntegerField(source="beds.count", read_only=True)

    class Meta:
        model = InpatientRoom
        fields = ["id", "ward", "ward_name", "room_number", "room_type", "is_active", "beds", "bed_count"]


class NursingObservationSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source="recorded_by.get_full_name", read_only=True)

    class Meta:
        model = NursingObservation
        fields = [
            "id",
            "admission",
            "recorded_by",
            "recorded_by_name",
            "recorded_at",
            "bp_systolic",
            "bp_diastolic",
            "heart_rate",
            "respiratory_rate",
            "temperature",
            "spo2",
            "consciousness",
            "notes",
        ]
        read_only_fields = ["recorded_by", "recorded_at"]


class MedicationAdministrationSerializer(serializers.ModelSerializer):
    medication_name = serializers.CharField(source="medication.name", read_only=True)
    given_by_name = serializers.CharField(source="given_by.get_full_name", read_only=True)

    class Meta:
        model = MedicationAdministration
        fields = [
            "id",
            "admission",
            "prescription",
            "medication",
            "medication_name",
            "dose",
            "route",
            "scheduled_time",
            "given_at",
            "given_by",
            "given_by_name",
            "status",
            "notes",
        ]
        read_only_fields = ["given_by", "given_at"]


class DoctorRoundSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source="doctor.get_full_name", read_only=True)

    class Meta:
        model = DoctorRound
        fields = ["id", "admission", "doctor", "doctor_name", "round_time", "findings", "plan", "orders"]
        read_only_fields = ["doctor", "round_time"]


class CarePlanSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = CarePlan
        fields = [
            "id",
            "admission",
            "title",
            "goals",
            "interventions",
            "status",
            "created_by",
            "created_by_name",
            "created_at",
        ]
        read_only_fields = ["created_by", "created_at"]


class DischargeSerializer(serializers.ModelSerializer):
    discharged_by_name = serializers.CharField(source="discharged_by.get_full_name", read_only=True)
    patient_id = serializers.IntegerField(source="admission.patient_id", read_only=True)
    patient_name = serializers.CharField(source="admission.patient.full_name", read_only=True)

    class Meta:
        model = Discharge
        fields = [
            "id",
            "admission",
            "patient_id",
            "patient_name",
            "discharged_by",
            "discharged_by_name",
            "discharged_at",
            "discharge_type",
            "summary",
            "medications_at_discharge",
            "follow_up_instructions",
            "status",
        ]
        read_only_fields = ["discharged_by", "discharged_at", "status"]


class PatientTransferSerializer(serializers.ModelSerializer):
    transferred_by_name = serializers.CharField(source="transferred_by.get_full_name", read_only=True)
    from_bed_label = serializers.CharField(source="from_bed.bed_number", read_only=True)
    to_bed_label = serializers.CharField(source="to_bed.bed_number", read_only=True)

    class Meta:
        model = PatientTransfer
        fields = [
            "id",
            "admission",
            "from_bed",
            "from_bed_label",
            "to_bed",
            "to_bed_label",
            "reason",
            "transferred_at",
            "transferred_by",
            "transferred_by_name",
        ]
        read_only_fields = ["transferred_by", "transferred_at"]


class AdmissionListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    bed_label = serializers.SerializerMethodField()

    class Meta:
        model = Admission
        fields = [
            "id",
            "patient",
            "patient_name",
            "bed",
            "bed_label",
            "admitted_by",
            "admitted_at",
            "expected_discharge_date",
            "admission_type",
            "diagnosis_on_admission",
            "status",
            "discharged_at",
        ]
        read_only_fields = ["admitted_at", "discharged_at"]

    def get_bed_label(self, obj):
        if obj.bed_id:
            return f"{obj.bed.room.room_number} — {obj.bed.bed_number}"
        return None


class AdmissionDetailSerializer(AdmissionListSerializer):
    observations = NursingObservationSerializer(many=True, read_only=True)
    medications = MedicationAdministrationSerializer(many=True, read_only=True)
    rounds = DoctorRoundSerializer(many=True, read_only=True)
    care_plans = CarePlanSerializer(many=True, read_only=True)
    discharge = DischargeSerializer(read_only=True)
    transfers = PatientTransferSerializer(many=True, read_only=True)

    class Meta(AdmissionListSerializer.Meta):
        fields = AdmissionListSerializer.Meta.fields + [
            "observations",
            "medications",
            "rounds",
            "care_plans",
            "discharge",
            "transfers",
        ]
