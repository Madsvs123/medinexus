from django.contrib import admin

from apps.organizations.models import Branch, Department, Organization, Specialty


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "phone", "email", "currency", "is_active"]
    list_filter = ["is_active", "currency"]
    search_fields = ["name", "code", "email"]


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "organization", "phone", "is_active"]
    list_filter = ["organization", "is_active"]
    search_fields = ["name", "code"]


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "organization", "branch", "is_active"]
    list_filter = ["organization", "branch", "is_active"]
    search_fields = ["name", "code"]


@admin.register(Specialty)
class SpecialtyAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "organization", "is_active"]
    list_filter = ["organization", "is_active"]
    search_fields = ["name", "code"]
