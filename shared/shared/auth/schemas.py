"""
Authentication schemas.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

class Token(BaseModel):
    """
    Token schema.
    """
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """
    Token data schema.
    """
    username: Optional[str] = None

class UserBase(BaseModel):
    """
    Base user schema.
    """
    email: EmailStr
    full_name: str
    role: str = Field(..., pattern="^(admin|hr|evaluator)$")
    is_active: bool = True

class UserCreate(UserBase):
    """
    User creation schema.
    """
    password: str = Field(..., min_length=8)

class User(UserBase):
    """
    User schema.
    """
    id: int
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        """
        Pydantic configuration.
        """
        from_attributes = True