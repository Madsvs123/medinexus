from rest_framework.exceptions import APIException


class TenantForbidden(APIException):
    """Raised when a tenant-scoped object does not belong to the current org."""

    status_code = 403
    default_detail = "You do not have access to this resource."
    default_code = "tenant_forbidden"
