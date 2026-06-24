import base64
import hashlib
import hmac
import json
import logging
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Optional

# OAuthLib rejects HTTP redirect URIs without this flag.
# Safe for local dev where the redirect is http://127.0.0.1.
os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")

from fastapi import APIRouter, Depends, HTTPException, Query
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


def _make_state(user_id: Any) -> str:
    data = json.dumps({"user_id": int(user_id)})
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


def _extract_body(payload: dict) -> str:
    mime = payload.get("mimeType", "")
    if mime == "text/plain":
        raw = payload.get("body", {}).get("data", "")
        if raw:
            padding = (4 - len(raw) % 4) % 4
            return base64.urlsafe_b64decode(raw + "=" * padding).decode("utf-8", errors="replace")
    if mime == "text/html":
        html_data = payload.get("body", {}).get("data", "")
        if html_data:
            padding = (4 - len(html_data) % 4) % 4
            return base64.urlsafe_b64decode(html_data + "=" * padding).decode("utf-8", errors="replace")
    for part in payload.get("parts", []):
        body = _extract_body(part)
        if body:
            return body
    return ""


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

    flow = Flow.from_client_config(
        _client_config(),
        scopes=GMAIL_SCOPES,
        redirect_uri=settings.GMAIL_REDIRECT_URI,
    )
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=_make_state(current_user.id),
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

    flow = Flow.from_client_config(
        _client_config(),
        scopes=GMAIL_SCOPES,
        redirect_uri=settings.GMAIL_REDIRECT_URI,
        state=state,
    )
    try:
        await run_in_threadpool(lambda: flow.fetch_token(code=code))
    except Exception as exc:
        logger.error("Gmail token exchange failed: %s", exc)
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/dashboard/inbox?gmail_error=1")

    creds = flow.credentials

    try:
        service = build("gmail", "v1", credentials=creds)
        profile = await run_in_threadpool(
            lambda: service.users().getProfile(userId="me").execute()  # type: ignore[attr-defined]
        )
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
    max_results: int = Query(default=20, ge=1, le=100),
):
    from googleapiclient.discovery import build

    creds, integration = await _get_credentials(current_user.id, db)
    await _maybe_refresh(creds, integration, db)

    service = build("gmail", "v1", credentials=creds)

    messages_list = await run_in_threadpool(
        lambda: service.users().messages().list(  # type: ignore[attr-defined]
            userId="me", maxResults=max_results, labelIds=["INBOX"]
        ).execute()
    )

    summaries = []
    for msg in messages_list.get("messages", []):
        _msg = msg
        msg_data = await run_in_threadpool(
            lambda: service.users().messages().get(  # type: ignore[attr-defined]
                userId="me",
                id=_msg["id"],
                format="metadata",
                metadataHeaders=["Subject", "From", "Date"],
            ).execute()
        )
        headers = {h["name"]: h["value"] for h in msg_data.get("payload", {}).get("headers", [])}
        summaries.append({
            "id": msg_data["id"],
            "thread_id": msg_data["threadId"],
            "subject": headers.get("Subject", "(no subject)"),
            "from_": headers.get("From", ""),
            "snippet": msg_data.get("snippet", ""),
            "date": headers.get("Date", ""),
            "unread": "UNREAD" in msg_data.get("labelIds", []),
        })
    return summaries


@router.get("/thread/{thread_id}")
async def gmail_thread(
    thread_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from googleapiclient.discovery import build

    creds, integration = await _get_credentials(current_user.id, db)
    await _maybe_refresh(creds, integration, db)

    service = build("gmail", "v1", credentials=creds)
    thread = await run_in_threadpool(
        lambda: service.users().threads().get(  # type: ignore[attr-defined]
            userId="me", id=thread_id, format="full"
        ).execute()
    )

    messages_out = []
    for msg in thread.get("messages", []):
        headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
        messages_out.append({
            "id": msg["id"],
            "thread_id": msg["threadId"],
            "subject": headers.get("Subject", "(no subject)"),
            "from_": headers.get("From", ""),
            "to": headers.get("To", ""),
            "body": _extract_body(msg.get("payload", {})),
            "date": headers.get("Date", ""),
        })
    return {"thread_id": thread_id, "messages": messages_out}


@router.post("/send")
async def gmail_send(
    payload: SendEmailRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from googleapiclient.discovery import build

    creds, integration = await _get_credentials(current_user.id, db)
    await _maybe_refresh(creds, integration, db)

    msg = MIMEMultipart("alternative")
    msg["To"] = payload.to
    msg["Subject"] = payload.subject
    msg.attach(MIMEText(payload.body, "plain"))

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    send_body: dict = {"raw": raw}
    if payload.thread_id:
        send_body["threadId"] = payload.thread_id

    service = build("gmail", "v1", credentials=creds)
    result = await run_in_threadpool(
        lambda: service.users().messages().send(  # type: ignore[attr-defined]
            userId="me", body=send_body
        ).execute()
    )
    return {"message_id": result.get("id"), "thread_id": result.get("threadId")}
