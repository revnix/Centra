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
from src.app.modules.platform.org.models.department import Department
from src.app.modules.people.models.employee_profile import EmployeeProfile
from src.app.modules.attendance.models.shift import ShiftTemplate
from src.app.modules.attendance.models.employee_shift import EmployeeShiftAssignment
from src.app.modules.attendance.models.session import AttendanceSession
from src.app.modules.attendance.models.breaks import AttendanceBreak
from src.app.modules.recruiting.models.role_permission import RolePermission
from src.app.modules.recruiting.models.user_role import UserRole as RBACUserRole
from src.app.modules.recruiting.models.permission import Permission
from src.app.modules.recruiting.models.role import Role
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
    "Department",
    "Role",
    "Permission",
    "RBACUserRole",
    "RolePermission",
    "EmployeeProfile",
    "ShiftTemplate",
    "EmployeeShiftAssignment",
    "AttendanceSession",
    "AttendanceBreak",
]

