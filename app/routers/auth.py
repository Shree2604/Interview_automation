from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Any
from pydantic import BaseModel
import hashlib
import traceback
from app.db.postgres.database import get_db

router = APIRouter(prefix="/api/auth", tags=["authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    message: str
    user: Dict[str, Any] = None

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user against USERS table
    Returns user info with isAdmin flag for role-based redirection
    """
    try:
        # Hash the provided password
        hashed_password = hash_password(login_data.password)
        
        # Query user by email and password
        query = text(
            """
            SELECT userid, name, emailid, isadmin, islogin
            FROM users
            WHERE emailid = :email AND password = :password
            """
        )
        
        result = db.execute(query, {
            "email": login_data.username,
            "password": hashed_password
        }).fetchone()
        
        if not result:
            raise HTTPException(
                status_code=401, 
                detail="Invalid credentials"
            )
        
        # Update login status
        update_query = text(
            """
            UPDATE users
            SET islogin = true
            WHERE userid = :user_id
            """
        )
        
        try:
            db.execute(update_query, {"user_id": result[0]})
            db.commit()
        except Exception as e:
            # Best-effort update; do not block successful auth
            db.rollback()
            print("Login status update failed:", e)
        
        # Return user info
        user_info = {
            "userId": result[0],
            "name": result[1],
            "email": result[2],
            "isAdmin": bool(result[3]),
            "isLogin": True,
        }
        
        # Debug logging
        print(f"🔍 DEBUG: Database result for {login_data.username}:")
        print(f"🔍 DEBUG: UserId: {result[0]}")
        print(f"🔍 DEBUG: Name: {result[1]}")
        print(f"🔍 DEBUG: Email: {result[2]}")
        print(f"🔍 DEBUG: IsAdmin: {result[3]} (type: {type(result[3])})")
        print(f"🔍 DEBUG: Final user_info: {user_info}")
        
        return LoginResponse(
            success=True,
            message="Login successful",
            user=user_info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        print("Login error:")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error during login: {str(e)}"
        )

@router.post("/logout")
async def logout(user_id: int, db: Session = Depends(get_db)):
    """
    Logout user by updating IsLogin status
    """
    try:
        update_query = text("""
            UPDATE users 
            SET IsLogin = false, UpdatedAt = CURRENT_TIMESTAMP 
            WHERE UserId = :user_id
        """)
        
        db.execute(update_query, {"user_id": user_id})
        db.commit()
        
        return {
            "success": True,
            "message": "Logout successful"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail="Error during logout"
        )
