import os
import smtplib
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
EMAILS_FROM_EMAIL = os.getenv("EMAILS_FROM_EMAIL")

print(f"SMTP Host: {SMTP_HOST}")
print(f"SMTP Port: {SMTP_PORT}")
print(f"SMTP User: {SMTP_USER}")
if SMTP_PASSWORD:
    print(f"SMTP Password Length: {len(SMTP_PASSWORD)}")
else:
    print("SMTP Password is None/Empty!")

print(f"Emails From: {EMAILS_FROM_EMAIL}")

try:
    print("Connecting to SMTP server...")
    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
    server.starttls()
    print("Logging in...")
    server.login(SMTP_USER, SMTP_PASSWORD)
    print("Logged in successfully!")
    server.quit()
except Exception as e:
    print(f"SMTP Error: {type(e).__name__} - {str(e)}")
