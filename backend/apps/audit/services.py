"""Audit trail helpers."""

from .models import AuditLog


def record_audit(*, actor, action, resource_type, resource_id=None, details=None, request=None):
    """Persist an audit entry.

    Safe no-op when ``actor`` is None (unauthenticated/system contexts never
    write audit rows). The organization is taken from the actor, falling back
    to the request tenant context via TenantModel.save(). Returns the created
    AuditLog, or None for the no-op case.
    """
    if actor is None:
        return None

    ip_address = None
    if request is not None:
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if forwarded:
            ip_address = forwarded.split(",")[0].strip()
        else:
            ip_address = request.META.get("REMOTE_ADDR")

    return AuditLog.objects.create(
        organization=getattr(actor, "organization", None),
        actor=actor,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else "",
        details=details or {},
        ip_address=ip_address,
    )
