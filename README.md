# Evalyn — AI-Powered HR Automation Platform

Evalyn automates the end-to-end hiring workflow: job generation, candidate screening, shortlisting, email notifications, onboarding, and HR operations (departments, employees, shifts, attendance) — powered by LangGraph and LLM providers.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | FastAPI (Python 3.11), SQLAlchemy, asyncpg |
| Database | PostgreSQL |
| AI / LLM | LangGraph, LangChain, Groq / OpenAI (optional) |
| Auth | JWT (PyJWT + bcrypt) |

---

## Project Structure

```
Evalyn-HR--Agent/
├── backend/                 # FastAPI + LangGraph server
│   ├── src/
│   ├── alembic/
│   ├── scripts/             # db.py migrate/reset/seed helpers
│   ├── .env                 # Local env (do not commit)
│   └── .env.example         # Env template (safe)
└── frontend/                # Next.js app
    ├── src/
    ├── .env.local           # Local env (do not commit)
    └── .env.example         # Env template (safe)
```

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- npm
- PostgreSQL (local) or any Postgres URL

---

## Setup (Local Development)

### 1) Clone

```bash
git clone <repository-url>
cd Centra
```

### 2) Environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Update values:

- `backend/.env`
  - Required: `DATABASE_URL`, `SECRET_KEY`, `FRONTEND_URL`
  - Optional: AI keys, SMTP/Resend, integrations
- `frontend/.env.local`
  - Required: `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_LANGGRAPH_API_URL` (default local is `http://127.0.0.1:2024`)

### 3) Backend install

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

(Optionally use `uv sync` if you prefer `uv`.)

### 4) Database migrations

From `backend/` with venv active:

```bash
.venv/bin/python scripts/db.py migrate
```

If you need a fully clean local DB (destructive):

```bash
.venv/bin/python scripts/db.py nuke --yes
```

### 5) Seed default roles + permissions + sample users

```bash
# Optional: change the password for seeded users (default is "secret")
export SEED_DEFAULT_PASSWORD=secret

.venv/bin/python scripts/db.py seed
```

**Seeded users (local/dev)**

- `admin@evalyn.com` (username: `admin`) → `SUPER_ADMIN`
- `org.admin@evalyn.com` (username: `org_admin`) → `ORG_ADMIN`
- `hr.admin@evalyn.com` (username: `hr_admin`) → `HR_ADMIN`
- `finance.admin@evalyn.com` (username: `finance_admin`) → `FINANCE_ADMIN`
- `lead.*@evalyn.com` (usernames: `lead_ai`, `lead_web`, `lead_shopify`, `lead_uiux`) → `DEPARTMENT_LEAD`

### 6) Run backend (LangGraph dev)

```bash
langgraph dev --port 2024
```

Common URLs:
- Backend API: `http://127.0.0.1:2024`
- OpenAPI: `http://127.0.0.1:2024/api/v1/openapi.json`

### 7) Frontend install + run

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:3000`

---

## Roles + Permissions (RBAC)

RBAC roles + permission matrix are defined and seeded in `backend/scripts/seed_rbac.py`.

Roles currently seeded:
- `SUPER_ADMIN`
- `ORG_ADMIN`
- `HR_ADMIN`, `HR_STAFF`
- `FINANCE_ADMIN`, `FINANCE_STAFF`
- `DEPARTMENT_LEAD`, `MANAGER`, `EMPLOYEE`
- `AUDITOR`
- `RECRUITER`
- `INTEGRATIONS_ADMIN`

---

## Troubleshooting

- Frontend proxy errors (`ECONNREFUSED`) usually mean backend is not running or frontend points to wrong port.
  - Ensure `frontend/.env.local` uses `NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:2024`.
- DB errors: verify `DATABASE_URL` points to a reachable Postgres instance.
- If migrations fail on a fresh DB, run `.venv/bin/python scripts/db.py nuke --yes` and then migrate.

