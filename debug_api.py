import asyncio
import httpx

async def check_api():
    base_url = "http://localhost:8000/api/applications"
    # Actually, we need a token to call these routes
    print("This script needs a valid token. Checking if API is up first...")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get("http://localhost:8000/api/jobs")
            print(f"Jobs list status: {resp.status_code}")
            if resp.status_code == 200:
                print(f"Total jobs: {len(resp.json())}")
            
            # Try to list applications (might fail without auth)
            resp = await client.get(base_url)
            print(f"Applications status: {resp.status_code}")
            print(resp.text[:500])
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_api())
