"""Billing & Insurance API routes (mounted by lead at /api/v1/billing/)."""

from rest_framework.routers import DefaultRouter

from .views import (
    DepositViewSet,
    InsuranceClaimViewSet,
    InsurancePlanViewSet,
    InvoiceViewSet,
    PatientInsuranceViewSet,
    PaymentViewSet,
    RefundViewSet,
    ServiceViewSet,
    StatsViewSet,
)

router = DefaultRouter()
router.register("services", ServiceViewSet, basename="service")
router.register("invoices", InvoiceViewSet, basename="invoice")
router.register("payments", PaymentViewSet, basename="payment")
router.register("refunds", RefundViewSet, basename="refund")
router.register("deposits", DepositViewSet, basename="deposit")
router.register("insurance-plans", InsurancePlanViewSet, basename="insurance-plan")
router.register("patient-insurance", PatientInsuranceViewSet, basename="patient-insurance")
router.register("claims", InsuranceClaimViewSet, basename="claim")
router.register("stats", StatsViewSet, basename="stats")

urlpatterns = router.urls
