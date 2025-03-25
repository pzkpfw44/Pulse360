import logging
import uuid
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_hr_or_admin_user
from app.models.user import User
from app.models.feedback import Feedback
from app.schemas.feedback import (
    Feedback as FeedbackSchema,
    FeedbackCreate,
    FeedbackUpdate,
    FeedbackSearch,
    FeedbackForm,
    SaveDraftRequest,
    SubmitFeedbackRequest,
    AIAssistanceRequest,
    AIAssistanceResponse
)
from app.services.feedback_service import (
    create_feedback,
    get_feedback,
    get_feedback_by_token,
    update_feedback,
    delete_feedback,
    search_feedback,
    create_feedback_token,
    reset_feedback_token,
    get_feedback_form,
    save_feedback_draft,
    submit_feedback,
    get_ai_assistance
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/", response_model=FeedbackSchema)
async def create_new_feedback(
    feedback_in: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Create a new feedback entry
    """
    try:
        feedback = await create_feedback(db, feedback_in)
        return feedback
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating feedback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create feedback"
        )


@router.get("/", response_model=List[FeedbackSchema])
async def list_feedback(
    cycle_id: Optional[uuid.UUID] = None,
    evaluator_id: Optional[uuid.UUID] = None,
    evaluator_email: Optional[str] = None,
    status: Optional[str] = None,
    limit: Optional[int] = 50,
    offset: Optional[int] = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    List feedback with optional filtering
    """
    search = FeedbackSearch(
        cycle_id=cycle_id,
        evaluator_id=evaluator_id,
        evaluator_email=evaluator_email,
        status=status,
        limit=limit,
        offset=offset
    )
    
    try:
        feedback_items = await search_feedback(db, search)
        return feedback_items
    except Exception as e:
        logger.error(f"Error listing feedback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve feedback"
        )


@router.get("/{feedback_id}", response_model=FeedbackSchema)
async def get_feedback_by_id(
    feedback_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Get a specific feedback by ID
    """
    try:
        feedback = await get_feedback(db, feedback_id)
        if not feedback:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Feedback not found"
            )
        return feedback
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving feedback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve feedback"
        )


@router.put("/{feedback_id}", response_model=FeedbackSchema)
async def update_feedback_by_id(
    feedback_id: uuid.UUID,
    feedback_in: FeedbackUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Update a feedback entry
    """
    try:
        feedback = await get_feedback(db, feedback_id)
        if not feedback:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Feedback not found"
            )
        
        updated_feedback = await update_feedback(db, feedback, feedback_in)
        return updated_feedback
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating feedback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update feedback"
        )


@router.delete("/{feedback_id}", response_model=Dict[str, Any])
async def delete_feedback_by_id(
    feedback_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Delete a feedback entry
    """
    try:
        feedback = await get_feedback(db, feedback_id)
        if not feedback:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Feedback not found"
            )
        
        success = await delete_feedback(db, feedback)
        return {"success": success, "message": "Feedback deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting feedback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete feedback"
        )


@router.post("/{feedback_id}/token", response_model=Dict[str, Any])
async def create_token_for_feedback(
    feedback_id: uuid.UUID,
    request: Request,
    days_valid: Optional[int] = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Create a new access token for feedback
    """
    try:
        ip_address = request.client.host if request.client else None
        token = await create_feedback_token(db, feedback_id, ip_address, days_valid)
        
        return {
            "success": True,
            "token": token.token,
            "expires_at": token.expires_at
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create token"
        )


@router.post("/{feedback_id}/reset-token", response_model=Dict[str, Any])
async def reset_token_for_feedback(
    feedback_id: uuid.UUID,
    request: Request,
    days_valid: Optional[int] = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Reset access token for feedback by creating a new one and deleting old ones
    """
    try:
        ip_address = request.client.host if request.client else None
        token = await reset_feedback_token(db, feedback_id, ip_address, days_valid)
        
        return {
            "success": True,
            "token": token.token,
            "expires_at": token.expires_at
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset token"
        )


# Public endpoints for evaluators using tokens

@router.get("/public/{token}", response_model=FeedbackForm)
async def get_public_feedback_form(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Get feedback form using access token
    """
    try:
        # Get feedback by token
        result = await get_feedback_by_token(db, token)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or expired token"
            )
        
        feedback, token_obj = result
        
        # Update token with IP address if not set
        if not token_obj.ip_address:
            token_obj.ip_address = request.client.host if request.client else None
            await db.commit()
        
        # Get full feedback form
        form = await get_feedback_form(db, feedback)
        return form
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving feedback form: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve feedback form"
        )


@router.post("/public/{token}/save-draft", response_model=Dict[str, Any])
async def save_draft_for_feedback(
    token: str,
    draft: SaveDraftRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Save draft feedback answers
    """
    try:
        # Get feedback by token
        result = await get_feedback_by_token(db, token)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or expired token"
            )
        
        feedback, _ = result
        
        # Cannot save draft for completed feedback
        if feedback.status == "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot modify completed feedback"
            )
        
        # Save draft
        answers = [answer.dict() for answer in draft.answers]
        updated_feedback = await save_feedback_draft(db, feedback, answers, draft.comments)
        
        return {
            "success": True,
            "message": "Draft saved successfully",
            "status": updated_feedback.status,
            "last_saved_at": updated_feedback.last_saved_at
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving draft: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save draft"
        )


@router.post("/public/{token}/submit", response_model=Dict[str, Any])
async def submit_final_feedback(
    token: str,
    submission: SubmitFeedbackRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit final feedback
    """
    try:
        # Get feedback by token
        result = await get_feedback_by_token(db, token)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or expired token"
            )
        
        feedback, _ = result
        
        # Cannot submit completed feedback
        if feedback.status == "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Feedback has already been submitted"
            )
        
        # Submit feedback
        answers = [answer.dict() for answer in submission.answers]
        updated_feedback = await submit_feedback(db, feedback, answers, submission.comments)
        
        # In a real implementation, we would send a notification in the background
        # background_tasks.add_task(send_completion_notification, feedback)
        
        return {
            "success": True,
            "message": "Feedback submitted successfully",
            "status": updated_feedback.status,
            "submitted_at": updated_feedback.submitted_at
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting feedback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit feedback"
        )


@router.post("/public/{token}/ai-assist", response_model=AIAssistanceResponse)
async def get_ai_assistance_for_feedback(
    token: str,
    request_data: AIAssistanceRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Get AI assistance for feedback writing
    """
    try:
        # Get feedback by token
        result = await get_feedback_by_token(db, token)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or expired token"
            )
        
        feedback, _ = result
        
        # Cannot get assistance for completed feedback
        if feedback.status == "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot modify completed feedback"
            )
        
        # Get AI assistance
        response = await get_ai_assistance(db, feedback, request_data)
        
        return AIAssistanceResponse(
            improved_text=response["improved_text"],
            suggestions=response["suggestions"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting AI assistance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get AI assistance"
        )