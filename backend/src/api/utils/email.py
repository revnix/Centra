import resend
from src.api.core.config import settings
from typing import Optional

def send_application_notification(
    candidate_name: str,
    candidate_email: str,
    job_id: int,
    resume_link: Optional[str] = None
):
    """
    Sends an email notification to HR when a new application is received.
    """
    if not settings.RESEND_API_KEY:
        print("RESEND_API_KEY not set. Skipping email notification.")
        return

    resend.api_key = settings.RESEND_API_KEY
    
    resume_text = f"<a href='{settings.FRONTEND_URL}{resume_link}'>View Resume</a>" if resume_link else "No resume provided"
    
    html_content = f"""
    <h1>New Job Application Received</h1>
    <p>A new application has been submitted for Job ID: <strong>{job_id}</strong></p>
    <hr />
    <h3>Candidate Details:</h3>
    <ul>
        <li><strong>Name:</strong> {candidate_name}</li>
        <li><strong>Email:</strong> {candidate_email}</li>
        <li><strong>Resume:</strong> {resume_text}</li>
    </ul>
    <p>Please log in to the admin dashboard to review the application.</p>
    """

    try:
        params = {
            "from": settings.EMAILS_FROM_EMAIL,
            "to": [settings.HR_EMAIL],
            "subject": f"New Application: {candidate_name} for Job #{job_id}",
            "html": html_content,
        }
        
        email = resend.Emails.send(params)
        print(f"Email sent successfully: {email}")
        return email
    except Exception as e:
        print(f"Error sending email via Resend: {str(e)}")
        return None
