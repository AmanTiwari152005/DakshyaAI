from datetime import timedelta
import random

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import RecruiterProfile
from .models import OTP, UserProfile
from .serializers import (
    PasswordLoginSerializer,
    ProfileSetupSerializer,
    RequestOTPSerializer,
    ResendOTPSerializer,
    SignupSerializer,
    UserProfileSerializer,
    VerifySignupOTPSerializer,
    VerifyOTPSerializer,
    get_or_create_profile,
)


def generate_otp():
    return f"{random.randint(100000, 999999)}"


def get_redirect_url(account_type):
    return (
        "/recruiter-dashboard"
        if account_type == UserProfile.ACCOUNT_RECRUITER
        else "/dashboard"
    )


def get_next_step(account_type):
    return (
        "recruiter_profile_setup"
        if account_type == UserProfile.ACCOUNT_RECRUITER
        else "candidate_profile_setup"
    )


def get_profile_completion(user, account_type):
    if account_type == UserProfile.ACCOUNT_RECRUITER:
        recruiter = RecruiterProfile.objects.filter(user=user).first()
        return bool(recruiter and recruiter.is_profile_complete)
    return get_or_create_profile(user).is_profile_complete


def ensure_account_profiles(user, account_type):
    profile = get_or_create_profile(user)
    profile.account_type = account_type
    profile.email = user.email
    profile.save(update_fields=["account_type", "email", "updated_at"])

    if account_type == UserProfile.ACCOUNT_RECRUITER:
        RecruiterProfile.objects.get_or_create(user=user)

    return profile


def build_auth_response(user):
    profile = get_or_create_profile(user)
    account_type = profile.account_type
    token, _ = Token.objects.get_or_create(user=user)
    return {
        "success": True,
        "token": token.key,
        "account_type": account_type,
        "profile_complete": get_profile_completion(user, account_type),
        "redirect_url": get_redirect_url(account_type),
        "profile": UserProfileSerializer(profile).data,
    }


class SignupView(APIView):
    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]
        account_type = serializer.validated_data["account_type"]
        user = User.objects.filter(email__iexact=email).first()

        if user:
            return Response(
                {"success": False, "message": "User already exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
            )
            ensure_account_profiles(user, account_type)

        payload = {
            "success": True,
            "message": "Account created successfully",
        }
        return Response(payload, status=status.HTTP_201_CREATED)


class VerifySignupOTPView(APIView):
    def post(self, request):
        serializer = VerifySignupOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return Response(
            {
                "success": False,
                "message": "OTP signup is no longer required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


class ResendOTPView(APIView):
    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response(
                {"detail": "Signup request not found. Please register first."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.is_active:
            return Response(
                {"detail": "Account already verified. Please login."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"success": False, "message": "OTP signup is no longer required."},
            status=status.HTTP_400_BAD_REQUEST,
        )


class PasswordLoginView(APIView):
    def post(self, request):
        serializer = PasswordLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]
        user = authenticate(username=email, password=password)

        if not user:
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_active:
            return Response(
                {"detail": "Please verify your email first."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(build_auth_response(user))


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({"success": True, "message": "Logged out."})


class RequestOTPView(APIView):
    def post(self, request):
        serializer = RequestOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].lower()
        purpose = serializer.validated_data["purpose"]
        user_exists = User.objects.filter(email__iexact=email).exists()

        if purpose == OTP.PURPOSE_LOGIN and not user_exists:
            return Response(
                {"detail": "Account not found. Please register first."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if purpose == OTP.PURPOSE_REGISTER and user_exists:
            return Response(
                {"detail": "Account already exists. Please login."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        OTP.objects.filter(
            email__iexact=email,
            purpose=purpose,
            is_verified=False,
        ).update(is_verified=True)

        otp = generate_otp()
        otp_record = OTP.objects.create(
            email=email,
            otp=otp,
            purpose=purpose,
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        return Response(
            {
                "success": True,
                "message": "OTP generated successfully.",
                "otp": otp_record.otp,
            },
            status=status.HTTP_201_CREATED,
        )


class VerifyOTPView(APIView):
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].lower()
        otp = serializer.validated_data["otp"]
        purpose = serializer.validated_data["purpose"]
        account_type = serializer.validated_data.get(
            "account_type",
            UserProfile.ACCOUNT_CANDIDATE,
        )

        otp_record = (
            OTP.objects.filter(
                email__iexact=email,
                otp=otp,
                purpose=purpose,
                is_verified=False,
            )
            .order_by("-created_at")
            .first()
        )

        if not otp_record:
            return Response(
                {"detail": "Invalid OTP. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if otp_record.is_expired:
            return Response(
                {"detail": "OTP expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if purpose == OTP.PURPOSE_LOGIN:
            try:
                user = User.objects.get(email__iexact=email)
            except User.DoesNotExist:
                return Response(
                    {"detail": "Account not found. Please register first."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={"username": email},
            )
            if created:
                user.set_unusable_password()
                user.save(update_fields=["password"])
            if not created and user.username != email:
                user.username = email
                user.save(update_fields=["username"])

        otp_record.is_verified = True
        otp_record.save(update_fields=["is_verified"])

        profile = get_or_create_profile(user)
        if purpose == OTP.PURPOSE_REGISTER:
            profile.account_type = account_type
            profile.save(update_fields=["account_type", "updated_at"])
        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "success": True,
                "token": token.key,
                "account_type": profile.account_type,
                "profile_complete": profile.is_profile_complete,
                "profile": UserProfileSerializer(profile, context={"request": request}).data,
            }
        )


class ProfileSetupView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = get_or_create_profile(request.user)
        if profile.account_type != UserProfile.ACCOUNT_CANDIDATE:
            return Response(
                {"detail": "Candidate account required."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = ProfileSetupSerializer(
            profile,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(is_profile_complete=True)

        return Response(
            {
                "success": True,
                "message": "Profile setup completed.",
                "profile": UserProfileSerializer(profile, context={"request": request}).data,
            }
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_or_create_profile(request.user)
        return Response(
            {
                "profile": UserProfileSerializer(profile, context={"request": request}).data,
            }
        )
