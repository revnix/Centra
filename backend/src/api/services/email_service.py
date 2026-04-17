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

        try:
            from_email = getattr(settings, 'FROM_EMAIL', settings.EMAILS_FROM_EMAIL)
            msg = MIMEMultipart()
            msg['From'] = from_email
            msg['To'] = settings.OPERATIONS_MANAGER_EMAIL
            msg['Subject'] = f"New Job Post for Review: {job_title}"

            body = f"Hello Operation Manager,\n\nA new job post has been generated and is ready for your review.\n\n--- JOB DETAILS ---\n\n{job_details}\n\nBest regards,\nEvalyn AI"
            msg.attach(MIMEText(body, 'plain'))

            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            text = msg.as_string()
            server.sendmail(from_email, settings.OPERATIONS_MANAGER_EMAIL, text)
            server.quit()
            
            logger.info(f"Email sent successfully to {settings.OPERATIONS_MANAGER_EMAIL}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
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
            from_email = getattr(settings, 'FROM_EMAIL', settings.EMAILS_FROM_EMAIL)
            msg = MIMEMultipart()
            msg['From'] = from_email
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
            server.sendmail(from_email, candidate_email, text)
            server.quit()
            
            logger.info(f"Offer letter sent successfully to {candidate_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send offer letter: {str(e)}")
            return False

    @staticmethod
    def send_shortlist_notification(candidate_email: str, candidate_name: str, job_title: str):
        """
        Sends a professional shortlisting email to the candidate via Resend.
        """
        import resend
        if not settings.RESEND_API_KEY:
            logger.warning("RESEND_API_KEY not set. Skipping shortlist notification.")
            return False

        resend.api_key = settings.RESEND_API_KEY
        
        # Professional HTML Template for Candidate
        html_content = f"""
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
            <h2 style="color: #1e40af;">Application Shortlisted – Revnix</h2>
            <p>Dear {candidate_name},</p>
            <p>Thank you for your interest in <strong>Revnix</strong>.</p>
            <p>After reviewing your profile and CV for the <strong>{job_title}</strong> position, we are pleased to inform you that you have been <strong>shortlisted</strong> for the next stage of our recruitment process.</p>
            <p>We were impressed with your background and skills, and we would like to invite you for an in-person interview to discuss this opportunity further.</p>
            
            <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #1e40af; margin: 20px 0;">
                <p style="margin: 0;"><strong>Proposed Interview Details:</strong></p>
                <p style="margin: 5px 0;">Date: [To be scheduled / Next Week]</p>
                <p style="margin: 5px 0;">Location: AL Haram Plaza University road Haripur</p>
            </div>
            
            <p>Our team will reach out to you shortly to coordinate a specific time that works for you.</p>
            <p>We look forward to speaking with you!</p>
            <br />
            <p>Best regards,</p>
            <p><strong>The Hiring Team</strong><br />
            Revnix Corporation<br />
            AL Haram Plaza University road Haripur</p>
        </div>
        """

        try:
            from_email = getattr(settings, "FROM_EMAIL", settings.EMAILS_FROM_EMAIL)
            # Use candidate email by default
            to_email = [candidate_email]
            subject = "Application Shortlisted – Revnix"

            params = {
                "from": from_email,
                "to": to_email,
                "subject": subject,
                "html": html_content,
            }

            logger.info(f"📤 Sending Shortlist Email to {candidate_email} for {job_title}")
            
            try:
                response = resend.Emails.send(params)
                if response and "id" in response:
                    logger.info(f"✅ Shortlist notification sent successfully. ID: {response['id']}")
                    return True
            except Exception as e:
                error_msg = str(e)
                # Handle Resend Sandbox restriction in development
                if "testing emails" in error_msg.lower() and settings.ENVIRONMENT == "development":
                    logger.warning(
                        f"⚠️ Resend Sandbox Restriction: Cannot send to {candidate_email}. "
                        f"Redirecting to HR email ({settings.HR_EMAIL}) for testing."
                    )
                    params["to"] = [settings.HR_EMAIL]
                    params["subject"] = f"[DEV REDIRECT] {subject} (For: {candidate_email})"
                    
                    response = resend.Emails.send(params)
                    if response and "id" in response:
                        logger.info(f"✅ Redirected Shortlist Email sent to HR. ID: {response['id']}")
                        return True
                
                # If it's not the sandbox error or not in development, re-raise to be caught by outer block
                raise e

            return False
        except Exception as e:
            logger.error(f"❌ Failed to send shortlist email: {str(e)}")
            return False

    # Legacy method - Disabled per user request (Replacing with shortlisting flow)
    # @staticmethod
    # def send_interview_invitation(...):
    #     pass

    @staticmethod
    def send_new_application_notification(
        candidate_name: str,
        candidate_email: str,
        job_title: str,
        source: str,
        resume_link: str = None
    ):
        """
        Sends a notification email to HR via Resend when a new application is received.
        """
        import resend
        if not settings.RESEND_API_KEY:
            logger.warning("RESEND_API_KEY not set. Skipping notification.")
            return False

        resend.api_key = settings.RESEND_API_KEY
        
        resume_html = f"<a href='{settings.FRONTEND_URL}{resume_link}'>View Resume</a>" if resume_link else "Not attached"
        
        html_content = f"""
        <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: #2563eb;">New Application Received</h2>
            <p>A new candidate has applied for <strong>{job_title}</strong>.</p>
            <p><strong>Source:</strong> {source.upper()}</p>
            <hr style="border: none; border-top: 1px solid #eee;" />
            <h3>Candidate Details:</h3>
            <table style="width: 100%;">
                <tr><td><strong>Name:</strong></td><td>{candidate_name}</td></tr>
                <tr><td><strong>Email:</strong></td><td>{candidate_email}</td></tr>
                <tr><td><strong>Resume:</strong></td><td>{resume_html}</td></tr>
            </table>
            <br />
            <p style="font-size: 0.9em; color: #666;">View this application in the <a href="{settings.FRONTEND_URL}/dashboard/applications">Admin Dashboard</a>.</p>
        </div>
        """

        try:
            params = {
                "from": getattr(settings, 'FROM_EMAIL', settings.EMAILS_FROM_EMAIL),
                "to": [settings.HR_EMAIL],
                "subject": f"[{source.upper()}] New Application: {candidate_name} for {job_title}",
                "html": html_content,
            }
            
            logger.info(f"📡 Sending Resend request: From={params['from']}, To={params['to']}, Subject={params['subject']}")
            
            response = resend.Emails.send(params)
            
            if response and 'id' in response:
                logger.info(f"✅ Notification SUCCESSFULLY sent to HR. Resend ID: {response['id']}")
                return True
            else:
                logger.error(f"❌ Resend API returned an unexpected response: {response}")
                return False
        except Exception as e:
            logger.error(f"❌ Resend API CRITICAL FAILURE: {str(e)}")
            return False
