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

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile
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

# ── Email-application import constants (module-level for thread-safe access) ──
_JOB_SUBJECT_KWS: frozenset[str] = frozenset({
    "application", "apply", "applied", "applying", "cv", "resume",
    "position", "job", "role", "opportunity", "hire", "hiring",
    "candidate", "vacancy", "opening",
})
_CV_FILENAME_KWS: frozenset[str] = frozenset({
    "cv", "resume", "curriculum", "vitae", "portfolio",
    "biodata", "bio_data", "profile",
})
_SKIP_SENDER_PATTERNS: tuple[str, ...] = (
    "noreply", "no-reply", "donotreply", "do-not-reply",
    "invoice", "billing", "alert", "notification", "mailer",
    "automated", "newsletter", "unsubscribe", "bounce",
)
# For emails with NO resume attached: the subject-keyword gate alone is too loose
# (job-alert digests and newsletters also say "job"/"role"/"opportunity"). Require
# the body to state FIRST-PERSON application intent — not just the word "apply"
# anywhere. A bare "appl*" match also matched the opposite direction: e.g. an
# organization's own "Apply Now for NVTTI Training" marketing blast, or "Dear
# Applicant, registration deadline extended" — where THEY are inviting the
# reader to apply to THEM, not applying to a job here. Anchoring on "I am/I'm"
# (allowing a few filler words: "I am currently applying") keeps the typo
# tolerance for genuine candidates ("i am applyng for...") while rejecting
# third-person/imperative marketing copy that never uses "I" that way.
_APPLY_INTENT_RE = re.compile(
    r"\bi\s?(?:'m|\bam\b)\s+(?:\w+\s+){0,3}appl\w*"                 # i am/i'm (currently) applying/applyng
    r"|\bi\s+apply\b"                                                 # i apply
    r"|\bmy\s+appl\w*\s+for\b"                                        # my application for
    r"|\bi\s+(?:would|wish|want)\s+(?:like\s+)?to\s+apply\b"          # i would (like) to apply
    r"|\bi\s?(?:'m|\bam\b)\s+(?:\w+\s+){0,2}interested\s+in\b",       # i am/i'm (very) interested in
    re.IGNORECASE,
)

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
    from google.auth.exceptions import RefreshError

    if creds.expired and creds.refresh_token:
        try:
            await run_in_threadpool(creds.refresh, GoogleRequest())
        except RefreshError:
            raise HTTPException(
                status_code=400,
                detail="Gmail token has expired or been revoked. Please reconnect your Gmail account under Integrations.",
            )
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


def _extract_html_body(payload: dict) -> str | None:
    """Return the raw HTML body from an email payload, or None if not available."""
    mime = payload.get("mimeType", "")
    if mime == "text/html":
        raw = payload.get("body", {}).get("data", "")
        return _decode_b64(raw) if raw else None
    if mime == "text/plain":
        return None
    # multipart — scan parts, prefer text/html
    found: str | None = None
    for part in payload.get("parts", []):
        result = _extract_html_body(part)
        if result and not found:
            found = result
    return found


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


def _extract_attachments(payload: dict) -> list[dict]:
    """Return every real attachment (any part with both a filename and an
    attachmentId) found anywhere in a message's MIME tree, in document order.
    Inline content without a filename (e.g. a signature image referenced by
    Content-ID) is excluded — only things a user would expect to see/download."""
    found: list[dict] = []
    queue = [payload]
    i = 0
    while i < len(queue):
        part = queue[i]
        i += 1
        filename = part.get("filename", "")
        body = part.get("body", {}) or {}
        att_id = body.get("attachmentId")
        if filename and att_id:
            found.append({
                "filename": filename,
                "attachment_id": att_id,
                "mime_type": part.get("mimeType", "application/octet-stream"),
                "size": body.get("size", 0),
            })
        queue.extend(part.get("parts", []) or [])
    return found


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
    creds = None
    try:
        await run_in_threadpool(
            lambda: flow.fetch_token(code=code, code_verifier=code_verifier)
        )
        creds = flow.credentials
    except ValueError as exc:
        if "Scope has changed" in str(exc):
            # Google returned additional scopes (e.g. from a prior grant) — our required
            # scopes are still present. Build credentials directly from the session token
            # to bypass the strict scope equality check in google-auth-oauthlib.
            try:
                from google.oauth2.credentials import Credentials as _GCreds
                tok = flow.oauth2session.token
                creds = _GCreds(
                    token=tok.get("access_token"),
                    refresh_token=tok.get("refresh_token"),
                    token_uri="https://oauth2.googleapis.com/token",
                    client_id=settings.GMAIL_CLIENT_ID,
                    client_secret=settings.GMAIL_CLIENT_SECRET,
                    scopes=GMAIL_SCOPES,
                )
            except Exception as inner_exc:
                logger.error("Could not recover from scope change: %s", inner_exc)
                import urllib.parse
                return RedirectResponse(url=f"{settings.FRONTEND_URL}/dashboard/inbox?gmail_error=1&err={urllib.parse.quote(str(exc)[:200])}")
        else:
            logger.error("Gmail token exchange failed (ValueError): %s", exc, exc_info=True)
            import urllib.parse
            err_msg = urllib.parse.quote(str(exc)[:200])
            return RedirectResponse(url=f"{settings.FRONTEND_URL}/dashboard/inbox?gmail_error=1&err={err_msg}")
    except Exception as exc:
        logger.error("Gmail token exchange failed: %s", exc, exc_info=True)
        import urllib.parse
        err_msg = urllib.parse.quote(str(exc)[:200])
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/dashboard/inbox?gmail_error=1&err={err_msg}")

    if creds is None:
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/dashboard/inbox?gmail_error=1&err=credentials_not_obtained")

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

        # Use threads.list so each conversation appears once (stable IDs, no duplicates).
        # messages.list can return the same thread multiple times and has indexing instability
        # that causes emails to appear/disappear across refreshes.
        kwargs: dict = {"userId": "me", "maxResults": n, "labelIds": ["INBOX"]}
        if pt:
            kwargs["pageToken"] = pt
        page = svc.users().threads().list(**kwargs).execute()  # type: ignore[attr-defined]
        thread_stubs = page.get("threads", [])
        next_token = page.get("nextPageToken")

        summaries: list[Optional[dict]] = [None] * len(thread_stubs)

        def _on_thread(request_id: str, response: Any, exception: Any) -> None:
            if exception or not response:
                return
            idx = int(request_id)
            messages = response.get("messages", [])
            if not messages:
                return
            # For inbox display: show the latest INBOUND message (INBOX label).
            # If we show messages[-1] we may show the HR's own outbound reply
            # (SENT label) as the "from" — that's wrong for an inbox view.
            inbound = [m for m in messages if "INBOX" in m.get("labelIds", [])]
            display_msg = inbound[-1] if inbound else messages[-1]
            display_hdrs = {h["name"]: h["value"]
                            for h in display_msg.get("payload", {}).get("headers", [])}
            # Use original subject from first message (avoids "Re: Re: …" on deep threads)
            first_hdrs = {h["name"]: h["value"]
                          for h in messages[0].get("payload", {}).get("headers", [])}
            thread_unread = any("UNREAD" in msg.get("labelIds", []) for msg in messages)
            # latest message id for mark-read / trash (use overall latest, not display)
            latest_id = messages[-1]["id"]
            summaries[idx] = {
                "id": latest_id,
                "thread_id": response["id"],
                "subject": first_hdrs.get("Subject", "(no subject)"),
                "from_": display_hdrs.get("From", ""),
                "snippet": display_msg.get("snippet", ""),
                "date": display_hdrs.get("Date", ""),
                "unread": thread_unread,
            }

        batch = svc.new_batch_http_request(callback=_on_thread)  # type: ignore[attr-defined]
        for j, stub in enumerate(thread_stubs):
            batch.add(
                svc.users().threads().get(  # type: ignore[attr-defined]
                    userId="me",
                    id=stub["id"],
                    format="metadata",
                    metadataHeaders=["Subject", "From", "Date"],
                ),
                request_id=str(j),
            )
        if thread_stubs:
            batch.execute()

        return {"emails": [s for s in summaries if s is not None], "next_page_token": next_token}

    try:
        return await run_in_threadpool(lambda: _fetch_page(creds, max_results, page_token))
    except Exception as exc:
        from google.auth.exceptions import RefreshError as _RefreshError
        if isinstance(exc, _RefreshError) or "invalid_grant" in str(exc):
            raise HTTPException(
                status_code=400,
                detail="Gmail token has expired or been revoked. Please reconnect your Gmail account under Integrations.",
            )
        raise


@router.get("/sent")
async def gmail_sent(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page_token: Optional[str] = Query(default=None),
    max_results: int = Query(default=50, ge=1, le=500),
):
    creds, integration = await _get_credentials(current_user.id, db)
    await _maybe_refresh(creds, integration, db)

    def _fetch_sent(c, n, pt):
        from googleapiclient.discovery import build as _build
        svc = _build("gmail", "v1", credentials=c)

        kwargs: dict = {"userId": "me", "maxResults": n, "labelIds": ["SENT"]}
        if pt:
            kwargs["pageToken"] = pt
        page = svc.users().messages().list(**kwargs).execute()  # type: ignore[attr-defined]
        msg_ids = page.get("messages", [])
        next_token = page.get("nextPageToken")

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
                "to_": hdrs.get("To", ""),
                "snippet": response.get("snippet", ""),
                "date": hdrs.get("Date", ""),
                "unread": False,
            }

        batch = svc.new_batch_http_request(callback=_on_msg)  # type: ignore[attr-defined]
        for j, msg in enumerate(msg_ids):
            batch.add(
                svc.users().messages().get(  # type: ignore[attr-defined]
                    userId="me",
                    id=msg["id"],
                    format="metadata",
                    metadataHeaders=["Subject", "From", "To", "Date"],
                ),
                request_id=str(j),
            )
        if msg_ids:
            batch.execute()

        return {"emails": [s for s in summaries if s is not None], "next_page_token": next_token}

    try:
        return await run_in_threadpool(lambda: _fetch_sent(creds, max_results, page_token))
    except Exception as exc:
        from google.auth.exceptions import RefreshError as _RefreshError
        if isinstance(exc, _RefreshError) or "invalid_grant" in str(exc):
            raise HTTPException(
                status_code=400,
                detail="Gmail token has expired or been revoked. Please reconnect your Gmail account under Integrations.",
            )
        raise


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
            payload = msg.get("payload", {})
            msgs.append({
                "id": msg["id"],
                "thread_id": msg["threadId"],
                "subject": headers.get("Subject", "(no subject)"),
                "from_": headers.get("From", ""),
                "to": headers.get("To", ""),
                "body": _extract_body(payload),
                "body_html": _extract_html_body(payload),
                "date": headers.get("Date", ""),
                "attachments": _extract_attachments(payload),
            })
        return {"thread_id": tid, "messages": msgs}

    try:
        return await run_in_threadpool(lambda: _fetch_thread(creds, thread_id))
    except Exception as exc:
        from google.auth.exceptions import RefreshError as _RefreshError
        if isinstance(exc, _RefreshError) or "invalid_grant" in str(exc):
            raise HTTPException(
                status_code=400,
                detail="Gmail token has expired or been revoked. Please reconnect your Gmail account under Integrations.",
            )
        raise


@router.get("/attachment/{message_id}/{attachment_id}")
async def gmail_attachment(
    message_id: str,
    attachment_id: str,
    filename: str = Query(default="attachment"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download a single attachment from a received Gmail message (used by the
    inbox reading pane, which previously showed no attachments at all)."""
    creds, integration = await _get_credentials(current_user.id, db)
    await _maybe_refresh(creds, integration, db)

    def _fetch(c):
        from googleapiclient.discovery import build as _build
        svc = _build("gmail", "v1", credentials=c)
        att = svc.users().messages().attachments().get(  # type: ignore[attr-defined]
            userId="me", messageId=message_id, id=attachment_id
        ).execute()
        data = att.get("data", "")
        padding = (4 - len(data) % 4) % 4
        return base64.urlsafe_b64decode(data + "=" * padding)

    try:
        raw_bytes = await run_in_threadpool(lambda: _fetch(creds))
    except Exception as exc:
        from google.auth.exceptions import RefreshError as _RefreshError
        if isinstance(exc, _RefreshError) or "invalid_grant" in str(exc):
            raise HTTPException(
                status_code=400,
                detail="Gmail token has expired or been revoked. Please reconnect your Gmail account under Integrations.",
            )
        raise HTTPException(status_code=500, detail=f"Failed to download attachment: {exc}")

    from fastapi.responses import Response
    safe_filename = filename.replace('"', "'")
    return Response(
        content=raw_bytes,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{safe_filename}"'},
    )


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

    from google.auth.exceptions import RefreshError as _RefreshError

    chunk_size = 15
    try:
        for i in range(0, len(candidate_emails), chunk_size):
            chunk = candidate_emails[i : i + chunk_size]
            found_emails |= await run_in_threadpool(_search_chunk, creds, chunk)
    except _RefreshError:
        raise HTTPException(
            status_code=400,
            detail="Gmail token has expired or been revoked. Please reconnect your Gmail account under Integrations.",
        )

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


class MessageIdsRequest(BaseModel):
    message_ids: List[str]


@router.post("/mark-read")
async def gmail_mark_read(
    body: MessageIdsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove UNREAD label from all messages in the given thread IDs."""
    creds, integration = await _get_credentials(current_user.id, db)
    await _maybe_refresh(creds, integration, db)

    def _do_mark(c, thread_ids):
        from googleapiclient.discovery import build as _build
        svc = _build("gmail", "v1", credentials=c)
        batch = svc.new_batch_http_request()  # type: ignore[attr-defined]
        for tid in thread_ids:
            batch.add(
                svc.users().threads().modify(  # type: ignore[attr-defined]
                    userId="me", id=tid, body={"removeLabelIds": ["UNREAD"]}
                )
            )
        batch.execute()

    try:
        await run_in_threadpool(lambda: _do_mark(creds, body.message_ids))
    except Exception as exc:
        from google.auth.exceptions import RefreshError as _RefreshError
        if isinstance(exc, _RefreshError) or "invalid_grant" in str(exc):
            raise HTTPException(status_code=400, detail="Gmail token expired. Please reconnect.")
        raise
    return {"marked": len(body.message_ids)}


@router.post("/mark-all-read")
async def gmail_mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark every unread inbox message as read."""
    creds, integration = await _get_credentials(current_user.id, db)
    await _maybe_refresh(creds, integration, db)

    def _do_all(c):
        from googleapiclient.discovery import build as _build
        svc = _build("gmail", "v1", credentials=c)
        ids = []
        page_token = None
        while True:
            kwargs: dict = {"userId": "me", "labelIds": ["INBOX", "UNREAD"], "maxResults": 500}
            if page_token:
                kwargs["pageToken"] = page_token
            res = svc.users().messages().list(**kwargs).execute()  # type: ignore[attr-defined]
            msgs = res.get("messages", [])
            ids.extend(m["id"] for m in msgs)
            page_token = res.get("nextPageToken")
            if not page_token:
                break
        if ids:
            batch = svc.new_batch_http_request()  # type: ignore[attr-defined]
            for mid in ids:
                batch.add(
                    svc.users().messages().modify(  # type: ignore[attr-defined]
                        userId="me", id=mid, body={"removeLabelIds": ["UNREAD"]}
                    )
                )
            batch.execute()
        return len(ids)

    try:
        count = await run_in_threadpool(_do_all, creds)
    except Exception as exc:
        from google.auth.exceptions import RefreshError as _RefreshError
        if isinstance(exc, _RefreshError) or "invalid_grant" in str(exc):
            raise HTTPException(status_code=400, detail="Gmail token expired. Please reconnect.")
        raise
    return {"marked": count}


@router.post("/trash")
async def gmail_trash(
    body: MessageIdsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Move messages to Gmail Trash."""
    creds, integration = await _get_credentials(current_user.id, db)
    await _maybe_refresh(creds, integration, db)

    def _do_trash(c, ids):
        from googleapiclient.discovery import build as _build
        svc = _build("gmail", "v1", credentials=c)
        batch = svc.new_batch_http_request()  # type: ignore[attr-defined]
        for tid in ids:
            # Trash the whole thread so the conversation disappears from inbox
            batch.add(svc.users().threads().trash(userId="me", id=tid))  # type: ignore[attr-defined]
        batch.execute()

    try:
        await run_in_threadpool(lambda: _do_trash(creds, body.message_ids))
    except Exception as exc:
        from google.auth.exceptions import RefreshError as _RefreshError
        if isinstance(exc, _RefreshError) or "invalid_grant" in str(exc):
            raise HTTPException(status_code=400, detail="Gmail token expired. Please reconnect.")
        raise
    return {"trashed": len(body.message_ids)}


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

    try:
        result = await run_in_threadpool(lambda: _send(creds, send_body))
    except Exception as exc:
        from google.auth.exceptions import RefreshError as _RefreshError
        if isinstance(exc, _RefreshError) or "invalid_grant" in str(exc):
            raise HTTPException(
                status_code=400,
                detail="Gmail token has expired or been revoked. Please reconnect your Gmail account under Integrations.",
            )
        raise
    return {"message_id": result.get("id"), "thread_id": result.get("threadId")}


@router.post("/sync-applications")
async def sync_email_applications(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    days: int = Query(default=30, ge=1, le=90, description="How many days back to search for CV emails"),
):
    """
    Scan Gmail inbox for emails that look like job applications — either a CV
    attached (PDF/DOC/DOCX) or a body that explicitly states application intent —
    and automatically create candidate applications, the same way LinkedIn/Indeed
    applications work. Each Gmail message is tracked by ID once imported, so it is
    never re-evaluated (and never re-imported as a "new" duplicate) on a later sync,
    even if job-matching would now pick a different job for it.
    """
    from datetime import datetime, timezone

    from sqlalchemy import or_
    from src.api.models.job import Posts, JobStatus
    from src.api.models.application import Application as AppModel
    from src.api.models.user import UserRole as _UserRole
    from src.api.models.candidate import CandidateProfile
    from src.api.schemas.user import UserCreate
    from src.api.schemas.candidate import CandidateProfileCreate
    from src.api.services.auth_service import AuthService
    from src.api.services.application_service import ApplicationService
    from src.api.services.candidate_service import CandidateService
    from src.api.services.screening_service import ScreeningService
    from src.api.db.session import AsyncSessionLocal
    from src.api.utils.cloudinary_upload import upload_file

    creds, integration = await _get_credentials(current_user.id, db)
    await _maybe_refresh(creds, integration, db)

    # ── 1. Fetch active (non-expired) PUBLISHED jobs for matching ──────────────
    jobs_result = await db.execute(
        select(Posts).where(
            Posts.deleted_at.is_(None),
            Posts.status == JobStatus.PUBLISHED,
            or_(Posts.expires_at.is_(None), Posts.expires_at > datetime.now(timezone.utc)),
        ).order_by(Posts.created_at.desc())
    )
    active_jobs = jobs_result.scalars().all()
    if not active_jobs:
        return {"created": 0, "skipped": 0, "total_emails": 0,
                "message": "No active jobs found. Publish at least one job first.", "details": []}

    # Never treat our own outbound system addresses as a candidate. HR's Gmail
    # inbox naturally contains copies of the app's own notification emails (e.g.
    # "New Application: X for AI Developer" sent FROM RESEND_FROM_EMAIL) — those
    # look like a job application by subject/body alone, but they're mail we sent
    # to ourselves, not a candidate applying.
    own_addresses: frozenset[str] = frozenset(
        addr.strip().lower() for addr in (
            settings.RESEND_FROM_EMAIL, settings.HR_EMAIL, settings.OPERATIONS_MANAGER_EMAIL,
            settings.LEAD_AI_EMAIL, settings.LEAD_WEB_EMAIL, settings.LEAD_SEO_EMAIL,
            settings.LEAD_SHOPIFY_EMAIL, settings.LEAD_UIUX_EMAIL,
        ) if addr
    )

    # ── 2. Scan Gmail inbox for emails that look like job applications ──────────
    def _search_cv_emails(c, search_days: int) -> list[dict]:
        """Return emails that are genuine job applications: either a CV attached
        (PDF/DOC/DOCX — the strong signal), or, if no attachment, a body that
        explicitly states application intent (typo-tolerant "appl*"/"interested in
        the role" match) so job-alert digests and newsletters aren't swept in just
        for mentioning "job"/"role"/"opportunity" in the subject."""
        from googleapiclient.discovery import build as _build
        svc = _build("gmail", "v1", credentials=c)

        # Gmail server-side pre-filter by subject keywords (OR-joined). Use every
        # keyword, in a fixed order — slicing a frozenset (`list(...)[:8]`) silently
        # dropped a *different* arbitrary subset on every process restart, since
        # Python randomizes str hashing (and therefore set iteration order) per
        # process by default. That let genuine applications (e.g. a subject
        # containing only "role", when "role" happened to be one of the 7 dropped
        # keywords that run) vanish from the Gmail search before any other logic
        # even ran, with no visible error.
        kw_list = sorted(_JOB_SUBJECT_KWS)
        kw_query = " OR ".join(f"subject:{kw}" for kw in kw_list)
        query = f"in:inbox newer_than:{search_days}d ({kw_query})"
        found: list[dict] = []
        page_token = None

        while True:
            kwargs: dict = {"userId": "me", "q": query, "maxResults": 100}
            if page_token:
                kwargs["pageToken"] = page_token
            res = svc.users().messages().list(**kwargs).execute()  # type: ignore[attr-defined]
            stubs = res.get("messages", [])
            if not stubs:
                break

            # Collect results from this page; index matches batch request_id
            page_results: list[dict | None] = [None] * len(stubs)

            # Use a closure factory to capture idx & page_results per call
            def make_callback(out_list: list, job_kws: frozenset, skip_pats: tuple, cv_kws: frozenset, own_addrs: frozenset):
                def _cb(request_id: str, response: Any, exception: Any) -> None:
                    if exception or not response:
                        return
                    idx = int(request_id)
                    hdrs = {h["name"]: h["value"]
                            for h in response.get("payload", {}).get("headers", [])}
                    from_hdr = hdrs.get("From", "")

                    # Parse sender
                    m = re.search(r'"?([^"<]*)"?\s*<([^>]+)>', from_hdr)
                    if m:
                        sender_name = m.group(1).strip()
                        sender_email = m.group(2).strip().lower()
                    else:
                        sender_email = from_hdr.strip().lower()
                        sender_name = sender_email.split("@")[0].replace(".", " ").title()

                    if not sender_email or "@" not in sender_email:
                        return
                    if any(pat in sender_email for pat in skip_pats):
                        return  # automated / system sender
                    if sender_email in own_addrs:
                        return  # our own outbound notification address, not a candidate

                    # Local subject double-check
                    subject_lower = hdrs.get("Subject", "").lower()
                    if not any(kw in subject_lower for kw in job_kws):
                        return

                    # Find first suitable CV attachment iteratively (avoids deep recursion)
                    cv_att: dict | None = None
                    stack = list(response.get("payload", {}).get("parts", []))
                    while stack and cv_att is None:
                        part = stack.pop()
                        fname = part.get("filename", "")
                        if fname:
                            ext = fname.rsplit(".", 1)[-1].lower() if "." in fname else ""
                            if ext in ("pdf", "doc", "docx"):
                                att_id = part.get("body", {}).get("attachmentId")
                                if att_id:
                                    fname_lower = fname.lower()
                                    has_kw = any(kw in fname_lower for kw in cv_kws)
                                    if cv_att is None or has_kw:
                                        cv_att = {
                                            "message_id": response["id"],
                                            "attachment_id": att_id,
                                            "filename": fname,
                                        }
                                        if has_kw:
                                            break  # strong match — done
                        stack.extend(part.get("parts", []))

                    snippet = response.get("snippet", "")
                    if not cv_att:
                        # No resume attached — only accept if the body itself carries
                        # explicit application intent. The subject already passed the
                        # generic job-keyword gate above, which alone is too loose
                        # (job-alert digests/newsletters say "job"/"role" too, but never
                        # "I'm applying"/"interested in this role").
                        snippet_lower = snippet.lower()
                        if not _APPLY_INTENT_RE.search(snippet_lower):
                            return

                    out_list[idx] = {
                        "message_id": response["id"],
                        "sender_name": sender_name,
                        "sender_email": sender_email,
                        "subject": hdrs.get("Subject", ""),
                        "snippet": snippet,
                        "attachment": cv_att,
                    }
                return _cb

            callback = make_callback(page_results, _JOB_SUBJECT_KWS, _SKIP_SENDER_PATTERNS, _CV_FILENAME_KWS, own_addresses)

            batch = svc.new_batch_http_request(callback=callback)  # type: ignore[attr-defined]
            for j, stub in enumerate(stubs):
                batch.add(
                    svc.users().messages().get(  # type: ignore[attr-defined]
                        userId="me", id=stub["id"], format="full",
                    ),
                    request_id=str(j),
                )
            batch.execute()
            found.extend(p for p in page_results if p is not None)

            page_token = res.get("nextPageToken")
            if not page_token:
                break

        return found

    try:
        emails = await run_in_threadpool(lambda: _search_cv_emails(creds, days))
    except Exception as exc:
        from google.auth.exceptions import RefreshError as _RefreshError
        if isinstance(exc, _RefreshError) or "invalid_grant" in str(exc):
            raise HTTPException(status_code=400, detail="Gmail token expired. Please reconnect.")
        logger.exception("sync-applications: email search failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to scan Gmail inbox: {exc}")

    if not emails:
        return {"created": 0, "skipped": 0, "total_emails": 0,
                "message": "No job application emails found in the last %d days." % days,
                "details": []}

    # ── 3. Helper: job matching by subject / snippet keywords ─────────────────
    def _match_job(subject: str, snippet: str, jobs: list) -> Any:
        """Return the best-matching job, or the most recent job as fallback."""
        combined = (subject + " " + snippet).lower()
        best_job = None
        best_score = 0
        for job in jobs:
            words = [w for w in job.title.lower().split() if len(w) > 3]
            score = sum(1 for w in words if w in combined)
            if score > best_score:
                best_score = score
                best_job = job
        return best_job if best_job else jobs[0]  # fallback to newest job

    # ── 4. Download attachment from Gmail ──────────────────────────────────────
    def _download_attachment(c, message_id: str, attachment_id: str) -> bytes:
        from googleapiclient.discovery import build as _build
        import base64 as _b64
        svc = _build("gmail", "v1", credentials=c)
        att = svc.users().messages().attachments().get(  # type: ignore[attr-defined]
            userId="me", messageId=message_id, id=attachment_id
        ).execute()
        data = att.get("data", "")
        padding = (4 - len(data) % 4) % 4
        return _b64.urlsafe_b64decode(data + "=" * padding)

    # ── 5. Background screening task ──────────────────────────────────────────
    async def _run_screening(application_id: int) -> None:
        async with AsyncSessionLocal() as _sdb:
            await ScreeningService(_sdb).evaluate_and_invite(application_id)

    # ── 6. Process each email ─────────────────────────────────────────────────
    auth_svc = AuthService(db)
    app_svc = ApplicationService(db)
    cand_svc = CandidateService(db)

    created = 0
    skipped = 0
    details: list[dict] = []

    # Deduplicate by sender email within this batch
    seen_emails: set[str] = set()

    try:
        # Batch-fetch every existing user for this run's sender addresses in one query
        # instead of one SELECT per email inside the loop below.
        unique_sender_emails = list({e["sender_email"] for e in emails})
        existing_users_by_email = await auth_svc.get_users_by_emails(unique_sender_emails)

        # Batch-fetch which of these Gmail messages were already imported in a past
        # run. Job-matching is a keyword heuristic that falls back to "the newest
        # active job" — that fallback answer can change between runs (a new job gets
        # published, an old one expires), so the (candidate, job) dup check alone
        # isn't enough to stop the same old email from spawning a fresh duplicate
        # application under a different job. Message-ID dedup closes that gap.
        unique_message_ids = list({e["message_id"] for e in emails})
        already_imported_result = await db.execute(
            select(AppModel.gmail_message_id).where(AppModel.gmail_message_id.in_(unique_message_ids))
        )
        already_imported_message_ids = {row[0] for row in already_imported_result.all()}
    except Exception as exc:
        # Distinct from the per-email try/except below — a failure here means
        # nothing in this batch was ever attempted, so make that unambiguous
        # instead of surfacing a bare "Internal Server Error" with no context.
        logger.exception("sync-applications: pre-batch lookup failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to prepare import batch: {exc}")

    for email in emails:
        sender_email = email["sender_email"]
        sender_name = email["sender_name"] or sender_email.split("@")[0].title()
        message_id = email["message_id"]

        try:
            if message_id in already_imported_message_ids:
                skipped += 1
                details.append({"email": sender_email, "status": "skipped",
                                 "reason": "Already imported in a previous sync"})
                continue

            if sender_email in seen_emails:
                skipped += 1
                details.append({"email": sender_email, "status": "skipped",
                                 "reason": "Duplicate email in this batch"})
                continue
            seen_emails.add(sender_email)

            matched_job = _match_job(email["subject"], email["snippet"], list(active_jobs))

            # Skip if candidate already applied for this job
            existing_user = existing_users_by_email.get(sender_email)
            if existing_user:
                dup = await db.execute(
                    select(AppModel).where(
                        AppModel.candidate_id == existing_user.id,
                        AppModel.job_id == matched_job.id,
                    )
                )
                if dup.scalars().first():
                    skipped += 1
                    details.append({"email": sender_email, "status": "skipped",
                                     "reason": f"Already applied for '{matched_job.title}'"})
                    continue

            # Download CV and upload to Cloudinary (skipped for no-attachment applications)
            resume_url: str | None = None
            att = email["attachment"]
            if att:
                att_msg_id: str = att["message_id"]
                att_id: str = att["attachment_id"]
                att_filename: str = att["filename"]
                try:
                    cv_bytes = await run_in_threadpool(
                        _download_attachment, creds, att_msg_id, att_id
                    )
                    safe = sender_email.replace("@", "_at_").replace("+", "_")
                    resume_url = await upload_file(cv_bytes, att_filename,
                                                    folder=f"evalyn/resumes/{safe}")
                except Exception as exc:
                    logger.warning("CV upload failed for %s: %s", sender_email, exc)

            # Create candidate user if not exists
            if not existing_user:
                user_in = UserCreate(
                    email=sender_email,
                    password=secrets.token_urlsafe(16),
                    full_name=sender_name,
                    role=_UserRole.CANDIDATE,
                )
                candidate = await auth_svc.create_user(user_in)
            else:
                candidate = existing_user

            cand_id: int = int(candidate.id)  # type: ignore[arg-type]

            # Create / update candidate profile with CV
            profile = await cand_svc.get_profile_by_user_id(cand_id)
            if not profile:
                await cand_svc.create_profile(cand_id, CandidateProfileCreate(resume_url=resume_url))
            elif resume_url:
                profile.resume_url = resume_url  # type: ignore[assignment]
                db.add(profile)
                await db.commit()

            # Create application
            snippet_text: str = email["snippet"][:500] if email["snippet"] else ""
            application = await app_svc.create_application(
                cand_id,
                int(matched_job.id),  # type: ignore[arg-type]
                cover_letter=snippet_text if snippet_text else None,  # type: ignore[arg-type]
                source="email",
                background_tasks=background_tasks,
            )

            # Tag with the Gmail message ID so this exact email is never re-imported
            # as a duplicate on a future sync. Only backfill if unset — create_application()
            # returns the existing row unchanged if the candidate already had an
            # application for this job through another path.
            if not application.gmail_message_id:
                application.gmail_message_id = message_id
                db.add(application)
                await db.commit()
                await db.refresh(application)

            background_tasks.add_task(_run_screening, int(application.id))  # type: ignore[arg-type]
            created += 1
            details.append({
                "email": sender_email,
                "name": sender_name,
                "status": "created",
                "job": matched_job.title,
                "application_id": int(application.id),  # type: ignore[arg-type]
                "cv": resume_url or ("no attachment" if not att else "upload failed"),
            })

        except Exception as exc:
            # A failed commit (e.g. a race with another sync hitting the unique
            # gmail_message_id constraint) leaves the async session in a failed
            # transaction state — any further query on it raises immediately
            # until rolled back, which would otherwise cascade into every
            # remaining email in this batch failing too.
            await db.rollback()
            logger.exception("sync-applications: failed processing %s: %s", sender_email, exc)
            skipped += 1
            details.append({"email": sender_email, "status": "skipped",
                             "reason": f"Unexpected error: {exc}"})

    return {
        "created": created,
        "skipped": skipped,
        "total_emails": len(emails),
        "message": f"Scanned {len(emails)} job application emails — {created} new applications created, {skipped} skipped.",
        "details": details,
    }
