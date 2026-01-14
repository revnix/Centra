"""
Main workflow orchestration for Job Description generation with Human-in-the-Loop.
Integrates all agents, models, and state management.
"""

from langgraph.graph import StateGraph, END
from src.flow.states.evelyn import EVALN
from src.flow.post_creation.create_post import create_post
from src.flow.post_creation.human_review import human_review
from src.flow.router.jd_router import router

def build_workflow():
    """
    generate JD -> human review -> improve JD -> repeat until approved
    """
    graph = StateGraph(EVALN)

    # Nodes
    graph.add_node("create_post", create_post)
    graph.add_node("human_review", human_review)

    # Entry
    graph.set_entry_point("create_post")
    # Edges
    graph.add_edge("create_post", "human_review")

    graph.add_conditional_edges(
        "human_review",
        router,
        {
            END: END,
            "generate_jd": "generate_jd"
        }
    )
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
    
    result = build_workflow().run(initial_state)
    print("Workflow completed")
    print(result)
