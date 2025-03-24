from typing import Optional
from pydantic import BaseModel, UUID4


class Token(BaseModel):
    """Schema for authentication token response"""
    access_token: str
    token_type: str


class TokenPayload(BaseModel):
    """Schema for JWT token payload"""
    sub: Optional[UUID4] = None
    exp: Optional[int] = None
    jti: Optional[str] = None