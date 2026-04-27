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
    def send_offer_letter(candidate_email: str, candidate_name: str, job_title: str, company_name: str, salary: str, joining_date: str, onboarding_link: str):
        """
        Sends a professional offer letter email to the candidate.
        """
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD or settings.SMTP_USER == "your-email@gmail.com":
            logger.error("SMTP credentials not configured in .env. Cannot send email.")
            return False

        try:
            msg = MIMEMultipart()
            msg['From'] = settings.EMAILS_FROM_EMAIL
            msg['To'] = candidate_email
            msg['Subject'] = f"Offer Letter - {job_title} at {company_name}"

            body = f"""
Hello {candidate_name},

Congratulations! We are pleased to offer you the position of {job_title} at {company_name}.

Based on your interview performance and technical skills, we believe you will be a great addition to our team.

Offer Details:
- Role: {job_title}
- Company: {company_name}
- Annual Compensation: {salary}
- Joining Date: {joining_date}

Please let us know your decision by replying to this email. 

*** NEXT STEPS ***
To get started with your onboarding, please visit our candidate portal to provide your details and upload the required documents:
{onboarding_link}

We look forward to having you onboard!

Best regards,
The Hiring Team
{company_name}
"""
            msg.attach(MIMEText(body, 'plain'))

            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            text = msg.as_string()
            server.sendmail(settings.EMAILS_FROM_EMAIL, candidate_email, text)
            server.quit()
            
            logger.info(f"Offer letter sent successfully to {candidate_email}")
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
    @staticmethod
    def send_onboarding_welcome(candidate_email: str, candidate_name: str, onboarding_link: str):
        """
        Sends an onboarding welcome email with a link to the onboarding portal.
        """
        logger.info(f"📧 Attempting to send onboarding welcome to {candidate_email}")
        
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            logger.error("❌ SMTP credentials NOT configured. Cannot send onboarding email.")
            return False

        try:
            msg = MIMEMultipart()
            msg['From'] = settings.EMAILS_FROM_EMAIL
            msg['To'] = candidate_email
            msg['Subject'] = "Welcome Aboard! Your Onboarding Journey Begins"

            body = f"""
Hello {candidate_name},

Congratulations on joining the team! We are thrilled to have you with us.

To get started with your onboarding process, we have set up a dedicated portal for you. Please use the link below to provide your joining details and upload the required documents.

Your Onboarding Link:
{onboarding_link}

Required Documents for Upload:
1. Professional Photo (for ID card)
2. Government ID (CNIC/Passport)
3. Educational Documents
4. Experience Letter(s)
5. Last 3 Months Salary Slips
6. Police Clearance Certificate

Please complete these steps at your earliest convenience so we can prepare for your first day.

If you have any questions, feel free to reach out to the HR team.

Welcome to the family!

Best regards,
The Hiring Team
Evalyn AI
"""
            msg.attach(MIMEText(body, 'plain'))

            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            
            text = msg.as_string()
            server.sendmail(settings.EMAILS_FROM_EMAIL, candidate_email, text)
            server.quit()
            
            logger.info(f"✅ Onboarding email SUCCESSFULLY sent to {candidate_email}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to send onboarding email to {candidate_email}: {str(e)}")
            return False

    @staticmethod
    def send_password_reset_email(email: str, reset_link: str):
        """
        Sends a password reset email with a link to the reset page.
        """
        logger.info(f"📧 Attempting to send password reset email to {email}")
        
        # Fallback for development: Always log the link
        logger.info(f"🔑 PASSWORD RESET LINK: {reset_link}")

        if not settings.SMTP_USER or not settings.SMTP_PASSWORD or settings.SMTP_USER == "your-email@gmail.com":
            logger.warning("⚠️ SMTP credentials NOT configured. Link has been logged above for development.")
            return True # Return true so the flow doesn't break in dev

        try:
            msg = MIMEMultipart()
            msg['From'] = settings.EMAILS_FROM_EMAIL
            msg['To'] = email
            msg['Subject'] = "Reset Your Evalyn Password"

            body = f"""
Hello,

We received a request to reset your password for your Evalyn account.

Please click the link below to set a new password:

{reset_link}

This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.

Best regards,
The Evalyn Team
"""
            msg.attach(MIMEText(body, 'plain'))

            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            
            text = msg.as_string()
            server.sendmail(settings.EMAILS_FROM_EMAIL, email, text)
            server.quit()
            
            logger.info(f"✅ Password reset email SUCCESSFULLY sent to {email}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to send password reset email to {email}: {str(e)}")
            return False
