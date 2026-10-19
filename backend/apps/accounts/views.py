from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.models import Invitation
from apps.accounts.serializers import (
    ChangePasswordSerializer,
    InvitationAcceptSerializer,
    InvitationCreateSerializer,
    InvitationSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetSerializer,
    RegisterSerializer,
    ResendVerificationSerializer,
    UserSerializer,
    UserUpdateSerializer,
    VerifyEmailSerializer,
    send_verification_email,
)
from apps.core.exceptions import TenantForbidden
from apps.core.permissions import HasRole, IsOrgAdmin
from apps.core.services import generate_token, send_email, verify_token

User = get_user_model()


def _tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
    }


class LoginView(TokenObtainPairView):
    """POST /auth/login/ {email, password} → {access, refresh, user}."""

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code != status.HTTP_200_OK:
            return response
        user = User.objects.filter(email=request.data.get("email", "").lower()).first()
        if user is None:
            return Response({"detail": "No active account found with the given credentials."}, status=400)
        data = response.data
        data["user"] = UserSerializer(user).data
        return Response(data)


class RefreshView(TokenRefreshView):
    """POST /auth/refresh/ {refresh} → {access}."""


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token = generate_token({"user_id": user.id, "purpose": "verify-email"})
        send_verification_email(user, token)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payload = verify_token(serializer.validated_data["token"])
        except Exception:
            return Response({"detail": "Invalid or expired verification token."}, status=400)
        if payload.get("purpose") != "verify-email":
            return Response({"detail": "Invalid token purpose."}, status=400)
        user = User.objects.filter(id=payload.get("user_id")).first()
        if user is None:
            return Response({"detail": "User not found."}, status=404)
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])
        return Response(UserSerializer(user).data)


class ResendVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email=serializer.validated_data["email"].lower()).first()
        if user is not None and not user.is_email_verified:
            token = generate_token({"user_id": user.id, "purpose": "verify-email"})
            send_verification_email(user, token)
        return Response({"detail": "If the account exists, a verification email has been sent."})


class PasswordResetView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email=serializer.validated_data["email"].lower()).first()
        if user is not None:
            token = generate_token({"user_id": user.id, "purpose": "password-reset"})
            reset_url = f"http://localhost:5173/reset-password?token={token}"
            send_email(
                subject="Reset your MediNexus password",
                to=[user.email],
                html=f"<p>Hi {user.first_name or 'there'},</p><p><a href='{reset_url}'>Reset your password</a></p>",
            )
        return Response({"detail": "If the account exists, a reset email has been sent."})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payload = verify_token(serializer.validated_data["token"])
        except Exception:
            return Response({"detail": "Invalid or expired reset token."}, status=400)
        if payload.get("purpose") != "password-reset":
            return Response({"detail": "Invalid token purpose."}, status=400)
        user = User.objects.filter(id=payload.get("user_id")).first()
        if user is None:
            return Response({"detail": "User not found."}, status=404)
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated."})


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response({"old_password": ["Wrong password."]}, status=400)
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password changed."})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class InvitationViewSet(viewsets.ModelViewSet):
    """CRUD invitations (org admin only). Accept is a separate endpoint."""

    serializer_class = InvitationSerializer
    permission_classes = [IsOrgAdmin]

    def get_queryset(self):
        return Invitation.objects.all()

    def get_serializer_class(self):
        if self.action == "create":
            return InvitationCreateSerializer
        return InvitationSerializer

    def perform_create(self, serializer):
        org = self.request.user.organization
        if org is None:
            raise TenantForbidden("You are not associated with an organization.")
        expires_at = serializer.validated_data.get("expires_at") or (timezone.now() + timedelta(days=7))
        invitation = Invitation.create_for(
            organization=org,
            email=serializer.validated_data["email"],
            role=serializer.validated_data["role"],
            invited_by=self.request.user,
        )
        if invitation.expires_at != expires_at:
            invitation.expires_at = expires_at
            invitation.save(update_fields=["expires_at"])
        accept_url = f"http://localhost:5173/accept-invite?token={invitation.token}"
        send_email(
            subject=f"You're invited to join {org.name} on MediNexus",
            to=[invitation.email],
            html=f"<p>You've been invited as {invitation.get_role_display()}.</p>"
                 f"<p><a href='{accept_url}'>Accept invitation</a></p>",
        )

    @action(detail=True, methods=["post"])
    def resend(self, request, pk=None):
        invitation = self.get_object()
        if invitation.status != Invitation.PENDING:
            return Response({"detail": "Only pending invitations can be resent."}, status=400)
        invitation.token = Invitation.generate_token()
        invitation.expires_at = timezone.now() + timedelta(days=7)
        invitation.save(update_fields=["token", "expires_at"])
        accept_url = f"http://localhost:5173/accept-invite?token={invitation.token}"
        send_email(
            subject=f"You're invited to join {invitation.organization.name} on MediNexus",
            to=[invitation.email],
            html=f"<p><a href='{accept_url}'>Accept invitation</a></p>",
        )
        return Response(InvitationSerializer(invitation).data)


class InvitationAcceptView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = InvitationAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invitation = Invitation.objects.all_orgs().filter(token=serializer.validated_data["token"]).first()
        if invitation is None or invitation.status != Invitation.PENDING:
            return Response({"detail": "Invalid or already used invitation."}, status=400)
        if invitation.is_expired:
            invitation.status = Invitation.EXPIRED
            invitation.save(update_fields=["status"])
            return Response({"detail": "Invitation has expired."}, status=400)
        if User.objects.filter(email=invitation.email).exists():
            return Response({"detail": "A user with this email already exists."}, status=400)
        user = User.objects.create_user(
            email=invitation.email,
            password=serializer.validated_data["password"],
            first_name=serializer.validated_data["first_name"],
            last_name=serializer.validated_data["last_name"],
            role=invitation.role,
            organization=invitation.organization,
            is_email_verified=True,
        )
        invitation.status = Invitation.ACCEPTED
        invitation.save(update_fields=["status"])
        return Response(_tokens_for(user), status=status.HTTP_201_CREATED)


class UserViewSet(viewsets.GenericViewSet):
    """Staff directory scoped to the current organization."""

    serializer_class = UserSerializer
    permission_classes = [HasRole(*User.STAFF_ROLES)]

    def get_queryset(self):
        qs = User.objects.filter(organization=self.request.user.organization)
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)
        return qs

    def list(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        return Response(self.get_serializer(queryset, many=True).data)

    def patch(self, request, pk=None):
        if request.user.role != User.ADMIN and not request.user.is_superuser:
            return Response({"detail": "Only org admins can update users."}, status=403)
        user = self.get_object()
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(user).data)

    def destroy(self, request, pk=None):
        if request.user.role != User.ADMIN and not request.user.is_superuser:
            return Response({"detail": "Only org admins can delete users."}, status=403)
        user = self.get_object()
        if user == request.user:
            return Response({"detail": "You cannot delete your own account."}, status=400)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
