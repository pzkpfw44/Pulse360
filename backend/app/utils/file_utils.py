import os
import uuid
import mimetypes
from typing import Optional
from datetime import datetime


def get_mime_type(filename: str) -> str:
    """
    Get MIME type from filename
    
    Args:
        filename: Name of the file
        
    Returns:
        MIME type string
    """
    mime_type, _ = mimetypes.guess_type(filename)
    if not mime_type:
        # Default to octet-stream if type can't be determined
        return "application/octet-stream"
    return mime_type


def create_unique_filename(filename: str) -> str:
    """
    Create a unique filename to prevent collisions
    
    Args:
        filename: Original filename
        
    Returns:
        Unique filename
    """
    # Extract file extension
    _, ext = os.path.splitext(filename)
    
    # Generate unique name (timestamp + UUID)
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    
    # Sanitize original filename - keep only alphanumeric chars
    base_name = "".join(c for c in os.path.splitext(filename)[0] if c.isalnum() or c in ['-', '_']).lower()
    
    # Create a new filename: sanitized-base-name_timestamp_unique-id.ext
    return f"{base_name}_{timestamp}_{unique_id}{ext}"


def get_file_size(file_path: str) -> int:
    """
    Get file size in bytes
    
    Args:
        file_path: Path to the file
        
    Returns:
        File size in bytes
    """
    return os.path.getsize(file_path)


def is_file_too_large(file_size: int, max_size_mb: Optional[int] = None) -> bool:
    """
    Check if file size exceeds maximum
    
    Args:
        file_size: Size of the file in bytes
        max_size_mb: Maximum size in MB (defaults to config setting)
        
    Returns:
        True if file is too large, False otherwise
    """
    from app.core.config import settings
    
    max_size = max_size_mb or settings.MAX_UPLOAD_SIZE_MB
    max_bytes = max_size * 1024 * 1024
    
    return file_size > max_bytes


def is_allowed_file_type(filename: str, allowed_types: Optional[list] = None) -> bool:
    """
    Check if file type is allowed
    
    Args:
        filename: Name of the file
        allowed_types: List of allowed MIME types
        
    Returns:
        True if file type is allowed, False otherwise
    """
    # Default allowed types: documents, PDFs, text files, and common data formats
    default_allowed = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
        "text/csv",
        "application/json",
        "text/markdown",
        "application/rtf",
    ]
    
    allowed = allowed_types or default_allowed
    mime_type = get_mime_type(filename)
    
    return mime_type in allowed