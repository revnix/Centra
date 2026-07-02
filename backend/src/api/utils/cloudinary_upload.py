import os
import cloudinary
import cloudinary.uploader
import asyncio
import logging

logger = logging.getLogger(__name__)

# Configure Cloudinary only if all required env vars are present
cloudinary_configured = False
if (os.getenv("CLOUDINARY_CLOUD_NAME") and 
    os.getenv("CLOUDINARY_API_KEY") and 
    os.getenv("CLOUDINARY_API_SECRET")):
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True
    )
    cloudinary_configured = True
else:
    logger.warning("Cloudinary not configured (missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET). File uploads will be skipped.")

async def upload_file(file_bytes: bytes, filename: str, folder: str) -> str | None:
    """
    Upload a file to Cloudinary and return the secure URL.
    This runs the synchronous cloudinary.uploader.upload in a thread pool.
    Returns None if Cloudinary is not configured or upload fails.
    """
    if not cloudinary_configured:
        logger.warning("Cloudinary not configured. Skipping file upload.")
        return None
        
    def sync_upload():
        response = cloudinary.uploader.upload(
            file_bytes,
            folder=folder,
            public_id=filename,
            resource_type="auto"
        )
        return response.get("secure_url")

    try:
        # Run in thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        secure_url = await loop.run_in_executor(None, sync_upload)
        return secure_url
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}")
        return None
