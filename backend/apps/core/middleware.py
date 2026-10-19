"""
Tenant isolation middleware.

Sets the ``current_org`` contextvar for the duration of the request so that
every tenant-scoped model queryset is automatically filtered (and new rows are
assigned an organization).

DRF authenticates JWTs *after* middleware runs, so this middleware also
performs JWT authentication itself when a ``Authorization: Bearer`` header is
present. That guarantees API (JWT) requests get a tenant context too —
otherwise ``request.user`` would still be anonymous here and org-scoped
querysets would go unfiltered.

Resolution order:
1. JWT from ``Authorization: Bearer`` header (validated via simplejwt).
2. ``X-Organization`` header — honored for superusers (switch tenant) and for
   normal users whose organization matches the header value.
3. ``request.user.organization`` for authenticated users.
4. First active organization for superusers without one.
"""
from django.contrib.auth import get_user_model

from apps.core.models import current_org


class TenantMiddleware:
    """Sets the ``current_org`` contextvar for the duration of the request."""

    def __init__(self, get_response):
        self.get_response = get_response

    def _authenticate_bearer(self, request):
        """Resolve the user from a Bearer JWT, mirroring DRF simplejwt."""
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None
        token = auth_header[7:].strip()
        if not token:
            return None
        try:
            from rest_framework_simplejwt.tokens import AccessToken

            access = AccessToken(token)
            user_id = access["user_id"]
            User = get_user_model()
            return User.objects.filter(pk=user_id, is_active=True).first()
        except Exception:
            return None

    def _resolve_org_id(self, request, user):
        """Return the organization id to scope this request to."""
        header_org = request.headers.get("X-Organization")
        if header_org:
            from apps.organizations.models import Organization

            org = Organization.objects.filter(
                code__iexact=header_org.strip(), is_active=True
            ).first()
            if org is not None:
                if getattr(user, "is_superuser", False):
                    return org.id
                if user is not None and user.is_authenticated and user.organization_id == org.id:
                    return org.id

        if user is not None and user.is_authenticated:
            if user.organization_id is not None:
                return user.organization_id
            if getattr(user, "is_superuser", False):
                from apps.organizations.models import Organization

                first = Organization.objects.filter(is_active=True).order_by("id").first()
                if first is not None:
                    return first.id
        return None

    def __call__(self, request):
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            user = self._authenticate_bearer(request)
            if user is not None:
                request.user = user

        org_id = self._resolve_org_id(request, user)

        token = current_org.set(org_id)
        try:
            return self.get_response(request)
        finally:
            current_org.reset(token)
