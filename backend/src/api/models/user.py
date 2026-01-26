from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SqlEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.api.db.base import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    REVIEWER = "reviewer"
    CANDIDATE = "candidate"
    GUEST = "guest"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(SqlEnum(UserRole), default=UserRole.GUEST)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Relationship with integrations (social media accounts)
    integrations = relationship(
        "UserIntegration", 
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="select"
    )
    
    # Relationship with jobs
    jobs = relationship(
        "Posts", 
        back_populates="creator",
        foreign_keys="Posts.created_by",
        cascade="all, delete-orphan",
        lazy="select"
    )