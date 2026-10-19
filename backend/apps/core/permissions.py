from rest_framework.permissions import BasePermission, SAFE_METHODS

from apps.accounts.models import User
from apps.core.exceptions import TenantForbidden


class HasRole(BasePermission):
    """Allow access when the authenticated user holds any of the given roles."""

    def __init__(self, *roles):
        self.roles = set(roles)
        super().__init__()

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_superuser:
            return True
        return user.role in self.roles

    def __call__(self):
        return self


class IsOrgAdmin(BasePermission):
    """Allow access only to organization admins (or superusers)."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_superuser:
            return True
        return user.role == User.ADMIN and user.organization_id is not None


class IsStaffRole(BasePermission):
    """Allow access to any staff role (anything except PATIENT)."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_superuser:
            return True
        return user.role != User.PATIENT


class HasOrgAccess(BasePermission):
    """Object-level check: the object must belong to the user's organization."""

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        org_id = getattr(obj, "organization_id", None)
        if org_id is None:
            return True
        if user.is_superuser:
            return True
        if user.organization_id is None:
            raise TenantForbidden("You are not associated with an organization.")
        if org_id != user.organization_id:
            raise TenantForbidden("You do not have access to this resource.")
        return True
