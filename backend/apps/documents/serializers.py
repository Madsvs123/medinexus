from django.db.models import Q
from rest_framework import serializers

from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    """Document payload.

    - ``GET /documents/``  filters: ``?patient=<id>&category=&search=``
      (search matches title, tags, notes and patient full name)
    - ``POST /documents/`` multipart form: ``title, category, patient?,
      file, tags (JSON string), notes?``
    """

    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "category",
            "patient",
            "patient_name",
            "file",
            "tags",
            "uploaded_by",
            "uploaded_by_name",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "uploaded_by", "created_at", "updated_at"]

    def get_uploaded_by_name(self, obj):
        user = obj.uploaded_by
        if user is None:
            return None
        return user.get_full_name() or user.email

    def validate_tags(self, value):
        if value is None:
            return []
        if isinstance(value, str):
            try:
                import json

                value = json.loads(value)
            except (ValueError, TypeError):
                raise serializers.ValidationError("tags must be a JSON array.")
        if not isinstance(value, list):
            raise serializers.ValidationError("tags must be a JSON array.")
        return [str(tag) for tag in value]

    def validate(self, attrs):
        if not attrs.get("file"):
            raise serializers.ValidationError({"file": "A file is required."})
        return attrs

    @staticmethod
    def apply_filters(qs, params):
        patient = params.get("patient")
        category = params.get("category")
        search = params.get("search")
        if patient:
            qs = qs.filter(patient_id=patient)
        if category:
            qs = qs.filter(category=category)
        if search:
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(notes__icontains=search)
                | Q(tags__icontains=search)
                | Q(patient__first_name__icontains=search)
                | Q(patient__last_name__icontains=search)
                | Q(patient__mrn__icontains=search)
            )
        return qs
