"""Debug script: Check candidate profile for a specific application."""
import asyncio
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from src.api.db.session import AsyncSessionLocal
from src.api.models.application import Application
from src.api.models.user import User
from src.api.models.candidate import CandidateProfile
from src.api.core.config import settings

APPLICATION_ID = 74  # <-- change to the application you just invited

async def main():
    async with AsyncSessionLocal() as db:
        # Load application
        res = await db.execute(
            select(Application)
            .options(joinedload(Application.candidate))
            .where(Application.id == APPLICATION_ID)
        )
        app = res.scalars().first()
        if not app:
            print(f"Application {APPLICATION_ID} not found")
            return

        print(f"\n=== Application #{app.id} ===")
        print(f"  Status:               {app.status}")
        print(f"  email_delivery_status: {app.email_delivery_status}")
        print(f"  candidate_id:          {app.candidate_id}")

        # Load candidate profile
        res2 = await db.execute(
            select(User)
            .options(joinedload(User.candidate_profile))
            .where(User.id == app.candidate_id)
        )
        user = res2.scalars().first()
        if not user:
            print("  User not found")
            return
        
        profile = user.candidate_profile
        print(f"\n=== CandidateProfile for {user.email} ===")
        if not profile:
            print("  ❌ No candidate_profile found — resume cannot be uploaded")
            return

        print(f"  resume_url:              {profile.resume_url}")
        print(f"  resume_file_id:          {profile.resume_file_id}")
        print(f"  resume_storage_provider: {profile.resume_storage_provider}")

        # Check Google Drive settings
        drive_enabled = bool(settings.GOOGLE_DRIVE_SERVICE_ACCOUNT_INFO and settings.GOOGLE_DRIVE_FOLDER_ID)
        print(f"\n=== Google Drive Config ===")
        print(f"  GOOGLE_DRIVE_FOLDER_ID set: {bool(settings.GOOGLE_DRIVE_FOLDER_ID)}")
        print(f"  SERVICE_ACCOUNT_INFO set:   {bool(settings.GOOGLE_DRIVE_SERVICE_ACCOUNT_INFO)}")
        print(f"  Drive upload enabled:       {drive_enabled}")

        if not profile.resume_url:
            print("\n  ❌ PROBLEM: resume_url is empty — nothing to upload to Drive")
        elif profile.resume_storage_provider == "google_drive":
            print("\n  ✅ Already on Google Drive — no action needed")
        elif not drive_enabled:
            print("\n  ❌ PROBLEM: Google Drive env vars not configured — upload skipped")
        else:
            print("\n  ✅ Should promote to Drive on next invite")

asyncio.run(main())
