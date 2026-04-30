import asyncio
from src.api.services.email_service import EmailService
from src.api.core.config import settings
import os
from dotenv import load_dotenv

import logging
logging.basicConfig(level=logging.INFO)
load_dotenv()

async def test_email():
    print(f"Using RESEND_API_KEY: {settings.RESEND_API_KEY[:5]}...")
    print(f"From: {settings.RESEND_FROM_NAME} <{settings.RESEND_FROM_EMAIL}>")
    print(f"To: {settings.OPERATIONS_MANAGER_EMAIL}")
    
    success = await EmailService.send_job_to_manager(
        "Test Job Title", 
        "This is a test of the email notification system.",
        review_url="http://localhost:3000/review-job/test"
    )
    
    if success:
        print("Email sent successfully!")
    else:
        print("Email failed to send. Check logs/stderr.")

if __name__ == "__main__":
    asyncio.run(test_email())
