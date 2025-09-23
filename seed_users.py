import sys
import os
from sqlalchemy import text
from sqlalchemy.orm import Session
import hashlib

# Ensure project root is on path so app.* imports work
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = CURRENT_DIR
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from app.models.user import User
from app.db.postgres.database import sync_session

def hash_password(password):
    """Simple password hashing for demo purposes"""
    return hashlib.sha256(password.encode()).hexdigest()

def main():
    try:
        print("Seeding users table...")
        db: Session = sync_session()
        
        # Inspect actual column names to decide identifiers
        cols = {row[0] for row in db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        """))}
        
        def ident(logical_name: str) -> str:
            # Prefer exact match (quoted if mixed case), else lowercase
            if logical_name in cols:
                return f'"{logical_name}"'
            lower = logical_name.lower()
            if lower in cols:
                return lower
            raise RuntimeError(f"Column {logical_name} not found in users table. Available: {cols}")
        
        # Create sample users
        users_data = [
            # Admin users
            {
                "userid": 1,
                "name": "Admin User",
                "password": hash_password("admin123"),
                "emailid": "admin@company.com",
                "isadmin": True,
                "islogin": False
            },
            {
                "userid": 2,
                "name": "HR Manager",
                "password": hash_password("hr123"),
                "emailid": "hr@company.com",
                "isadmin": True,
                "islogin": False
            },
            # Regular users
            {
                "userid": 3,
                "name": "John Doe",
                "password": hash_password("user123"),
                "emailid": "john.doe@email.com",
                "isadmin": False,
                "islogin": False
            },
            {
                "userid": 4,
                "name": "Jane Smith",
                "password": hash_password("user123"),
                "emailid": "jane.smith@email.com",
                "isadmin": False,
                "islogin": False
            },
            {
                "userid": 5,
                "name": "Mike Johnson",
                "password": hash_password("user123"),
                "emailid": "mike.johnson@email.com",
                "isadmin": False,
                "islogin": False
            }
        ]
        
        # Clear existing rows and insert using detected identifiers
        col_id = ident('UserId')
        col_name = ident('Name')
        col_pass = ident('Password')
        col_email = ident('EmailId')
        col_isadmin = ident('IsAdmin')
        col_islogin = ident('IsLogin')

        insert_sql = text(
            f"INSERT INTO users ({col_id}, {col_name}, {col_pass}, {col_email}, {col_isadmin}, {col_islogin})\n"
            "VALUES (:userid, :name, :password, :emailid, :isadmin, :islogin)"
        )

        try:
            db.execute(text("DELETE FROM users"))
            for u in users_data:
                db.execute(insert_sql, u)
            db.commit()
        except Exception:
            db.rollback()
            raise
        
        print("Users seeded successfully!")
        print("\nCreated users:")
        print("Admin users:")
        print("- admin@company.com / admin123 (Admin User)")
        print("- hr@company.com / hr123 (HR Manager)")
        print("\nRegular users:")
        print("- john.doe@email.com / user123 (John Doe)")
        print("- jane.smith@email.com / user123 (Jane Smith)")
        print("- mike.johnson@email.com / user123 (Mike Johnson)")
        
    except Exception as e:
        print(f"Error seeding users: {e}")
        try:
            db.rollback()
        except Exception:
            pass
        raise
    finally:
        try:
            db.close()
        except Exception:
            pass

if __name__ == "__main__":
    main()
