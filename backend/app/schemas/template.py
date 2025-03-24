from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, UUID4, Field, validator
from datetime import datetime


class QuestionOption(BaseModel):
    """Schema for question option (multiple choice/rating)"""
    value: Union[int, str]
    label: str


class Question(BaseModel):
    """Schema for a question in a feedback template"""
    id: str
    text: str
    description: Optional[str] = None
    type: str = Field(..., description="Type of question: text, textarea, rating, multiplechoice, checkbox")
    required: bool = True
    options: Optional[List[QuestionOption]] = None
    category: Optional[str] = None
    
    @validator('type')
    def validate_type(cls, v):
        allowed_types = ['text', 'textarea', 'rating', 'multiplechoice', 'checkbox']
        if v not in allowed_types:
            raise ValueError(f"Question type must be one of {allowed_types}")
        return v
    
    @validator('options')
    def validate_options(cls, v, values):
        if values.get('type') in ['rating', 'multiplechoice', 'checkbox'] and not v:
            raise ValueError(f"Options are required for {values.get('type')} questions")
        return v


class CategoryCreate(BaseModel):
    """Schema for creating a question category"""
    name: str
    description: Optional[str] = None


class Category(CategoryCreate):
    """Schema for a question category"""
    id: str


# Shared properties
class TemplateBase(BaseModel):
    """Base template schema with shared properties"""
    title: str
    description: Optional[str] = None
    questions: List[Question]
    is_default: Optional[bool] = False


# Properties to receive via API on creation
class TemplateCreate(TemplateBase):
    """Schema for template creation"""
    pass


# Properties to receive via API on update
class TemplateUpdate(BaseModel):
    """Schema for template update"""
    title: Optional[str] = None
    description: Optional[str] = None
    questions: Optional[List[Question]] = None
    is_default: Optional[bool] = None


# Properties shared by models stored in DB
class TemplateInDBBase(TemplateBase):
    """Base template DB schema"""
    id: UUID4
    creator_id: UUID4
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Properties to return via API
class Template(TemplateInDBBase):
    """Template response schema"""
    pass


# Properties stored in DB
class TemplateInDB(TemplateInDBBase):
    """Template in DB schema"""
    pass


# Schema for template search
class TemplateSearch(BaseModel):
    """Schema for template search"""
    query: Optional[str] = None
    is_default: Optional[bool] = None
    creator_id: Optional[UUID4] = None
    limit: Optional[int] = 50
    offset: Optional[int] = 0