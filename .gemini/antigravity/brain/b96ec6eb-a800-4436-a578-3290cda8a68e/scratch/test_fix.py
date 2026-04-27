import asyncio
import httpx

async def test_partial_update():
    # Use the backend URL from the environment or default
    BASE_URL = "http://127.0.0.1:2024/api/v1"
    
    # We need an application ID that has onboarding initiated.
    # From previous logs, application 2 was mentioned.
    # Let's try to get all onboardings first to find a valid ID.
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{BASE_URL}/onboarding/")
            onboardings = resp.json()
            if not onboardings:
                print("No onboardings found to test with.")
                return
            
            app_id = onboardings[0]['application_id']
            print(f"Testing with application_id: {app_id}")
            
            # Test partial update: Only shift_timing
            data = {"shift_timing": "2nd Shift"}
            print(f"Sending partial update: {data}")
            
            resp = await client.put(
                f"{BASE_URL}/onboarding/{app_id}/hr-joining-details",
                json=data
            )
            
            if resp.status_code == 200:
                print("SUCCESS: Partial update accepted.")
                print(resp.json())
            else:
                print(f"FAILED: Status {resp.status_code}")
                print(resp.json())
                
        except Exception as e:
            print(f"Error during test: {e}")

if __name__ == "__main__":
    asyncio.run(test_partial_update())
