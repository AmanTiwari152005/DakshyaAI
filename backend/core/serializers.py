from django.db.models import Avg, Count, Q
from django.utils import timezone
from rest_framework import serializers

from accounts.models import UserProfile
from accounts.serializers import UserProfileSerializer, get_or_create_profile
from .models import (
    AssessmentAttempt,
    Badge,
    PeerEndorsement,
    Project,
    ProjectScreenshot,
    Skill,
    UserLink,
)


PROFILE_COMPLETION_FIELDS = [
    "full_name",
    "target_role",
    "experience_level",
    "education",
    "current_status",
    "college_or_company",
    "location",
    "short_bio",
]


DEFAULT_BADGES = [
    {
        "badge_type": "profile_builder",
        "title": "Profile Builder",
        "icon_name": "user-check",
        "requirement_text": "Complete your profile, add one skill, and upload one project.",
    },
    {
        "badge_type": "skill_verified",
        "title": "Skill Verified",
        "icon_name": "shield-check",
        "requirement_text": "Get at least one skill verified.",
    },
    {
        "badge_type": "project_pro",
        "title": "Project Pro",
        "icon_name": "briefcase",
        "requirement_text": "Submit a project for review.",
    },
    {
        "badge_type": "test_starter",
        "title": "Test Starter",
        "icon_name": "target",
        "requirement_text": "Complete your first DakshyaAI skill test.",
    },
    {
        "badge_type": "recruiter_ready",
        "title": "Recruiter Ready",
        "icon_name": "award",
        "requirement_text": "Reach an employability score of 80 or higher.",
    },
]


class SkillSerializer(serializers.ModelSerializer):
    verification_status_label = serializers.CharField(
        source="get_verification_status_display",
        read_only=True,
    )

    class Meta:
        model = Skill
        fields = [
            "id",
            "name",
            "level",
            "progress_score",
            "verification_status",
            "verification_status_label",
            "source",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_progress_score(self, value):
        if value > 100:
            raise serializers.ValidationError("Progress score cannot exceed 100.")
        return value


class ProjectSerializer(serializers.ModelSerializer):
    verification_status_label = serializers.CharField(
        source="get_verification_status_display",
        read_only=True,
    )
    screenshots = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "title",
            "description",
            "tech_stack",
            "github_link",
            "live_link",
            "proof_link",
            "verification_status",
            "verification_status_label",
            "screenshots",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "verification_status",
            "verification_status_label",
            "screenshots",
            "created_at",
            "updated_at",
        ]

    def get_screenshots(self, obj):
        request = self.context.get("request")
        screenshots = []
        for screenshot in obj.screenshots.all():
            url = screenshot.image.url
            screenshots.append(request.build_absolute_uri(url) if request else url)
        return screenshots


class BadgeSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source="skill.name", read_only=True)

    class Meta:
        model = Badge
        fields = [
            "id",
            "title",
            "badge_type",
            "icon_name",
            "skill",
            "skill_name",
            "is_earned",
            "requirement_text",
            "earned_at",
        ]
        read_only_fields = fields


class ProfileBasicInfoSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source="target_role", required=False, allow_blank=True)

    class Meta:
        model = UserProfile
        fields = [
            "full_name",
            "profile_picture",
            "short_bio",
            "role",
            "college_or_company",
            "location",
        ]


class UserLinkSerializer(serializers.ModelSerializer):
    resume_url = serializers.SerializerMethodField()

    class Meta:
        model = UserLink
        fields = [
            "github_url",
            "linkedin_url",
            "portfolio_url",
            "resume_file",
            "resume_url",
            "updated_at",
        ]
        read_only_fields = ["resume_url", "updated_at"]

    def get_resume_url(self, obj):
        if not obj.resume_file:
            return ""
        request = self.context.get("request")
        return request.build_absolute_uri(obj.resume_file.url) if request else obj.resume_file.url


class AssessmentAttemptSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source="skill.name", read_only=True)

    class Meta:
        model = AssessmentAttempt
        fields = [
            "id",
            "skill",
            "skill_name",
            "test_title",
            "score",
            "level",
            "feedback",
            "created_at",
        ]
        read_only_fields = fields


class PeerEndorsementSerializer(serializers.ModelSerializer):
    project_title = serializers.CharField(source="project.title", read_only=True)
    skill_name = serializers.CharField(source="skill.name", read_only=True)

    class Meta:
        model = PeerEndorsement
        fields = [
            "id",
            "project",
            "project_title",
            "skill",
            "skill_name",
            "reviewer_name",
            "reviewer_role",
            "relationship",
            "rating",
            "comment",
            "is_approved",
            "created_at",
        ]
        read_only_fields = fields


class ProjectScreenshotSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProjectScreenshot
        fields = ["id", "image", "image_url"]
        read_only_fields = ["id", "image_url"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        url = obj.image.url
        return request.build_absolute_uri(url) if request else url


def calculate_profile_completion(user):
    profile = get_or_create_profile(user)
    completed_count = sum(
        1 for field in PROFILE_COMPLETION_FIELDS if getattr(profile, field, "")
    )

    if user.projects.exists():
        completed_count += 1

    if user.skills.exists():
        completed_count += 1

    total_items = len(PROFILE_COMPLETION_FIELDS) + 2
    return round((completed_count / total_items) * 100)


def get_or_create_user_links(user):
    links, _ = UserLink.objects.get_or_create(user=user)
    return links


def calculate_profile_dashboard_completion(user):
    profile = get_or_create_profile(user)
    links = get_or_create_user_links(user)

    required_checks = [
        bool(profile.full_name),
        bool(profile.profile_picture),
        bool(profile.short_bio),
        bool(profile.target_role),
        bool(profile.college_or_company),
        bool(profile.location),
        bool(links.linkedin_url),
        bool(links.resume_file),
        user.skills.exists(),
        user.projects.count() >= 2,
    ]
    return round(sum(required_checks) / len(required_checks) * 100)


def get_profile_dashboard_missing_items(user):
    links = get_or_create_user_links(user)
    project_count = user.projects.count()
    missing_items = []

    if not links.github_url:
        missing_items.append(
            {
                "label": "Add GitHub",
                "status": "Coming Soon",
                "optional": True,
            }
        )

    if project_count < 2:
        missing_items.append(
            {
                "label": f"Add {2 - project_count} Project{'s' if 2 - project_count > 1 else ''}",
                "status": "Required",
                "optional": False,
            }
        )

    if not user.skills.exists():
        missing_items.append(
            {
                "label": "Add Skills",
                "status": "Required",
                "optional": False,
            }
        )

    if not links.resume_file:
        missing_items.append(
            {
                "label": "Upload Resume",
                "status": "Required",
                "optional": False,
            }
        )

    return missing_items


def get_suggested_tests(user):
    attempted_skill_ids = user.assessment_attempts.values_list("skill_id", flat=True)
    suggested = []

    for skill in user.skills.exclude(id__in=attempted_skill_ids)[:4]:
        suggested.append(
            {
                "skill": skill.id,
                "skill_name": skill.name,
                "test_title": f"{skill.name} Skill Validation",
                "level": skill.level,
                "reason": "No assessment attempt yet.",
            }
        )

    if not suggested:
        suggested = [
            {
                "skill": None,
                "skill_name": "React",
                "test_title": "React Frontend Readiness",
                "level": "Intermediate",
                "reason": "Recommended for frontend roles.",
            },
            {
                "skill": None,
                "skill_name": "Communication",
                "test_title": "Workplace Communication Check",
                "level": "Beginner",
                "reason": "Useful for recruiter readiness.",
            },
        ]

    return suggested


def serialize_profile_dashboard(user, request):
    sync_default_badges(user)
    profile = get_or_create_profile(user)
    links = get_or_create_user_links(user)

    return {
        "profile": UserProfileSerializer(profile, context={"request": request}).data,
        "dakshya_score": calculate_employability_score(user),
        "completion_percentage": calculate_profile_dashboard_completion(user),
        "missing_items": get_profile_dashboard_missing_items(user),
        "links": UserLinkSerializer(links, context={"request": request}).data,
        "skills": SkillSerializer(
            user.skills.all(),
            many=True,
            context={"request": request},
        ).data,
        "projects": ProjectSerializer(
            user.projects.all(),
            many=True,
            context={"request": request},
        ).data,
        "assessments": AssessmentAttemptSerializer(
            user.assessment_attempts.select_related("skill").all(),
            many=True,
            context={"request": request},
        ).data,
        "suggested_tests": get_suggested_tests(user),
        "badges": BadgeSerializer(
            user.badges.select_related("skill").all(),
            many=True,
            context={"request": request},
        ).data,
        "endorsements": PeerEndorsementSerializer(
            user.peer_endorsements.select_related("project", "skill")
            .filter(is_approved=True)
            .all(),
            many=True,
            context={"request": request},
        ).data,
    }


def calculate_employability_score(user):
    skills = user.skills.all()
    total_skills = skills.count()
    average_skill_progress = skills.aggregate(score=Avg("progress_score"))["score"] or 0
    project_score = min(user.projects.count(), 3) / 3 * 100
    verified_skill_score = (
        skills.filter(verification_status=Skill.STATUS_VERIFIED).count() / total_skills * 100
        if total_skills
        else 0
    )
    profile_completion = calculate_profile_completion(user)

    score = (
        average_skill_progress * 0.4
        + project_score * 0.2
        + verified_skill_score * 0.2
        + profile_completion * 0.2
    )
    return round(score)


def get_dashboard_stats(user):
    skill_counts = user.skills.aggregate(
        total=Count("id"),
        verified=Count("id", filter=Q(verification_status=Skill.STATUS_VERIFIED)),
        pending=Count("id", filter=Q(verification_status=Skill.STATUS_IN_REVIEW)),
    )
    pending_projects = user.projects.filter(
        verification_status=Project.STATUS_UNDER_REVIEW
    ).count()

    return {
        "total_skills": skill_counts["total"],
        "verified_skills": skill_counts["verified"],
        "projects_uploaded": user.projects.count(),
        "badges_earned": user.badges.filter(is_earned=True).count(),
        "pending_verifications": skill_counts["pending"] + pending_projects,
    }


def sync_default_badges(user):
    for badge in DEFAULT_BADGES:
        Badge.objects.get_or_create(user=user, badge_type=badge["badge_type"], defaults=badge)

    profile_completion = calculate_profile_completion(user)
    employability_score = calculate_employability_score(user)
    earned_rules = {
        "profile_builder": profile_completion == 100,
        "skill_verified": user.skills.filter(
            verification_status=Skill.STATUS_VERIFIED
        ).exists(),
        "project_pro": user.projects.exclude(
            verification_status=Project.STATUS_NOT_SUBMITTED
        ).exists(),
        "test_starter": user.skills.filter(source=Skill.SOURCE_TEST).exists(),
        "recruiter_ready": employability_score >= 80,
    }

    now = timezone.now()
    for badge_type, should_be_earned in earned_rules.items():
        badge = user.badges.filter(badge_type=badge_type).first()
        if not badge:
            continue

        if should_be_earned and not badge.is_earned:
            badge.is_earned = True
            badge.earned_at = now
            badge.save(update_fields=["is_earned", "earned_at"])
        elif not should_be_earned and badge.is_earned:
            badge.is_earned = False
            badge.earned_at = None
            badge.save(update_fields=["is_earned", "earned_at"])
