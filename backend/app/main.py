import logging
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.api.auth import router as auth_router
from app.api.context_hub import router as context_hub_router
from app.api.template import router as template_router
from app.api.control_hub import router as control_hub_router
from app.api.feedback_hub import router as feedback_hub_router
from app.core.config import settings
from app.db.session import get_db
from app.db.init_db import init_db
from sqlalchemy.orm import Session

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Pulse360 API",
    description="API for the Pulse360 360-degree feedback platform",
    version="1.0.0",
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(context_hub_router, prefix=f"{settings.API_V1_STR}/documents", tags=["documents"])
app.include_router(template_router, prefix=f"{settings.API_V1_STR}/templates", tags=["templates"])
app.include_router(control_hub_router, prefix=f"{settings.API_V1_STR}/cycles", tags=["cycles"])
app.include_router(feedback_hub_router, prefix=f"{settings.API_V1_STR}/feedback", tags=["feedback"])


@app.on_event("startup")
async def startup_event():
    """
    Initialize application on startup
    """
    db = next(get_db())
    init_db(db)
    logger.info("Application startup complete")


@app.get("/health")
def health_check():
    """
    Health check endpoint
    """
    return {"status": "ok"}