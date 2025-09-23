import sys
import os
from sqlalchemy import create_engine

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.postgres.database import Base
from app.models.interview_registration import InterviewRegistration
from app.models.question_answer import QuestionAnswer
from app.models.user import User

# Database connection settings
DATABASE_URL = "postgresql+psycopg2://postgres:root@localhost:5432/interview_db"

# Create database engine
engine = create_engine(DATABASE_URL)

def main():
    try:
        print("Creating new database tables...")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        print("Tables created successfully!")
        print("Created tables:")
        print("- interview_registrations")
        print("- question_answers") 
        print("- users")
        
    except Exception as e:
        print(f"Error creating tables: {e}")

if __name__ == "__main__":
    main()
