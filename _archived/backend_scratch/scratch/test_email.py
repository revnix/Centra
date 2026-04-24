import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

import asyncio
from src.api.utils.email import send_application_notification
from src.api.core.config import settings

async def test_email():
    print(f"Testing email sending to: {settings.HR_EMAIL}")
    print(f"Sending from: {settings.EMAILS_FROM_EMAIL}")
    print(f"API Key: {settings.RESEND_API_KEY[:10]}...")
    
    result = send_application_notification(
        candidate_name="Test Applicant",
        candidate_email="test@example.com",
        job_id=999,
        resume_link=None
    )
    print(f"Result: {result}")

if __name__ == "__main__":
    asyncio.run(test_email())
