from langgraph.graph import END
from src.flow.states.evelyn import EVALN


def router(state: EVALN):
    """
    Decide next step after human review.
    - If approved: go to platform selection / publishing
    - If rejected/feedback: improve the JD
    """
    jd_status = state.get("jd", {}).get("status")
    
    if jd_status == "approved":
        return "publish_post"
    # Default to improve if unclear
    return "create_post"
