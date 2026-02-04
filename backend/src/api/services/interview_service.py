from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from src.api.models.interview import InterviewSession, InterviewStatus
from src.api.models.application import Application
from src.api.models.user import User
import secrets
import string
from datetime import datetime, timezone

class InterviewService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _generate_token(self, length=32) -> str:
        """Generate a secure random token for interview access."""
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))

    async def create_session(self, application_id: int) -> InterviewSession:
        """Create or return existing interview session for an application."""
        # Check existing
        result = await self.db.execute(
            select(InterviewSession).where(InterviewSession.application_id == application_id)
        )
        existing = result.scalars().first()
        if existing:
            return existing

        token = self._generate_token()
        session = InterviewSession(
            application_id=application_id,
            token=token,
            status=InterviewStatus.PENDING,
            transcript=[],
            overall_score=0.0
        )
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def get_session_by_token(self, token: str) -> InterviewSession | None:
        """Retrieve interview session by secure token."""
        result = await self.db.execute(
            select(InterviewSession)
            .options(
                selectinload(InterviewSession.application).selectinload(Application.job),
                selectinload(InterviewSession.application).selectinload(Application.candidate).selectinload(User.candidate_profile)
            )
            .where(InterviewSession.token == token)
        )
        return result.scalars().first()

    async def save_message(self, token: str, role: str, content: str) -> InterviewSession:
        """Append a message to the interview transcript."""
        session = await self.get_session_by_token(token)
        if not session:
            raise ValueError("Invalid session token")
        
        # Update status if starting
        if session.status == InterviewStatus.PENDING:
            session.status = InterviewStatus.IN_PROGRESS
            session.started_at = datetime.now(timezone.utc)
            
        # Append to transcript (using list concatenation to ensure change detection)
        # Note: SQLAlchemy MutableList or re-assignment is needed for JSON detection
        current_transcript = list(session.transcript) if session.transcript else []
        current_transcript.append({
            "role": role,
            "content": content,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        session.transcript = current_transcript
        
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        return session
        
    async def submit_interview(self, token: str) -> InterviewSession:
        """Mark interview as completed."""
        session = await self.get_session_by_token(token)
        if not session:
            raise ValueError("Invalid session token")
            
        session.status = InterviewStatus.COMPLETED
        session.completed_at = datetime.now(timezone.utc)
        
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        return session
