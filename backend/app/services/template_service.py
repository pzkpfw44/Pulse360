import logging
import uuid
from typing import List, Optional, Dict, Any

from fastapi import HTTPException, status
from sqlalchemy import select, func, desc, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.template import FeedbackTemplate
from app.models.user import User
from app.schemas.template import TemplateCreate, TemplateUpdate, TemplateSearch

logger = logging.getLogger(__name__)


async def create_template(
    db: AsyncSession,
    obj_in: TemplateCreate,
    creator_id: uuid.UUID
) -> FeedbackTemplate:
    """
    Create a new feedback template
    
    Args:
        db: Database session
        obj_in: Template data
        creator_id: ID of the user who created the template
        
    Returns:
        Created template
    """
    # If this is set as default, unset any existing defaults
    if obj_in.is_default:
        # Find existing default templates
        query = select(FeedbackTemplate).where(FeedbackTemplate.is_default == True)
        result = await db.execute(query)
        default_templates = result.scalars().all()
        
        # Unset default flag
        for template in default_templates:
            template.is_default = False
    
    # Create new template
    db_obj = FeedbackTemplate(
        title=obj_in.title,
        description=obj_in.description,
        questions=obj_in.dict().get("questions"),  # Convert to dict for JSON storage
        creator_id=creator_id,
        is_default=obj_in.is_default
    )
    
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    
    return db_obj


async def get_template(
    db: AsyncSession,
    template_id: uuid.UUID
) -> Optional[FeedbackTemplate]:
    """
    Get a template by ID
    
    Args:
        db: Database session
        template_id: ID of the template
        
    Returns:
        Template if found, None otherwise
    """
    query = select(FeedbackTemplate).where(FeedbackTemplate.id == template_id)
    result = await db.execute(query)
    return result.scalars().first()


async def update_template(
    db: AsyncSession,
    db_obj: FeedbackTemplate,
    obj_in: TemplateUpdate
) -> FeedbackTemplate:
    """
    Update a template
    
    Args:
        db: Database session
        db_obj: Existing template
        obj_in: New template data
        
    Returns:
        Updated template
    """
    update_data = obj_in.dict(exclude_unset=True)
    
    # Handle is_default flag
    if "is_default" in update_data and update_data["is_default"]:
        # Find existing default templates
        query = select(FeedbackTemplate).where(
            and_(
                FeedbackTemplate.is_default == True,
                FeedbackTemplate.id != db_obj.id
            )
        )
        result = await db.execute(query)
        default_templates = result.scalars().all()
        
        # Unset default flag
        for template in default_templates:
            template.is_default = False
    
    # Update template attributes
    for field, value in update_data.items():
        if field == "questions" and value is not None:
            # Convert to dict for JSON storage
            setattr(db_obj, field, [q.dict() for q in value])
        else:
            setattr(db_obj, field, value)
    
    await db.commit()
    await db.refresh(db_obj)
    
    return db_obj


async def delete_template(
    db: AsyncSession,
    db_obj: FeedbackTemplate
) -> bool:
    """
    Delete a template
    
    Args:
        db: Database session
        db_obj: Template to delete
        
    Returns:
        True if deleted, False otherwise
    """
    # Check if template is in use by any cycles
    # This would be implemented if we had a cycle model already
    # For now, we'll just delete without checking
    
    await db.delete(db_obj)
    await db.commit()
    
    return True


async def search_templates(
    db: AsyncSession,
    search: TemplateSearch
) -> List[FeedbackTemplate]:
    """
    Search for templates
    
    Args:
        db: Database session
        search: Search parameters
        
    Returns:
        List of matching templates
    """
    query = select(FeedbackTemplate)
    conditions = []
    
    # Filter by creator if specified
    if search.creator_id:
        conditions.append(FeedbackTemplate.creator_id == search.creator_id)
    
    # Filter by query string
    if search.query:
        conditions.append(
            or_(
                FeedbackTemplate.title.ilike(f"%{search.query}%"),
                FeedbackTemplate.description.ilike(f"%{search.query}%")
            )
        )
    
    # Filter by default flag
    if search.is_default is not None:
        conditions.append(FeedbackTemplate.is_default == search.is_default)
    
    # Apply conditions
    if conditions:
        query = query.where(and_(*conditions))
    
    # Apply ordering - newest first
    query = query.order_by(desc(FeedbackTemplate.created_at))
    
    # Apply pagination
    if search.limit:
        query = query.limit(search.limit)
    if search.offset:
        query = query.offset(search.offset)
    
    # Execute query
    result = await db.execute(query)
    return result.scalars().all()


async def get_default_template(
    db: AsyncSession
) -> Optional[FeedbackTemplate]:
    """
    Get the default template
    
    Args:
        db: Database session
        
    Returns:
        Default template if found, None otherwise
    """
    query = select(FeedbackTemplate).where(FeedbackTemplate.is_default == True)
    result = await db.execute(query)
    return result.scalars().first()


async def clone_template(
    db: AsyncSession,
    template_id: uuid.UUID,
    creator_id: uuid.UUID,
    new_title: Optional[str] = None
) -> FeedbackTemplate:
    """
    Clone an existing template
    
    Args:
        db: Database session
        template_id: ID of the template to clone
        creator_id: ID of the user who is cloning the template
        new_title: Optional new title for the cloned template
        
    Returns:
        Cloned template
    """
    # Get original template
    original = await get_template(db, template_id)
    if not original:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Create new title if not provided
    if not new_title:
        new_title = f"Copy of {original.title}"
    
    # Create clone
    clone = FeedbackTemplate(
        title=new_title,
        description=original.description,
        questions=original.questions,
        creator_id=creator_id,
        is_default=False  # Clones are never default
    )
    
    db.add(clone)
    await db.commit()
    await db.refresh(clone)
    
    return clone