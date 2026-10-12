from sqlalchemy import Column, Integer, String, Float, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship, backref as sa_backref
from sqlalchemy.sql import func
from src.app.db.base import Base


class ScreeningTest(Base):
    __tablename__ = "screening_tests"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, unique=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    questions = Column(JSON, nullable=False)
    answers = Column(JSON, nullable=True)
    score = Column(Float, nullable=True)
    total_questions = Column(Integer, default=30)
    time_limit_minutes = Column(Integer, default=10)
    status = Column(String(50), default="PENDING")  # PENDING, IN_PROGRESS, COMPLETED, EXPIRED
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    recording_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    application = relationship("Application", back_populates="screening_test")

    @property
    def correct_count(self) -> int | None:
        """Number of correctly-answered questions, derived from questions/answers JSON.

        Plain Python property (not a DB column) so HR-facing views can show
        "8/10" instead of a bare percentage without a schema migration.
        """
        if not self.questions or self.answers is None:
            return None
        return sum(
            1 for i, q in enumerate(self.questions)
            if i < len(self.answers) and self.answers[i] is not None and self.answers[i] == q.get("correct_index")
        )
