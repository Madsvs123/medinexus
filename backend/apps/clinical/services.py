"""Clinical business logic — prescription safety evaluation."""
from django.db.models import Q


def evaluate_prescription(patient, medication, dosage):
    """Evaluate a prescription against the patient's allergies and drug interactions.

    Returns {"warnings": [{"type": "ALLERGY"|"INTERACTION", "severity", "message"}, ...]}.
    """
    warnings = []

    # 1. Patient allergies
    if patient is not None:
        medication_name = (getattr(medication, "name", "") or "").lower()
        generic_name = (getattr(medication, "generic_name", "") or "").lower()
        for allergy in patient.allergies.all():
            allergen = (allergy.allergen or "").lower()
            if allergen and (allergen in medication_name or allergen in generic_name):
                warnings.append(
                    {
                        "type": "ALLERGY",
                        "severity": allergy.severity,
                        "message": (
                            f"Patient is allergic to {allergy.allergen} "
                            f"(severity: {allergy.get_severity_display()})."
                        ),
                    }
                )

    # 2. Drug interactions from the pharmacy interaction catalog
    if medication is not None:
        try:
            from apps.pharmacy.models import DrugInteraction
        except ImportError:
            DrugInteraction = None

        if DrugInteraction is not None:
            interactions = DrugInteraction.objects.filter(
                Q(medication_a=medication) | Q(medication_b=medication)
            ).select_related("medication_a", "medication_b")
            for interaction in interactions:
                other = (
                    interaction.medication_b
                    if interaction.medication_a_id == medication.id
                    else interaction.medication_a
                )
                warnings.append(
                    {
                        "type": "INTERACTION",
                        "severity": interaction.severity,
                        "message": (
                            f"Interaction with {other.name}: {interaction.description} "
                            f"(severity: {interaction.get_severity_display()})."
                        ),
                    }
                )

    return {"warnings": warnings}


def block_severe_prescriptions_enabled(organization):
    """Read the OrganizationSettings flag; defaults to True when unavailable."""
    try:
        from apps.configuration.models import OrganizationSettings

        settings_obj, _ = OrganizationSettings.objects.get_or_create(organization=organization)
        return bool(settings_obj.block_severe_prescriptions)
    except Exception:
        return True
