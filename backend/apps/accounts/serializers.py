from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import Invitation
from apps.core.services import send_email
from apps.organizations.models import Organization

User = get_user_model()


class OrgBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "name", "code"]


class UserSerializer(serializers.ModelSerializer):
    organization = OrgBriefSerializer(read_only=True)
    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "full_name", "role",
            "phone", "avatar", "is_email_verified", "is_active",
            "is_staff", "is_superuser", "organization", "date_joined",
        ]
        read_only_fields = ["email", "is_email_verified", "is_staff", "is_superuser", "date_joined"]


class UserUpdateSerializer(serializers.ModelSerializer):
    """Org-admin updates: role / is_active / basic profile."""

    class Meta:
        model = User
        fields = ["first_name", "last_name", "phone", "avatar", "role", "is_active"]


class RegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            phone=validated_data.get("phone", ""),
            role=User.PATIENT,
            is_email_verified=False,
        )
        return user


class VerifyEmailSerializer(serializers.Serializer):
    token = serializers.CharField()


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8)


class InvitationSerializer(serializers.ModelSerializer):
    invited_by_name = serializers.CharField(source="invited_by.get_full_name", read_only=True, default="")
    org_name = serializers.CharField(source="organization.name", read_only=True)

    class Meta:
        model = Invitation
        fields = [
            "id", "email", "role", "token", "status", "expires_at",
            "invited_by", "invited_by_name", "org_name", "created_at",
        ]
        read_only_fields = ["token", "status", "invited_by", "created_at"]

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value


class InvitationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = ["email", "role", "expires_at"]
        extra_kwargs = {"expires_at": {"required": False}}


class InvitationAcceptSerializer(serializers.Serializer):
    token = serializers.CharField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    password = serializers.CharField(min_length=8)


def send_verification_email(user, token):
    verify_url = f"{settings_frontend_url()}/verify-email?token={token}"
    send_email(
        subject="Verify your MediNexus email",
        to=[user.email],
        html=(
            f"<p>Hi {user.first_name or 'there'},</p>"
            f"<p>Welcome to MediNexus. Verify your email to activate your account:</p>"
            f"<p><a href='{verify_url}'>Verify email</a></p>"
            f"<p>This link expires in 24 hours.</p>"
        ),
    )


def settings_frontend_url():
    from django.conf import settings

    return getattr(settings, "FRONTEND_URL", "http://localhost:5173")
