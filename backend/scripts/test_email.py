"""
Run this to test SMTP directly without the server.
Usage: python scripts/test_email.py
Run from the backend/ directory.
"""
import smtplib
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
TO_EMAIL = os.getenv("OPERATIONS_MANAGER_EMAIL", "")

print(f"SMTP_HOST:     {SMTP_HOST}")
print(f"SMTP_PORT:     {SMTP_PORT}")
print(f"SMTP_USER:     {SMTP_USER}")
print(f"SMTP_PASSWORD: {'*' * len(SMTP_PASSWORD)} (len={len(SMTP_PASSWORD)})")
print(f"TO_EMAIL:      {TO_EMAIL}")
print()

if not SMTP_USER or not SMTP_PASSWORD:
    print("ERROR: SMTP_USER or SMTP_PASSWORD is empty. Check your .env file.")
    sys.exit(1)

try:
    print("Connecting to SMTP server...")
    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
    server.set_debuglevel(1)
    server.starttls()
    print("STARTTLS OK")
    server.login(SMTP_USER, SMTP_PASSWORD)
    print("LOGIN OK")

    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    msg = MIMEMultipart()
    msg['From'] = SMTP_USER
    msg['To'] = TO_EMAIL
    msg['Subject'] = "Evalyn SMTP Test"
    msg.attach(MIMEText("This is a test email from Evalyn.", 'plain'))
    server.sendmail(SMTP_USER, TO_EMAIL, msg.as_string())
    server.quit()
    print(f"\nSUCCESS: Email sent to {TO_EMAIL}")
except Exception as e:
    print(f"\nFAILED: {type(e).__name__}: {e}")
    sys.exit(1)
