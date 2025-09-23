from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.db.postgres.database import get_db
from app.models.interview_registration import InterviewRegistration
from app.models.question_answer import QuestionAnswer
from datetime import datetime
import json

router = APIRouter(prefix="/api/interview-registrations", tags=["interview-registrations"])

def format_registration_for_mongodb_compatibility(registration: InterviewRegistration) -> Dict[str, Any]:
    """Format PostgreSQL data to match MongoDB structure expected by frontend"""
    
    # Build questions array from question_answers relationship
    questions = []
    for qa in registration.question_answers:
        questions.append({
            "question": qa.question_text,
            "answer": qa.answer_text if qa.is_answered else "",
            "isAnswered": qa.is_answered,
            "timestamp": qa.timestamp.isoformat() if qa.timestamp else None
        })
    
    # Extract resume comparison data
    resume_comparison = registration.resume_comparison or {}
    
    return {
        "_id": str(registration.id),
        "name": registration.name,
        "email": registration.email,
        "registrationId": registration.registration_id,
        "status": registration.status,
        "feedback": registration.feedback,
        "submittedAt": registration.submitted_at.isoformat() if registration.submitted_at else None,
        "resumeData": {
            "summary": registration.resume_summary
        },
        "workExperienceSummary": registration.work_experience_summary,
        "positionType": registration.position_type,
        "schoolType": registration.school_type,
        "hrReview": registration.hr_review,
        "questionByUserToHr": registration.question_by_user_to_hr,
        "hrAnswerToUser": registration.hr_answer_to_user,
        "interviewData": {
            "questions": questions,
            "currentQuestionIndex": registration.current_question_index,
            "isCompleted": registration.is_completed,
            "upkEligible": registration.upk_eligible,
            "teacherEligible": registration.teacher_eligible,
            "substituteEligible": registration.substitute_eligible,
            "shiftAvailable": registration.shift_available,
            "diaperComfortable": registration.diaper_comfortable,
            "startedAt": registration.started_at.isoformat() if registration.started_at else None,
            "completedAt": registration.completed_at.isoformat() if registration.completed_at else None
        },
        "resumeComparison": {
            "similarityScore": resume_comparison.get("similarity_score", 0),
            "overallAssessment": resume_comparison.get("overall_assessment", ""),
            "matchingPoints": resume_comparison.get("matching_points", []),
            "discrepancies": resume_comparison.get("discrepancies", []),
            "recommendation": resume_comparison.get("recommendation", "pending"),
            "confidence": resume_comparison.get("confidence", 0.0),
            "analyzedAt": resume_comparison.get("analyzed_at")
        }
    }

@router.get("/")
def get_interview_registrations(db: Session = Depends(get_db)):
    """Get all interview registrations with their question answers from PostgreSQL"""
    try:
        # Query all registrations with their question answers
        registrations = db.query(InterviewRegistration)\
            .options(joinedload(InterviewRegistration.question_answers))\
            .order_by(desc(InterviewRegistration.submitted_at))\
            .all()
        
        # Format data for compatibility with existing frontend
        formatted_data = []
        for registration in registrations:
            # Build question_answers array for the simpler format
            question_answers = []
            for qa in registration.question_answers:
                question_answers.append({
                    "question_text": qa.question_text,
                    "answer_text": qa.answer_text if qa.is_answered else "",
                    "question_order": qa.question_order,
                    "timestamp": qa.timestamp.isoformat() if qa.timestamp else None
                })
            
            # Extract resume comparison data
            resume_comparison = registration.resume_comparison or {}
            
            formatted_registration = {
                "id": registration.id,
                "candidate_name": registration.name,
                "email": registration.email,
                "registration_id": registration.registration_id,
                "status": registration.status,
                "submitted_at": registration.submitted_at.isoformat() if registration.submitted_at else None,
                "resume_summary": registration.resume_summary,
                "work_experience_summary": registration.work_experience_summary,
                "position_type": registration.position_type,
                "school_type": registration.school_type,
                "upk_eligible": registration.upk_eligible,
                "teacher_eligible": registration.teacher_eligible,
                "substitute_eligible": registration.substitute_eligible,
                "shift_available": registration.shift_available,
                "diaper_comfortable": registration.diaper_comfortable,
                "interview_started_at": registration.started_at.isoformat() if registration.started_at else None,
                "interview_completed_at": registration.completed_at.isoformat() if registration.completed_at else None,
                "interview_completed": registration.is_completed,
                "similarity_score": resume_comparison.get("similarity_score", 0),
                "overall_assessment": resume_comparison.get("overall_assessment", ""),
                "matching_points": resume_comparison.get("matching_points", []),
                "discrepancies": resume_comparison.get("discrepancies", []),
                "recommendation": resume_comparison.get("recommendation", "pending"),
                "confidence_score": resume_comparison.get("confidence", 0.0),
                "question_answers": question_answers,
                "questionByUserToHr": registration.question_by_user_to_hr,
                "hrAnswerToUser": registration.hr_answer_to_user
            }
            formatted_data.append(formatted_registration)
        
        return formatted_data
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in get_interview_registrations: {error_details}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/stats/overview")
def get_registration_stats(db: Session = Depends(get_db)):
    """Get overview stats for interview registrations from PostgreSQL - MongoDB format compatible"""
    try:
        # Query all registrations with their question answers
        registrations = db.query(InterviewRegistration)\
            .options(joinedload(InterviewRegistration.question_answers))\
            .order_by(desc(InterviewRegistration.submitted_at))\
            .all()
        
        print(f"Found {len(registrations)} registrations in database")
        for reg in registrations:
            print(f"Registration ID: {reg.id}, Name: {reg.name}")
        
        # Format data to match MongoDB structure exactly
        formatted_data = []
        for registration in registrations:
            formatted_registration = format_registration_for_mongodb_compatibility(registration)
            print(f"Formatted registration _id: {formatted_registration['_id']}, name: {formatted_registration['name']}")
            formatted_data.append(formatted_registration)
        
        return {
            "success": True,
            "data": formatted_data
        }
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in get_registration_stats: {error_details}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{registration_id}")
def get_registration_by_id(registration_id: int, db: Session = Depends(get_db)):
    """Get a specific registration by ID from PostgreSQL"""
    try:
        registration = db.query(InterviewRegistration)\
            .options(joinedload(InterviewRegistration.question_answers))\
            .filter(InterviewRegistration.id == registration_id)\
            .first()
        
        if not registration:
            raise HTTPException(status_code=404, detail="Registration not found")
        
        # Format for MongoDB compatibility
        formatted_registration = format_registration_for_mongodb_compatibility(registration)
        
        return {
            "success": True,
            "data": formatted_registration
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/stats/summary")
def get_registration_summary_stats(db: Session = Depends(get_db)):
    """Get summary statistics for registrations from PostgreSQL"""
    try:
        # Get total counts by status
        total_registrations = db.query(InterviewRegistration).count()
        pending_count = db.query(InterviewRegistration).filter(InterviewRegistration.status == "pending").count()
        in_progress_count = db.query(InterviewRegistration).filter(InterviewRegistration.status == "in_progress").count()
        completed_count = db.query(InterviewRegistration).filter(InterviewRegistration.status == "completed").count()
        rejected_count = db.query(InterviewRegistration).filter(InterviewRegistration.status == "rejected").count()
        
        # Get eligibility stats
        upk_eligible_count = db.query(InterviewRegistration).filter(InterviewRegistration.upk_eligible == True).count()
        teacher_eligible_count = db.query(InterviewRegistration).filter(InterviewRegistration.teacher_eligible == True).count()
        substitute_eligible_count = db.query(InterviewRegistration).filter(InterviewRegistration.substitute_eligible == True).count()
        
        return {
            "success": True,
            "data": {
                "total_registrations": total_registrations,
                "status_breakdown": {
                    "pending": pending_count,
                    "in_progress": in_progress_count,
                    "completed": completed_count,
                    "rejected": rejected_count
                },
                "eligibility_stats": {
                    "upk_eligible": upk_eligible_count,
                    "teacher_eligible": teacher_eligible_count,
                    "substitute_eligible": substitute_eligible_count
                }
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


class FeedbackUpdate(BaseModel):
    feedback: Optional[str] = None


class RoleDetailsUpdate(BaseModel):
    positionType: Optional[str] = None
    schoolType: Optional[str] = None


class StatusUpdate(BaseModel):
    status: Optional[str] = None


class HrReviewUpdate(BaseModel):
    hrReview: Optional[str] = None


class HrAnswerUpdate(BaseModel):
    hrAnswerToUser: Optional[str] = None


@router.patch("/{registration_id:path}/feedback", response_model=Dict[str, Any])
async def update_registration_feedback(
    registration_id: str,
    feedback_data: FeedbackUpdate,
    db: Session = Depends(get_db)
):
    """
    Update the feedback for a specific registration using registrationId
    """
    try:
        print(f"Looking for registration with registrationId: {registration_id}")
        
        # Find the registration by registration_id field (not database id)
        registration = db.query(InterviewRegistration).filter(
            InterviewRegistration.registration_id == registration_id
        ).first()
        
        if not registration:
            # Debug: Check what registrations exist
            all_registrations = db.query(InterviewRegistration).all()
            existing_reg_ids = [r.registration_id for r in all_registrations]
            print(f"Available registration IDs: {existing_reg_ids}")
            raise HTTPException(status_code=404, detail=f"Registration not found. Available registration IDs: {existing_reg_ids}")
        
        print(f"Found registration: {registration.registration_id}, {registration.name}")
        
        # Update the feedback
        registration.feedback = feedback_data.feedback
        registration.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(registration)
        
        print(f"Updated feedback for registration {registration.registration_id}")
        
        # Return the updated registration in the expected format
        formatted_registration = format_registration_for_mongodb_compatibility(registration)
        return {
            "success": True,
            "message": "Feedback updated successfully",
            "data": formatted_registration
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{registration_id:path}/role-details", response_model=Dict[str, Any])
async def update_registration_role_details(
    registration_id: str,
    role_data: RoleDetailsUpdate,
    db: Session = Depends(get_db)
):
    """
    Update the role details (position type and school type) for a specific registration using registrationId
    """
    try:
        print(f"Looking for registration with registrationId: {registration_id}")
        
        # Find the registration by registration_id field (not database id)
        registration = db.query(InterviewRegistration).filter(
            InterviewRegistration.registration_id == registration_id
        ).first()
        
        if not registration:
            # Debug: Check what registrations exist
            all_registrations = db.query(InterviewRegistration).all()
            existing_reg_ids = [r.registration_id for r in all_registrations]
            print(f"Available registration IDs: {existing_reg_ids}")
            raise HTTPException(status_code=404, detail=f"Registration not found. Available registration IDs: {existing_reg_ids}")
        
        print(f"Found registration: {registration.registration_id}, {registration.name}")
        
        # Update the role details
        if role_data.positionType is not None:
            registration.position_type = role_data.positionType
        if role_data.schoolType is not None:
            registration.school_type = role_data.schoolType
            
        registration.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(registration)
        
        print(f"Updated role details for registration {registration.registration_id}")
        
        # Return the updated registration in the expected format
        formatted_registration = format_registration_for_mongodb_compatibility(registration)
        return {
            "success": True,
            "message": "Role details updated successfully",
            "data": formatted_registration
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating role details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{registration_id:path}/status", response_model=Dict[str, Any])
async def update_registration_status(
    registration_id: str,
    status_data: StatusUpdate,
    db: Session = Depends(get_db)
):
    """
    Update the status for a specific registration using registrationId
    """
    try:
        print(f"Looking for registration with registrationId: {registration_id}")
        
        # Find the registration by registration_id field (not database id)
        registration = db.query(InterviewRegistration).filter(
            InterviewRegistration.registration_id == registration_id
        ).first()
        
        if not registration:
            # Debug: Check what registrations exist
            all_registrations = db.query(InterviewRegistration).all()
            existing_reg_ids = [r.registration_id for r in all_registrations]
            print(f"Available registration IDs: {existing_reg_ids}")
            raise HTTPException(status_code=404, detail=f"Registration not found. Available registration IDs: {existing_reg_ids}")
        
        print(f"Found registration: {registration.registration_id}, {registration.name}")
        
        # Update the status
        if status_data.status is not None:
            registration.status = status_data.status
            
        registration.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(registration)
        
        print(f"Updated status for registration {registration.registration_id}")
        
        # Return the updated registration in the expected format
        formatted_registration = format_registration_for_mongodb_compatibility(registration)
        return {
            "success": True,
            "message": "Status updated successfully",
            "data": formatted_registration
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{registration_id:path}/hr-review", response_model=Dict[str, Any])
async def update_registration_hr_review(
    registration_id: str,
    hr_review_data: HrReviewUpdate,
    db: Session = Depends(get_db)
):
    """
    Update the HR review status for a specific registration using registrationId
    """
    try:
        print(f"Looking for registration with registrationId: {registration_id}")
        
        # Find the registration by registration_id field (not database id)
        registration = db.query(InterviewRegistration).filter(
            InterviewRegistration.registration_id == registration_id
        ).first()
        
        if not registration:
            # Debug: Check what registrations exist
            all_registrations = db.query(InterviewRegistration).all()
            existing_reg_ids = [r.registration_id for r in all_registrations]
            print(f"Available registration IDs: {existing_reg_ids}")
            raise HTTPException(status_code=404, detail=f"Registration not found. Available registration IDs: {existing_reg_ids}")
        
        print(f"Found registration: {registration.registration_id}, {registration.name}")
        
        # Update the HR review status
        if hr_review_data.hrReview is not None:
            registration.hr_review = hr_review_data.hrReview
            
        registration.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(registration)
        
        print(f"Updated HR review status for registration {registration.registration_id}")
        
        # Return the updated registration in the expected format
        formatted_registration = format_registration_for_mongodb_compatibility(registration)
        return {
            "success": True,
            "message": "HR review status updated successfully",
            "data": formatted_registration
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating HR review status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{registration_id}/hr-answer", response_model=Dict[str, Any])
async def update_registration_hr_answer(
    registration_id: str,
    hr_answer_data: HrAnswerUpdate,
    db: Session = Depends(get_db)
):
    """
    Update the HR answer to user question for a specific registration using registrationId
    """
    try:
        # Find the registration by registration_id field (not database id)
        registration = db.query(InterviewRegistration).filter(
            InterviewRegistration.registration_id == registration_id
        ).first()
        
        if not registration:
            raise HTTPException(status_code=404, detail=f"Registration with ID {registration_id} not found")
        
        # Update the HR answer
        if hr_answer_data.hrAnswerToUser is not None:
            registration.hr_answer_to_user = hr_answer_data.hrAnswerToUser
        
        db.commit()
        db.refresh(registration)
        
        return {
            "success": True,
            "message": "HR answer updated successfully",
            "data": {
                "registrationId": registration.registration_id,
                "hrAnswerToUser": registration.hr_answer_to_user
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating HR answer: {str(e)}")
