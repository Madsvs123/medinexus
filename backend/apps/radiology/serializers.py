from rest_framework import serializers

from apps.patients.models import Patient

from .models import RadiologyOrder, RadiologyReport


class RadiologyOrderSerializer(serializers.ModelSerializer):
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    patient_detail = serializers.SerializerMethodField()
    ordered_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = RadiologyOrder
        fields = [
            "id",
            "patient",
            "patient_detail",
            "encounter",
            "modality",
            "body_part",
            "clinical_indication",
            "priority",
            "status",
            "ordered_by",
            "ordered_at",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "ordered_by", "ordered_at", "created_at"]

    def get_patient_detail(self, obj):
        patient = obj.patient
        return {
            "id": patient.id,
            "mrn": patient.mrn,
            "first_name": patient.first_name,
            "last_name": patient.last_name,
            "full_name": patient.full_name,
        }

    def validate_modality(self, value):
        if value not in RadiologyOrder.Modality.values:
            raise serializers.ValidationError("Invalid modality.")
        return value


class RadiologyReportSerializer(serializers.ModelSerializer):
    order = serializers.PrimaryKeyRelatedField(queryset=RadiologyOrder.objects.all())
    order_detail = RadiologyOrderSerializer(source="order", read_only=True)
    radiologist = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = RadiologyReport
        fields = [
            "id",
            "order",
            "order_detail",
            "radiologist",
            "findings",
            "impression",
            "status",
            "finalized_at",
            "attachment",
            "created_at",
        ]
        read_only_fields = ["id", "radiologist", "status", "finalized_at", "created_at"]
