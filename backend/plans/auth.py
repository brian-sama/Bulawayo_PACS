"""
Custom JWT serializer that authenticates using username + password
instead of the default email + password.
"""
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class UsernameTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'username'

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add useful claims to the JWT payload
        token['username'] = user.username
        token['email']    = user.email
        token['role']     = user.role
        token['full_name'] = user.full_name
        return token


class UsernameTokenObtainPairView(TokenObtainPairView):
    serializer_class = UsernameTokenObtainPairSerializer
