import sqlite3
import os

db_path = "evalyn.db"

def migrate():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if manager_feedback exists
        cursor.execute("PRAGMA table_info(posts)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if "manager_feedback" not in columns:
            print("Adding manager_feedback column to posts table...")
            cursor.execute("ALTER TABLE posts ADD COLUMN manager_feedback TEXT")
            print("Column added successfully.")
        else:
            print("manager_feedback column already exists.")

        conn.commit()
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
