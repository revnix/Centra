import asyncio
from src.api.db.session import engine
from sqlalchemy import text

async def check_emails():
    async with engine.connect() as conn:
        res = await conn.execute(text('SELECT id, candidate_id, email_delivery_status, email_logs FROM applications'))
        rows = res.fetchall()
        print(f"Total applications found: {len(rows)}")
        for row in rows:
            print(f"ID: {row[0]}, Candidate ID: {row[1]}, STATUS: {row[2]}, LOGS: {row[3]}")

if __name__ == "__main__":
    asyncio.run(check_emails())
