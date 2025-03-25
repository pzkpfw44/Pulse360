from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, UUID4, Field, EmailStr, validator
from datetime import datetime

from app.schemas.template import Question


class FeedbackAnswerBase(BaseModel):
    """Base schema for feedback answers"""
    question_id: str
    value: Union[str, int, List[str], Dict[str, Any]]
    comment: Optional[str] = None


class FeedbackAnswerCreate(FeedbackAnswerBase):
    """Schema for creating a feedback answer"""
    pass


class FeedbackAnswer(FeedbackAnswerBase):
    """Schema for feedback answer response"""
    pass


# Shared properties
class FeedbackBase(BaseModel):
    """Base feedback schema with shared properties"""
    cycle_id: UUID4
    status: str = "pending"  # pending, started, completed
    
    @validator('status')
    def validate_status(cls, v):
        allowed_statuses = ['pending', 'started', 'completed']
        if v not in allowed_statuses:
            raise ValueError(f"Status must be one of {allowed_statuses}")
        return v


# Properties to receive via API on creation
class FeedbackCreate(FeedbackBase):
    """Schema for feedback creation"""
    evaluator_email: EmailStr
    evaluator_id: Optional[UUID4] = None
    relation: str = Field(..., description="Relation to subject: peer, manager, direct_report, self, other")
    
    @validator('relation')
    def validate_relation(cls, v):
        allowed_relations = ['peer', 'manager', 'direct_report', 'self', 'other']
        if v not in allowed_relations:
            raise ValueError(f"Relation must be one of {allowed_relations}")
        return v


# Properties to receive via API on update
class FeedbackUpdate(BaseModel):
    """Schema for feedback update"""
    status: Optional[str] = None
    answers: Optional[List[FeedbackAnswerCreate]] = None
    draft_answers: Optional[List[FeedbackAnswerCreate]] = None
    comments: Optional[str] = None


# Properties shared by models stored in DB
class FeedbackInDBBase(FeedbackBase):
    """Base feedback DB schema"""
    id: UUID4
    evaluator_id: Optional[UUID4] = None
    evaluator_email: EmailStr
    answers: Optional[List[Dict[str, Any]]] = None
    draft_answers: Optional[List[Dict[str, Any]]] = None
    comments: Optional[str] = None
    last_saved_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Properties to return via API
class Feedback(FeedbackInDBBase):
    """Feedback response schema"""
    pass


# Properties stored in DB
class FeedbackInDB(FeedbackInDBBase):
    """Feedback in DB schema"""
    pass


# Schema for feedback search
class FeedbackSearch(BaseModel):
    """Schema for feedback search"""
    cycle_id: Optional[UUID4] = None
    evaluator_id: Optional[UUID4] = None
    evaluator_email: Optional[EmailStr] = None
    status: Optional[str] = None
    limit: Optional[int] = 50
    offset: Optional[int] = 0


# Schema for public feedback form
class FeedbackForm(BaseModel):
    """Schema for feedback form to be shown to evaluators"""
    id: UUID4
    cycle_id: UUID4
    cycle_title: str
    subject_name: str
    evaluator_email: EmailStr
    status: str
    questions: List[Question]
    draft_answers: Optional[List[FeedbackAnswer]] = None
    deadline: Optional[datetime] = None


# Schema for saving draft
class SaveDraftRequest(BaseModel):
    """Schema for saving draft answers"""
    answers: List[FeedbackAnswerCreate]
    comments: Optional[str] = None


# Schema for submitting feedback
class SubmitFeedbackRequest(BaseModel):
    """Schema for submitting feedback"""
    answers: List[FeedbackAnswerCreate]
    comments: Optional[str] = None


# Schema for request to get AI assistance
class AIAssistanceRequest(BaseModel):
    """Schema for requesting AI assistance with feedback"""
    question_id: str
    current_text: str
    request_type: str = Field(..., description="Type of assistance: improve, expand, summarize, example")
    
    @validator('request_type')
    def validate_request_type(cls, v):
        allowed_types = ['improve', 'expand', 'summarize', 'example']
        if v not in allowed_types:
            raise ValueError(f"Request type must be one of {allowed_types}")
        return v


# Schema for AI assistance response
class AIAssistanceResponse(BaseModel):
    """Schema for AI assistance response"""
    improved_text: str
    suggestions: List[str]