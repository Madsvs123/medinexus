from django.contrib import admin

from .models import RadiologyOrder, RadiologyReport


@admin.register(RadiologyOrder)
class RadiologyOrderAdmin(admin.ModelAdmin):
    list_display = ("id", "patient", "modality", "body_part", "priority", "status", "ordered_by", "ordered_at")
    list_filter = ("modality", "priority", "status", "ordered_at")
    search_fields = ("patient__first_name", "patient__last_name", "patient__mrn", "body_part", "clinical_indication")
    readonly_fields = ("ordered_at", "created_at", "updated_at")


@admin.register(RadiologyReport)
class RadiologyReportAdmin(admin.ModelAdmin):
    list_display = ("order", "radiologist", "status", "finalized_at")
    list_filter = ("status", "finalized_at")
    search_fields = ("order__id", "findings", "impression")
    readonly_fields = ("finalized_at", "created_at", "updated_at")
