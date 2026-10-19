from django.conf import settings
from django.db import models

from apps.core.models import TenantModel


class Room(TenantModel):
    TYPE_CHOICES = [
        ("CONSULTATION", "Consultation"),
        ("EXAM", "Exam"),
        ("PROCEDURE", "Procedure"),
        ("EMERGENCY", "Emergency"),
    ]
    STATUS_CHOICES = [
        ("AVAILABLE", "Available"),
        ("OCCUPIED", "Occupied"),
        ("MAINTENANCE", "Maintenance"),
    ]

    name = models.CharField(max_length=150)
    department = models.ForeignKey(
        "organizations.Department", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="CONSULTATION")
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="AVAILABLE")

    class Meta(TenantModel.Meta):
        verbose_name = "Room"
        verbose_name_plural = "Rooms"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Availability(TenantModel):
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="availabilities"
    )
    department = models.ForeignKey(
        "organizations.Department", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    weekday = models.PositiveSmallIntegerField()  # 0=Monday ... 6=Sunday
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_minutes = models.PositiveSmallIntegerField(default=15)
    buffer_minutes = models.PositiveSmallIntegerField(default=5)
    valid_from = models.DateField(null=True, blank=True)
    valid_until = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Availability"
        verbose_name_plural = "Availabilities"
        ordering = ["weekday", "start_time"]

    def __str__(self):
        return f"{self.doctor} — weekday {self.weekday} {self.start_time}-{self.end_time}"


class RecurringRule(TenantModel):
    FREQUENCY_CHOICES = [
        ("DAILY", "Daily"),
        ("WEEKLY", "Weekly"),
        ("MONTHLY", "Monthly"),
    ]

    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="+")
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="recurring_rules"
    )
    department = models.ForeignKey(
        "organizations.Department", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    start_date = models.DateField()
    time = models.TimeField()
    duration_minutes = models.PositiveSmallIntegerField(default=30)
    frequency = models.CharField(max_length=10, choices=FREQUENCY_CHOICES, default="WEEKLY")
    interval = models.PositiveSmallIntegerField(default=1)
    weekday = models.PositiveSmallIntegerField(null=True, blank=True)  # for weekly rules
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Recurring Rule"
        verbose_name_plural = "Recurring Rules"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.doctor} — {self.frequency} for {self.patient}"


class Appointment(TenantModel):
    TYPE_CHOICES = [
        ("CONSULTATION", "Consultation"),
        ("FOLLOW_UP", "Follow-up"),
        ("PROCEDURE", "Procedure"),
        ("EMERGENCY", "Emergency"),
        ("TELEHEALTH", "Telehealth"),
    ]
    STATUS_CHOICES = [
        ("SCHEDULED", "Scheduled"),
        ("CONFIRMED", "Confirmed"),
        ("CHECKED_IN", "Checked in"),
        ("IN_PROGRESS", "In progress"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
        ("NO_SHOW", "No show"),
    ]

    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="appointments")
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="appointments"
    )
    department = models.ForeignKey(
        "organizations.Department", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    room = models.ForeignKey(Room, null=True, blank=True, on_delete=models.SET_NULL, related_name="appointments")
    start = models.DateTimeField()
    end = models.DateTimeField()
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="CONSULTATION")
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="SCHEDULED")
    reason = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.CharField(max_length=255, blank=True)
    recurring_rule = models.ForeignKey(
        RecurringRule, null=True, blank=True, on_delete=models.SET_NULL, related_name="appointments"
    )

    class Meta(TenantModel.Meta):
        verbose_name = "Appointment"
        verbose_name_plural = "Appointments"
        ordering = ["start"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "doctor", "start"],
                name="unique_appointment_slot",
            )
        ]

    def __str__(self):
        return f"{self.patient} with {self.doctor} @ {self.start}"


class AppointmentQueue(TenantModel):
    STATUS_CHOICES = [
        ("WAITING", "Waiting"),
        ("IN_PROGRESS", "In progress"),
        ("DONE", "Done"),
        ("SKIPPED", "Skipped"),
    ]

    appointment = models.OneToOneField(
        Appointment, on_delete=models.CASCADE, related_name="queue_entry"
    )
    position = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="WAITING")
    called_at = models.DateTimeField(null=True, blank=True)

    class Meta(TenantModel.Meta):
        verbose_name = "Appointment Queue Entry"
        verbose_name_plural = "Appointment Queue Entries"
        ordering = ["position"]

    def __str__(self):
        return f"Queue #{self.position} — {self.appointment}"
