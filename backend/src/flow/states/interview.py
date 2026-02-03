from typing import List, Optional, Literal, Dict, Any, Annotated
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class InterviewState(TypedDict, total=False):
    """
    Global workflow state for the AI Interview.
    """
    # Session identifiers
    application_id: int
    interview_session_id: int
    
    # Candidate details (extracted from resume/profile)
    candidate_name: str
    top_skills: List[str]
    
    # Conversation history
    messages: Annotated[List[BaseMessage], add_messages]
    
    # Interview progression
    current_skill_index: int  # 0, 1, 2
    turns_in_current_skill: int
    stage: Literal["introduction", "skill_assessment", "wrap_up", "completed"]
    
    # Time management
    start_time: float
    total_duration_seconds: int  # Default 600 (10 minutes)
    
    # Assessment
    technical_scores: Dict[str, float]  # Score per skill
    communication_score: float
    overall_feedback: str
    
    # Interrupt/User control
    last_user_input: str
