from datetime import timedelta

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class UserProfile(models.Model):
    ACCOUNT_CANDIDATE = "candidate"
    ACCOUNT_RECRUITER = "recruiter"

    ACCOUNT_TYPE_CHOICES = [
        (ACCOUNT_CANDIDATE, "Candidate"),
        (ACCOUNT_RECRUITER, "Recruiter"),
    ]

    STATUS_STUDENT = "Student"
    STATUS_DEVELOPER = "Developer"
    STATUS_JOB_SEEKER = "Job Seeker"
    STATUS_WORKING_PROFESSIONAL = "Working Professional"

    STATUS_CHOICES = [
        (STATUS_STUDENT, "Student"),
        (STATUS_DEVELOPER, "Developer"),
        (STATUS_JOB_SEEKER, "Job Seeker"),
        (STATUS_WORKING_PROFESSIONAL, "Working Professional"),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    full_name = models.CharField(max_length=150, blank=True)
    email = models.EmailField(unique=True)
    account_type = models.CharField(
        max_length=20,
        choices=ACCOUNT_TYPE_CHOICES,
        default=ACCOUNT_CANDIDATE,
    )
    target_role = models.CharField(max_length=120, blank=True)
    experience_level = models.CharField(max_length=80, blank=True)
    education = models.CharField(max_length=160, blank=True)
    current_status = models.CharField(
        max_length=40,
        choices=STATUS_CHOICES,
        blank=True,
    )
    college_or_company = models.CharField(max_length=160, blank=True)
    location = models.CharField(max_length=120, blank=True)
    short_bio = models.TextField(blank=True)
    profile_picture = models.ImageField(
        upload_to="profile_pictures/",
        blank=True,
        null=True,
    )
    is_profile_complete = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.email


class OTP(models.Model):
    PURPOSE_LOGIN = "login"
    PURPOSE_REGISTER = "register"

    PURPOSE_CHOICES = [
        (PURPOSE_LOGIN, "Login"),
        (PURPOSE_REGISTER, "Register"),
    ]

    email = models.EmailField(db_index=True)
    otp = models.CharField(max_length=6)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=10)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"{self.email} - {self.purpose}"


class EmailOTP(models.Model):
    PURPOSE_SIGNUP = "signup"
    PURPOSE_RESEND = "resend"

    PURPOSE_CHOICES = [
        (PURPOSE_SIGNUP, "Signup"),
        (PURPOSE_RESEND, "Resend"),
    ]

    email = models.EmailField(db_index=True)
    otp = models.CharField(max_length=6)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES)
    account_type = models.CharField(
        max_length=20,
        choices=UserProfile.ACCOUNT_TYPE_CHOICES,
        default=UserProfile.ACCOUNT_CANDIDATE,
    )
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=10)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"{self.email} - {self.purpose}"
