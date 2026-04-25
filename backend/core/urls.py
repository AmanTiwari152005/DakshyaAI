from django.urls import path

from .views import (
    DashboardBadgesView,
    DashboardProjectsView,
    DashboardSkillsView,
    DashboardSummaryView,
    ProfileDashboardAssessmentsView,
    ProfileDashboardBasicInfoView,
    ProfileDashboardEndorsementsView,
    ProfileDashboardLinksView,
    ProfileDashboardProjectDetailView,
    ProfileDashboardProjectListCreateView,
    ProfileDashboardSkillDetailView,
    ProfileDashboardSkillListCreateView,
    ProfileDashboardView,
    ProjectDetailView,
    ProjectListCreateView,
    ProjectSubmitReviewView,
    SkillDetailView,
    SkillListCreateView,
)

urlpatterns = [
    path("dashboard/summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),
    path("dashboard/skills/", DashboardSkillsView.as_view(), name="dashboard-skills"),
    path("dashboard/projects/", DashboardProjectsView.as_view(), name="dashboard-projects"),
    path("dashboard/badges/", DashboardBadgesView.as_view(), name="dashboard-badges"),
    path("skills/", SkillListCreateView.as_view(), name="skills"),
    path("skills/<int:pk>/", SkillDetailView.as_view(), name="skill-detail"),
    path("projects/", ProjectListCreateView.as_view(), name="projects"),
    path("projects/<int:pk>/", ProjectDetailView.as_view(), name="project-detail"),
    path(
        "projects/<int:pk>/submit-review/",
        ProjectSubmitReviewView.as_view(),
        name="project-submit-review",
    ),
    path("profile-dashboard/", ProfileDashboardView.as_view(), name="profile-dashboard"),
    path(
        "profile-dashboard/basic-info/",
        ProfileDashboardBasicInfoView.as_view(),
        name="profile-dashboard-basic-info",
    ),
    path(
        "profile-dashboard/links/",
        ProfileDashboardLinksView.as_view(),
        name="profile-dashboard-links",
    ),
    path(
        "profile-dashboard/skills/",
        ProfileDashboardSkillListCreateView.as_view(),
        name="profile-dashboard-skills",
    ),
    path(
        "profile-dashboard/skills/<int:pk>/",
        ProfileDashboardSkillDetailView.as_view(),
        name="profile-dashboard-skill-detail",
    ),
    path(
        "profile-dashboard/projects/",
        ProfileDashboardProjectListCreateView.as_view(),
        name="profile-dashboard-projects",
    ),
    path(
        "profile-dashboard/projects/<int:pk>/",
        ProfileDashboardProjectDetailView.as_view(),
        name="profile-dashboard-project-detail",
    ),
    path(
        "profile-dashboard/assessments/",
        ProfileDashboardAssessmentsView.as_view(),
        name="profile-dashboard-assessments",
    ),
    path(
        "profile-dashboard/endorsements/",
        ProfileDashboardEndorsementsView.as_view(),
        name="profile-dashboard-endorsements",
    ),
]
