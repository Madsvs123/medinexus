from datetime import timedelta

from django.conf import settings
from django.core import signing
from django.core.mail import send_mail as django_send_mail
from django.template.loader import render_to_string
from django.utils import timezone

TOKEN_MAX_AGE_SECONDS = 24 * 60 * 60  # 24 hours


def send_email(subject, to, html, text=None):
    """Send a single HTML email via django.core.mail (console backend in dev)."""
    if isinstance(to, str):
        to = [to]
    return django_send_mail(
        subject=subject,
        message=text or "",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=to,
        html_message=html,
        fail_silently=False,
    )


def send_template_email(subject, to, template_name, context, text_template_name=None):
    """Render a Django template and send it as email."""
    html = render_to_string(template_name, context)
    text = render_to_string(text_template_name, context) if text_template_name else None
    return send_email(subject, to, html, text=text)


def generate_token(payload):
    """Sign a payload into a tamper-proof token valid for 24 hours."""
    return signing.dumps(payload, salt=settings.SECRET_KEY)


def verify_token(token):
    """Verify a signed token; returns the payload or raises ``BadSignature``/``SignatureExpired``."""
    return signing.loads(token, salt=settings.SECRET_KEY, max_age=TOKEN_MAX_AGE_SECONDS)


def token_expiry():
    return timezone.now() + timedelta(seconds=TOKEN_MAX_AGE_SECONDS)
