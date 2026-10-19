from django.db import models

from apps.core.models import TenantModel


class Organization(models.Model):
    """Root tenant entity — NOT a TenantModel."""

    name = models.CharField(max_length=200, verbose_name="Name")
    code = models.CharField(max_length=10, unique=True, verbose_name="Code")
    logo = models.ImageField(upload_to="org_logos/", null=True, blank=True, verbose_name="Logo")
    primary_color = models.CharField(max_length=7, default="#0B6E4F", verbose_name="Primary color")
    report_footer = models.TextField(blank=True, verbose_name="Report footer")
    address = models.TextField(blank=True, verbose_name="Address")
    phone = models.CharField(max_length=30, blank=True, verbose_name="Phone")
    email = models.EmailField(blank=True, verbose_name="Email")
    timezone = models.CharField(max_length=64, default="UTC", verbose_name="Timezone")
    currency = models.CharField(max_length=8, default="USD", verbose_name="Currency")
    is_active = models.BooleanField(default=True, verbose_name="Active")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created at")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated at")

    class Meta:
        verbose_name = "Organization"
        verbose_name_plural = "Organizations"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.code})"

    def save(self, *args, **kwargs):
        self.code = (self.code or "").upper().strip()
        super().save(*args, **kwargs)


class Branch(TenantModel):
    name = models.CharField(max_length=200, verbose_name="Name")
    code = models.CharField(max_length=20, verbose_name="Code")
    address = models.TextField(blank=True, verbose_name="Address")
    phone = models.CharField(max_length=30, blank=True, verbose_name="Phone")
    is_active = models.BooleanField(default=True, verbose_name="Active")

    class Meta(TenantModel.Meta):
        verbose_name = "Branch"
        verbose_name_plural = "Branches"

    def __str__(self):
        return self.name


class Department(TenantModel):
    name = models.CharField(max_length=200, verbose_name="Name")
    code = models.CharField(max_length=20, verbose_name="Code")
    branch = models.ForeignKey(
        Branch, null=True, blank=True, on_delete=models.SET_NULL, related_name="departments", verbose_name="Branch"
    )
    description = models.TextField(blank=True, verbose_name="Description")
    is_active = models.BooleanField(default=True, verbose_name="Active")

    class Meta(TenantModel.Meta):
        verbose_name = "Department"
        verbose_name_plural = "Departments"

    def __str__(self):
        return self.name


class Specialty(TenantModel):
    name = models.CharField(max_length=200, verbose_name="Name")
    code = models.CharField(max_length=20, verbose_name="Code")
    description = models.TextField(blank=True, verbose_name="Description")
    is_active = models.BooleanField(default=True, verbose_name="Active")

    class Meta(TenantModel.Meta):
        verbose_name = "Specialty"
        verbose_name_plural = "Specialties"

    def __str__(self):
        return self.name
