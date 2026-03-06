import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from src.api.db.session import AsyncSessionLocal
from src.api.models.application import Application, ApplicationStatus
from src.api.services.application_service import ApplicationService

async def resend_failed_emails():
    print("Connecting to database to find FAILED email invitations...")
    async with AsyncSessionLocal() as db:
        app_service = ApplicationService(db)
        
        # Find all applications with FAILED email status
        result = await db.execute(
            select(Application).where(Application.email_delivery_status == "FAILED")
        )
        failed_apps = result.scalars().all()
        
        if not failed_apps:
            print("No FAILED emails found.")
            return

        print(f"Found {len(failed_apps)} applications with FAILED emails.")
        for app in failed_apps:
            print(f"Retrying invitation for candidate ID {app.candidate_id} on Application ID {app.id}...")
            # Using the shortlist_candidate method to re-trigger the email logic
            # This creates a new interview session and sends the email again
            try:
                updated_app = await app_service.shortlist_candidate(app.id)
                print(f"Result for App ID {app.id}: {updated_app.email_delivery_status}")
            except Exception as e:
                print(f"Failed to retry App ID {app.id}: {e}")

if __name__ == "__main__":
    asyncio.run(resend_failed_emails())
