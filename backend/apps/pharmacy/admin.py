from django.contrib import admin

from .models import (
    Dispensation,
    DrugInteraction,
    Medication,
    MedicationBatch,
    StockReturn,
    StockTransfer,
    Supplier,
)


@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "category", "form", "current_stock", "reorder_level", "price", "active")
    list_filter = ("category", "form", "is_controlled", "active")
    search_fields = ("code", "name", "generic_name")
    readonly_fields = ("created_at", "updated_at")


@admin.register(DrugInteraction)
class DrugInteractionAdmin(admin.ModelAdmin):
    list_display = ("medication_a", "medication_b", "severity")
    list_filter = ("severity",)
    search_fields = ("medication_a__name", "medication_b__name", "description")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ("name", "contact_person", "phone", "email", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "contact_person", "email", "phone")
    readonly_fields = ("created_at", "updated_at")


@admin.register(MedicationBatch)
class MedicationBatchAdmin(admin.ModelAdmin):
    list_display = ("batch_no", "medication", "supplier", "quantity", "expiry_date", "received_date", "unit_cost")
    list_filter = ("received_date", "expiry_date")
    search_fields = ("batch_no", "medication__name", "medication__code")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Dispensation)
class DispensationAdmin(admin.ModelAdmin):
    list_display = ("id", "prescription", "dispensed_by", "dispensed_at", "status")
    list_filter = ("status", "dispensed_at")
    readonly_fields = ("dispensed_at", "created_at", "updated_at")


@admin.register(StockTransfer)
class StockTransferAdmin(admin.ModelAdmin):
    list_display = ("id", "from_branch", "to_branch", "status", "requested_by", "completed_at")
    list_filter = ("status", "created_at")
    readonly_fields = ("created_at", "updated_at", "completed_at")


@admin.register(StockReturn)
class StockReturnAdmin(admin.ModelAdmin):
    list_display = ("id", "batch", "quantity", "reason", "returned_by", "returned_at")
    list_filter = ("returned_at",)
    search_fields = ("batch__batch_no", "reason")
    readonly_fields = ("returned_at", "created_at", "updated_at")
