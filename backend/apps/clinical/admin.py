from django.contrib import admin

from .models import (
    ClinicalNote,
    Diagnosis,
    DischargeSummary,
    Encounter,
    FollowUp,
    Prescription,
    ProcedureRecord,
    Referral,
    TreatmentPlan,
    VitalSigns,
)


@admin.register(Encounter)
class EncounterAdmin(admin.ModelAdmin):
    list_display = ("patient", "doctor", "department", "type", "status", "started_at")
    list_filter = ("status", "type")
    search_fields = ("patient__mrn", "patient__first_name", "chief_complaint")


@admin.register(VitalSigns)
class VitalSignsAdmin(admin.ModelAdmin):
    list_display = ("encounter", "recorded_at", "bp_systolic", "heart_rate", "temperature")
    search_fields = ("encounter__patient__mrn",)


@admin.register(Diagnosis)
class DiagnosisAdmin(admin.ModelAdmin):
    list_display = ("encounter", "name", "icd_code", "type", "status")
    list_filter = ("type", "status")
    search_fields = ("name", "icd_code")


@admin.register(ClinicalNote)
class ClinicalNoteAdmin(admin.ModelAdmin):
    list_display = ("encounter", "author", "note_type", "is_signed", "signed_at")
    list_filter = ("note_type", "is_signed")
    search_fields = ("encounter__patient__mrn",)


@admin.register(TreatmentPlan)
class TreatmentPlanAdmin(admin.ModelAdmin):
    list_display = ("encounter", "title", "status")
    list_filter = ("status",)


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ("encounter", "medication", "dosage", "frequency", "status")
    list_filter = ("status", "route")
    search_fields = ("medication__name", "encounter__patient__mrn")


@admin.register(ProcedureRecord)
class ProcedureRecordAdmin(admin.ModelAdmin):
    list_display = ("encounter", "name", "code", "performed_by", "performed_at")


@admin.register(Referral)
class ReferralAdmin(admin.ModelAdmin):
    list_display = ("encounter", "referring_doctor", "to_specialty", "priority", "status")
    list_filter = ("priority", "status")


@admin.register(FollowUp)
class FollowUpAdmin(admin.ModelAdmin):
    list_display = ("encounter", "scheduled_date", "status")
    list_filter = ("status",)


@admin.register(DischargeSummary)
class DischargeSummaryAdmin(admin.ModelAdmin):
    list_display = ("encounter", "admission", "status", "signed_by", "signed_at")
    list_filter = ("status",)
