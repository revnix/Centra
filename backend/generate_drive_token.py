"""
generate_drive_token.py
-----------------------
One-time script to generate a Google Drive OAuth 2.0 refresh token.

Run this ONCE from the backend directory (with .venv activated):

    python generate_drive_token.py

It will:
  1. Read GOOGLE_DRIVE_OAUTH_CLIENT_ID and GOOGLE_DRIVE_OAUTH_CLIENT_SECRET from .env
     (or prompt you to paste them if not found).
  2. Open a browser for Google OAuth consent.
  3. Print the refresh_token to the terminal.
  4. You then paste that token into .env as GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN.

Requirements:
    pip install google-auth-oauthlib python-dotenv
"""

import os
import sys

# Load .env so we can read existing vars
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


def get_env_or_prompt(key: str, label: str) -> str:
    value = os.getenv(key, "").strip()
    if not value:
        value = input(f"Enter {label} ({key}): ").strip()
    if not value:
        print(f"ERROR: {key} is required.")
        sys.exit(1)
    return value


def main():
    print("=" * 60)
    print("  Google Drive OAuth 2.0 Refresh Token Generator")
    print("=" * 60)
    print()
    print("This opens a browser for a ONE-TIME consent flow.")
    print("Make sure you log in with the Google account whose")
    print("Drive you want to store resumes in.")
    print()

    client_id = get_env_or_prompt("GOOGLE_DRIVE_OAUTH_CLIENT_ID", "OAuth Client ID")
    client_secret = get_env_or_prompt("GOOGLE_DRIVE_OAUTH_CLIENT_SECRET", "OAuth Client Secret")

    try:
        from google_auth_oauthlib.flow import InstalledAppFlow
    except ImportError:
        print("\nERROR: google-auth-oauthlib is not installed.")
        print("Run:  pip install google-auth-oauthlib")
        sys.exit(1)

    client_config = {
        "installed": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"],
        }
    }

    SCOPES = ["https://www.googleapis.com/auth/drive"]

    flow = InstalledAppFlow.from_client_config(client_config, scopes=SCOPES)

    print("Opening browser for OAuth consent...")
    print("(If the browser doesn't open, copy the URL printed below and open it manually.)\n")

    creds = flow.run_local_server(port=0, prompt="consent", access_type="offline")

    refresh_token = creds.refresh_token

    if not refresh_token:
        print("\nERROR: No refresh_token received.")
        print("Make sure the OAuth client is type 'Desktop app' and you")
        print("completed the full consent flow (don't skip any screens).")
        sys.exit(1)

    print()
    print("=" * 60)
    print("  SUCCESS! Add this to your .env file:")
    print("=" * 60)
    print()
    print(f"GOOGLE_DRIVE_OAUTH_CLIENT_ID={client_id}")
    print(f"GOOGLE_DRIVE_OAUTH_CLIENT_SECRET={client_secret}")
    print(f"GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN={refresh_token}")
    print()
    print("Then restart 'langgraph dev --allow-blocking'.")
    print("=" * 60)


if __name__ == "__main__":
    main()
