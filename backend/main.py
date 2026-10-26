from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import Optional
from apscheduler.schedulers.background import BackgroundScheduler
from database import engine, SessionLocal, Base
from models import JobDB, User
import os
import secrets
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    create_reset_token,
    decode_reset_token,
)
from email_utils import send_reset_email, send_interview_reminder_email

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


class Job(BaseModel):
    company: str
    role: str
    status: str
    interview_at: Optional[datetime] = None


class SignupRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class GoogleAuthRequest(BaseModel):
    credential: str


class UpdatePhoneRequest(BaseModel):
    phone: Optional[str] = None


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@app.get("/")
def home():
    return {"message": "Hello, Job Tracker!"}


@app.get("/about")
def about():
    return {"project": "Job Application Tracker"}


@app.get("/contact")
def contact():
    return {"email": "admin@jobtracker.com"}


@app.post("/auth/signup", response_model=TokenResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(email=payload.email, hashed_password=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.email})
    return {"access_token": token}


@app.post("/auth/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token({"sub": user.email})
    return {"access_token": token}


@app.post("/auth/google", response_model=TokenResponse)
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        idinfo = google_id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            os.getenv("GOOGLE_CLIENT_ID"),
        )
    except ValueError as e:
        print("GOOGLE AUTH ERROR:", str(e))
        raise HTTPException(status_code=401, detail="Invalid Google credential")

    email = idinfo.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Google account has no email")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        random_password = secrets.token_urlsafe(32)
        user = User(email=email, hashed_password=hash_password(random_password))
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": user.email})
    return {"access_token": token}


@app.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "phone": current_user.phone}


@app.put("/auth/me/phone")
def update_phone(
    payload: UpdatePhoneRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.phone = payload.phone
    db.commit()
    return {"id": current_user.id, "email": current_user.email, "phone": current_user.phone}


@app.post("/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        token = create_reset_token(user.email)
        send_reset_email(user.email, token)
    return {"message": "If that email is registered, a reset link has been sent."}


@app.post("/auth/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    data = decode_reset_token(payload.token)
    if data is None:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    email = data.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


@app.post("/jobs")
def create_job(job: Job, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_job = JobDB(
        company=job.company,
        role=job.role,
        status=job.status,
        interview_at=job.interview_at,
        user_id=current_user.id,
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return {"message": "Job added", "job": new_job}


@app.get("/jobs")
def get_jobs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(JobDB).filter(JobDB.user_id == current_user.id).all()


@app.put("/jobs/{job_id}")
def update_job(
    job_id: int,
    job: Job,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(JobDB).filter(JobDB.id == job_id, JobDB.user_id == current_user.id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Job not found")
    existing.company = job.company
    existing.role = job.role
    existing.status = job.status

    if existing.interview_at != job.interview_at:
        existing.reminder_24h_sent = False
        existing.reminder_1h_sent = False
    existing.interview_at = job.interview_at

    db.commit()
    db.refresh(existing)
    return {"message": "Job updated", "job": existing}


@app.delete("/jobs/{job_id}")
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(JobDB).filter(JobDB.id == job_id, JobDB.user_id == current_user.id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(existing)
    db.commit()
    return {"message": "Job deleted", "job": existing}


def check_reminders():
    """Runs periodically in the background. Finds interviews approaching in
    ~24h or ~1h and sends an email reminder, once each, per job. Each send
    is wrapped individually so one failure (e.g. a bad test email address)
    never blocks the rest of the batch or crashes the scheduler."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        jobs = db.query(JobDB).filter(JobDB.interview_at.isnot(None)).all()
        for job in jobs:
            interview_time = job.interview_at
            if interview_time.tzinfo is None:
                interview_time = interview_time.replace(tzinfo=timezone.utc)
            delta = interview_time - now

            user = db.query(User).filter(User.id == job.user_id).first()
            if not user:
                continue

            if not job.reminder_24h_sent and timedelta(hours=23, minutes=50) <= delta <= timedelta(hours=24, minutes=10):
                try:
                    send_interview_reminder_email(user.email, job.company, job.role, interview_time, "in 1 day")
                except Exception as e:
                    print("REMINDER EMAIL FAILED (24h):", str(e))
                job.reminder_24h_sent = True
                db.commit()

            if not job.reminder_1h_sent and timedelta(minutes=50) <= delta <= timedelta(hours=1, minutes=10):
                try:
                    send_interview_reminder_email(user.email, job.company, job.role, interview_time, "in 1 hour")
                except Exception as e:
                    print("REMINDER EMAIL FAILED (1h):", str(e))
                job.reminder_1h_sent = True
                db.commit()
    finally:
        db.close()


scheduler = BackgroundScheduler()
scheduler.add_job(check_reminders, "interval", minutes=10)
scheduler.start()