from langgraph.graph import StateGraph, END
from src.flow.states.interview import InterviewState
from src.flow.interview.nodes import extract_skills_node, interviewer_node, analyzer_node

# Internal cache for compiled workflows
_interview_workflow = None
_analyzer_workflow = None

def build_interview_workflow():
    """
    Builds the AI Interview workflow structure.
    """
    global _interview_workflow
    if _interview_workflow:
        return _interview_workflow

    workflow = StateGraph(InterviewState)

    # Nodes
    workflow.add_node("extract_skills", extract_skills_node)
    workflow.add_node("interviewer", interviewer_node)

    # Entry point
    workflow.set_entry_point("extract_skills")

    # Edges
    workflow.add_edge("extract_skills", "interviewer")
    workflow.add_edge("interviewer", END)

    _interview_workflow = workflow.compile()
    return _interview_workflow

# For processing the response:
def build_analyzer_workflow():
    global _analyzer_workflow
    if _analyzer_workflow:
        return _analyzer_workflow

    workflow = StateGraph(InterviewState)
    workflow.add_node("analyzer", analyzer_node)
    workflow.add_node("interviewer", interviewer_node)
    
    workflow.set_entry_point("analyzer")
    workflow.add_edge("analyzer", "interviewer")
    workflow.add_edge("interviewer", END)
    
    _analyzer_workflow = workflow.compile()
    return _analyzer_workflow
