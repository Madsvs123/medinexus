from rest_framework import serializers

from .models import ImportJob, OrganizationSettings


class OrganizationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationSettings
        fields = [
            "id",
            "appointment_window_days",
            "slot_minutes",
            "block_severe_prescriptions",
            "auto_issue_invoice_on_checkout",
            "currency",
            "date_format",
            "notification_prefs",
            "clinical_defaults",
            "billing_defaults",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ImportJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImportJob
        fields = [
            "id",
            "kind",
            "file",
            "status",
            "summary",
            "errors",
            "processed_by",
            "started_at",
            "finished_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "summary",
            "errors",
            "processed_by",
            "started_at",
            "finished_at",
            "created_at",
        ]

    def validate_file(self, value):
        name = (value.name or "").lower()
        if not (name.endswith(".csv") or name.endswith(".xlsx")):
            raise serializers.ValidationError("Only .csv or .xlsx files are supported.")
        return value
