import base64
import hashlib
import hmac
import html as html_lib
import json
import logging
import os
import re
import secrets
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Optional

# OAuthLib rejects HTTP redirect URIs without this flag.
# Safe for local dev where the redirect is http://127.0.0.1.
os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")

from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from starlette.concurrency import run_in_threadpool

from src.api.core.config import settings
from src.api.core.dependencies import get_current_user
from src.api.db.session import get_db
from src.api.models.integration import UserIntegration
from src.api.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()

GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
]


def _client_config() -> dict:
    return {
        "web": {
            "client_id": settings.GMAIL_CLIENT_ID,
            "client_secret": settings.GMAIL_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }


def _generate_pkce() -> tuple[str, str]:
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode()
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b"=").decode()
    return verifier, challenge


def _make_state(user_id: Any, code_verifier: str) -> str:
    data = json.dumps({"user_id": int(user_id), "cv": code_verifier})
    sig = hmac.new(settings.SECRET_KEY.encode(), data.encode(), hashlib.sha256).hexdigest()[:16]
    payload = f"{data}|{sig}".encode()
    return base64.urlsafe_b64encode(payload).decode().rstrip("=")


def _parse_state(state: str) -> dict:
    try:
        padding = (4 - len(state) % 4) % 4
        decoded = base64.urlsafe_b64decode(state + "=" * padding).decode()
        data, sig = decoded.rsplit("|", 1)
        expected = hmac.new(settings.SECRET_KEY.encode(), data.encode(), hashlib.sha256).hexdigest()[:16]
        if not hmac.compare_digest(sig, expected):
            raise ValueError("Signature mismatch")
        return json.loads(data)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid OAuth state: {exc}")


def _build_credentials(token_json: Any):
    from google.oauth2.credentials import Credentials

    data = json.loads(str(token_json))
    return Credentials(
        token=data.get("access_token"),
        refresh_token=data.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GMAIL_CLIENT_ID,
        client_secret=settings.GMAIL_CLIENT_SECRET,
        scopes=GMAIL_SCOPES,
    )


async def _get_credentials(user_id: Any, db: AsyncSession):
    result = await db.execute(
        select(UserIntegration).where(
            UserIntegration.user_id == user_id,
            UserIntegration.platform == "gmail",
        )
    )
    integration = result.scalars().first()
    if not integration:
        raise HTTPException(status_code=400, detail="Gmail not connected. Please connect your Gmail account.")
    return _build_credentials(integration.access_token), integration


async def _maybe_refresh(creds: Any, integration: Any, db: AsyncSession) -> None:
    from google.auth.transport.requests import Request as GoogleRequest

    if creds.expired and creds.refresh_token:
        await run_in_threadpool(creds.refresh, GoogleRequest())
        token_data = json.loads(str(integration.access_token))
        token_data["access_token"] = creds.token
        integration.access_token = json.dumps(token_data)
        await db.commit()


def _decode_b64(data: str) -> str:
    padding = (4 - len(data) % 4) % 4
    return base64.urlsafe_b64decode(data + "=" * padding).decode("utf-8", errors="replace")


def _clean_text(text: str) -> str:
    """Strip angle-bracket URLs and junk from plain-text email bodies."""
    text = re.sub(r"<[^>]{0,2000}>", "", text)        # <url> or <tag> patterns
    text = re.sub(r"https?://\S+", "", text)            # bare URLs
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _html_to_text(raw_html: str) -> str:
    """Convert HTML email body to readable plain text."""
    text = re.sub(r"<(script|style)[^>]*>.*?</(script|style)>", "", raw_html, flags=re.DOTALL | re.IGNORECASE)
    # Convert anchor links to just their visible text (removes URLs)
    text = re.sub(r'<a[^>]*>(.*?)</a>', r'\1', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<p[^>]*>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<li[^>]*>", "\n• ", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = html_lib.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _extract_body(payload: dict) -> str:
    mime = payload.get("mimeType", "")
    if mime == "text/plain":
        raw = payload.get("body", {}).get("data", "")
        if raw:
            return _clean_text(_decode_b64(raw))
    if mime == "text/html":
        raw = payload.get("body", {}).get("data", "")
        if raw:
            return _html_to_text(_decode_b64(raw))
    # multipart: prefer plain over html
    plain_body = ""
    for part in payload.get("parts", []):
        body = _extract_body(part)
        if body and not plain_body:
            plain_body = body
    return plain_body


# ---- Schemas ----

class GmailStatusResponse(BaseModel):
    connected: bool
    email: Optional[str] = None


class EmailSummary(BaseModel):
    id: str
    thread_id: str
    subject: str
    from_: str
    snippet: str
    date: str
    unread: bool


class SendEmailRequest(BaseModel):
    to: str
    subject: str
    body: str
    thread_id: Optional[str] = None
    cc: Optional[str] = None
    bcc: Optional[str] = None


# ---- Routes ----

@router.get("/status", response_model=GmailStatusResponse)
async def gmail_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserIntegration).where(
            UserIntegration.user_id == current_user.id,
            UserIntegration.platform == "gmail",
        )
    )
    integration = result.scalars().first()
    if not integration:
        return {"connected": False}
    token_data = json.loads(str(integration.access_token))
    return {"connected": True, "email": token_data.get("email")}


@router.get("/auth")
async def gmail_auth(current_user: User = Depends(get_current_user)):
    if not settings.GMAIL_CLIENT_ID or not settings.GMAIL_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Gmail OAuth is not configured on this server.")

    from google_auth_oauthlib.flow import Flow

    code_verifier, code_challenge = _generate_pkce()
    flow = Flow.from_client_config(
        _client_config(),
        scopes=GMAIL_SCOPES,
        redirect_uri=settings.GMAIL_REDIRECT_URI,
    )
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=_make_state(current_user.id, code_verifier),
        code_challenge=code_challenge,
        code_challenge_method="S256",
    )
    return {"authorization_url": auth_url}


@router.get("/callback")
async def gmail_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    from google_auth_oauthlib.flow import Flow
    from googleapiclient.discovery import build

    state_data = _parse_state(state)
    user_id: int = state_data["user_id"]
    code_verifier: str = state_data.get("cv", "")

    flow = Flow.from_client_config(
        _client_config(),
        scopes=GMAIL_SCOPES,
        redirect_uri=settings.GMAIL_REDIRECT_URI,
        state=state,
    )
    try:
        await run_in_threadpool(
            lambda: flow.fetch_token(code=code, code_verifier=code_verifier)
        )
    except Exception as exc:
        logger.error("Gmail token exchange failed: %s", exc, exc_info=True)
        import urllib.parse
        err_msg = urllib.parse.quote(str(exc)[:200])
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/dashboard/inbox?gmail_error=1&err={err_msg}")

    creds = flow.credentials

    try:
        def _get_profile(c):
            from googleapiclient.discovery import build as _build
            svc = _build("gmail", "v1", credentials=c)
            return svc.users().getProfile(userId="me").execute()  # type: ignore[attr-defined]

        profile = await run_in_threadpool(lambda: _get_profile(creds))
        gmail_email = profile.get("emailAddress", "")
    except Exception as exc:
        logger.warning("Could not fetch Gmail profile: %s", exc)
        gmail_email = ""

    token_json = json.dumps({
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "email": gmail_email,
    })

    result = await db.execute(
        select(UserIntegration).where(
            UserIntegration.user_id == user_id,
            UserIntegration.platform == "gmail",
        )
    )
    integration = result.scalars().first()
    if integration:
        integration.access_token = token_json  # type: ignore[assignment]
        integration.platform_user_id = gmail_email  # type: ignore[assignment]
    else:
        db.add(UserIntegration(
            user_id=user_id,
            platform="gmail",
            platform_user_id=gmail_email,
            access_token=token_json,
        ))
    await db.commit()

    return RedirectResponse(url=f"{settings.FRONTEND_URL}/dashboard/inbox?gmail_connected=1")


@router.get("/inbox")
async def gmail_inbox(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page_token: Optional[str] = Query(default=None),
    max_results: int = Query(default=50, ge=1, le=500),
):
    creds, integration = await _get_credentials(current_user.id, db)
    await _maybe_refresh(creds, integration, db)

    def _fetch_page(c, n, pt):
        from googleapiclient.discovery import build as _build
        svc = _build("gmail", "v1", credentials=c)

        kwargs: dict = {"userId": "me", "maxResults": n, "labelIds": ["INBOX"]}
        if pt:
            kwargs["pageToken"] = pt
        page = svc.users().messages().list(**kwargs).execute()  # type: ignore[attr-defined]
        msg_ids = page.get("messages", [])
        next_token = page.get("nextPageToken")

        # Batch fetch metadata (all IDs in one HTTP call via Gmail batch API)
        summaries: list[Optional[dict]] = [None] * len(msg_ids)

        def _on_msg(request_id: str, response: Any, exception: Any) -> None:
            if exception or not response:
                return
            idx = int(request_id)
            hdrs = {h["name"]: h["value"] for h in response.get("payload", {}).get("headers", [])}
            summaries[idx] = {
                "id": response["id"],
                "thread_id": response["threadId"],
                "subject": hdrs.get("Subject", "(no subject)"),
                "from_": hdrs.get("From", ""),
                "snippet": response.get("snippet", ""),
                "date": hdrs.get("Date", ""),
                "unread": "UNREAD" in response.get("labelIds", []),
            }

        batch = svc.new_batch_http_request(callback=_on_msg)  # type: ignore[attr-defined]
        for j, msg in enumerate(msg_ids):
            batch.add(
                svc.users().messages().get(  # type: ignore[attr-defined]
                    userId="me",
                    id=msg["id"],
                    format="metadata",
                    metadataHeaders=["Subject", "From", "Date"],
                ),
                request_id=str(j),
            )
        if msg_ids:
            batch.execute()

        return {"emails": [s for s in summaries if s is not None], "next_page_token": next_token}

    return await run_in_threadpool(lambda: _fetch_page(creds, max_results, page_token))


@router.get("/thread/{thread_id}")
async def gmail_thread(
    thread_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    creds, integration = await _get_credentials(current_user.id, db)
    await _maybe_refresh(creds, integration, db)

    def _fetch_thread(c, tid):
        from googleapiclient.discovery import build as _build
        svc = _build("gmail", "v1", credentials=c)
        thread = svc.users().threads().get(  # type: ignore[attr-defined]
            userId="me", id=tid, format="full"
        ).execute()
        msgs = []
        for msg in thread.get("messages", []):
            headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
            msgs.append({
                "id": msg["id"],
                "thread_id": msg["threadId"],
                "subject": headers.get("Subject", "(no subject)"),
                "from_": headers.get("From", ""),
                "to": headers.get("To", ""),
                "body": _extract_body(msg.get("payload", {})),
                "date": headers.get("Date", ""),
            })
        return {"thread_id": tid, "messages": msgs}

    return await run_in_threadpool(lambda: _fetch_thread(creds, thread_id))


@router.post("/sync-replies")
async def sync_email_replies(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Search HR Gmail inbox for replies from candidates who were sent invites.
    Automatically updates application status to RESPONDED if a reply is found.
    """
    import re as _re
    from sqlalchemy.orm import joinedload as _jl
    from src.api.models.application import Application, ApplicationStatus

    creds, integration = await _get_credentials(current_user.id, db)
    await _maybe_refresh(creds, integration, db)

    # Fetch all applications waiting for a response
    result = await db.execute(
        select(Application)
        .options(_jl(Application.candidate))
        .where(Application.interview_invitation_status == "SENT")
    )
    pending = result.scalars().all()

    if not pending:
        return {"updated": 0, "message": "No pending invitations"}

    # Build {lowercase_email: application} map
    email_map: dict = {}
    for app in pending:
        if app.candidate and app.candidate.email:
            email_map[app.candidate.email.lower()] = app

    if not email_map:
        return {"updated": 0, "message": "No candidate emails to check"}

    # Search Gmail inbox for messages from any of these candidates (in chunks of 15)
    candidate_emails = list(email_map.keys())
    found_emails: set = set()

    def _search_chunk(c, emails_chunk):
        from googleapiclient.discovery import build as _build
        svc = _build("gmail", "v1", credentials=c)
        query = "in:inbox (" + " OR ".join(f"from:{e}" for e in emails_chunk) + ")"
        res = svc.users().messages().list(userId="me", q=query, maxResults=50).execute()  # type: ignore[attr-defined]
        messages = res.get("messages", [])
        if not messages:
            return set()

        senders: set = set()

        def _on_msg(_request_id, response, exception):
            if exception or not response:
                return
            headers = {h["name"]: h["value"] for h in response.get("payload", {}).get("headers", [])}
            from_header = headers.get("From", "")
            m = _re.search(r"<([^>]+)>", from_header)
            email = m.group(1).lower() if m else from_header.lower().strip()
            senders.add(email)

        batch = svc.new_batch_http_request(callback=_on_msg)  # type: ignore[attr-defined]
        for j, msg in enumerate(messages):
            batch.add(
                svc.users().messages().get(  # type: ignore[attr-defined]
                    userId="me", id=msg["id"], format="metadata", metadataHeaders=["From"]
                ),
                request_id=str(j),
            )
        batch.execute()
        return senders

    chunk_size = 15
    for i in range(0, len(candidate_emails), chunk_size):
        chunk = candidate_emails[i : i + chunk_size]
        found_emails |= await run_in_threadpool(_search_chunk, creds, chunk)

    # Update matched applications
    updated = 0
    for email in found_emails:
        if email in email_map:
            app = email_map[email]
            app.interview_invitation_status = "RESPONDED"  # type: ignore[assignment]
            app.status = ApplicationStatus.RESPONDED  # type: ignore[assignment]
            db.add(app)
            updated += 1

    if updated:
        await db.commit()

    return {"updated": updated, "message": f"{updated} candidate(s) marked as RESPONDED"}


@router.post("/send")
async def gmail_send(
    to: str = Form(...),
    subject: str = Form(...),
    body: str = Form(...),
    thread_id: Optional[str] = Form(default=None),
    cc: Optional[str] = Form(default=None),
    bcc: Optional[str] = Form(default=None),
    files: List[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    creds, integration = await _get_credentials(current_user.id, db)
    await _maybe_refresh(creds, integration, db)

    from email.mime.base import MIMEBase
    from email import encoders as _encoders

    # Use "mixed" to support attachments; body goes in a nested "alternative" part
    msg = MIMEMultipart("mixed")
    msg["To"] = to
    msg["Subject"] = subject
    if cc:
        msg["Cc"] = cc
    if bcc:
        msg["Bcc"] = bcc

    msg.attach(MIMEText(body, "plain"))

    # Attach uploaded files
    for f in files:
        if f.filename:
            content = await f.read()
            part = MIMEBase("application", "octet-stream")
            part.set_payload(content)
            _encoders.encode_base64(part)
            part.add_header("Content-Disposition", f'attachment; filename="{f.filename}"')
            msg.attach(part)

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    send_body: dict = {"raw": raw}
    if thread_id:
        send_body["threadId"] = thread_id

    def _send(c, sb):
        from googleapiclient.discovery import build as _build
        svc = _build("gmail", "v1", credentials=c)
        return svc.users().messages().send(  # type: ignore[attr-defined]
            userId="me", body=sb
        ).execute()

    result = await run_in_threadpool(lambda: _send(creds, send_body))
    return {"message_id": result.get("id"), "thread_id": result.get("threadId")}
