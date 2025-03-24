import os
import pytest
import tempfile
from httpx import AsyncClient
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.document import Document


@pytest.mark.asyncio
async def test_list_documents(
    async_client: AsyncClient,
    admin_user: User,
    test_document: Document,
    admin_token: str,
    override_get_db: None
):
    """Test listing documents"""
    response = await async_client.get(
        "/api/documents",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(d["title"] == "Test Document" for d in data)


@pytest.mark.asyncio
async def test_get_document(
    async_client: AsyncClient,
    admin_user: User,
    test_document: Document,
    admin_token: str,
    override_get_db: None
):
    """Test getting a document by ID"""
    response = await async_client.get(
        f"/api/documents/{test_document.id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == test_document.title
    assert data["description"] == test_document.description
    assert data["tags"] == test_document.tags


@pytest.mark.asyncio
async def test_get_document_not_found(
    async_client: AsyncClient,
    admin_token: str,
    override_get_db: None
):
    """Test getting a document that doesn't exist"""
    response = await async_client.get(
        "/api/documents/00000000-0000-0000-0000-000000000000",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 404
    assert "detail" in response.json()


@pytest.mark.asyncio
async def test_get_tags(
    async_client: AsyncClient,
    admin_token: str,
    test_document: Document,
    override_get_db: None
):
    """Test getting all document tags"""
    response = await async_client.get(
        "/api/documents/tags",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    tags = response.json()
    assert isinstance(tags, list)
    assert "test" in tags
    assert "document" in tags


@pytest.mark.asyncio
async def test_update_document(
    async_client: AsyncClient,
    admin_token: str,
    test_document: Document,
    override_get_db: None
):
    """Test updating a document"""
    update_data = {
        "title": "Updated Document Title",
        "description": "Updated description",
        "tags": ["updated", "test"]
    }
    
    response = await async_client.put(
        f"/api/documents/{test_document.id}",
        json=update_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == update_data["title"]
    assert data["description"] == update_data["description"]
    assert data["tags"] == update_data["tags"]


@pytest.mark.asyncio
async def test_delete_document(
    async_client: AsyncClient,
    admin_token: str,
    db_session: AsyncSession,
    override_get_db: None
):
    """Test deleting a document"""
    # Create a new document to delete
    document = Document(
        title="Document to Delete",
        description="This document will be deleted",
        file_path="/app/uploads/test_delete.pdf",
        mime_type="application/pdf",
        tags=["delete", "test"],
        uploader_id=str(admin_token),
        processed_status="processed"
    )
    db_session.add(document)
    await db_session.commit()
    await db_session.refresh(document)
    
    response = await async_client.delete(
        f"/api/documents/{document.id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    
    # Verify the document is deleted
    response = await async_client.get(
        f"/api/documents/{document.id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 404


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires file upload which is complex to test")
async def test_upload_document(
    async_client: AsyncClient,
    admin_token: str,
    override_get_db: None
):
    """Test uploading a document"""
    # Create a temporary file
    with tempfile.NamedTemporaryFile(suffix=".txt") as tmp:
        tmp.write(b"Test file content")
        tmp.flush()
        tmp.seek(0)
        
        files = {"file": (os.path.basename(tmp.name), tmp, "text/plain")}
        
        data = {
            "title": "Uploaded Test Document",
            "description": "Uploaded test description",
            "tags": "test,upload"
        }
        
        response = await async_client.post(
            "/api/documents",
            files=files,
            data=data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Uploaded Test Document"
    assert data["description"] == "Uploaded test description"
    assert "test" in data["tags"]
    assert "upload" in data["tags"]