from django.conf import settings
from django.db import models

from apps.core.models import TenantModel


class Encounter(TenantModel):
    TYPE_CHOICES = [
        ("OUTPATIENT", "Outpatient"),
        ("INPATIENT", "Inpatient"),
        ("EMERGENCY", "Emergency"),
        ("TELEHEALTH", "Telehealth"),
    ]
    STATUS_CHOICES = [
        ("OPEN", "Open"),
        ("IN_PROGRESS", "In progress"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
    ]

    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="encounters")
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="encounters"
    )
    department = models.ForeignKey(
        "organizations.Department", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="OUTPATIENT")
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="OPEN")
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    chief_complaint = models.CharField(max_length=255, blank=True)
    history_presenting_illness = models.TextField(blank=True)
    assessment = models.TextField(blank=True)
    plan = models.TextField(blank=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Encounter"
        verbose_name_plural = "Encounters"
        ordering = ["-started_at"]

    def __str__(self):
        return f"Encounter #{self.pk} — {self.patient}"


class VitalSigns(TenantModel):
    encounter = models.ForeignKey(Encounter, on_delete=models.CASCADE, related_name="vitals")
    recorded_at = models.DateTimeField(auto_now_add=True)
    bp_systolic = models.PositiveSmallIntegerField(null=True, blank=True)
    bp_diastolic = models.PositiveSmallIntegerField(null=True, blank=True)
    heart_rate = models.PositiveSmallIntegerField(null=True, blank=True)
    respiratory_rate = models.PositiveSmallIntegerField(null=True, blank=True)
    temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    spo2 = models.PositiveSmallIntegerField(null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    height_cm = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Vital Signs"
        verbose_name_plural = "Vital Signs"
        ordering = ["-recorded_at"]

    def __str__(self):
        return f"Vitals for encounter #{self.encounter_id} @ {self.recorded_at}"


class Diagnosis(TenantModel):
    TYPE_CHOICES = [
        ("PRIMARY", "Primary"),
        ("SECONDARY", "Secondary"),
        ("DIFFERENTIAL", "Differential"),
    ]
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("RESOLVED", "Resolved"),
    ]

    encounter = models.ForeignKey(Encounter, on_delete=models.CASCADE, related_name="diagnoses")
    name = models.CharField(max_length=255)
    icd_code = models.CharField(max_length=20, blank=True)
    type = models.CharField(max_length=15, choices=TYPE_CHOICES, default="PRIMARY")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="ACTIVE")
    notes = models.TextField(blank=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Diagnosis"
        verbose_name_plural = "Diagnoses"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.icd_code})"


class ClinicalNote(TenantModel):
    NOTE_TYPE_CHOICES = [
        ("PROGRESS", "Progress"),
        ("ADMISSION", "Admission"),
        ("OPERATION", "Operation"),
        ("DISCHARGE", "Discharge"),
        ("OTHER", "Other"),
    ]

    encounter = models.ForeignKey(Encounter, on_delete=models.CASCADE, related_name="notes")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    note_type = models.CharField(max_length=15, choices=NOTE_TYPE_CHOICES, default="PROGRESS")
    content = models.TextField()
    is_signed = models.BooleanField(default=False)
    signed_at = models.DateTimeField(null=True, blank=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Clinical Note"
        verbose_name_plural = "Clinical Notes"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Note #{self.pk} for encounter #{self.encounter_id}"


class TreatmentPlan(TenantModel):
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("COMPLETED", "Completed"),
        ("ON_HOLD", "On hold"),
    ]

    encounter = models.ForeignKey(Encounter, on_delete=models.CASCADE, related_name="treatment_plans")
    title = models.CharField(max_length=255)
    instructions = models.TextField(blank=True)
    goals = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="ACTIVE")

    class Meta(TenantModel.Meta):
        verbose_name = "Treatment Plan"
        verbose_name_plural = "Treatment Plans"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} — encounter #{self.encounter_id}"


class Prescription(TenantModel):
    ROUTE_CHOICES = [
        ("ORAL", "Oral"),
        ("IV", "Intravenous"),
        ("IM", "Intramuscular"),
        ("TOPICAL", "Topical"),
        ("INHALATION", "Inhalation"),
        ("SUBLINGUAL", "Sublingual"),
    ]
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("DISPENSED", "Dispensed"),
        ("PARTIALLY_DISPENSED", "Partially dispensed"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
    ]

    encounter = models.ForeignKey(Encounter, on_delete=models.CASCADE, related_name="prescriptions")
    medication = models.ForeignKey(
        "pharmacy.Medication", on_delete=models.PROTECT, related_name="prescriptions"
    )
    dosage = models.CharField(max_length=100)  # e.g. "500mg"
    frequency = models.CharField(max_length=100)  # e.g. "2x daily"
    route = models.CharField(max_length=15, choices=ROUTE_CHOICES, default="ORAL")
    duration_days = models.PositiveSmallIntegerField(null=True, blank=True)
    instructions = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ACTIVE")
    refills = models.PositiveSmallIntegerField(default=0)
    warnings = models.JSONField(default=list)

    class Meta(TenantModel.Meta):
        verbose_name = "Prescription"
        verbose_name_plural = "Prescriptions"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.medication} {self.dosage} for encounter #{self.encounter_id}"


class ProcedureRecord(TenantModel):
    encounter = models.ForeignKey(Encounter, on_delete=models.CASCADE, related_name="procedures")
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True)
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    performed_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    outcome = models.TextField(blank=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Procedure Record"
        verbose_name_plural = "Procedure Records"
        ordering = ["-performed_at"]

    def __str__(self):
        return f"{self.name} — encounter #{self.encounter_id}"


class Referral(TenantModel):
    PRIORITY_CHOICES = [
        ("ROUTINE", "Routine"),
        ("URGENT", "Urgent"),
    ]
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("ACCEPTED", "Accepted"),
        ("COMPLETED", "Completed"),
        ("DECLINED", "Declined"),
    ]

    encounter = models.ForeignKey(Encounter, on_delete=models.CASCADE, related_name="referrals")
    referring_doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    to_specialty = models.ForeignKey(
        "organizations.Specialty", on_delete=models.SET_NULL, null=True, related_name="+"
    )
    to_department = models.ForeignKey(
        "organizations.Department", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    reason = models.TextField(blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="ROUTINE")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="PENDING")
    notes = models.TextField(blank=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Referral"
        verbose_name_plural = "Referrals"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Referral #{self.pk} — {self.encounter}"


class FollowUp(TenantModel):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
    ]

    encounter = models.ForeignKey(Encounter, on_delete=models.CASCADE, related_name="follow_ups")
    scheduled_date = models.DateField()
    instructions = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="PENDING")

    class Meta(TenantModel.Meta):
        verbose_name = "Follow-up"
        verbose_name_plural = "Follow-ups"
        ordering = ["scheduled_date"]

    def __str__(self):
        return f"Follow-up {self.scheduled_date} — encounter #{self.encounter_id}"


class DischargeSummary(TenantModel):
    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("FINAL", "Final"),
    ]

    encounter = models.ForeignKey(
        Encounter, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    admission = models.ForeignKey(
        "inpatient.Admission", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    summary = models.TextField(blank=True)
    diagnosis_at_discharge = models.TextField(blank=True)
    medications_at_discharge = models.TextField(blank=True)
    follow_up_instructions = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="DRAFT")
    signed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    signed_at = models.DateTimeField(null=True, blank=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Discharge Summary"
        verbose_name_plural = "Discharge Summaries"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Discharge summary #{self.pk} ({self.status})"
