from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, UUID4, Field, validator, EmailStr
from datetime import datetime, date

from app.schemas.template import Template


class CycleConfig(BaseModel):
    """Schema for feedback cycle configuration"""
    deadline: Optional[date] = None
    anonymous: bool = True
    allow_self_assessment: bool = False
    reminder_days: Optional[int] = 3  # Days before deadline to send reminder
    notify_subject: bool = True  # Whether to notify the subject when feedback is submitted


class CycleAnalytics(BaseModel):
    """Schema for feedback cycle analytics"""
    total_evaluators: int = 0
    completed_count: int = 0
    completion_rate: float = 0.0
    pending_count: int = 0
    started_count: int = 0


class EvaluatorBase(BaseModel):
    """Base schema for evaluator"""
    email: EmailStr
    full_name: Optional[str] = None
    relation: str = Field(..., description="Relation to subject: peer, manager, direct_report, self, other")

    @validator('relation')
    def validate_relation(cls, v):
        allowed_relations = ['peer', 'manager', 'direct_report', 'self', 'other']
        if v not in allowed_relations:
            raise ValueError(f"Relation must be one of {allowed_relations}")
        return v


class EvaluatorCreate(EvaluatorBase):
    """Schema for creating an evaluator"""
    pass


class Evaluator(EvaluatorBase):
    """Schema for evaluator response"""
    id: UUID4
    status: str = "pending"  # pending, started, completed
    
    @validator('status')
    def validate_status(cls, v):
        allowed_statuses = ['pending', 'started', 'completed']
        if v not in allowed_statuses:
            raise ValueError(f"Status must be one of {allowed_statuses}")
        return v

    class Config:
        from_attributes = True


# Shared properties
class CycleBase(BaseModel):
    """Base cycle schema with shared properties"""
    title: str
    description: Optional[str] = None
    status: str = "draft"  # draft, active, completed, archived
    
    @validator('status')
    def validate_status(cls, v):
        allowed_statuses = ['draft', 'active', 'completed', 'archived']
        if v not in allowed_statuses:
            raise ValueError(f"Status must be one of {allowed_statuses}")
        return v


# Properties to receive via API on creation
class CycleCreate(CycleBase):
    """Schema for cycle creation"""
    subject_id: UUID4
    template_id: UUID4
    config: Optional[CycleConfig] = None
    document_ids: Optional[List[UUID4]] = None


# Properties to receive via API on update
class CycleUpdate(BaseModel):
    """Schema for cycle update"""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    config: Optional[CycleConfig] = None
    document_ids: Optional[List[UUID4]] = None


# Properties shared by models stored in DB
class CycleInDBBase(CycleBase):
    """Base cycle DB schema"""
    id: UUID4
    subject_id: UUID4
    creator_id: UUID4
    template_id: UUID4
    config: Optional[CycleConfig] = None
    document_ids: Optional[List[UUID4]] = None
    report_generated: bool = False
    report_path: Optional[str] = None
    analytics: Optional[CycleAnalytics] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Properties to return via API
class Cycle(CycleInDBBase):
    """Cycle response schema"""
    pass


# Properties stored in DB
class CycleInDB(CycleInDBBase):
    """Cycle in DB schema"""
    pass


# Schema for cycle search
class CycleSearch(BaseModel):
    """Schema for cycle search"""
    query: Optional[str] = None
    status: Optional[str] = None
    subject_id: Optional[UUID4] = None
    creator_id: Optional[UUID4] = None
    template_id: Optional[UUID4] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: Optional[int] = 50
    offset: Optional[int] = 0


# Schema for cycle with template details
class CycleWithTemplate(Cycle):
    """Schema for cycle with template details"""
    template: Template


# Schema for sending invitations
class SendInvitationsRequest(BaseModel):
    """Schema for sending invitations"""
    evaluators: List[EvaluatorCreate]
    message: Optional[str] = None


# Schema for sending reminders
class SendRemindersRequest(BaseModel):
    """Schema for sending reminders"""
    evaluator_ids: Optional[List[UUID4]] = None  # If not provided, send to all pending
    message: Optional[str] = None


# Schema for cycle status
class CycleStatus(BaseModel):
    """Schema for cycle status"""
    id: UUID4
    title: str
    status: str
    analytics: CycleAnalytics
    evaluators: List[Evaluator]


# Schema for generating a report
class GenerateReportRequest(BaseModel):
    """Schema for generating a report"""
    include_comments: bool = True
    anonymize: bool = True
    format: str = "pdf"  # pdf, docx, etc.
    
    @validator('format')
    def validate_format(cls, v):
        allowed_formats = ['pdf', 'docx', 'html']
        if v not in allowed_formats:
            raise ValueError(f"Format must be one of {allowed_formats}")
        return v