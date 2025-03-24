import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple

from fastapi import HTTPException, status, BackgroundTasks
from sqlalchemy import select, and_, or_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.flux_ai import flux_ai_client, flux_ai_cache
from app.core.security import create_token_string
from app.models.cycle import FeedbackCycle
from app.models.feedback import Feedback
from app.models.token import AccessToken
from app.models.user import User
from app.models.template import FeedbackTemplate
from app.models.document import Document
from app.schemas.feedback import (
    FeedbackCreate,
    FeedbackUpdate,
    FeedbackSearch,
    FeedbackForm,
    AIAssistanceRequest
)
from app.services.cycle_service import update_cycle_analytics

logger = logging.getLogger(__name__)


async def create_feedback(
    db: AsyncSession,
    obj_in: FeedbackCreate
) -> Feedback:
    """
    Create a new feedback entry
    
    Args:
        db: Database session
        obj_in: Feedback data
        
    Returns:
        Created feedback
    """
    # Verify cycle exists
    cycle_query = select(FeedbackCycle).where(FeedbackCycle.id == obj_in.cycle_id)
    result = await db.execute(cycle_query)
    cycle = result.scalars().first()
    
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback cycle not found"
        )
    
    # Check if this evaluator already has feedback for this cycle
    existing_query = select(Feedback).where(
        and_(
            Feedback.cycle_id == obj_in.cycle_id,
            Feedback.evaluator_email == obj_in.evaluator_email
        )
    )
    result = await db.execute(existing_query)
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Feedback for this evaluator already exists"
        )
    
    # Get evaluator user if exists
    evaluator_id = obj_in.evaluator_id
    if not evaluator_id and obj_in.evaluator_email:
        # Try to find user by email
        user_query = select(User).where(User.email == obj_in.evaluator_email)
        result = await db.execute(user_query)
        user = result.scalars().first()
        evaluator_id = user.id if user else None
    
    # Create feedback
    db_obj = Feedback(
        cycle_id=obj_in.cycle_id,
        evaluator_id=evaluator_id,
        evaluator_email=obj_in.evaluator_email,
        status="pending"
    )
    
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    
    return db_obj


async def get_feedback(
    db: AsyncSession,
    feedback_id: uuid.UUID
) -> Optional[Feedback]:
    """
    Get feedback by ID
    
    Args:
        db: Database session
        feedback_id: ID of the feedback
        
    Returns:
        Feedback if found, None otherwise
    """
    query = select(Feedback).where(Feedback.id == feedback_id)
    result = await db.execute(query)
    return result.scalars().first()


async def get_feedback_by_token(
    db: AsyncSession,
    token: str
) -> Optional[Tuple[Feedback, AccessToken]]:
    """
    Get feedback by access token
    
    Args:
        db: Database session
        token: Access token
        
    Returns:
        Tuple of (feedback, token) if found, None otherwise
    """
    # Get token
    token_query = select(AccessToken).where(AccessToken.token == token)
    result = await db.execute(token_query)
    token_obj = result.scalars().first()
    
    if not token_obj:
        return None
    
    # Check if token is expired
    if token_obj.expires_at < datetime.utcnow():
        return None
    
    # Get feedback
    feedback_query = select(Feedback).where(Feedback.id == token_obj.feedback_id)
    result = await db.execute(feedback_query)
    feedback = result.scalars().first()
    
    if not feedback:
        return None
    
    # Update token usage
    token_obj.used_count += 1
    await db.commit()
    
    return feedback, token_obj


async def update_feedback(
    db: AsyncSession,
    db_obj: Feedback,
    obj_in: FeedbackUpdate
) -> Feedback:
    """
    Update feedback
    
    Args:
        db: Database session
        db_obj: Existing feedback
        obj_in: New feedback data
        
    Returns:
        Updated feedback
    """
    update_data = obj_in.dict(exclude_unset=True)
    
    # Handle special cases
    
    # If updating to "completed" status, set submitted_at
    if update_data.get("status") == "completed" and db_obj.status != "completed":
        update_data["submitted_at"] = datetime.utcnow()
    
    # If updating draft_answers, set last_saved_at
    if "draft_answers" in update_data:
        update_data["last_saved_at"] = datetime.utcnow()
    
    # Update feedback attributes
    for field, value in update_data.items():
        if field in ["answers", "draft_answers"] and value:
            # Convert to dict for JSON storage
            answers_dict = [answer.dict() for answer in value]
            setattr(db_obj, field, answers_dict)
        else:
            setattr(db_obj, field, value)
    
    await db.commit()
    await db.refresh(db_obj)
    
    # If status changed to completed, update cycle analytics
    if update_data.get("status") == "completed" and db_obj.status == "completed":
        await update_cycle_analytics(db, db_obj.cycle_id)
    
    return db_obj


async def delete_feedback(
    db: AsyncSession,
    db_obj: Feedback
) -> bool:
    """
    Delete feedback
    
    Args:
        db: Database session
        db_obj: Feedback to delete
        
    Returns:
        True if deleted, False otherwise
    """
    # Delete associated tokens first
    token_query = select(AccessToken).where(AccessToken.feedback_id == db_obj.id)
    result = await db.execute(token_query)
    tokens = result.scalars().all()
    
    for token in tokens:
        await db.delete(token)
    
    # Delete feedback
    await db.delete(db_obj)
    await db.commit()
    
    # Update cycle analytics
    await update_cycle_analytics(db, db_obj.cycle_id)
    
    return True


async def search_feedback(
    db: AsyncSession,
    search: FeedbackSearch
) -> List[Feedback]:
    """
    Search for feedback
    
    Args:
        db: Database session
        search: Search parameters
        
    Returns:
        List of matching feedback
    """
    query = select(Feedback)
    conditions = []
    
    # Filter by cycle
    if search.cycle_id:
        conditions.append(Feedback.cycle_id == search.cycle_id)
    
    # Filter by evaluator_id
    if search.evaluator_id:
        conditions.append(Feedback.evaluator_id == search.evaluator_id)
    
    # Filter by evaluator_email
    if search.evaluator_email:
        conditions.append(Feedback.evaluator_email == search.evaluator_email)
    
    # Filter by status
    if search.status:
        conditions.append(Feedback.status == search.status)
    
    # Apply conditions
    if conditions:
        query = query.where(and_(*conditions))
    
    # Apply pagination
    if search.limit:
        query = query.limit(search.limit)
    if search.offset:
        query = query.offset(search.offset)
    
    # Execute query
    result = await db.execute(query)
    return result.scalars().all()


async def create_feedback_token(
    db: AsyncSession,
    feedback_id: uuid.UUID,
    ip_address: Optional[str] = None,
    days_valid: int = 30
) -> AccessToken:
    """
    Create a new access token for feedback
    
    Args:
        db: Database session
        feedback_id: ID of the feedback
        ip_address: Optional IP address of the creator
        days_valid: Number of days the token is valid
        
    Returns:
        Created access token
    """
    # Check if feedback exists
    feedback = await get_feedback(db, feedback_id)
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found"
        )
    
    # Generate token
    token_string = create_token_string()
    expires_at = datetime.utcnow() + timedelta(days=days_valid)
    
    # Create token
    token = AccessToken(
        token=token_string,
        feedback_id=feedback_id,
        ip_address=ip_address,
        expires_at=expires_at,
        used_count=0
    )
    
    db.add(token)
    await db.commit()
    await db.refresh(token)
    
    return token


async def reset_feedback_token(
    db: AsyncSession,
    feedback_id: uuid.UUID,
    ip_address: Optional[str] = None,
    days_valid: int = 30
) -> AccessToken:
    """
    Reset access token for feedback by creating a new one and deleting old ones
    
    Args:
        db: Database session
        feedback_id: ID of the feedback
        ip_address: Optional IP address of the creator
        days_valid: Number of days the token is valid
        
    Returns:
        New access token
    """
    # Delete existing tokens
    token_query = select(AccessToken).where(AccessToken.feedback_id == feedback_id)
    result = await db.execute(token_query)
    tokens = result.scalars().all()
    
    for token in tokens:
        await db.delete(token)
    
    await db.commit()
    
    # Create new token
    return await create_feedback_token(db, feedback_id, ip_address, days_valid)


async def get_feedback_form(
    db: AsyncSession,
    feedback: Feedback
) -> FeedbackForm:
    """
    Get full feedback form with cycle, template, and subject details
    
    Args:
        db: Database session
        feedback: Feedback object
        
    Returns:
        Complete feedback form for the evaluator
    """
    # Get cycle
    cycle_query = select(FeedbackCycle).where(FeedbackCycle.id == feedback.cycle_id)
    result = await db.execute(cycle_query)
    cycle = result.scalars().first()
    
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback cycle not found"
        )
    
    # Get subject
    subject_query = select(User).where(User.id == cycle.subject_id)
    result = await db.execute(subject_query)
    subject = result.scalars().first()
    
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject user not found"
        )
    
    # Get template
    template_query = select(FeedbackTemplate).where(FeedbackTemplate.id == cycle.template_id)
    result = await db.execute(template_query)
    template = result.scalars().first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback template not found"
        )
    
    # Get deadline from cycle config
    deadline = None
    if cycle.config and "deadline" in cycle.config:
        deadline = cycle.config["deadline"]
    
    # Convert draft answers to proper format if they exist
    draft_answers = None
    if feedback.draft_answers:
        draft_answers = feedback.draft_answers
    
    # Create feedback form
    form = FeedbackForm(
        id=feedback.id,
        cycle_id=cycle.id,
        cycle_title=cycle.title,
        subject_name=subject.full_name,
        evaluator_email=feedback.evaluator_email,
        status=feedback.status,
        questions=template.questions,
        draft_answers=draft_answers,
        deadline=deadline
    )
    
    return form


async def save_feedback_draft(
    db: AsyncSession,
    feedback: Feedback,
    answers: List[Dict[str, Any]],
    comments: Optional[str] = None
) -> Feedback:
    """
    Save draft feedback answers
    
    Args:
        db: Database session
        feedback: Feedback object
        answers: List of draft answers
        comments: Optional comments
        
    Returns:
        Updated feedback
    """
    # Update feedback
    feedback.draft_answers = answers
    if comments is not None:
        feedback.comments = comments
    feedback.last_saved_at = datetime.utcnow()
    
    # If this is the first save, update status to started
    if feedback.status == "pending":
        feedback.status = "started"
    
    await db.commit()
    await db.refresh(feedback)
    
    # Update cycle analytics
    await update_cycle_analytics(db, feedback.cycle_id)
    
    return feedback


async def submit_feedback(
    db: AsyncSession,
    feedback: Feedback,
    answers: List[Dict[str, Any]],
    comments: Optional[str] = None
) -> Feedback:
    """
    Submit final feedback
    
    Args:
        db: Database session
        feedback: Feedback object
        answers: List of final answers
        comments: Optional comments
        
    Returns:
        Updated feedback
    """
    # Update feedback
    feedback.answers = answers
    if comments is not None:
        feedback.comments = comments
    feedback.status = "completed"
    feedback.submitted_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(feedback)
    
    # Update cycle analytics
    await update_cycle_analytics(db, feedback.cycle_id)
    
    return feedback


async def get_ai_assistance(
    db: AsyncSession,
    feedback: Feedback,
    request: AIAssistanceRequest
) -> Dict[str, Any]:
    """
    Get AI assistance for feedback writing
    
    Args:
        db: Database session
        feedback: Feedback object
        request: AI assistance request
        
    Returns:
        AI assistance response
    """
    # Get cycle and template for context
    cycle_query = select(FeedbackCycle).where(FeedbackCycle.id == feedback.cycle_id)
    result = await db.execute(cycle_query)
    cycle = result.scalars().first()
    
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback cycle not found"
        )
    
    # Get template
    template_query = select(FeedbackTemplate).where(FeedbackTemplate.id == cycle.template_id)
    result = await db.execute(template_query)
    template = result.scalars().first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback template not found"
        )
    
    # Get subject
    subject_query = select(User).where(User.id == cycle.subject_id)
    result = await db.execute(subject_query)
    subject = result.scalars().first()
    
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject user not found"
        )
    
    # Find the specific question
    question = None
    for q in template.questions:
        if q["id"] == request.question_id:
            question = q
            break
    
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found in template"
        )
    
    # Prepare attachments if cycle has document_ids
    attachments = None
    if cycle.document_ids:
        # Get documents
        document_query = select(Document).where(Document.id.in_(cycle.document_ids))
        result = await db.execute(document_query)
        documents = result.scalars().all()
        
        # Extract Flux AI file IDs
        flux_file_ids = [doc.flux_file_id for doc in documents if doc.flux_file_id]
        
        if flux_file_ids:
            attachments = {
                "files": flux_file_ids
            }
    
    # Create prompt based on request type
    messages = []
    
    # System message as preamble
    preamble = f"""You are an AI assistant helping with 360-degree feedback. Your task is to help the evaluator ({feedback.evaluator_email}) provide constructive feedback for {subject.full_name}.
    
The feedback is for the question: "{question['text']}"
    
Follow these guidelines:
- Be specific and constructive
- Focus on behaviors, not personality
- Balance positive aspects with areas for improvement
- Be professional and respectful
- Provide actionable insights
"""
    
    # User message for context
    user_message = f"Here is my current feedback: {request.current_text}\n\n"
    
    # Add specific request based on request_type
    if request.request_type == "improve":
        user_message += "Please help me improve this feedback to make it more specific, actionable, and constructive."
    elif request.request_type == "expand":
        user_message += "Please help me expand on this feedback with more details and examples."
    elif request.request_type == "summarize":
        user_message += "Please help me summarize this feedback more concisely while keeping the key points."
    elif request.request_type == "example":
        user_message += "Please provide an example or template for good feedback related to this topic."
    
    messages.append({
        "role": "user",
        "content": user_message
    })
    
    try:
        # Make API call to Flux AI
        mode = "rag" if attachments else None
        response = await flux_ai_client.chat_completion(
            messages=messages,
            attachments=attachments,
            preamble=preamble,
            mode=mode
        )
        
        # Extract AI response
        ai_content = response["choices"][0]["message"]["content"]
        
        # Process response to extract improved text and suggestions
        improved_text = ai_content
        suggestions = []
        
        # Simple logic to extract suggestions if they're formatted with bullet points
        if "Suggestions:" in ai_content:
            main_parts = ai_content.split("Suggestions:")
            improved_text = main_parts[0].strip()
            suggestions_text = main_parts[1].strip()
            
            # Extract bullet points
            for line in suggestions_text.split("\n"):
                if line.strip().startswith("-") or line.strip().startswith("*"):
                    suggestions.append(line.strip()[2:].strip())
        
        return {
            "improved_text": improved_text,
            "suggestions": suggestions
        }
        
    except Exception as e:
        logger.error(f"Error getting AI assistance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get AI assistance"
        )