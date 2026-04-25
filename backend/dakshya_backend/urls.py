from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from core.views import ResumeConfirmSaveView, ResumeUploadView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/resume-upload/", ResumeUploadView.as_view(), name="resume-upload"),
    path(
        "api/resume-confirm-save/",
        ResumeConfirmSaveView.as_view(),
        name="resume-confirm-save",
    ),
    path("api/", include("accounts.urls")),
    path("api/", include("core.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
