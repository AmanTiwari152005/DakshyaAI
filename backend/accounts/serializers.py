from django.contrib.auth.models import User
from rest_framework import serializers

from .models import OTP, UserProfile


class RequestOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    purpose = serializers.ChoiceField(choices=OTP.PURPOSE_CHOICES)
    account_type = serializers.ChoiceField(
        choices=UserProfile.ACCOUNT_TYPE_CHOICES,
        required=False,
    )


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(min_length=4, max_length=6)
    purpose = serializers.ChoiceField(choices=OTP.PURPOSE_CHOICES)
    account_type = serializers.ChoiceField(
        choices=UserProfile.ACCOUNT_TYPE_CHOICES,
        required=False,
    )


class SignupSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(
        write_only=True,
        min_length=8,
        required=False,
        allow_blank=True,
    )
    account_type = serializers.ChoiceField(
        choices=UserProfile.ACCOUNT_TYPE_CHOICES,
        required=False,
    )
    role = serializers.ChoiceField(
        choices=UserProfile.ACCOUNT_TYPE_CHOICES,
        required=False,
    )

    def validate_email(self, value):
        return value.lower()

    def validate(self, attrs):
        attrs["account_type"] = attrs.get("role") or attrs.get("account_type")
        if not attrs["account_type"]:
            raise serializers.ValidationError(
                {"role": "This field is required."}
            )

        confirm_password = attrs.get("confirm_password")
        if confirm_password and attrs["password"] != confirm_password:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        return attrs


class VerifySignupOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(min_length=6, max_length=6)

    def validate_email(self, value):
        return value.lower()


class ResendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower()


class PasswordLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        return value.lower()


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "id",
            "full_name",
            "email",
            "account_type",
            "target_role",
            "experience_level",
            "education",
            "current_status",
            "college_or_company",
            "location",
            "short_bio",
            "profile_picture",
            "is_profile_complete",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "email",
            "account_type",
            "is_profile_complete",
            "created_at",
            "updated_at",
        ]


class ProfileSetupSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "full_name",
            "target_role",
            "experience_level",
            "education",
            "current_status",
            "college_or_company",
            "location",
            "short_bio",
            "profile_picture",
        ]

    def validate(self, attrs):
        required_fields = [
            "full_name",
            "target_role",
            "experience_level",
            "education",
            "current_status",
            "college_or_company",
            "location",
        ]
        missing = [field for field in required_fields if not attrs.get(field)]
        if missing:
            raise serializers.ValidationError(
                {field: "This field is required." for field in missing}
            )
        return attrs


def get_or_create_profile(user: User) -> UserProfile:
    profile, _ = UserProfile.objects.get_or_create(
        user=user,
        defaults={"email": user.email},
    )
    if profile.email != user.email:
        profile.email = user.email
        profile.save(update_fields=["email", "updated_at"])
    return profile
