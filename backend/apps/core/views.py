from rest_framework import viewsets


class TenantViewSetMixin:
    """Base mixin for all tenant-scoped viewsets.

    ``get_queryset()`` delegates to the model's tenant manager (which already
    filters by ``current_org``); ``perform_create()`` injects the organization
    and ``created_by`` from the request context.
    """

    def get_queryset(self):
        assert self.queryset is not None, (
            "'%s' should either include a `queryset` attribute, or override the `get_queryset()` method."
            % self.__class__.__name__
        )
        return self.queryset.model.objects.all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user if self.request.user.is_authenticated else None)


class TenantReadOnlyMixin(viewsets.GenericViewSet, TenantViewSetMixin):
    """Read-only tenant mixin for list/retrieve endpoints."""

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


from rest_framework.response import Response  # noqa: E402  (kept at bottom to avoid circular imports)
