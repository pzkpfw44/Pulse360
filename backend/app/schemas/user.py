from typing import Optional
from pydantic import BaseModel, EmailStr, UUID4, Field
from datetime import datetime


# Shared properties
class UserBase(BaseModel):
    """Base user schema with shared properties"""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = True


# Properties to receive via API on creation
class UserCreate(UserBase):
    """User creation schema"""
    email: EmailStr
    password: str
    full_name: str
    role: str = "hr"


# Properties to receive via API on update
class UserUpdate(UserBase):
    """User update schema"""
    password: Optional[str] = None


# Properties shared by models stored in DB
class UserInDBBase(UserBase):
    """Base user DB schema"""
    id: UUID4
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Properties to return via API
class User(UserInDBBase):
    """User response schema"""
    pass


# Properties stored in DB
class UserInDB(UserInDBBase):
    """User in DB schema with password hash"""
    hashed_password: str


# Schema for login
class UserLogin(BaseModel):
    """Login request schema"""
    email: EmailStr
    password: str


# Schema for password reset request
class PasswordResetRequest(BaseModel):
    """Password reset request schema"""
    email: EmailStr


# Schema for password reset
class PasswordReset(BaseModel):
    """Password reset schema"""
    token: str
    new_password: str = Field(..., min_length=8)