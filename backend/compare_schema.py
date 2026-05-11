
import asyncio
from sqlalchemy import inspect, text
from src.api.db.session import engine
from src.api.db.base import Base
# Import all models to ensure they are in Base.metadata
from src.api.models.job import Posts
from src.api.models.application import Application
from src.api.models.user import User
from src.api.models.candidate import CandidateProfile
from src.api.models.interview import InterviewSession

async def compare_schema():
    async with engine.connect() as conn:
        def get_db_schema(connection):
            inspector = inspect(connection)
            db_schema = {}
            for table_name in inspector.get_table_names():
                db_schema[table_name] = [col['name'] for col in inspector.get_columns(table_name)]
            return db_schema

        db_schema = await conn.run_sync(get_db_schema)
        
        print("--- Schema Comparison ---")
        for table_name, table in Base.metadata.tables.items():
            if table_name not in db_schema:
                print(f"Table MISSING in DB: {table_name}")
                continue
            
            model_cols = set(table.columns.keys())
            db_cols = set(db_schema[table_name])
            
            missing_in_db = model_cols - db_cols
            extra_in_db = db_cols - model_cols
            
            if missing_in_db:
                print(f"Table '{table_name}' MISSING columns in DB: {missing_in_db}")
            if extra_in_db:
                print(f"Table '{table_name}' EXTRA columns in DB: {extra_in_db}")
            if not missing_in_db and not extra_in_db:
                print(f"Table '{table_name}' is in sync.")

if __name__ == "__main__":
    asyncio.run(compare_schema())
