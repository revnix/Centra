from backend.src.flow.core.state_base import JDState
import json

def human_review(state: JDState):
    """
    Prints structured JD and asks for approval.
    """
    print("\n========== JOB DESCRIPTION (Structured) ==========")
    print(json.dumps(state, indent=4))

    while True:
        choice = input("Approve JD? (yes/no): ").strip().lower()
        if choice in ("yes", "no"):
            break
        print("Please enter 'yes' or 'no'.")

    state["approved"] = choice == "yes"
    if not state["approved"]:
        feedback = input("Provide feedback to improve JD: ").strip()
        state["feedback"] = feedback

    return state
