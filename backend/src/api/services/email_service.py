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
