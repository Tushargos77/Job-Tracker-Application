from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import engine, SessionLocal, Base
from models import JobDB

# Create the database tables (runs once, does nothing if they already exist)
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allows requests from any origin (fine for local dev)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Job(BaseModel):
    company: str
    role: str
    status: str

# Dependency: gives each request its own database session, then closes it
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def home():
    return {"message": "Hello, Job Tracker!"}

@app.get("/about")
def about():
    return {"project": "Job Application Tracker"}

@app.get("/contact")
def contact():
    return {"email": "admin@jobtracker.com"}

@app.post("/jobs")
def create_job(job: Job, db: Session = Depends(get_db)):
    new_job = JobDB(company=job.company, role=job.role, status=job.status)
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return {"message": "Job added", "job": new_job}

@app.get("/jobs")
def get_jobs(db: Session = Depends(get_db)):
    return db.query(JobDB).all()

@app.put("/jobs/{job_id}")
def update_job(job_id: int, job: Job, db: Session = Depends(get_db)):
    existing = db.query(JobDB).filter(JobDB.id == job_id).first()
    if not existing:
        return {"error": "Job not found"}
    existing.company = job.company
    existing.role = job.role
    existing.status = job.status
    db.commit()
    db.refresh(existing)
    return {"message": "Job updated", "job": existing}

@app.delete("/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    existing = db.query(JobDB).filter(JobDB.id == job_id).first()
    if not existing:
        return {"error": "Job not found"}
    db.delete(existing)
    db.commit()
    return {"message": "Job deleted", "job": existing}