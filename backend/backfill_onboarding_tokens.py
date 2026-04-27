import asyncio
import secrets
from src.api.db.session import engine
from sqlalchemy import text

async def backfill_tokens():
    async with engine.connect() as conn:
        # Find all onboardings without a token
        result = await conn.execute(
            text("SELECT id, application_id FROM onboardings WHERE onboarding_token IS NULL")
        )
        rows = result.fetchall()
        
        if not rows:
            print("All onboarding records already have tokens.")
            return
        
        print(f"Found {len(rows)} records without tokens. Backfilling...")
        
        for row in rows:
            token = secrets.token_urlsafe(32)
            await conn.execute(
                text("UPDATE onboardings SET onboarding_token = :token WHERE id = :id"),
                {"token": token, "id": row[0]}
            )
            print(f"  App ID {row[1]} -> token generated")
        
        await conn.commit()
        print("\nDone! Fetching links...")
        
        # Print the links
        result2 = await conn.execute(
            text("SELECT application_id, onboarding_token FROM onboardings ORDER BY application_id")
        )
        for r in result2.fetchall():
            print(f"  App {r[0]}: http://localhost:3000/portal/onboarding/{r[0]}?token={r[1]}")

if __name__ == "__main__":
    asyncio.run(backfill_tokens())
