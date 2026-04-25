# Generated for DakshyaAI profile dashboard.

import django.conf
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0001_initial"),
        migrations.swappable_dependency(django.conf.settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="github_link",
            field=models.URLField(blank=True),
        ),
        migrations.CreateModel(
            name="UserLink",
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
                ("github_url", models.URLField(blank=True)),
                ("linkedin_url", models.URLField(blank=True)),
                ("portfolio_url", models.URLField(blank=True)),
                (
                    "resume_file",
                    models.FileField(blank=True, null=True, upload_to="resumes/"),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="links",
                        to=django.conf.settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="AssessmentAttempt",
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
                ("test_title", models.CharField(max_length=160)),
                ("score", models.PositiveSmallIntegerField(default=0)),
                (
                    "level",
                    models.CharField(
                        choices=[
                            ("Beginner", "Beginner"),
                            ("Intermediate", "Intermediate"),
                            ("Advanced", "Advanced"),
                        ],
                        default="Beginner",
                        max_length=20,
                    ),
                ),
                ("feedback", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "skill",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="assessment_attempts",
                        to="core.skill",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="assessment_attempts",
                        to=django.conf.settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="PeerEndorsement",
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
                ("reviewer_name", models.CharField(max_length=120)),
                ("reviewer_role", models.CharField(blank=True, max_length=120)),
                ("relationship", models.CharField(blank=True, max_length=120)),
                ("rating", models.PositiveSmallIntegerField(default=5)),
                ("comment", models.TextField(blank=True)),
                ("is_approved", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "project",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="endorsements",
                        to="core.project",
                    ),
                ),
                (
                    "skill",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="endorsements",
                        to="core.skill",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="peer_endorsements",
                        to=django.conf.settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="ProjectScreenshot",
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
                ("image", models.ImageField(upload_to="project_screenshots/")),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="screenshots",
                        to="core.project",
                    ),
                ),
            ],
        ),
    ]
