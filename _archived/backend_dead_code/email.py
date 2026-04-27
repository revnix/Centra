import requests
import logging
from src.api.core.config import settings

logger = logging.getLogger(__name__)


def send_application_notification(
    candidate_name: str,
    candidate_email: str,
    job_id: int,
    resume_link: str = None,
):
    """Notify HR via Resend when a new application is received."""
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set. Skipping notification.")
        return

    resume_html = (
        f"<a href='{settings.FRONTEND_URL}{resume_link}'>View Resume</a>"
        if resume_link
        else "No resume provided"
    )

    html = f"""
    <div style="font-family:sans-serif;color:#333;max-width:600px;">
        <h2>New Job Application Received</h2>
        <p>A new application has been submitted for Job ID: <strong>{job_id}</strong></p>
        <hr style="border:none;border-top:1px solid #eee;" />
        <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:4px 0;"><strong>Name</strong></td><td>{candidate_name}</td></tr>
            <tr><td style="padding:4px 0;"><strong>Email</strong></td><td>{candidate_email}</td></tr>
            <tr><td style="padding:4px 0;"><strong>Resume</strong></td><td>{resume_html}</td></tr>
        </table>
        <br/>
        <p><a href="{settings.FRONTEND_URL}/dashboard/applications">View in Dashboard →</a></p>
    </div>
    """

    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.EMAILS_FROM_EMAIL,
                "to": [settings.HR_EMAIL],
                "subject": f"New Application: {candidate_name} for Job #{job_id}",
                "html": html,
            },
            timeout=15,
        )
        print(f"Resend response: {response.status_code} {response.text}")
        return response.json()
    except Exception as e:
        logger.error(f"Error sending notification via Resend: {e}")
        return None
