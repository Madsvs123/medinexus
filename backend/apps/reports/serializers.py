from rest_framework import serializers

from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    generated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            "id",
            "kind",
            "title",
            "params",
            "file",
            "status",
            "error",
            "generated_by",
            "generated_by_name",
            "generated_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "file",
            "status",
            "error",
            "generated_by",
            "generated_at",
            "created_at",
        ]

    def get_generated_by_name(self, obj):
        return obj.generated_by.get_full_name() if obj.generated_by else None

    def validate(self, attrs):
        if not attrs.get("title"):
            attrs["title"] = f"{attrs['kind'].title()} report"
        return attrs
