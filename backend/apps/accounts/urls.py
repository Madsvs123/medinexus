from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.accounts.views import (
    ChangePasswordView,
    InvitationAcceptView,
    InvitationViewSet,
    LoginView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetView,
    RefreshView,
    RegisterView,
    ResendVerificationView,
    UserViewSet,
    VerifyEmailView,
)

router = DefaultRouter()
router.register("invitations", InvitationViewSet, basename="invitation")
router.register("users", UserViewSet, basename="user")

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("verify-email/", VerifyEmailView.as_view(), name="auth-verify-email"),
    path("resend-verification/", ResendVerificationView.as_view(), name="auth-resend-verification"),
    path("password-reset/", PasswordResetView.as_view(), name="auth-password-reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="auth-password-reset-confirm"),
    path("change-password/", ChangePasswordView.as_view(), name="auth-change-password"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("invitations/accept/", InvitationAcceptView.as_view(), name="auth-invitation-accept"),
    path("", include(router.urls)),
]
