from django.urls import path

from .views import (
    LogoutView,
    MeView,
    PasswordLoginView,
    ProfileSetupView,
    RequestOTPView,
    ResendOTPView,
    SignupView,
    VerifyOTPView,
    VerifySignupOTPView,
)

urlpatterns = [
    path("auth/signup/", SignupView.as_view(), name="signup"),
    path(
        "auth/verify-signup-otp/",
        VerifySignupOTPView.as_view(),
        name="verify-signup-otp",
    ),
    path("auth/resend-otp/", ResendOTPView.as_view(), name="resend-otp"),
    path("auth/login/", PasswordLoginView.as_view(), name="password-login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/request-otp/", RequestOTPView.as_view(), name="request-otp"),
    path("auth/verify-otp/", VerifyOTPView.as_view(), name="verify-otp"),
    path("profile/setup/", ProfileSetupView.as_view(), name="profile-setup"),
    path("profile/me/", MeView.as_view(), name="profile-me"),
]
