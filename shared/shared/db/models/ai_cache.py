"""
AI cache models.
"""
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSONB

from ..base import Base

class AICache(Base):
    """
    Cache for AI responses.
    """
    __tablename__ = "ai_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    request_hash = Column(String, unique=True, index=True)
    response_data = Column(JSONB)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    
    def __repr__(self) -> str:
        return f"<AICache {self.request_hash}>"