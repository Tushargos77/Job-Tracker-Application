import os
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth import (
    create_access_token,
    create_reset_token,
    decode_access_token,
    decode_reset_token,
    hash_password,
    verify_password,
)
from database import Base, SessionLocal, engine
from email_utils import send_interview_reminder_email, send_reset_email
from models import JobDB, User

Base.metadata.create_all(bind=engine)


# --------------------------------------------------------------------------
# Background reminders
# --------------------------------------------------------------------------
def check_reminders():
    """Find interviews ~24h or ~1h away and email a reminder, once each.
    Each send is wrapped individually so one failure never blocks the batch."""
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


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Start the scheduler on app startup and stop it cleanly on shutdown.
    Set RUN_SCHEDULER=false on extra workers to avoid duplicate emails."""
    scheduler = None
    if os.getenv("RUN_SCHEDULER", "true").lower() != "false":
        scheduler = BackgroundScheduler()
        scheduler.add_job(check_reminders, "interval", minutes=10)
        scheduler.start()
    yield
    if scheduler:
        scheduler.shutdown(wait=False)


app = FastAPI(title="Job Tracker API", version="1.0.0", lifespan=lifespan)

# Set ALLOWED_ORIGINS on Render, e.g.
# ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:5173
_origins_env = os.getenv("ALLOWED_ORIGINS", "").strip()
if _origins_env:
    _origins = [o.strip() for o in _origins_env.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Bearer-token auth needs no cookies, so credentials stay off with "*".
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# --------------------------------------------------------------------------
# Schemas
# --------------------------------------------------------------------------
class Job(BaseModel):
    company: str = Field(min_length=1, max_length=200)
    role: str = Field(min_length=1, max_length=200)
    status: str = Field(min_length=1, max_length=50)
    interview_at: Optional[datetime] = None


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=72)


class GoogleAuthRequest(BaseModel):
    credential: str


class UpdatePhoneRequest(BaseModel):
    phone: Optional[str] = Field(default=None, max_length=20)


# --------------------------------------------------------------------------
# Dependencies
# --------------------------------------------------------------------------
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


# --------------------------------------------------------------------------
# Meta routes
# --------------------------------------------------------------------------
@app.get("/")
def home():
    return {"message": "Hello, Job Tracker!"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/about")
def about():
    return {"project": "Job Application Tracker"}


@app.get("/contact")
def contact():
    return {"email": "admin@jobtracker.com"}


# --------------------------------------------------------------------------
# Auth routes
# --------------------------------------------------------------------------
@app.post("/auth/signup", response_model=TokenResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(email=email, hashed_password=hash_password(payload.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")
    db.refresh(user)

    return {"access_token": create_access_token({"sub": user.email})}


@app.post("/auth/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    email = form_data.username.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    return {"access_token": create_access_token({"sub": user.email})}


@app.post("/auth/google", response_model=TokenResponse)
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")

    try:
        idinfo = google_id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            client_id,
        )
    except ValueError as e:
        print("GOOGLE AUTH ERROR:", str(e))
        raise HTTPException(status_code=401, detail="Invalid Google credential")

    email = idinfo.get("email")
    if not email or not idinfo.get("email_verified", False):
        raise HTTPException(status_code=401, detail="Google account email is not verified")
    email = email.strip().lower()

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, hashed_password=hash_password(secrets.token_urlsafe(32)))
        db.add(user)
        db.commit()
        db.refresh(user)

    return {"access_token": create_access_token({"sub": user.email})}


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
    user = db.query(User).filter(User.email == payload.email.strip().lower()).first()
    if user:
        try:
            send_reset_email(user.email, create_reset_token(user.email))
        except Exception as e:
            # Never reveal whether the account exists, even on failure.
            print("RESET EMAIL FAILED:", str(e))
    return {"message": "If that email is registered, a reset link has been sent."}


@app.post("/auth/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    data = decode_reset_token(payload.token)
    if data is None:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    user = db.query(User).filter(User.email == data.get("sub")).first()
    if user is None:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


# --------------------------------------------------------------------------
# Job routes (all scoped to the logged-in user)
# --------------------------------------------------------------------------
@app.post("/jobs")
def create_job(
    job: Job,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_job = JobDB(
        company=job.company.strip(),
        role=job.role.strip(),
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

    existing.company = job.company.strip()
    existing.role = job.role.strip()
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
    return {"message": "Job deleted", "id": job_id}
