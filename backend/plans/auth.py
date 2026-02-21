from django.contrib.auth.backends import ModelBackend
from django.db.models import Q
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
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
