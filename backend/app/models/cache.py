from sqlalchemy import Column, String, JSON, DateTime
from app.db.base_class import Base


class AICache(Base):
    """
    Database model for caching AI responses
    """
    # Cache key
    request_hash = Column(String, unique=True, index=True, nullable=False)
    
    # Cached data
    response_data = Column(JSON, nullable=False)
    
    # Expiration
    expires_at = Column(DateTime(timezone=True), nullable=False)