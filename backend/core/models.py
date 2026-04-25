from django.conf import settings
from django.db import models


class Skill(models.Model):
    LEVEL_BEGINNER = "Beginner"
    LEVEL_INTERMEDIATE = "Intermediate"
    LEVEL_ADVANCED = "Advanced"

    LEVEL_CHOICES = [
        (LEVEL_BEGINNER, "Beginner"),
        (LEVEL_INTERMEDIATE, "Intermediate"),
        (LEVEL_ADVANCED, "Advanced"),
    ]

    STATUS_VERIFIED = "verified"
    STATUS_IN_REVIEW = "in_review"
    STATUS_NOT_TESTED = "not_tested"

    VERIFICATION_CHOICES = [
        (STATUS_VERIFIED, "Verified"),
        (STATUS_IN_REVIEW, "In Review"),
        (STATUS_NOT_TESTED, "Not Tested"),
    ]

    SOURCE_AI = "ai"
    SOURCE_TEST = "test"
    SOURCE_PEER = "peer"
    SOURCE_MANUAL = "manual"

    SOURCE_CHOICES = [
        (SOURCE_AI, "AI"),
        (SOURCE_TEST, "Test"),
        (SOURCE_PEER, "Peer"),
        (SOURCE_MANUAL, "Manual"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="skills",
    )
    name = models.CharField(max_length=100)
    level = models.CharField(
        max_length=20,
        choices=LEVEL_CHOICES,
        default=LEVEL_BEGINNER,
    )
    progress_score = models.PositiveSmallIntegerField(default=0)
    verification_status = models.CharField(
        max_length=20,
        choices=VERIFICATION_CHOICES,
        default=STATUS_NOT_TESTED,
    )
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default=SOURCE_MANUAL,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "name"]

    def __str__(self):
        return f"{self.name} ({self.user})"


class Project(models.Model):
    STATUS_VERIFIED = "verified"
    STATUS_UNDER_REVIEW = "under_review"
    STATUS_NOT_SUBMITTED = "not_submitted"

    VERIFICATION_CHOICES = [
        (STATUS_VERIFIED, "Verified"),
        (STATUS_UNDER_REVIEW, "Under Review"),
        (STATUS_NOT_SUBMITTED, "Not Submitted"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="projects",
    )
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    tech_stack = models.CharField(max_length=240)
    github_link = models.URLField(blank=True)
    live_link = models.URLField(blank=True)
    proof_link = models.URLField(blank=True)
    verification_status = models.CharField(
        max_length=20,
        choices=VERIFICATION_CHOICES,
        default=STATUS_NOT_SUBMITTED,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "title"]

    def __str__(self):
        return self.title


class Badge(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="badges",
    )
    title = models.CharField(max_length=120)
    badge_type = models.CharField(max_length=80)
    icon_name = models.CharField(max_length=80)
    skill = models.ForeignKey(
        Skill,
        on_delete=models.SET_NULL,
        related_name="badges",
        blank=True,
        null=True,
    )
    is_earned = models.BooleanField(default=False)
    requirement_text = models.CharField(max_length=240)
    earned_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-is_earned", "title"]
        unique_together = ("user", "badge_type")

    def __str__(self):
        return self.title


class UserLink(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="links",
    )
    github_url = models.URLField(blank=True)
    linkedin_url = models.URLField(blank=True)
    portfolio_url = models.URLField(blank=True)
    resume_file = models.FileField(upload_to="resumes/", blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Links for {self.user}"


class AssessmentAttempt(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="assessment_attempts",
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name="assessment_attempts",
    )
    test_title = models.CharField(max_length=160)
    score = models.PositiveSmallIntegerField(default=0)
    level = models.CharField(
        max_length=20,
        choices=Skill.LEVEL_CHOICES,
        default=Skill.LEVEL_BEGINNER,
    )
    feedback = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.test_title} - {self.user}"


class PeerEndorsement(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="peer_endorsements",
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        related_name="endorsements",
        blank=True,
        null=True,
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.SET_NULL,
        related_name="endorsements",
        blank=True,
        null=True,
    )
    reviewer_name = models.CharField(max_length=120)
    reviewer_role = models.CharField(max_length=120, blank=True)
    relationship = models.CharField(max_length=120, blank=True)
    rating = models.PositiveSmallIntegerField(default=5)
    comment = models.TextField(blank=True)
    is_approved = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.reviewer_name} for {self.user}"


class ProjectScreenshot(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="screenshots",
    )
    image = models.ImageField(upload_to="project_screenshots/")

    def __str__(self):
        return f"Screenshot for {self.project}"


class ResumeUpload(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="resume_uploads",
    )
    resume_file = models.FileField(upload_to="resumes/")
    extracted_text = models.TextField(blank=True)
    structured_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Resume upload for {self.user}"


class Certification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="certifications",
    )
    title = models.CharField(max_length=240)
    issuer = models.CharField(max_length=160, blank=True, null=True)
    credential_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "title"]

    def __str__(self):
        return self.title


class Education(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="education_items",
    )
    title = models.CharField(max_length=240)
    institution = models.CharField(max_length=160, blank=True, null=True)
    year = models.CharField(max_length=40, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "title"]

    def __str__(self):
        return self.title


class Experience(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="experience_items",
    )
    title = models.CharField(max_length=180)
    company = models.CharField(max_length=160, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "title"]

    def __str__(self):
        return self.title
