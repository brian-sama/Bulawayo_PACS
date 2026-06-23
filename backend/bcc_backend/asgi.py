"""
ASGI config for bcc_backend project.

Handles both HTTP (via Django) and WebSocket (via Django Channels) protocols.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.urls import path

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bcc_backend.settings")

# Initialize Django ASGI application before importing any models / consumers.
django_asgi_app = get_asgi_application()

from plans.consumers import NotificationConsumer  # noqa: E402 — must come after get_asgi_application

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        URLRouter([
            path("ws/notifications/", NotificationConsumer.as_asgi()),
        ])
    ),
})
