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
    """
    Object-level: staff can access everything, clients only their own data.
    """
    STAFF_ROLES = {UserRole.RECEPTION, UserRole.DEPT_OFFICER, UserRole.DEPT_HEAD, UserRole.FINAL_APPROVER, UserRole.ADMIN}

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role in self.STAFF_ROLES:
            return True
        
        # Check Plan ownership
        if hasattr(obj, 'client'):
            return obj.client == user
        
        # Check PlanVersion ownership (via plan)
        if hasattr(obj, 'plan'):
            return getattr(obj.plan, 'client', None) == user
            
        return False
