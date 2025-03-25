import uuid
from sqlalchemy import Column, String, Text, ForeignKey, JSON, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class Feedback(Base):
    """
    Database model for feedback submissions from evaluators
    """
    # Relations
    cycle_id = Column(UUID(as_uuid=True), ForeignKey("feedbackcycle.id"), nullable=False)
    cycle = relationship("FeedbackCycle")
    
    # Evaluator information (may be a user or external person)
    evaluator_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=True)
    evaluator = relationship("User", foreign_keys=[evaluator_id])
    evaluator_email = Column(String, nullable=True)
    
    # Status and data
    status = Column(String, nullable=False, default="pending")  # pending, started, completed
    answers = Column(JSON, nullable=True)  # Final submitted answers
    draft_answers = Column(JSON, nullable=True)  # Draft answers for auto-save
    comments = Column(Text, nullable=True)
    
    # Timestamps
    last_saved_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)