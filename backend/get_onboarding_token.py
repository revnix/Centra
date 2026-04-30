import asyncio
from src.api.db.session import engine
from sqlalchemy import text

async def get_token(application_id: int = 30):
    async with engine.connect() as conn:
        result = await conn.execute(
            text("SELECT id, application_id, user_id, onboarding_token, status FROM onboardings WHERE application_id = :app_id"),
            {"app_id": application_id}
        )
        row = result.fetchone()
        if row:
            print(f"Onboarding ID: {row[0]}")
            print(f"Application ID: {row[1]}")
            print(f"User ID: {row[2]}")
            print(f"Token: {row[3]}")
            print(f"Status: {row[4]}")
            if row[3]:
                print(f"\nDirect link: http://localhost:3000/portal/onboarding/{row[1]}?token={row[3]}")
            else:
                print("\nNo token found - this record was created before token support was added.")
                print("Re-initiate onboarding from the dashboard to generate a token.")
        else:
            print(f"No onboarding record found for application_id={application_id}")

if __name__ == "__main__":
    asyncio.run(get_token())
