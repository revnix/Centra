import time
from typing import Dict, Any, List
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from src.flow.model.llm_manager import get_llm
from src.flow.states.interview import InterviewState
from src.flow.interview.prompts import (
    SKILL_EXTRACTION_PROMPT,
    INTERVIEWER_SYSTEM_PROMPT,
    ASSESSMENT_PROMPT
)
import json

llm = get_llm()

async def extract_skills_node(state: InterviewState):
    """
    Extracts top 3 skills if not already present.
    """
    if state.get("top_skills"):
        return state

    # Mocking candidate data fetch for now, or using what's in state
    # In a real scenario, we'd fetch from DB using application_id
    candidate_bio = state.get("bio", "N/A")
    candidate_skills = state.get("skills", [])
    experience = state.get("experience", 0)

    prompt = SKILL_EXTRACTION_PROMPT.format(
        bio=candidate_bio,
        skills=", ".join(candidate_skills),
        experience=experience
    )
    
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    skills = [s.strip() for s in response.content.split(",")]
    
    return {
        "top_skills": skills[:3],
        "current_skill_index": 0,
        "stage": "introduction"
    }

async def interviewer_node(state: InterviewState):
    """
    Generates the next question or message.
    """
    top_skills = state.get("top_skills", [])
    current_idx = state.get("current_skill_index", 0)
    stage = state.get("stage", "introduction")
    
    current_skill = top_skills[current_idx] if current_idx < len(top_skills) else "N/A"
    
    # Format history for prompt
    history = ""
    for msg in state.get("messages", []):
        if isinstance(msg, HumanMessage):
            history += f"Candidate: {msg.content}\n"
        elif isinstance(msg, AIMessage):
            history += f"Interviewer: {msg.content}\n"

    system_prompt = INTERVIEWER_SYSTEM_PROMPT.format(
        candidate_name=state.get("candidate_name", "Candidate"),
        top_skills=", ".join(top_skills),
        stage=stage,
        current_skill=current_skill,
        history=history
    )
    
    messages = [SystemMessage(content=system_prompt)] + state.get("messages", [])
    
    response = await llm.ainvoke(messages)
    
    return {
        "messages": [response]
    }

async def analyzer_node(state: InterviewState):
    """
    Analyzes the candidate's response and updates the state.
    """
    messages = state.get("messages", [])
    if not messages or not isinstance(messages[-1], HumanMessage):
        return state # Nothing to analyze if last message wasn't from human

    last_response = messages[-1].content
    top_skills = state.get("top_skills", [])
    current_idx = state.get("current_skill_index", 0)
    current_skill = top_skills[current_idx] if current_idx < len(top_skills) else "N/A"
    stage = state.get("stage", "introduction")

    if stage == "introduction":
        # Just move to first skill assessment
        return {
            "stage": "skill_assessment",
            "current_skill_index": 0,
            "turns_in_current_skill": 0
        }

    if stage == "skill_assessment":
        turns = state.get("turns_in_current_skill", 0) + 1
        
        if turns >= 3: # Move on after 3 turns for this skill
            if current_idx + 1 < len(top_skills):
                return {
                    "current_skill_index": current_idx + 1,
                    "turns_in_current_skill": 0
                }
            else:
                return {
                    "stage": "wrap_up",
                    "turns_in_current_skill": 0
                }
        else:
            return {
                "turns_in_current_skill": turns
            }
    
    if stage == "wrap_up":
        return {
            "stage": "completed"
        }

    return {}
