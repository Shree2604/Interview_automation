import sys
import os
from sqlalchemy import create_engine, text
import hashlib

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Database connection settings
DATABASE_URL = "postgresql+psycopg2://postgres:root@localhost:5432/interview_db"

# Create database engine
engine = create_engine(DATABASE_URL)

def hash_password(password):
    """Simple password hashing for demo purposes"""
    return hashlib.sha256(password.encode()).hexdigest()

def main():
    try:
        print("Creating USERS table...")
        
        with engine.connect() as conn:
            # Drop existing users table if it exists
            conn.execute(text("DROP TABLE IF EXISTS users CASCADE"))
            
            # Create users table with exact schema requested
            create_table_sql = """
            CREATE TABLE users (
                UserId INT PRIMARY KEY,
                Name VARCHAR(255),
                Password VARCHAR(255),
                EmailId VARCHAR(255),
                IsAdmin BOOLEAN,
                CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                IsLogin BOOLEAN
            )
            """
            conn.execute(text(create_table_sql))
            
            # Insert sample data
            users_data = [
                # Admin users
                (1, 'Admin User', hash_password('admin123'), 'admin@company.com', True, False),
                (2, 'HR Manager', hash_password('hr123'), 'hr@company.com', True, False),
                # Regular users
                (3, 'John Doe', hash_password('user123'), 'john.doe@email.com', False, False),
                (4, 'Jane Smith', hash_password('user123'), 'jane.smith@email.com', False, False),
                (5, 'Mike Johnson', hash_password('user123'), 'mike.johnson@email.com', False, False)
            ]
            
            insert_sql = """
            INSERT INTO users (UserId, Name, Password, EmailId, IsAdmin, IsLogin) 
            VALUES (:userid, :name, :password, :emailid, :isadmin, :islogin)
            """
            
            for user in users_data:
                conn.execute(text(insert_sql), {
                    'userid': user[0],
                    'name': user[1], 
                    'password': user[2],
                    'emailid': user[3],
                    'isadmin': user[4],
                    'islogin': user[5]
                })
            
            conn.commit()
            
        print("USERS table created and seeded successfully!")
        print("\nCreated users:")
        print("Admin users:")
        print("- admin@company.com / admin123 (Admin User)")
        print("- hr@company.com / hr123 (HR Manager)")
        print("\nRegular users:")
        print("- john.doe@email.com / user123 (John Doe)")
        print("- jane.smith@email.com / user123 (Jane Smith)")
        print("- mike.johnson@email.com / user123 (Mike Johnson)")
        
    except Exception as e:
        print(f"Error creating users table: {e}")

if __name__ == "__main__":
    main()
