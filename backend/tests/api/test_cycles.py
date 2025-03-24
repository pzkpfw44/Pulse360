import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.cycle import FeedbackCycle
from app.models.template import FeedbackTemplate
from app.models.feedback import Feedback


@pytest.mark.asyncio
async def test_list_cycles(
    async_client: AsyncClient,
    hr_token: str,
    test_cycle: FeedbackCycle,
    override_get_db: None
):
    """Test listing feedback cycles"""
    response = await async_client.get(
        "/api/cycles",
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(c["title"] == "Test Cycle" for c in data)


@pytest.mark.asyncio
async def test_get_cycle(
    async_client: AsyncClient,
    hr_token: str,
    test_cycle: FeedbackCycle,
    override_get_db: None
):
    """Test getting a cycle by ID"""
    response = await async_client.get(
        f"/api/cycles/{test_cycle.id}",
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == test_cycle.title
    assert data["description"] == test_cycle.description
    assert data["status"] == test_cycle.status
    assert "template" in data


@pytest.mark.asyncio
async def test_get_cycle_not_found(
    async_client: AsyncClient,
    hr_token: str,
    override_get_db: None
):
    """Test getting a cycle that doesn't exist"""
    response = await async_client.get(
        "/api/cycles/00000000-0000-0000-0000-000000000000",
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    
    assert response.status_code == 404
    assert "detail" in response.json()


@pytest.mark.asyncio
async def test_create_cycle(
    async_client: AsyncClient,
    hr_token: str,
    hr_user: User,
    subject_user: User,
    test_template: FeedbackTemplate,
    override_get_db: None
):
    """Test creating a new feedback cycle"""
    cycle_data = {
        "title": "New Test Cycle",
        "description": "New Test Cycle Description",
        "status": "draft",
        "subject_id": str(subject_user.id),
        "template_id": str(test_template.id),
        "config": {
            "deadline": "2025-12-31",
            "anonymous": True,
            "allow_self_assessment": False
        }
    }
    
    response = await async_client.post(
        "/api/cycles",
        json=cycle_data,
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == cycle_data["title"]
    assert data["description"] == cycle_data["description"]
    assert data["status"] == cycle_data["status"]
    assert str(data["subject_id"]) == cycle_data["subject_id"]
    assert str(data["template_id"]) == cycle_data["template_id"]


@pytest.mark.asyncio
async def test_update_cycle(
    async_client: AsyncClient,
    hr_token: str,
    test_cycle: FeedbackCycle,
    override_get_db: None
):
    """Test updating a feedback cycle"""
    update_data = {
        "title": "Updated Cycle Title",
        "description": "Updated description",
        "status": "active"
    }
    
    response = await async_client.put(
        f"/api/cycles/{test_cycle.id}",
        json=update_data,
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == update_data["title"]
    assert data["description"] == update_data["description"]
    assert data["status"] == update_data["status"]


@pytest.mark.asyncio
async def test_delete_cycle(
    async_client: AsyncClient,
    hr_token: str,
    hr_user: User,
    subject_user: User,
    test_template: FeedbackTemplate,
    db_session: AsyncSession,
    override_get_db: None
):
    """Test deleting a feedback cycle"""
    # Create a new cycle to delete
    cycle = FeedbackCycle(
        title="Cycle to Delete",
        description="This cycle will be deleted",
        status="draft",  # Must be draft or can't delete
        subject_id=subject_user.id,
        creator_id=hr_user.id,
        template_id=test_template.id
    )
    db_session.add(cycle)
    await db_session.commit()
    await db_session.refresh(cycle)
    
    response = await async_client.delete(
        f"/api/cycles/{cycle.id}",
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    
    # Verify the cycle is deleted
    response = await async_client.get(
        f"/api/cycles/{cycle.id}",
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_cycle_status(
    async_client: AsyncClient,
    hr_token: str,
    test_cycle: FeedbackCycle,
    test_feedback: Feedback,
    override_get_db: None
):
    """Test getting cycle status"""
    response = await async_client.get(
        f"/api/cycles/{test_cycle.id}/status",
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_cycle.id)
    assert data["title"] == test_cycle.title
    assert data["status"] == test_cycle.status
    assert "analytics" in data
    assert "evaluators" in data
    assert len(data["evaluators"]) == 1


@pytest.mark.asyncio
async def test_get_cycle_analytics(
    async_client: AsyncClient,
    hr_token: str,
    test_cycle: FeedbackCycle,
    override_get_db: None
):
    """Test getting cycle analytics"""
    response = await async_client.get(
        f"/api/cycles/{test_cycle.id}/analytics",
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "analytics" in data
    assert "total_evaluators" in data["analytics"]
    assert "completion_rate" in data["analytics"]


@pytest.mark.asyncio
async def test_send_invitations(
    async_client: AsyncClient,
    hr_token: str,
    test_cycle: FeedbackCycle,
    override_get_db: None
):
    """Test sending invitations to evaluators"""
    invitation_data = {
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
    
    response = await async_client.post(
        f"/api/cycles/{test_cycle.id}/send-invitations",
        json=invitation_data,
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["invitations_sent"] == 2


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires report generation which is resource-intensive")
async def test_generate_report(
    async_client: AsyncClient,
    hr_token: str,
    test_cycle: FeedbackCycle,
    override_get_db: None
):
    """Test generating a report"""
    report_data = {
        "include_comments": True,
        "anonymize": True,
        "format": "pdf"
    }
    
    response = await async_client.post(
        f"/api/cycles/{test_cycle.id}/generate-report",
        json=report_data,
        headers={"Authorization": f"Bearer {hr_token}"},
        params={"background": "false"}  # Run synchronously for testing
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "report_path" in data