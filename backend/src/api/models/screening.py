from sqlalchemy import Column, Integer, String, Float, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship, backref as sa_backref
from sqlalchemy.sql import func
from src.api.db.base import Base


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

    application = relationship("Application", backref=sa_backref("screening_test", uselist=False))
