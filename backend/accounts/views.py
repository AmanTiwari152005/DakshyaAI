from datetime import timedelta
import random

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import OTP, UserProfile
from .serializers import (
    ProfileSetupSerializer,
    RequestOTPSerializer,
    UserProfileSerializer,
    VerifyOTPSerializer,
    get_or_create_profile,
)


def generate_otp():
    return f"{random.randint(100000, 999999)}"


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
