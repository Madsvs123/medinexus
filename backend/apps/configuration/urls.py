from rest_framework.routers import DefaultRouter

from .views import ImportJobViewSet, OrganizationSettingsViewSet

router = DefaultRouter()
router.register("settings", OrganizationSettingsViewSet, basename="organizationsettings")
router.register("imports", ImportJobViewSet, basename="importjob")

urlpatterns = router.urls
