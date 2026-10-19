"""MediNexus notifications app.

Realtime user notifications: model, REST API (list / mark read / mark-all-read /
unread-count) and WebSocket fan-out on the ``user_{id}`` and ``org_{id}``
channel groups via :func:`apps.notifications.services.notify`.
"""
