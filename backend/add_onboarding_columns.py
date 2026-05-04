import asyncio
from sqlalchemy import text
from src.api.db.session import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def add_columns():
    columns_to_add = [
        ("cnic_number", "VARCHAR(50)"),
        ("phone_number", "VARCHAR(50)"),
        ("current_address", "TEXT"),
        ("emergency_contact", "VARCHAR(100)"),
        ("bank_name", "VARCHAR(100)"),
        ("bank_iban", "VARCHAR(100)")
    ]
    
    async with engine.begin() as conn:
        logger.info("Checking for missing columns in 'onboardings' table...")
        
        # Get existing columns
        result = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'onboardings'"))
        existing_columns = {row[0] for row in result.fetchall()}
        
        for col_name, col_type in columns_to_add:
            if col_name not in existing_columns:
                logger.info(f"Adding column '{col_name}' to 'onboardings' table...")
                try:
                    await conn.execute(text(f"ALTER TABLE onboardings ADD COLUMN {col_name} {col_type}"))
                    logger.info(f"Successfully added column '{col_name}'.")
                except Exception as e:
                    logger.error(f"Failed to add column '{col_name}': {e}")
            else:
                logger.info(f"Column '{col_name}' already exists.")

if __name__ == "__main__":
    try:
        asyncio.run(add_columns())
        logger.info("Database schema update completed.")
    except Exception as e:
        logger.error(f"Schema update failed: {e}")
