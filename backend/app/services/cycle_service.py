import logging
import os
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple

from fastapi import HTTPException, status, BackgroundTasks
from sqlalchemy import select, func, desc, and_, or_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

from app.core.config import settings
from app.core.flux_ai import flux_ai_client
from app.models.cycle import FeedbackCycle
from app.models.feedback import Feedback
from app.models.template import FeedbackTemplate
from app.models.user import User
from app.models.token import AccessToken
from app.schemas.cycle import (
    CycleCreate, 
    CycleUpdate, 
    CycleSearch, 
    EvaluatorCreate,
    CycleAnalytics
)
from app.services.template_service import get_template
from app.core.security import create_token_string
# This would be implemented in a later batch
# from app.tasks.email_tasks import send_invitation_email, send_reminder_email

logger = logging.getLogger(__name__)


async def create_cycle(
    db: AsyncSession,
    obj_in: CycleCreate,
    creator_id: uuid.UUID
) -> FeedbackCycle:
    """
    Create a new feedback cycle
    
    Args:
        db: Database session
        obj_in: Cycle data
        creator_id: ID of the user who created the cycle
        
    Returns:
        Created cycle
    """
    # Verify template exists
    template = await get_template(db, obj_in.template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Verify subject exists
    subject_query = select(User).where(User.id == obj_in.subject_id)
    result = await db.execute(subject_query)
    subject = result.scalars().first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject user not found"
        )
    
    # Create analytics object
    analytics = CycleAnalytics(
        total_evaluators=0,
        completed_count=0,
        completion_rate=0.0,
        pending_count=0,
        started_count=0
    )
    
    # Create new cycle
    db_obj = FeedbackCycle(
        title=obj_in.title,
        description=obj_in.description,
        status=obj_in.status,
        subject_id=obj_in.subject_id,
        creator_id=creator_id,
        template_id=obj_in.template_id,
        config=obj_in.config.dict() if obj_in.config else None,
        document_ids=obj_in.document_ids,
        report_generated=False,
        analytics=analytics.dict()
    )
    
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    
    return db_obj


async def get_cycle(
    db: AsyncSession,
    cycle_id: uuid.UUID
) -> Optional[FeedbackCycle]:
    """
    Get a cycle by ID
    
    Args:
        db: Database session
        cycle_id: ID of the cycle
        
    Returns:
        Cycle if found, None otherwise
    """
    query = select(FeedbackCycle).where(FeedbackCycle.id == cycle_id)
    result = await db.execute(query)
    return result.scalars().first()


async def get_cycle_with_template(
    db: AsyncSession,
    cycle_id: uuid.UUID
) -> Optional[Tuple[FeedbackCycle, FeedbackTemplate]]:
    """
    Get a cycle with its template
    
    Args:
        db: Database session
        cycle_id: ID of the cycle
        
    Returns:
        Tuple of (cycle, template) if found, None otherwise
    """
    query = (
        select(FeedbackCycle, FeedbackTemplate)
        .join(FeedbackTemplate, FeedbackCycle.template_id == FeedbackTemplate.id)
        .where(FeedbackCycle.id == cycle_id)
    )
    result = await db.execute(query)
    row = result.first()
    if not row:
        return None
    return row[0], row[1]


async def update_cycle(
    db: AsyncSession,
    db_obj: FeedbackCycle,
    obj_in: CycleUpdate
) -> FeedbackCycle:
    """
    Update a cycle
    
    Args:
        db: Database session
        db_obj: Existing cycle
        obj_in: New cycle data
        
    Returns:
        Updated cycle
    """
    update_data = obj_in.dict(exclude_unset=True)
    
    # Handle special cases
    
    # If updating to "active" status, verify it's ready
    if "status" in update_data and update_data["status"] == "active" and db_obj.status != "active":
        # Check if there are evaluators
        eval_count_query = select(func.count()).select_from(Feedback).where(Feedback.cycle_id == db_obj.id)
        result = await db.execute(eval_count_query)
        evaluator_count = result.scalar()
        
        if evaluator_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot activate cycle without evaluators"
            )
    
    # Update document IDs
    if "document_ids" in update_data:
        # In a real implementation, we would verify that these documents exist
        pass
    
    # Update cycle attributes
    for field, value in update_data.items():
        if field == "config" and value is not None:
            setattr(db_obj, field, value.dict())
        else:
            setattr(db_obj, field, value)
    
    await db.commit()
    await db.refresh(db_obj)
    
    return db_obj


async def delete_cycle(
    db: AsyncSession,
    db_obj: FeedbackCycle
) -> bool:
    """
    Delete a cycle
    
    Args:
        db: Database session
        db_obj: Cycle to delete
        
    Returns:
        True if deleted, False otherwise
    """
    # Cannot delete an active cycle
    if db_obj.status == "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete an active cycle"
        )
    
    # Delete all related feedback and tokens
    feedback_query = select(Feedback).where(Feedback.cycle_id == db_obj.id)
    result = await db.execute(feedback_query)
    feedback_items = result.scalars().all()
    
    for feedback in feedback_items:
        # Delete tokens for this feedback
        token_query = select(AccessToken).where(AccessToken.feedback_id == feedback.id)
        token_result = await db.execute(token_query)
        tokens = token_result.scalars().all()
        
        for token in tokens:
            await db.delete(token)
        
        # Delete feedback
        await db.delete(feedback)
    
    # Delete report file if exists
    if db_obj.report_path and os.path.exists(db_obj.report_path):
        try:
            os.remove(db_obj.report_path)
        except Exception as e:
            logger.error(f"Error deleting report file: {str(e)}")
    
    # Delete cycle
    await db.delete(db_obj)
    await db.commit()
    
    return True


async def search_cycles(
    db: AsyncSession,
    search: CycleSearch
) -> List[FeedbackCycle]:
    """
    Search for cycles
    
    Args:
        db: Database session
        search: Search parameters
        
    Returns:
        List of matching cycles
    """
    query = select(FeedbackCycle)
    conditions = []
    
    # Filter by creator if specified
    if search.creator_id:
        conditions.append(FeedbackCycle.creator_id == search.creator_id)
    
    # Filter by subject if specified
    if search.subject_id:
        conditions.append(FeedbackCycle.subject_id == search.subject_id)
    
    # Filter by template if specified
    if search.template_id:
        conditions.append(FeedbackCycle.template_id == search.template_id)
    
    # Filter by status if specified
    if search.status:
        conditions.append(FeedbackCycle.status == search.status)
    
    # Filter by query string
    if search.query:
        conditions.append(
            or_(
                FeedbackCycle.title.ilike(f"%{search.query}%"),
                FeedbackCycle.description.ilike(f"%{search.query}%")
            )
        )
    
    # Filter by date range
    if search.start_date:
        conditions.append(FeedbackCycle.created_at >= search.start_date)
    if search.end_date:
        conditions.append(FeedbackCycle.created_at <= search.end_date)
    
    # Apply conditions
    if conditions:
        query = query.where(and_(*conditions))
    
    # Apply ordering - newest first
    query = query.order_by(desc(FeedbackCycle.created_at))
    
    # Apply pagination
    if search.limit:
        query = query.limit(search.limit)
    if search.offset:
        query = query.offset(search.offset)
    
    # Execute query
    result = await db.execute(query)
    return result.scalars().all()


async def add_evaluators(
    db: AsyncSession,
    cycle_id: uuid.UUID,
    evaluators: List[EvaluatorCreate],
    background_tasks: Optional[BackgroundTasks] = None
) -> List[Feedback]:
    """
    Add evaluators to a cycle and send invitations
    
    Args:
        db: Database session
        cycle_id: ID of the cycle
        evaluators: List of evaluators to add
        background_tasks: Optional background tasks
        
    Returns:
        List of created feedback items
    """
    # Get cycle
    cycle = await get_cycle(db, cycle_id)
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cycle not found"
        )
    
    # Check if cycle is in appropriate status
    if cycle.status not in ["draft", "active"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot add evaluators to cycle with status '{cycle.status}'"
        )
    
    # Create feedback items
    created_feedback = []
    
    for evaluator in evaluators:
        # Check if this evaluator already exists
        evaluator_query = select(Feedback).where(
            and_(
                Feedback.cycle_id == cycle_id,
                Feedback.evaluator_email == evaluator.email
            )
        )
        result = await db.execute(evaluator_query)
        existing_feedback = result.scalars().first()
        
        if existing_feedback:
            continue  # Skip if already exists
        
        # Check if evaluator is a user
        user_query = select(User).where(User.email == evaluator.email)
        result = await db.execute(user_query)
        user = result.scalars().first()
        
        # Create feedback
        feedback = Feedback(
            cycle_id=cycle_id,
            evaluator_id=user.id if user else None,
            evaluator_email=evaluator.email,
            status="pending"
        )
        
        db.add(feedback)
        await db.commit()
        await db.refresh(feedback)
        
        # Create access token
        token_string = create_token_string()
        expires_at = datetime.utcnow() + timedelta(days=30)  # Token valid for 30 days
        
        token = AccessToken(
            token=token_string,
            feedback_id=feedback.id,
            expires_at=expires_at
        )
        
        db.add(token)
        await db.commit()
        
        created_feedback.append(feedback)
        
        # Send invitation email in background
        if background_tasks:
            # This would be implemented in a later batch
            # background_tasks.add_task(
            #     send_invitation_email,
            #     email=evaluator.email,
            #     token=token_string,
            #     cycle=cycle,
            #     relation=evaluator.relation
            # )
            pass
    
    # Update analytics
    if created_feedback:
        await update_cycle_analytics(db, cycle_id)
    
    return created_feedback


async def send_reminders(
    db: AsyncSession,
    cycle_id: uuid.UUID,
    evaluator_ids: Optional[List[uuid.UUID]] = None,
    message: Optional[str] = None,
    background_tasks: Optional[BackgroundTasks] = None
) -> Dict[str, Any]:
    """
    Send reminders to evaluators
    
    Args:
        db: Database session
        cycle_id: ID of the cycle
        evaluator_ids: Optional list of evaluator IDs to remind
        message: Optional custom message
        background_tasks: Optional background tasks
        
    Returns:
        Result of sending reminders
    """
    # Get cycle
    cycle = await get_cycle(db, cycle_id)
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cycle not found"
        )
    
    # Check if cycle is active
    if cycle.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send reminders for inactive cycle"
        )
    
    # Get pending feedback items
    query = select(Feedback).where(
        and_(
            Feedback.cycle_id == cycle_id,
            Feedback.status.in_(["pending", "started"])
        )
    )
    
    # Filter by evaluator IDs if provided
    if evaluator_ids:
        query = query.where(Feedback.id.in_(evaluator_ids))
    
    result = await db.execute(query)
    pending_feedback = result.scalars().all()
    
    # Check if there are any pending evaluators
    if not pending_feedback:
        return {
            "success": False,
            "message": "No pending evaluators to remind",
            "reminders_sent": 0
        }
    
    # Send reminders
    reminders_sent = 0
    
    for feedback in pending_feedback:
        # Get token
        token_query = select(AccessToken).where(AccessToken.feedback_id == feedback.id)
        result = await db.execute(token_query)
        token = result.scalars().first()
        
        if not token:
            # Create new token if none exists
            token_string = create_token_string()
            expires_at = datetime.utcnow() + timedelta(days=30)
            
            token = AccessToken(
                token=token_string,
                feedback_id=feedback.id,
                expires_at=expires_at
            )
            
            db.add(token)
            await db.commit()
        
        # Send reminder email in background
        if background_tasks:
            # This would be implemented in a later batch
            # background_tasks.add_task(
            #     send_reminder_email,
            #     email=feedback.evaluator_email,
            #     token=token.token,
            #     cycle=cycle,
            #     message=message
            # )
            pass
        
        reminders_sent += 1
    
    return {
        "success": True,
        "message": f"Sent {reminders_sent} reminders",
        "reminders_sent": reminders_sent
    }


async def get_cycle_status(
    db: AsyncSession,
    cycle_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Get detailed status of a cycle including evaluators
    
    Args:
        db: Database session
        cycle_id: ID of the cycle
        
    Returns:
        Cycle status details
    """
    # Get cycle with feedback items
    cycle_query = select(FeedbackCycle).where(FeedbackCycle.id == cycle_id)
    result = await db.execute(cycle_query)
    cycle = result.scalars().first()
    
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cycle not found"
        )
    
    # Get all feedback items for this cycle
    feedback_query = select(Feedback).where(Feedback.cycle_id == cycle_id)
    result = await db.execute(feedback_query)
    feedback_items = result.scalars().all()
    
    # Prepare evaluator details
    evaluators = []
    for feedback in feedback_items:
        # Get token
        token_query = select(AccessToken).where(AccessToken.feedback_id == feedback.id)
        result = await db.execute(token_query)
        token = result.scalars().first()
        
        evaluator = {
            "id": feedback.id,
            "email": feedback.evaluator_email,
            "status": feedback.status,
            "last_updated": feedback.updated_at,
            "has_token": token is not None,
            "token_expires": token.expires_at if token else None
        }
        
        evaluators.append(evaluator)
    
    # Update analytics (ensure it's current)
    await update_cycle_analytics(db, cycle_id)
    
    return {
        "id": cycle.id,
        "title": cycle.title,
        "status": cycle.status,
        "analytics": cycle.analytics,
        "evaluators": evaluators
    }


async def update_cycle_analytics(
    db: AsyncSession,
    cycle_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Update cycle analytics
    
    Args:
        db: Database session
        cycle_id: ID of the cycle
        
    Returns:
        Updated analytics
    """
    # Get cycle
    cycle = await get_cycle(db, cycle_id)
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cycle not found"
        )
    
    # Get all feedback items for this cycle
    feedback_query = select(Feedback).where(Feedback.cycle_id == cycle_id)
    result = await db.execute(feedback_query)
    feedback_items = result.scalars().all()
    
    # Calculate analytics
    total_evaluators = len(feedback_items)
    completed_count = sum(1 for f in feedback_items if f.status == "completed")
    started_count = sum(1 for f in feedback_items if f.status == "started")
    pending_count = sum(1 for f in feedback_items if f.status == "pending")
    
    completion_rate = 0.0
    if total_evaluators > 0:
        completion_rate = round((completed_count / total_evaluators) * 100, 1)
    
    # Create analytics object
    analytics = CycleAnalytics(
        total_evaluators=total_evaluators,
        completed_count=completed_count,
        completion_rate=completion_rate,
        pending_count=pending_count,
        started_count=started_count
    )
    
    # Update cycle
    cycle.analytics = analytics.dict()
    await db.commit()
    
    return cycle.analytics


async def generate_report(
    db: AsyncSession,
    cycle_id: uuid.UUID,
    include_comments: bool = True,
    anonymize: bool = True,
    format: str = "pdf"
) -> Dict[str, Any]:
    """
    Generate a report for a feedback cycle
    
    Args:
        db: Database session
        cycle_id: ID of the cycle
        include_comments: Whether to include comments
        anonymize: Whether to anonymize evaluators
        format: Report format
        
    Returns:
        Report generation result
    """
    # Get cycle with template
    cycle_template = await get_cycle_with_template(db, cycle_id)
    if not cycle_template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cycle not found"
        )
    
    cycle, template = cycle_template
    
    # Check if cycle has completed feedback
    feedback_query = select(Feedback).where(
        and_(
            Feedback.cycle_id == cycle_id,
            Feedback.status == "completed"
        )
    )
    result = await db.execute(feedback_query)
    completed_feedback = result.scalars().all()
    
    if not completed_feedback:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No completed feedback available for report generation"
        )
    
    # Create reports directory if it doesn't exist
    reports_dir = os.path.join(settings.UPLOAD_FOLDER, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    
    # Generate report filename
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    filename = f"report_{cycle.id}_{timestamp}.{format}"
    report_path = os.path.join(reports_dir, filename)
    
    # This would be a placeholder for actual report generation
    # In a real implementation, we would use an appropriate library
    # For now, we'll just create a dummy file
    with open(report_path, "w") as f:
        f.write(f"Report for cycle {cycle.title}\n")
        f.write(f"Generated at {datetime.utcnow()}\n")
        f.write(f"Total feedback: {len(completed_feedback)}\n")
    
    # Update cycle with report path
    cycle.report_generated = True
    cycle.report_path = report_path
    await db.commit()
    
    return {
        "success": True,
        "report_path": report_path,
        "message": "Report generated successfully"
    }


async def get_report(
    db: AsyncSession,
    cycle_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Get report for a cycle
    
    Args:
        db: Database session
        cycle_id: ID of the cycle
        
    Returns:
        Report details
    """
    # Get cycle
    cycle = await get_cycle(db, cycle_id)
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cycle not found"
        )
    
    # Check if report exists
    if not cycle.report_generated or not cycle.report_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    # Check if report file exists
    if not os.path.exists(cycle.report_path):
        # Update cycle to indicate report is missing
        cycle.report_generated = False
        cycle.report_path = None
        await db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report file not found"
        )
    
    return {
        "success": True,
        "report_path": cycle.report_path,
        "generated_at": os.path.getmtime(cycle.report_path)
    }