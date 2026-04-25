# Generated for DakshyaAI hackathon backend.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="OTP",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("email", models.EmailField(db_index=True, max_length=254)),
                ("otp", models.CharField(max_length=6)),
                (
                    "purpose",
                    models.CharField(
                        choices=[("login", "Login"), ("register", "Register")],
                        max_length=20,
                    ),
                ),
                ("is_verified", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("expires_at", models.DateTimeField()),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="UserProfile",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("full_name", models.CharField(blank=True, max_length=150)),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("target_role", models.CharField(blank=True, max_length=120)),
                ("experience_level", models.CharField(blank=True, max_length=80)),
                ("education", models.CharField(blank=True, max_length=160)),
                (
                    "current_status",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("Student", "Student"),
                            ("Developer", "Developer"),
                            ("Job Seeker", "Job Seeker"),
                            (
                                "Working Professional",
                                "Working Professional",
                            ),
                        ],
                        max_length=40,
                    ),
                ),
                ("college_or_company", models.CharField(blank=True, max_length=160)),
                ("location", models.CharField(blank=True, max_length=120)),
                ("short_bio", models.TextField(blank=True)),
                (
                    "profile_picture",
                    models.FileField(
                        blank=True,
                        null=True,
                        upload_to="profile_pictures/",
                    ),
                ),
                ("is_profile_complete", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
    ]
