"""MediNexus messaging app.

Internal chat between organization users: Thread/Message models, REST API
(threads, messages, read receipts) and WebSocket chat on ``chat_{thread_id}``
channel groups via :class:`apps.messaging.consumers.ChatConsumer`.
"""
