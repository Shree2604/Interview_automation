from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.postgres.database import Base

class User(Base):
    __tablename__ = "users"

    # Use lowercase physical column names to match Postgres defaults
    userid = Column("userid", Integer, primary_key=True, index=True)
    name = Column("name", String(255), nullable=False)
    password = Column("password", String(255), nullable=False)
    emailid = Column("emailid", String(255), nullable=False, unique=True)
    isadmin = Column("isadmin", Boolean, default=False, nullable=False)
    createdat = Column("createdat", DateTime(timezone=True), server_default=func.now())
    updatedat = Column("updatedat", DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    islogin = Column("islogin", Boolean, default=False, nullable=False)
