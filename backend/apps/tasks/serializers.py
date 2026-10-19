from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Task


class UserBriefSerializer(serializers.ModelSerializer):
    """Minimal assignee representation embedded in task payloads."""

    class Meta:
        model = get_user_model()
        fields = ["id", "email", "first_name", "last_name", "role", "avatar"]


class TaskSerializer(serializers.ModelSerializer):
    assignee = serializers.PrimaryKeyRelatedField(
        queryset=get_user_model().objects.all(), required=False, allow_null=True
    )
    assignee_detail = UserBriefSerializer(source="assignee", read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "assignee",
            "assignee_detail",
            "priority",
            "status",
            "due_date",
            "related_type",
            "related_id",
            "completed_at",
            "created_at",
        ]
        read_only_fields = ["id", "completed_at", "created_at"]
