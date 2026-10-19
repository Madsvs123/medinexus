from rest_framework.routers import DefaultRouter

from .views import FormSubmissionViewSet, FormTemplateViewSet

router = DefaultRouter()
router.register("templates", FormTemplateViewSet, basename="formtemplate")
router.register("submissions", FormSubmissionViewSet, basename="formsubmission")

urlpatterns = router.urls
