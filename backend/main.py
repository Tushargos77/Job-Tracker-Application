import os
from typing import Literal

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from auth import (
    MAX_PASSWORD_BYTES,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from database import Base, SessionLocal, engine
from models import JobDB, User

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Job Tracker API")

# Comma-separated list of allowed frontend origins, e.g.
# ALLOWED_ORIGINS=https://my-app.vercel.app,http://localhost:5173
# Defaults to "*" (any origin). Auth uses a Bearer header, not cookies, so this is safe,
# but restrict it in production.
_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS = [o.strip() for o in _origins_env.split(",") if o.strip()] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

JobStatus = Literal["Applied", "OA", "Interview", "HR", "Offer", "Rejected"]


class Job(BaseModel):
    company: str = Field(min_length=1, max_length=200)
    role: str = Field(min_length=1, max_length=200)
    status: JobStatus

    @field_validator("company", "role")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company: str
    role: str
    status: str


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, value: str) -> str:
        if len(value.encode("utf-8")) > MAX_PASSWORD_BYTES:
            raise ValueError(f"Password must be at most {MAX_PASSWORD_BYTES} bytes long")
        return value


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def find_user_by_email(db: Session, email: str):
    # Case-insensitive so "A@x.com" and "a@x.com" are the same account.
    return db.query(User).filter(func.lower(User.email) == email.strip().lower()).first()


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_error = HTTPException(
        status_code=401,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_error
    email = payload.get("sub")
    if not email:
        raise credentials_error
    user = find_user_by_email(db, email)
    if user is None:
        raise credentials_error
    return user


@app.get("/")
def home():
    return {"message": "Hello, Job Tracker!"}


@app.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.post("/auth/signup", response_model=TokenResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    if find_user_by_email(db, payload.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(email=payload.email.lower(), hashed_password=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"access_token": create_access_token({"sub": user.email})}


@app.post("/auth/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = find_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    return {"access_token": create_access_token({"sub": user.email})}


@app.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email}


@app.post("/jobs")
def create_job(
    job: Job,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_job = JobDB(company=job.company, role=job.role, status=job.status, user_id=current_user.id)
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return {"message": "Job added", "job": JobOut.model_validate(new_job)}


@app.get("/jobs", response_model=list[JobOut])
def get_jobs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(JobDB).filter(JobDB.user_id == current_user.id).order_by(JobDB.id.desc()).all()


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
    db.commit()
    db.refresh(existing)
    return {"message": "Job updated", "job": JobOut.model_validate(existing)}


@app.delete("/jobs/{job_id}")
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(JobDB).filter(JobDB.id == job_id, JobDB.user_id == current_user.id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Job not found")
    deleted = JobOut.model_validate(existing)
    db.delete(existing)
    db.commit()
    return {"message": "Job deleted", "job": deleted}
