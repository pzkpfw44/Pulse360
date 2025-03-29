"""
Event logging models.
"""
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSONB

from ..base import Base

class EventLog(Base):
    """
    Log of events for cross-module communication.
    """
    __tablename__ = "event_log"
    
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, index=True)
    event_data = Column(JSONB)
    source_module = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self) -> str:
        return f"<EventLog {self.event_type}>"