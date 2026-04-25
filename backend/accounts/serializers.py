from django.contrib.auth.models import User
from rest_framework import serializers

from .models import OTP, UserProfile


class RequestOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    purpose = serializers.ChoiceField(choices=OTP.PURPOSE_CHOICES)


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(min_length=4, max_length=6)
    purpose = serializers.ChoiceField(choices=OTP.PURPOSE_CHOICES)


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "id",
            "full_name",
            "email",
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
        read_only_fields = ["id", "email", "is_profile_complete", "created_at", "updated_at"]


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
