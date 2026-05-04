import asyncio
from sqlalchemy.future import select
from sqlalchemy import delete
from src.api.db.session import engine, AsyncSessionLocal
from src.api.models.integration import UserIntegration

async def cleanup_duplicates():
    print("Connecting to database...")
    async with AsyncSessionLocal() as session:
        # Find all indeed integrations for user 20
        result = await session.execute(
            select(UserIntegration).where(
                UserIntegration.user_id == 20,
                UserIntegration.platform == "indeed"
            )
        )
        integrations = result.scalars().all()
        
        if len(integrations) > 1:
            print(f"Found {len(integrations)} Indeed integrations for user 20. Keeping the first one (ID: {integrations[0].id}).")
            # Keep the first one, delete the rest
            to_delete = [i.id for i in integrations[1:]]
            print(f"Deleting integration IDs: {to_delete}")
            
            await session.execute(
                delete(UserIntegration).where(UserIntegration.id.in_(to_delete))
            )
            await session.commit()
            print("Cleanup complete.")
        else:
            print("No duplicates found for Indeed.")

if __name__ == "__main__":
    asyncio.run(cleanup_duplicates())
