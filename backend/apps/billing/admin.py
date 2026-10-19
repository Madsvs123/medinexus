"""Admin registrations for the Billing & Insurance app."""

from django.contrib import admin

from .models import (
    Deposit,
    InsuranceClaim,
    InsurancePlan,
    Invoice,
    InvoiceItem,
    PatientInsurance,
    Payment,
    Refund,
    Service,
)


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0
    autocomplete_fields = ["service"]


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "category", "price", "tax_rate", "active"]
    list_filter = ["category", "active"]
    search_fields = ["code", "name"]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["invoice_number", "patient", "status", "total", "paid_amount", "issued_at", "due_date"]
    list_filter = ["status"]
    search_fields = ["invoice_number"]
    inlines = [InvoiceItemInline]
    readonly_fields = ["subtotal", "discount_total", "tax_total", "total", "paid_amount"]


@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    list_display = ["invoice", "service", "quantity", "unit_price", "discount", "tax"]
    autocomplete_fields = ["service"]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["id", "invoice", "patient", "amount", "method", "status", "paid_at"]
    list_filter = ["method", "status"]
    search_fields = ["reference"]


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ["id", "payment", "amount", "status", "processed_at"]
    list_filter = ["status"]


@admin.register(Deposit)
class DepositAdmin(admin.ModelAdmin):
    list_display = ["id", "patient", "amount", "applied_amount", "balance", "status"]
    list_filter = ["status", "method"]
    readonly_fields = ["applied_amount"]


@admin.register(InsurancePlan)
class InsurancePlanAdmin(admin.ModelAdmin):
    list_display = ["name", "carrier", "coverage_percentage", "active"]
    list_filter = ["active"]


@admin.register(PatientInsurance)
class PatientInsuranceAdmin(admin.ModelAdmin):
    list_display = ["patient", "plan", "policy_number", "is_primary", "valid_until"]
    list_filter = ["is_primary"]


@admin.register(InsuranceClaim)
class InsuranceClaimAdmin(admin.ModelAdmin):
    list_display = ["claim_number", "invoice", "status", "submitted_amount", "approved_amount"]
    list_filter = ["status"]
    search_fields = ["claim_number"]
