from rest_framework import serializers

from .models import FormSubmission, FormTemplate


class FormTemplateSerializer(serializers.ModelSerializer):
    """Form template payload; ``schema`` is validated against field-def rules."""

    class Meta:
        model = FormTemplate
        fields = ["id", "name", "category", "schema", "active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_schema(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("schema must be a list of field definitions.")
        keys = set()
        for idx, field in enumerate(value):
            if not isinstance(field, dict):
                raise serializers.ValidationError(f"schema[{idx}] must be an object.")
            key = field.get("key")
            if not key or not isinstance(key, str):
                raise serializers.ValidationError(f"schema[{idx}] requires a string 'key'.")
            if key in keys:
                raise serializers.ValidationError(f"Duplicate schema key '{key}'.")
            keys.add(key)
            ftype = field.get("type")
            if ftype not in FormTemplate.FIELD_TYPES:
                raise serializers.ValidationError(
                    f"schema[{idx}] type '{ftype}' invalid; choose from "
                    + ", ".join(FormTemplate.FIELD_TYPES)
                    + "."
                )
            if ftype in ("select", "multiselect") and not isinstance(field.get("options"), list):
                raise serializers.ValidationError(
                    f"schema[{idx}] ('{key}') requires an options list."
                )
        return value


class FormSubmissionSerializer(serializers.ModelSerializer):
    """Form submission payload; ``data`` is validated against the template schema."""

    template_name = serializers.CharField(source="template.name", read_only=True)
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    submitted_by_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FormSubmission
        fields = [
            "id",
            "template",
            "template_name",
            "patient",
            "patient_name",
            "encounter",
            "data",
            "status",
            "submitted_by",
            "submitted_by_name",
            "submitted_at",
            "reviewed_by",
            "reviewed_by_name",
            "reviewed_at",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "submitted_by",
            "submitted_at",
            "reviewed_by",
            "reviewed_at",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]

    def get_submitted_by_name(self, obj):
        return obj.submitted_by.get_full_name() if obj.submitted_by else None

    def get_reviewed_by_name(self, obj):
        return obj.reviewed_by.get_full_name() if obj.reviewed_by else None

    def validate(self, attrs):
        template = attrs.get("template") or getattr(self.instance, "template", None)
        data = attrs.get("data", {})
        if template is None:
            raise serializers.ValidationError({"template": "This field is required."})
        if not isinstance(data, dict):
            raise serializers.ValidationError({"data": "Must be a JSON object."})
        schema = template.schema or []
        schema_keys = {field.get("key") for field in schema if isinstance(field, dict)}
        unknown = set(data.keys()) - schema_keys
        if unknown:
            raise serializers.ValidationError(
                {"data": f"Unknown keys: {', '.join(sorted(unknown))}."}
            )
        for field in schema:
            key = field.get("key")
            if field.get("required") and key not in data:
                raise serializers.ValidationError({"data": f"Missing required key '{key}'."})
        return attrs
