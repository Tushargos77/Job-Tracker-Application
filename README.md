# Job Tracker Application

A full-stack web application for tracking job applications from first apply to final offer, with email reminders before interviews.

[**Live demo**](https://job-tracker-application-eta.vercel.app) · [**API docs**](https://job-tracker-application-1-gy8p.onrender.com/docs)

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Three.js](https://img.shields.io/badge/three.js-000000?logo=threedotjs&logoColor=white)

> The backend runs on a free hosting tier and sleeps when idle, so the first request after a quiet period can take 30 to 60 seconds.

## Screenshots

| Login | Dashboard |
| --- | --- |
| ![Login with 3D voxel scene](login.png) | ![Dashboard with application cards](dashboard.png) |

| Statistics | Settings |
| --- | --- |
| ![Statistics by status and company](statistics.png) | ![Settings with export and import](settings.png) |

## Features

- **Authentication:** email and password with JWT, "Continue with Google", and a forgot-password and reset-password flow by email.
- **Pipeline tracking:** create, edit and delete applications with company, role, status and an optional interview date. Stages: Applied, OA, Interview, HR, Offer, Rejected.
- **Dashboard:** live counts per stage, search by company or role, status filter, sorting, and a progress bar on each card.
- **Statistics:** applications broken down by stage and by company.
- **Interview reminders:** a background scheduler emails you about 24 hours and about 1 hour before each interview, once each.
- **Data tools:** export to JSON or CSV, bulk import, and a clear-all option.
- **Private by design:** every application belongs to one user, and all job routes require a valid token.
- **Interface:** dark and light themes, loading skeletons, empty states, toast notifications, delete confirmation, and a 3D voxel scene on the login and sign-up pages built with three.js.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router, Axios, three.js |
| Backend | FastAPI, SQLAlchemy, Pydantic, APScheduler |
| Auth | JWT bearer tokens, Google Identity Services |
| Database | PostgreSQL (Neon) |
| Hosting | Vercel (frontend), Render (backend) |

## Architecture

```mermaid
flowchart LR
    A[React app] -->|REST and JWT| B[FastAPI]
    B --> C[(PostgreSQL)]
    B -->|reset and reminder emails| D[Email provider]
    A -->|Sign in with Google| E[Google Identity]
    B -->|verify ID token| E
```

## Run locally

**Requirements:** Python 3.11+, Node.js 20+, and a PostgreSQL database (a free Neon project works).

**Backend**

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@host/dbname
SECRET_KEY=a-long-random-string
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
ALLOWED_ORIGINS=http://localhost:5173
```

```bash
uvicorn main:app --reload         # http://localhost:8000/docs
```

**Frontend**

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

```bash
npm run dev                       # http://localhost:5173
```

## Project structure

```
backend/     FastAPI app, models, auth and email utilities
frontend/    React app (api, components, context, pages, styles)
```

## Deployment

Frontend on Vercel, backend on Render, database on Neon. Set the environment variables above in each dashboard, and redeploy the frontend after changing a `VITE_` variable because Vite reads them at build time.

## Roadmap

- WhatsApp interview reminders
- Kanban board view
- Notes and contacts per application
- Database migrations with Alembic
- Automated API tests

## Author

**Tushar Prasad Goswami**, B.Tech Electronics and Communication Engineering

[GitHub](https://github.com/Tushargos77) · [LinkedIn](https://www.linkedin.com/in/tushar-prasad-goswami-164334278/)
