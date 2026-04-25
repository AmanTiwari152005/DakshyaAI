from django.contrib import admin

from .models import (
    AssessmentAttempt,
    Badge,
    Certification,
    Education,
    Experience,
    PeerEndorsement,
    Project,
    ProjectScreenshot,
    ResumeUpload,
    Skill,
    UserLink,
)


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "level", "progress_score", "verification_status")
    list_filter = ("level", "verification_status", "source")
    search_fields = ("name", "user__email", "user__username")


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "verification_status", "created_at")
    list_filter = ("verification_status",)
    search_fields = ("title", "tech_stack", "user__email", "user__username")


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "badge_type", "is_earned", "earned_at")
    list_filter = ("badge_type", "is_earned")
    search_fields = ("title", "user__email", "user__username")


@admin.register(UserLink)
class UserLinkAdmin(admin.ModelAdmin):
    list_display = ("user", "github_url", "linkedin_url", "portfolio_url", "updated_at")
    search_fields = ("user__email", "user__username", "github_url", "linkedin_url")


@admin.register(AssessmentAttempt)
class AssessmentAttemptAdmin(admin.ModelAdmin):
    list_display = ("test_title", "user", "skill", "score", "level", "created_at")
    list_filter = ("level",)
    search_fields = ("test_title", "user__email", "skill__name")


@admin.register(PeerEndorsement)
class PeerEndorsementAdmin(admin.ModelAdmin):
    list_display = ("reviewer_name", "user", "rating", "is_approved", "created_at")
    list_filter = ("is_approved", "rating")
    search_fields = ("reviewer_name", "comment", "user__email")


@admin.register(ProjectScreenshot)
class ProjectScreenshotAdmin(admin.ModelAdmin):
    list_display = ("project", "image")


@admin.register(ResumeUpload)
class ResumeUploadAdmin(admin.ModelAdmin):
    list_display = ("user", "resume_file", "created_at")
    search_fields = ("user__email", "user__username", "extracted_text")


@admin.register(Certification)
class CertificationAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "issuer", "created_at")
    search_fields = ("title", "issuer", "user__email")


@admin.register(Education)
class EducationAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "institution", "year", "created_at")
    search_fields = ("title", "institution", "user__email")


@admin.register(Experience)
class ExperienceAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "company", "created_at")
    search_fields = ("title", "company", "description", "user__email")
