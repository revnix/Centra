import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from src.api.core.dependencies import get_current_user
from src.api.models.user import User

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
    ext = Path(file.filename or "file.bin").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )

    unique_name = f"{current_user.id}_{uuid.uuid4().hex[:8]}_{file.filename}".replace(" ", "_")

    from src.api.utils.cloudinary_upload import upload_file
    file_url = await upload_file(content, unique_name, folder="evalyn/onboarding/manual")

    return {"url": file_url, "filename": file.filename, "size": len(content)}


@router.post("/upload-recording")
async def upload_recording(file: UploadFile = File(...)):
    """Upload a screen recording (webm/mp4) from a screening test. No auth required."""
    import logging
    _log = logging.getLogger(__name__)

    content = await file.read()
    MAX_RECORDING_SIZE = 200 * 1024 * 1024  # 200 MB
    if len(content) > MAX_RECORDING_SIZE:
        raise HTTPException(status_code=400, detail="Recording too large (max 200 MB)")

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Recording file is empty")

    ext = Path(file.filename or "recording.webm").suffix.lower() or ".webm"
    unique_name = f"screening_{uuid.uuid4().hex}{ext}"

    _log.info(f"Uploading recording: {unique_name}, size={len(content)} bytes, type={file.content_type}")

    from src.api.utils.cloudinary_upload import upload_file
    url = await upload_file(content, unique_name, folder="evalyn/screening-recordings", resource_type="video")

    if not url:
        _log.error(f"Recording upload to Cloudinary failed for {unique_name}")
        raise HTTPException(status_code=500, detail="Failed to upload recording to storage")

    _log.info(f"Recording uploaded successfully: {url}")
    return {"url": url}
