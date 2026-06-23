from rest_framework.throttling import ScopedRateThrottle


class LoginRateThrottle(ScopedRateThrottle):
    scope = 'login'


class ApproveFinalRateThrottle(ScopedRateThrottle):
    scope = 'approve_final'
