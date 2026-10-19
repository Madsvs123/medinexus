from django.contrib import admin

from .models import ImportJob, OrganizationSettings


@admin.register(OrganizationSettings)
class OrganizationSettingsAdmin(admin.ModelAdmin):
    list_display = ("organization", "currency", "slot_minutes", "appointment_window_days")
    search_fields = ("organization__name",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(ImportJob)
class ImportJobAdmin(admin.ModelAdmin):
    list_display = ("kind", "status", "processed_by", "started_at", "finished_at", "created_at")
    list_filter = ("kind", "status")
    readonly_fields = ("created_at", "updated_at", "started_at", "finished_at")
