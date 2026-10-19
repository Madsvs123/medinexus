from django.contrib import admin

from .models import (
    ConsentRecord,
    EmergencyContact,
    Patient,
    PatientAllergy,
    PatientCondition,
    PatientDocument,
)


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("mrn", "full_name", "gender", "phone", "status", "registration_date")
    list_filter = ("status", "gender", "blood_type")
    search_fields = ("mrn", "first_name", "last_name", "phone", "email")
    readonly_fields = ("mrn", "registration_date")


@admin.register(PatientAllergy)
class PatientAllergyAdmin(admin.ModelAdmin):
    list_display = ("patient", "allergen", "severity")
    list_filter = ("severity",)
    search_fields = ("patient__mrn", "patient__first_name", "allergen")


@admin.register(PatientCondition)
class PatientConditionAdmin(admin.ModelAdmin):
    list_display = ("patient", "name", "icd_code", "status")
    list_filter = ("status",)
    search_fields = ("patient__mrn", "name", "icd_code")


@admin.register(EmergencyContact)
class EmergencyContactAdmin(admin.ModelAdmin):
    list_display = ("patient", "name", "relation", "phone")
    search_fields = ("patient__mrn", "name", "phone")


@admin.register(PatientDocument)
class PatientDocumentAdmin(admin.ModelAdmin):
    list_display = ("patient", "title", "category", "uploaded_by", "created_at")
    list_filter = ("category",)
    search_fields = ("patient__mrn", "title")


@admin.register(ConsentRecord)
class ConsentRecordAdmin(admin.ModelAdmin):
    list_display = ("patient", "type", "status", "signed_by", "signed_at")
    list_filter = ("type", "status")
    search_fields = ("patient__mrn", "signed_by")
