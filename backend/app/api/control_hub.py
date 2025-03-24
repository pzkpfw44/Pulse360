import logging
import os
import uuid
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_hr_or_admin_user
from app.models.user import User
from app.schemas.cycle import (
    Cycle,
    CycleCreate,
    CycleUpdate,
    CycleSearch,
    CycleWithTemplate,
    CycleStatus,
    SendInvitationsRequest,
    SendRemindersRequest,
    GenerateReportRequest,
)
from app.services.cycle_service import (
    create_cycle,
    get_cycle,
    get_cycle_with_template,
    update_cycle,
    delete_cycle,
    search_cycles,
    add_evaluators,
    send_reminders,
    get_cycle_status,
    get_report,
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/", response_model=Cycle)
async def create_new_cycle(
    cycle_in: CycleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Create a new feedback cycle
    """
    try:
        cycle = await create_cycle(db, cycle_in, current_user.id)
        return cycle
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating cycle: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create cycle"
        )


@router.get("/", response_model=List[Cycle])
async def list_cycles(
    query: Optional[str] = None,
    status: Optional[str] = None,
    subject_id: Optional[uuid.UUID] = None,
    template_id: Optional[uuid.UUID] = None,
    limit: Optional[int] = 50,
    offset: Optional[int] = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    List cycles with optional filtering
    """
    search = CycleSearch(
        query=query,
        status=status,
        subject_id=subject_id,
        creator_id=None,  # No filter by creator, see all cycles
        template_id=template_id,
        limit=limit,
        offset=offset
    )
    
    try:
        cycles = await search_cycles(db, search)
        return cycles
    except Exception as e:
        logger.error(f"Error listing cycles: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve cycles"
        )


@router.get("/my", response_model=List[Cycle])
async def list_my_cycles(
    query: Optional[str] = None,
    status: Optional[str] = None,
    subject_id: Optional[uuid.UUID] = None,
    template_id: Optional[uuid.UUID] = None,
    limit: Optional[int] = 50,
    offset: Optional[int] = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    List cycles created by the current user
    """
    search = CycleSearch(
        query=query,
        status=status,
        subject_id=subject_id,
        creator_id=current_user.id,
        template_id=template_id,
        limit=limit,
        offset=offset
    )
    
    try:
        cycles = await search_cycles(db, search)
        return cycles
    except Exception as e:
        logger.error(f"Error listing user cycles: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve cycles"
        )


@router.get("/{cycle_id}", response_model=CycleWithTemplate)
async def get_cycle_by_id(
    cycle_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Get a specific cycle by ID with its template
    """
    try:
        result = await get_cycle_with_template(db, cycle_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cycle not found"
            )
        
        cycle, template = result
        return {
            **cycle.__dict__,
            "template": template
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving cycle: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve cycle"
        )


@router.put("/{cycle_id}", response_model=Cycle)
async def update_cycle_by_id(
    cycle_id: uuid.UUID,
    cycle_in: CycleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Update a cycle
    """
    try:
        cycle = await get_cycle(db, cycle_id)
        if not cycle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cycle not found"
            )
        
        updated_cycle = await update_cycle(db, cycle, cycle_in)
        return updated_cycle
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating cycle: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update cycle"
        )


@router.delete("/{cycle_id}", response_model=Dict[str, Any])
async def delete_cycle_by_id(
    cycle_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Delete a cycle
    """
    try:
        cycle = await get_cycle(db, cycle_id)
        if not cycle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cycle not found"
            )
        
        success = await delete_cycle(db, cycle)
        return {"success": success, "message": "Cycle deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting cycle: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete cycle"
        )


@router.post("/{cycle_id}/send-invitations", response_model=Dict[str, Any])
async def send_cycle_invitations(
    cycle_id: uuid.UUID,
    invitations: SendInvitationsRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Send invitations to evaluators
    """
    try:
        feedback_items = await add_evaluators(
            db, 
            cycle_id, 
            invitations.evaluators, 
            background_tasks
        )
        
        return {
            "success": True,
            "message": f"Sent invitations to {len(feedback_items)} evaluators",
            "invitations_sent": len(feedback_items)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending invitations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send invitations"
        )


@router.post("/{cycle_id}/send-reminders", response_model=Dict[str, Any])
async def send_cycle_reminders(
    cycle_id: uuid.UUID,
    reminders: SendRemindersRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Send reminders to evaluators
    """
    try:
        result = await send_reminders(
            db, 
            cycle_id, 
            reminders.evaluator_ids, 
            reminders.message,
            background_tasks
        )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending reminders: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send reminders"
        )


@router.get("/{cycle_id}/status", response_model=CycleStatus)
async def get_cycle_status_by_id(
    cycle_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Get detailed status of a cycle including evaluators
    """
    try:
        status_info = await get_cycle_status(db, cycle_id)
        return status_info
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving cycle status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve cycle status"
        )


@router.post("/{cycle_id}/generate-report", response_model=Dict[str, Any])
async def generate_cycle_report(
    cycle_id: uuid.UUID,
    report_config: GenerateReportRequest,
    background: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Generate a report for a cycle
    
    Parameters:
        cycle_id: ID of the feedback cycle
        report_config: Report configuration
        background: Whether to generate the report in the background (default: True)
    """
    try:
        # Use the new report service
        from app.services.report_service import generate_report
        
        result = await generate_report(
            db, 
            cycle_id, 
            report_config.include_comments,
            report_config.anonymize,
            report_config.format,
            background
        )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate report"
        )


@router.get("/{cycle_id}/report")
async def get_cycle_report(
    cycle_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Download a cycle report
    """
    try:
        report_info = await get_report(db, cycle_id)
        
        if not os.path.exists(report_info["report_path"]):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report file not found"
            )
        
        return FileResponse(
            report_info["report_path"],
            filename=os.path.basename(report_info["report_path"])
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving report: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve report"
        )


@router.get("/{cycle_id}/analytics", response_model=Dict[str, Any])
async def get_cycle_analytics(
    cycle_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Get analytics for a cycle
    """
    try:
        cycle = await get_cycle(db, cycle_id)
        if not cycle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cycle not found"
            )
        
        return {
            "success": True,
            "analytics": cycle.analytics
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving cycle analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve cycle analytics"
        )


@router.get("/{cycle_id}/ai-summary", response_model=Dict[str, Any])
async def get_cycle_ai_summary(
    cycle_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_hr_or_admin_user),
):
    """
    Get AI-generated summary of cycle feedback
    """
    try:
        from app.services.report_service import generate_ai_summary
        
        result = await generate_ai_summary(db, cycle_id)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating AI summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate AI summary"
        )