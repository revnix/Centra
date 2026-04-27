import sqlite3
import os

DB_PATH = "evalyn.db"

def add_columns():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    columns_to_add = [
        "ind_hr_welcome_session BOOLEAN DEFAULT 0",
        "ind_hr_handbook_shared BOOLEAN DEFAULT 0",
        "ind_hr_policies_explained BOOLEAN DEFAULT 0",
        "ind_it_credentials_provided BOOLEAN DEFAULT 0",
        "ind_it_security_induction BOOLEAN DEFAULT 0",
        "ind_manager_buddy_assigned BOOLEAN DEFAULT 0",
        "ind_manager_team_intro BOOLEAN DEFAULT 0"
    ]

    for col in columns_to_add:
        col_name = col.split()[0]
        try:
            cursor.execute(f"ALTER TABLE onboardings ADD COLUMN {col}")
            print(f"Added column: {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print(f"Column already exists: {col_name}")
            else:
                print(f"Error adding {col_name}: {e}")

    # SQLite does not easily allow altering ENUM values since it stores them as strings implicitly
    # The Pydantic and SQLAlchemy Enum models will enforce PENDING_INDUCTION validation.
    
    conn.commit()
    conn.close()
    print("Database alteration complete.")

if __name__ == "__main__":
    add_columns()
