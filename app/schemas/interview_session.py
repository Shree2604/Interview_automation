from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class InterviewSessionBase(BaseModel):
    CandidateId: int
    AdminId: int
    Conversation: Optional[Dict[str, Any]] = None
    Feedback: Optional[str] = None
    Status: Optional[str] = "pending"
    SchoolType: Optional[str] = None
    TeacherType: Optional[str] = None
    FileLink: Optional[str] = None

class InterviewSessionCreate(InterviewSessionBase):
    pass

class InterviewSessionUpdate(BaseModel):
    Conversation: Optional[Dict[str, Any]] = None
    Feedback: Optional[str] = None
    Status: Optional[str] = None
    SchoolType: Optional[str] = None
    TeacherType: Optional[str] = None
    FileLink: Optional[str] = None

class InterviewSessionResponse(InterviewSessionBase):
    SessionId: int
    CreatedAt: datetime
    UpdatedAt: datetime
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    
    class Config:
        from_attributes = True

class StatusUpdate(BaseModel):
    status: str
