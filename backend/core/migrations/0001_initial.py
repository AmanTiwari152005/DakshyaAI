# Generated for DakshyaAI dashboard core.

import django.conf
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(django.conf.settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Skill",
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
                ("name", models.CharField(max_length=100)),
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
                ("progress_score", models.PositiveSmallIntegerField(default=0)),
                (
                    "verification_status",
                    models.CharField(
                        choices=[
                            ("verified", "Verified"),
                            ("in_review", "In Review"),
                            ("not_tested", "Not Tested"),
                        ],
                        default="not_tested",
                        max_length=20,
                    ),
                ),
                (
                    "source",
                    models.CharField(
                        choices=[
                            ("ai", "AI"),
                            ("test", "Test"),
                            ("peer", "Peer"),
                            ("manual", "Manual"),
                        ],
                        default="manual",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="skills",
                        to=django.conf.settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-updated_at", "name"],
            },
        ),
        migrations.CreateModel(
            name="Project",
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
                ("title", models.CharField(max_length=160)),
                ("description", models.TextField(blank=True)),
                ("tech_stack", models.CharField(max_length=240)),
                ("live_link", models.URLField(blank=True)),
                ("proof_link", models.URLField(blank=True)),
                (
                    "verification_status",
                    models.CharField(
                        choices=[
                            ("verified", "Verified"),
                            ("under_review", "Under Review"),
                            ("not_submitted", "Not Submitted"),
                        ],
                        default="not_submitted",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="projects",
                        to=django.conf.settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-updated_at", "title"],
            },
        ),
        migrations.CreateModel(
            name="Badge",
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
                ("title", models.CharField(max_length=120)),
                ("badge_type", models.CharField(max_length=80)),
                ("icon_name", models.CharField(max_length=80)),
                ("is_earned", models.BooleanField(default=False)),
                ("requirement_text", models.CharField(max_length=240)),
                ("earned_at", models.DateTimeField(blank=True, null=True)),
                (
                    "skill",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="badges",
                        to="core.skill",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="badges",
                        to=django.conf.settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-is_earned", "title"],
                "unique_together": {("user", "badge_type")},
            },
        ),
    ]
