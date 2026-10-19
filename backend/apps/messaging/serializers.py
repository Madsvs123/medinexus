from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Message, Thread


class UserBriefSerializer(serializers.ModelSerializer):
    """Minimal user representation embedded in chat payloads."""

    class Meta:
        model = get_user_model()
        fields = ["id", "email", "first_name", "last_name", "role", "avatar"]


class MessageSerializer(serializers.ModelSerializer):
    sender = UserBriefSerializer(read_only=True)
    thread = serializers.PrimaryKeyRelatedField(queryset=Thread.objects.all())
    read_by = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = Message
        fields = ["id", "thread", "sender", "body", "attachment", "sent_at", "read_by"]
        read_only_fields = ["id", "sent_at"]

    def validate_thread(self, thread):
        request = self.context.get("request")
        if request is not None and request.user.is_authenticated:
            if not thread.participants.filter(id=request.user.id).exists():
                raise serializers.ValidationError(
                    "You are not a participant of this thread."
                )
        return thread


class ThreadSerializer(serializers.ModelSerializer):
    participants = UserBriefSerializer(many=True, read_only=True)
    created_by = UserBriefSerializer(read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Thread
        fields = [
            "id",
            "title",
            "participants",
            "created_by",
            "last_message_at",
            "last_message",
            "unread_count",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "last_message_at"]

    def get_last_message(self, obj):
        message = obj.messages.order_by("-sent_at", "-id").first()
        return MessageSerializer(message).data if message else None

    def get_unread_count(self, obj):
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return 0
        return obj.messages.exclude(sender=request.user).exclude(read_by=request.user).count()
