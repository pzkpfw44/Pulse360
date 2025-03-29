"""
API routers.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from shared.db import get_db
from shared.auth import get_current_user
from .document_routes import router as document_router

router = APIRouter()

# Include document routes
router.include_router(document_router, tags=["Documents"])

@router.get("/hello")
async def hello_world(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Example endpoint.
    """
    return {
        "message": "Hello from context-hub!",
        "user": current_user.email
    }