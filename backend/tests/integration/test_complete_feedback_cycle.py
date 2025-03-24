import pytest
import uuid
from datetime import datetime, timedelta
from fastapi import status
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.template import FeedbackTemplate
from app.models.cycle import FeedbackCycle
from app.models.feedback import Feedback
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_complete_feedback_cycle(
    async_client: AsyncClient,
    admin_token: str,
    hr_token: str,
    admin_user: User,
    hr_user: User,
    subject_user: User,
    db_session: AsyncSession,
    override_get_db: None
):
    """
    Complete end-to-end test of the feedback cycle flow:
    1. Create template
    2. Create cycle
    3. Add evaluators
    4. Access and submit feedback
    5. Generate report
    """
    # Step 1: Create a template
    template_data = {
        "title": "E2E Test Template",
        "description": "Template for E2E testing",
        "questions": [
            {
                "id": "q1",
                "text": "Rate the employee's technical skills",
                "type": "rating",
                "required": True,
                "options": [
                    {"value": 1, "label": "Poor"},
                    {"value": 2, "label": "Fair"},
                    {"value": 3, "label": "Good"},
                    {"value": 4, "label": "Very Good"},
                    {"value": 5, "label": "Excellent"}
                ],
                "category": "Technical Skills"
            },
            {
                "id": "q2",
                "text": "Describe the employee's strengths",
                "type": "textarea",
                "required": True,
                "category": "Strengths"
            },
            {
                "id": "q3",
                "text": "Suggest areas for improvement",
                "type": "textarea",
                "required": True,
                "category": "Areas for Improvement"
            }
        ],
        "is_default": False
    }
    
    template_response = await async_client.post(
        "/api/templates",
        json=template_data,
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    
    assert template_response.status_code == status.HTTP_200_OK
    template = template_response.json()
    assert template["title"] == template_data["title"]
    template_id = template["id"]
    
    # Step 2: Create a feedback cycle
    future_date = (datetime.now() + timedelta(days=14)).date().isoformat()
    cycle_data = {
        "title": "E2E Test Cycle",
        "description": "Cycle for E2E testing",
        "status": "draft",
        "subject_id": str(subject_user.id),
        "template_id": template_id,
        "config": {
            "deadline": future_date,
            "anonymous": True,
            "allow_self_assessment": False,
            "reminder_days": 3
        }
    }
    
    cycle_response = await async_client.post(
        "/api/cycles",
        json=cycle_data,
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    
    assert cycle_response.status_code == status.HTTP_200_OK
    cycle = cycle_response.json()
    assert cycle["title"] == cycle_data["title"]
    cycle_id = cycle["id"]
    
    # Step 3: Add evaluators to the cycle
    evaluators_data = {
        "evaluators": [
            {
                "email": "e2e_evaluator1@example.com",
                "relation": "peer"
            },
            {
                "email": "e2e_evaluator2@example.com",
                "relation": "direct_report"
            }
        ]
    }
    
    invitations_response = await async_client.post(
        f"/api/cycles/{cycle_id}/send-invitations",
        json=evaluators_data,
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    
    assert invitations_response.status_code == status.HTTP_200_OK
    assert invitations_response.json()["invitations_sent"] == 2
    
    # Step 4: Activate the cycle
    activate_response = await async_client.put(
        f"/api/cycles/{cycle_id}",
        json={"status": "active"},
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    
    assert activate_response.status_code == status.HTTP_200_OK
    assert activate_response.json()["status"] == "active"
    
    # Step 5: Get cycle status to retrieve feedback IDs
    status_response = await async_client.get(
        f"/api/cycles/{cycle_id}/status",
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    
    assert status_response.status_code == status.HTTP_200_OK
    cycle_status = status_response.json()
    assert len(cycle_status["evaluators"]) == 2
    
    # Step 6: Get tokens for each evaluator
    for evaluator in cycle_status["evaluators"]:
        # Create token for feedback
        token_response = await async_client.post(
            f"/api/feedback/{evaluator['id']}/token",
            headers={"Authorization": f"Bearer {hr_token}"}
        )
        
        assert token_response.status_code == status.HTTP_200_OK
        token = token_response.json()["token"]
        
        # Step 7: Access feedback form using token
        form_response = await async_client.get(
            f"/api/feedback/public/{token}"
        )
        
        assert form_response.status_code == status.HTTP_200_OK
        form = form_response.json()
        assert form["cycle_id"] == cycle_id
        
        # Step 8: Save draft feedback
        draft_data = {
            "answers": [
                {
                    "question_id": "q1",
                    "value": 4
                },
                {
                    "question_id": "q2",
                    "value": "The employee has excellent problem-solving skills and technical knowledge."
                },
                {
                    "question_id": "q3",
                    "value": "Could improve communication and documentation practices."
                }
            ],
            "comments": "This is a draft comment for E2E testing."
        }
        
        draft_response = await async_client.post(
            f"/api/feedback/public/{token}/save-draft",
            json=draft_data
        )
        
        assert draft_response.status_code == status.HTTP_200_OK
        assert draft_response.json()["status"] == "started"
        
        # Step 9: Submit final feedback
        submit_data = {
            "answers": [
                {
                    "question_id": "q1",
                    "value": 5
                },
                {
                    "question_id": "q2",
                    "value": "The employee demonstrates exceptional problem-solving abilities and deep technical expertise."
                },
                {
                    "question_id": "q3",
                    "value": "Could benefit from improved communication with stakeholders and more thorough documentation."
                }
            ],
            "comments": "This is a final comment for E2E testing."
        }
        
        submit_response = await async_client.post(
            f"/api/feedback/public/{token}/submit",
            json=submit_data
        )
        
        assert submit_response.status_code == status.HTTP_200_OK
        assert submit_response.json()["status"] == "completed"
    
    # Step 10: Mark cycle as completed
    complete_response = await async_client.put(
        f"/api/cycles/{cycle_id}",
        json={"status": "completed"},
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    
    assert complete_response.status_code == status.HTTP_200_OK
    assert complete_response.json()["status"] == "completed"
    
    # Step 11: Generate report
    report_data = {
        "include_comments": True,
        "anonymize": True,
        "format": "pdf"
    }
    
    report_response = await async_client.post(
        f"/api/cycles/{cycle_id}/generate-report",
        json=report_data,
        headers={"Authorization": f"Bearer {hr_token}"},
        params={"background": False}  # Run synchronously for testing
    )
    
    assert report_response.status_code == status.HTTP_200_OK
    assert report_response.json()["success"] is True
    
    # Step 12: Generate AI summary
    summary_response = await async_client.get(
        f"/api/cycles/{cycle_id}/ai-summary",
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    
    assert summary_response.status_code == status.HTTP_200_OK
    assert "summary" in summary_response.json()
    
    # Step 13: Verify final analytics
    analytics_response = await async_client.get(
        f"/api/cycles/{cycle_id}/analytics",
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    
    assert analytics_response.status_code == status.HTTP_200_OK
    analytics = analytics_response.json()
    assert analytics["analytics"]["completion_rate"] == 100.0