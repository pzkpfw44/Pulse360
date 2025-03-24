import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class AccessToken(Base):
    """
    Database model for access tokens used by evaluators
    """
    # Token data
    token = Column(String, unique=True, index=True, nullable=False)
    
    # Relations
    feedback_id = Column(UUID(as_uuid=True), ForeignKey("feedback.id"), nullable=False)
    feedback = relationship("Feedback")
    
    # Security and tracking
    ip_address = Column(String, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_count = Column(Integer, default=0)