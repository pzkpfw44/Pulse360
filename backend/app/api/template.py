import logging
import uuid
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_hr_or_admin_user
from app.models.user import User
from app.schemas.template import (
    Template,
    TemplateCreate,
    TemplateUpdate,
    TemplateSearch,
)
from app.services.template_service import (
    create_template,
    get_template,
    update_template,
    delete_template,
    search_templates,
    get_default_template,
    clone_template,
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/", response_model=Template)
async def create_new_template(
    template_in: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Create a new feedback template
    """
    try:
        template = await create_template(db, template_in, current_user.id)
        return template
    except Exception as e:
        logger.error(f"Error creating template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create template"
        )


@router.get("/", response_model=List[Template])
async def list_templates(
    query: Optional[str] = None,
    is_default: Optional[bool] = None,
    limit: Optional[int] = 50,
    offset: Optional[int] = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    List templates with optional filtering
    """
    search = TemplateSearch(
        query=query,
        is_default=is_default,
        limit=limit,
        offset=offset
    )
    
    try:
        templates = await search_templates(db, search)
        return templates
    except Exception as e:
        logger.error(f"Error listing templates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve templates"
        )


@router.get("/default", response_model=Template)
async def get_default(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Get the default template
    """
    try:
        template = await get_default_template(db)
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No default template found"
            )
        return template
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving default template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve default template"
        )


@router.get("/{template_id}", response_model=Template)
async def get_template_by_id(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Get a specific template by ID
    """
    try:
        template = await get_template(db, template_id)
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        return template
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve template"
        )


@router.put("/{template_id}", response_model=Template)
async def update_template_by_id(
    template_id: uuid.UUID,
    template_in: TemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Update a template
    """
    try:
        template = await get_template(db, template_id)
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        updated_template = await update_template(db, template, template_in)
        return updated_template
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update template"
        )


@router.delete("/{template_id}", response_model=Dict[str, Any])
async def delete_template_by_id(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Delete a template
    """
    try:
        template = await get_template(db, template_id)
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        success = await delete_template(db, template)
        return {"success": success, "message": "Template deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete template"
        )


@router.post("/{template_id}/clone", response_model=Template)
async def clone_template_by_id(
    template_id: uuid.UUID,
    new_title: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Clone a template
    """
    try:
        cloned_template = await clone_template(db, template_id, current_user.id, new_title)
        return cloned_template
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cloning template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clone template"
        )