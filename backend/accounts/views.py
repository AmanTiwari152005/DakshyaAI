from datetime import timedelta
import logging
import random

from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import RecruiterProfile
from .models import EmailOTP, OTP, UserProfile
from .services.email_service import send_signup_otp
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


logger = logging.getLogger(__name__)


def generate_otp():
    return f"{random.randint(100000, 999999)}"


def create_email_otp(email, account_type, purpose=EmailOTP.PURPOSE_SIGNUP):
    EmailOTP.objects.filter(email__iexact=email, is_verified=False).update(
        is_verified=True
    )
    return EmailOTP.objects.create(
        email=email,
        otp=generate_otp(),
        purpose=purpose,
        account_type=account_type,
        expires_at=timezone.now() + timedelta(minutes=10),
    )


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

        if user and user.is_active:
            return Response(
                {"detail": "Account already exists. Please login."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            if not user:
                user = User.objects.create(
                    username=email,
                    email=email,
                    is_active=False,
                )
            else:
                user.email = email
                user.username = email
                user.is_active = False

            user.set_password(password)
            user.save(update_fields=["username", "email", "password", "is_active"])
            Token.objects.filter(user=user).delete()
            ensure_account_profiles(user, account_type)
            otp_record = create_email_otp(email, account_type)

        try:
            send_signup_otp(email, otp_record.otp)
        except Exception:
            logger.exception("Unable to send signup OTP email to %s", email)
            return Response(
                {
                    "success": False,
                    "message": "Unable to send OTP email. Please try again later.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        payload = {
            "success": True,
            "message": "OTP sent to your email.",
            "email": email,
            "account_type": account_type,
        }
        return Response(payload, status=status.HTTP_201_CREATED)


class VerifySignupOTPView(APIView):
    def post(self, request):
        serializer = VerifySignupOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        otp = serializer.validated_data["otp"]
        otp_record = (
            EmailOTP.objects.filter(email__iexact=email, is_verified=False)
            .order_by("-created_at")
            .first()
        )

        if not otp_record or otp_record.otp != otp:
            return Response(
                {"detail": "Invalid OTP. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if otp_record.is_expired:
            return Response(
                {"detail": "OTP expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response(
                {"detail": "Signup request not found. Please register again."},
                status=status.HTTP_404_NOT_FOUND,
            )

        user.is_active = True
        user.save(update_fields=["is_active"])
        otp_record.is_verified = True
        otp_record.save(update_fields=["is_verified"])
        profile = ensure_account_profiles(user, otp_record.account_type)
        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "success": True,
                "token": token.key,
                "account_type": profile.account_type,
                "next_step": get_next_step(profile.account_type),
                "profile_complete": get_profile_completion(user, profile.account_type),
                "redirect_url": (
                    "/recruiter-profile-setup"
                    if profile.account_type == UserProfile.ACCOUNT_RECRUITER
                    else "/profile-setup"
                ),
            }
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

        profile = get_or_create_profile(user)
        otp_record = create_email_otp(
            email,
            profile.account_type,
            purpose=EmailOTP.PURPOSE_RESEND,
        )

        try:
            send_signup_otp(email, otp_record.otp)
        except Exception:
            logger.exception("Unable to resend signup OTP email to %s", email)
            return Response(
                {
                    "success": False,
                    "message": "Unable to send OTP email. Please try again later.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        payload = {
            "success": True,
            "message": "OTP sent to your email.",
            "email": email,
            "account_type": profile.account_type,
        }
        return Response(payload)


class PasswordLoginView(APIView):
    def post(self, request):
        serializer = PasswordLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]
        user = User.objects.filter(email__iexact=email).first()

        if not user or not user.check_password(password):
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
