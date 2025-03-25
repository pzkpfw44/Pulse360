import logging
import os
import uuid
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import ValidationError, parse_obj_as
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_hr_or_admin_user
from app.core.config import settings
from app.models.user import User
from app.schemas.document import (
    Document,
    DocumentCreate,
    DocumentUpdate,
    DocumentUploadResponse,
    DocumentSearch,
)
from app.services.document_service import (
    create_document,
    batch_upload_documents,
    get_document,
    update_document,
    delete_document,
    search_documents,
    get_document_tags,
    process_pending_documents,
)
from app.utils.file_utils import is_file_too_large, is_allowed_file_type

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/", response_model=Document)
async def upload_document(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Upload a new document
    """
    # Check file size
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if is_file_too_large(file_size):
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE_MB}MB"
        )
    
    # Check file type
    if not is_allowed_file_type(file.filename):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File type not allowed"
        )
    
    # Parse tags
    tag_list = None
    if tags:
        try:
            # If tags are comma-separated
            tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid tags format. Use comma-separated tags."
            )
    
    # Create document
    doc_in = DocumentCreate(
        title=title,
        description=description,
        tags=tag_list
    )
    
    try:
        document = await create_document(db, file, doc_in, current_user.id)
        
        # If document needs background processing
        if document.processed_status == "pending":
            background_tasks.add_task(process_pending_documents, db)
        
        return document
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload document"
        )


@router.post("/batch", response_model=DocumentUploadResponse)
async def upload_multiple_documents(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    documents: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Upload multiple documents in a single request
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided"
        )
    
    # Parse document metadata if provided
    doc_in_list = []
    if documents:
        try:
            parsed_docs = parse_obj_as(List[DocumentCreate], documents)
            doc_in_list = parsed_docs
        except ValidationError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid document metadata format"
            )
    
    # Check files
    for file in files:
        # Check file size
        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)
        
        if is_file_too_large(file_size):
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File {file.filename} is too large. Maximum size is {settings.MAX_UPLOAD_SIZE_MB}MB"
            )
        
        # Check file type
        if not is_allowed_file_type(file.filename):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"File type not allowed for {file.filename}"
            )
    
    # Upload documents
    try:
        result = await batch_upload_documents(db, files, doc_in_list, current_user.id)
        
        # Schedule background processing for any pending documents
        background_tasks.add_task(process_pending_documents, db)
        
        return result
    except Exception as e:
        logger.error(f"Error batch uploading documents: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload documents"
        )


@router.get("/", response_model=List[Document])
async def list_documents(
    query: Optional[str] = None,
    tags: Optional[List[str]] = Query(None),
    limit: Optional[int] = 50,
    offset: Optional[int] = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    List documents with optional filtering
    """
    search = DocumentSearch(
        query=query,
        tags=tags,
        limit=limit,
        offset=offset
    )
    
    try:
        documents = await search_documents(db, search)
        return documents
    except Exception as e:
        logger.error(f"Error listing documents: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve documents"
        )


@router.get("/tags", response_model=List[str])
async def list_tags(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    List all unique document tags
    """
    try:
        tags = await get_document_tags(db)
        return tags
    except Exception as e:
        logger.error(f"Error listing tags: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve tags"
        )


@router.get("/{document_id}", response_model=Document)
async def get_document_by_id(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Get a specific document by ID
    """
    try:
        document = await get_document(db, document_id)
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        return document
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve document"
        )


@router.get("/{document_id}/download")
async def download_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Download a document
    """
    try:
        document = await get_document(db, document_id)
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        if not os.path.exists(document.file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document file not found"
            )
        
        return FileResponse(
            document.file_path,
            media_type=document.mime_type,
            filename=os.path.basename(document.file_path)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to download document"
        )


@router.put("/{document_id}", response_model=Document)
async def update_document_by_id(
    document_id: uuid.UUID,
    document_in: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Update a document
    """
    try:
        document = await get_document(db, document_id)
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        updated_document = await update_document(db, document, document_in)
        return updated_document
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update document"
        )


@router.delete("/{document_id}", response_model=Dict[str, Any])
async def delete_document_by_id(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Delete a document
    """
    try:
        document = await get_document(db, document_id)
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        success = await delete_document(db, document)
        return {"success": success, "message": "Document deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document"
        )


@router.post("/process-pending", response_model=Dict[str, Any])
async def trigger_process_pending(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Trigger processing of pending documents
    """
    try:
        # Add task to background tasks
        background_tasks.add_task(process_pending_documents, db)
        return {"success": True, "message": "Processing started for pending documents"}
    except Exception as e:
        logger.error(f"Error triggering document processing: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger document processing"
        )