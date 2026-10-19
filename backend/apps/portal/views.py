"""Patient portal API — every action scoped to ``request.user.patient_profile``.

Read-only except appointments (booking), invoices (payment), documents
(consent upload) and messages (threads). 403 when no patient profile is
linked to the account.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import HasOrgAccess
from apps.core.views import TenantReadOnlyMixin


def _patient_profile(user):
    return getattr(user, "patient_profile", None)


def _no_profile():
    return Response(
        {"detail": "No patient profile linked to this account."},
        status=status.HTTP_403_FORBIDDEN,
    )


class PortalViewSet(TenantReadOnlyMixin, viewsets.GenericViewSet):
    """Patient-facing portal endpoints (prefix ``/api/v1/portal/``)."""

    permission_classes = [HasOrgAccess]

    def _require_patient(self):
        profile = _patient_profile(self.request.user)
        return profile

    # ---- summary ---------------------------------------------------------

    @action(detail=False, methods=["get"])
    def summary(self, request):
        profile = self._require_patient()
        if profile is None:
            return _no_profile()
        org = request.user.organization
        now = timezone.now()

        from apps.appointments.models import Appointment
        from apps.billing.models import Invoice
        from apps.laboratory.models import LabResult
        from apps.notifications.models import Notification

        upcoming = list(
            Appointment._base_manager.filter(
                organization_id=org.id,
                patient=profile,
                start__gte=now,
            )
            .exclude(status__in=["CANCELLED", "NO_SHOW"])
            .order_by("start")[:3]
        )
        unread = Notification._base_manager.filter(
            organization_id=org.id, recipient=request.user, is_read=False
        ).count()
        recent_results = list(
            LabResult._base_manager.filter(
                organization_id=org.id, order__patient=profile, status="APPROVED"
            ).order_by("-reviewed_at")[:5]
        )
        outstanding = 0.0
        for inv in Invoice._base_manager.filter(
            organization_id=org.id, patient=profile, status__in=["ISSUED", "PARTIAL"]
        ):
            outstanding += float(inv.total - inv.paid_amount)

        def _appt(a):
            return {
                "id": a.id,
                "doctor": a.doctor.get_full_name() if a.doctor else None,
                "department": a.department.name if a.department else None,
                "start": a.start.isoformat(),
                "end": a.end.isoformat() if a.end else None,
                "status": a.status,
                "reason": a.reason,
            }

        return Response(
            {
                "upcoming_appointments": [_appt(a) for a in upcoming],
                "unread_notifications": unread,
                "recent_results": [
                    {
                        "id": r.id,
                        "test": r.test.name if r.test else None,
                        "value": r.value,
                        "flag": r.flag,
                        "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
                    }
                    for r in recent_results
                ],
                "outstanding_balance": round(outstanding, 2),
                "next_appointment": _appt(upcoming[0]) if upcoming else None,
            }
        )

    # ---- appointments ----------------------------------------------------

    @action(detail=False, methods=["get", "post"])
    def appointments(self, request):
        profile = self._require_patient()
        if profile is None:
            return _no_profile()
        org = request.user.organization

        from apps.appointments.models import Appointment

        if request.method == "GET":
            now = timezone.now()
            qs = Appointment._base_manager.filter(organization_id=org.id, patient=profile)
            upcoming = request.query_params.get("upcoming", "true").lower() != "false"
            if upcoming:
                qs = qs.filter(start__gte=now).exclude(status__in=["CANCELLED", "NO_SHOW"])
            else:
                qs = qs.filter(start__lt=now)
            data = [
                {
                    "id": a.id,
                    "doctor": a.doctor.get_full_name() if a.doctor else None,
                    "department": a.department.name if a.department else None,
                    "start": a.start.isoformat(),
                    "end": a.end.isoformat() if a.end else None,
                    "type": a.type,
                    "status": a.status,
                    "reason": a.reason,
                }
                for a in qs.order_by("-start")[:50]
            ]
            return Response(data)

        # POST: book an appointment (doctor availability + overlap validation)
        doctor_id = request.data.get("doctor")
        start_raw = request.data.get("start")
        if not doctor_id or not start_raw:
            return Response(
                {"detail": "doctor and start (ISO-8601 datetime) are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            start = timezone.make_aware(timezone.datetime.fromisoformat(str(start_raw)))
        except ValueError:
            return Response(
                {"detail": "start must be an ISO-8601 datetime."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.appointments.models import Availability

        weekday = start.weekday()
        slot_start = start.time()
        slot_end = (start + timedelta(minutes=15)).time()

        avail = Availability._base_manager.filter(
            organization_id=org.id,
            doctor_id=doctor_id,
            weekday=weekday,
            is_active=True,
            start_time__lte=slot_start,
            end_time__gte=slot_end,
        )
        if not avail.exists():
            return Response(
                {"detail": "The doctor is not available at the requested time."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        overlap = Appointment._base_manager.filter(
            organization_id=org.id,
            doctor_id=doctor_id,
            start__lt=start + timedelta(minutes=15),
            start__gt=start - timedelta(minutes=15),
        ).exclude(status__in=["CANCELLED", "NO_SHOW"])
        patient_overlap = overlap.filter(patient=profile)
        if patient_overlap.exists():
            return Response(
                {"detail": "You already have an appointment at this time."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment = Appointment._base_manager.create(
            organization_id=org.id,
            created_by=request.user,
            patient=profile,
            doctor_id=doctor_id,
            department_id=request.data.get("department") or avail.first().department_id,
            start=start,
            end=start + timedelta(minutes=15),
            type=request.data.get("type", "CONSULTATION"),
            status="SCHEDULED",
            reason=request.data.get("reason", ""),
            notes=request.data.get("notes", ""),
        )
        return Response(
            {
                "id": appointment.id,
                "doctor": appointment.doctor.get_full_name() if appointment.doctor else None,
                "start": appointment.start.isoformat(),
                "status": appointment.status,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path=r"appointments/(?P<appointment_id>\d+)/cancel")
    def cancel_appointment(self, request, appointment_id=None):
        profile = self._require_patient()
        if profile is None:
            return _no_profile()
        org = request.user.organization

        from apps.appointments.models import Appointment

        appointment = Appointment._base_manager.filter(
            organization_id=org.id, pk=appointment_id, patient=profile
        ).first()
        if appointment is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if appointment.status in ("CANCELLED", "NO_SHOW", "COMPLETED"):
            return Response(
                {"detail": f"Appointment is already {appointment.status.lower()}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        appointment.status = "CANCELLED"
        appointment.cancelled_at = timezone.now()
        appointment.cancelled_by = request.user
        appointment.cancellation_reason = request.data.get("reason", "Cancelled by patient")
        appointment.save(update_fields=["status", "cancelled_at", "cancelled_by", "cancellation_reason"])
        return Response({"detail": "Appointment cancelled."})

    @action(detail=False, methods=["get"])
    def availability(self, request):
        """Doctor slots for a given date (patient booking)."""
        profile = self._require_patient()
        if profile is None:
            return _no_profile()
        org = request.user.organization
        doctor_id = request.query_params.get("doctor")
        day = request.query_params.get("date")
        if not doctor_id or not day:
            return Response(
                {"detail": "doctor and date query params are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            target = timezone.datetime.fromisoformat(str(day)).date()
        except ValueError:
            return Response({"detail": "date must be YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        from apps.appointments.models import Availability

        avail_rows = Availability._base_manager.filter(
            organization_id=org.id,
            doctor_id=doctor_id,
            weekday=target.weekday(),
            is_active=True,
        )
        slots = []
        for avail in avail_rows:
            if avail.valid_from and target < avail.valid_from:
                continue
            if avail.valid_until and target > avail.valid_until:
                continue
            cursor = timezone.datetime.combine(target, avail.start_time)
            end_of_day = timezone.datetime.combine(target, avail.end_time)
            while cursor + timedelta(minutes=avail.slot_minutes) <= end_of_day:
                slot_end = cursor + timedelta(minutes=avail.slot_minutes)
                slots.append(
                    {
                        "start": timezone.make_aware(cursor).isoformat(),
                        "end": timezone.make_aware(slot_end).isoformat(),
                    }
                )
                cursor = slot_end + timedelta(minutes=avail.buffer_minutes)
        return Response({"date": day, "slots": slots})

    @action(detail=False, methods=["get"])
    def doctors(self, request):
        """Active doctors for the patient's organization (booking picker)."""
        profile = self._require_patient()
        if profile is None:
            return _no_profile()
        org = request.user.organization

        User = get_user_model()
        qs = User.objects.filter(organization_id=org.id, role=User.DOCTOR, is_active=True)
        return Response(
            [
                {"id": u.id, "name": u.get_full_name() or u.email}
                for u in qs.order_by("first_name")[:100]
            ]
        )

    # ---- prescriptions ---------------------------------------------------

    @action(detail=False, methods=["get"])
    def prescriptions(self, request):
        profile = self._require_patient()
        if profile is None:
            return _no_profile()
        org = request.user.organization

        from apps.clinical.models import Prescription

        qs = Prescription._base_manager.filter(
            organization_id=org.id, encounter__patient=profile
        ).select_related("medication", "encounter")
        return Response(
            [
                {
                    "id": p.id,
                    "medication": p.medication.name if p.medication else None,
                    "dosage": p.dosage,
                    "frequency": p.frequency,
                    "route": p.route,
                    "duration_days": p.duration_days,
                    "instructions": p.instructions,
                    "status": p.status,
                    "refills": p.refills,
                    "prescribed_at": p.encounter.started_at.isoformat() if p.encounter and p.encounter.started_at else None,
                }
                for p in qs.order_by("-updated_at")[:50]
            ]
        )

    # ---- results ---------------------------------------------------------

    @action(detail=False, methods=["get"])
    def results(self, request):
        profile = self._require_patient()
        if profile is None:
            return _no_profile()
        org = request.user.organization

        from apps.laboratory.models import LabResult
        from apps.radiology.models import RadiologyReport

        lab = [
            {
                "type": "LAB",
                "id": r.id,
                "title": r.test.name if r.test else "Lab result",
                "detail": f"{r.value} {r.unit or ''}".strip(),
                "flag": r.flag,
                "date": (r.reviewed_at or r.created_at).isoformat(),
            }
            for r in LabResult._base_manager.filter(
                organization_id=org.id, order__patient=profile, status="APPROVED"
            )
        ]
        rad = [
            {
                "type": "RADIOLOGY",
                "id": rr.id,
                "title": f"{rr.order.modality if rr.order else ''} report".strip(),
                "detail": rr.impression or rr.findings or "",
                "flag": "NORMAL",
                "date": (rr.finalized_at or rr.created_at).isoformat(),
            }
            for rr in RadiologyReport._base_manager.filter(
                organization_id=org.id, order__patient=profile, status="FINAL"
            )
        ]
        merged = sorted(lab + rad, key=lambda x: x["date"], reverse=True)
        return Response(merged[:50])

    # ---- invoices --------------------------------------------------------

    @action(detail=False, methods=["get"])
    def invoices(self, request):
        profile = self._require_patient()
        if profile is None:
            return _no_profile()
        org = request.user.organization

        from apps.billing.models import Invoice

        qs = Invoice._base_manager.filter(organization_id=org.id, patient=profile).exclude(
            status="DRAFT"
        )
        return Response(
            [
                {
                    "id": inv.id,
                    "invoice_number": inv.invoice_number,
                    "issued_at": inv.issued_at.isoformat() if inv.issued_at else None,
                    "status": inv.status,
                    "total": float(inv.total),
                    "paid_amount": float(inv.paid_amount),
                    "balance": float(inv.total - inv.paid_amount),
                    "due_date": inv.due_date.isoformat() if inv.due_date else None,
                }
                for inv in qs.order_by("-issued_at")[:50]
            ]
        )

    @action(detail=False, methods=["post"], url_path=r"invoices/(?P<invoice_id>\d+)/pay")
    def pay_invoice(self, request, invoice_id=None):
        profile = self._require_patient()
        if profile is None:
            return _no_profile()
        org = request.user.organization

        from apps.billing.models import Invoice, Payment

        try:
            invoice = Invoice._base_manager.get(
                organization_id=org.id, patient=profile, pk=invoice_id
            )
        except Invoice.DoesNotExist:
            return Response(
                {"detail": "Invoice not found."}, status=status.HTTP_404_NOT_FOUND
            )
        if invoice.status not in ("ISSUED", "PARTIAL"):
            return Response(
                {"detail": f"Invoice is already {invoice.status.lower()}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            amount = float(request.data.get("amount") or 0)
        except (TypeError, ValueError):
            amount = 0
        balance = float(invoice.total - invoice.paid_amount)
        if amount <= 0 or amount > balance:
            return Response(
                {"detail": f"Amount must be between 0 and {balance}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        method = (request.data.get("method") or "ONLINE").upper()
        payment = Payment._base_manager.create(
            organization_id=org.id,
            created_by=request.user,
            invoice=invoice,
            patient=profile,
            amount=amount,
            method="ONLINE" if method not in ("CASH", "CARD", "BANK", "ONLINE") else method,
            status="PENDING",
            reference=request.data.get("reference") or "",
        )
        return Response(
            {
                "id": payment.id,
                "amount": float(payment.amount),
                "method": payment.method,
                "status": payment.status,
                "detail": "Payment recorded; it will be confirmed by the billing office.",
            },
            status=status.HTTP_201_CREATED,
        )

    # ---- documents (consent upload only) ---------------------------------

    @action(detail=False, methods=["get", "post"])
    def documents(self, request):
        profile = self._require_patient()
        if profile is None:
            return _no_profile()
        org = request.user.organization

        from apps.documents.models import Document

        if request.method == "GET":
            qs = Document._base_manager.filter(organization_id=org.id, patient=profile)
            return Response(
                [
                    {
                        "id": d.id,
                        "title": d.title,
                        "category": d.category,
                        "file": d.file.url if d.file else None,
                        "created_at": d.created_at.isoformat(),
                    }
                    for d in qs.order_by("-created_at")[:50]
                ]
            )

        title = (request.data.get("title") or "").strip()
        file = request.FILES.get("file")
        if not title or not file:
            return Response(
                {"detail": "title and file are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        document = Document._base_manager.create(
            organization_id=org.id,
            created_by=request.user,
            uploaded_by=request.user,
            patient=profile,
            title=title,
            category="CONSENT",
            file=file,
            notes=request.data.get("notes", ""),
        )
        return Response(
            {
                "id": document.id,
                "title": document.title,
                "category": document.category,
                "file": document.file.url if document.file else None,
            },
            status=status.HTTP_201_CREATED,
        )

    # ---- messages --------------------------------------------------------

    @action(detail=False, methods=["get"])
    def messages(self, request):
        profile = self._require_patient()
        if profile is None:
            return _no_profile()
        org = request.user.organization

        from apps.messaging.models import Thread

        qs = Thread._base_manager.filter(organization_id=org.id, participants=request.user)
        return Response(
            [
                {
                    "id": t.id,
                    "title": t.title or "Conversation",
                    "participants": [
                        {
                            "id": u.id,
                            "name": u.get_full_name() or u.email,
                            "role": u.role,
                        }
                        for u in t.participants.all()
                    ],
                    "last_message_at": t.last_message_at.isoformat() if t.last_message_at else None,
                }
                for t in qs.order_by("-last_message_at")[:50]
            ]
        )

    @action(detail=False, methods=["post"])
    def threads(self, request):
        profile = self._require_patient()
        if profile is None:
            return _no_profile()
        org = request.user.organization

        from apps.messaging.models import Thread

        participant_ids = request.data.get("participant_ids") or []
        if not isinstance(participant_ids, list) or not participant_ids:
            return Response(
                {"detail": "participant_ids (list) is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from django.contrib.auth import get_user_model

        User = get_user_model()
        participants = list(
            User._base_manager.filter(organization_id=org.id, pk__in=participant_ids)
        )
        if len(participants) != len(set(participant_ids)):
            return Response(
                {"detail": "One or more participants were not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        thread = Thread._base_manager.create(
            organization_id=org.id,
            created_by=request.user,
            title=request.data.get("title", ""),
        )
        thread.participants.add(request.user, *participants)
        thread.last_message_at = timezone.now()
        thread.save(update_fields=["last_message_at", "updated_at"])
        return Response(
            {"id": thread.id, "title": thread.title or "Conversation"},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get", "post"], url_path=r"threads/(?P<thread_id>\d+)/messages")
    def thread_messages(self, request, thread_id=None):
        profile = self._require_patient()
        if profile is None:
            return _no_profile()
        org = request.user.organization

        from apps.messaging.models import Message, Thread

        try:
            thread = Thread._base_manager.get(
                organization_id=org.id, pk=thread_id, participants=request.user
            )
        except Thread.DoesNotExist:
            return Response(
                {"detail": "Thread not found."}, status=status.HTTP_404_NOT_FOUND
            )

        if request.method == "GET":
            before = request.query_params.get("before")
            qs = Message._base_manager.filter(thread=thread).order_by("-sent_at", "-id")
            if before:
                try:
                    qs = qs.filter(sent_at__lt=timezone.datetime.fromisoformat(str(before)))
                except ValueError:
                    pass
            page = qs[:50]
            return Response(
                [
                    {
                        "id": m.id,
                        "body": m.body,
                        "sender": m.sender.get_full_name() or m.sender.email if m.sender else None,
                        "sent_at": m.sent_at.isoformat(),
                    }
                    for m in reversed(list(page))
                ]
            )

        body = (request.data.get("body") or "").strip()
        if not body:
            return Response(
                {"detail": "body is required."}, status=status.HTTP_400_BAD_REQUEST
            )
        message = Message._base_manager.create(
            organization_id=org.id,
            created_by=request.user,
            thread=thread,
            sender=request.user,
            body=body,
            attachment=request.FILES.get("attachment"),
        )
        thread.last_message_at = message.sent_at
        thread.save(update_fields=["last_message_at", "updated_at"])
        return Response(
            {
                "id": message.id,
                "body": message.body,
                "sender": request.user.get_full_name() or request.user.email,
                "sent_at": message.sent_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )

    # ---- notifications ---------------------------------------------------

    @action(detail=False, methods=["get"])
    def notifications(self, request):
        profile = self._require_patient()
        if profile is None:
            return _no_profile()
        org = request.user.organization

        from apps.notifications.models import Notification

        qs = Notification._base_manager.filter(
            organization_id=org.id, recipient=request.user
        )
        return Response(
            [
                {
                    "id": n.id,
                    "type": n.type,
                    "title": n.title,
                    "body": n.body,
                    "is_read": n.is_read,
                    "created_at": n.created_at.isoformat(),
                }
                for n in qs.order_by("-created_at")[:50]
            ]
        )
