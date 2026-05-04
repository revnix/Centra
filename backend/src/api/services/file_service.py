import os
import uuid
import logging
from pathlib import Path
from fastapi import UploadFile
from starlette.concurrency import run_in_threadpool
from src.api.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

class FileService:
    @staticmethod
    async def save_onboarding_document(file: UploadFile, application_id: int, document_type: str) -> str:
        """
        Saves an onboarding document and returns the relative URL.
        """
        # Validate extension
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"File type '{ext}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

        # Create application-specific directory
        # e.g., uploads/onboarding/28/
        upload_dir = os.path.join(settings.UPLOAD_DIR, "onboarding", str(application_id))
        
        # Async-safe directory creation
        await run_in_threadpool(os.makedirs, upload_dir, exist_ok=True)

        # Generate safe unique filename
        # e.g., cnic_8f3a1b2c_my_id.pdf
        safe_filename = file.filename.replace(" ", "_")
        unique_name = f"{document_type}_{uuid.uuid4().hex[:8]}_{safe_filename}"
        file_path = os.path.join(upload_dir, unique_name)

        # Read content
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise ValueError(f"File too large. Max {MAX_FILE_SIZE // (1024*1024)}MB")

        # Async-safe file write
        def save_file(path, data):
            with open(path, "wb") as f:
                f.write(data)
        
        await run_in_threadpool(save_file, file_path, content)

        # Return relative URL
        # e.g., /uploads/onboarding/28/cnic_...pdf
        return f"/uploads/onboarding/{application_id}/{unique_name}"

    @staticmethod
    def get_full_path(relative_url: str) -> str:
        """Converts relative URL back to absolute file path."""
        if not relative_url:
            return ""
        # Remove leading slash if present
        rel_path = relative_url.lstrip("/")
        return os.path.join(os.getcwd(), rel_path)
