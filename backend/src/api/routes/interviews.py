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
from src.flow.model.llm_manager import get_llm
from src.flow.interview.prompts import CODING_CHALLENGE_PROMPT, EVALUATION_PROMPT
from src.api.core.config import settings
import json
import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile

router = APIRouter()

@router.post("/{token}/upload-recording")
async def upload_recording(
    token: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload screen recording for an interview session."""
    service = InterviewService(db)
    session = await service.get_session_by_token(token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Create directory if it doesn't exist
    recordings_dir = os.path.join(settings.UPLOAD_DIR, "recordings")
    os.makedirs(recordings_dir, exist_ok=True)

    # Save file
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ".webm"
    filename = f"recording_{token}{file_extension}"
    file_path = os.path.join(recordings_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Update database
    # Store relative path for flexibility
    relative_path = os.path.join("uploads", "recordings", filename).replace("\\", "/")
    session.recording_path = relative_path
    db.add(session)
    await db.commit()

    return {"message": "Recording uploaded successfully", "path": relative_path}

class ChatRequest(BaseModel):
    message: str

class SubmitCodingRequest(BaseModel):
    code: str
    language: Optional[str] = "python"

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
        
    # Check Expiry
    if session.expires_at and session.status == InterviewStatus.PENDING:
         import datetime
         # Ensure both are timezone aware
         now = datetime.datetime.now(session.expires_at.tzinfo)
         if now > session.expires_at:
             raise HTTPException(
                 status_code=status.HTTP_403_FORBIDDEN, 
                 detail="Your interview link has expired. Please contact HR."
             )
    
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

    if session.status == InterviewStatus.COMPLETED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Interview already completed.")

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

    # 3. COMMIT BEFORE SLOW AI CALL
    # This ensures user message is saved and transaction is closed during AI wait
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # 4. Prepare LangGraph state from the updated transcript
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

    # 5. Run LangGraph Workflow
    workflow = build_analyzer_workflow()
    result = await workflow.ainvoke(initial_state)
    
    # 6. Extract AI Response and Update Session
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
    
    # 7. Save Internal State and Persist Everything
    # Filter out non-serializable objects (like messages) from the result state
    serializable_state = {k: v for k, v in result.items() if k not in ["messages"]}
    session.state = serializable_state
    
    # Check for completion
    if serializable_state.get("stage") == "completed":
        session.status = InterviewStatus.CODING
    
    db.add(session)
    await db.commit()
    
    return {"reply": ai_response, "transcript": session.transcript, "status": session.status}

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

    if session.status == InterviewStatus.COMPLETED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Interview already completed.")

    # Check Expiry
    if session.expires_at and session.status == InterviewStatus.PENDING:
         # Use datetime from import above or standard lib
         from datetime import datetime
         now = datetime.now(session.expires_at.tzinfo)
         if now > session.expires_at:
             raise HTTPException(
                 status_code=status.HTTP_403_FORBIDDEN, 
                 detail="Your interview link has expired. Please contact HR."
             )

    if session.transcript:
        return {"reply": session.transcript[-1]["content"], "transcript": session.transcript}

    # 1. Update status
    session.status = InterviewStatus.IN_PROGRESS
    session.started_at = datetime.now(timezone.utc)
    
    # 2. COMMIT BEFORE SLOW AI CALL
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # 3. Prepare initial state
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

    # 4. Run Initialization + Interviewer Workflow
    workflow = build_interview_workflow()
    result = await workflow.ainvoke(initial_state)
    
    # 5. Extract AI Response and Update Transcript
    ai_response_msg = result["messages"][-1]
    ai_response = ai_response_msg.content
    
    current_transcript = []
    current_transcript.append({
        "role": "ai",
        "content": ai_response,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    session.transcript = current_transcript
    
    # 6. Save Internal State and Persist
    serializable_state = {k: v for k, v in result.items() if k not in ["messages"]}
    session.state = serializable_state
    
    db.add(session)
    await db.commit()
    
    return {"reply": ai_response, "transcript": session.transcript}

@router.post("/{token}/coding-question")
async def get_coding_question(token: str, db: AsyncSession = Depends(get_db)):
    service = InterviewService(db)
    session = await service.get_session_by_token(token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session.status == InterviewStatus.COMPLETED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Interview already completed.")
        
    # Check if question exists in state
    current_state = dict(session.state) if session.state else {}
    if "coding_question" in current_state:
        return {"question": current_state["coding_question"]}
        
    # Release connection during generation
    await db.commit()
    await db.refresh(session)
    
    # Generate question
    llm = get_llm()
    # Skills might be list or string in state depending on how it was saved
    skills_data = current_state.get("skills", ["General Programming"])
    if isinstance(skills_data, bytes):
         # Handle potential serialization issue if any
         skills = ["General Programming"]
    else:
        skills = skills_data
        
    prompt = CODING_CHALLENGE_PROMPT.format(skills=skills)
    
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    question = response.content.strip()
    
    # Save to state
    current_state["coding_question"] = question
    session.state = current_state
    
    db.add(session)
    await db.commit()
    
    return {"question": question}

@router.post("/{token}/submit-coding")
async def submit_coding_challenge(
    token: str, 
    req: SubmitCodingRequest,
    db: AsyncSession = Depends(get_db)
):
    service = InterviewService(db)
    session = await service.get_session_by_token(token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.status == InterviewStatus.COMPLETED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Interview already completed.")
        
    session.code_submission = req.code
    session.programming_language = req.language
    session.status = InterviewStatus.COMPLETED
    session.completed_at = datetime.now(timezone.utc)
    
    # Commit submission immediately before long evaluation
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    # 1. Trigger AI Evaluation
    try:
        llm = get_llm()
        transcript_text = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in session.transcript])
        coding_question = session.state.get("coding_question", "N/A") if session.state else "N/A"
        
        eval_prompt = EVALUATION_PROMPT.format(
            transcript=transcript_text,
            coding_question=coding_question,
            code_submission=req.code
        )
        
        response = await llm.ainvoke([HumanMessage(content=eval_prompt)])
        
        try:
            # Clean possible markdown wrap from AI response
            raw_content = response.content.strip()
            if raw_content.startswith("```json"):
                raw_content = raw_content[7:]
                if raw_content.endswith("```"):
                   raw_content = raw_content[:-3]
            elif raw_content.startswith("```"):
                raw_content = raw_content[3:]
                if raw_content.endswith("```"):
                   raw_content = raw_content[:-3]
            
            evaluation = json.loads(raw_content.strip())
            
            session.overall_score = float(evaluation.get("overall_score", 0))
            session.technical_score = float(evaluation.get("technical_score", 0))
            session.communication_score = float(evaluation.get("communication_score", 0))
            session.feedback = evaluation.get("feedback", "")
            
            # Sync to application
            if session.application:
                from src.api.models.application import ApplicationStatus
                session.application.match_score = session.overall_score
                session.application.status = ApplicationStatus.INTERVIEW_COMPLETED
                db.add(session.application)
                
        except Exception as e:
            print(f"Error parsing AI evaluation: {e}")
            
    except Exception as e:
        print(f"Error during AI evaluation: {e}")

    db.add(session)
    await db.commit()
    
    return {"message": "Submission received and evaluated", "score": session.overall_score}

@router.post("/{token}/upload-recording")
async def upload_recording(
    token: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    service = InterviewService(db)
    session = await service.get_session_by_token(token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Ensure upload directory exists
    upload_dir = settings.UPLOAD_DIR
    recordings_dir = os.path.join(upload_dir, "recordings")
    os.makedirs(recordings_dir, exist_ok=True)
    
    # Generate filename
    filename = f"{session.id}_{token}_recording.webm"
    file_path = os.path.join(recordings_dir, filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Save relative path to DB
        relative_path = f"recordings/{filename}"
        session.recording_path = relative_path
        db.add(session)
        await db.commit()
        
        return {"message": "Recording uploaded successfully", "path": relative_path}
    except Exception as e:
        print(f"Failed to upload recording: {e}")
        raise HTTPException(status_code=500, detail="Failed to save recording")
