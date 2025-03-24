import uuid
from sqlalchemy import Column, String, Text, Boolean, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class FeedbackCycle(Base):
    """
    Database model for feedback cycles in ControlHub
    """
    # Cycle metadata
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="draft")  # draft, active, completed, archived
    
    # Relations
    subject_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    subject = relationship("User", foreign_keys=[subject_id])
    
    creator_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    creator = relationship("User", foreign_keys=[creator_id])
    
    template_id = Column(UUID(as_uuid=True), ForeignKey("feedbacktemplate.id"), nullable=False)
    template = relationship("FeedbackTemplate")
    
    # Configuration and data
    config = Column(JSON, nullable=True)  # Deadlines, settings, etc
    document_ids = Column(JSON, nullable=True)  # Array of document IDs for context
    
    # Report status
    report_generated = Column(Boolean, default=False)
    report_path = Column(String, nullable=True)
    
    # Analytics
    analytics = Column(JSON, nullable=True)  # Completion stats and other metrics