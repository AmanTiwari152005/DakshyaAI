import os

import resend


class OTPEmailError(RuntimeError):
    pass


def send_signup_otp(email, otp):
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        raise OTPEmailError("RESEND_API_KEY is not configured.")

    resend.api_key = api_key
    from_email = os.getenv("DEFAULT_FROM_EMAIL", "onboarding@resend.dev")
    html_body = f"""
    <div style="font-family: Arial, sans-serif; color: #111827;">
      <h2 style="color: #1E3A8A;">DakshyaAI Email Verification</h2>
      <p>Your DakshyaAI verification OTP is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; color: #7C3AED;">
        {otp}
      </p>
      <p>This OTP is valid for 10 minutes.</p>
    </div>
    """

    resend.Emails.send(
        {
            "from": from_email,
            "to": [email],
            "subject": "DakshyaAI Email Verification OTP",
            "html": html_body,
        }
    )
