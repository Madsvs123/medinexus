"""Billing & Insurance serializers (per conventions §4.10)."""

from decimal import Decimal

from rest_framework import serializers

from .models import (
    Deposit,
    InsuranceClaim,
    InsurancePlan,
    Invoice,
    InvoiceItem,
    PatientInsurance,
    Payment,
    Refund,
    Service,
)


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = [
            "id",
            "code",
            "name",
            "category",
            "price",
            "tax_rate",
            "active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class InvoiceItemSerializer(serializers.ModelSerializer):
    service_id = serializers.PrimaryKeyRelatedField(
        source="service", queryset=Service.objects.all(), write_only=True
    )
    service = ServiceSerializer(read_only=True)
    unit_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )

    class Meta:
        model = InvoiceItem
        fields = ["id", "service_id", "service", "quantity", "unit_price", "discount", "tax", "line_total"]
        read_only_fields = ["id", "tax", "line_total"]

    def validate_unit_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Unit price cannot be negative.")
        return value

    def validate_discount(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Discount cannot be negative.")
        return value


class InvoiceSerializer(serializers.ModelSerializer):
    """Nested read-write items: ``items: [{service_id, quantity, unit_price?, discount?}]``."""

    items = InvoiceItemSerializer(many=True, required=False)
    patient_name = serializers.SerializerMethodField()
    outstanding = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    def get_patient_name(self, obj):
        patient = getattr(obj, "patient", None)
        if patient is None:
            return None
        return getattr(patient, "full_name", None) or str(patient)

    class Meta:
        model = Invoice
        fields = [
            "id",
            "patient",
            "patient_name",
            "encounter",
            "invoice_number",
            "items",
            "subtotal",
            "discount_total",
            "tax_total",
            "total",
            "paid_amount",
            "outstanding",
            "status",
            "issued_at",
            "due_date",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "invoice_number",
            "subtotal",
            "discount_total",
            "tax_total",
            "total",
            "paid_amount",
            "outstanding",
            "status",
            "issued_at",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        invoice = Invoice.objects.create(**validated_data)
        for item_data in items_data:
            service = item_data["service"]
            unit_price = item_data.get("unit_price") or service.price
            discount = item_data.get("discount", Decimal("0.00"))
            InvoiceItem.objects.create(
                invoice=invoice,
                service=service,
                quantity=item_data.get("quantity", 1),
                unit_price=unit_price,
                discount=discount,
            )
        invoice.recalculate()
        return invoice

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            InvoiceItem.objects.filter(invoice=instance).delete()
            for item_data in items_data:
                service = item_data["service"]
                unit_price = item_data.get("unit_price") or service.price
                InvoiceItem.objects.create(
                    invoice=instance,
                    service=service,
                    quantity=item_data.get("quantity", 1),
                    unit_price=unit_price,
                    discount=item_data.get("discount", Decimal("0.00")),
                )
            instance.recalculate()
        return instance


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "invoice",
            "patient",
            "amount",
            "method",
            "reference",
            "status",
            "paid_at",
            "received_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "paid_at", "received_by", "created_at", "updated_at"]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        invoice = attrs.get("invoice")
        amount = attrs.get("amount")
        if amount is not None and amount <= 0:
            raise serializers.ValidationError({"amount": "Amount must be positive."})
        if invoice is not None and amount is not None:
            outstanding = invoice.outstanding()
            if amount > outstanding:
                raise serializers.ValidationError(
                    {"amount": f"Amount exceeds outstanding balance ({outstanding})."}
                )
        return attrs


class RefundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Refund
        fields = [
            "id",
            "payment",
            "amount",
            "reason",
            "status",
            "processed_by",
            "processed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "processed_by", "processed_at", "created_at", "updated_at"]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        amount = attrs.get("amount")
        if amount is not None and amount <= 0:
            raise serializers.ValidationError({"amount": "Amount must be positive."})
        payment = attrs.get("payment") or getattr(self.instance, "payment", None)
        if payment is not None and payment.status != "COMPLETED":
            raise serializers.ValidationError({"payment": "Only completed payments can be refunded."})
        if amount is not None and payment is not None and amount > payment.amount:
            raise serializers.ValidationError(
                {"amount": "Refund cannot exceed the original payment amount."}
            )
        return attrs


class DepositSerializer(serializers.ModelSerializer):
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Deposit
        fields = [
            "id",
            "patient",
            "amount",
            "method",
            "reference",
            "applied_amount",
            "balance",
            "status",
            "received_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "applied_amount",
            "balance",
            "status",
            "received_by",
            "created_at",
            "updated_at",
        ]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be positive.")
        return value


class InsurancePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsurancePlan
        fields = [
            "id",
            "name",
            "carrier",
            "coverage_percentage",
            "notes",
            "active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_coverage_percentage(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("Coverage percentage must be between 0 and 100.")
        return value


class PatientInsuranceSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    effective_coverage = serializers.DecimalField(
        max_digits=5, decimal_places=2, read_only=True
    )

    class Meta:
        model = PatientInsurance
        fields = [
            "id",
            "patient",
            "plan",
            "plan_name",
            "policy_number",
            "coverage_percentage",
            "effective_coverage",
            "valid_until",
            "is_primary",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        patient = attrs.get("patient") or getattr(self.instance, "patient", None)
        is_primary = attrs.get("is_primary", getattr(self.instance, "is_primary", False))
        if is_primary and patient is not None:
            existing = PatientInsurance.objects.filter(
                patient=patient, is_primary=True
            ).exclude(pk=self.instance.pk if self.instance else None)
            if existing.exists():
                raise serializers.ValidationError(
                    {"is_primary": "This patient already has a primary insurance policy."}
                )
        return attrs

    def validate_coverage_percentage(self, value):
        if value is not None and (value < 0 or value > 100):
            raise serializers.ValidationError("Coverage percentage must be between 0 and 100.")
        return value


class ClaimSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)
    patient = serializers.IntegerField(source="invoice.patient_id", read_only=True)

    class Meta:
        model = InsuranceClaim
        fields = [
            "id",
            "invoice",
            "invoice_number",
            "patient",
            "patient_insurance",
            "claim_number",
            "submitted_amount",
            "approved_amount",
            "status",
            "submitted_at",
            "approved_at",
            "rejection_reason",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "claim_number",
            "status",
            "submitted_at",
            "approved_at",
            "created_at",
            "updated_at",
        ]

    def validate_submitted_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Submitted amount must be positive.")
        return value


class InvoiceDetailSerializer(InvoiceSerializer):
    """Invoice with embedded payments and claims."""

    payments = PaymentSerializer(many=True, read_only=True)
    claims = ClaimSerializer(many=True, read_only=True)

    class Meta(InvoiceSerializer.Meta):
        fields = InvoiceSerializer.Meta.fields + ["payments", "claims"]


class StatsSerializer(serializers.Serializer):
    revenue_today = serializers.DecimalField(max_digits=12, decimal_places=2)
    revenue_month = serializers.DecimalField(max_digits=12, decimal_places=2)
    outstanding = serializers.DecimalField(max_digits=12, decimal_places=2)
    overdue = serializers.DecimalField(max_digits=12, decimal_places=2)
    claims_pending = serializers.IntegerField()
    claims_approved = serializers.IntegerField()
