from rest_framework.routers import DefaultRouter

from .views import AnalyticsViewSet, ReportViewSet

router = DefaultRouter()
router.register("analytics", AnalyticsViewSet, basename="analytics")
router.register("generated", ReportViewSet, basename="report")

urlpatterns = router.urls
