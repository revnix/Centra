import asyncio
from src.api.db.session import async_session
from src.api.models.integration import UserIntegration
from sqlalchemy import select

async def run():
    async with async_session() as db:
        res = await db.execute(select(UserIntegration).where(UserIntegration.platform=='whatsapp'))
        ints = res.scalars().all()
        print([(i.id, i.extra_data) for i in ints])

asyncio.run(run())
