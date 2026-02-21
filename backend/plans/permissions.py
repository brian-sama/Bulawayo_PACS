from rest_framework.permissions import BasePermission
from .models import UserRole


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == UserRole.ADMIN


class IsStaffOrAbove(BasePermission):
    ALLOWED = {UserRole.DEPT_OFFICER, UserRole.DEPT_HEAD, UserRole.FINAL_APPROVER, UserRole.ADMIN}

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in self.ALLOWED


class IsReceptionOrAbove(BasePermission):
    ALLOWED = {UserRole.RECEPTION, UserRole.DEPT_OFFICER, UserRole.DEPT_HEAD, UserRole.FINAL_APPROVER, UserRole.ADMIN}

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in self.ALLOWED


class IsClient(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == UserRole.CLIENT


class IsOwnerOrStaff(BasePermission):
    """Object-level: client can only access their own plans."""
    STAFF_ROLES = {UserRole.RECEPTION, UserRole.DEPT_OFFICER, UserRole.DEPT_HEAD, UserRole.FINAL_APPROVER, UserRole.ADMIN}

    def has_object_permission(self, request, view, obj):
        if request.user.is_authenticated and request.user.role in self.STAFF_ROLES:
            return True
        # For Plan objects
        if hasattr(obj, 'client'):
            return obj.client == request.user
        return False
