import os
from dotenv import load_dotenv

load_dotenv("backend/.env")
pwd = os.getenv("SMTP_PASSWORD", "")
print(f"Password: '{pwd}'")
print(f"Length: {len(pwd)}")
if len(pwd) == 15:
    print("FATAL ERROR: Your password has only 15 letters. Gmail App Passwords MUST have 16 letters.")
    print("Example correct format: abcd efgh ijkl mnop (no spaces = abcdefghijklmnop)")
else:
    print(f"Length {len(pwd)} is not 16.")
