from langgraph.graph import StateGraph, END
from src.flow.states.evelyn import EVALN
from src.flow.post_creation.create_post import create_post
from src.flow.post_creation.human_review import human_review


def router(state: EVALN):
    """
    Decide next step after human review.
    - If approved: end workflow
    - If rejected/feedback: improve the JD
    """
    jd_status = state.get("jd", {}).get("status")
    
    if jd_status == "approved":
        return END
    # Default to improve if unclear
    return "create_post"
