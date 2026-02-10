import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from src.api.core.config import settings
import logging

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def send_job_to_manager(job_title: str, job_details: str):
        """
        Sends job details to the Operation Manager via email.
        """
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD or settings.SMTP_USER == "your-email@gmail.com":
            logger.error("SMTP credentials not configured in .env. Cannot send email.")
            return False

        # Debug length (Gmail app passwords are always 16 chars)
        pwd_len = len(settings.SMTP_PASSWORD)
        logger.info(f"DEBUG: SMTP_PASSWORD length is {pwd_len}. (Should be 16 for Gmail)")


        try:
            logger.info(f"Attempting to send email from {settings.EMAILS_FROM_EMAIL} to {settings.OPERATIONS_MANAGER_EMAIL} using {settings.SMTP_HOST}:{settings.SMTP_PORT}")
            msg = MIMEMultipart()
            msg['From'] = settings.EMAILS_FROM_EMAIL
            msg['To'] = settings.OPERATIONS_MANAGER_EMAIL
            msg['Subject'] = f"New Job Post for Review: {job_title}"

            body = f"Hello Operation Manager,\n\nA new job post has been generated and is ready for your review.\n\n--- JOB DETAILS ---\n\n{job_details}\n\nBest regards,\nEvalyn AI"
            msg.attach(MIMEText(body, 'plain'))

            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            text = msg.as_string()
            server.sendmail(settings.EMAILS_FROM_EMAIL, settings.OPERATIONS_MANAGER_EMAIL, text)
            server.quit()
            
            logger.info(f"Email sent successfully to {settings.OPERATIONS_MANAGER_EMAIL}")
            return True
        except smtplib.SMTPAuthenticationError:
            logger.error("SMTP Authentication Failed: Check your username and password (app password required for Gmail).")
            return False
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)} (Type: {type(e).__name__})")
            return False

    @staticmethod
    def send_offer_letter(candidate_email: str, candidate_name: str, job_title: str, company_name: str, salary: str, joining_date: str):
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

Please let us know your decision by replying to this email. We look forward to having you onboard!

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
            logger.error(f"Failed to send offer letter: {str(e)}")
            return False
    @staticmethod
    def send_interview_invitation(candidate_email: str, candidate_name: str, job_title: str, interview_link: str, expiry_hours: int = 72):
        """
        Sends an interview invitation email with a unique link and deadline.
        """
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            logger.error("SMTP credentials not configured. Cannot send interview invitation.")
            return False

        try:
            msg = MIMEMultipart()
            msg['From'] = settings.EMAILS_FROM_EMAIL
            msg['To'] = candidate_email
            msg['Subject'] = f"Interview Invitation: {job_title} - Action Required"

            body = f"""
Hello {candidate_name},

Thank you for your application for the {job_title} position. We are impressed with your profile and would like to invite you to the next stage of our hiring process.

We have set up an automated interview for you. Please complete it at your earliest convenience.

*** IMPORTANT ***
This interview link is valid for {expiry_hours} hours only.

Your Interview Link:
{interview_link}

Instructions:
1. Ensure you have a stable internet connection.
2. You will need a working microphone and camera.
3. The interview includes a coding challenge (if applicable).
4. Screen sharing will be required.

Good luck!

Best regards,
The Hiring Team
"""
            msg.attach(MIMEText(body, 'plain'))

            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            text = msg.as_string()
            server.sendmail(settings.EMAILS_FROM_EMAIL, candidate_email, text)
            server.quit()
            
            logger.info(f"Interview invitation sent to {candidate_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send interview invitation: {str(e)}")
            return False
