"""
WebSocket consumer for real-time in-app notifications.

Connect:  ws://<host>/ws/notifications/?token=<access_jwt>
The JWT is validated on connect; unauthenticated connections are rejected.
"""

import json

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import UntypedToken


class NotificationConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        qs = self.scope.get('query_string', b'').decode()
        token = None
        for part in qs.split('&'):
            if part.startswith('token='):
                token = part[len('token='):]
                break

        user = await self.get_user(token)
        if not user or user.is_anonymous:
            await self.close()
            return

        self.user = user
        self.group_name = f'notifications_{user.id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        # Clients do not send messages through this socket.
        pass

    async def notification_message(self, event):
        """Handler invoked by channel_layer.group_send with type='notification.message'."""
        await self.send(text_data=json.dumps(event['payload']))

    @database_sync_to_async
    def get_user(self, token):
        if not token:
            return AnonymousUser()
        try:
            UntypedToken(token)
            from rest_framework_simplejwt.authentication import JWTAuthentication
            auth = JWTAuthentication()
            validated = auth.get_validated_token(token.encode())
            return auth.get_user(validated)
        except (InvalidToken, TokenError, Exception):
            return AnonymousUser()
