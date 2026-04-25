from django.urls import path

from .views import MeView, ProfileSetupView, RequestOTPView, VerifyOTPView

urlpatterns = [
    path("auth/request-otp/", RequestOTPView.as_view(), name="request-otp"),
    path("auth/verify-otp/", VerifyOTPView.as_view(), name="verify-otp"),
    path("profile/setup/", ProfileSetupView.as_view(), name="profile-setup"),
    path("profile/me/", MeView.as_view(), name="profile-me"),
]
