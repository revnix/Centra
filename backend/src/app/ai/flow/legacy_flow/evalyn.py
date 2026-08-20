"""
Main workflow orchestration for Job Description generation with Human-in-the-Loop.
Integrates all agents, models, and state management.
"""

from langgraph.graph import StateGraph, END
from src.flow.states.evelyn import EVALN
from src.flow.post_creation.create_post import create_post
from src.flow.post_creation.human_review import human_review
# from src.flow.post_creation.publish_post import publish_post  # Commented out - replaced with save_job_post
from src.flow.post_creation.save_job_post import save_job_post
from src.flow.router.jd_router import router

def build_workflow():
    """
    Workflow:
    generate JD -> human review -> improve JD -> repeat until approved
    After approval -> save job post to database (only ONCE, after approval)
    """
    graph = StateGraph(EVALN)

    # Nodes
    graph.add_node("create_post", create_post)
    graph.add_node("human_review", human_review)
    graph.add_node("save_job_post", save_job_post)

    # Entry
    graph.set_entry_point("create_post")

    # Edges:
    # create_post goes DIRECTLY to human_review (no premature DB write)
    graph.add_edge("create_post", "human_review")

    # After human_review: approved -> save_job_post, rejected -> regenerate
    graph.add_conditional_edges(
        "human_review",
        router,
        {
            "save_job_post": "save_job_post",
            "create_post": "create_post"
        }
    )

    # After saving: always end (job is written once, on approval)
    graph.add_edge("save_job_post", END)

    return graph.compile()



if __name__ == "__main__":
    # Example usage
    initial_state: EVALN = {
        "jd": {
            "role": "Senior Python Developer",
            "description": "",
            "location": "Remote",
            "skills": ["Python", "FastAPI", "PostgreSQL"],
            "company_name": "TechCorp",
            "employment_type": "Full-time",
            "experience_level": "Senior",
            "feedback": None,
            "status": "draft",
            "post": None
        }
    }
    
    result = build_workflow().invoke(initial_state)
    print("Workflow completed")
    print(result)
