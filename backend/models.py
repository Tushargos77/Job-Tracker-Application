from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    phone = Column(String, nullable=True)

    jobs = relationship("JobDB", back_populates="owner")

class JobDB(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    company = Column(String, index=True)
    role = Column(String)
    status = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    interview_at = Column(DateTime(timezone=True), nullable=True)
    reminder_24h_sent = Column(Boolean, default=False, nullable=False)
    reminder_1h_sent = Column(Boolean, default=False, nullable=False)

    owner = relationship("User", back_populates="jobs")