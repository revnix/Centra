"""
One-off script: synchronises all PostgreSQL enum types with the SQLAlchemy model.
ALTER TYPE ... ADD VALUE cannot run inside a transaction, so asyncpg is used directly.
"""
import asyncio
import asyncpg
import re

SQLALCHEMY_URL = (
    "postgresql+asyncpg://neondb_owner:npg_kiGlhuXU0tZ1"
    "@ep-aged-wave-a1yo44hi-pooler.ap-southeast-1.aws.neon.tech"
    "/neondb?sslmode=require&channel_binding=require"
)

def to_asyncpg_url(sa_url: str) -> str:
    url = re.sub(r"^postgresql\+asyncpg://", "postgresql://", sa_url)
    url = re.sub(r"&?channel_binding=[^&]*", "", url)
    url = re.sub(r"\?$", "", url)
    return url

# All values required by the SQLAlchemy model
REQUIRED = {
    "jobstatus": [
        "DRAFT", "PENDING", "PUBLISHED", "APPROVED",
        "CHANGES_REQUESTED", "CLOSED", "ARCHIVED",
    ],
    "jobtype": [
        "full_time", "part_time", "contract",
        "temporary", "internship", "volunteer", "freelance",
    ],
    "experiencelevel": [
        "entry_level", "junior", "associate", "mid",
        "mid_senior", "senior", "lead", "director", "executive",
    ],
}

async def main():
    url = to_asyncpg_url(SQLALCHEMY_URL)
    print(f"Connecting to: {url[:60]}...")
    conn = await asyncpg.connect(url)
    try:
        for enum_name, required_values in REQUIRED.items():
            rows = await conn.fetch(
                "SELECT enumlabel FROM pg_enum e "
                "JOIN pg_type t ON e.enumtypid = t.oid "
                "WHERE t.typname = $1 ORDER BY enumsortorder",
                enum_name,
            )
            existing = {r["enumlabel"] for r in rows}
            print(f"\n[{enum_name}] existing: {sorted(existing)}")

            for value in required_values:
                if value not in existing:
                    print(f"  Adding: '{value}'")
                    await conn.execute(
                        f"ALTER TYPE {enum_name} ADD VALUE IF NOT EXISTS '{value}'"
                    )
                    print(f"  ✓ Added: '{value}'")
                else:
                    print(f"  ✓ OK:    '{value}'")

        print("\n✅ All enum types are now in sync.")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
