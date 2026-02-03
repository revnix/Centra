from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.db.session import get_db
from src.api.services.interview_service import InterviewService
from src.api.schemas.interview import InterviewSessionResponse
from pydantic import BaseModel
from typing import List, Optional

from src.flow.interview.graph import build_interview_workflow, build_analyzer_workflow
from langchain_core.messages import HumanMessage, AIMessage
from src.api.models.interview import InterviewStatus

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

class CreateInterviewRequest(BaseModel):
    application_id: int

@router.post("", response_model=InterviewSessionResponse)
async def create_interview_session(
    req: CreateInterviewRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new interview session for an application."""
    service = InterviewService(db)
    session = await service.create_session(req.application_id)
    return session

@router.get("/{token}", response_model=InterviewSessionResponse)
async def get_interview_session(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """Get interview session by token (Public/Guest access)."""
    service = InterviewService(db)
    session = await service.get_session_by_token(token)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    
    # If the session is PENDING and there's no transcript, we might want to trigger the first message
    if session.status == InterviewStatus.PENDING and not session.transcript:
        # We'll trigger it via a separate system call or just let the first "chat" trigger it if empty
        pass
        
    return session

@router.post("/{token}/chat", status_code=status.HTTP_200_OK)
async def chat_interaction(
    token: str,
    chat_req: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Send message to AI Interviewer.
    Integrates with LangGraph for stateful conversation.
    """
    service = InterviewService(db)
    
    # 1. Fetch Session with all relationships
    session = await service.get_session_by_token(token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # 2. Append User Message to transcript locally
    user_msg = chat_req.message
    timestamp = datetime.now(timezone.utc).isoformat()
    
    current_transcript = list(session.transcript) if session.transcript else []
    current_transcript.append({
        "role": "candidate",
        "content": user_msg,
        "timestamp": timestamp
    })
    session.transcript = current_transcript
    
    # Update status if needed
    if session.status == InterviewStatus.PENDING:
        session.status = InterviewStatus.IN_PROGRESS
        session.started_at = datetime.now(timezone.utc)

    # 3. Prepare LangGraph state from the updated transcript
    messages = []
    for m in session.transcript:
        if m["role"] == "candidate":
            messages.append(HumanMessage(content=m["content"]))
        else:
            messages.append(AIMessage(content=m["content"]))
            
    candidate = session.application.candidate
    candidate_profile = getattr(candidate, 'candidate_profile', None)
    
    initial_state = session.state or {}
    initial_state.update({
        "messages": messages,
        "candidate_name": candidate.full_name,
        "application_id": session.application_id,
        "interview_session_id": session.id,
        "bio": candidate_profile.bio if candidate_profile else "N/A",
        "skills": candidate_profile.skills if candidate_profile else [],
        "experience": candidate_profile.experience_years if candidate_profile else 0,
    })

    # 4. Run LangGraph Workflow
    workflow = build_analyzer_workflow()
    result = await workflow.ainvoke(initial_state)
    
    # 5. Extract AI Response and Update Session
    ai_response_msg = result["messages"][-1]
    ai_response = ai_response_msg.content
    
    # Append AI response to transcript
    current_transcript = list(session.transcript)
    current_transcript.append({
        "role": "ai",
        "content": ai_response,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    session.transcript = current_transcript
    
    # 6. Save Internal State and Persist Everything
    # Filter out non-serializable objects (like messages) from the result state
    serializable_state = {k: v for k, v in result.items() if k not in ["messages"]}
    session.state = serializable_state
    
    db.add(session)
    await db.commit()
    
    return {"reply": ai_response, "transcript": session.transcript}

@router.post("/{token}/start", status_code=status.HTTP_200_OK)
async def start_interview(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """Initialize the interview and get the first greeting."""
    service = InterviewService(db)
    session = await service.get_session_by_token(token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.transcript:
        return {"reply": session.transcript[-1]["content"], "transcript": session.transcript}

    # 1. Update status
    session.status = InterviewStatus.IN_PROGRESS
    session.started_at = datetime.now(timezone.utc)

    # 2. Prepare initial state
    candidate = session.application.candidate
    candidate_profile = getattr(candidate, 'candidate_profile', None)
    
    initial_state = {
        "messages": [],
        "candidate_name": candidate.full_name,
        "application_id": session.application_id,
        "interview_session_id": session.id,
        "bio": candidate_profile.bio if candidate_profile else "N/A",
        "skills": candidate_profile.skills if candidate_profile else [],
        "experience": candidate_profile.experience_years if candidate_profile else 0,
    }

    # 3. Run Initialization + Interviewer Workflow
    workflow = build_interview_workflow()
    result = await workflow.ainvoke(initial_state)
    
    # 4. Extract AI Response and Update Transcript
    ai_response_msg = result["messages"][-1]
    ai_response = ai_response_msg.content
    
    current_transcript = []
    current_transcript.append({
        "role": "ai",
        "content": ai_response,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    session.transcript = current_transcript
    
    # 5. Save Internal State and Persist
    serializable_state = {k: v for k, v in result.items() if k not in ["messages"]}
    session.state = serializable_state
    
    db.add(session)
    await db.commit()
    
    return {"reply": ai_response, "transcript": session.transcript}
