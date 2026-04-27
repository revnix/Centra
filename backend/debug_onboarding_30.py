import asyncio
from src.api.db.session import engine
from src.api.models.application import Application
from src.api.models.onboarding import Onboarding
from sqlalchemy import select

async def check():
    async with engine.connect() as conn:
        result = await conn.execute(select(Application).where(Application.id == 30))
        app = result.fetchone()
        if app:
            print(f"Application 30 found: candidate_id={app.candidate_id}")
            
            o_result = await conn.execute(select(Onboarding).where(Onboarding.application_id == 30))
            onboarding = o_result.fetchone()
            if onboarding:
                print(f"Onboarding 30 found: user_id={onboarding.user_id}")
            else:
                print("Onboarding 30 NOT found")
        else:
            print("Application 30 NOT found")

if __name__ == "__main__":
    asyncio.run(check())
