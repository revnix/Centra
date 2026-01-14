from typing import TypedDict, Optional

class FeedbackState(TypedDict):
    jd: Optional[str]
    feedback: Optional[str]
    approved: Optional[bool]
