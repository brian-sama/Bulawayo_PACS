from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users',        views.UserViewSet,        basename='user')
router.register(r'plans',        views.PlanViewSet,        basename='plan')
router.register(r'departments',  views.DepartmentViewSet,  basename='department')
router.register(r'architects',   views.ArchitectViewSet,   basename='architect')
router.register(r'properties',   views.PropertyViewSet,    basename='property')
router.register(r'comments',     views.CommentViewSet,     basename='comment')
router.register(r'flags',        views.FlagViewSet,        basename='flag')
router.register(r'audit-logs',   views.AuditLogViewSet,    basename='auditlog')
router.register(r'department-reviews', views.DepartmentReviewViewSet, basename='departmentreview')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/me/',       views.MeView.as_view(),       name='me'),
]
