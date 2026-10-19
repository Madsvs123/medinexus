from django.contrib import admin

from .models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("title", "kind", "status", "generated_by", "generated_at", "created_at")
    list_filter = ("kind", "status")
    search_fields = ("title",)
    readonly_fields = ("created_at", "updated_at", "generated_at")
