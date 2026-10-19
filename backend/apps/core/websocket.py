from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken


@database_sync_to_async
def get_user_from_token(token_str):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    try:
        access = AccessToken(token_str)
        user = User.objects.get(id=access["user_id"])
        if not user.is_active:
            return AnonymousUser()
        return user
    except Exception:
        return AnonymousUser()


class JwtAuthMiddleware(BaseMiddleware):
    """Validates a JWT passed as ``?token=`` and attaches ``scope["user"]``.

    Use in the Channels routing stack::

        application = JwtAuthMiddleware(ProtocolTypeRouter({...}))
    """

    async def __call__(self, scope, receive, send):
        query = parse_qs(scope.get("query_string", b"").decode())
        token = (query.get("token") or [None])[0]
        if token:
            scope["user"] = await get_user_from_token(token)
        else:
            scope["user"] = AnonymousUser()
        return await super().__call__(scope, receive, send)
