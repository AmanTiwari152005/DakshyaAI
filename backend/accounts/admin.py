from django.contrib import admin

from .models import OTP, UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("email", "full_name", "target_role", "is_profile_complete")
    search_fields = ("email", "full_name", "target_role")
    list_filter = ("is_profile_complete", "current_status", "experience_level")


@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ("email", "purpose", "otp", "is_verified", "expires_at")
    search_fields = ("email", "otp")
    list_filter = ("purpose", "is_verified")
