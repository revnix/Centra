"""
Unit tests for GoogleDriveService.

All external Google API calls are mocked so these tests run with no
credentials and no network access.
"""
import pytest
from unittest.mock import MagicMock, patch


# ---------------------------------------------------------------------------
# Helper factory
# ---------------------------------------------------------------------------

def _mock_settings_oauth():
    """Return a minimal mock for settings using OAuth credentials."""
    s = MagicMock()
    s.GOOGLE_DRIVE_OAUTH_CLIENT_ID = "oauth-client-id"
    s.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET = "oauth-client-secret"
    s.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN = "oauth-refresh-token"
    s.GOOGLE_DRIVE_SERVICE_ACCOUNT_INFO = ""
    s.GOOGLE_DRIVE_FOLDER_ID = "folder-id-123"
    s.GOOGLE_DRIVE_PUBLIC_SHARE = True
    return s


def _mock_settings_service_account(*, public_share: bool = True):
    """Return a minimal mock for settings using service account credentials."""
    s = MagicMock()
    s.GOOGLE_DRIVE_OAUTH_CLIENT_ID = ""
    s.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET = ""
    s.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN = ""
    s.GOOGLE_DRIVE_SERVICE_ACCOUNT_INFO = '{"type": "service_account", "project_id": "test"}'
    s.GOOGLE_DRIVE_FOLDER_ID = "folder-id-123"
    s.GOOGLE_DRIVE_PUBLIC_SHARE = public_share
    return s


# Keep old name as alias so any other tests using it still work
def _mock_settings(*, public_share: bool = True):
    return _mock_settings_service_account(public_share=public_share)


def _mock_drive_service(file_id: str = "file-abc"):
    """Return a fully mocked Google Drive v3 service object."""
    svc = MagicMock()
    svc.files.return_value.create.return_value.execute.return_value = {
        "id": file_id,
        "webViewLink": f"https://drive.google.com/file/d/{file_id}/view",
        "webContentLink": f"https://drive.google.com/uc?id={file_id}",
        "name": "test_resume.pdf",
    }
    svc.permissions.return_value.create.return_value.execute.return_value = {}
    return svc


# ---------------------------------------------------------------------------
# Validation tests  (no Drive API needed)
# ---------------------------------------------------------------------------

class TestGoogleDriveServiceValidation:
    """File-type and size validation (static method, no credentials needed)."""

    def test_rejects_disallowed_extension(self):
        from src.api.services.google_drive_service import GoogleDriveService
        with pytest.raises(ValueError, match="not allowed"):
            GoogleDriveService.validate_file("resume.txt", b"content")

    def test_rejects_image_extension(self):
        from src.api.services.google_drive_service import GoogleDriveService
        with pytest.raises(ValueError, match="not allowed"):
            GoogleDriveService.validate_file("photo.png", b"data")

    def test_accepts_pdf(self):
        from src.api.services.google_drive_service import GoogleDriveService
        GoogleDriveService.validate_file("cv.pdf", b"PDF bytes")

    def test_accepts_docx(self):
        from src.api.services.google_drive_service import GoogleDriveService
        GoogleDriveService.validate_file("document.docx", b"DOCX bytes")

    def test_rejects_oversized_file(self):
        from src.api.services.google_drive_service import GoogleDriveService
        giant = b"x" * (10 * 1024 * 1024 + 1)
        with pytest.raises(ValueError, match="too large"):
            GoogleDriveService.validate_file("resume.pdf", giant)


# ---------------------------------------------------------------------------
# Upload and sharing tests  (patch _get_service + settings)
# ---------------------------------------------------------------------------

class TestGoogleDriveServiceUpload:
    """Upload flow, metadata returned, and sharing behavior."""

    def _make_instance_oauth(self, mock_svc, public_share: bool = True):
        """Build a GoogleDriveService with mocked OAuth settings and pre-injected Drive service."""
        ms = _mock_settings_oauth()
        ms.GOOGLE_DRIVE_PUBLIC_SHARE = public_share
        with patch("src.api.services.google_drive_service.settings", ms):
            from src.api.services.google_drive_service import GoogleDriveService
            drv = GoogleDriveService()
        drv._service = mock_svc
        drv.public_share = public_share
        return drv

    def _make_instance(self, mock_svc, public_share: bool = True):
        """Build a GoogleDriveService with mocked service-account settings."""
        with patch("src.api.services.google_drive_service.settings", _mock_settings(public_share=public_share)):
            from src.api.services.google_drive_service import GoogleDriveService
            drv = GoogleDriveService()
        drv._service = mock_svc
        drv.public_share = public_share
        return drv

    def test_upload_returns_rich_metadata_oauth(self):
        """upload_file() via OAuth must return all four metadata fields."""
        svc = _mock_drive_service("file-abc")
        drv = self._make_instance_oauth(svc)
        result = drv.upload_file(b"PDF bytes", "resume.pdf")
        assert result.file_id == "file-abc"
        assert result.web_view_link.startswith("https://drive.google.com")
        assert result.web_content_link
        assert result.file_name

    def test_upload_returns_rich_metadata(self):
        """upload_file() via service account must return all four metadata fields."""
        svc = _mock_drive_service("file-abc")
        with patch("src.api.services.google_drive_service.settings", _mock_settings()):
            from src.api.services.google_drive_service import GoogleDriveService
            drv = GoogleDriveService()
        drv._service = svc
        result = drv.upload_file(b"PDF bytes", "resume.pdf")
        assert result.file_id == "file-abc"
        assert result.web_view_link.startswith("https://drive.google.com")
        assert result.web_content_link
        assert result.file_name

    def test_upload_returns_metadata_dict(self):
        """to_dict() should serialize all four keys."""
        svc = _mock_drive_service("xyz123")
        drv = self._make_instance_oauth(svc)
        result = drv.upload_file(b"data", "cv.pdf")
        d = result.to_dict()
        assert set(d.keys()) == {"file_id", "web_view_link", "web_content_link", "file_name"}

    def test_public_share_called_when_enabled(self):
        """share_file_publicly must be called when GOOGLE_DRIVE_PUBLIC_SHARE=True."""
        svc = _mock_drive_service()
        drv = self._make_instance_oauth(svc, public_share=True)
        drv.upload_file(b"data", "cv.pdf")
        svc.permissions.return_value.create.assert_called_once()

    def test_public_share_skipped_when_disabled(self):
        """share_file_publicly must NOT be called when GOOGLE_DRIVE_PUBLIC_SHARE=False."""
        svc = _mock_drive_service()
        drv = self._make_instance_oauth(svc, public_share=False)
        drv.upload_file(b"data", "cv.pdf")
        svc.permissions.return_value.create.assert_not_called()

    def test_unique_filename_prevents_collision(self):
        """_unique_filename must return a different value every time."""
        from src.api.services.google_drive_service import GoogleDriveService
        names = {GoogleDriveService._unique_filename("cv.pdf") for _ in range(50)}
        assert len(names) == 50, "UUIDs should be unique"

    def test_upload_exception_propagates(self):
        """Drive API errors should propagate so the caller can fall back to Cloudinary."""
        svc = MagicMock()
        svc.files.return_value.create.return_value.execute.side_effect = RuntimeError("API error")
        drv = self._make_instance_oauth(svc)
        with pytest.raises(RuntimeError, match="API error"):
            drv.upload_file(b"bytes", "cv.pdf")


# ---------------------------------------------------------------------------
# Missing configuration tests
# ---------------------------------------------------------------------------

class TestMissingConfiguration:
    """Service should raise ValueError at init when required env vars are missing."""

    def test_missing_all_auth_raises(self):
        """Raises if neither OAuth nor service account is configured."""
        ms = _mock_settings_oauth()
        ms.GOOGLE_DRIVE_OAUTH_CLIENT_ID = ""
        ms.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET = ""
        ms.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN = ""
        ms.GOOGLE_DRIVE_SERVICE_ACCOUNT_INFO = ""
        with patch("src.api.services.google_drive_service.settings", ms):
            from src.api.services.google_drive_service import GoogleDriveService
            with pytest.raises(ValueError, match="auth not configured"):
                GoogleDriveService()

    def test_missing_service_account_info_raises(self):
        """Raises if only service account path is attempted but info is empty."""
        ms = _mock_settings()
        ms.GOOGLE_DRIVE_SERVICE_ACCOUNT_INFO = ""
        with patch("src.api.services.google_drive_service.settings", ms):
            from src.api.services.google_drive_service import GoogleDriveService
            with pytest.raises(ValueError, match="auth not configured"):
                GoogleDriveService()

    def test_missing_folder_id_raises(self):
        ms = _mock_settings()
        ms.GOOGLE_DRIVE_FOLDER_ID = ""
        with patch("src.api.services.google_drive_service.settings", ms):
            from src.api.services.google_drive_service import GoogleDriveService
            with pytest.raises(ValueError, match="GOOGLE_DRIVE_FOLDER_ID"):
                GoogleDriveService()

    def test_missing_folder_id_raises_oauth(self):
        ms = _mock_settings_oauth()
        ms.GOOGLE_DRIVE_FOLDER_ID = ""
        with patch("src.api.services.google_drive_service.settings", ms):
            from src.api.services.google_drive_service import GoogleDriveService
            with pytest.raises(ValueError, match="GOOGLE_DRIVE_FOLDER_ID"):
                GoogleDriveService()

    def test_oauth_preferred_over_service_account(self):
        """When both are set, OAuth should be used (_use_oauth=True)."""
        ms = _mock_settings_oauth()
        ms.GOOGLE_DRIVE_SERVICE_ACCOUNT_INFO = '{"type": "service_account"}'
        with patch("src.api.services.google_drive_service.settings", ms):
            from src.api.services.google_drive_service import GoogleDriveService
            drv = GoogleDriveService()
        assert drv._use_oauth is True
