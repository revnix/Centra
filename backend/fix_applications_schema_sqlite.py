import asyncio
from sqlalchemy import text
from src.api.db.session import engine

async def fix_table(conn, table_name, schema_fields):
    print(f"Checking '{table_name}' table...")
    res = await conn.execute(text(f"PRAGMA table_info({table_name})"))
    columns = [row[1] for row in res.fetchall()]
    
    for col, col_type in schema_fields.items():
        if col not in columns:
            print(f"Adding column '{col}' to '{table_name}'...")
            try:
                await conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col} {col_type}"))
            except Exception as e:
                print(f"Error adding '{col}': {e}")
        else:
            # print(f"Column '{col}' already exists in '{table_name}'.")
            pass

async def update_schema():
    async with engine.begin() as conn:
        # Applications table
        await fix_table(conn, "applications", {
            "cover_letter": "TEXT",
            "phone_number": "VARCHAR(50)",
            "email_delivery_status": "VARCHAR(50) DEFAULT 'PENDING'",
            "email_logs": "TEXT"
        })
        
        # Users table
        await fix_table(conn, "users", {
            "full_name": "VARCHAR(255)",
            "username": "VARCHAR(255)"
        })
        
        # Posts table
        await fix_table(conn, "posts", {
            "salary_min": "INTEGER",
            "salary_max": "INTEGER",
            "salary_currency": "VARCHAR(10) DEFAULT 'USD'",
            "salary_period": "VARCHAR(20)",
            "salary_range": "VARCHAR(200)",
            "location_type": "VARCHAR(50)",
            "is_remote": "BOOLEAN DEFAULT 0",
            "experience_level": "VARCHAR(50)",
            "department": "VARCHAR(200)",
            "application_url": "VARCHAR(1000)",
            "application_email": "VARCHAR(255)",
            "application_deadline": "DATETIME",
            "required_skills": "JSON",
            "preferred_skills": "JSON",
            "benefits": "JSON",
            "company_name": "VARCHAR(255)",
            "company_logo_url": "VARCHAR(1000)",
            "company_website": "VARCHAR(1000)",
            "slug": "VARCHAR(500)",
            "meta_title": "VARCHAR(200)",
            "meta_description": "VARCHAR(500)",
            "tags": "JSON",
            "metadata_json": "JSON",
            "view_count": "INTEGER DEFAULT 0",
            "application_count": "INTEGER DEFAULT 0"
        })
        
        # Interview Sessions table
        await fix_table(conn, "interview_sessions", {
            "recording_path": "VARCHAR(500)",
            "overall_score": "FLOAT",
            "technical_score": "FLOAT",
            "communication_score": "FLOAT",
            "feedback": "TEXT",
            "started_at": "DATETIME",
            "completed_at": "DATETIME",
            "recording_url": "VARCHAR(500)",
            "expires_at": "DATETIME",
            "code_submission": "TEXT",
            "programming_language": "VARCHAR(50) DEFAULT 'python'",
            "transcript": "JSON",
            "state": "JSON"
        })

        print("Schema fix completed.")

if __name__ == "__main__":
    asyncio.run(update_schema())
