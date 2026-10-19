from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Notification


class UserBriefSerializer(serializers.ModelSerializer):
    """Minimal user representation embedded in notification payloads."""

    class Meta:
        model = get_user_model()
        fields = ["id", "email", "first_name", "last_name", "role", "avatar"]


class NotificationSerializer(serializers.ModelSerializer):
    recipient = UserBriefSerializer(read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "recipient",
            "type",
            "title",
            "body",
            "data",
            "is_read",
            "read_at",
            "created_at",
        ]
        read_only_fields = ["id", "recipient", "created_at"]
