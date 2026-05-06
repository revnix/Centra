import os
import cloudinary
import cloudinary.uploader
from cloudinary.utils import cloudinary_url
import asyncio
from typing import Any

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

async def upload_file(file_bytes: bytes, filename: str, folder: str) -> str:
    """
    Upload a file to Cloudinary and return the secure URL.
    This runs the synchronous cloudinary.uploader.upload in a thread pool.
    """
    def sync_upload():
        response = cloudinary.uploader.upload(
            file_bytes,
            folder=folder,
            public_id=filename.split('.')[0] if '.' in filename else filename,
            resource_type="auto"
        )
        return response.get("secure_url")

    # Run in thread pool to avoid blocking the event loop
    loop = asyncio.get_event_loop()
    secure_url = await loop.run_in_executor(None, sync_upload)
    return secure_url
