from django.contrib import admin

from .models import Appointment, AppointmentQueue, Availability, RecurringRule, Room


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("name", "department", "type", "status")
    list_filter = ("type", "status")
    search_fields = ("name",)


@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):
    list_display = ("doctor", "department", "weekday", "start_time", "end_time", "is_active")
    list_filter = ("weekday", "is_active")
    search_fields = ("doctor__email", "doctor__first_name")


@admin.register(RecurringRule)
class RecurringRuleAdmin(admin.ModelAdmin):
    list_display = ("patient", "doctor", "frequency", "start_date", "end_date", "is_active")
    list_filter = ("frequency", "is_active")


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("patient", "doctor", "department", "start", "end", "type", "status")
    list_filter = ("status", "type")
    search_fields = ("patient__mrn", "patient__first_name", "doctor__email")


@admin.register(AppointmentQueue)
class AppointmentQueueAdmin(admin.ModelAdmin):
    list_display = ("appointment", "position", "status", "called_at")
    list_filter = ("status",)
