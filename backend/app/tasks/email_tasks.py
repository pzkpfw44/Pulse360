import logging
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime

import emails
from emails.template import JinjaTemplate
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings
from app.models.feedback import Feedback
from app.models.cycle import FeedbackCycle
from app.models.user import User
from .celery_app import celery_app

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


def send_email(
    email_to: str,
    subject: str,
    template_str: str,
    environment: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Send an email using the emails library
    
    Args:
        email_to: Recipient email
        subject: Email subject
        template_str: HTML template string
        environment: Template variables
        
    Returns:
        Response dict
    """
    if not settings.SMTP_HOST:
        logger.info(f"Would send email to {email_to}: {subject}")
        return {"success": True, "message": "Email sending is disabled"}
    
    try:
        message = emails.html(
            html=JinjaTemplate(template_str),
            subject=subject,
            mail_from=(settings.SMTP_USER, "Pulse360")
        )
        
        smtp = {
            "host": settings.SMTP_HOST,
            "port": settings.SMTP_PORT,
            "user": settings.SMTP_USER,
            "password": settings.SMTP_PASSWORD,
            "tls": True,
        }
        
        response = message.send(
            to=email_to,
            render=environment,
            smtp=smtp
        )
        
        if response.status_code not in [250, 200]:
            logger.error(f"Error sending email to {email_to}: {response}")
            return {"success": False, "message": f"Error sending email: {response.status_code}"}
        
        return {"success": True, "message": "Email sent successfully"}
    except Exception as e:
        logger.error(f"Failed to send email to {email_to}: {str(e)}")
        return {"success": False, "message": f"Error sending email: {str(e)}"}


@celery_app.task(name="send_invitation_email")
def send_invitation_email(
    email: str,
    token: str,
    cycle_id: uuid.UUID,
    relation: str
) -> Dict[str, Any]:
    """
    Send invitation email to an evaluator
    
    Args:
        email: Email address of the evaluator
        token: Access token for the feedback
        cycle_id: ID of the feedback cycle
        relation: Relation to the subject
        
    Returns:
        Result of the email sending operation
    """
    db = get_db()
    try:
        # Get cycle and subject information
        cycle = db.query(FeedbackCycle).filter(FeedbackCycle.id == cycle_id).first()
        if not cycle:
            return {"success": False, "message": "Cycle not found"}
        
        subject = db.query(User).filter(User.id == cycle.subject_id).first()
        if not subject:
            return {"success": False, "message": "Subject not found"}
        
        # Create feedback URL
        feedback_url = f"{settings.FRONTEND_URL}/feedback/{token}"
        
        # Get deadline if any
        deadline = None
        if cycle.config and "deadline" in cycle.config:
            deadline = cycle.config["deadline"]
        
        # Prepare template
        template = """
        <html>
        <body>
            <h1>Pulse360 Feedback Invitation</h1>
            <p>Hello,</p>
            <p>You've been invited to provide feedback for <strong>{{ subject_name }}</strong> 
            as part of the <strong>{{ cycle_title }}</strong> feedback cycle.</p>
            
            <p>Your perspective as a <strong>{{ relation }}</strong> is valuable for their professional development.</p>
            
            {% if deadline %}
            <p>Please complete your feedback by <strong>{{ deadline }}</strong>.</p>
            {% endif %}
            
            <p>Click the button below to access the feedback form:</p>
            
            <p style="text-align: center;">
                <a href="{{ feedback_url }}" style="background-color: #4CAF50; color: white; padding: 10px 20px; 
                text-decoration: none; border-radius: 4px; display: inline-block;">
                    Provide Feedback
                </a>
            </p>
            
            <p>If you have any questions, please contact the HR team.</p>
            
            <p>Thank you,<br>
            Pulse360 Team</p>
        </body>
        </html>
        """
        
        # Prepare environment
        environment = {
            "subject_name": subject.full_name,
            "cycle_title": cycle.title,
            "relation": relation.replace("_", " ").title(),
            "feedback_url": feedback_url,
            "deadline": deadline,
        }
        
        # Send email
        return send_email(
            email_to=email,
            subject=f"Invitation to provide feedback for {subject.full_name}",
            template_str=template,
            environment=environment
        )
    except Exception as e:
        logger.error(f"Error sending invitation email: {str(e)}")
        return {"success": False, "message": f"Error: {str(e)}"}
    finally:
        db.close()


@celery_app.task(name="send_reminder_email")
def send_reminder_email(
    email: str,
    token: str,
    cycle_id: uuid.UUID,
    custom_message: Optional[str] = None
) -> Dict[str, Any]:
    """
    Send reminder email to an evaluator
    
    Args:
        email: Email address of the evaluator
        token: Access token for the feedback
        cycle_id: ID of the feedback cycle
        custom_message: Optional custom message
        
    Returns:
        Result of the email sending operation
    """
    db = get_db()
    try:
        # Get cycle and subject information
        cycle = db.query(FeedbackCycle).filter(FeedbackCycle.id == cycle_id).first()
        if not cycle:
            return {"success": False, "message": "Cycle not found"}
        
        subject = db.query(User).filter(User.id == cycle.subject_id).first()
        if not subject:
            return {"success": False, "message": "Subject not found"}
        
        # Create feedback URL
        feedback_url = f"{settings.FRONTEND_URL}/feedback/{token}"
        
        # Get deadline if any
        deadline = None
        if cycle.config and "deadline" in cycle.config:
            deadline = cycle.config["deadline"]
        
        # Calculate days remaining if deadline exists
        days_remaining = None
        if deadline:
            remaining = (deadline - datetime.utcnow().date()).days
            if remaining > 0:
                days_remaining = remaining
        
        # Prepare template
        template = """
        <html>
        <body>
            <h1>Pulse360 Feedback Reminder</h1>
            <p>Hello,</p>
            <p>This is a friendly reminder to complete your feedback for <strong>{{ subject_name }}</strong> 
            as part of the <strong>{{ cycle_title }}</strong> feedback cycle.</p>
            
            {% if days_remaining %}
            <p>You have <strong>{{ days_remaining }} days</strong> remaining to submit your feedback.</p>
            {% elif deadline %}
            <p>The deadline for submission is <strong>{{ deadline }}</strong>.</p>
            {% endif %}
            
            {% if custom_message %}
            <p><em>{{ custom_message }}</em></p>
            {% endif %}
            
            <p>Click the button below to access the feedback form:</p>
            
            <p style="text-align: center;">
                <a href="{{ feedback_url }}" style="background-color: #4CAF50; color: white; padding: 10px 20px; 
                text-decoration: none; border-radius: 4px; display: inline-block;">
                    Complete Feedback
                </a>
            </p>
            
            <p>Thank you,<br>
            Pulse360 Team</p>
        </body>
        </html>
        """
        
        # Prepare environment
        environment = {
            "subject_name": subject.full_name,
            "cycle_title": cycle.title,
            "feedback_url": feedback_url,
            "deadline": deadline,
            "days_remaining": days_remaining,
            "custom_message": custom_message,
        }
        
        # Send email
        return send_email(
            email_to=email,
            subject=f"Reminder: Feedback for {subject.full_name}",
            template_str=template,
            environment=environment
        )
    except Exception as e:
        logger.error(f"Error sending reminder email: {str(e)}")
        return {"success": False, "message": f"Error: {str(e)}"}
    finally:
        db.close()


@celery_app.task(name="send_completion_notification")
def send_completion_notification(
    feedback_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Send notification when feedback is completed
    
    Args:
        feedback_id: ID of the completed feedback
        
    Returns:
        Result of the email sending operation
    """
    db = get_db()
    try:
        # Get feedback information
        feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
        if not feedback:
            return {"success": False, "message": "Feedback not found"}
        
        # Get cycle and subject information
        cycle = db.query(FeedbackCycle).filter(FeedbackCycle.id == feedback.cycle_id).first()
        if not cycle:
            return {"success": False, "message": "Cycle not found"}
        
        subject = db.query(User).filter(User.id == cycle.subject_id).first()
        if not subject:
            return {"success": False, "message": "Subject not found"}
        
        # Get cycle creator (HR/admin)
        creator = db.query(User).filter(User.id == cycle.creator_id).first()
        if not creator:
            return {"success": False, "message": "Creator not found"}
        
        # Prepare template
        template = """
        <html>
        <body>
            <h1>Pulse360 Feedback Completion Notification</h1>
            <p>Hello {{ creator_name }},</p>
            <p>A new feedback for <strong>{{ subject_name }}</strong> in the 
            <strong>{{ cycle_title }}</strong> cycle has been completed.</p>
            
            <p><strong>Evaluator:</strong> {{ evaluator_email }}</p>
            <p><strong>Completed at:</strong> {{ completed_at }}</p>
            
            <p>You can review the feedback in the admin dashboard:</p>
            
            <p style="text-align: center;">
                <a href="{{ dashboard_url }}" style="background-color: #4CAF50; color: white; padding: 10px 20px; 
                text-decoration: none; border-radius: 4px; display: inline-block;">
                    Go to Dashboard
                </a>
            </p>
            
            <p>Thank you,<br>
            Pulse360 Team</p>
        </body>
        </html>
        """
        
        # Dashboard URL
        dashboard_url = f"{settings.FRONTEND_URL}/admin/cycles/{cycle.id}"
        
        # Prepare environment
        environment = {
            "creator_name": creator.full_name,
            "subject_name": subject.full_name,
            "cycle_title": cycle.title,
            "evaluator_email": feedback.evaluator_email,
            "completed_at": feedback.submitted_at.strftime("%Y-%m-%d %H:%M:%S") if feedback.submitted_at else "Unknown",
            "dashboard_url": dashboard_url,
        }
        
        # Send email
        return send_email(
            email_to=creator.email,
            subject=f"Feedback Completed: {subject.full_name} - {cycle.title}",
            template_str=template,
            environment=environment
        )
    except Exception as e:
        logger.error(f"Error sending completion notification: {str(e)}")
        return {"success": False, "message": f"Error: {str(e)}"}
    finally:
        db.close()


@celery_app.task(name="send_report_notification")
def send_report_notification(
    cycle_id: uuid.UUID,
    recipient_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Send notification when a report is generated
    
    Args:
        cycle_id: ID of the feedback cycle
        recipient_id: ID of the recipient (usually subject or HR)
        
    Returns:
        Result of the email sending operation
    """
    db = get_db()
    try:
        # Get cycle information
        cycle = db.query(FeedbackCycle).filter(FeedbackCycle.id == cycle_id).first()
        if not cycle:
            return {"success": False, "message": "Cycle not found"}
        
        # Get recipient information
        recipient = db.query(User).filter(User.id == recipient_id).first()
        if not recipient:
            return {"success": False, "message": "Recipient not found"}
        
        # Get subject information
        subject = db.query(User).filter(User.id == cycle.subject_id).first()
        if not subject:
            return {"success": False, "message": "Subject not found"}
        
        # Check if report is available
        if not cycle.report_generated or not cycle.report_path:
            return {"success": False, "message": "Report not available"}
        
        # Prepare template
        template = """
        <html>
        <body>
            <h1>Pulse360 Feedback Report Available</h1>
            <p>Hello {{ recipient_name }},</p>
            <p>The feedback report for <strong>{{ subject_name }}</strong> in the 
            <strong>{{ cycle_title }}</strong> cycle is now available.</p>
            
            <p>You can download the report from the dashboard:</p>
            
            <p style="text-align: center;">
                <a href="{{ report_url }}" style="background-color: #4CAF50; color: white; padding: 10px 20px; 
                text-decoration: none; border-radius: 4px; display: inline-block;">
                    Download Report
                </a>
            </p>
            
            <p>Thank you,<br>
            Pulse360 Team</p>
        </body>
        </html>
        """
        
        # Report URL
        report_url = f"{settings.FRONTEND_URL}/cycles/{cycle.id}/report"
        
        # Prepare environment
        environment = {
            "recipient_name": recipient.full_name,
            "subject_name": subject.full_name,
            "cycle_title": cycle.title,
            "report_url": report_url,
        }
        
        # Send email
        return send_email(
            email_to=recipient.email,
            subject=f"Feedback Report Available: {subject.full_name} - {cycle.title}",
            template_str=template,
            environment=environment
        )
    except Exception as e:
        logger.error(f"Error sending report notification: {str(e)}")
        return {"success": False, "message": f"Error: {str(e)}"}
    finally:
        db.close()