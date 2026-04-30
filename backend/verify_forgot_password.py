import httpx
import asyncio

async def test_forgot_password():
    base_url = "http://127.0.0.1:2024/api/v1"
    test_email = "test@example.com" # Ensure this user exists or use a real one
    
    print(f"Testing forgot-password for {test_email}...")
    async with httpx.AsyncClient() as client:
        # 1. Trigger forgot password
        response = await client.post(f"{base_url}/auth/forgot-password", json={"email": test_email})
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        # Note: Since we log the link, we can't easily grab the token here 
        # without checking logs or database. 
        # But the status 200 confirms the route and logic up to email sending works.

if __name__ == "__main__":
    asyncio.run(test_forgot_password())
