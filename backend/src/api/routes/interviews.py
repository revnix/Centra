from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.db.session import get_db
from src.api.services.interview_service import InterviewService
from src.api.schemas.interview import InterviewSessionResponse
from pydantic import BaseModel

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

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
    return session

@router.post("/{token}/chat", status_code=status.HTTP_200_OK)
async def chat_interaction(
    token: str,
    chat_req: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Send message to AI Interviewer.
    TODO: Integrate with LangGraph
    """
    service = InterviewService(db)
    
    # 1. Save User Message
    await service.save_message(token, "candidate", chat_req.message)
    
    # 2. Trigger AI (Stub for now)
    # Ideally, this calls the LangGraph agent
    ai_response = "Thank you for your response. Could you elaborate on your experience with asynchronous programming in Python?"
    
    # 3. Save AI Response
    session = await service.save_message(token, "ai", ai_response)
    
    return {"reply": ai_response, "transcript": session.transcript}
