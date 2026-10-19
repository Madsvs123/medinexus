import contextvars

from django.conf import settings
from django.db import models

# Context variable holding the active organization id (int) for the request/consumer scope.
current_org: contextvars.ContextVar = contextvars.ContextVar("current_org", default=None)


class tenant_context:
    """Context manager that scopes the active organization for a block.

    Usage::

        with tenant_context(org.id):
            Patient.objects.create(...)
    """

    def __init__(self, org_id):
        self.org_id = org_id
        self._token = None

    def __enter__(self):
        self._token = current_org.set(self.org_id)
        return self

    def __exit__(self, exc_type, exc, tb):
        if self._token is not None:
            current_org.reset(self._token)
        return False


class TenantManager(models.Manager):
    """Manager that automatically filters querysets to the current organization."""

    def get_queryset(self):
        qs = super().get_queryset()
        org_id = current_org.get()
        if org_id is not None:
            qs = qs.filter(organization_id=org_id)
        return qs

    def all_orgs(self):
        """Bypass tenant filtering (used by seed command and admin tooling)."""
        return super().get_queryset()


class TenantModel(models.Model):
    """Abstract base for every tenant-scoped model.

    - ``organization`` FK is required (CASCADE).
    - ``created_at`` / ``updated_at`` are maintained automatically.
    - ``created_by`` tracks the acting user when available.
    - The default manager (``TenantManager``) filters by ``current_org``.
    - ``save()`` assigns ``organization`` from the context when it is unset.
    """

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="+",
        verbose_name="Organization",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created at")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated at")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        verbose_name="Created by",
    )

    objects = TenantManager()

    class Meta:
        abstract = True
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        org_id = current_org.get()
        if self.organization_id is None and org_id is not None:
            self.organization_id = org_id
        super().save(*args, **kwargs)
