import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone

from apps.core.models import TenantModel, current_org


class UserManager(BaseUserManager):
    """Manager for a username-less User model keyed on email."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("The email address must be set.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", User.ADMIN)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    ADMIN = "ADMIN"
    DOCTOR = "DOCTOR"
    NURSE = "NURSE"
    PHARMACIST = "PHARMACIST"
    LAB_TECH = "LAB_TECH"
    RADIOLOGIST = "RADIOLOGIST"
    RECEPTIONIST = "RECEPTIONIST"
    BILLING = "BILLING"
    PATIENT = "PATIENT"

    ROLE_CHOICES = [
        (ADMIN, "Admin"),
        (DOCTOR, "Doctor"),
        (NURSE, "Nurse"),
        (PHARMACIST, "Pharmacist"),
        (LAB_TECH, "Lab Technician"),
        (RADIOLOGIST, "Radiologist"),
        (RECEPTIONIST, "Receptionist"),
        (BILLING, "Billing"),
        (PATIENT, "Patient"),
    ]

    STAFF_ROLES = [ADMIN, DOCTOR, NURSE, PHARMACIST, LAB_TECH, RADIOLOGIST, RECEPTIONIST, BILLING]

    username = None
    email = models.EmailField(unique=True, verbose_name="Email address")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=PATIENT, verbose_name="Role")
    phone = models.CharField(max_length=20, blank=True, verbose_name="Phone")
    is_email_verified = models.BooleanField(default=False, verbose_name="Email verified")
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True, verbose_name="Avatar")
    organization = models.ForeignKey(
        "organizations.Organization",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="users",
        verbose_name="Organization",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["email"]

    def __str__(self):
        return f"{self.get_full_name() or self.email} ({self.role})"

    @property
    def is_staff_role(self):
        return self.is_superuser or self.role in self.STAFF_ROLES


class Invitation(TenantModel):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REVOKED = "REVOKED"
    EXPIRED = "EXPIRED"

    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (ACCEPTED, "Accepted"),
        (REVOKED, "Revoked"),
        (EXPIRED, "Expired"),
    ]

    email = models.EmailField(verbose_name="Email")
    role = models.CharField(max_length=20, choices=User.ROLE_CHOICES, verbose_name="Role")
    token = models.CharField(max_length=64, unique=True, verbose_name="Token")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING, verbose_name="Status")
    expires_at = models.DateTimeField(verbose_name="Expires at")
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="invitations_sent",
        verbose_name="Invited by",
    )

    class Meta:
        verbose_name = "Invitation"
        verbose_name_plural = "Invitations"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Invitation for {self.email} ({self.role})"

    @property
    def is_expired(self):
        return self.expires_at <= timezone.now()

    @classmethod
    def generate_token(cls):
        return secrets.token_urlsafe(32)

    @classmethod
    def create_for(cls, organization, email, role, invited_by, days_valid=7):
        token = cls.generate_token()
        while cls.objects.all_orgs().filter(token=token).exists():
            token = cls.generate_token()
        return cls.objects.create(
            organization=organization,
            email=email.lower(),
            role=role,
            token=token,
            expires_at=timezone.now() + timedelta(days=days_valid),
            invited_by=invited_by,
            created_by=invited_by,
        )
