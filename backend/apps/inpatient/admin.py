from django.contrib import admin

from .models import (
    Admission,
    Bed,
    CarePlan,
    Discharge,
    DoctorRound,
    InpatientRoom,
    MedicationAdministration,
    NursingObservation,
    PatientTransfer,
    Ward,
)


@admin.register(Ward)
class WardAdmin(admin.ModelAdmin):
    list_display = ("name", "department", "location", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)


@admin.register(InpatientRoom)
class InpatientRoomAdmin(admin.ModelAdmin):
    list_display = ("ward", "room_number", "room_type", "is_active")
    list_filter = ("room_type", "is_active")
    search_fields = ("room_number",)


@admin.register(Bed)
class BedAdmin(admin.ModelAdmin):
    list_display = ("room", "bed_number", "status")
    list_filter = ("status",)
    search_fields = ("bed_number", "room__room_number")


@admin.register(Admission)
class AdmissionAdmin(admin.ModelAdmin):
    list_display = ("patient", "bed", "admitted_by", "admitted_at", "admission_type", "status")
    list_filter = ("status", "admission_type")
    search_fields = ("patient__mrn", "patient__first_name")


@admin.register(PatientTransfer)
class PatientTransferAdmin(admin.ModelAdmin):
    list_display = ("admission", "from_bed", "to_bed", "reason", "transferred_at")


@admin.register(NursingObservation)
class NursingObservationAdmin(admin.ModelAdmin):
    list_display = ("admission", "recorded_by", "recorded_at", "heart_rate", "temperature")


@admin.register(MedicationAdministration)
class MedicationAdministrationAdmin(admin.ModelAdmin):
    list_display = ("admission", "medication", "dose", "status", "scheduled_time", "given_at")
    list_filter = ("status", "route")


@admin.register(DoctorRound)
class DoctorRoundAdmin(admin.ModelAdmin):
    list_display = ("admission", "doctor", "round_time")


@admin.register(CarePlan)
class CarePlanAdmin(admin.ModelAdmin):
    list_display = ("admission", "title", "status", "created_by")
    list_filter = ("status",)


@admin.register(Discharge)
class DischargeAdmin(admin.ModelAdmin):
    list_display = ("admission", "discharged_by", "discharged_at", "discharge_type", "status")
    list_filter = ("discharge_type", "status")
