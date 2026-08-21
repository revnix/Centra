from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SqlEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.app.db.base import Base
from src.app.integrations.shared.models.integration import UserIntegration
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    HR = "hr"
    REVIEWER = "reviewer"
    EMPLOYEE = "employee"
    CANDIDATE = "candidate"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)

    # No more "guest" role. Default is candidate (self-registration sets candidate too).
    role = Column(SqlEnum(UserRole), default=UserRole.CANDIDATE)

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    integrations = relationship(
        UserIntegration,
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="select",
    )

    jobs = relationship(
        "Posts",
        back_populates="creator",
        foreign_keys="Posts.created_by",
        cascade="all, delete-orphan",
        lazy="select",
    )

    candidate_profile = relationship(
        "CandidateProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    employee_profile = relationship(
        "EmployeeProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
        foreign_keys="EmployeeProfile.user_id",
    )


# Ensure related models are registered for SQLAlchemy relationship resolution
# (avoids InvalidRequestError when only User is imported).
from src.app.modules.recruiting.models.job import Posts  # noqa: F401
