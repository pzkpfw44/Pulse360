import logging
import os
import uuid
import statistics
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.flux_ai import flux_ai_client
from app.models.cycle import FeedbackCycle
from app.models.feedback import Feedback
from app.models.template import FeedbackTemplate
from app.models.user import User
from app.models.document import Document
from app.tasks.report_tasks import generate_feedback_report as generate_report_task

logger = logging.getLogger(__name__)


async def generate_report(
    db: AsyncSession,
    cycle_id: uuid.UUID,
    include_comments: bool = True,
    anonymize: bool = True,
    format: str = "pdf",
    background: bool = True
) -> Dict[str, Any]:
    """
    Generate a feedback report for a cycle
    
    Args:
        db: Database session
        cycle_id: ID of the feedback cycle
        include_comments: Whether to include comments
        anonymize: Whether to anonymize evaluators
        format: Report format
        background: Whether to generate the report in the background
        
    Returns:
        Result of the report generation
    """
    # Get cycle
    cycle_query = select(FeedbackCycle).where(FeedbackCycle.id == cycle_id)
    result = await db.execute(cycle_query)
    cycle = result.scalars().first()
    
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cycle not found"
        )
    
    # Get completed feedback items
    feedback_query = select(Feedback).where(
        and_(
            Feedback.cycle_id == cycle_id,
            Feedback.status == "completed"
        )
    )
    result = await db.execute(feedback_query)
    feedback_items = result.scalars().all()
    
    if not feedback_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No completed feedback available for report generation"
        )
    
    # Generate the report
    if background:
        # Generate in background
        task = generate_report_task.delay(
            str(cycle_id),
            include_comments,
            anonymize,
            format,
            True  # Notify recipient
        )
        
        return {
            "success": True,
            "task_id": task.id,
            "message": "Report generation started in the background"
        }
    else:
        # Generate synchronously
        # Create reports directory if it doesn't exist
        reports_dir = os.path.join(settings.UPLOAD_FOLDER, "reports")
        os.makedirs(reports_dir, exist_ok=True)
        
        # Get template
        template_query = select(FeedbackTemplate).where(FeedbackTemplate.id == cycle.template_id)
        result = await db.execute(template_query)
        template = result.scalars().first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        # Get subject
        subject_query = select(User).where(User.id == cycle.subject_id)
        result = await db.execute(subject_query)
        subject = result.scalars().first()
        
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subject not found"
            )
        
        # Generate report data
        report_data = generate_report_data(cycle, template, subject, feedback_items, anonymize)
        
        # Generate timestamp for filename
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        filename = f"report_{cycle.id}_{timestamp}.{format}"
        report_path = os.path.join(reports_dir, filename)
        
        # Generate report based on format
        from app.core.pdf import create_pdf_report
        
        if format == "pdf":
            create_pdf_report(report_path, report_data, include_comments)
        else:
            # For now, we only support PDF
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported format: {format}"
            )
        
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
    Get the report for a cycle
    
    Args:
        db: Database session
        cycle_id: ID of the feedback cycle
        
    Returns:
        Report information
    """
    # Get cycle
    cycle_query = select(FeedbackCycle).where(FeedbackCycle.id == cycle_id)
    result = await db.execute(cycle_query)
    cycle = result.scalars().first()
    
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cycle not found"
        )
    
    # Check if report exists
    if not cycle.report_generated or not cycle.report_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not generated"
        )
    
    # Check if file exists
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
        "generated_at": datetime.fromtimestamp(os.path.getmtime(cycle.report_path)),
        "format": os.path.splitext(cycle.report_path)[1][1:],
    }


async def generate_ai_summary(
    db: AsyncSession,
    cycle_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Generate an AI summary of the feedback for a cycle
    
    Args:
        db: Database session
        cycle_id: ID of the feedback cycle
        
    Returns:
        Summary text
    """
    # Get cycle
    cycle_query = select(FeedbackCycle).where(FeedbackCycle.id == cycle_id)
    result = await db.execute(cycle_query)
    cycle = result.scalars().first()
    
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cycle not found"
        )
    
    # Get completed feedback items
    feedback_query = select(Feedback).where(
        and_(
            Feedback.cycle_id == cycle_id,
            Feedback.status == "completed"
        )
    )
    result = await db.execute(feedback_query)
    feedback_items = result.scalars().all()
    
    if not feedback_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No completed feedback available for summary"
        )
    
    # Get template
    template_query = select(FeedbackTemplate).where(FeedbackTemplate.id == cycle.template_id)
    result = await db.execute(template_query)
    template = result.scalars().first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Get subject
    subject_query = select(User).where(User.id == cycle.subject_id)
    result = await db.execute(subject_query)
    subject = result.scalars().first()
    
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )
    
    # Get attachments if available
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
    
    # Prepare the feedback data for the AI
    all_feedback = []
    question_map = {q["id"]: q["text"] for q in template.questions}
    
    for feedback in feedback_items:
        if not feedback.answers:
            continue
        
        feedback_answers = []
        for answer in feedback.answers:
            question_text = question_map.get(answer["question_id"], "Unknown question")
            feedback_answers.append({
                "question": question_text,
                "answer": answer["value"],
                "comment": answer.get("comment")
            })
        
        if feedback_answers:
            all_feedback.append({
                "evaluator": "Anonymous" if True else feedback.evaluator_email,
                "answers": feedback_answers,
                "comments": feedback.comments
            })
    
    # Create prompt for the AI
    messages = [
        {
            "role": "user",
            "content": f"""I need a comprehensive summary of 360-degree feedback for {subject.full_name}. 
            This feedback is part of the "{cycle.title}" cycle.
            
            Please analyze the following feedback and provide:
            1. Key strengths identified consistently across feedback
            2. Areas for improvement or development
            3. Specific actionable recommendations
            4. Overall summary of the feedback
            
            Here is the feedback data:
            {all_feedback}
            
            Please provide a well-structured summary that would be useful for the subject's professional development.
            """
        }
    ]
    
    preamble = """You are an expert in analyzing 360-degree feedback. Your task is to summarize feedback objectively and constructively.
    Focus on patterns and trends across multiple evaluators, and provide actionable insights.
    Be specific, balanced, and developmental in your analysis.
    Structure your response with clear sections for strengths, areas for improvement, and recommendations."""
    
    try:
        # Call Flux AI
        mode = "rag" if attachments else None
        response = await flux_ai_client.chat_completion(
            messages=messages,
            attachments=attachments,
            preamble=preamble,
            mode=mode
        )
        
        # Extract the summary text
        summary_text = response["choices"][0]["message"]["content"]
        
        return {
            "success": True,
            "summary": summary_text
        }
    except Exception as e:
        logger.error(f"Error generating AI summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate AI summary"
        )


def generate_report_data(
    cycle: FeedbackCycle,
    template: FeedbackTemplate,
    subject: User,
    feedback_items: List[Feedback],
    anonymize: bool = True
) -> Dict[str, Any]:
    """
    Generate report data from feedback
    
    Args:
        cycle: Feedback cycle
        template: Feedback template
        subject: Subject user
        feedback_items: List of feedback items
        anonymize: Whether to anonymize evaluators
        
    Returns:
        Processed report data
    """
    # Process the template questions
    question_map = {}
    question_categories = {}
    for question in template.questions:
        q_id = question["id"]
        question_map[q_id] = question
        
        # Group questions by category
        category = question.get("category", "General")
        if category not in question_categories:
            question_categories[category] = []
        question_categories[category].append(question)
    
    # Process feedback answers
    question_responses = {}
    for feedback in feedback_items:
        if not feedback.answers:
            continue
        
        # Get evaluator info
        evaluator_info = {
            "id": str(feedback.id),
            "email": feedback.evaluator_email if not anonymize else "Anonymous",
            "submitted_at": feedback.submitted_at.isoformat() if feedback.submitted_at else None
        }
        
        # Process each answer
        for answer in feedback.answers:
            q_id = answer["question_id"]
            if q_id not in question_responses:
                question_responses[q_id] = []
            
            # Add response
            question_responses[q_id].append({
                "evaluator": evaluator_info,
                "value": answer["value"],
                "comment": answer.get("comment")
            })
    
    # Calculate statistics for rating/multiple choice questions
    question_stats = {}
    for q_id, responses in question_responses.items():
        question = question_map.get(q_id)
        if not question:
            continue
        
        q_type = question["type"]
        
        if q_type == "rating":
            # Calculate stats for ratings
            values = [r["value"] for r in responses if isinstance(r["value"], (int, float))]
            if values:
                question_stats[q_id] = {
                    "count": len(values),
                    "average": round(sum(values) / len(values), 2),
                    "median": round(statistics.median(values), 2) if len(values) > 0 else None,
                    "min": min(values),
                    "max": max(values)
                }
        
        elif q_type == "multiplechoice":
            # Calculate counts for each option
            counts = {}
            for response in responses:
                value = response["value"]
                if value not in counts:
                    counts[value] = 0
                counts[value] += 1
            
            question_stats[q_id] = {
                "count": len(responses),
                "option_counts": counts
            }
    
    # Collect all comments
    all_comments = []
    for feedback in feedback_items:
        if feedback.comments:
            all_comments.append({
                "evaluator": feedback.evaluator_email if not anonymize else "Anonymous",
                "comment": feedback.comments
            })
    
    # Prepare report data
    report_data = {
        "title": f"360° Feedback Report - {subject.full_name}",
        "cycle": {
            "id": str(cycle.id),
            "title": cycle.title,
            "description": cycle.description,
            "created_at": cycle.created_at.isoformat()
        },
        "subject": {
            "id": str(subject.id),
            "name": subject.full_name,
            "email": subject.email
        },
        "feedback_count": len(feedback_items),
        "generated_at": datetime.utcnow().isoformat(),
        "categories": question_categories,
        "questions": question_map,
        "responses": question_responses,
        "stats": question_stats,
        "comments": all_comments
    }
    
    return report_data