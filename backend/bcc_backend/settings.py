"""
Django settings for bcc_backend project.
"""

from datetime import timedelta
from pathlib import Path

import dj_database_url
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent


def csv_config(name: str, default: str = "") -> list[str]:
    value = config(name, default=default)
    return [item.strip() for item in value.split(",") if item.strip()]


def env_bool(name: str, default: bool = False) -> bool:
    value = str(config(name, default=str(default))).strip().lower()
    truthy = {"1", "true", "t", "yes", "y", "on", "debug", "dev", "development"}
    falsey = {"0", "false", "f", "no", "n", "off", "release", "prod", "production", ""}
    if value in truthy:
        return True
    if value in falsey:
        return False
    return default


SECRET_KEY = config("SECRET_KEY")
DEBUG = env_bool("DEBUG", default=False)

ALLOWED_HOSTS = csv_config("ALLOWED_HOSTS", "localhost,127.0.0.1")
CSRF_TRUSTED_ORIGINS = csv_config(
    "CSRF_TRUSTED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
)

INSTALLED_APPS = [
    "daphne",  # must be before django.contrib.staticfiles for ASGI
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "channels",
    "drf_spectacular",
    "plans",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "bcc_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "bcc_backend.wsgi.application"
ASGI_APPLICATION = "bcc_backend.asgi.application"

DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{(BASE_DIR / 'db.sqlite3').as_posix()}",
        conn_max_age=config("DB_CONN_MAX_AGE", default=600, cast=int),
        conn_health_checks=True,
    )
}

AUTH_USER_MODEL = "plans.User"

AUTHENTICATION_BACKENDS = [
    "plans.auth.EmailOrUsernameModelBackend",
    "django.contrib.auth.backends.ModelBackend",
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "plans.auth.JWTCookieAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "20/minute",
        "user": "300/minute",
        "login": "10/minute",
        "approve_final": "5/minute",
    },
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

CORS_ALLOW_ALL_ORIGINS = env_bool("CORS_ALLOW_ALL_ORIGINS", default=DEBUG)
CORS_ALLOWED_ORIGINS = csv_config(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
)
CORS_ALLOW_CREDENTIALS = True

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Harare"
USE_I18N = True
USE_TZ = True

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ─────────────────────────────────────────────
# Django Channels
# ─────────────────────────────────────────────
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer"
    }
}

# ─────────────────────────────────────────────
# Celery
# ─────────────────────────────────────────────
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0')
CELERY_TASK_ALWAYS_EAGER = env_bool('CELERY_TASK_ALWAYS_EAGER', default=DEBUG)
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@bulawayo.city.zw')

# ─────────────────────────────────────────────
# drf-spectacular OpenAPI
# ─────────────────────────────────────────────
SPECTACULAR_SETTINGS = {
    'TITLE': 'Bulawayo PACS API',
    'DESCRIPTION': 'Plan Approval and Control System — Bulawayo City Council',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}
