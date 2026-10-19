from rest_framework.routers import DefaultRouter

from .views import RadiologyOrderViewSet, RadiologyReportViewSet

router = DefaultRouter()
router.register("orders", RadiologyOrderViewSet, basename="radiology-order")
router.register("reports", RadiologyReportViewSet, basename="radiology-report")

urlpatterns = router.urls
