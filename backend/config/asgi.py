"""
MediNexus — ASGI entrypoint.

HTTP is served by Django; WebSockets are routed to the notifications and
messaging consumers through the shared JWT authentication middleware.
"""
import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginator
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing consumers.
django_asgi_app = get_asgi_application()

from apps.core.websocket import JwtAuthMiddleware  # noqa: E402
from apps.messaging.routing import websocket_urlpatterns as messaging_ws  # noqa: E402
from apps.notifications.routing import websocket_urlpatterns as notifications_ws  # noqa: E402

websocket_urlpatterns = notifications_ws + messaging_ws

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginator(
            JwtAuthMiddleware(AuthMiddlewareStack(URLRouter(websocket_urlpatterns)))
        ),
    }
)
