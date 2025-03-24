from typing import Optional, List, Dict, Any
from pydantic import BaseModel, UUID4, HttpUrl, validator, Field
from datetime import datetime


class TagBase(BaseModel):
    """Base schema for document tags"""
    name: str


class TagCreate(TagBase):
    """Schema for creating a tag"""
    pass


class Tag(TagBase):
    """Schema for a tag response"""
    id: UUID4
    
    class Config:
        from_attributes = True


# Shared properties
class DocumentBase(BaseModel):
    """Base document schema with shared properties"""
    title: str
    description: Optional[str] = None
    tags: Optional[List[str]] = None


# Properties to receive via API on creation
class DocumentCreate(DocumentBase):
    """Schema for document creation"""
    pass


# Properties to receive via API on update
class DocumentUpdate(BaseModel):
    """Schema for document update"""
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    processed_status: Optional[str] = None


# Properties shared by models stored in DB
class DocumentInDBBase(DocumentBase):
    """Base document DB schema"""
    id: UUID4
    file_path: str
    flux_file_id: Optional[str] = None
    mime_type: str
    uploader_id: UUID4
    processed_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Properties to return via API
class Document(DocumentInDBBase):
    """Document response schema"""
    pass


# Properties stored in DB
class DocumentInDB(DocumentInDBBase):
    """Document in DB schema with additional data"""
    pass


# Schema for file upload
class DocumentUpload(BaseModel):
    """Schema for document upload"""
    tags: Optional[List[str]] = None
    title: Optional[str] = None
    description: Optional[str] = None


# Schema for batch document upload response
class DocumentUploadResponse(BaseModel):
    """Schema for document upload response"""
    success: bool
    document_ids: List[UUID4]
    failed_uploads: Optional[List[str]] = None
    message: Optional[str] = None


# Schema for document search
class DocumentSearch(BaseModel):
    """Schema for document search"""
    query: Optional[str] = None
    tags: Optional[List[str]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    uploader_id: Optional[UUID4] = None
    limit: Optional[int] = 50
    offset: Optional[int] = 0


# Schema for Flux AI document reference
class FluxAIDocument(BaseModel):
    """Schema for Flux AI document reference"""
    id: str
    filename: str
    bytes: int
    created_at: int
    tags: Optional[List[str]] = None
    total_words: Optional[int] = None
    
    class Config:
        from_attributes = True