from rest_framework.routers import DefaultRouter

from .views import (
    AlertsViewSet,
    DispensationViewSet,
    DrugInteractionViewSet,
    MedicationBatchViewSet,
    MedicationViewSet,
    StockReturnViewSet,
    StockTransferViewSet,
    SupplierViewSet,
)

router = DefaultRouter()
router.register("medications", MedicationViewSet, basename="medication")
router.register("interactions", DrugInteractionViewSet, basename="drug-interaction")
router.register("suppliers", SupplierViewSet, basename="supplier")
router.register("batches", MedicationBatchViewSet, basename="medication-batch")
router.register("dispensations", DispensationViewSet, basename="dispensation")
router.register("transfers", StockTransferViewSet, basename="stock-transfer")
router.register("returns", StockReturnViewSet, basename="stock-return")
router.register("alerts", AlertsViewSet, basename="pharmacy-alerts")

urlpatterns = router.urls
