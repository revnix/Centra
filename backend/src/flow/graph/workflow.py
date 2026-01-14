from langgraph.graph import StateGraph, END
from src.flow.core.state_base import JDState
from src.flow.agents.jd_generator import generate_jd
from src.flow.agents.jd_improver import improve_jd
from backend.src.flow.hitl.human_review import human_review

def build_workflow():
    """
    Constructs the full JD workflow:
    generate JD -> human review -> improve JD -> repeat until approved
    """
    graph = StateGraph(JDState)

    # Nodes
    graph.add_node("generate_jd", generate_jd)
    graph.add_node("human_review", human_review)
    graph.add_node("improve_jd", improve_jd)

    # Entry point
    graph.set_entry_point("generate_jd")

    # Edges
    graph.add_edge("generate_jd", "human_review")

    # Conditional edges from human_review
    def router(state: JDState):
        return END if state.get("approved") else "improve_jd"

    graph.add_conditional_edges(
        "human_review",
        router,
        {
            END: END,
            "improve_jd": "improve_jd"
        }
    )

    # Loop back after improvement
    graph.add_edge("improve_jd", "human_review")

    return graph.compile()
