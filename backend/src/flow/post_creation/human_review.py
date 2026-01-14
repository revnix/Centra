import json
from langgraph.types import interrupt
from src.flow.states.evelyn import EVALN


def human_review(state: EVALN) -> dict:
    """
    Human-in-the-loop using LangGraph interrupt.
    Pauses execution and waits for human approval/feedback.
    Returns state updates (not the full state).
    
    Accepts responses in two formats:
    1. Simple string: "approved" or "rejected"
    2. JSON dict: {"status": "approved"} or {"status": "rejected", "feedback": "..."}
    """

    jd = state.get("jd", {})
    post = jd.get("post", {})
    
    response = interrupt({
        "message": "Please review the Job Description",
        "job_post": post,
        "options": ["approved", "rejected"]
    })

    # Normalize response to dict format
    if isinstance(response, str):
        # Try parsing as JSON first
        try:
            response = json.loads(response)
        except json.JSONDecodeError:
            # Treat plain string as the status value
            response = {"status": response.strip().lower()}

    # Validate response structure
    if not isinstance(response, dict):
        raise ValueError(f"Expected dict or string response, got {type(response)}")

    # Extract review decision
    status = response.get("status", "rejected").lower()
    
    if status == "approved":
        return {
            "jd": {
                **jd,
                "status": "approved",
                "feedback": None
            }
        }
    else:
        # Check if feedback was already provided in the initial response
        feedback = response.get("feedback")
        
        if not feedback:
            # Request feedback for rejected post
            feedback = interrupt({
                "message": "Please provide feedback for the rejected Job Description",
                "job_post": post,
                "type": "feedback_request"
            })
        
        return {
            "jd": {
                **jd,
                "status": "draft",
                "feedback": feedback
            }
        }