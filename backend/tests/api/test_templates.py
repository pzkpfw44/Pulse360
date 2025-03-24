import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.template import FeedbackTemplate


@pytest.mark.asyncio
async def test_list_templates(
    async_client: AsyncClient,
    admin_token: str,
    test_template: FeedbackTemplate,
    override_get_db: None
):
    """Test listing templates"""
    response = await async_client.get(
        "/api/templates",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(t["title"] == "Test Template" for t in data)


@pytest.mark.asyncio
async def test_get_template(
    async_client: AsyncClient,
    admin_token: str,
    test_template: FeedbackTemplate,
    override_get_db: None
):
    """Test getting a template by ID"""
    response = await async_client.get(
        f"/api/templates/{test_template.id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == test_template.title
    assert data["description"] == test_template.description
    assert len(data["questions"]) == 2
    assert data["is_default"] is True


@pytest.mark.asyncio
async def test_get_template_not_found(
    async_client: AsyncClient,
    admin_token: str,
    override_get_db: None
):
    """Test getting a template that doesn't exist"""
    response = await async_client.get(
        "/api/templates/00000000-0000-0000-0000-000000000000",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 404
    assert "detail" in response.json()


@pytest.mark.asyncio
async def test_get_default_template(
    async_client: AsyncClient,
    admin_token: str,
    test_template: FeedbackTemplate,
    override_get_db: None
):
    """Test getting the default template"""
    response = await async_client.get(
        "/api/templates/default",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["is_default"] is True
    assert data["title"] == test_template.title


@pytest.mark.asyncio
async def test_create_template(
    async_client: AsyncClient,
    admin_token: str,
    admin_user: User,
    override_get_db: None
):
    """Test creating a new template"""
    template_data = {
        "title": "New Test Template",
        "description": "New Test Template Description",
        "questions": [
            {
                "id": "q1",
                "text": "New Test Question 1",
                "type": "rating",
                "required": True,
                "options": [
                    {"value": 1, "label": "Poor"},
                    {"value": 2, "label": "Fair"},
                    {"value": 3, "label": "Good"},
                    {"value": 4, "label": "Very Good"},
                    {"value": 5, "label": "Excellent"}
                ]
            }
        ],
        "is_default": False
    }
    
    response = await async_client.post(
        "/api/templates",
        json=template_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == template_data["title"]
    assert data["description"] == template_data["description"]
    assert len(data["questions"]) == 1
    assert data["is_default"] is False


@pytest.mark.asyncio
async def test_update_template(
    async_client: AsyncClient,
    admin_token: str,
    admin_user: User,
    db_session: AsyncSession,
    override_get_db: None
):
    """Test updating a template"""
    # Create a new template for updating
    template = FeedbackTemplate(
        title="Template to Update",
        description="This template will be updated",
        questions=[
            {
                "id": "q1",
                "text": "Original Question",
                "type": "text",
                "required": True
            }
        ],
        creator_id=admin_user.id,
        is_default=False
    )
    db_session.add(template)
    await db_session.commit()
    await db_session.refresh(template)
    
    update_data = {
        "title": "Updated Template Title",
        "description": "Updated description",
        "questions": [
            {
                "id": "q1",
                "text": "Updated Question",
                "type": "text",
                "required": True
            },
            {
                "id": "q2",
                "text": "New Question",
                "type": "rating",
                "required": False,
                "options": [
                    {"value": 1, "label": "Low"},
                    {"value": 2, "label": "Medium"},
                    {"value": 3, "label": "High"}
                ]
            }
        ]
    }
    
    response = await async_client.put(
        f"/api/templates/{template.id}",
        json=update_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == update_data["title"]
    assert data["description"] == update_data["description"]
    assert len(data["questions"]) == 2
    assert data["questions"][0]["text"] == "Updated Question"
    assert data["questions"][1]["text"] == "New Question"


@pytest.mark.asyncio
async def test_delete_template(
    async_client: AsyncClient,
    admin_token: str,
    admin_user: User,
    db_session: AsyncSession,
    override_get_db: None
):
    """Test deleting a template"""
    # Create a new template to delete
    template = FeedbackTemplate(
        title="Template to Delete",
        description="This template will be deleted",
        questions=[
            {
                "id": "q1",
                "text": "Question in template to delete",
                "type": "text",
                "required": True
            }
        ],
        creator_id=admin_user.id,
        is_default=False
    )
    db_session.add(template)
    await db_session.commit()
    await db_session.refresh(template)
    
    response = await async_client.delete(
        f"/api/templates/{template.id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    
    # Verify the template is deleted
    response = await async_client.get(
        f"/api/templates/{template.id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_clone_template(
    async_client: AsyncClient,
    admin_token: str,
    test_template: FeedbackTemplate,
    override_get_db: None
):
    """Test cloning a template"""
    response = await async_client.post(
        f"/api/templates/{test_template.id}/clone",
        params={"new_title": "Cloned Test Template"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Cloned Test Template"
    assert data["description"] == test_template.description
    assert len(data["questions"]) == len(test_template.questions)
    assert data["is_default"] is False  # Clones should not be default