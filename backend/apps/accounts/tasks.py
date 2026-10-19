from celery import shared_task

from apps.core.services import generate_token, send_email


@shared_task
def send_verification_email(user_id, token=None):
    """Send the account verification email (async)."""
    from django.contrib.auth import get_user_model

    User = get_user_model()
    user = User.objects.filter(id=user_id).first()
    if user is None:
        return
    token = token or generate_token({"user_id": user.id, "purpose": "verify-email"})
    verify_url = f"http://localhost:5173/verify-email?token={token}"
    send_email(
        subject="Verify your MediNexus email",
        to=[user.email],
        html=f"<p>Hi {user.first_name or 'there'},</p>"
             f"<p>Welcome to MediNexus. Verify your email to activate your account:</p>"
             f"<p><a href='{verify_url}'>Verify email</a></p>"
             f"<p>This link expires in 24 hours.</p>",
    )


@shared_task
def send_password_reset_email(user_id, token=None):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    user = User.objects.filter(id=user_id).first()
    if user is None:
        return
    token = token or generate_token({"user_id": user.id, "purpose": "password-reset"})
    reset_url = f"http://localhost:5173/reset-password?token={token}"
    send_email(
        subject="Reset your MediNexus password",
        to=[user.email],
        html=f"<p>Hi {user.first_name or 'there'},</p><p><a href='{reset_url}'>Reset your password</a></p>",
    )


@shared_task
def send_invitation_email(invitation_id, accept_url=None):
    from apps.accounts.models import Invitation

    invitation = Invitation.objects.all_orgs().filter(id=invitation_id).first()
    if invitation is None:
        return
    accept_url = accept_url or f"http://localhost:5173/accept-invite?token={invitation.token}"
    send_email(
        subject=f"You're invited to join {invitation.organization.name} on MediNexus",
        to=[invitation.email],
        html=f"<p>You've been invited as {invitation.get_role_display()}.</p>"
             f"<p><a href='{accept_url}'>Accept invitation</a></p>",
    )
