import os
import pytest
import asyncio
from typing import AsyncGenerator, Generator
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from httpx import AsyncClient

from app.main import app
from app.db.base_class import Base
from app.db.session import get_db
from app.core.config import settings
from app.core.security import create_access_token
from app.models.user import User
from app.models.document import Document
from app.models.template import FeedbackTemplate
from app.models.cycle import FeedbackCycle
from app.models.feedback import Feedback
from app.models.token import AccessToken


# Test database URL
TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/pulse360_test"


# Create test database engine
engine = create_async_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# Fixture for the FastAPI app
@pytest.fixture
def app() -> FastAPI:
    return app


# Fixture for the test client
@pytest.fixture
def client() -> Generator:
    with TestClient(app) as c:
        yield c


# Fixture for the async test client
@pytest.fixture
async def async_client() -> AsyncGenerator:
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


# Fixture for the database session
@pytest.fixture
async def db_session() -> AsyncGenerator:
    # Create the database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    # Create a new session for testing
    async with TestingSessionLocal() as session:
        yield session


# Override the get_db dependency
@pytest.fixture
async def override_get_db(db_session: AsyncSession) -> AsyncGenerator:
    async def _override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = _override_get_db
    yield
    app.dependency_overrides.clear()


# Create a test admin user
@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(
        email="admin@example.com",
        hashed_password="$2b$12$Qh4Gg0tjL5mzvjt5f8QQW.XZbM5GD2vVqCF96RODKGXrdZDr5HfQu",  # testpassword
        full_name="Admin User",
        role="admin",
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


# Create a test HR user
@pytest.fixture
async def hr_user(db_session: AsyncSession) -> User:
    user = User(
        email="hr@example.com",
        hashed_password="$2b$12$Qh4Gg0tjL5mzvjt5f8QQW.XZbM5GD2vVqCF96RODKGXrdZDr5HfQu",  # testpassword
        full_name="HR User",
        role="hr",
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


# Create a test subject user
@pytest.fixture
async def subject_user(db_session: AsyncSession) -> User:
    user = User(
        email="subject@example.com",
        hashed_password="$2b$12$Qh4Gg0tjL5mzvjt5f8QQW.XZbM5GD2vVqCF96RODKGXrdZDr5HfQu",  # testpassword
        full_name="Subject User",
        role="user",
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


# Create a test evaluator user
@pytest.fixture
async def evaluator_user(db_session: AsyncSession) -> User:
    user = User(
        email="evaluator@example.com",
        hashed_password="$2b$12$Qh4Gg0tjL5mzvjt5f8QQW.XZbM5GD2vVqCF96RODKGXrdZDr5HfQu",  # testpassword
        full_name="Evaluator User",
        role="user",
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


# Create a test document
@pytest.fixture
async def test_document(db_session: AsyncSession, admin_user: User) -> Document:
    document = Document(
        title="Test Document",
        description="Test Description",
        file_path="/app/uploads/test_document.pdf",
        mime_type="application/pdf",
        tags=["test", "document"],
        uploader_id=admin_user.id,
        processed_status="processed"
    )
    db_session.add(document)
    await db_session.commit()
    await db_session.refresh(document)
    return document


# Create a test template
@pytest.fixture
async def test_template(db_session: AsyncSession, admin_user: User) -> FeedbackTemplate:
    template = FeedbackTemplate(
        title="Test Template",
        description="Test Template Description",
        questions=[
            {
                "id": "q1",
                "text": "Test Question 1",
                "type": "rating",
                "required": True,
                "options": [
                    {"value": 1, "label": "Poor"},
                    {"value": 2, "label": "Fair"},
                    {"value": 3, "label": "Good"},
                    {"value": 4, "label": "Very Good"},
                    {"value": 5, "label": "Excellent"}
                ]
            },
            {
                "id": "q2",
                "text": "Test Question 2",
                "type": "text",
                "required": True
            }
        ],
        creator_id=admin_user.id,
        is_default=True
    )
    db_session.add(template)
    await db_session.commit()
    await db_session.refresh(template)
    return template


# Create a test cycle
@pytest.fixture
async def test_cycle(
    db_session: AsyncSession,
    hr_user: User,
    subject_user: User,
    test_template: FeedbackTemplate
) -> FeedbackCycle:
    cycle = FeedbackCycle(
        title="Test Cycle",
        description="Test Cycle Description",
        status="active",
        subject_id=subject_user.id,
        creator_id=hr_user.id,
        template_id=test_template.id,
        config={
            "deadline": "2025-12-31",
            "anonymous": True,
            "allow_self_assessment": False
        },
        analytics={
            "total_evaluators": 0,
            "completed_count": 0,
            "completion_rate": 0.0,
            "pending_count": 0,
            "started_count": 0
        }
    )
    db_session.add(cycle)
    await db_session.commit()
    await db_session.refresh(cycle)
    return cycle


# Create a test feedback
@pytest.fixture
async def test_feedback(
    db_session: AsyncSession,
    test_cycle: FeedbackCycle,
    evaluator_user: User
) -> Feedback:
    feedback = Feedback(
        cycle_id=test_cycle.id,
        evaluator_id=evaluator_user.id,
        evaluator_email=evaluator_user.email,
        status="pending"
    )
    db_session.add(feedback)
    await db_session.commit()
    await db_session.refresh(feedback)
    return feedback


# Create a test access token
@pytest.fixture
async def test_token(db_session: AsyncSession, test_feedback: Feedback) -> AccessToken:
    token = AccessToken(
        token="test-token-12345",
        feedback_id=test_feedback.id,
        expires_at="2025-12-31 23:59:59",
        used_count=0
    )
    db_session.add(token)
    await db_session.commit()
    await db_session.refresh(token)
    return token


# Generate a JWT token for a user
@pytest.fixture
def admin_token(admin_user: User) -> str:
    return create_access_token(admin_user.id)


@pytest.fixture
def hr_token(hr_user: User) -> str:
    return create_access_token(hr_user.id)