from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON
from sqlalchemy.orm import relationship
from app.db.postgres.database import Base

class InterviewRegistration(Base):
    __tablename__ = "interview_registrations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    registration_id = Column(String(255), unique=True, nullable=False)
    session_token = Column(String(255), unique=True)
    
    # Resume data
    resume_extracted_text = Column(Text, nullable=False)
    resume_summary = Column(Text, nullable=False)
    
    # Interview status and metadata
    status = Column(String(50), default='not attempted')
    current_question_index = Column(Integer, default=-1)
    is_completed = Column(Boolean, default=False)
    
    # Eligibility flags
    upk_eligible = Column(Boolean, default=False)
    teacher_eligible = Column(Boolean, default=False)
    substitute_eligible = Column(Boolean, default=False)
    shift_available = Column(Boolean, default=False)
    diaper_comfortable = Column(Boolean, default=False)
    
    # Timestamps
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    
    # Work experience and position info
    work_experience_summary = Column(Text, default='')
    position_type = Column(String(100), default='')
    school_type = Column(String(100), default='')
    
    # HR Review status
    hr_review = Column(String(50), default='pending')
    
    # Feedback
    feedback = Column(Text, nullable=True)
    question_by_user_to_hr = Column(Text, nullable=True)
    hr_answer_to_user = Column(Text, nullable=True)
    
    # Resume comparison results (stored as JSON)
    resume_comparison = Column(JSON, default={})
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to question answers
    question_answers = relationship("QuestionAnswer", back_populates="registration", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<InterviewRegistration {self.registration_id} ({self.status})>"
