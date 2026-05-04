import sys
import asyncio
from src.api.main import app
from src.api.db.base import Base
from src.api.db.session import engine

def verify_routes():
    print("Verifying Routes...")
    routes = [route.path for route in app.routes]
    expected_prefixes = [
        "/api/v1/applications",
        "/api/v1/interviews",
        "/api/v1/candidates"
    ]
    
    missing = []
    for prefix in expected_prefixes:
        found = any(r.startswith(prefix) for r in routes)
        if found:
            print(f"✅ Found routes for {prefix}")
        else:
            print(f"❌ Missing routes for {prefix}")
            missing.append(prefix)
            
    if missing:
        print("Route verification FAILED")
        sys.exit(1)
    else:
        print("All routes registered successfully.")

async def verify_db_models():
    print("\nVerifying Database Models...")
    try:
        async with engine.begin() as conn:
            # This will error if there are schema issues
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database models validity check passed (tables creation script generated successfully)")
    except Exception as e:
        print(f"❌ Database model verification failed: {e}")
        sys.exit(1)

async def main():
    verify_routes()
    await verify_db_models()
    print("\nBackend Refactoring Verification COMPLETED SUCCESSFULY")

if __name__ == "__main__":
    asyncio.run(main())
