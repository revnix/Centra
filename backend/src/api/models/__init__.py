"""Legacy model exports (deprecated).

The codebase has moved to `src/app`. This module re-exports the public model
symbols for backwards compatibility.
"""

from src.app.modules.platform.users.models.user import User, UserRole
from src.app.integrations.shared.models.integration import UserIntegration
from src.app.modules.recruiting.models.job import Posts, JobType, JobStatus, ExperienceLevel
from src.app.modules.recruiting.models.candidate import CandidateProfile
from src.app.modules.recruiting.models.application import Application, ApplicationStatus
from src.app.modules.recruiting.models.interview import InterviewSession, InterviewStatus
from src.app.modules.platform.users.models.password_reset import PasswordResetToken
from src.app.modules.recruiting.models.onboarding import Onboarding
from src.app.modules.recruiting.models.screening import ScreeningTest
from src.app.modules.recruiting.models.interview_schedule import (
    InterviewSchedule,
    InterviewPanelist,
    InterviewFeedback,
    ScheduleStatus,
    HireRecommendation,
)

__all__ = [
    "User",
    "UserRole",
    "UserIntegration",
    "Posts",
    "JobType",
    "JobStatus",
    "ExperienceLevel",
    "CandidateProfile",
    "Application",
    "ApplicationStatus",
    "InterviewSession",
    "InterviewStatus",
    "PasswordResetToken",
    "Onboarding",
    "ScreeningTest",
    "InterviewSchedule",
    "InterviewPanelist",
    "InterviewFeedback",
    "ScheduleStatus",
    "HireRecommendation",
]
