from datetime import timedelta

from django.contrib.auth.models import User
from django.db.models import Count, Q
from rest_framework import status
from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveUpdateAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone

from accounts.models import UserProfile
from accounts.serializers import get_or_create_profile
from .models import (
    Badge,
    Certification,
    Education,
    Experience,
    JobApplication,
    JobPost,
    PeerEndorsement,
    Project,
    ProjectValidation,
    ProjectScreenshot,
    RecruiterProfile,
    ResumeUpload,
    Skill,
    TestLock,
)
from .services.openai_quiz import QuizGenerationError, generate_skill_quiz
from .services.eva_ai import (
    answer_interview,
    ask_eva,
    end_interview,
    start_interview,
)
from .services.resume_section_parser import parse_resume_sections
from .services.resume_text import extract_text_from_pdf
from .serializers import (
    AssessmentAttemptSerializer,
    BadgeSerializer,
    JobApplicationSerializer,
    JobPostSerializer,
    PeerEndorsementSerializer,
    ProfileBasicInfoSerializer,
    ProjectValidationSerializer,
    ProjectSerializer,
    RecruiterProfileSerializer,
    SkillSerializer,
    UserLinkSerializer,
    calculate_employability_score,
    calculate_profile_completion,
    get_or_create_user_links,
    get_dashboard_stats,
    serialize_profile_dashboard,
    sync_default_badges,
)


ANTI_CHEAT_MAX_WARNINGS = 3
ANTI_CHEAT_LOCK_DURATION = timedelta(hours=48)
ANTI_CHEAT_LOCK_MESSAGE = (
    "This test is locked for 48 hours due to anti-cheating warnings."
)


def get_skill_name_from_request(request):
    return str(request.data.get("skill_name", "")).strip()


def get_existing_test_lock(user, skill_name):
    test_lock = TestLock.objects.filter(user=user, skill_name__iexact=skill_name).first()
    if (
        test_lock
        and test_lock.locked_until
        and test_lock.locked_until <= timezone.now()
    ):
        test_lock.locked_until = None
        test_lock.warning_count = 0
        test_lock.reason = TestLock.REASON_ANTI_CHEATING
        test_lock.save(
            update_fields=["locked_until", "warning_count", "reason", "updated_at"]
        )
    return test_lock


def get_or_create_test_lock(user, skill_name, reason=TestLock.REASON_ANTI_CHEATING):
    existing_lock = get_existing_test_lock(user, skill_name)
    if existing_lock:
        return existing_lock, False
    return TestLock.objects.create(
        user=user,
        skill_name=skill_name,
        reason=reason or TestLock.REASON_ANTI_CHEATING,
    ), True


def get_remaining_lock_seconds(test_lock):
    if not test_lock or not test_lock.locked_until:
        return 0
    remaining = (test_lock.locked_until - timezone.now()).total_seconds()
    return max(0, int(remaining))


def is_test_lock_active(test_lock):
    return bool(
        test_lock
        and test_lock.locked_until
        and test_lock.locked_until > timezone.now()
    )


def build_locked_response(test_lock):
    return {
        "locked": True,
        "locked_until": test_lock.locked_until,
        "remaining_seconds": get_remaining_lock_seconds(test_lock),
        "warning_count": test_lock.warning_count,
        "message": ANTI_CHEAT_LOCK_MESSAGE,
    }


def is_recruiter(user):
    profile = get_or_create_profile(user)
    return profile.account_type == UserProfile.ACCOUNT_RECRUITER


def is_candidate(user):
    profile = get_or_create_profile(user)
    return profile.account_type == UserProfile.ACCOUNT_CANDIDATE


def recruiter_required_response():
    return Response(
        {"detail": "Recruiter account required."},
        status=status.HTTP_403_FORBIDDEN,
    )


def candidate_required_response():
    return Response(
        {"detail": "Candidate account required."},
        status=status.HTTP_403_FORBIDDEN,
    )


def get_recruiter_profile(user):
    return RecruiterProfile.objects.filter(user=user).first()


def get_candidate_job_queryset(user):
    profile = get_or_create_profile(user)
    skills = list(user.skills.values_list("name", flat=True))
    queryset = (
        JobPost.objects.filter(is_active=True)
        .select_related("recruiter")
        .annotate(applications_count=Count("applications"))
    )

    filters = Q()
    if profile.target_role:
        filters |= Q(role__icontains=profile.target_role)
        filters |= Q(title__icontains=profile.target_role)
    for skill_name in skills:
        filters |= Q(required_skills__icontains=skill_name)

    if filters:
        return queryset.filter(filters).distinct()
    return queryset


class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sync_default_badges(request.user)
        profile = get_or_create_profile(request.user)

        return Response(
            {
                "full_name": profile.full_name or request.user.email,
                "employability_score": calculate_employability_score(request.user),
                "profile_completion_percentage": calculate_profile_completion(request.user),
                "stats": get_dashboard_stats(request.user),
            }
        )


class DashboardSkillsView(ListAPIView):
    serializer_class = SkillSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Skill.objects.filter(user=self.request.user)


class DashboardProjectsView(ListAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user)


class DashboardBadgesView(ListAPIView):
    serializer_class = BadgeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        sync_default_badges(self.request.user)
        return Badge.objects.filter(user=self.request.user)


class SkillListCreateView(ListCreateAPIView):
    serializer_class = SkillSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Skill.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SkillDetailView(RetrieveUpdateAPIView):
    serializer_class = SkillSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["patch", "options"]

    def get_queryset(self):
        return Skill.objects.filter(user=self.request.user)


class ProjectListCreateView(ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ProjectDetailView(RetrieveUpdateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["patch", "options"]

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user)


class ProjectSubmitReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            project = Project.objects.get(pk=pk, user=request.user)
        except Project.DoesNotExist:
            return Response(
                {"detail": "Project not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        project.verification_status = Project.STATUS_UNDER_REVIEW
        project.save(update_fields=["verification_status", "updated_at"])
        sync_default_badges(request.user)

        return Response(
            {
                "success": True,
                "message": "Project submitted for review.",
                "project": ProjectSerializer(project, context={"request": request}).data,
            }
        )


class RecruiterProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_recruiter(request.user):
            return recruiter_required_response()

        recruiter = get_recruiter_profile(request.user)
        if not recruiter:
            return Response(
                {"detail": "Recruiter profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "profile": RecruiterProfileSerializer(
                    recruiter,
                    context={"request": request},
                ).data
            }
        )

    def post(self, request):
        if not is_recruiter(request.user):
            return recruiter_required_response()

        recruiter = get_recruiter_profile(request.user)
        serializer = RecruiterProfileSerializer(
            recruiter,
            data=request.data,
            partial=bool(recruiter),
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user, is_profile_complete=True)

        return Response(
            {
                "success": True,
                "profile": serializer.data,
            },
            status=status.HTTP_200_OK if recruiter else status.HTTP_201_CREATED,
        )


class RecruiterJobListCreateView(ListCreateAPIView):
    serializer_class = JobPostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        recruiter = get_recruiter_profile(self.request.user)
        if not recruiter:
            return JobPost.objects.none()
        return (
            JobPost.objects.filter(recruiter=recruiter)
            .select_related("recruiter")
            .annotate(applications_count=Count("applications"))
        )

    def list(self, request, *args, **kwargs):
        if not is_recruiter(request.user):
            return recruiter_required_response()
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if not is_recruiter(request.user):
            return recruiter_required_response()
        recruiter = get_recruiter_profile(request.user)
        if not recruiter or not recruiter.is_profile_complete:
            return Response(
                {"detail": "Complete recruiter profile before posting jobs."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(recruiter=get_recruiter_profile(self.request.user))


class RecruiterJobDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = JobPostSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["patch", "delete", "options"]

    def get_queryset(self):
        recruiter = get_recruiter_profile(self.request.user)
        if not recruiter:
            return JobPost.objects.none()
        return (
            JobPost.objects.filter(recruiter=recruiter)
            .select_related("recruiter")
            .annotate(applications_count=Count("applications"))
        )

    def patch(self, request, *args, **kwargs):
        if not is_recruiter(request.user):
            return recruiter_required_response()
        return super().patch(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        if not is_recruiter(request.user):
            return recruiter_required_response()
        return super().delete(request, *args, **kwargs)


class RecruiterApplicationsView(ListAPIView):
    serializer_class = JobApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        recruiter = get_recruiter_profile(self.request.user)
        if not recruiter:
            return JobApplication.objects.none()
        return (
            JobApplication.objects.filter(job__recruiter=recruiter)
            .select_related("job", "job__recruiter", "candidate")
            .prefetch_related("candidate__skills", "candidate__projects")
        )

    def list(self, request, *args, **kwargs):
        if not is_recruiter(request.user):
            return recruiter_required_response()
        return super().list(request, *args, **kwargs)


class RecruiterApplicationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if not is_recruiter(request.user):
            return recruiter_required_response()

        recruiter = get_recruiter_profile(request.user)
        application = (
            JobApplication.objects.filter(pk=pk, job__recruiter=recruiter)
            .select_related("job", "job__recruiter", "candidate")
            .prefetch_related("candidate__skills", "candidate__projects", "candidate__badges")
            .first()
        )
        if not application:
            return Response(
                {"detail": "Application not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            JobApplicationSerializer(application, context={"request": request}).data
        )


def sync_recruiter_validation_effects(validation):
    candidate = validation.candidate
    if validation.upvote:
        project = validation.project
        if project.verification_status != Project.STATUS_VERIFIED:
            project.verification_status = Project.STATUS_VERIFIED
            project.save(update_fields=["verification_status", "updated_at"])

        badge, _ = Badge.objects.get_or_create(
            user=candidate,
            badge_type="peer_validation",
            defaults={
                "title": "Recruiter Validated Project",
                "icon_name": "medal",
                "is_earned": True,
                "requirement_text": "Receive a recruiter upvote or validation comment on a project.",
                "earned_at": timezone.now(),
            },
        )
        if not badge.is_earned:
            badge.title = "Recruiter Validated Project"
            badge.icon_name = "medal"
            badge.is_earned = True
            badge.requirement_text = (
                "Receive a recruiter upvote or validation comment on a project."
            )
            badge.earned_at = timezone.now()
            badge.save(
                update_fields=[
                    "title",
                    "icon_name",
                    "is_earned",
                    "requirement_text",
                    "earned_at",
                ]
            )

    if validation.comment:
        endorsement, created = PeerEndorsement.objects.get_or_create(
            user=candidate,
            project=validation.project,
            reviewer_name=validation.recruiter.recruiter_name,
            relationship="Recruiter validation",
            defaults={
                "reviewer_role": validation.recruiter.designation,
                "rating": 5 if validation.upvote else 4,
                "comment": validation.comment,
                "is_approved": True,
            },
        )
        if not created:
            endorsement.reviewer_role = validation.recruiter.designation
            endorsement.rating = 5 if validation.upvote else 4
            endorsement.comment = validation.comment
            endorsement.is_approved = True
            endorsement.save(
                update_fields=[
                    "reviewer_role",
                    "rating",
                    "comment",
                    "is_approved",
                ]
            )

    sync_default_badges(candidate)


class RecruiterProjectValidationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not is_recruiter(request.user):
            return recruiter_required_response()

        recruiter = get_recruiter_profile(request.user)
        if not recruiter or not recruiter.is_profile_complete:
            return Response(
                {"detail": "Complete recruiter profile before validating projects."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        candidate_id = request.data.get("candidate_id")
        project_id = request.data.get("project_id")
        application_id = request.data.get("application_id")
        comment = str(request.data.get("comment", "")).strip()
        upvote = bool(request.data.get("upvote", False))

        candidate = User.objects.filter(id=candidate_id).first()
        if not candidate:
            return Response(
                {"detail": "Candidate not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        project = Project.objects.filter(id=project_id, user=candidate).first()
        if not project:
            return Response(
                {"detail": "Project not found for this candidate."},
                status=status.HTTP_404_NOT_FOUND,
            )

        application = None
        if application_id:
            application = JobApplication.objects.filter(
                id=application_id,
                candidate=candidate,
                job__recruiter=recruiter,
            ).first()
            if not application:
                return Response(
                    {"detail": "Application not found for this recruiter."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        validation, created = ProjectValidation.objects.get_or_create(
            recruiter=recruiter,
            candidate=candidate,
            project=project,
            application=application,
            defaults={"upvote": upvote, "comment": comment},
        )

        if not created:
            validation.upvote = upvote
            validation.comment = comment
            validation.save(update_fields=["upvote", "comment"])

        sync_recruiter_validation_effects(validation)

        return Response(
            {
                "success": True,
                "validation": ProjectValidationSerializer(
                    validation,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CandidateJobsView(ListAPIView):
    serializer_class = JobPostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not is_candidate(self.request.user):
            return JobPost.objects.none()
        return get_candidate_job_queryset(self.request.user)

    def list(self, request, *args, **kwargs):
        if not is_candidate(request.user):
            return candidate_required_response()
        return super().list(request, *args, **kwargs)


class CandidateJobApplyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not is_candidate(request.user):
            return candidate_required_response()

        job = JobPost.objects.filter(pk=pk, is_active=True).first()
        if not job:
            return Response(
                {"detail": "Active job not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        application, created = JobApplication.objects.get_or_create(
            job=job,
            candidate=request.user,
            defaults={"cover_note": str(request.data.get("cover_note", "")).strip()},
        )

        if not created and request.data.get("cover_note") is not None:
            application.cover_note = str(request.data.get("cover_note", "")).strip()
            application.save(update_fields=["cover_note"])

        return Response(
            {
                "success": True,
                "application": JobApplicationSerializer(
                    application,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CandidateApplicationsView(ListAPIView):
    serializer_class = JobApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return JobApplication.objects.filter(candidate=self.request.user).select_related(
            "job",
            "job__recruiter",
            "candidate",
        )

    def list(self, request, *args, **kwargs):
        if not is_candidate(request.user):
            return candidate_required_response()
        return super().list(request, *args, **kwargs)


class CandidateProjectValidationsView(ListAPIView):
    serializer_class = ProjectValidationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            ProjectValidation.objects.filter(candidate=self.request.user)
            .select_related("recruiter", "project", "application")
            .all()
        )

    def list(self, request, *args, **kwargs):
        if not is_candidate(request.user):
            return candidate_required_response()
        return super().list(request, *args, **kwargs)


def attach_project_screenshots(project, request):
    for image in request.FILES.getlist("screenshots"):
        ProjectScreenshot.objects.create(project=project, image=image)


class ProfileDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(serialize_profile_dashboard(request.user, request))


class ProfileDashboardBasicInfoView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request):
        profile = get_or_create_profile(request.user)
        serializer = ProfileBasicInfoSerializer(
            profile,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "success": True,
                "profile": serialize_profile_dashboard(request.user, request)["profile"],
            }
        )


class ProfileDashboardLinksView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request):
        links = get_or_create_user_links(request.user)
        serializer = UserLinkSerializer(
            links,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "success": True,
                "links": UserLinkSerializer(links, context={"request": request}).data,
            }
        )


class ProfileDashboardSkillListCreateView(ListCreateAPIView):
    serializer_class = SkillSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Skill.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ProfileDashboardSkillDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = SkillSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["patch", "delete", "options"]

    def get_queryset(self):
        return Skill.objects.filter(user=self.request.user)


class ProfileDashboardProjectListCreateView(ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        project = serializer.save(user=self.request.user)
        attach_project_screenshots(project, self.request)


class ProfileDashboardProjectDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["patch", "delete", "options"]

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        project = serializer.save()
        attach_project_screenshots(project, self.request)


class ProfileDashboardAssessmentsView(ListAPIView):
    serializer_class = AssessmentAttemptSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.request.user.assessment_attempts.select_related("skill").all()


class ProfileDashboardEndorsementsView(ListAPIView):
    serializer_class = PeerEndorsementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            PeerEndorsement.objects.filter(user=self.request.user, is_approved=True)
            .select_related("project", "skill")
            .all()
        )


class ResumeUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        resume_file = request.FILES.get("resume")

        if not resume_file:
            return Response(
                {"detail": "Please select a PDF resume file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not resume_file.name.lower().endswith(".pdf"):
            return Response(
                {"detail": "Only PDF resumes are supported."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            upload = ResumeUpload.objects.create(
                user=request.user,
                resume_file=resume_file,
            )
            try:
                extracted_text = extract_text_from_pdf(upload.resume_file.path)
            except Exception:
                upload.delete()
                return Response(
                    {"detail": "Unable to extract text from this PDF."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            structured_data = parse_resume_sections(extracted_text)
            upload.extracted_text = extracted_text
            upload.structured_data = structured_data
            upload.save(update_fields=["extracted_text", "structured_data"])
        except Exception:
            return Response(
                {"detail": "Unable to save and process this resume."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        file_url = request.build_absolute_uri(upload.resume_file.url)

        return Response(
            {
                "success": True,
                "resume_upload_id": upload.id,
                "file_url": file_url,
                "extracted_text": extracted_text,
                "structured_data": structured_data,
            }
        )


def get_item_title(item):
    if isinstance(item, dict):
        return (
            item.get("title")
            or item.get("name")
            or item.get("test_title")
            or item.get("description")
            or ""
        ).strip()
    return str(item).strip()


def create_without_duplicate(model, user, title, **defaults):
    cleaned_title = title.strip()
    if not cleaned_title:
        return None, False
    return model.objects.get_or_create(
        user=user,
        title__iexact=cleaned_title,
        defaults={"title": cleaned_title, **defaults},
    )


def save_resume_structured_data(user, structured_data, resume_upload=None):
    profile = get_or_create_profile(user)
    links = get_or_create_user_links(user)
    basic_info = structured_data.get("basic_info", {}) or {}
    resume_links = structured_data.get("links", {}) or {}
    saved_counts = {
        "skills": 0,
        "projects": 0,
        "certifications": 0,
        "education": 0,
        "experience": 0,
    }

    if basic_info.get("name"):
        profile.full_name = basic_info["name"].strip()
    if basic_info.get("role"):
        profile.target_role = basic_info["role"].strip()
    if basic_info.get("location"):
        profile.location = basic_info["location"].strip()
    profile.save(update_fields=["full_name", "target_role", "location", "updated_at"])

    if resume_links.get("github"):
        links.github_url = resume_links["github"].strip()
    if resume_links.get("linkedin"):
        links.linkedin_url = resume_links["linkedin"].strip()
    if resume_upload and resume_upload.resume_file:
        links.resume_file.name = resume_upload.resume_file.name
    links.save(update_fields=["github_url", "linkedin_url", "resume_file", "updated_at"])

    for skill_name in structured_data.get("skills", []):
        cleaned_skill = get_item_title(skill_name)
        if not cleaned_skill:
            continue
        _, created = Skill.objects.get_or_create(
            user=user,
            name__iexact=cleaned_skill,
            defaults={
                "name": cleaned_skill,
                "level": Skill.LEVEL_INTERMEDIATE,
                "progress_score": 60,
                "verification_status": Skill.STATUS_NOT_TESTED,
                "source": Skill.SOURCE_MANUAL,
            },
        )
        if created:
            saved_counts["skills"] += 1

    skill_stack = ", ".join(structured_data.get("skills", [])[:5]) or "From resume"
    for project_item in structured_data.get("projects", []):
        title = get_item_title(project_item)
        _, created = create_without_duplicate(
            Project,
            user,
            title,
            description=title,
            tech_stack=skill_stack,
        )
        if created:
            saved_counts["projects"] += 1

    for item in structured_data.get("certifications", []):
        _, created = create_without_duplicate(Certification, user, get_item_title(item))
        if created:
            saved_counts["certifications"] += 1

    for item in structured_data.get("education", []):
        _, created = create_without_duplicate(Education, user, get_item_title(item))
        if created:
            saved_counts["education"] += 1

    for item in structured_data.get("experience", []):
        _, created = create_without_duplicate(
            Experience,
            user,
            get_item_title(item),
            description=get_item_title(item),
        )
        if created:
            saved_counts["experience"] += 1

    sync_default_badges(user)
    return saved_counts


class ResumeConfirmSaveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        resume_upload_id = request.data.get("resume_upload_id")
        structured_data = request.data.get("structured_data") or {}
        resume_upload = None

        if resume_upload_id:
            try:
                resume_upload = ResumeUpload.objects.get(
                    id=resume_upload_id,
                    user=request.user,
                )
            except ResumeUpload.DoesNotExist:
                return Response(
                    {"detail": "Resume upload not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if not structured_data:
                structured_data = resume_upload.structured_data or {}

        if not structured_data:
            return Response(
                {"detail": "No structured resume data provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        saved_counts = save_resume_structured_data(
            request.user,
            structured_data,
            resume_upload=resume_upload,
        )

        return Response(
            {
                "success": True,
                "message": "Extracted resume data saved to profile.",
                "saved_counts": saved_counts,
            }
        )


class QuizGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        skill_name = get_skill_name_from_request(request)
        difficulty = str(request.data.get("difficulty", "intermediate")).strip()

        if not skill_name:
            return Response(
                {"detail": "Skill name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        test_lock = get_existing_test_lock(request.user, skill_name)
        if is_test_lock_active(test_lock):
            return Response(build_locked_response(test_lock), status=status.HTTP_423_LOCKED)

        try:
            quiz = generate_skill_quiz(skill_name, difficulty=difficulty)
        except QuizGenerationError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"success": True, "quiz": quiz})


class QuizCheckLockView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        skill_name = get_skill_name_from_request(request)

        if not skill_name:
            return Response(
                {"detail": "Skill name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        test_lock = get_existing_test_lock(request.user, skill_name)
        if is_test_lock_active(test_lock):
            return Response(build_locked_response(test_lock))

        return Response(
            {
                "locked": False,
                "warning_count": test_lock.warning_count if test_lock else 0,
                "remaining_warnings": max(
                    0,
                    ANTI_CHEAT_MAX_WARNINGS
                    - (test_lock.warning_count if test_lock else 0),
                ),
            }
        )


class QuizAntiCheatWarningView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        skill_name = get_skill_name_from_request(request)
        reason = str(request.data.get("reason", TestLock.REASON_ANTI_CHEATING)).strip()

        if not skill_name:
            return Response(
                {"detail": "Skill name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        test_lock, _ = get_or_create_test_lock(request.user, skill_name, reason=reason)
        if is_test_lock_active(test_lock):
            return Response(build_locked_response(test_lock))

        test_lock.warning_count += 1
        test_lock.reason = reason or TestLock.REASON_ANTI_CHEATING

        if test_lock.warning_count > ANTI_CHEAT_MAX_WARNINGS:
            test_lock.locked_until = timezone.now() + ANTI_CHEAT_LOCK_DURATION
            test_lock.save(
                update_fields=["warning_count", "reason", "locked_until", "updated_at"]
            )
            return Response(
                {
                    "locked": True,
                    "warning_count": test_lock.warning_count,
                    "locked_until": test_lock.locked_until,
                    "remaining_seconds": get_remaining_lock_seconds(test_lock),
                    "message": (
                        "Test locked for 48 hours due to repeated anti-cheating warnings."
                    ),
                }
            )

        test_lock.save(update_fields=["warning_count", "reason", "updated_at"])
        return Response(
            {
                "locked": False,
                "warning_count": test_lock.warning_count,
                "remaining_warnings": max(
                    0,
                    ANTI_CHEAT_MAX_WARNINGS - test_lock.warning_count,
                ),
                "message": (
                    f"Warning {test_lock.warning_count}/3: "
                    "Please keep your face visible."
                ),
            }
        )


class QuizResetWarningsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        skill_name = get_skill_name_from_request(request)

        if not skill_name:
            return Response(
                {"detail": "Skill name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        test_lock = get_existing_test_lock(request.user, skill_name)
        if not test_lock:
            return Response({"success": True, "warning_count": 0})

        if is_test_lock_active(test_lock):
            return Response(build_locked_response(test_lock))

        test_lock.warning_count = 0
        test_lock.reason = TestLock.REASON_ANTI_CHEATING
        test_lock.save(update_fields=["warning_count", "reason", "updated_at"])
        return Response({"success": True, "warning_count": 0})


class QuizSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        skill_name = get_skill_name_from_request(request)
        answers = request.data.get("answers") or {}
        quiz = request.data.get("quiz") or {}
        questions = quiz.get("questions", [])

        if not skill_name:
            return Response(
                {"detail": "Skill name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(answers, dict):
            return Response(
                {"detail": "Answers must be an object keyed by question id."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(questions, list) or len(questions) != 10:
            return Response(
                {"detail": "A complete 10-question quiz is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        score = 0
        results = []

        for index, question in enumerate(questions, start=1):
            question_id = str(question.get("id", index))
            selected_answer = str(answers.get(question_id, "")).strip().upper()
            correct_answer = str(question.get("correct_answer", "")).strip().upper()
            is_correct = selected_answer == correct_answer

            if is_correct:
                score += 1

            results.append(
                {
                    "id": int(question.get("id", index)),
                    "question": question.get("question", ""),
                    "options": question.get("options", {}),
                    "selected_answer": selected_answer,
                    "correct_answer": correct_answer,
                    "is_correct": is_correct,
                    "explanation": question.get("explanation", ""),
                }
            )

        percentage = score * 10
        passed = percentage >= 70
        skill_updated = False
        badge_unlocked = False
        badge_payload = None

        if passed:
            skill = Skill.objects.filter(user=request.user, name__iexact=skill_name).first()

            if skill:
                skill.progress_score = max(skill.progress_score, percentage)
                skill.verification_status = Skill.STATUS_VERIFIED
                skill.source = Skill.SOURCE_TEST
                skill.save(
                    update_fields=[
                        "progress_score",
                        "verification_status",
                        "source",
                        "updated_at",
                    ]
                )
                skill_updated = True

                badge_title = f"{skill.name} Test Verified"
                requirement_text = f"Score 70% or above in {skill.name} test"
                badge, created = Badge.objects.get_or_create(
                    user=request.user,
                    badge_type="skill_test",
                    defaults={
                        "title": badge_title,
                        "icon_name": "trophy",
                        "skill": skill,
                        "is_earned": True,
                        "requirement_text": requirement_text,
                        "earned_at": timezone.now(),
                    },
                )

                if created:
                    badge_unlocked = True
                else:
                    was_earned = badge.is_earned
                    badge.title = badge_title
                    badge.icon_name = "trophy"
                    badge.skill = skill
                    badge.is_earned = True
                    badge.requirement_text = requirement_text
                    if not badge.earned_at:
                        badge.earned_at = timezone.now()
                    badge.save(
                        update_fields=[
                            "title",
                            "icon_name",
                            "skill",
                            "is_earned",
                            "requirement_text",
                            "earned_at",
                        ]
                    )
                    badge_unlocked = not was_earned

                sync_default_badges(request.user)
                badge_payload = BadgeSerializer(badge, context={"request": request}).data

        return Response(
            {
                "success": True,
                "skill_name": skill_name,
                "score": score,
                "total_questions": 10,
                "percentage": percentage,
                "passed": passed,
                "pass_mark": 70,
                "retest_allowed": not passed,
                "skill_updated": skill_updated,
                "badge_unlocked": badge_unlocked,
                "badge": badge_payload,
                "results": results,
            }
        )


class EvaChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message = str(request.data.get("message", "")).strip()
        if not message:
            return Response(
                {"detail": "Message is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            reply = ask_eva(request.user, message)
        except Exception:
            return Response(
                {"detail": "Eva is unavailable right now."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"success": True, "reply": reply})


class EvaInterviewStartView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        mode = str(request.data.get("mode", "voice")).strip() or "voice"
        try:
            interview = start_interview(request.user)
        except Exception:
            return Response(
                {"detail": "Eva interview is unavailable right now."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"success": True, "mode": mode, **interview})


class EvaInterviewAnswerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_id = str(request.data.get("interview_session_id", "")).strip()
        question = str(request.data.get("question", "")).strip()
        answer = str(request.data.get("answer", "")).strip()
        question_number = request.data.get("question_number", 1)
        history = request.data.get("history") or []

        if not session_id or not question or not answer:
            return Response(
                {"detail": "Session id, question, and answer are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = answer_interview(
                request.user,
                question_number=question_number,
                question=question,
                answer=answer,
                history=history,
            )
        except Exception:
            return Response(
                {"detail": "Eva could not review this answer right now."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"success": True, **result})


class EvaInterviewEndView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_id = str(request.data.get("interview_session_id", "")).strip()
        history = request.data.get("history") or []
        if not session_id:
            return Response(
                {"detail": "Interview session id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            report = end_interview(request.user, history=history)
        except Exception:
            return Response(
                {"detail": "Eva could not generate the final report right now."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"success": True, "final_report": report})
