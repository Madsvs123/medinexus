from django.contrib import admin

from apps.core.models import TenantModel

# TenantModel is abstract — nothing to register.
admin.site.register  # noqa: B018  (keeps import alive for app discovery)

__all__ = ["TenantModel"]
