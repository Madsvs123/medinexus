from decimal import Decimal, InvalidOperation

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from apps.clinical.models import Prescription
from apps.organizations.models import Branch

from .models import (
    Dispensation,
    DrugInteraction,
    Medication,
    MedicationBatch,
    StockReturn,
    StockTransfer,
    Supplier,
)

User = get_user_model()


class MedicationSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Medication
        fields = [
            "id",
            "code",
            "name",
            "generic_name",
            "category",
            "form",
            "strength",
            "unit",
            "price",
            "reorder_level",
            "current_stock",
            "is_low_stock",
            "is_controlled",
            "active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_code(self, value):
        value = value.strip().upper()
        return value


class DrugInteractionSerializer(serializers.ModelSerializer):
    medication_a = serializers.PrimaryKeyRelatedField(
        queryset=Medication.objects.all()
    )
    medication_b = serializers.PrimaryKeyRelatedField(
        queryset=Medication.objects.all()
    )
    medication_a_detail = MedicationSerializer(source="medication_a", read_only=True)
    medication_b_detail = MedicationSerializer(source="medication_b", read_only=True)

    class Meta:
        model = DrugInteraction
        fields = [
            "id",
            "medication_a",
            "medication_a_detail",
            "medication_b",
            "medication_b_detail",
            "severity",
            "description",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        a = attrs.get("medication_a") or getattr(self.instance, "medication_a", None)
        b = attrs.get("medication_b") or getattr(self.instance, "medication_b", None)
        if a and b and a.pk == b.pk:
            raise serializers.ValidationError(
                {"medication_b": "A medication cannot interact with itself."}
            )
        return attrs


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = [
            "id",
            "name",
            "contact_person",
            "phone",
            "email",
            "address",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class MedicationBatchSerializer(serializers.ModelSerializer):
    medication = serializers.PrimaryKeyRelatedField(queryset=Medication.objects.all())
    medication_detail = MedicationSerializer(source="medication", read_only=True)
    supplier = serializers.PrimaryKeyRelatedField(
        queryset=Supplier.objects.all(), required=False, allow_null=True
    )
    supplier_detail = SupplierSerializer(source="supplier", read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    days_to_expiry = serializers.IntegerField(read_only=True)
    expiring_soon = serializers.BooleanField(read_only=True)

    class Meta:
        model = MedicationBatch
        fields = [
            "id",
            "medication",
            "medication_detail",
            "batch_no",
            "supplier",
            "supplier_detail",
            "quantity",
            "expiry_date",
            "received_date",
            "unit_cost",
            "is_expired",
            "days_to_expiry",
            "expiring_soon",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class DispensationSerializer(serializers.ModelSerializer):
    prescription = serializers.PrimaryKeyRelatedField(
        queryset=Prescription.objects.all()
    )
    dispensed_by = serializers.PrimaryKeyRelatedField(read_only=True)
    dispensed_by_detail = serializers.SerializerMethodField()

    class Meta:
        model = Dispensation
        fields = [
            "id",
            "prescription",
            "dispensed_by",
            "dispensed_by_detail",
            "dispensed_at",
            "items",
            "status",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "dispensed_by", "dispensed_at", "created_at"]

    def get_dispensed_by_detail(self, obj):
        user = obj.dispensed_by
        if user is None:
            return None
        return {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
        }

    def _coerce_decimal(self, value, field_label):
        try:
            return Decimal(str(value))
        except (InvalidOperation, ValueError, TypeError):
            raise serializers.ValidationError(
                {field_label: "Invalid decimal value."}
            )

    def create(self, validated_data):
        prescription = validated_data["prescription"]
        items = validated_data.get("items") or []
        notes = validated_data.get("notes", "")
        status = validated_data.get("status", Dispensation.Status.COMPLETED)
        user = self.context["request"].user

        if prescription.status in (Prescription.Status.CANCELLED, Prescription.Status.COMPLETED):
            raise serializers.ValidationError(
                {"prescription": "This prescription cannot be dispensed (cancelled or completed)."}
            )
        if not items:
            raise serializers.ValidationError(
                {"items": "At least one item is required."}
            )

        with transaction.atomic():
            prepared = []
            for item in items:
                batch = MedicationBatch.objects.select_for_update().filter(
                    pk=item.get("batch_id")
                ).first()
                if batch is None:
                    raise serializers.ValidationError(
                        {"items": f"Batch {item.get('batch_id')} was not found."}
                    )
                try:
                    quantity = int(item.get("quantity"))
                except (TypeError, ValueError):
                    raise serializers.ValidationError(
                        {"items": f"Invalid quantity for batch {batch.batch_no}."}
                    )
                if quantity <= 0:
                    raise serializers.ValidationError(
                        {"items": "Quantity must be greater than zero."}
                    )
                if batch.quantity < quantity:
                    raise serializers.ValidationError(
                        {"items": f"Insufficient stock in batch {batch.batch_no} (available {batch.quantity})."}
                    )
                medication = batch.medication
                if medication.current_stock < quantity:
                    raise serializers.ValidationError(
                        {"items": f"Insufficient stock for {medication.name} (available {medication.current_stock})."}
                    )
                price = item.get("price")
                price = self._coerce_decimal(price, "items") if price is not None else medication.price
                prepared.append(
                    {
                        "batch": batch,
                        "medication": medication,
                        "quantity": quantity,
                        "price": price,
                    }
                )

            # Decrement batch + medication stock inside the lock.
            for entry in prepared:
                entry["batch"].quantity -= entry["quantity"]
                entry["batch"].save(
                    update_fields=["quantity", "updated_at"]
                )
                entry["medication"].current_stock -= entry["quantity"]
                entry["medication"].save(
                    update_fields=["current_stock", "updated_at"]
                )

            prior_dispensations = Dispensation.objects.filter(
                prescription=prescription
            ).count()

            dispensation = Dispensation.objects.create(
                organization=prescription.organization,
                prescription=prescription,
                dispensed_by=user,
                items=[
                    {
                        "medication_id": entry["medication"].id,
                        "batch_id": entry["batch"].id,
                        "quantity": entry["quantity"],
                        "price": str(entry["price"]),
                    }
                    for entry in prepared
                ],
                status=status,
                notes=notes,
                created_by=user,
            )

            # First fill → DISPENSED; any further fill on the same prescription
            # is treated as a partial refill.
            prescription.status = (
                Prescription.Status.PARTIALLY_DISPENSED
                if prior_dispensations > 0
                else Prescription.Status.DISPENSED
            )
            prescription.save(update_fields=["status", "updated_at"])

        return dispensation


class StockTransferSerializer(serializers.ModelSerializer):
    from_branch = serializers.PrimaryKeyRelatedField(queryset=Branch.objects.all())
    to_branch = serializers.PrimaryKeyRelatedField(queryset=Branch.objects.all())
    requested_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = StockTransfer
        fields = [
            "id",
            "from_branch",
            "to_branch",
            "items",
            "status",
            "requested_by",
            "completed_at",
            "completed_by",
            "created_at",
        ]
        read_only_fields = ["id", "status", "requested_by", "completed_at", "completed_by"]

    def validate(self, attrs):
        from_branch = attrs.get("from_branch")
        to_branch = attrs.get("to_branch")
        if from_branch and to_branch and from_branch.pk == to_branch.pk:
            raise serializers.ValidationError(
                {"to_branch": "Source and destination branches must differ."}
            )
        items = attrs.get("items") or []
        if not items:
            raise serializers.ValidationError(
                {"items": "At least one item is required."}
            )
        return attrs


class StockReturnSerializer(serializers.ModelSerializer):
    batch = serializers.PrimaryKeyRelatedField(queryset=MedicationBatch.objects.all())
    batch_detail = MedicationBatchSerializer(source="batch", read_only=True)
    returned_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = StockReturn
        fields = [
            "id",
            "batch",
            "batch_detail",
            "quantity",
            "reason",
            "returned_at",
            "returned_by",
            "created_at",
        ]
        read_only_fields = ["id", "returned_at", "returned_by", "created_at"]

    def create(self, validated_data):
        """Returned stock is added back to the batch and the medication."""
        batch = validated_data["batch"]
        quantity = validated_data["quantity"]
        user = self.context["request"].user
        with transaction.atomic():
            batch = MedicationBatch.objects.select_for_update().get(pk=batch.pk)
            batch.quantity += quantity
            batch.save(update_fields=["quantity", "updated_at"])
            medication = batch.medication
            medication.current_stock += quantity
            medication.save(update_fields=["current_stock", "updated_at"])
            stock_return = StockReturn.objects.create(
                organization=batch.organization,
                batch=batch,
                quantity=quantity,
                reason=validated_data.get("reason", ""),
                returned_by=user,
                created_by=user,
            )
        return stock_return
