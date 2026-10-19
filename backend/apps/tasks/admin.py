from django.contrib import admin

from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "assignee", "priority", "status", "due_date", "completed_at", "created_at")
    list_filter = ("status", "priority", "due_date")
    search_fields = ("title", "description", "assignee__email")
    readonly_fields = ("created_at", "updated_at", "completed_at")
    ordering = ("-created_at",)
