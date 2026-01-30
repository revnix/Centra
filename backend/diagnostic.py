import asyncio
import sqlite3
import os
from sqlalchemy.future import select
from langgraph_sdk import get_client

async def check_db():
    print("--- Database Check ---")
    db_path = 'evalyn.db'
    abs_path = os.path.abspath(db_path)
    print(f"Checking database at: {abs_path}")
    
    if not os.path.exists(db_path):
        print("Database file does not exist!")
        return

    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        
        c.execute("SELECT id, email FROM users")
        users = c.fetchall()
        print(f"Users found ({len(users)}):")
        for u in users:
            print(f"  ID: {u[0]}, Email: {u[1]}")
            
        c.execute("SELECT id, title, status, created_by FROM posts")
        posts = c.fetchall()
        print(f"Posts found ({len(posts)}):")
        for p in posts:
            print(f"  ID: {p[0]}, Title: {p[1]}, Status: {p[2]}, CreatedBy: {p[3]}")
            
        conn.close()
    except Exception as e:
        print(f"Error querying database: {e}")

async def check_threads():
    print("\n--- LangGraph Threads Check ---")
    try:
        client = get_client(url='http://127.0.0.1:2024')
        threads = await client.threads.search(limit=5)
        print(f"Found {len(threads)} active threads.")
        
        for t in threads:
            thread_id = t['thread_id']
            state = await client.threads.get_state(thread_id)
            jd = state['values'].get('jd', {})
            save_status = jd.get('save_status')
            save_error = jd.get('save_error')
            job_title = jd.get('role')
            
            print(f"Thread {thread_id}:")
            print(f"  Job: {job_title}")
            print(f"  Save Status: {save_status}")
            if save_error:
                print(f"  Save Error: {save_error}")
            print(f"  Status in state: {jd.get('status')}")
    except Exception as e:
        print(f"Error checking threads: {e}")

async def main():
    await check_db()
    await check_threads()

if __name__ == "__main__":
    asyncio.run(main())
