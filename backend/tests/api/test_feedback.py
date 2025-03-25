import pytest
from fastapi import status
from httpx import AsyncClient
import uuid
from tests.utils.feedback import (
    create_test_feedback,
    create_test_token,
    get_feedback_form_data,
    create_test_answers
)
from tests.utils.cycles import create_test_cycle


@pytest.mark.asyncio
async def test_create_feedback(
    client: AsyncClient, 
    admin_token_headers: dict, 
    test_db
):
    """Test creating a new feedback entry."""
    # First create a cycle
    cycle_response = await create_test_cycle(client, admin_token_headers)
    cycle_id = cycle_response["id"]
    
    # Create feedback data
    feedback_data = {
        "cycle_id": str(cycle_id),
        "evaluator_email": "evaluator@example.com",
        "relation": "peer"
    }
    
    # Create feedback
    response = await client.post(
        "/api/feedback",
        json=feedback_data,
        headers=admin_token_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["evaluator_email"] == "evaluator@example.com"
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_get_feedback(
    client: AsyncClient, 
    admin_token_headers: dict, 
    test_db
):
    """Test getting a feedback by ID."""
    # Create test feedback
    feedback = await create_test_feedback(client, admin_token_headers)
    feedback_id = feedback["id"]
    
    # Get feedback
    response = await client.get(
        f"/api/feedback/{feedback_id}",
        headers=admin_token_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == feedback_id
    assert data["evaluator_email"] == feedback["evaluator_email"]


@pytest.mark.asyncio
async def test_list_feedback(
    client: AsyncClient, 
    admin_token_headers: dict, 
    test_db
):
    """Test listing feedback with filters."""
    # Create test feedback
    feedback = await create_test_feedback(client, admin_token_headers)
    cycle_id = feedback["cycle_id"]
    
    # List feedback
    response = await client.get(
        f"/api/feedback?cycle_id={cycle_id}",
        headers=admin_token_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) >= 1
    assert any(f["id"] == feedback["id"] for f in data)


@pytest.mark.asyncio
async def test_update_feedback(
    client: AsyncClient, 
    admin_token_headers: dict, 
    test_db
):
    """Test updating a feedback entry."""
    # Create test feedback
    feedback = await create_test_feedback(client, admin_token_headers)
    feedback_id = feedback["id"]
    
    # Update data
    update_data = {
        "status": "started",
        "draft_answers": [
            {
                "question_id": "q1",
                "value": "Test answer"
            }
        ]
    }
    
    # Update feedback
    response = await client.put(
        f"/api/feedback/{feedback_id}",
        json=update_data,
        headers=admin_token_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "started"
    assert len(data["draft_answers"]) == 1
    assert data["draft_answers"][0]["question_id"] == "q1"


@pytest.mark.asyncio
async def test_delete_feedback(
    client: AsyncClient, 
    admin_token_headers: dict, 
    test_db
):
    """Test deleting a feedback entry."""
    # Create test feedback
    feedback = await create_test_feedback(client, admin_token_headers)
    feedback_id = feedback["id"]
    
    # Delete feedback
    response = await client.delete(
        f"/api/feedback/{feedback_id}",
        headers=admin_token_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True
    
    # Verify it's gone
    response = await client.get(
        f"/api/feedback/{feedback_id}",
        headers=admin_token_headers
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.asyncio
async def test_create_token(
    client: AsyncClient, 
    admin_token_headers: dict, 
    test_db
):
    """Test creating a token for feedback."""
    # Create test feedback
    feedback = await create_test_feedback(client, admin_token_headers)
    feedback_id = feedback["id"]
    
    # Create token
    response = await client.post(
        f"/api/feedback/{feedback_id}/token",
        headers=admin_token_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True
    assert "token" in data
    assert "expires_at" in data


@pytest.mark.asyncio
async def test_reset_token(
    client: AsyncClient, 
    admin_token_headers: dict, 
    test_db
):
    """Test resetting a token for feedback."""
    # Create test feedback with token
    feedback = await create_test_feedback(client, admin_token_headers)
    feedback_id = feedback["id"]
    token_response = await client.post(
        f"/api/feedback/{feedback_id}/token",
        headers=admin_token_headers
    )
    old_token = token_response.json()["token"]
    
    # Reset token
    response = await client.post(
        f"/api/feedback/{feedback_id}/reset-token",
        headers=admin_token_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True
    assert data["token"] != old_token


@pytest.mark.asyncio
async def test_get_public_feedback_form(
    client: AsyncClient, 
    admin_token_headers: dict, 
    test_db
):
    """Test accessing the public feedback form with a token."""
    # Create test feedback with token
    feedback = await create_test_feedback(client, admin_token_headers)
    token = await create_test_token(client, admin_token_headers, feedback["id"])
    
    # Get feedback form
    response = await client.get(
        f"/api/feedback/public/{token}",
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == feedback["id"]
    assert "questions" in data
    assert data["evaluator_email"] == feedback["evaluator_email"]


@pytest.mark.asyncio
async def test_save_draft(
    client: AsyncClient, 
    admin_token_headers: dict, 
    test_db
):
    """Test saving a draft for feedback."""
    # Create test feedback with token
    feedback = await create_test_feedback(client, admin_token_headers)
    token = await create_test_token(client, admin_token_headers, feedback["id"])
    
    # Create draft data
    draft_data = {
        "answers": [
            {
                "question_id": "q1",
                "value": "Draft answer"
            }
        ],
        "comments": "Draft comments"
    }
    
    # Save draft
    response = await client.post(
        f"/api/feedback/public/{token}/save-draft",
        json=draft_data
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True
    assert data["status"] == "started"
    assert "last_saved_at" in data


@pytest.mark.asyncio
async def test_submit_feedback(
    client: AsyncClient, 
    admin_token_headers: dict, 
    test_db
):
    """Test submitting feedback."""
    # Create test feedback with token
    feedback = await create_test_feedback(client, admin_token_headers)
    token = await create_test_token(client, admin_token_headers, feedback["id"])
    
    # Get form to understand required fields
    form_response = await client.get(f"/api/feedback/public/{token}")
    form = form_response.json()
    
    # Create answers based on form questions
    answers = create_test_answers(form["questions"])
    
    # Submit data
    submit_data = {
        "answers": answers,
        "comments": "Final submission comments"
    }
    
    # Submit feedback
    response = await client.post(
        f"/api/feedback/public/{token}/submit",
        json=submit_data
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True
    assert data["status"] == "completed"
    assert "submitted_at" in data


@pytest.mark.asyncio
async def test_get_ai_assistance(
    client: AsyncClient, 
    admin_token_headers: dict, 
    test_db
):
    """Test getting AI assistance for feedback."""
    # Create test feedback with token
    feedback = await create_test_feedback(client, admin_token_headers)
    token = await create_test_token(client, admin_token_headers, feedback["id"])
    
    # AI assistance request
    assist_data = {
        "question_id": "q1",
        "current_text": "This is my current answer that needs improvement.",
        "request_type": "improve"
    }
    
    # Request AI assistance
    response = await client.post(
        f"/api/feedback/public/{token}/ai-assist",
        json=assist_data
    )
    
    # Note: The actual response depends on the AI service
    # Here we just check the structure of the response
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "improved_text" in data
    assert "suggestions" in data