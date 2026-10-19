"""
MediNexus — root URL configuration.

Central registration of every module's API under /api/v1/, plus the
drf-spectacular schema endpoints and a health probe.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView


def health(_request):
    return JsonResponse({"status": "ok", "service": "medinexus-api", "version": "1.0.0"})


api_v1 = [
    path("auth/", include("apps.accounts.urls")),
    path("organizations/", include("apps.organizations.urls")),
    path("patients/", include("apps.patients.urls")),
    path("appointments/", include("apps.appointments.urls")),
    path("encounters/", include("apps.clinical.urls")),
    path("vitals/", include("apps.clinical.vitals_urls")),
    path("diagnoses/", include("apps.clinical.diagnoses_urls")),
    path("notes/", include("apps.clinical.notes_urls")),
    path("treatment-plans/", include("apps.clinical.treatment_plans_urls")),
    path("prescriptions/", include("apps.clinical.prescriptions_urls")),
    path("procedures/", include("apps.clinical.procedures_urls")),
    path("lab-orders/", include("apps.clinical.lab_orders_urls")),
    path("radiology-orders/", include("apps.clinical.radiology_orders_urls")),
    path("referrals/", include("apps.clinical.referrals_urls")),
    path("follow-ups/", include("apps.clinical.follow_ups_urls")),
    path("discharge-summaries/", include("apps.clinical.discharge_summaries_urls")),
    path("inpatient/", include("apps.inpatient.urls")),
    path("pharmacy/", include("apps.pharmacy.urls")),
    path("laboratory/", include("apps.laboratory.urls")),
    path("radiology/", include("apps.radiology.urls")),
    path("billing/", include("apps.billing.urls")),
    path("notifications/", include("apps.notifications.urls")),
    path("messages/", include("apps.messaging.urls")),
    path("audit/", include("apps.audit.urls")),
    path("tasks/", include("apps.tasks.urls")),
    path("documents/", include("apps.documents.urls")),
    path("forms/", include("apps.forms.urls")),
    path("reports/", include("apps.reports.urls")),
    path("search/", include("apps.search.urls")),
    path("configuration/", include("apps.configuration.urls")),
    path("portal/", include("apps.portal.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_v1)),
    path("api/v1/health/", health, name="health"),
    path("api/docs/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/docs/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
