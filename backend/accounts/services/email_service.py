from django.conf import settings
from django.core.mail import send_mail


def send_signup_otp(email, otp):
    subject = "DakshyaAI Email Verification OTP"
    message = (
        f"Your DakshyaAI verification OTP is {otp}. "
        "It is valid for 10 minutes."
    )
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )
