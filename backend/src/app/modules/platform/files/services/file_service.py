import os
import uuid
import logging
from pathlib import Path
from fastapi import UploadFile
from starlette.concurrency import run_in_threadpool
from src.app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".jfif", ".png", ".webp", ".heic", ".doc", ".docx"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

class FileService:
    @staticmethod
    async def save_onboarding_document(file: UploadFile, application_id: int, document_type: str, candidate_name: str = None) -> str:
        """
        Saves an onboarding document and returns the relative URL.
        """
        # Validate extension
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"File type '{ext}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

        # Mapping of document types to readable names for file naming
        doc_type_mapping = {
            "front_pic": "Picture",
            "cnic": "CNIC",
            "resume": "CV",
            "degree": "Degree",
            "salary": "SalarySlip",
            "experience": "ExperienceLetter",
            "police": "PoliceClearance"
        }

        # Generate filename based on candidate name and document type
        if candidate_name:
            # Sanitize candidate name: replace spaces with underscores and remove special characters
            safe_name = candidate_name.replace(" ", "_").replace("-", "_")
            # Remove any characters that aren't alphanumeric or underscores
            safe_name = "".join(c for c in safe_name if c.isalnum() or c == "_")
            doc_suffix = doc_type_mapping.get(document_type, document_type)
            unique_name = f"{safe_name}_{doc_suffix}{ext}"
            logger.info(f"Renaming file for candidate '{candidate_name}' to: {unique_name}")
        else:
            # Fallback to original naming if no candidate name
            safe_filename = file.filename.replace(" ", "_")
            unique_name = f"{document_type}_{uuid.uuid4().hex[:8]}_{safe_filename}"
            logger.warning(f"No candidate name provided, using fallback naming: {unique_name}")

        # Read content
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise ValueError(f"File too large. Max {MAX_FILE_SIZE // (1024*1024)}MB")

        # Upload to Cloudinary
        from src.app.modules.platform.files.utils.cloudinary_upload import upload_file
        secure_url = await upload_file(
            content,
            unique_name,
            folder=f"evalyn/onboarding/{application_id}"
        )

        return secure_url

    @staticmethod
    def get_full_path(relative_url: str) -> str:
        """Converts relative URL back to absolute file path."""
        if not relative_url:
            return ""
        # Remove leading slash if present
        rel_path = relative_url.lstrip("/")
        return os.path.join(os.getcwd(), rel_path)
