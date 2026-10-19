from django.conf import settings
from django.db import models

from apps.core.models import TenantModel


class Ward(TenantModel):
    name = models.CharField(max_length=150)
    department = models.ForeignKey(
        "organizations.Department", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    location = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Ward"
        verbose_name_plural = "Wards"
        ordering = ["name"]

    def __str__(self):
        return self.name


class InpatientRoom(TenantModel):
    ROOM_TYPE_CHOICES = [
        ("PRIVATE", "Private"),
        ("SEMI_PRIVATE", "Semi-private"),
        ("GENERAL", "General"),
        ("ICU", "ICU"),
    ]

    ward = models.ForeignKey(Ward, on_delete=models.CASCADE, related_name="rooms")
    room_number = models.CharField(max_length=20)
    room_type = models.CharField(max_length=15, choices=ROOM_TYPE_CHOICES, default="GENERAL")
    is_active = models.BooleanField(default=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Inpatient Room"
        verbose_name_plural = "Inpatient Rooms"
        ordering = ["room_number"]
        constraints = [
            models.UniqueConstraint(fields=["ward", "room_number"], name="unique_ward_room_number")
        ]

    def __str__(self):
        return f"{self.ward.name} — {self.room_number}"


class Bed(TenantModel):
    STATUS_CHOICES = [
        ("AVAILABLE", "Available"),
        ("OCCUPIED", "Occupied"),
        ("MAINTENANCE", "Maintenance"),
    ]

    room = models.ForeignKey(InpatientRoom, on_delete=models.CASCADE, related_name="beds")
    bed_number = models.CharField(max_length=20)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="AVAILABLE")
    notes = models.TextField(blank=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Bed"
        verbose_name_plural = "Beds"
        ordering = ["bed_number"]
        constraints = [
            models.UniqueConstraint(fields=["room", "bed_number"], name="unique_room_bed_number")
        ]

    def __str__(self):
        return f"{self.room.room_number} — {self.bed_number}"


class Admission(TenantModel):
    ADMISSION_TYPE_CHOICES = [
        ("EMERGENCY", "Emergency"),
        ("ELECTIVE", "Elective"),
        ("TRANSFER", "Transfer"),
    ]
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("DISCHARGED", "Discharged"),
        ("TRANSFERRED", "Transferred"),
    ]

    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="admissions")
    bed = models.ForeignKey(Bed, null=True, blank=True, on_delete=models.SET_NULL, related_name="admissions")
    admitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    admitted_at = models.DateTimeField(auto_now_add=True)
    expected_discharge_date = models.DateField(null=True, blank=True)
    admission_type = models.CharField(max_length=10, choices=ADMISSION_TYPE_CHOICES, default="ELECTIVE")
    diagnosis_on_admission = models.TextField(blank=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="ACTIVE")
    discharged_at = models.DateTimeField(null=True, blank=True)
    discharged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    class Meta(TenantModel.Meta):
        verbose_name = "Admission"
        verbose_name_plural = "Admissions"
        ordering = ["-admitted_at"]

    def __str__(self):
        return f"Admission #{self.pk} — {self.patient}"


class PatientTransfer(TenantModel):
    admission = models.ForeignKey(Admission, on_delete=models.CASCADE, related_name="transfers")
    from_bed = models.ForeignKey(Bed, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    to_bed = models.ForeignKey(Bed, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    reason = models.CharField(max_length=255, blank=True)
    transferred_at = models.DateTimeField(auto_now_add=True)
    transferred_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta(TenantModel.Meta):
        verbose_name = "Patient Transfer"
        verbose_name_plural = "Patient Transfers"
        ordering = ["-transferred_at"]

    def __str__(self):
        return f"Transfer #{self.pk} — admission #{self.admission_id}"


class NursingObservation(TenantModel):
    CONSCIOUSNESS_CHOICES = [
        ("ALERT", "Alert"),
        ("RESPONSIVE", "Responsive"),
        ("UNRESPONSIVE", "Unresponsive"),
        ("OTHER", "Other"),
    ]

    admission = models.ForeignKey(Admission, on_delete=models.CASCADE, related_name="observations")
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    recorded_at = models.DateTimeField(auto_now_add=True)
    bp_systolic = models.PositiveSmallIntegerField(null=True, blank=True)
    bp_diastolic = models.PositiveSmallIntegerField(null=True, blank=True)
    heart_rate = models.PositiveSmallIntegerField(null=True, blank=True)
    respiratory_rate = models.PositiveSmallIntegerField(null=True, blank=True)
    temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    spo2 = models.PositiveSmallIntegerField(null=True, blank=True)
    consciousness = models.CharField(max_length=15, choices=CONSCIOUSNESS_CHOICES, default="ALERT")
    notes = models.TextField(blank=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Nursing Observation"
        verbose_name_plural = "Nursing Observations"
        ordering = ["-recorded_at"]

    def __str__(self):
        return f"Observation #{self.pk} — admission #{self.admission_id}"


class MedicationAdministration(TenantModel):
    ROUTE_CHOICES = [
        ("ORAL", "Oral"),
        ("IV", "Intravenous"),
        ("IM", "Intramuscular"),
        ("TOPICAL", "Topical"),
        ("INHALATION", "Inhalation"),
        ("SUBLINGUAL", "Sublingual"),
    ]
    STATUS_CHOICES = [
        ("SCHEDULED", "Scheduled"),
        ("GIVEN", "Given"),
        ("SKIPPED", "Skipped"),
        ("HELD", "Held"),
        ("REFUSED", "Refused"),
    ]

    admission = models.ForeignKey(Admission, on_delete=models.CASCADE, related_name="medications")
    prescription = models.ForeignKey(
        "clinical.Prescription", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    medication = models.ForeignKey(
        "pharmacy.Medication", on_delete=models.PROTECT, related_name="+"
    )
    dose = models.CharField(max_length=100, blank=True)
    route = models.CharField(max_length=15, choices=ROUTE_CHOICES, default="ORAL")
    scheduled_time = models.DateTimeField(null=True, blank=True)
    given_at = models.DateTimeField(null=True, blank=True)
    given_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="SCHEDULED")
    notes = models.TextField(blank=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Medication Administration"
        verbose_name_plural = "Medication Administrations"
        ordering = ["scheduled_time"]

    def __str__(self):
        return f"{self.medication} {self.dose} — admission #{self.admission_id}"


class DoctorRound(TenantModel):
    admission = models.ForeignKey(Admission, on_delete=models.CASCADE, related_name="rounds")
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="doctor_rounds"
    )
    round_time = models.DateTimeField(auto_now_add=True)
    findings = models.TextField(blank=True)
    plan = models.TextField(blank=True)
    orders = models.TextField(blank=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Doctor Round"
        verbose_name_plural = "Doctor Rounds"
        ordering = ["-round_time"]

    def __str__(self):
        return f"Round #{self.pk} — admission #{self.admission_id}"


class CarePlan(TenantModel):
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("COMPLETED", "Completed"),
        ("ON_HOLD", "On hold"),
    ]

    admission = models.ForeignKey(Admission, on_delete=models.CASCADE, related_name="care_plans")
    title = models.CharField(max_length=255)
    goals = models.TextField(blank=True)
    interventions = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="ACTIVE")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta(TenantModel.Meta):
        verbose_name = "Care Plan"
        verbose_name_plural = "Care Plans"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} — admission #{self.admission_id}"


class Discharge(TenantModel):
    DISCHARGE_TYPE_CHOICES = [
        ("HOME", "Home"),
        ("TRANSFER", "Transfer"),
        ("AMA", "Against medical advice"),
        ("DECEASED", "Deceased"),
    ]
    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("FINAL", "Final"),
    ]

    admission = models.OneToOneField(Admission, on_delete=models.CASCADE, related_name="discharge")
    discharged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    discharged_at = models.DateTimeField(null=True, blank=True)
    discharge_type = models.CharField(max_length=10, choices=DISCHARGE_TYPE_CHOICES, default="HOME")
    summary = models.TextField(blank=True)
    medications_at_discharge = models.TextField(blank=True)
    follow_up_instructions = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="DRAFT")

    class Meta(TenantModel.Meta):
        verbose_name = "Discharge"
        verbose_name_plural = "Discharges"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Discharge #{self.pk} — admission #{self.admission_id}"
