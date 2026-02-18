from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from plans.auth import UsernameTokenObtainPairView

urlpatterns = [
    path('admin/', admin.site.urls),

    # JWT Auth — login with username + password
    path('api/auth/login/',   UsernameTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(),            name='token_refresh'),

    # App routes
    path('api/', include('plans.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
