from django.db.models import Q
from rest_framework import viewsets
from rest_framework.response import Response

from apps.core.permissions import HasOrgAccess
from apps.core.views import TenantReadOnlyMixin

MAX_PER_TYPE = 10


class SearchViewSet(TenantReadOnlyMixin, viewsets.GenericViewSet):
    """Global cross-module search.

    ``GET /search/?q=term&type=patients|encounters|prescriptions|invoices|
    medications|tests|users``

    Staff may search all types; patients only see their own data
    (patients/encounters/prescriptions/invoices). Results are grouped by type,
    max 10 per type: ``{type: [{id, label, subtitle, url}]}``.
    """

    permission_classes = [HasOrgAccess]

    def list(self, request):
        q = (request.query_params.get("q") or "").strip()
        requested = request.query_params.get("type", "")
        types = [t.strip() for t in requested.split(",") if t.strip()] if requested else []
        if not q:
            return Response({})

        is_patient = request.user.role == "PATIENT"
        profile = getattr(request.user, "patient_profile", None)
        org_id = request.user.organization_id

        results = {}
        if is_patient:
            if not profile:
                return Response({})
            allowed = {"patients", "encounters", "prescriptions", "invoices"}
            for t in (types or list(allowed)):
                if t in allowed:
                    handler = getattr(self, f"_search_{t}", None)
                    if handler:
                        results[t] = handler(q, org_id, patient=profile)[:MAX_PER_TYPE]
            return Response(results)

        for t in types or [
            "patients", "encounters", "prescriptions", "invoices",
            "medications", "tests", "users",
        ]:
            handler = getattr(self, f"_search_{t}", None)
            if handler:
                results[t] = handler(q, org_id)[:MAX_PER_TYPE]
        return Response(results)

    # ---- staff searches -------------------------------------------------

    def _search_patients(self, q, org_id, patient=None):
        from apps.patients.models import Patient

        qs = Patient._base_manager.filter(organization_id=org_id)
        if patient is not None:
            qs = qs.filter(pk=patient.pk)
        qs = qs.filter(
            Q(first_name__icontains=q)
            | Q(last_name__icontains=q)
            | Q(mrn__icontains=q)
            | Q(phone__icontains=q)
        )
        return [
            {
                "id": p.pk,
                "label": p.full_name,
                "subtitle": f"{p.mrn} · {p.gender or '—'}",
                "url": f"/patients/{p.pk}",
            }
            for p in qs[:MAX_PER_TYPE]
        ]

    def _search_encounters(self, q, org_id, patient=None):
        from apps.clinical.models import Encounter

        qs = Encounter._base_manager.filter(organization_id=org_id)
        if patient is not None:
            qs = qs.filter(patient=patient)
        qs = qs.filter(
            Q(patient__first_name__icontains=q)
            | Q(patient__last_name__icontains=q)
            | Q(patient__mrn__icontains=q)
            | Q(chief_complaint__icontains=q)
        )
        return [
            {
                "id": e.pk,
                "label": f"Encounter #{e.pk}",
                "subtitle": f"{e.patient.full_name} · {e.type} · {e.status}",
                "url": f"/encounters/{e.pk}",
            }
            for e in qs[:MAX_PER_TYPE]
        ]

    def _search_prescriptions(self, q, org_id, patient=None):
        from apps.clinical.models import Prescription

        qs = Prescription._base_manager.filter(organization_id=org_id)
        if patient is not None:
            qs = qs.filter(encounter__patient=patient)
        qs = qs.filter(
            Q(medication__name__icontains=q)
            | Q(medication__code__icontains=q)
            | Q(encounter__patient__first_name__icontains=q)
            | Q(encounter__patient__last_name__icontains=q)
            | Q(dosage__icontains=q)
        )
        return [
            {
                "id": p.pk,
                "label": f"Rx: {p.medication.name if p.medication else '—'} {p.dosage or ''}".strip(),
                "subtitle": f"{p.encounter.patient.full_name if p.encounter else '—'} · {p.status}",
                "url": f"/prescriptions/{p.pk}",
            }
            for p in qs[:MAX_PER_TYPE]
        ]

    def _search_invoices(self, q, org_id, patient=None):
        from apps.billing.models import Invoice

        qs = Invoice._base_manager.filter(organization_id=org_id)
        if patient is not None:
            qs = qs.filter(patient=patient)
        qs = qs.filter(
            Q(invoice_number__icontains=q)
            | Q(patient__first_name__icontains=q)
            | Q(patient__last_name__icontains=q)
            | Q(patient__mrn__icontains=q)
        )
        return [
            {
                "id": inv.pk,
                "label": inv.invoice_number,
                "subtitle": f"{inv.patient.full_name if inv.patient else '—'} · {inv.status} · {inv.total}",
                "url": f"/invoices/{inv.pk}",
            }
            for inv in qs[:MAX_PER_TYPE]
        ]

    def _search_medications(self, q, org_id, patient=None):
        from apps.pharmacy.models import Medication

        qs = Medication._base_manager.filter(organization_id=org_id).filter(
            Q(name__icontains=q) | Q(generic_name__icontains=q) | Q(code__icontains=q)
        )
        return [
            {
                "id": m.pk,
                "label": m.name,
                "subtitle": f"{m.code} · {m.strength or ''} · stock {m.current_stock}".strip(),
                "url": f"/pharmacy/medications/{m.pk}",
            }
            for m in qs[:MAX_PER_TYPE]
        ]

    def _search_tests(self, q, org_id, patient=None):
        from apps.laboratory.models import LabTest

        qs = LabTest._base_manager.filter(organization_id=org_id).filter(
            Q(name__icontains=q) | Q(code__icontains=q)
        )
        return [
            {
                "id": t.pk,
                "label": t.name,
                "subtitle": f"{t.code} · {t.category}",
                "url": f"/laboratory/tests/{t.pk}",
            }
            for t in qs[:MAX_PER_TYPE]
        ]

    def _search_users(self, q, org_id, patient=None):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        qs = User._base_manager.filter(organization_id=org_id).filter(
            Q(first_name__icontains=q)
            | Q(last_name__icontains=q)
            | Q(email__icontains=q)
        )
        return [
            {
                "id": u.pk,
                "label": u.get_full_name() or u.email,
                "subtitle": f"{u.email} · {u.role}",
                "url": f"/users/{u.pk}",
            }
            for u in qs[:MAX_PER_TYPE]
        ]
