"""
API routes for documents.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException, Query
from sqlalchemy.orm import Session

from shared.db import get_db
from shared.auth import get_current_user
from app.schemas import Document, DocumentUpdate, DocumentList
from app.services import (
    create_document, 
    get_document, 
    update_document, 
    delete_document, 
    list_documents, 
    get_all_tags
)

router = APIRouter()

@router.post("/documents", response_model=Document)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(None),
    description: Optional[str] = Form(None),
    tags: List[str] = Form([]),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a new document."""
    return await create_document(
        db=db,
        file=file,
        title=title or file.filename,
        description=description,
        tags=tags,
        uploader_id=current_user.id
    )

@router.get("/documents", response_model=DocumentList)
async def get_documents(
    skip: int = 0,
    limit: int = 100,
    tags: Optional[List[str]] = Query(None),
    search: Optional[str] = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of documents with filtering options."""
    return await list_documents(
        db=db,
        skip=skip,
        limit=limit,
        tags=tags,
        search=search
    )

@router.get("/documents/{document_id}", response_model=Document)
async def get_single_document(
    document_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific document by ID."""
    return await get_document(db=db, document_id=document_id)

@router.put("/documents/{document_id}", response_model=Document)
async def update_single_document(
    document_id: int,
    document_update: DocumentUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a document."""
    return await update_document(
        db=db,
        document_id=document_id,
        document_update=document_update
    )

@router.delete("/documents/{document_id}")
async def delete_single_document(
    document_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a document."""
    await delete_document(db=db, document_id=document_id)
    return {"status": "success", "message": "Document deleted"}

@router.get("/tags")
async def list_all_tags(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all unique tags used across documents."""
    tags = await get_all_tags(db=db)
    return {"tags": tags}