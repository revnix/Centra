"""
Test script to verify Indeed API connectivity and diagnose Cloudflare issues.

Run this script to test the Indeed API connection without going through the full app flow.
"""

import httpx
import asyncio
from dotenv import load_dotenv
import os

load_dotenv()

async def test_indeed_api():
    """Test Indeed API with enhanced headers"""
    
    # You'll need to replace this with a valid access token from your database
    # or from the OAuth flow
    access_token = "YOUR_ACCESS_TOKEN_HERE"
    
    url = "https://apis.indeed.com/v1/jobs"
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        "Origin": "https://employers.indeed.com",
        "Referer": "https://employers.indeed.com/",
    }
    
    payload = {
        "title": "Test Job",
        "description": "This is a test job posting",
        "location": "Remote",
        "company": "Test Company",
        "jobType": "FULL_TIME",
        "postingStatus": "ACTIVE"
    }
    
    print("Testing Indeed API connection...")
    print(f"URL: {url}")
    print(f"Client ID: {os.getenv('INDEED_CLIENT_ID')[:20]}...")
    print("\nAttempting to post job...\n")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            print(f"Status Code: {response.status_code}")
            print(f"Content-Type: {response.headers.get('content-type')}")
            
            if "text/html" in response.headers.get("content-type", ""):
                print("\n❌ CLOUDFLARE BLOCK DETECTED")
                print("The response is HTML, indicating Cloudflare protection.")
                print("\nResponse preview:")
                print(response.text[:500])
            else:
                print("\n✅ API RESPONSE RECEIVED")
                print("Response:")
                print(response.text)
                
        except Exception as e:
            print(f"\n❌ ERROR: {e}")

async def test_indeed_auth():
    """Test Indeed OAuth endpoints"""
    print("\n" + "="*60)
    print("Testing Indeed OAuth Endpoints")
    print("="*60 + "\n")
    
    # Test authorization URL generation
    from urllib.parse import urlencode
    base_url = "https://secure.indeed.com/oauth/v2/authorize"
    params = {
        "response_type": "code",
        "client_id": os.getenv("INDEED_CLIENT_ID"),
        "redirect_uri": os.getenv("INDEED_REDIRECT_URI"),
        "state": "test_state_123",
        "scope": "employer_access",
    }
    auth_url = f"{base_url}?{urlencode(params)}"
    
    print("✅ Authorization URL generated:")
    print(auth_url)
    print("\nYou can visit this URL to test the OAuth flow manually.")

if __name__ == "__main__":
    print("="*60)
    print("Indeed API Connection Test")
    print("="*60)
    
    # Test OAuth endpoints first
    asyncio.run(test_indeed_auth())
    
    print("\n" + "="*60)
    print("Testing Job Posting API")
    print("="*60)
    print("\n⚠️  NOTE: You need a valid access token to test job posting.")
    print("Get an access token by:")
    print("1. Connecting Indeed in your app's Integrations page")
    print("2. Checking your database for the access_token")
    print("3. Replacing 'YOUR_ACCESS_TOKEN_HERE' in this script\n")
    
    # Uncomment to test job posting (requires valid access token)
    # asyncio.run(test_indeed_api())
