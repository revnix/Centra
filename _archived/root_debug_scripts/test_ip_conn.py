import asyncio
import asyncpg
from src.api.core.config import settings

async def test_ip_conn():
    # host = "ep-aged-wave-a1yo44hi-pooler.ap-southeast-1.aws.neon.tech"
    ip = "13.228.46.236" # One of the IPs from nslookup
    
    url = settings.DATABASE_URL
    # Extract user, password, dbname
    # postgresql+asyncpg://neondb_owner:npg_kiGlhuXU0tZ1@host/neondb
    
    # Simple test using asyncpg directly
    try:
        conn = await asyncpg.connect(
            host=ip,
            port=5432,
            user="neondb_owner",
            password="npg_kiGlhuXU0tZ1",
            database="neondb",
            ssl="require",
            server_hostname="ep-aged-wave-a1yo44hi-pooler.ap-southeast-1.aws.neon.tech"
        )
        print("Successfully connected using IP and server_hostname!")
        await conn.close()
    except Exception as e:
        print(f"Failed to connect using IP: {e}")

if __name__ == "__main__":
    asyncio.run(test_ip_conn())
