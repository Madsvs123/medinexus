"""MediNexus audit app.

Immutable org-scoped audit trail: model, org-admin read-only REST API and the
:func:`apps.audit.services.record_audit` helper used by signals/views across
the platform.
"""
