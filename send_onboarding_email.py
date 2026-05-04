import asyncio
import logging
from sqlalchemy import select
from src.api.db.session import engine, get_db
from src.api.models.application import Application, ApplicationStatus
from src.api.models.user import User
from src.api.services.onboarding_service import OnboardingService
from src.api.services.email_service import EmailService
from src.api.core.config import settings

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def initiate_and_send_onboarding(application_id: int):
    async with engine.connect() as conn:
        # 1. Fetch Application & Candidate Details
        query = select(
            Application.id, 
            User.email, 
            User.full_name
        ).join(User, Application.candidate_id == User.id).where(
            Application.id == application_id
        )
        result = await conn.execute(query)
        cand = result.fetchone()
        
        if not cand:
            print(f"❌ Application {application_id} not found")
            return

        app_id, email, name = cand
        print(f"Found Candidate: {name} ({email}) for Application ID: {app_id}")

    # 2. Initiate Onboarding in DB
    # We need a session for the service
    from sqlalchemy.ext.asyncio import AsyncSession
    async with AsyncSession(engine) as session:
        service = OnboardingService(session)
        try:
            onboarding = await service.initiate_onboarding(application_id)
            print(f"✅ Onboarding record initiated (Status: {onboarding.status})")
        except Exception as e:
            print(f"⚠️ Error initiating onboarding (might already exist): {e}")

    # 3. Send Email
    # Link format: FRONTEND_URL/portal/onboarding/APPLICATION_ID
    frontend_url = settings.FRONTEND_URL
    onboarding_link = f"{frontend_url}/portal/onboarding/{application_id}"
    
    print(f"Sending email to {email} with link: {onboarding_link}")
    success = EmailService.send_onboarding_welcome(email, name, onboarding_link)
    
    if success:
        print("🎉 Onboarding email sent successfully!")
    else:
        print("❌ Failed to send onboarding email. Check SMTP settings.")

if __name__ == "__main__":
    # Change this to the target application ID
    TARGET_APP_ID = 69 
    asyncio.run(initiate_and_send_onboarding(TARGET_APP_ID))
