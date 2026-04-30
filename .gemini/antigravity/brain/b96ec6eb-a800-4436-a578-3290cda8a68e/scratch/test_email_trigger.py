import asyncio
import httpx

async def test_send_email():
    BASE_URL = "http://127.0.0.1:2024/api/v1"
    
    async with httpx.AsyncClient() as client:
        try:
            # 1. Get all onboardings to find a valid ID
            resp = await client.get(f"{BASE_URL}/onboarding/")
            onboardings = resp.json()
            if not onboardings:
                print("No onboardings found to test with.")
                return
            
            app_id = onboardings[0]['application_id']
            print(f"Testing with application_id: {app_id}")
            
            # 2. Trigger the welcome email
            print(f"Triggering welcome email for app_id: {app_id}...")
            resp = await client.post(f"{BASE_URL}/onboarding/{app_id}/send-welcome-email")
            
            if resp.status_code == 200:
                print("SUCCESS: Email trigger endpoint accepted.")
                print(resp.json())
            else:
                print(f"FAILED: Status {resp.status_code}")
                print(resp.json())
                
        except Exception as e:
            print(f"Error during test: {e}")

if __name__ == "__main__":
    asyncio.run(test_send_email())
