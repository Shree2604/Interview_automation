from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.postgres.database import Base

class QuestionAnswer(Base):
    __tablename__ = "question_answers"
    
    id = Column(Integer, primary_key=True, index=True)
    registration_id = Column(Integer, ForeignKey('interview_registrations.id', ondelete='CASCADE'), nullable=False)
    question_text = Column(Text, nullable=False)
    answer_text = Column(Text, default='')
    is_answered = Column(Boolean, default=False)
    question_order = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationship back to registration
    registration = relationship("InterviewRegistration", back_populates="question_answers")

    def __repr__(self):
        return f"<QuestionAnswer {self.registration_id}-{self.question_order} (Answered: {self.is_answered})>"
