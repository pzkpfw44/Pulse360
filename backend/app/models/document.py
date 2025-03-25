import uuid
from sqlalchemy import Column, String, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class Document(Base):
    """
    Database model for uploaded documents in ContextHub
    """
    # Document metadata
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # File information
    file_path = Column(String, nullable=False)
    flux_file_id = Column(String, nullable=True)
    mime_type = Column(String, nullable=False)
    
    # Categorization
    tags = Column(JSON, nullable=True)
    
    # Relations and status
    uploader_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    uploader = relationship("User", foreign_keys=[uploader_id])
    processed_status = Column(String, default="pending")  # pending, processing, processed, error