import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


@pytest.mark.asyncio
async def test_login_success(
    async_client: AsyncClient,
    admin_user: User,
    override_get_db: None
):
    """Test successful login"""
    response = await async_client.post(
        "/api/auth/login/json",
        json={
            "email": "admin@example.com",
            "password": "testpassword"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_invalid_credentials(
    async_client: AsyncClient,
    admin_user: User,
    override_get_db: None
):
    """Test login with invalid credentials"""
    response = await async_client.post(
        "/api/auth/login/json",
        json={
            "email": "admin@example.com",
            "password": "wrongpassword"
        }
    )
    
    assert response.status_code == 401
    assert "detail" in response.json()


@pytest.mark.asyncio
async def test_login_inactive_user(
    async_client: AsyncClient,
    db_session: AsyncSession,
    admin_user: User,
    override_get_db: None
):
    """Test login with inactive user"""
    # Make the user inactive
    admin_user.is_active = False
    db_session.add(admin_user)
    await db_session.commit()
    
    response = await async_client.post(
        "/api/auth/login/json",
        json={
            "email": "admin@example.com",
            "password": "testpassword"
        }
    )
    
    assert response.status_code == 400
    assert "detail" in response.json()
    
    # Make the user active again for other tests
    admin_user.is_active = True
    db_session.add(admin_user)
    await db_session.commit()


@pytest.mark.asyncio
async def test_get_current_user(
    async_client: AsyncClient,
    admin_user: User,
    admin_token: str,
    override_get_db: None
):
    """Test getting the current user"""
    response = await async_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == admin_user.email
    assert data["full_name"] == admin_user.full_name
    assert data["role"] == admin_user.role


@pytest.mark.asyncio
async def test_get_current_user_no_token(
    async_client: AsyncClient,
    override_get_db: None
):
    """Test getting the current user without a token"""
    response = await async_client.get("/api/auth/me")
    
    assert response.status_code == 401
    assert "detail" in response.json()


@pytest.mark.asyncio
async def test_get_current_user_invalid_token(
    async_client: AsyncClient,
    override_get_db: None
):
    """Test getting the current user with an invalid token"""
    response = await async_client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid-token"}
    )
    
    assert response.status_code == 401
    assert "detail" in response.json()