from rest_framework.routers import DefaultRouter

from .views import (
    LabOrderViewSet,
    LabReportViewSet,
    LabResultViewSet,
    LabSampleViewSet,
    LabTestViewSet,
)

router = DefaultRouter()
router.register("tests", LabTestViewSet, basename="lab-test")
router.register("orders", LabOrderViewSet, basename="lab-order")
router.register("samples", LabSampleViewSet, basename="lab-sample")
router.register("results", LabResultViewSet, basename="lab-result")
router.register("reports", LabReportViewSet, basename="lab-report")

urlpatterns = router.urls
