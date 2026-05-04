import logging
from src.api.models.application import Application
from src.api.services.email_service import EmailService
from src.api.core.config import settings
from starlette.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

logger = logging.getLogger(__name__)

async def handle_new_application(
    db: AsyncSession,
    application_id: int,
    background_tasks = None,
    notify_hr: bool = True
):
    """
    Centralized handler for any new application creation.
    1. Fetches full application details.
    2. Triggers HR email notification.
    """
    logger.info(f"🚀 Handling new application workflow for App #{application_id}")
    
    # Explicitly fetch application with all relationships to avoid lazy-loading issues
    from src.api.models.user import User
    from src.api.models.candidate import CandidateProfile
    from src.api.models.job import Posts
    
    result = await db.execute(
        select(Application)
        .options(
            joinedload(Application.candidate).joinedload(User.candidate_profile),
            joinedload(Application.job)
        )
        .where(Application.id == application_id)
    )
    application = result.scalars().first()
    
    if not application:
        logger.error(f"❌ Application {application_id} not found in DB!")
        return

    # 1. Extract Candidate Data
    candidate_user = application.candidate
    if not candidate_user:
        logger.error(f"❌ Critical: Application #{application_id} has no associated User record!")
        return
        
    candidate_name = candidate_user.full_name or candidate_user.username or "Unknown Candidate"
    candidate_email = candidate_user.email
    
    # 2. Extract Profile Data (Resume)
    profile = getattr(candidate_user, 'candidate_profile', None)
    resume_url = profile.resume_url if profile else None
    
    logger.info(f"👤 Candidate fetched: {candidate_name} ({candidate_email})")
    
    # 3. Extract Job Data
    job = application.job
    job_title = job.title if job else f"Job #{application.job_id}"
    
    # 4. Prepare Notification
    notification_args = {
        "candidate_name": candidate_name,
        "candidate_email": candidate_email,
        "job_title": job_title,
        "source": getattr(application, 'source', 'web') or 'web',
        "resume_link": resume_url
    }

    if notify_hr:
        logger.info(f"📧 Email sending started for App #{application_id}")

        if background_tasks:
            logger.info(f"📝 Queuing HR Notification via FastAPI BackgroundTasks")
            background_tasks.add_task(
                EmailService.send_new_application_notification,
                **notification_args
            )
        else:
            logger.info(f"📧 Sending HR Notification directly (awaiting)")
            await EmailService.send_new_application_notification(
                **notification_args
            )
    else:
        logger.info(f"⏭️ Skipping HR notification (notify_hr=False)")


    logger.info(f"✅ Handled new application workflow for App #{application_id}")
