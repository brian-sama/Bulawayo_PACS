from django.conf import settings
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import User

class EmailOrUsernameModelBackend(ModelBackend):
    """
    Custom authentication backend that allows users to log in using 
    either their username or their email address.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get(User.USERNAME_FIELD)
        
        # Optimization: Prioritize email lookup if it looks like an email
        try:
            if '@' in username:
                user = User.objects.filter(email__iexact=username).first()
            else:
                user = User.objects.filter(
                    Q(username__iexact=username) | Q(email__iexact=username)
                ).first()
            
            if user and user.check_password(password):
                return user
            
            # If user not found or password wrong, run hasher to prevent timing attacks
            if not user:
                User().set_password(password)
                
        except Exception:
            return None
        return None

class UsernameTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'username'

    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Get user object
        user = self.user
        
        # Build requested structure
        return {
            "status": "success",
            "message": "Authentication successful",
            "tokens": {
                "access": data["access"],
                "refresh": data["refresh"]
            },
            "user": {
                "user_id": user.id,
                "first_name": user.full_name.split(' ')[0] if user.full_name else "",
                "last_name": ' '.join(user.full_name.split(' ')[1:]) if user.full_name and ' ' in user.full_name else "",
                "email": user.email,
                "role": user.role,
                "department_name": user.department.name if user.department else "None",
                "department_id": user.department.id if user.department else None
            },
            "permissions": self.get_user_permissions(user)
        }

    def get_user_permissions(self, user):
        # Simplified mapping based on user role for the frontend
        perms = ["search_plans"] # Everyone can search
        if user.role == "ADMIN":
            perms.extend(["view_dashboard", "view_analytics", "manage_users"])
        elif user.role == "FINAL_APPROVER":
            perms.extend(["view_dashboard", "view_analytics", "apply_seal"])
        elif user.role in ["DEPT_HEAD", "DEPT_OFFICER"]:
            perms.extend(["view_dashboard", "review_plans"])
        elif user.role == "RECEPTION":
            perms.extend(["view_dashboard", "verify_submissions"])
        elif user.role == "CLIENT":
            perms.extend(["submit_plans", "track_progress"])
        return perms


class UsernameTokenObtainPairView(TokenObtainPairView):
    serializer_class = UsernameTokenObtainPairSerializer
    throttle_classes = []  # replaced by LoginRateThrottle below

    def get_throttles(self):
        from .throttles import LoginRateThrottle
        return [LoginRateThrottle()]


# ─────────────────────────────────────────────
# httpOnly COOKIE AUTHENTICATION
# ─────────────────────────────────────────────

class JWTCookieAuthentication(JWTAuthentication):
    """
    Extends simplejwt's JWTAuthentication to also accept the token from
    the ``access_token`` httpOnly cookie when no Authorization header is present.
    """

    def authenticate(self, request):
        # Prefer the standard Authorization header first.
        header = self.get_header(request)
        if header is not None:
            return super().authenticate(request)

        # Fall back to the httpOnly cookie.
        raw_token = request.COOKIES.get('access_token')
        if not raw_token:
            return None

        try:
            validated_token = self.get_validated_token(raw_token.encode())
            return self.get_user(validated_token), validated_token
        except Exception:
            return None


class CookieTokenObtainPairView(UsernameTokenObtainPairView):
    """
    Login view that sets httpOnly cookies in addition to returning the
    existing JSON response body (backward-compatible during transition).
    """

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            data = response.data
            access_token = data.get('tokens', {}).get('access', '')
            refresh_token = data.get('tokens', {}).get('refresh', '')

            secure = not settings.DEBUG
            response.set_cookie(
                'access_token',
                access_token,
                httponly=True,
                secure=secure,
                samesite='Strict',
                max_age=int(settings.SIMPLE_JWT.get('ACCESS_TOKEN_LIFETIME').total_seconds()),
            )
            response.set_cookie(
                'refresh_token',
                refresh_token,
                httponly=True,
                secure=secure,
                samesite='Strict',
                max_age=int(settings.SIMPLE_JWT.get('REFRESH_TOKEN_LIFETIME').total_seconds()),
            )

        return response


class CookieTokenRefreshView(APIView):
    """
    Accepts the refresh token from the ``refresh_token`` httpOnly cookie,
    issues a new access token and sets it in the ``access_token`` cookie.
    """

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token_raw = request.COOKIES.get('refresh_token')
        if not refresh_token_raw:
            return Response({'detail': 'refresh_token cookie is missing.'}, status=400)

        try:
            refresh = RefreshToken(refresh_token_raw)
            new_access = str(refresh.access_token)
        except Exception as exc:
            return Response({'detail': str(exc)}, status=401)

        secure = not settings.DEBUG
        response = Response({'status': 'ok'})
        response.set_cookie(
            'access_token',
            new_access,
            httponly=True,
            secure=secure,
            samesite='Strict',
            max_age=int(settings.SIMPLE_JWT.get('ACCESS_TOKEN_LIFETIME').total_seconds()),
        )
        return response


class CookieLogoutView(APIView):
    """
    Clears both httpOnly auth cookies, effectively logging the user out
    of cookie-based sessions.
    """

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = Response({'status': 'ok'})
        response.delete_cookie('access_token', samesite='Strict')
        response.delete_cookie('refresh_token', samesite='Strict')
        return response
