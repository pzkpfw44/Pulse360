import pytest
from fastapi import status
from httpx import AsyncClient
from tests.utils.templates import create_test_template


@pytest.mark.asyncio
async def test_complete_feedback_cycle_flow(
    client: AsyncClient,
    admin_token_headers: dict,
    test_db
):
    """
    Integration test for the complete feedback cycle flow:
    1. Create template
    2. Create cycle
    3. Add evaluators
    4. Access feedback form
    5. Submit feedback
    6. Generate report
    """
    # Step 1: Create a template
    template_data = {
        "title": "Integration Test Template",
        "description": "Template for integration testing",
        "is_default": False,
        "questions": [
            {
                "id": "q1",
                "text": "How would you rate the employee's technical skills?",
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
                "text": "How effectively does the employee communicate?",
                "type": "rating",
                "required": True,
                "options": [
                    {"value": 1, "label": "Poor"},
                    {"value": 2, "label": "Fair"},
                    {"value": 3, "label": "Good"},
                    {"value": 4, "label": "Very Good"},
                    {"value": 5, "label": "Excellent"}
                ],
                "category": "Communication"
            },
            {
                "id": "q3",
                "text": "What are the employee's key strengths?",
                "type": "textarea",
                "required": True,
                "category": "Strengths"
            },
            {
                "id": "q4",
                "text": "What areas could the employee improve?",
                "type": "textarea",
                "required": True,
                "category": "Areas for Improvement"
            }
        ]
    }
    
    template_response = await client.post(
        "/api/templates",
        json=template_data,
        headers=admin_token_headers
    )
    assert template_response.status_code == status.HTTP_200_OK
    template = template_response.json()
    
    # Step 2: Create a cycle using the template
    cycle_data = {
        "title": "Integration Test Cycle",
        "description": "Cycle for integration testing",
        "status": "draft",
        "subject_id": "00000000-0000-0000-0000-000000000001",  # Admin user
        "template_id": template["id"],
        "config": {
            "deadline": (datetime.now() + timedelta(days=14)).isoformat().split('T')[0],
            "anonymous": True,
            "allow_self_assessment": False,
            "reminder_days": 3,
            "notify_subject": True
        }
    }
    
    cycle_response = await client.post(
        "/api/cycles",
        json=cycle_data,
        headers=admin_token_headers
    )
    assert cycle_response.status_code == status.HTTP_200_OK
    cycle = cycle_response.json()
    
    # Step 3: Add evaluators to the cycle
    evaluators_data = {
        "evaluators": [
            {
                "email": "evaluator1@example.com",
                "relation": "peer"
            },
            {
                "email": "evaluator2@example.com",
                "relation": "direct_report"
            }
        ]
    }
    
    invitations_response = await client.post(
        f"/api/cycles/{cycle['id']}/send-invitations",
        json=evaluators_data,
        headers=admin_token_headers
    )
    assert invitations_response.status_code == status.HTTP_200_OK
    assert invitations_response.json()["invitations_sent"] == 2
    
    # Step 4: Get cycle status to get feedback IDs
    status_response = await client.get(
        f"/api/cycles/{cycle['id']}/status",
        headers=admin_token_headers
    )
    assert status_response.status_code == status.HTTP_200_OK
    cycle_status = status_response.json()
    
    # Step 5: Create access tokens for the evaluators
    evaluator_tokens = []
    for evaluator in cycle_status["evaluators"]:
        token_response = await client.post(
            f"/api/feedback/{evaluator['id']}/token",
            headers=admin_token_headers
        )
        assert token_response.status_code == status.HTTP_200_OK
        evaluator_tokens.append(token_response.json()["token"])
    
    # Step 6: Access feedback form as evaluator
    for token in evaluator_tokens:
        form_response = await client.get(
            f"/api/feedback/public/{token}"
        )
        assert form_response.status_code == status.HTTP_200_OK
        feedback_form = form_response.json()
        
        # Step 7: Save draft
        draft_data = {
            "answers": [
                {
                    "question_id": "q1",
                    "value": 4
                },
                {
                    "question_id": "q2",
                    "value": 3
                },
                {
                    "question_id": "q3",
                    "value": "The employee is very dedicated and has strong problem-solving skills."
                },
                {
                    "question_id": "q4",
                    "value": "Could improve time management and documentation practices."
                }
            ],
            "comments": "Draft comments for integration test."
        }
        
        draft_response = await client.post(
            f"/api/feedback/public/{token}/save-draft",
            json=draft_data
        )
        assert draft_response.status_code == status.HTTP_200_OK
        
        # Step 8: Submit final feedback
        submit_data = {
            "answers": [
                {
                    "question_id": "q1",
                    "value": 5
                },
                {
                    "question_id": "q2",
                    "value": 4
                },
                {
                    "question_id": "q3",
                    "value": "The employee is exceptionally dedicated and has outstanding problem-solving skills."
                },
                {
                    "question_id": "q4",
                    "value": "Could improve time management and invest more in documentation practices."
                }
            ],
            "comments": "Final comments for integration test."
        }
        
        submit_response = await client.post(
            f"/api/feedback/public/{token}/submit",
            json=submit_data
        )
        assert submit_response.status_code == status.HTTP_200_OK
    
    # Step 9: Update cycle to completed
    update_cycle_data = {
        "status": "completed"
    }
    
    update_response = await client.put(
        f"/api/cycles/{cycle['id']}",
        json=update_cycle_data,
        headers=admin_token_headers
    )
    assert update_response.status_code == status.HTTP_200_OK
    
    # Step 10: Generate report
    report_data = {
        "include_comments": True,
        "anonymize": True,
        "format": "pdf"
    }
    
    report_response = await client.post(
        f"/api/cycles/{cycle['id']}/generate-report",
        json=report_data,
        headers=admin_token_headers,
        params={"background": False}  # Run synchronously for testing
    )
    assert report_response.status_code == status.HTTP_200_OK
    report_result = report_response.json()
    assert report_result["success"] is True
    
    # Step 11: Get AI summary
    summary_response = await client.get(
        f"/api/cycles/{cycle['id']}/ai-summary",
        headers=admin_token_headers
    )
    assert summary_response.status_code == status.HTTP_200_OK
    summary = summary_response.json()
    assert "summary" in summary
    
    # Step 12: Verify final analytics
    analytics_response = await client.get(
        f"/api/cycles/{cycle['id']}/analytics",
        headers=admin_token_headers
    )
    assert analytics_response.status_code == status.HTTP_200_OK
    analytics = analytics_response.json()
    assert analytics["analytics"]["completion_rate"] == 100.0