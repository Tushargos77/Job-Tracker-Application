# Job Tracker

A full-stack app for tracking job applications through every stage of the hiring pipeline. Each user signs up with their own account and sees only their own applications.

## Features

- **Accounts**: sign up, log in and log out with JWT authentication (passwords hashed with bcrypt)
- **Pipeline tracking**: Applied → OA → Interview → HR → Offer, plus Rejected
- **Dashboard**: add, edit and delete applications, with search, status filter and sorting
- **Statistics**: see how your applications are spread across the pipeline
- **Import / export**: bring in or download your data as CSV or JSON
- **Dark mode**, toast notifications and loading / error states

## Tech stack

| Part     | Tools                                                                 |
| -------- | --------------------------------------------------------------------- |
| Backend  | FastAPI, SQLAlchemy, PostgreSQL (SQLite for zero-setup local runs), python-jose, bcrypt |
| Frontend | React 19, Vite, React Router, Axios, lucide-react                     |
| Tooling  | Docker / Docker Compose, pytest, oxlint                               |

## Quick start with Docker

```bash
cp .env.example .env        # then set SECRET_KEY (see below)
docker compose up --build
```

- Web app: http://localhost:8080
- API docs: http://localhost:8000/docs

Generate a secret key with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

## Run without Docker

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # edit values; leave DATABASE_URL empty to use SQLite
uvicorn main:app --reload
```

The API runs at http://localhost:8000.

### Frontend

```bash
cd frontend
cp .env.example .env.local        # VITE_API_URL points at the backend
npm install
npm run dev
```

The app runs at http://localhost:5173. Add that address to `ALLOWED_ORIGINS` in `backend/.env`.

## Configuration

### Backend (`backend/.env`)

| Variable          | Description                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| `DATABASE_URL`    | PostgreSQL connection string. If empty, a local SQLite file (`jobtracker.db`) is used.          |
| `SECRET_KEY`      | Signs login tokens. **Set this in production.** If missing, a random key is used and everyone is logged out on each restart. |
| `ALLOWED_ORIGINS` | Comma-separated frontend origins allowed to call the API. Defaults to `*`; restrict it in production. |

### Frontend (`frontend/.env.local`)

| Variable       | Description                                        |
| -------------- | -------------------------------------------------- |
| `VITE_API_URL` | Base URL of the backend API (no trailing slash).   |

## API

All `/jobs` routes need an `Authorization: Bearer <token>` header.

| Method | Path            | Description                                  |
| ------ | --------------- | -------------------------------------------- |
| POST   | `/auth/signup`  | Create an account and get a token            |
| POST   | `/auth/login`   | Log in (form fields `username`, `password`)  |
| GET    | `/auth/me`      | Current user                                 |
| GET    | `/jobs`         | List your applications                       |
| POST   | `/jobs`         | Add an application                           |
| PUT    | `/jobs/{id}`    | Update an application                        |
| DELETE | `/jobs/{id}`    | Delete an application                        |
| GET    | `/health`       | Health check (also checks the database)      |

Interactive docs are served at `/docs`.

## Tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

The tests use a temporary SQLite database, so nothing else needs to be running.

## Project structure

```
backend/        FastAPI app (main.py, auth.py, models.py, database.py) and tests
frontend/       React app
  src/api/        API client (Axios, token handling)
  src/context/    Auth and toast providers
  src/pages/      Dashboard, Stats, Settings, Login, Signup
  src/components/ Reusable UI pieces
docker-compose.yml   PostgreSQL + API + web app
```

## Deployment notes

- **Backend**: any host that runs a Python or Docker service (for example Render). Set `DATABASE_URL`, `SECRET_KEY` and `ALLOWED_ORIGINS`. The container listens on `$PORT` if the host sets it.
- **Frontend**: any static host (for example Vercel). Set `VITE_API_URL` to your backend URL at build time. `frontend/vercel.json` already routes every path to `index.html` for React Router.
- **Existing data**: applications created before accounts were added have no owner and are not shown to any user.
