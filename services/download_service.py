"""
Download Service
Handles file storage, naming, and cleanup for generated presentations.
"""

import hashlib
import logging
import os
import re
import time
import uuid
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile
from werkzeug.utils import secure_filename

logger = logging.getLogger(__name__)


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        logger.warning('[download_service] Invalid integer for %s; using %s.', name, default)
        return default

PROJECT_ROOT = Path(__file__).resolve().parents[1]
_configured_download_folder = os.getenv('PRESENTATION_REWRITER_DOWNLOAD_DIR', '').strip()
DOWNLOAD_FOLDER = os.path.abspath(
    _configured_download_folder
    or str(PROJECT_ROOT / 'instance' / 'presentation_rewriter')
)
MAX_UPLOAD_BYTES = max(1, _env_int('PRESENTATION_REWRITER_MAX_UPLOAD_BYTES', 50 * 1024 * 1024))
MAX_AGE_SECONDS = max(1, _env_int('PRESENTATION_REWRITER_OUTPUT_MAX_AGE_SECONDS', 24 * 60 * 60))
OUTPUT_FILENAME_PATTERN = re.compile(r'^improved-[a-f0-9]{12}-[A-Za-z0-9_.-]+\.pptx$')


def ensure_download_folder() -> str:
    """Create the output folder if it doesn't exist and return its absolute path."""
    abs_folder = os.path.abspath(DOWNLOAD_FOLDER)
    os.makedirs(abs_folder, exist_ok=True)
    return abs_folder


def generate_output_filename(original_filename: str) -> str:
    """
    Generate a collision-free output filename.
    Pattern: improved-<12-char-uuid>-<safe_original>.pptx
    """
    base = os.path.splitext(original_filename)[0]
    safe_base = secure_filename(base) or 'presentation'
    uid = uuid.uuid4().hex[:12]
    return f"improved-{uid}-{safe_base}.pptx"


def get_download_path(filename: str) -> str:
    """
    Return the absolute path for a download file.
    Raises FileNotFoundError if the file does not exist.
    """
    folder = Path(ensure_download_folder()).resolve()
    if not filename or filename != os.path.basename(filename):
        raise FileNotFoundError('Invalid download filename.')
    if not OUTPUT_FILENAME_PATTERN.fullmatch(filename):
        raise FileNotFoundError('Invalid download filename.')

    candidate = (folder / filename).resolve()
    # Path.is_relative_to avoids the classic /output and /output-evil prefix bug.
    if candidate.parent != folder or not candidate.is_file():
        raise FileNotFoundError(f"Requested file not found: {filename}")
    return str(candidate)


def cleanup_old_files(max_age_seconds: int = MAX_AGE_SECONDS) -> int:
    """
    Delete generated files older than max_age_seconds.
    Returns the number of files deleted.
    """
    folder = ensure_download_folder()
    now = time.time()
    deleted = 0
    try:
        for fname in os.listdir(folder):
            if not OUTPUT_FILENAME_PATTERN.fullmatch(fname):
                continue
            fpath = os.path.join(folder, fname)
            if os.path.isfile(fpath):
                age = now - os.path.getmtime(fpath)
                if age > max_age_seconds:
                    os.remove(fpath)
                    deleted += 1
                    logger.info(f"[download_service] Cleaned up old file: {fname}")
    except Exception as exc:
        logger.warning(f"[download_service] Cleanup error: {exc}")
    return deleted


def validate_upload_size(file_bytes: int) -> None:
    """Raise ValueError if upload exceeds the allowed size."""
    if file_bytes is None or file_bytes < 0:
        raise ValueError('Unable to determine the uploaded file size.')
    if file_bytes > MAX_UPLOAD_BYTES:
        mb = MAX_UPLOAD_BYTES // (1024 * 1024)
        raise ValueError(f"File too large. Maximum allowed size is {mb} MB.")
