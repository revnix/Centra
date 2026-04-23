import os
import sys
from google_auth_oauthlib.flow import InstalledAppFlow
from dotenv import load_dotenv

# Add parent dir to sys.path to import settings correctly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.api.core.config import settings

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/calendar']

def main():
    load_dotenv()
    
    # Check if credentials are set
    if not settings.GOOGLE_CAL_CLIENT_ID or not settings.GOOGLE_CAL_CLIENT_SECRET:
        print("Error: GOOGLE_CAL_CLIENT_ID and GOOGLE_CAL_CLIENT_SECRET must be set in .env")
        return

    print("Starting Google Calendar Authentication Flow...")
    
    flow = InstalledAppFlow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CAL_CLIENT_ID,
                "project_id": settings.GOOGLE_CAL_PROJECT_ID,
                "auth_uri": settings.GOOGLE_CAL_AUTH_URI,
                "token_uri": settings.GOOGLE_CAL_TOKEN_URI,
                "client_secret": settings.GOOGLE_CAL_CLIENT_SECRET,
            }
        },
        SCOPES
    )
    
    creds = flow.run_local_server(port=0)
    
    # Save the credentials for the next run
    token_path = os.path.join(os.path.dirname(__file__), '..', 'token.json')
    with open(token_path, 'w') as token:
        token.write(creds.to_json())
        
    print(f"\n✅ Authentication successful! Token saved to: {token_path}")

if __name__ == "__main__":
    main()
