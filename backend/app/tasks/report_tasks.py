import logging
import os
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime

from sqlalchemy import create_engine, and_
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings
from app.core.pdf import create_pdf_report
from app.models.feedback import Feedback
from app.models.cycle import FeedbackCycle
from app.models.user import User
from app.models.template import FeedbackTemplate
from app.models.document import Document
from app.services.report_service import generate_report_data
from .celery_app import celery_app
from .email_tasks import send_report_notification

logger = logging.getLogger(__name__)

# Create SQLAlchemy engine and session factory
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """
    Get a database session
    
    Returns:
        Database session
    """
    db = SessionLocal()
    try:
        return db
    finally:
        db.close()


@celery_app.task(name="generate_feedback_report")
def generate_feedback_report(
    cycle_id: uuid.UUID,
    include_comments: bool = True,
    anonymize: bool = True,
    format: str = "pdf",
    notify_recipient: bool = True
) -> Dict[str, Any]:
    """
    Generate a feedback report for a cycle
    
    Args:
        cycle_id: ID of the feedback cycle
        include_comments: Whether to include comments
        anonymize: Whether to anonymize evaluators
        format: Report format
        notify_recipient: Whether to notify the recipient
        
    Returns:
        Result of the report generation
    """
    db = get_db()
    try:
        # Get cycle
        cycle = db.query(FeedbackCycle).filter(FeedbackCycle.id == cycle_id).first()
        if not cycle:
            return {"success": False, "message": "Cycle not found"}
        
        # Get completed feedback items
        feedback_items = db.query(Feedback).filter(
            and_(
                Feedback.cycle_id == cycle_id,
                Feedback.status == "completed"
            )
        ).all()
        
        if not feedback_items:
            return {"success": False, "message": "No completed feedback available"}
        
        # Get template
        template = db.query(FeedbackTemplate).filter(FeedbackTemplate.id == cycle.template_id).first()
        if not template:
            return {"success": False, "message": "Template not found"}
        
        # Get subject
        subject = db.query(User).filter(User.id == cycle.subject_id).first()
        if not subject:
            return {"success": False, "message": "Subject not found"}
        
        # Generate report data
        report_data = generate_report_data(cycle, template, subject, feedback_items, anonymize)
        
        # Create reports directory if it doesn't exist
        reports_dir = os.path.join(settings.UPLOAD_FOLDER, "reports")
        os.makedirs(reports_dir, exist_ok=True)
        
        # Generate report filename
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        filename = f"report_{cycle.id}_{timestamp}.{format}"
        report_path = os.path.join(reports_dir, filename)
        
        # Generate the report based on format
        if format == "pdf":
            create_pdf_report(report_path, report_data, include_comments)
        else:
            # For now, we only support PDF
            return {"success": False, "message": f"Unsupported format: {format}"}
        
        # Update cycle with report path
        cycle.report_generated = True
        cycle.report_path = report_path
        db.commit()
        
        # Notify recipient if requested
        if notify_recipient:
            send_report_notification.delay(str(cycle_id), str(cycle.creator_id))
        
        return {
            "success": True,
            "report_path": report_path,
            "message": "Report generated successfully"
        }
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        return {"success": False, "message": f"Error: {str(e)}"}
    finally:
        db.close()


@celery_app.task(name="delete_old_reports")
def delete_old_reports(days_old: int = 30) -> Dict[str, Any]:
    """
    Delete reports older than the specified number of days
    
    Args:
        days_old: Number of days old to delete
        
    Returns:
        Result of the deletion operation
    """
    db = get_db()
    try:
        # Get cycles with reports
        cycles = db.query(FeedbackCycle).filter(
            FeedbackCycle.report_generated == True,
            FeedbackCycle.report_path.isnot(None)
        ).all()
        
        # Calculate cutoff date
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        deleted_count = 0
        
        for cycle in cycles:
            # Check if report file exists
            if not os.path.exists(cycle.report_path):
                # Report file already missing, update cycle
                cycle.report_generated = False
                cycle.report_path = None
                continue
            
            # Check file modification time
            mod_time = datetime.fromtimestamp(os.path.getmtime(cycle.report_path))
            if mod_time < cutoff_date:
                # Delete file
                try:
                    os.remove(cycle.report_path)
                    cycle.report_generated = False
                    cycle.report_path = None
                    deleted_count += 1
                except Exception as e:
                    logger.error(f"Error deleting report file {cycle.report_path}: {str(e)}")
        
        db.commit()
        
        return {
            "success": True,
            "deleted_count": deleted_count,
            "message": f"Deleted {deleted_count} old reports"
        }
    except Exception as e:
        logger.error(f"Error deleting old reports: {str(e)}")
        return {"success": False, "message": f"Error: {str(e)}"}
    finally:
        db.close()