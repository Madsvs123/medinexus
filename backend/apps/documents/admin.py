from django.contrib import admin

from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "patient", "uploaded_by", "created_at")
    list_filter = ("category", "created_at")
    search_fields = ("title", "notes", "patient__first_name", "patient__last_name", "patient__mrn")
    readonly_fields = ("created_at", "updated_at")
