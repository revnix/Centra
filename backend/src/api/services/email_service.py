import resend
import logging
from src.api.core.config import settings

logger = logging.getLogger(__name__)

# Initialize Resend client once
if settings.RESEND_API_KEY:
    resend.api_key = settings.RESEND_API_KEY

HR_PHONE_NUMBER = "03125932632"

async def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """
    Centralized email sending function using Resend API.
    Does NOT crash on failure, logs errors instead.
    """
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY is not configured. Email not sent.")
        # In development, we log the content
        logger.info(f"Dev Email Log [To: {to_email} | Subject: {subject}]:\n{html_content}")
        return True

    # Ensure API key is set
    resend.api_key = settings.RESEND_API_KEY

    # Redirect for testing if configured
    effective_to = settings.EMAIL_TEST_OVERRIDE or to_email
    if settings.EMAIL_TEST_OVERRIDE and settings.EMAIL_TEST_OVERRIDE != to_email:
        subject = f"[TEST → {to_email}] {subject}"

    try:
        params = {
            "from": f"{settings.RESEND_FROM_NAME} <{settings.RESEND_FROM_EMAIL}>",
            "to": [effective_to],
            "subject": subject,
            "html": html_content,
        }
        
        logger.info(f"Sending email via Resend to {effective_to}...")
        from starlette.concurrency import run_in_threadpool
        result = await run_in_threadpool(resend.Emails.send, params)
        logger.info(f"Email successfully sent to {effective_to}. Response: {result}")
        return True
    except Exception as e:
        logger.error(f"FAILED to send email via Resend to {to_email}: {str(e)}")
        return False

class EmailService:
    """
    Service for handling all application email flows.
    """

    @staticmethod
    async def send_interview_invite(candidate_email: str, candidate_name: str, job_title: str, interview_link: str) -> bool:
        """
        Informs candidate they are shortlisted and provides next steps.
        """
        subject = f"Good News! You've been shortlisted for {job_title}"
        
        html = f"""
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; color: #2d3748; line-height: 1.6;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2b6cb0; font-size: 26px; margin: 0;">You're Shortlisted!</h1>
            </div>
            <p>Dear <strong>{candidate_name}</strong>,</p>
            <p>We are excited to inform you that you have been <strong>shortlisted</strong> for the <strong>{job_title}</strong> position at Evalyn AI.</p>
            <p>Our recruitment team was impressed with your application and we'd like to move forward to the next stage of our hiring process.</p>
            
            <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 5px solid #2b6cb0;">
                <h3 style="margin-top: 0; color: #2d3748; font-size: 18px;">What's Next?</h3>
                <p style="margin-bottom: 0;">Please click the link below to schedule your technical interview.</p>
                <a href="{interview_link}" style="display: inline-block; margin-top: 10px; padding: 10px 20px; background-color: #2b6cb0; color: white; text-decoration: none; border-radius: 5px;">Schedule Interview</a>
            </div>
            
            <p>We look forward to speaking with you soon!</p>
            
            <p style="margin-top: 30px;">Best regards,<br/>
            <strong style="color: #2b6cb0;">The Hiring Team</strong><br/>
            Evalyn AI</p>
            
            <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 30px 0;" />
            <p style="font-size: 12px; color: #a0aec0; text-align: center;">This is an automated notification. Please do not reply directly to this email.</p>
        </div>
        """
        return await send_email(candidate_email, subject, html)

    @staticmethod
    async def send_shortlist_email(candidate_email: str, candidate_name: str, job_title: str) -> bool:
        """
        Informs candidate they are shortlisted and provides next steps.
        """
        subject = f"Good News! You've been shortlisted for {job_title}"
        
        html = f"""
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; color: #2d3748; line-height: 1.6;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2b6cb0; font-size: 26px; margin: 0;">You're Shortlisted!</h1>
            </div>
            <p>Dear <strong>{candidate_name}</strong>,</p>
            <p>We are excited to inform you that you have been <strong>shortlisted</strong> for the <strong>{job_title}</strong> position at Evalyn AI.</p>
            <p>Our recruitment team was impressed with your application and we'd like to move forward to the next stage of our hiring process.</p>
            
            <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 5px solid #2b6cb0;">
                <h3 style="margin-top: 0; color: #2d3748; font-size: 18px;">What's Next?</h3>
                <p style="margin-bottom: 0;">One of our HR representatives will be in touch with you shortly via phone or email to schedule a technical interview and discuss the role in more detail.</p>
            </div>

            <div style="background-color: #f0fff4; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 5px solid #38a169;">
                <h3 style="margin-top: 0; color: #2d3748; font-size: 18px;">Contact HR for Interview Scheduling</h3>
                <p>To proceed further, please contact our HR team on WhatsApp to schedule your interview:</p>
                <p style="font-size: 18px; font-weight: bold; color: #2d3748; margin-bottom: 0;">WhatsApp Number: {HR_PHONE_NUMBER}</p>
            </div>

            <p>We look forward to speaking with you soon!</p>
            
            <p style="margin-top: 30px;">Best regards,<br/>
            <strong style="color: #2b6cb0;">The Hiring Team</strong><br/>
            Evalyn AI</p>
            
            <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 30px 0;" />
            <p style="font-size: 12px; color: #a0aec0; text-align: center;">This is an automated notification. Please do not reply directly to this email.</p>
        </div>
        """
        return await send_email(candidate_email, subject, html)

    @staticmethod
    async def send_hire_email(candidate_email: str, candidate_name: str, job_title: str, company_name: str, salary: str, joining_date: str, onboarding_link: str) -> bool:
        """
        Sends professional offer letter and onboarding instructions.
        """
        subject = f"Congratulations! You've been selected for {job_title}"
        
        html = f"""
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; color: #2d3748; line-height: 1.6;">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="font-size: 50px; margin-bottom: 10px;">🎊</div>
                <h1 style="color: #2c5282; font-size: 30px; margin: 0;">Congratulations, {candidate_name}!</h1>
            </div>
            
            <p>We are absolutely thrilled to offer you the position of <strong>{job_title}</strong> at <strong>{company_name}</strong>!</p>
            <p>After reviewing your technical skills and interview performance, we are confident that you will be a valuable asset to our team and help us achieve our goals.</p>
            
            <div style="background-color: #ebf8ff; padding: 25px; border-radius: 10px; margin: 25px 0;">
                <h3 style="margin-top: 0; color: #2b6cb0; font-size: 20px; border-bottom: 1px solid #bee3f8; padding-bottom: 10px;">Offer Summary</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <tr><td style="padding: 10px 0; color: #4a5568; width: 40%;"><strong>Role:</strong></td><td style="color: #2d3748;">{job_title}</td></tr>
                    <tr><td style="padding: 10px 0; color: #4a5568;"><strong>Compensation:</strong></td><td style="color: #2d3748;">{salary}</td></tr>
                    <tr><td style="padding: 10px 0; color: #4a5568;"><strong>Joining Date:</strong></td><td style="color: #2d3748;">{joining_date}</td></tr>
                </table>
            </div>

            <div style="background-color: #fffaf0; padding: 25px; border-radius: 10px; margin: 25px 0; border: 1px solid #fbd38d; text-align: center;">
                <h3 style="margin-top: 0; color: #c05621; font-size: 20px;">Next Step: Onboarding</h3>
                <p>To officially accept this offer and begin your onboarding, please click the button below to access our candidate portal.</p>
                <p style="font-size: 14px; color: #7b341e;">You'll be asked to provide additional details and upload required documents.</p>
                <div style="margin-top: 25px;">
                    <a href="{onboarding_link}" style="background-color: #3182ce; color: #ffffff; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(49, 130, 206, 0.2);">Complete Your Onboarding</a>
                </div>
            </div>
            
            <p>Welcome to the family! We can't wait to see what we'll build together.</p>
            
            <p style="margin-top: 40px;">Best regards,<br/>
            <strong style="color: #2c5282;">The Hiring Team</strong><br/>
            {company_name}</p>
        </div>
        """
        return await send_email(candidate_email, subject, html)

    @staticmethod
    async def send_onboarding_welcome(candidate_email: str, candidate_name: str, onboarding_link: str) -> bool:
        """
        Direct onboarding welcome email.
        """
        subject = "Welcome Aboard! Your Onboarding Journey Begins"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #2b6cb0;">Welcome to the Team!</h2>
            <p>Hello {candidate_name},</p>
            <p>We are excited to have you join us. To get started with the onboarding process, please click the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{onboarding_link}" style="background-color: #2b6cb0; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">Start Onboarding</a>
            </div>
            <p>If you have any questions, feel free to contact HR.</p>
        </div>
        """
        return await send_email(candidate_email, subject, html)

    @staticmethod
    async def send_password_reset_email(email: str, reset_link: str) -> bool:
        """
        Sends password reset link.
        """
        subject = "Reset Your Evalyn Password"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #2b6cb0;">Password Reset Request</h2>
            <p>We received a request to reset your password. Click the button below to proceed:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}" style="background-color: #2b6cb0; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
            </div>
            <p style="color: #718096; font-size: 14px;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        </div>
        """
        return await send_email(email, subject, html)

    @staticmethod
    async def send_job_to_manager(job_title: str, job_details: str, review_url: str = None) -> bool:
        """
        Internal notification to manager for job review.
        """
        subject = f"Review Required: New Job Post - {job_title}"
        
        review_section = ""
        if review_url:
            review_section = f"""
            <div style="margin: 30px 0; text-align: center;">
                <a href="{review_url}" style="background-color: #1e40af; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Review Job Post</a>
            </div>
            """

        html = f"""
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1e40af; font-size: 24px; margin: 0;">Job Post Review Request</h1>
            </div>
            
            <p>Hello,</p>
            <p>A new job post for <strong>{job_title}</strong> has been generated and requires your review and approval before it can be published.</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #1e40af; margin: 25px 0;">
                <h3 style="margin-top: 0; font-size: 16px; color: #1e40af;">Job Details</h3>
                <pre style="white-space: pre-wrap; font-family: inherit; font-size: 14px; margin: 0;">{job_details}</pre>
            </div>
            
            {review_section}
            
            <p>Please click the button above to approve the post or request specific changes.</p>
            
            <p style="margin-top: 30px; border-top: 1px solid #edf2f7; padding-top: 20px; font-size: 14px; color: #718096;">
                Best regards,<br/>
                <strong>Evalyn AI Recruitment Team</strong>
            </p>
        </div>
        """
        return await send_email(settings.OPERATIONS_MANAGER_EMAIL, subject, html)

    @staticmethod
    async def send_new_application_notification(candidate_name: str, candidate_email: str, job_title: str, source: str, resume_link: str = None) -> bool:
        """
        Internal notification to HR for new application.
        """
        subject = f"New Application: {candidate_name} for {job_title}"
        resume_html = f"<a href='{settings.FRONTEND_URL}{resume_link}'>View Resume</a>" if resume_link else "No resume attached"
        
        html = f"""
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
            <h2 style="color: #2b6cb0;">New Application Received</h2>
            <p><strong>Candidate:</strong> {candidate_name}</p>
            <p><strong>Job:</strong> {job_title}</p>
            <p><strong>Source:</strong> {source}</p>
            <p><strong>Resume:</strong> {resume_html}</p>
            <p><a href="{settings.FRONTEND_URL}/dashboard/applications">View in Dashboard</a></p>
        </div>
        """
        return await send_email(settings.HR_EMAIL, subject, html)

    # Legacy method names for backward compatibility
    @staticmethod
    async def send_offer_letter(*args, **kwargs):
        """Wrapper for send_hire_email for legacy calls."""
        return await EmailService.send_hire_email(*args, **kwargs)

    @staticmethod
    async def send_shortlist_notification(*args, **kwargs):
        """Wrapper for send_shortlist_email for legacy calls."""
        return await EmailService.send_shortlist_email(*args, **kwargs)

    @staticmethod
    async def send_automated_interview_invitation(*args, **kwargs):
        """Wrapper for send_shortlist_email for legacy calls."""
        return await EmailService.send_shortlist_email(*args, **kwargs)
