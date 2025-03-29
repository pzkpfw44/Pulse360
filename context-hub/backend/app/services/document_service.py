"""
Document service for ContextHub.
"""
import os
from datetime import datetime
from typing import BinaryIO, List, Optional, Tuple
import uuid

from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from shared.ai import FluxAIClient
from shared.utils.storage import storage_client
from app.models.documents import Document
from app.schemas.documents import DocumentCreate, DocumentUpdate, DocumentList

async def create_document(
    db: Session,
    file: UploadFile,
    title: str,
    description: Optional[str] = None,
    tags: List[str] = None,
    uploader_id: int = None
) -> Document:
    """
    Create a new document.
    
    Args:
        db: Database session.
        file: Uploaded file.
        title: Document title.
        description: Document description.
        tags: Document tags.
        uploader_id: ID of the user who uploaded the document.
        
    Returns:
        Document: Created document.
    """
    # Generate a unique filename
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    bucket_name = "documents"
    
    # Upload file to storage
    contents = await file.read()
    file_url = storage_client.upload_file(
        bucket_name=bucket_name,
        object_name=unique_filename,
        file_data=contents,
        content_type=file.content_type
    )
    
    # Create document in database
    db_document = Document(
        title=title or file.filename,
        description=description,
        file_path=file_url,
        mime_type=file.content_type,
        tags=tags or [],
        uploader_id=uploader_id,
        processed_status="pending"
    )
    
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    
    # Process document with Flux AI in background
    # This would typically be handled by a background task
    # For simplicity, we'll just update the status here
    db_document.processed_status = "processed"
    db.commit()
    
    return db_document

async def get_document(db: Session, document_id: int) -> Document:
    """
    Get a document by ID.
    
    Args:
        db: Database session.
        document_id: Document ID.
        
    Returns:
        Document: Retrieved document.
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found"
        )
        
    return document

async def update_document(db: Session, document_id: int, document_update: DocumentUpdate) -> Document:
    """
    Update a document.
    
    Args:
        db: Database session.
        document_id: Document ID.
        document_update: Document update data.
        
    Returns:
        Document: Updated document.
    """
    document = await get_document(db, document_id)
    
    update_data = document_update.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(document, key, value)
        
    document.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(document)
    
    return document

async def delete_document(db: Session, document_id: int) -> None:
    """
    Delete a document.
    
    Args:
        db: Database session.
        document_id: Document ID.
    """
    document = await get_document(db, document_id)
    
    # Delete file from storage
    # This assumes the file_path is in the format "/storage/<bucket>/<object>"
    path_parts = document.file_path.split("/")
    if len(path_parts) >= 3:
        bucket_name = path_parts[2]
        object_name = "/".join(path_parts[3:])
        
        try:
            storage_client.delete_file(bucket_name, object_name)
        except Exception as e:
            # Log error but continue with database deletion
            print(f"Error deleting file: {e}")
    
    db.delete(document)
    db.commit()

async def list_documents(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    tags: Optional[List[str]] = None,
    search: Optional[str] = None
) -> DocumentList:
    """
    List documents with filtering.
    
    Args:
        db: Database session.
        skip: Number of documents to skip.
        limit: Maximum number of documents to return.
        tags: Filter by tags.
        search: Search in title and description.
        
    Returns:
        DocumentList: List of documents.
    """
    query = db.query(Document)
    
    # Apply filters
    if tags:
        for tag in tags:
            query = query.filter(Document.tags.contains([tag]))
    
    if search:
        query = query.filter(
            or_(
                Document.title.ilike(f"%{search}%"),
                Document.description.ilike(f"%{search}%")
            )
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    query = query.order_by(Document.created_at.desc())
    query = query.offset(skip).limit(limit)
    
    # Get results
    documents = query.all()
    
    return DocumentList(
        items=documents,
        total=total
    )

async def get_all_tags(db: Session) -> List[str]:
    """
    Get all unique tags used across documents.
    
    Args:
        db: Database session.
        
    Returns:
        List[str]: List of unique tags.
    """
    # This query is not efficient but works for demonstration
    # In a real app, you might want a separate tags table
    documents = db.query(Document).all()
    
    # Collect all tags
    all_tags = []
    for document in documents:
        all_tags.extend(document.tags or [])
    
    # Return unique tags
    return list(set(all_tags))