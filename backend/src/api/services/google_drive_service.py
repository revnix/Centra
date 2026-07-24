import io
import json
import logging
import uuid
from pathlib import Path
from typing import Optional

from src.api.core.config import settings

logger = logging.getLogger(__name__)

RESUME_ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}
RESUME_MIME_TYPES = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_RESUME_SIZE = 10 * 1024 * 1024  # 10 MB

GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token"


class ResumeUploadMetadata:
    """Structured result returned by GoogleDriveService.upload_file()."""

    def __init__(self, file_id: str, web_view_link: str, web_content_link: str, file_name: str):
        self.file_id = file_id
        self.web_view_link = web_view_link
        self.web_content_link = web_content_link
        self.file_name = file_name

    def to_dict(self) -> dict:
        return {
            "file_id": self.file_id,
            "web_view_link": self.web_view_link,
            "web_content_link": self.web_content_link,
            "file_name": self.file_name,
        }


class GoogleDriveService:
    """
    Service for uploading candidate resumes to Google Drive.

    Authentication priority:
    1. OAuth 2.0 (refresh token) — if GOOGLE_DRIVE_OAUTH_CLIENT_ID,
       GOOGLE_DRIVE_OAUTH_CLIENT_SECRET, and GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN are set.
       Files are uploaded to the authenticated user's own Drive (uses their quota).
    2. Service Account — fallback if GOOGLE_DRIVE_SERVICE_ACCOUNT_INFO is set.
       Requires a Shared Drive folder to avoid storageQuotaExceeded.
    """

    SCOPES = ["https://www.googleapis.com/auth/drive"]

    def __init__(self):
        self.folder_id: str = settings.GOOGLE_DRIVE_FOLDER_ID
        self.public_share: bool = settings.GOOGLE_DRIVE_PUBLIC_SHARE
        self._service = None

        has_oauth = bool(
            settings.GOOGLE_DRIVE_OAUTH_CLIENT_ID
            and settings.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET
            and settings.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN
        )
        has_service_account = bool(settings.GOOGLE_DRIVE_SERVICE_ACCOUNT_INFO)

        if not has_oauth and not has_service_account:
            raise ValueError(
                "Google Drive auth not configured. Set either "
                "GOOGLE_DRIVE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN (recommended) "
                "or GOOGLE_DRIVE_SERVICE_ACCOUNT_INFO."
            )
        if not self.folder_id:
            raise ValueError("GOOGLE_DRIVE_FOLDER_ID is not configured.")

        self._use_oauth = has_oauth

        # Store credentials info for service account fallback
        if not has_oauth:
            self._credentials_info: dict = json.loads(settings.GOOGLE_DRIVE_SERVICE_ACCOUNT_INFO)

    def _get_service(self):
        """Lazily build and cache the Drive API client."""
        if self._service is not None:
            return self._service

        from googleapiclient.discovery import build

        if self._use_oauth:
            from google.oauth2.credentials import Credentials
            from google.auth.transport.requests import Request

            creds = Credentials(
                token=None,
                refresh_token=settings.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN,
                client_id=settings.GOOGLE_DRIVE_OAUTH_CLIENT_ID,
                client_secret=settings.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET,
                token_uri=GOOGLE_TOKEN_URI,
                scopes=self.SCOPES,
            )
            # Force a token refresh so we have a valid access token immediately
            creds.refresh(Request())
            self._service = build("drive", "v3", credentials=creds, cache_discovery=False)
            logger.info("GoogleDriveService: authenticated via OAuth 2.0 (user credentials)")
        else:
            from google.oauth2 import service_account

            creds = service_account.Credentials.from_service_account_info(
                self._credentials_info, scopes=self.SCOPES
            )
            self._service = build("drive", "v3", credentials=creds, cache_discovery=False)
            logger.info("GoogleDriveService: authenticated via service account")

        return self._service

    @staticmethod
    def validate_file(filename: str, content: bytes) -> None:
        """
        Validate extension (allow only .pdf / .doc / .docx) and size (≤ 10 MB).

        Raises:
            ValueError: On a validation failure – caller should return HTTP 400.
        """
        ext = Path(filename).suffix.lower()
        if ext not in RESUME_ALLOWED_EXTENSIONS:
            raise ValueError(
                f"File type '{ext}' is not allowed. "
                f"Supported formats: {', '.join(sorted(RESUME_ALLOWED_EXTENSIONS))}"
            )
        if len(content) > MAX_RESUME_SIZE:
            raise ValueError(
                f"File is too large ({len(content) // (1024 * 1024)} MB). "
                f"Maximum allowed size is {MAX_RESUME_SIZE // (1024 * 1024)} MB."
            )

    @staticmethod
    def _unique_filename(original_filename: str) -> str:
        """Return a collision-free filename derived from a UUID and the original extension."""
        ext = Path(original_filename).suffix.lower()
        return f"{uuid.uuid4().hex}{ext}"

    def _share_file_publicly(self, file_id: str) -> None:
        """Grant 'reader' access to anyone with the link."""
        svc = self._get_service()
        permission = {"type": "anyone", "role": "reader"}
        kwargs = {"fileId": file_id, "body": permission}
        if not self._use_oauth:
            # Shared Drive (service account) requires this flag
            kwargs["supportsAllDrives"] = True
        svc.permissions().create(**kwargs).execute()  # type: ignore[attr-defined]

    def _get_or_create_subfolder(self, folder_name: str) -> str:
        """
        Find or create a subfolder inside the root Drive folder.

        Args:
            folder_name: Human-readable folder name, e.g. "Backend Engineer - 2026-07-09".

        Returns:
            The Google Drive folder ID of the (possibly newly created) subfolder.
        """
        svc = self._get_service()

        # Sanitize the folder name for the Drive query (escape single quotes)
        safe_name = folder_name.replace("'", "\\'")

        query = (
            f"mimeType='application/vnd.google-apps.folder' "
            f"and name='{safe_name}' "
            f"and '{self.folder_id}' in parents "
            f"and trashed=false"
        )

        list_kwargs: dict = {"q": query, "fields": "files(id, name)", "pageSize": 1}
        if not self._use_oauth:
            list_kwargs["supportsAllDrives"] = True
            list_kwargs["includeItemsFromAllDrives"] = True
            list_kwargs["corpora"] = "allDrives"

        results = svc.files().list(**list_kwargs).execute()  # type: ignore[attr-defined]
        files = results.get("files", [])

        if files:
            logger.info(
                "GoogleDriveService: reusing existing subfolder '%s' (id=%s)",
                folder_name,
                files[0]["id"],
            )
            return files[0]["id"]

        # Create the subfolder
        folder_metadata: dict = {
            "name": folder_name,
            "mimeType": "application/vnd.google-apps.folder",
            "parents": [self.folder_id],
        }

        create_kwargs: dict = {
            "body": folder_metadata,
            "fields": "id",
        }
        if not self._use_oauth:
            create_kwargs["supportsAllDrives"] = True

        folder = svc.files().create(**create_kwargs).execute()  # type: ignore[attr-defined]
        folder_id = folder["id"]
        logger.info(
            "GoogleDriveService: created new subfolder '%s' (id=%s)",
            folder_name,
            folder_id,
        )
        return folder_id

    def upload_file(
        self,
        content: bytes,
        original_filename: str,
        candidate_identifier: Optional[str] = None,
        job_folder_name: Optional[str] = None,
    ) -> ResumeUploadMetadata:
        """
        Upload *content* to Google Drive and return rich metadata.

        Args:
            content: Raw bytes of the resume file.
            original_filename: Original filename uploaded by the candidate (used to derive extension).
            candidate_identifier: Optional prefix (e.g. candidate e-mail / id) for file naming clarity.
            job_folder_name: Optional subfolder name (e.g. "Backend Engineer - 2026-07-09").
                             If provided, the file is uploaded into that subfolder under the root folder.

        Returns:
            :class:`ResumeUploadMetadata` with file_id, web_view_link, web_content_link, file_name.

        Raises:
            google.auth.exceptions.GoogleAuthError: On authentication failure.
            googleapiclient.errors.HttpError:       On Drive API failure.
            ValueError: On file validation failure.
        """
        from googleapiclient.http import MediaIoBaseUpload

        ext = Path(original_filename).suffix.lower()
        mime_type = RESUME_MIME_TYPES.get(ext, "application/octet-stream")

        if candidate_identifier:
            safe_prefix = candidate_identifier.strip()
            short_id = uuid.uuid4().hex[:6]
            unique_name = f"{safe_prefix} - {short_id}{ext}"
        else:
            unique_name = self._unique_filename(original_filename)

        # Determine the target parent folder (job-specific subfolder or root)
        target_folder_id = self.folder_id
        if job_folder_name:
            try:
                target_folder_id = self._get_or_create_subfolder(job_folder_name)
            except Exception as subfolder_exc:
                logger.warning(
                    "GoogleDriveService: failed to resolve subfolder '%s', "
                    "falling back to root folder: %s",
                    job_folder_name,
                    subfolder_exc,
                )

        file_metadata = {
            "name": unique_name,
            "parents": [target_folder_id],
        }

        media = MediaIoBaseUpload(io.BytesIO(content), mimetype=mime_type, resumable=False)
        svc = self._get_service()

        create_kwargs: dict = {
            "body": file_metadata,
            "media_body": media,
            "fields": "id,webViewLink,webContentLink,name",
        }
        if not self._use_oauth:
            # Required when uploading to a Shared Drive via service account
            create_kwargs["supportsAllDrives"] = True

        response = (
            svc.files()  # type: ignore[attr-defined]
            .create(**create_kwargs)
            .execute()
        )

        file_id: str = response["id"]
        web_view_link: str = response.get("webViewLink", "")
        web_content_link: str = response.get("webContentLink", "")
        file_name: str = response.get("name", unique_name)

        if self.public_share:
            try:
                self._share_file_publicly(file_id)
            except Exception as share_exc:
                logger.warning(
                    "GoogleDriveService: could not share file %s publicly: %s",
                    file_id,
                    share_exc,
                )

        logger.info(
            "GoogleDriveService: uploaded '%s' as '%s' (id=%s, shared=%s, auth=%s)",
            original_filename,
            file_name,
            file_id,
            self.public_share,
            "oauth" if self._use_oauth else "service_account",
        )

        return ResumeUploadMetadata(
            file_id=file_id,
            web_view_link=web_view_link,
            web_content_link=web_content_link,
            file_name=file_name,
        )
