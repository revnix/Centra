from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from src.api.core.dependencies import get_current_user
from src.api.models.user import User
from src.api.core.config import settings
import os
import uuid
from pathlib import Path

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@router.post("/onboarding-document")
async def upload_onboarding_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload an onboarding document (photo, CNIC, educational docs, police clearance, etc.).
    Returns a URL that can be used to access the uploaded file.
    """
    # Validate file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read content and check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Create onboarding uploads directory
    upload_dir = os.path.join(settings.UPLOAD_DIR, "onboarding")
    from starlette.concurrency import run_in_threadpool
    await run_in_threadpool(os.makedirs, upload_dir, exist_ok=True)
    
    # Generate unique filename to avoid collisions
    unique_name = f"{current_user.id}_{uuid.uuid4().hex[:8]}_{file.filename}"
    # Sanitize filename
    unique_name = unique_name.replace(" ", "_")
    
    file_path = os.path.join(upload_dir, unique_name)
    
    # Write file to disk
    def save_file(path, data):
        with open(path, "wb") as f:
            f.write(data)
            
    await run_in_threadpool(save_file, file_path, content)
    
    # Return the URL that can be used to access this file
    # The /uploads path is served by StaticFiles in main.py
    file_url = f"/uploads/onboarding/{unique_name}"
    
    return {
        "url": file_url,
        "filename": file.filename,
        "size": len(content)
    }
