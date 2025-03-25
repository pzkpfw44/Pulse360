import uuid
from sqlalchemy import Column, String, Text, Boolean, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class FeedbackTemplate(Base):
    """
    Database model for feedback question templates
    """
    # Template metadata
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Template content
    questions = Column(JSON, nullable=False)  # Array of question objects
    
    # Template settings
    creator_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    creator = relationship("User", foreign_keys=[creator_id])
    is_default = Column(Boolean, default=False)