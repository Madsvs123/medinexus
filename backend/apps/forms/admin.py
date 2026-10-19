from django.contrib import admin

from .models import FormSubmission, FormTemplate


@admin.register(FormTemplate)
class FormTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "active", "created_at")
    list_filter = ("category", "active")
    search_fields = ("name",)


@admin.register(FormSubmission)
class FormSubmissionAdmin(admin.ModelAdmin):
    list_display = ("template", "patient", "status", "submitted_by", "submitted_at")
    list_filter = ("status", "template")
    search_fields = ("template__name", "patient__first_name", "patient__last_name")
    readonly_fields = ("created_at", "updated_at")
