import os
import time
import sys
from datetime import datetime, timedelta
from imap_tools import MailBox, A
from sqlalchemy import create_engine, select, update, func, or_
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add the parent directory to sys.path to import src
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.app.modules.recruiting.models.application import Application, ApplicationStatus
from src.app.db.base import Base

load_dotenv()

# Configuration with fallbacks
IMAP_SERVER = os.getenv("IMAP_SERVER") or "imap.gmail.com"
IMAP_USER = os.getenv("IMAP_USER") or os.getenv("SMTP_USER")
IMAP_PASSWORD = os.getenv("IMAP_PASSWORD") or os.getenv("SMTP_PASSWORD")
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.startswith("postgresql+asyncpg://"):
    # Sync engine for this script
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_for_replies():
    """Checks for newly received candidate replies via IMAP."""
    if not all([IMAP_SERVER, IMAP_USER, IMAP_PASSWORD]):
        print(f"[{datetime.now()}] ERROR: IMAP/SMTP credentials missing in .env")
        return

    try:
        mailbox = MailBox(IMAP_SERVER)
        mailbox.login(IMAP_USER, IMAP_PASSWORD)
        
        try:
            # Check INBOX and 'All Mail' (common in Gmail)
            folder_to_check = "INBOX"
            folder_names = [f.name for f in mailbox.folder.list()]
            if "[Gmail]/All Mail" in folder_names:
                folder_to_check = "[Gmail]/All Mail"
            
            mailbox.folder.set(folder_to_check)
            
            # Fetch last 50 messages to find recent replies
            msgs = list(mailbox.fetch(limit=50, reverse=True))
            
            for msg in msgs:
                subject = str(msg.subject).lower()
                from_name = ""
                from_email = str(msg.from_).lower().strip()
                if '<' in from_email and '>' in from_email:
                    from_name = from_email.split('<')[0].strip().strip('"').strip("'")
                    from_email = from_email.split('<')[1].split('>')[0].strip()
                
                print(f"[{datetime.now()}] DEBUG: From: '{from_name}' <{from_email}> | Subject: '{subject}'")
                
                keywords = ["re:", "reply", "interview", "shortlisted", "regarding", "application", "evalyn", "invitation", "accepted", "confirmed"]
                is_reply = any(kw in subject for kw in keywords) or subject.startswith("re:")
                
                if is_reply:
                    print(f"[{datetime.now()}] DEBUG: Pattern match for reply! Searching DB...")
                    session = SessionLocal()
                    try:
                        from src.app.modules.platform.users.models.user import User
                        
                        # 1. Try exact email match (case-insensitive)
                        stmt = (
                            select(Application)
                            .join(User, Application.candidate_id == User.id)
                            .where(func.lower(User.email) == from_email)
                            .where(
                                (Application.interview_invitation_status.in_(["SENT", "DELIVERED", "OPENED"])) | 
                                (Application.status == ApplicationStatus.SENT)
                            )
                            .order_by(Application.created_at.desc())
                        )
                        result = session.execute(stmt)
                        application = result.scalars().first()
                        
                        # 2. Fallback: Match by name + email fragment (if exact email fails)
                        if not application and (from_name or len(from_email) > 5):
                            print(f"[{datetime.now()}] DEBUG: Exact email match failed for {from_email}. Trying name/fragment fallback...")
                            query = select(Application).join(User, Application.candidate_id == User.id)
                            
                            filters = []
                            if from_name:
                                filters.append(User.full_name.ilike(f"%{from_name}%"))
                            
                            # Also check if the reply email prefix matches (e.g. umerjavedawan vs umerawan)
                            prefix = from_email.split('@')[0].replace('.', '').replace('_', '')
                            if len(prefix) > 4:
                                filters.append(User.email.ilike(f"%{prefix[:4]}%"))
                                
                            if filters:
                                stmt_fb = query.where(or_(*filters)).where(
                                    (Application.interview_invitation_status.in_(["SENT", "DELIVERED", "OPENED"])) | 
                                    (Application.status == ApplicationStatus.SENT)
                                ).order_by(Application.created_at.desc())
                                result_fb = session.execute(stmt_fb)
                                application = result_fb.scalars().first()
                        
                        if application:
                            print(f"[{datetime.now()}] SUCCESS: Found reply from {from_email}. Updating application {application.id} to RESPONDED.")
                            application.status = ApplicationStatus.INTERVIEW_INVITED
                            application.interview_invitation_status = "RESPONDED"
                            
                            new_log = f"Auto-detected reply via IMAP at {datetime.now()}. Subject: {msg.subject}"
                            if not application.email_logs:
                                application.email_logs = []
                            
                            current_logs = application.email_logs
                            if isinstance(current_logs, list):
                                current_logs.append(new_log)
                            else:
                                current_logs = [str(current_logs), new_log]
                            application.email_logs = current_logs
                                
                            session.add(application)
                            session.commit()
                            print(f"[{datetime.now()}] DB UPDATE COMMITTED.")
                        else:
                            print(f"[{datetime.now()}] INFO: No 'SENT' application found for {from_email} / {from_name}.")
                            
                    except Exception as db_err:
                        print(f"[{datetime.now()}] DATABASE ERROR: {db_err}")
                    finally:
                        session.close()
        finally:
            mailbox.logout()

    except Exception as e:
        print(f"[{datetime.now()}] IMAP CONNECTION ERROR: {e}")
        print("TIP: Make sure you have enabled IMAP in Gmail settings and are using a 16-character 'App Password'.")

def check_timeouts():
    """Flags applications as NOT_RESPONDED if no reply after 2 days."""
    session = SessionLocal()
    try:
        from datetime import timezone
        # Use UTC for calculation
        two_days_ago = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=2)
        
        stmt = (
            select(Application)
            .where(Application.interview_invitation_status == "SENT")
            .where(Application.interview_invite_sent_at < two_days_ago)
        )
        result = session.execute(stmt)
        overdue_apps = result.scalars().all()
        
        for app in overdue_apps:
            print(f"[{datetime.now()}] TIMEOUT: Marking application {app.id} for {app.candidate_id} as NOT_RESPONDED.")
            app.interview_invitation_status = "NOT_RESPONDED"
            session.add(app)
            
        session.commit()
    except Exception as e:
        print(f"[{datetime.now()}] TIMEOUT CHECK ERROR: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    print(f"[{datetime.now()}] STARTING: Gmail Reply Polling Service (Solution 1)")
    print(f"Checking {IMAP_USER} every 30 seconds...")
    
    while True:
        try:
            check_for_replies()
            check_timeouts()
        except KeyboardInterrupt:
            print("Exiting...")
            break
        except Exception as e:
            print(f"[{datetime.now()}] CRITICAL RUNTIME ERROR: {e}")
            
        # Poll every 30 seconds as requested
        time.sleep(30)
