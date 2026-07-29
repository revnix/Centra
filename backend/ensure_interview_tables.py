import asyncio
import logging
from src.api.db.session import engine
from src.api.db.base import Base

# Import all models so SQLAlchemy knows their tables
from src.api.models.user import User
from src.api.models.job import Posts
from src.api.models.application import Application
from src.api.models.interview import InterviewSession
from src.api.models.screening import ScreeningTest
from src.api.models.onboarding import Onboarding
from src.api.models.interview_schedule import InterviewSchedule, InterviewPanelist, InterviewFeedback

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init_tables():
    logger.info("Ensuring all database tables exist...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Successfully created/verified database tables!")

if __name__ == "__main__":
    asyncio.run(init_tables())
