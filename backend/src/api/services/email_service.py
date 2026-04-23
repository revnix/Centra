import requests
import logging
from src.api.core.config import settings

logger = logging.getLogger(__name__)

_RESEND_URL = "https://api.resend.com/emails"


def _send_via_resend(to_email: str, subject: str, html: str) -> dict:
    """Core Resend REST call. Raises RuntimeError on any failure."""
    if not settings.RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY is not configured in .env.")

    # Redirect all mail to a single address when using a Resend test key
    effective_to = settings.EMAIL_TEST_OVERRIDE or to_email
    if settings.EMAIL_TEST_OVERRIDE and settings.EMAIL_TEST_OVERRIDE != to_email:
        subject = f"[TEST → {to_email}] {subject}"

    from_field = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"

    payload = {
        "from": from_field,
        "to": [effective_to],
        "subject": subject,
        "html": html,
    }

    print(f"Sending email via Resend → from={from_field!r}  to={effective_to!r}  subject={subject!r}")

    response = requests.post(
        _RESEND_URL,
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=15,
    )

    print(f"Resend response: {response.status_code} {response.text}")
    logger.info(f"Resend {response.status_code}: {response.text}")

    if response.status_code not in (200, 201):
        raise RuntimeError(f"Resend API error {response.status_code}: {response.text}")

    return response.json()


class EmailService:

    @staticmethod
    def send_job_to_manager(job_title: str, job_details: str) -> bool:
        html = f"""
        <div style="font-family:Arial,sans-serif;color:#333;max-width:600px;">
            <h2 style="color:#1e40af;">New Job Post for Review</h2>
            <p>A new job post has been generated and is ready for your review.</p>
            <hr style="border:none;border-top:1px solid #eee;" />
            <pre style="background:#f5f5f5;padding:16px;border-radius:4px;
                        white-space:pre-wrap;font-size:13px;">{job_details}</pre>
            <p>Best regards,<br/><strong>Evalyn AI</strong></p>
        </div>
        """
        _send_via_resend(
            to_email=settings.OPERATIONS_MANAGER_EMAIL,
            subject=f"New Job Post for Review: {job_title}",
            html=html,
        )
        logger.info(f"Job email sent to {settings.OPERATIONS_MANAGER_EMAIL}")
        return True

    @staticmethod
    def send_offer_letter(
        candidate_email: str,
        candidate_name: str,
        job_title: str,
        company_name: str,
        salary: str,
        joining_date: str,
    ) -> bool:
        html = f"""
        <div style="font-family:Arial,sans-serif;color:#333;max-width:600px;">
            <h2>Offer Letter – {job_title} at {company_name}</h2>
            <p>Dear {candidate_name},</p>
            <p>Congratulations! We are pleased to offer you the position of
               <strong>{job_title}</strong> at <strong>{company_name}</strong>.</p>
            <h3>Offer Details</h3>
            <ul>
                <li><strong>Role:</strong> {job_title}</li>
                <li><strong>Company:</strong> {company_name}</li>
                <li><strong>Annual Compensation:</strong> {salary}</li>
                <li><strong>Joining Date:</strong> {joining_date}</li>
            </ul>
            <p>Please reply to this email with your decision.</p>
            <p>Best regards,<br/>The Hiring Team<br/>{company_name}</p>
        </div>
        """
        try:
            _send_via_resend(
                to_email=candidate_email,
                subject=f"Offer Letter – {job_title} at {company_name}",
                html=html,
            )
            logger.info(f"Offer letter sent to {candidate_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send offer letter to {candidate_email}: {e}")
            return False

    @staticmethod
    def send_shortlist_notification(
        candidate_email: str,
        candidate_name: str,
        job_title: str,
    ) -> bool:
        if not candidate_email:
            logger.error("Candidate email missing — aborting shortlist notification.")
            return False

        name_display = candidate_name or "Candidate"

        html = f"""
        <div style="font-family:Arial,sans-serif;color:#333;max-width:600px;line-height:1.6;">
            <p>Dear {name_display},</p>

            <p>Congratulations!</p>

            <p>We have carefully reviewed your profile and assessment results for the
               <strong>{job_title}</strong> position at <strong>Revnix</strong>.
               We are pleased to inform you that your profile and score meet our requirements
               and you have been <strong>shortlisted</strong> for the next stage of our
               recruitment process.</p>

            <p>We would like to invite you to proceed with the interview process.</p>

            <div style="background:#f0fdf4;padding:16px;border-left:4px solid #16a34a;
                        margin:24px 0;border-radius:4px;">
                <p style="margin:0;font-weight:600;">📱 Next Step — Contact Us on WhatsApp</p>
                <p style="margin:8px 0 0;">Please reach out to us on WhatsApp to schedule
                   your interview or for any further details:</p>
                <p style="margin:8px 0 0;font-size:18px;font-weight:700;color:#15803d;">
                   03125932632
                </p>
            </div>

            <p>We look forward to speaking with you and wish you the best in the next stage.</p>

            <p>Warm regards,<br/>
            <strong>Revnix Hiring Team</strong><br/>
            Revnix Corporation</p>
        </div>
        """
        try:
            logger.info(f"[SHORTLIST] Sending WhatsApp-invite email to {candidate_email} for {job_title}")
            _send_via_resend(
                to_email=candidate_email,
                subject="Next Steps in Your Application – Revnix",
                html=html,
            )
            logger.info(f"[SHORTLIST] ✅ Email sent successfully to {candidate_email}")
            return True
        except Exception as e:
            logger.error(f"[SHORTLIST] ❌ Failed to send email to {candidate_email}: {e}")
            return False

    @staticmethod
    def send_automated_interview_invitation(
        candidate_email: str,
        candidate_name: str,
        interview_date: str,
        interview_time: str,
    ) -> bool:
        html = f"""
        <div style="font-family:Arial,sans-serif;color:#333;max-width:600px;">
            <h2>Interview Invitation</h2>
            <p>Dear {candidate_name},</p>
            <p>Congratulations! Based on your assessment, you have been shortlisted for an interview.</p>
            <h3>Interview Schedule</h3>
            <ul>
                <li><strong>Date:</strong> {interview_date}</li>
                <li><strong>Time:</strong> {interview_time}</li>
            </ul>
            <p>Please be available at the scheduled time.</p>
            <p>Best regards,<br/>HR Team</p>
        </div>
        """
        try:
            _send_via_resend(
                to_email=candidate_email,
                subject="Interview Invitation",
                html=html,
            )
            logger.info(f"Interview invitation sent to {candidate_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send interview invitation to {candidate_email}: {e}")
            return False

    @staticmethod
    def send_new_application_notification(
        candidate_name: str,
        candidate_email: str,
        job_title: str,
        source: str,
        resume_link: str = None,
    ) -> bool:
        resume_html = (
            f"<a href='{settings.FRONTEND_URL}{resume_link}'>View Resume</a>"
            if resume_link
            else "Not attached"
        )
        html = f"""
        <div style="font-family:sans-serif;color:#333;max-width:600px;">
            <h2 style="color:#2563eb;">New Application Received</h2>
            <p>A new candidate has applied for <strong>{job_title}</strong>.</p>
            <p><strong>Source:</strong> {source.upper()}</p>
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
            _send_via_resend(
                to_email=settings.HR_EMAIL,
                subject=f"[{source.upper()}] New Application: {candidate_name} for {job_title}",
                html=html,
            )
            return True
        except Exception as e:
            logger.error(f"Failed to send application notification: {e}")
            return False
