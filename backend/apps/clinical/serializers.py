from rest_framework import serializers

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
from .services import block_severe_prescriptions_enabled, evaluate_prescription


class VitalSignsSerializer(serializers.ModelSerializer):
    class Meta:
        model = VitalSigns
        fields = [
            "id",
            "encounter",
            "recorded_at",
            "bp_systolic",
            "bp_diastolic",
            "heart_rate",
            "respiratory_rate",
            "temperature",
            "spo2",
            "weight_kg",
            "height_cm",
            "notes",
        ]
        read_only_fields = ["recorded_at"]


class DiagnosisSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diagnosis
        fields = ["id", "encounter", "name", "icd_code", "type", "status", "notes", "created_at"]
        read_only_fields = ["created_at"]


class ClinicalNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)

    class Meta:
        model = ClinicalNote
        fields = [
            "id",
            "encounter",
            "author",
            "author_name",
            "note_type",
            "content",
            "is_signed",
            "signed_at",
            "created_at",
        ]
        read_only_fields = ["author", "is_signed", "signed_at", "created_at"]


class TreatmentPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreatmentPlan
        fields = ["id", "encounter", "title", "instructions", "goals", "status", "created_at"]
        read_only_fields = ["created_at"]


class PrescriptionSerializer(serializers.ModelSerializer):
    medication_name = serializers.CharField(source="medication.name", read_only=True)
    medication_generic_name = serializers.CharField(source="medication.generic_name", read_only=True)
    patient_id = serializers.IntegerField(source="encounter.patient_id", read_only=True)

    class Meta:
        model = Prescription
        fields = [
            "id",
            "encounter",
            "patient_id",
            "medication",
            "medication_name",
            "medication_generic_name",
            "dosage",
            "frequency",
            "route",
            "duration_days",
            "instructions",
            "status",
            "refills",
            "warnings",
            "created_at",
        ]
        read_only_fields = ["warnings", "created_at"]

    def _evaluate_and_apply_warnings(self, attrs):
        encounter = attrs.get("encounter") or getattr(self.instance, "encounter", None)
        medication = attrs.get("medication") or getattr(self.instance, "medication", None)
        dosage = attrs.get("dosage") or getattr(self.instance, "dosage", None)
        patient = encounter.patient if encounter else None
        result = evaluate_prescription(patient, medication, dosage)
        attrs["warnings"] = result["warnings"]

        severe = [warning for warning in result["warnings"] if warning["severity"] == "SEVERE"]
        if severe:
            organization = encounter.organization if encounter else None
            block = block_severe_prescriptions_enabled(organization) if organization else True
            request = self.context.get("request")
            override = bool(
                request
                and request.data.get("override") in (True, "true", "True", "1", 1)
            )
            if block and not override:
                raise serializers.ValidationError(
                    {
                        "detail": "Prescription blocked: severe warnings detected. "
                        "Set override=true to proceed.",
                        "warnings": severe,
                    }
                )
        return attrs

    def validate(self, attrs):
        return self._evaluate_and_apply_warnings(attrs)


class ProcedureRecordSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source="performed_by.get_full_name", read_only=True)

    class Meta:
        model = ProcedureRecord
        fields = [
            "id",
            "encounter",
            "name",
            "code",
            "performed_by",
            "performed_by_name",
            "performed_at",
            "notes",
            "outcome",
        ]
        read_only_fields = ["performed_by", "performed_at"]


class ReferralSerializer(serializers.ModelSerializer):
    referring_doctor_name = serializers.CharField(source="referring_doctor.get_full_name", read_only=True)
    to_specialty_name = serializers.CharField(source="to_specialty.name", read_only=True)
    to_department_name = serializers.CharField(source="to_department.name", read_only=True)

    class Meta:
        model = Referral
        fields = [
            "id",
            "encounter",
            "referring_doctor",
            "referring_doctor_name",
            "to_specialty",
            "to_specialty_name",
            "to_department",
            "to_department_name",
            "reason",
            "priority",
            "status",
            "notes",
            "created_at",
        ]
        read_only_fields = ["referring_doctor", "created_at"]


class FollowUpSerializer(serializers.ModelSerializer):
    class Meta:
        model = FollowUp
        fields = ["id", "encounter", "scheduled_date", "instructions", "status", "created_at"]
        read_only_fields = ["created_at"]


class DischargeSummarySerializer(serializers.ModelSerializer):
    signed_by_name = serializers.CharField(source="signed_by.get_full_name", read_only=True)

    class Meta:
        model = DischargeSummary
        fields = [
            "id",
            "encounter",
            "admission",
            "summary",
            "diagnosis_at_discharge",
            "medications_at_discharge",
            "follow_up_instructions",
            "status",
            "signed_by",
            "signed_by_name",
            "signed_at",
            "created_at",
        ]
        read_only_fields = ["status", "signed_by", "signed_at", "created_at"]


class EncounterListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    doctor_name = serializers.CharField(source="doctor.get_full_name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Encounter
        fields = [
            "id",
            "patient",
            "patient_name",
            "doctor",
            "doctor_name",
            "department",
            "department_name",
            "type",
            "status",
            "started_at",
            "ended_at",
            "chief_complaint",
        ]
        read_only_fields = ["started_at", "ended_at"]


class EncounterDetailSerializer(EncounterListSerializer):
    vitals = VitalSignsSerializer(many=True, read_only=True)
    diagnoses = DiagnosisSerializer(many=True, read_only=True)
    notes = ClinicalNoteSerializer(many=True, read_only=True)
    prescriptions = PrescriptionSerializer(many=True, read_only=True)
    procedures = ProcedureRecordSerializer(many=True, read_only=True)
    referrals = ReferralSerializer(many=True, read_only=True)
    follow_ups = FollowUpSerializer(many=True, read_only=True)
    treatment_plans = TreatmentPlanSerializer(many=True, read_only=True)

    class Meta(EncounterListSerializer.Meta):
        fields = EncounterListSerializer.Meta.fields + [
            "history_presenting_illness",
            "assessment",
            "plan",
            "vitals",
            "diagnoses",
            "notes",
            "prescriptions",
            "procedures",
            "referrals",
            "follow_ups",
            "treatment_plans",
        ]
