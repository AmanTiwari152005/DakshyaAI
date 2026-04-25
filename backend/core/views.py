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

from accounts.serializers import get_or_create_profile
from .models import (
    Badge,
    Certification,
    Education,
    Experience,
    PeerEndorsement,
    Project,
    ProjectScreenshot,
    ResumeUpload,
    Skill,
)
from .services.resume_section_parser import parse_resume_sections
from .services.resume_text import extract_text_from_pdf
from .serializers import (
    AssessmentAttemptSerializer,
    BadgeSerializer,
    PeerEndorsementSerializer,
    ProfileBasicInfoSerializer,
    ProjectSerializer,
    SkillSerializer,
    UserLinkSerializer,
    calculate_employability_score,
    calculate_profile_completion,
    get_or_create_user_links,
    get_dashboard_stats,
    serialize_profile_dashboard,
    sync_default_badges,
)


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
