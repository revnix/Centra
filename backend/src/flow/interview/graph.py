from langgraph.graph import StateGraph, END
from src.flow.states.interview import InterviewState
from src.flow.interview.nodes import extract_skills_node, interviewer_node, analyzer_node

def build_interview_workflow():
    """
    Builds the AI Interview workflow.
    """
    workflow = StateGraph(InterviewState)

    # Nodes
    workflow.add_node("extract_skills", extract_skills_node)
    workflow.add_node("interviewer", interviewer_node)
    workflow.add_node("analyzer", analyzer_node)

    # Entry point
    workflow.set_entry_point("extract_skills")

    # Edges
    workflow.add_edge("extract_skills", "interviewer")
    
    # After interviewer speaks, we wait for user. 
    # But in this turn-based approach, the graph "ends" after interviewer node 
    # so we can return the message to the user.
    workflow.add_edge("interviewer", END)

    # When user replies, we will call the graph again starting from 'analyzer'
    # Wait, actually a better way is to have the endpoint decide where to start.
    
    return workflow.compile()

# For processing the response:
def build_analyzer_workflow():
    workflow = StateGraph(InterviewState)
    workflow.add_node("analyzer", analyzer_node)
    workflow.add_node("interviewer", interviewer_node)
    
    workflow.set_entry_point("analyzer")
    workflow.add_edge("analyzer", "interviewer")
    workflow.add_edge("interviewer", END)
    
    return workflow.compile()
