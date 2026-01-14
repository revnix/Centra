import json
from langgraph.types import interrupt
from src.flow.states.evelyn import EVALN


def human_review(state: EVALN) -> EVALN:
    """
    Human-in-the-loop using LangGraph interrupt.
    Pauses execution and waits for human approval/feedback.
    """

    response = interrupt({
        "message": "Please review the Job Description",
        "job_description": state.get("jd", {}),
        "expected_response": {
            "approved": "boolean (True/False)",
            "feedback": "string (optional feedback or null)"
        }
    })

    # Ensure response is a dict (convert if string)
    if isinstance(response, str):
        try:
            response = json.loads(response)
        except json.JSONDecodeError:
            raise ValueError(f"HITL response is not valid JSON: {response}")

    # Validate response structure
    if not isinstance(response, dict):
        raise ValueError(f"Expected dict response, got {type(response)}")

    # Extract and set review decision
    approved = response.get("approved", False)
    feedback = response.get("feedback")

    # Update JD status based on approval
    if approved:
        state["jd"]["status"] = "approved"
        state["jd"]["feedback"] = None
    else:
        state["jd"]["status"] = "draft"
        state["jd"]["feedback"] = feedback or "Please revise the Job Description"

    return state
