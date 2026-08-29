from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.app.db.base import Base


class UserIntegration(Base):
    __tablename__ = "user_integrations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    platform = Column(String, nullable=False)  # 'linkedin', 'github', etc.
    platform_user_id = Column(String, nullable=True) # e.g., LinkedIn URN
    platform_display_name = Column(String, nullable=True) # human-readable account name, e.g. "Abdullah Khan"
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index('ix_user_integrations_user_platform', 'user_id', 'platform'),
    )

    # Relationship with User
    user = relationship("User", back_populates="integrations")
