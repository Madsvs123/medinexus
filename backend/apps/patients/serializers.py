from rest_framework import serializers

from .models import (
    ConsentRecord,
    EmergencyContact,
    Patient,
    PatientAllergy,
    PatientCondition,
    PatientDocument,
)


class PatientAllergySerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientAllergy
        fields = ["id", "patient", "allergen", "severity", "reaction", "notes", "created_at"]
        read_only_fields = ["created_at"]


class PatientConditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientCondition
        fields = ["id", "patient", "name", "icd_code", "diagnosed_date", "status", "notes", "created_at"]
        read_only_fields = ["created_at"]


class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = ["id", "patient", "name", "relation", "phone", "notes", "created_at"]
        read_only_fields = ["created_at"]


class PatientDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source="uploaded_by.get_full_name", read_only=True)

    class Meta:
        model = PatientDocument
        fields = [
            "id",
            "patient",
            "title",
            "category",
            "file",
            "uploaded_by",
            "uploaded_by_name",
            "notes",
            "created_at",
        ]
        read_only_fields = ["uploaded_by", "created_at"]


class ConsentRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsentRecord
        fields = [
            "id",
            "patient",
            "type",
            "description",
            "document",
            "signed_by",
            "signed_at",
            "status",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class PatientListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Patient
        fields = [
            "id",
            "mrn",
            "full_name",
            "first_name",
            "last_name",
            "gender",
            "date_of_birth",
            "blood_type",
            "phone",
            "email",
            "city",
            "status",
            "registration_date",
        ]
        read_only_fields = ["mrn", "registration_date"]


class PatientDetailSerializer(PatientListSerializer):
    allergies = PatientAllergySerializer(many=True, read_only=True)
    conditions = PatientConditionSerializer(many=True, read_only=True)
    contacts = EmergencyContactSerializer(many=True, read_only=True, source="emergency_contacts")
    documents = PatientDocumentSerializer(many=True, read_only=True)
    consents = ConsentRecordSerializer(many=True, read_only=True)
    insurance = serializers.SerializerMethodField()

    class Meta(PatientListSerializer.Meta):
        fields = PatientListSerializer.Meta.fields + [
            "address",
            "nationality",
            "marital_status",
            "occupation",
            "photo",
            "notes",
            "allergies",
            "conditions",
            "contacts",
            "documents",
            "consents",
            "insurance",
        ]

    def get_insurance(self, obj):
        try:
            from apps.billing.models import PatientInsurance
        except ImportError:
            return None
        payload = []
        for insurance in PatientInsurance.objects.filter(patient=obj):
            payload.append(
                {
                    "id": insurance.id,
                    "plan": insurance.plan_id,
                    "plan_name": getattr(insurance.plan, "name", None),
                    "policy_number": insurance.policy_number,
                    "coverage_percentage": (
                        str(insurance.coverage_percentage)
                        if insurance.coverage_percentage is not None
                        else None
                    ),
                    "valid_until": insurance.valid_until,
                    "is_primary": insurance.is_primary,
                }
            )
        return payload
