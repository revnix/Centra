import hashlib
import os
import time
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from src.api.core.dependencies import get_current_user
from src.api.models.user import User

router = APIRouter()


@router.get("/cloudinary-signature")
async def get_cloudinary_signature():
    """
    Generate a short-lived Cloudinary signed-upload credential for browser-side uploads.
    No auth required — the signature is scoped to a single folder and expires in 1 hour.
    """
    api_secret = os.getenv("CLOUDINARY_API_SECRET", "")
    api_key = os.getenv("CLOUDINARY_API_KEY", "")
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    if not (api_secret and api_key and cloud_name):
        raise HTTPException(status_code=503, detail="Cloudinary not configured on server")

    folder = "evalyn/screening-recordings"
    ts = int(time.time())
    # Params must be sorted alphabetically
    params_str = f"folder={folder}&timestamp={ts}"
    signature = hashlib.sha1(f"{params_str}{api_secret}".encode()).hexdigest()

    return {
        "cloud_name": cloud_name,
        "api_key": api_key,
        "timestamp": ts,
        "folder": folder,
        "signature": signature,
    }

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
