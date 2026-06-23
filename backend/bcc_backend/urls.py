from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from plans.auth import (
    UsernameTokenObtainPairView,
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    CookieLogoutView,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # JWT Auth — login with username + password (body tokens, original)
    path('api/auth/login/',   UsernameTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(),            name='token_refresh'),

    # httpOnly Cookie Auth — new cookie-based endpoints
    path('api/auth/login-cookie/',   CookieTokenObtainPairView.as_view(),  name='cookie-login'),
    path('api/auth/refresh-cookie/', CookieTokenRefreshView.as_view(),     name='cookie-refresh'),
    path('api/auth/logout-cookie/',  CookieLogoutView.as_view(),           name='cookie-logout'),

    # OpenAPI schema
    path('api/schema/',         SpectacularAPIView.as_view(),                          name='schema'),
    path('api/schema/swagger/', SpectacularSwaggerView.as_view(url_name='schema'),     name='swagger'),

    # App routes
    path('api/', include('plans.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
