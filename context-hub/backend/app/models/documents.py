# Content for context-hub/backend/app/models/documents.py
@"
"""
Document models for ContextHub.
"""
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from shared.db.base import Base

class Document(Base):
    """
    Document model for storing uploaded files.
    """
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    file_path = Column(String)
    flux_file_id = Column(String, nullable=True)
    mime_type = Column(String)
    tags = Column(JSONB, default=list)
    uploader_id = Column(Integer, ForeignKey("users.id"))
    processed_status = Column(String, default="pending")  # pending, processing, processed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    uploader = relationship("User")
    
    def __repr__(self) -> str:
        return f"<Document {self.title}>"
"@ | Out-File -FilePath "context-hub/backend/app/models/documents.py" -Encoding utf8