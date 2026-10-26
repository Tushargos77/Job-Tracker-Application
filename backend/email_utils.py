import os
import resend

resend.api_key = os.getenv("RESEND_API_KEY")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


def send_reset_email(to_email: str, token: str):
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    resend.Emails.send({
        "from": "Job Tracker <onboarding@resend.dev>",
        "to": [to_email],
        "subject": "Reset your Job Tracker password",
        "html": f"""
            <p>We received a request to reset your Job Tracker password.</p>
            <p><a href="{reset_link}">Click here to reset your password</a></p>
            <p>This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
        """,
    })


def send_interview_reminder_email(to_email: str, company: str, role: str, interview_at, time_label: str):
    dt_str = interview_at.strftime("%A, %B %d at %I:%M %p UTC")
    resend.Emails.send({
        "from": "Job Tracker <onboarding@resend.dev>",
        "to": [to_email],
        "subject": f"Reminder: {company} interview {time_label}",
        "html": f"""
            <p>Just a heads up — your interview for <strong>{role}</strong> at <strong>{company}</strong> is {time_label}.</p>
            <p>Scheduled for: {dt_str}</p>
            <p>Good luck!</p>
        """,
    })