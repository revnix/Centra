import asyncio
from sqlalchemy import select
from src.api.db.session import engine
from src.api.models.application import Application, ApplicationStatus
from src.api.models.user import User

async def find_hired_candidates():
    async with engine.connect() as conn:
        # Search for applications that are HIRED or ONBOARDING
        query = select(
            Application.id, 
            Application.status, 
            User.email, 
            User.full_name
        ).join(User, Application.candidate_id == User.id).where(
            Application.status.in_([ApplicationStatus.HIRED, ApplicationStatus.ONBOARDING, ApplicationStatus.OFFER])
        )
        result = await conn.execute(query)
        candidates = result.fetchall()
        
        print("Hired/Onboarding Candidates:")
        for cand in candidates:
            print(f"ID: {cand[0]}, Status: {cand[1]}, Email: {cand[2]}, Name: {cand[3]}")

if __name__ == "__main__":
    asyncio.run(find_hired_candidates())
