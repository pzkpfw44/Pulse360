"""
API schemas for documents.
"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

class TagBase(BaseModel):
    """Base schema for tags."""
    name: str = Field(..., min_length=1, max_length=50)

class DocumentBase(BaseModel):
    """Base schema for documents."""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    tags: List[str] = Field(default_factory=list)

class DocumentCreate(DocumentBase):
    """Schema for document creation."""
    pass

class DocumentUpdate(BaseModel):
    """Schema for document update."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    tags: Optional[List[str]] = None

class DocumentInDB(DocumentBase):
    """Schema for document in database."""
    id: int
    file_path: str
    mime_type: str
    uploader_id: int
    processed_status: str
    flux_file_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic config."""
        from_attributes = True

class Document(DocumentInDB):
    """Schema for document response."""
    pass

class DocumentList(BaseModel):
    """Schema for list of documents."""
    items: List[Document]
    total: int