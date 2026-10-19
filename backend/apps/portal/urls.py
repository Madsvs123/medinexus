from rest_framework.routers import DefaultRouter

from .views import PortalViewSet

router = DefaultRouter()
router.register("", PortalViewSet, basename="portal")

urlpatterns = router.urls
