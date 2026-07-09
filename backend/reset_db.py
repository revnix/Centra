import asyncio
from sqlalchemy.future import select
from src.api.db.session import AsyncSessionLocal
from src.api.models.candidate import CandidateProfile

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(CandidateProfile))
        profiles = result.scalars().all()
        count = 0
        for profile in profiles:
            if profile.resume_storage_provider == "google_drive":
                profile.resume_storage_provider = "cloudinary"
                profile.resume_file_id = None
                count += 1
                
        await db.commit()
        print(f"Success! Reset {count} candidate profile(s) back to Cloudinary.")

if __name__ == "__main__":
    asyncio.run(main())
