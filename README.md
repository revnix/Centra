# Evalyn — AI-Powered HR Automation Platform

Evalyn automates the end-to-end hiring workflow: job generation, candidate screening, shortlisting, email notifications, and onboarding — powered by LangGraph and Groq AI.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | FastAPI (Python 3.11), SQLAlchemy, asyncpg |
| Database | PostgreSQL (Neon cloud) |
| AI / LLM | LangGraph, LangChain, Groq (Llama 3) |
| Email | Resend |
| Auth | JWT (PyJWT + bcrypt) |

---

## Project Structure

```
Evalyn/
├── backend/              # FastAPI application
│   ├── src/
│   │   ├── api/          # Routes, services, models, schemas
│   │   └── flow/         # LangGraph AI workflows
│   ├── uploads/          # Resume and recording file storage
│   ├── .env              # Backend environment variables
│   └── requirements.txt
├── frontend/             # Next.js application
│   ├── src/
│   │   ├── app/          # Pages (App Router)
│   │   ├── components/   # Reusable UI components
│   │   └── lib/          # API clients, hooks, utilities
│   └── .env.local        # Frontend environment variables
├── .env.local            # Master credentials template (all keys, empty values)
└── _archived/            # Archived unused files
```

---

## Prerequisites

Ensure the following are installed before starting:

- **Python 3.11** — [python.org](https://www.python.org/downloads/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **npm** (bundled with Node.js)
- **Git**

---

## Step 1 — Clone the Repository

```bash
git clone <repository-url>
cd Evalyn
```

---

## Step 2 — Configure Environment Variables

All required credential keys are listed in `.env.local` at the project root with empty values.

### Backend — `backend/.env`

```bash
# Windows
copy .env.local backend\.env

# macOS / Linux
cp .env.local backend/.env
```

Open `backend/.env` and fill in every value:

```env
# Database — Neon PostgreSQL connection string
DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>/<db>?sslmode=require

# Application Security — any long random string
SECRET_KEY=your-secret-key-here

# AI — Groq API key  →  https://console.groq.com
GROQ_API_KEY=gsk_...

# URLs
FRONTEND_URL=http://localhost:3000

# Email — Resend  →  https://resend.com
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=you@yourdomain.com
RESEND_FROM_NAME=Your Company Name
RESEND_WEBHOOK_SECRET=whsec_...
OPERATIONS_MANAGER_EMAIL=manager@yourdomain.com
HR_EMAIL=hr@yourdomain.com

# LinkedIn OAuth  →  https://developer.linkedin.com
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=http://localhost:3000/dashboard/integrations/callback

# Indeed OAuth  →  https://developer.indeed.com
INDEED_CLIENT_ID=
INDEED_CLIENT_SECRET=
INDEED_REDIRECT_URL=http://localhost:3000/callback
```

### Frontend — `frontend/.env.local`

```bash
# Windows
copy .env.local frontend\.env.local

# macOS / Linux
cp .env.local frontend/.env.local
```

Open `frontend/.env.local` and set:

```env
NEXT_PUBLIC_LANGGRAPH_API_URL=http://127.0.0.1:8123/api/v1
```

---

## Step 3 — Backend Setup

Open a terminal and navigate to the backend folder:

```bash
cd backend
```

### Option A — pip (standard)

```bash
# Create virtual environment
python -m venv .venv

# Activate — Windows
.venv\Scripts\activate

# Activate — macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Option B — uv (faster)

```bash
pip install uv
uv sync
```

---

## Step 4 — Run the Backend

From inside `backend/` with the virtual environment active:

```bash
uvicorn src.api.main:app --host 0.0.0.0 --port 8123 --reload
```

| URL | Description |
|---|---|
| http://localhost:8123 | API root |
| http://localhost:8123/health | Health check (DB connectivity) |
| http://localhost:8123/api/v1/openapi.json | Swagger / OpenAPI spec |

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8123 (Press CTRL+C to quit)
INFO:     Started reloader process
```

---

## Step 5 — Frontend Setup

Open a **new terminal** and navigate to the frontend folder:

```bash
cd frontend
npm install
```

---

## Step 6 — Run the Frontend

```bash
npm run dev
```

| URL | Page |
|---|---|
| http://localhost:3000 | Home |
| http://localhost:3000/login | Admin login |
| http://localhost:3000/dashboard | HR dashboard |
| http://localhost:3000/jobs | Public job portal |

Expected output:
```
▲ Next.js 16.x.x
- Local: http://localhost:3000
```

---

## Running Both Servers

Two terminals must run simultaneously:

| Terminal | Directory | Command |
|---|---|---|
| 1 — Backend | `backend/` | `uvicorn src.api.main:app --host 0.0.0.0 --port 8123 --reload` |
| 2 — Frontend | `frontend/` | `npm run dev` |

---

## Key Features

- **AI Job Generation** — Generate complete job descriptions using Groq LLM
- **Public Candidate Portal** — Candidates apply with resume upload at `/jobs`
- **AI Screening** — Automatic scoring and shortlisting (threshold: 70 / 100)
- **Email Automation** — Shortlist invitations sent automatically via Resend
- **Hiring Workflow** — Shortlist → Interview → Hire → Onboarding
- **Onboarding** — Automated onboarding flow for hired candidates
- **LinkedIn & Indeed** — Post jobs directly to external job boards

---

## API Reference

All routes are prefixed with `/api/v1`.

| Resource | Route |
|---|---|
| Auth | `/api/v1/auth` |
| Jobs | `/api/v1/jobs` |
| Applications | `/api/v1/applications` |
| Candidates | `/api/v1/candidates` |
| Interviews | `/api/v1/interviews` |
| Onboarding | `/api/v1/onboarding` |
| Integrations | `/api/v1/integrations` |
| Admin | `/api/v1/admin/*` |

---

## Troubleshooting

**`ModuleNotFoundError` on backend start**
Make sure the virtual environment is activated and the command is run from inside the `backend/` folder.

**Database connection error**
Verify the `DATABASE_URL` in `backend/.env` is correct and includes `?sslmode=require` for Neon.

**Emails not delivering — Resend 403**
The API key is in test mode. Verify your sender domain at [resend.com/domains](https://resend.com/domains) and update `RESEND_FROM_EMAIL` to use that domain.

**Frontend `Network Error` on API calls**
Confirm the backend is running on port `8123` and `NEXT_PUBLIC_LANGGRAPH_API_URL` in `frontend/.env.local` is set to `http://127.0.0.1:8123/api/v1`.

**CORS errors in browser**
Add your frontend origin to `ALLOWED_ORIGINS` in `backend/src/api/core/config.py`.

---

Built for modern HR teams.
