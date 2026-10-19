from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import AuditLog


class UserBriefSerializer(serializers.ModelSerializer):
    """Minimal actor representation embedded in audit entries."""

    class Meta:
        model = get_user_model()
        fields = ["id", "email", "first_name", "last_name", "role", "avatar"]


class AuditLogSerializer(serializers.ModelSerializer):
    actor = UserBriefSerializer(read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "actor",
            "action",
            "resource_type",
            "resource_id",
            "details",
            "ip_address",
            "created_at",
        ]
        read_only_fields = fields
