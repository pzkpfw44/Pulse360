import logging
import os
import shutil
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any, BinaryIO

from fastapi import UploadFile, HTTPException, status
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.flux_ai import flux_ai_client, flux_ai_cache
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentSearch
from app.utils.file_utils import get_mime_type, create_unique_filename

logger = logging.getLogger(__name__)


async def create_document(
    db: AsyncSession,
    file: UploadFile,
    obj_in: DocumentCreate,
    uploader_id: uuid.UUID
) -> Document:
    """
    Create a new document
    
    Args:
        db: Database session
        file: Uploaded file
        obj_in: Document data
        uploader_id: ID of the user who uploaded the document
        
    Returns:
        Created document
    """
    # Create uploads directory if it doesn't exist
    os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)
    
    # Get file mime type
    mime_type = get_mime_type(file.filename)
    
    # Create a unique filename
    filename = create_unique_filename(file.filename)
    file_path = os.path.join(settings.UPLOAD_FOLDER, filename)
    
    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Upload to Flux AI
    flux_file_id = None
    try:
        # Reset file pointer and upload to Flux AI
        file.file.seek(0)
        response = await flux_ai_client.upload_file(
            file=file.file,
            filename=filename,
            tags=obj_in.tags
        )
        
        # Get the Flux AI file ID
        if response and response.get("success", False) and response.get("data"):
            flux_file_id = response["data"][0]["id"]
    except Exception as e:
        logger.error(f"Error uploading to Flux AI: {str(e)}")
        # Continue without Flux AI ID, we'll process it later
    
    # Create document record
    db_obj = Document(
        title=obj_in.title,
        description=obj_in.description,
        file_path=file_path,
        flux_file_id=flux_file_id,
        mime_type=mime_type,
        tags=obj_in.tags,
        uploader_id=uploader_id,
        processed_status="processed" if flux_file_id else "pending"
    )
    
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    
    # If no Flux AI ID, schedule background processing
    if not flux_file_id:
        # In a real implementation, we would add a task to a queue
        # For now, we'll just log it
        logger.info(f"Document {db_obj.id} needs background processing")
    
    return db_obj


async def batch_upload_documents(
    db: AsyncSession,
    files: List[UploadFile],
    obj_in: List[DocumentCreate],
    uploader_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Upload multiple documents at once
    
    Args:
        db: Database session
        files: List of uploaded files
        obj_in: List of document data
        uploader_id: ID of the user who uploaded the documents
        
    Returns:
        Result of the batch upload
    """
    document_ids = []
    failed_uploads = []
    
    for i, file in enumerate(files):
        try:
            # Use the corresponding document data or default
            doc_data = obj_in[i] if i < len(obj_in) else DocumentCreate(
                title=file.filename,
                description=None,
                tags=None
            )
            
            document = await create_document(db, file, doc_data, uploader_id)
            document_ids.append(document.id)
        except Exception as e:
            logger.error(f"Error uploading file {file.filename}: {str(e)}")
            failed_uploads.append(file.filename)
    
    return {
        "success": len(document_ids) > 0,
        "document_ids": document_ids,
        "failed_uploads": failed_uploads,
        "message": (
            "All documents uploaded successfully"
            if not failed_uploads
            else f"{len(document_ids)} documents uploaded, {len(failed_uploads)} failed"
        )
    }


async def get_document(db: AsyncSession, document_id: uuid.UUID) -> Optional[Document]:
    """
    Get a document by ID
    
    Args:
        db: Database session
        document_id: ID of the document
        
    Returns:
        Document if found, None otherwise
    """
    query = select(Document).where(Document.id == document_id)
    result = await db.execute(query)
    return result.scalars().first()


async def update_document(
    db: AsyncSession,
    db_obj: Document,
    obj_in: DocumentUpdate
) -> Document:
    """
    Update a document
    
    Args:
        db: Database session
        db_obj: Existing document
        obj_in: New document data
        
    Returns:
        Updated document
    """
    update_data = obj_in.dict(exclude_unset=True)
    
    # Update document attributes
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    
    await db.commit()
    await db.refresh(db_obj)
    
    # If Flux AI ID exists, we need to update the tags there as well
    if db_obj.flux_file_id and "tags" in update_data:
        try:
            # In a real implementation, we would update the tags in Flux AI
            # For now, we'll just log it
            logger.info(f"Need to update tags for Flux AI file {db_obj.flux_file_id}")
        except Exception as e:
            logger.error(f"Error updating Flux AI tags: {str(e)}")
    
    return db_obj


async def delete_document(db: AsyncSession, db_obj: Document) -> bool:
    """
    Delete a document
    
    Args:
        db: Database session
        db_obj: Document to delete
        
    Returns:
        True if deleted, False otherwise
    """
    # Delete from Flux AI first
    if db_obj.flux_file_id:
        try:
            await flux_ai_client.delete_file(db_obj.flux_file_id)
        except Exception as e:
            logger.error(f"Error deleting from Flux AI: {str(e)}")
            # Continue with local deletion
    
    # Delete local file
    try:
        if os.path.exists(db_obj.file_path):
            os.remove(db_obj.file_path)
    except Exception as e:
        logger.error(f"Error deleting local file: {str(e)}")
    
    # Delete from database
    await db.delete(db_obj)
    await db.commit()
    
    return True


async def search_documents(
    db: AsyncSession,
    search: DocumentSearch,
    user_id: Optional[uuid.UUID] = None
) -> List[Document]:
    """
    Search for documents
    
    Args:
        db: Database session
        search: Search parameters
        user_id: Optional user ID to filter by uploader
        
    Returns:
        List of matching documents
    """
    query = select(Document)
    conditions = []
    
    # Filter by uploader if specified
    if search.uploader_id:
        conditions.append(Document.uploader_id == search.uploader_id)
    elif user_id:
        # If no uploader specified but user_id provided, use that
        conditions.append(Document.uploader_id == user_id)
    
    # Filter by query string
    if search.query:
        conditions.append(
            or_(
                Document.title.ilike(f"%{search.query}%"),
                Document.description.ilike(f"%{search.query}%")
            )
        )
    
    # Filter by tags (any tag match)
    if search.tags:
        # This is a bit complex with JSON fields - would need to be adapted based on DB
        for tag in search.tags:
            # This is a simplification - in a real implementation, we'd use a proper JSON query
            conditions.append(
                func.json_array_contains(Document.tags, tag)
            )
    
    # Filter by date range
    if search.start_date:
        conditions.append(Document.created_at >= search.start_date)
    if search.end_date:
        conditions.append(Document.created_at <= search.end_date)
    
    # Apply conditions
    if conditions:
        query = query.where(and_(*conditions))
    
    # Apply ordering - newest first
    query = query.order_by(desc(Document.created_at))
    
    # Apply pagination
    if search.limit:
        query = query.limit(search.limit)
    if search.offset:
        query = query.offset(search.offset)
    
    # Execute query
    result = await db.execute(query)
    return result.scalars().all()


async def get_document_tags(db: AsyncSession) -> List[str]:
    """
    Get all unique document tags
    
    Args:
        db: Database session
        
    Returns:
        List of unique tags
    """
    # This is a simplification - in a real implementation, we'd use a proper JSON query
    query = select(Document.tags)
    result = await db.execute(query)
    all_tags = result.scalars().all()
    
    # Flatten the list of tags and remove duplicates
    unique_tags = set()
    for tags in all_tags:
        if tags:
            unique_tags.update(tags)
    
    return sorted(list(unique_tags))


async def process_pending_documents(db: AsyncSession) -> int:
    """
    Process documents that were not uploaded to Flux AI
    
    Args:
        db: Database session
        
    Returns:
        Number of documents processed
    """
    query = select(Document).where(Document.processed_status == "pending")
    result = await db.execute(query)
    pending_documents = result.scalars().all()
    
    processed_count = 0
    for document in pending_documents:
        try:
            # Open the file and upload to Flux AI
            with open(document.file_path, "rb") as file:
                filename = os.path.basename(document.file_path)
                response = await flux_ai_client.upload_file(
                    file=file,
                    filename=filename,
                    tags=document.tags
                )
                
                # Update the document with Flux AI ID
                if response and response.get("success", False) and response.get("data"):
                    document.flux_file_id = response["data"][0]["id"]
                    document.processed_status = "processed"
                    processed_count += 1
                else:
                    document.processed_status = "error"
        except Exception as e:
            logger.error(f"Error processing document {document.id}: {str(e)}")
            document.processed_status = "error"
    
    await db.commit()
    return processed_count