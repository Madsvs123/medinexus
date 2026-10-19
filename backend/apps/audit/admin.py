from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("id", "actor", "action", "resource_type", "resource_id", "ip_address", "created_at")
    list_filter = ("action", "resource_type", "created_at")
    search_fields = ("actor__email", "resource_type", "resource_id")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)
