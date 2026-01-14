from typing import TypedDict
from .states.job_details import JobDetailsState
from .states.qualifications import QualificationsState
from .states.feedback import FeedbackState

class JDState(JobDetailsState, QualificationsState, FeedbackState):
    """Combined state for workflow"""
    pass
