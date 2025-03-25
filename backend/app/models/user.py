import uuid
from sqlalchemy import Boolean, Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base


class User(Base):
    """
    Database model for application users including HR and admin roles
    """
    # Overriding id from Base to add more specific docs
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # User authentication fields
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    # User information
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # 'hr', 'admin'
    
    # Account status
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime(timezone=True), nullable=True)