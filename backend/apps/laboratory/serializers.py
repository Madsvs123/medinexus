from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.patients.models import Patient

from .models import LabOrder, LabReport, LabResult, LabSample, LabTest

User = get_user_model()


class LabTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTest
        fields = [
            "id",
            "code",
            "name",
            "category",
            "sample_type",
            "unit",
            "ref_range_low",
            "ref_range_high",
            "price",
            "active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_code(self, value):
        return value.strip().upper()


class PatientBriefSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Patient
        fields = ["id", "mrn", "first_name", "last_name", "full_name"]


class LabOrderSerializer(serializers.ModelSerializer):
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    patient_detail = PatientBriefSerializer(source="patient", read_only=True)
    tests = serializers.PrimaryKeyRelatedField(
        queryset=LabTest.objects.all(), many=True
    )
    ordered_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = LabOrder
        fields = [
            "id",
            "patient",
            "patient_detail",
            "encounter",
            "tests",
            "priority",
            "status",
            "ordered_by",
            "ordered_at",
            "notes",
            "result_reported_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "ordered_by",
            "ordered_at",
            "result_reported_at",
            "created_at",
        ]

    def validate_tests(self, tests):
        if not tests:
            raise serializers.ValidationError("At least one test is required.")
        return tests

    def create(self, validated_data):
        tests = validated_data.pop("tests")
        user = self.context["request"].user
        order = LabOrder.objects.create(
            **validated_data, ordered_by=user, created_by=user
        )
        order.tests.set(tests)
        # Auto-create one sample per test (they await results entry; the
        # ``collect`` action stamps the physical collection event).
        for test in tests:
            LabSample.objects.create(
                organization=order.organization,
                order=order,
                test=test,
                created_by=user,
            )
        return order


class LabSampleSerializer(serializers.ModelSerializer):
    order = serializers.PrimaryKeyRelatedField(queryset=LabOrder.objects.all())
    order_detail = LabOrderSerializer(source="order", read_only=True)
    test = serializers.PrimaryKeyRelatedField(queryset=LabTest.objects.all())
    test_detail = LabTestSerializer(source="test", read_only=True)
    collected_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = LabSample
        fields = [
            "id",
            "order",
            "order_detail",
            "test",
            "test_detail",
            "sample_id",
            "collected_by",
            "collected_at",
            "status",
            "rejection_reason",
            "created_at",
        ]
        read_only_fields = ["id", "sample_id", "collected_by", "collected_at", "created_at"]

    def validate(self, attrs):
        status = attrs.get("status", getattr(self.instance, "status", None))
        rejection_reason = attrs.get(
            "rejection_reason", getattr(self.instance, "rejection_reason", "")
        )
        if status == LabSample.Status.REJECTED and not rejection_reason.strip():
            raise serializers.ValidationError(
                {"rejection_reason": "A rejection reason is required when rejecting a sample."}
            )
        return attrs


class LabResultSerializer(serializers.ModelSerializer):
    order = serializers.PrimaryKeyRelatedField(queryset=LabOrder.objects.all())
    order_detail = LabOrderSerializer(source="order", read_only=True)
    test = serializers.PrimaryKeyRelatedField(queryset=LabTest.objects.all())
    test_detail = LabTestSerializer(source="test", read_only=True)
    reviewed_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = LabResult
        fields = [
            "id",
            "order",
            "order_detail",
            "test",
            "test_detail",
            "value",
            "unit",
            "flag",
            "status",
            "reviewed_by",
            "reviewed_at",
            "notes",
            "attachment",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "flag",
            "status",
            "reviewed_by",
            "reviewed_at",
            "created_at",
        ]


class LabReportSerializer(serializers.ModelSerializer):
    order = serializers.PrimaryKeyRelatedField(read_only=True)
    generated_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = LabReport
        fields = [
            "id",
            "order",
            "file",
            "generated_by",
            "generated_at",
            "created_at",
        ]
        read_only_fields = ["id", "file", "generated_by", "generated_at", "created_at"]
