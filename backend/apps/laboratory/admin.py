from django.contrib import admin

from .models import LabOrder, LabReport, LabResult, LabSample, LabTest


@admin.register(LabTest)
class LabTestAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "category", "sample_type", "unit", "ref_range_low", "ref_range_high", "price", "active")
    list_filter = ("category", "sample_type", "active")
    search_fields = ("code", "name")
    readonly_fields = ("created_at", "updated_at")


@admin.register(LabOrder)
class LabOrderAdmin(admin.ModelAdmin):
    list_display = ("id", "patient", "priority", "status", "ordered_by", "ordered_at")
    list_filter = ("status", "priority", "ordered_at")
    search_fields = ("patient__first_name", "patient__last_name", "patient__mrn", "notes")
    filter_horizontal = ("tests",)
    readonly_fields = ("ordered_at", "created_at", "updated_at", "result_reported_at")


@admin.register(LabSample)
class LabSampleAdmin(admin.ModelAdmin):
    list_display = ("sample_id", "order", "test", "status", "collected_by", "collected_at")
    list_filter = ("status", "collected_at")
    search_fields = ("sample_id", "order__id", "test__name")
    readonly_fields = ("sample_id", "created_at", "updated_at")


@admin.register(LabResult)
class LabResultAdmin(admin.ModelAdmin):
    list_display = ("order", "test", "value", "flag", "status", "reviewed_by", "reviewed_at")
    list_filter = ("flag", "status", "reviewed_at")
    search_fields = ("order__id", "test__name", "value")
    readonly_fields = ("flag", "created_at", "updated_at", "reviewed_at")


@admin.register(LabReport)
class LabReportAdmin(admin.ModelAdmin):
    list_display = ("order", "generated_by", "generated_at")
    search_fields = ("order__id",)
    readonly_fields = ("generated_at", "created_at", "updated_at")
