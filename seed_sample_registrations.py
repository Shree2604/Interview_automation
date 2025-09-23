#!/usr/bin/env python3
"""
Script to seed the database with sample interview registration data
"""
import sys
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.models.interview_registration import InterviewRegistration
from app.models.question_answer import QuestionAnswer
from app.core.config import settings

# Create database connection
DATABASE_URL = (
    f"postgresql+psycopg2://{settings.database_username}:{settings.database_password}"
    f"@{settings.database_host}:{settings.database_port}/{settings.database_name}"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def seed_sample_data():
    """Seed the database with sample interview registration data"""
    db = SessionLocal()
    
    try:
        # Clear existing data
        db.query(QuestionAnswer).delete()
        db.query(InterviewRegistration).delete()
        db.commit()
        
        # Sample registrations data
        sample_registrations = [
            # Complete records with accepted status
            {
                "name": "Sarah Johnson",
                "email": "sarah.johnson@email.com",
                "registration_id": "REG001",
                "session_token": "token_001",
                "resume_extracted_text": "Experienced elementary school teacher with 5+ years in early childhood education...",
                "resume_summary": "Experienced elementary school teacher with 5+ years in early childhood education. Strong background in curriculum development and classroom management.",
                "status": "accepted",
                "current_question_index": 2,
                "is_completed": True,
                "upk_eligible": True,
                "teacher_eligible": True,
                "substitute_eligible": True,
                "shift_available": True,
                "diaper_comfortable": True,
                "started_at": datetime.now() - timedelta(days=5, hours=2),
                "completed_at": datetime.now() - timedelta(days=5, hours=1, minutes=45),
                "submitted_at": datetime.now() - timedelta(days=5, hours=3),
                "work_experience_summary": "Elementary School Teacher at PS 123 (2019-2024), Assistant Teacher at Little Stars Daycare (2017-2019)",
                "position_type": "Teacher Assistant",
                "school_type": "Elementary School",
                "question_by_user_to_hr": "Could you please provide information about the benefits package and vacation time for teacher assistants?",
                "resume_comparison": {
                    "similarity_score": 92,
                    "overall_assessment": "Excellent match - extensive teaching experience aligns perfectly with interview responses",
                    "matching_points": ["5+ years teaching experience confirmed", "Early childhood education background verified", "NYC location confirmed"],
                    "discrepancies": [],
                    "recommendation": "proceed",
                    "confidence": 0.95,
                    "analyzed_at": "2024-01-15T10:45:00"
                },
                "questions": [
                    {
                        "question_text": "Are you interested in moving forward with School Professionals?",
                        "answer_text": "Yes, I'm very interested in substitute teaching opportunities.",
                        "is_answered": True,
                        "question_order": 1
                    },
                    {
                        "question_text": "How did you hear about us?",
                        "answer_text": "I found your posting on Indeed and was impressed by your work with charter schools.",
                        "is_answered": True,
                        "question_order": 2
                    },
                    {
                        "question_text": "Are you able to commute & work in NYC?",
                        "answer_text": "Yes, I live in Brooklyn and can easily commute to all five boroughs.",
                        "is_answered": True,
                        "question_order": 3
                    }
                ]
            },
            {
                "name": "Michael Chen",
                "email": "michael.chen@email.com",
                "registration_id": "REG002",
                "session_token": "token_002",
                "resume_extracted_text": "Recent college graduate with Bachelor's in Education...",
                "resume_summary": "Recent college graduate with Bachelor's in Education. Completed student teaching at middle school level with focus on mathematics and science.",
                "status": "rejected",
                "current_question_index": 1,
                "is_completed": False,
                "upk_eligible": False,
                "teacher_eligible": False,
                "substitute_eligible": True,
                "shift_available": True,
                "diaper_comfortable": False,
                "started_at": datetime.now() - timedelta(days=4, hours=1),
                "completed_at": None,
                "submitted_at": datetime.now() - timedelta(days=4, hours=2),
                "work_experience_summary": "Student Teacher at Roosevelt Middle School (Fall 2023), Tutor at Kumon Learning Center (2022-2023)",
                "position_type": "Substitute Teacher",
                "school_type": "Public School",
                "question_by_user_to_hr": "What is the typical daily schedule for substitute teachers, and are there opportunities for long-term assignments?",
                "resume_comparison": {
                    "similarity_score": 78,
                    "overall_assessment": "Good potential - new graduate with relevant education background",
                    "matching_points": ["Education degree confirmed", "Student teaching experience verified"],
                    "discrepancies": ["Limited professional experience"],
                    "recommendation": "proceed",
                    "confidence": 0.8,
                    "analyzed_at": "2024-01-16T14:30:00"
                },
                "questions": [
                    {
                        "question_text": "Are you interested in moving forward with School Professionals?",
                        "answer_text": "Absolutely! This would be a great opportunity to gain more classroom experience.",
                        "is_answered": True,
                        "question_order": 1
                    },
                    {
                        "question_text": "How did you hear about us?",
                        "answer_text": "My professor recommended your organization during our job placement seminar.",
                        "is_answered": True,
                        "question_order": 2
                    }
                ]
            },
            {
                "name": "Emily Rodriguez",
                "email": "emily.rodriguez@email.com",
                "registration_id": "REG003",
                "session_token": "token_003",
                "resume_extracted_text": "Bilingual educator with 8+ years experience in UPK and Pre-K programs...",
                "resume_summary": "Bilingual educator with 8+ years experience in UPK and Pre-K programs. Specializes in ESL instruction and early childhood development.",
                "status": "accepted",
                "current_question_index": 2,
                "is_completed": True,
                "upk_eligible": True,
                "teacher_eligible": True,
                "substitute_eligible": True,
                "shift_available": True,
                "diaper_comfortable": True,
                "started_at": datetime.now() - timedelta(days=3, hours=1),
                "completed_at": datetime.now() - timedelta(days=3, minutes=50),
                "submitted_at": datetime.now() - timedelta(days=3, hours=2),
                "work_experience_summary": "UPK Teacher at Bright Beginnings (2020-2024), Pre-K Teacher at Little Learners Academy (2016-2020)",
                "position_type": "UPK Teacher",
                "school_type": "UPK Program",
                "resume_comparison": {
                    "similarity_score": 96,
                    "overall_assessment": "Perfect match - extensive UPK experience exactly matches role requirements",
                    "matching_points": ["8+ years UPK experience confirmed", "Bilingual skills verified", "Early childhood specialization confirmed"],
                    "discrepancies": [],
                    "recommendation": "proceed",
                    "confidence": 0.98,
                    "analyzed_at": "2024-01-17T09:30:00"
                },
                "questions": [
                    {
                        "question_text": "Are you interested in moving forward with School Professionals?",
                        "answer_text": "Yes, I'm very excited about UPK opportunities in NYC.",
                        "is_answered": True,
                        "question_order": 1
                    },
                    {
                        "question_text": "Experience with students under age 5?",
                        "answer_text": "Yes, I have 8 years of experience specifically with Pre-K and UPK students ages 3-5.",
                        "is_answered": True,
                        "question_order": 2
                    },
                    {
                        "question_text": "Are you comfortable with diaper changes?",
                        "answer_text": "Yes, absolutely. I've handled all aspects of early childhood care including diaper changes.",
                        "is_answered": True,
                        "question_order": 3
                    }
                ]
            },
            {
                "name": "David Thompson",
                "email": "david.thompson@email.com",
                "registration_id": "REG004",
                "session_token": "token_004",
                "resume_extracted_text": "High school mathematics teacher with 3 years experience...",
                "resume_summary": "High school mathematics teacher with 3 years experience. Strong background in algebra and geometry instruction for grades 9-12.",
                "status": "rejected",
                "current_question_index": 1,
                "is_completed": False,
                "upk_eligible": False,
                "teacher_eligible": True,
                "substitute_eligible": True,
                "shift_available": False,
                "diaper_comfortable": False,
                "started_at": datetime.now() - timedelta(days=2, hours=1),
                "completed_at": None,
                "submitted_at": datetime.now() - timedelta(days=2, hours=2),
                "work_experience_summary": "Mathematics Teacher at Lincoln High School (2021-2024), Math Tutor at Sylvan Learning (2020-2021)",
                "position_type": "Teacher",
                "school_type": "Transfer School",
                "resume_comparison": {
                    "similarity_score": 65,
                    "overall_assessment": "Limited match - high school focus may not align with all position requirements",
                    "matching_points": ["Teaching experience confirmed", "Subject matter expertise verified"],
                    "discrepancies": ["No early childhood experience", "Limited availability mentioned"],
                    "recommendation": "hold",
                    "confidence": 0.7,
                    "analyzed_at": "2024-01-18T16:55:00"
                },
                "questions": [
                    {
                        "question_text": "Are you interested in moving forward with School Professionals?",
                        "answer_text": "Yes, I'm looking for substitute opportunities while I search for a permanent position.",
                        "is_answered": True,
                        "question_order": 1
                    },
                    {
                        "question_text": "Experience with students under age 5?",
                        "answer_text": "No, my experience is primarily with high school students aged 14-18.",
                        "is_answered": True,
                        "question_order": 2
                    }
                ]
            },
            # Minimal records with only basic information
            {
                "name": "John Smith",
                "email": "john.smith@email.com",
                "registration_id": "REG006",
                "resume_extracted_text": "Resume not provided",
                "resume_summary": "No resume summary available",
                "status": "not attempted"
            },
            {
                "name": "Maria Garcia",
                "email": "maria.garcia@email.com", 
                "registration_id": "REG007",
                "resume_extracted_text": "Resume not provided",
                "resume_summary": "No resume summary available",
                "status": "not attempted"
            }
        ]
        
        # Create registrations and their question answers
        for reg_data in sample_registrations:
            questions_data = reg_data.pop('questions', [])  # Default to empty list if no questions
            
            # Create registration
            registration = InterviewRegistration(**reg_data)
            db.add(registration)
            db.flush()  # Get the ID
            
            # Create question answers if they exist
            for q_data in questions_data:
                question_answer = QuestionAnswer(
                    registration_id=registration.id,
                    **q_data
                )
                db.add(question_answer)
        
        db.commit()
        print(f"Successfully seeded {len(sample_registrations)} interview registrations with their question answers!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_sample_data()
