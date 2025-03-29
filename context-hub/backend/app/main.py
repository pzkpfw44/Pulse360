"""
Main application module.
"""
import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

# Import from shared package
from shared import setup_shared
from shared.auth import get_current_user, router as auth_router

# Setup shared package
setup_shared("context_hub")

# Initialize FastAPI app
app = FastAPI(title="Context Hub API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include authentication router
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])

# Include module routers
from app.api.routers import router as api_router
app.include_router(api_router, prefix="/api", tags=["API"])

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok", "module": "context_hub"}