from fastapi import APIRouter
from app.routers import interview_registrations_db, auth

# Create a global API router
api_router = APIRouter()

# Register routers
api_router.include_router(interview_registrations_db.router)
api_router.include_router(auth.router)


__all__ = ["api_router"]
