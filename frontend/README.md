# AI HR Automation - Frontend

Next.js frontend for the AI-powered hiring automation system.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (default: `http://localhost:8000`)
- LangGraph server running (default: `http://localhost:2024`)

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Update .env.local with your backend URLs
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
# NEXT_PUBLIC_LANGGRAPH_API_URL=http://localhost:2024

# Start development server
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```text
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Admin/Reviewer dashboard  
│   └── (portal)/          # Candidate portal
├── components/
│   ├── providers/         # React Context providers
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── api/               # API client & services
│   ├── hooks/             # Custom React hooks (including LangGraph)
│   ├── stores/            # Zustand stores
│   └── types/             # TypeScript types
└── middleware.ts          # Route protection
```

---

## 🔑 Key Features (Phase 1 - Complete)

✅ **Type-safe API client** with Axios interceptors  
✅ **LangGraph Integration**: Real-time AI job generation with HITL support  
✅ **Custom Hooks**: `useJobGeneration` for managing complex AI state and streaming updates  
✅ **Premium UI**: High-fidelity job preview and social media drafts with smooth animations  
✅ **TanStack Query** for standard entity management  
✅ **Zustand** for UI state (sidebar, filters, notifications)  
✅ **shadcn/ui** component library  
✅ **Responsive layouts** for dashboard and candidate portal  

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **AI Orchestration**: @langchain/langgraph-sdk
- **Styling**: TailwindCSS + shadcn/ui
- **State**: TanStack Query (server) + Zustand (client)
- **HTTP Client**: Axios
- **Forms**: React Hook Form + Zod

---

## 🔐 Authentication (Development Mode)

Currently uses **mock authentication** for development:

1. Navigate to `/login`
2. Enter any email/password
3. Select role: **Admin**, **Reviewer**, or **Candidate**
4. Click "Sign In"

**Redirects**:

- Admin → `/dashboard/jobs`
- Reviewer → `/dashboard/reviews`
- Candidate → `/portal/status`

> **TODO**: Integrate NextAuth for production authentication

---

## 📡 Backend Integration

### Required Backend Endpoints

The frontend expects the following API structure:

#### Jobs

```bash
GET    /api/jobs
POST   /api/jobs
GET    /api/jobs/:id
POST   /api/jobs/:id/generate
POST   /api/jobs/:id/approve
POST   /api/jobs/:id/publish
```

#### Candidates

```bash
GET    /api/jobs/:jobId/candidates
GET    /api/candidates/:id
GET    /api/candidates/:id/resume
GET    /api/candidates/:id/match_explanation
PUT    /api/candidates/:id/stage
POST   /api/candidates/:id/decision
```

#### Interviews

```bash
GET    /api/interviews/:id
GET    /api/interviews/:id/transcript
POST   /api/interviews/:id/answer
POST   /api/interviews/:id/complete
POST   /api/interviews/:id/override
```

#### Coding Exercises

```bash
GET    /api/coding/:id
POST   /api/coding/:id/submit
POST   /api/coding/:id/run_tests
GET    /api/coding/:id/results
```

#### Real-time Events (LangGraph)

```text
The new job creation flow connects directly to LangGraph SDK at port 2024.
```

---

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server (port 3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### React Query DevTools

Press **`Ctrl+Shift+D`** to toggle React Query DevTools in development mode.

---

## 🎨 UI Components

Using **shadcn/ui** components:

```bash
# Add more components
npx shadcn@latest add [component-name]
```

Installed components:
- button, card, badge, input, textarea
- dropdown-menu, dialog, tabs, tooltip
- table, skeleton, alert

---

## 📋 Roadmap

- [x] Job creation flow (intent → AI generation → approval)
- [ ] Candidate pipeline Kanban board
- [ ] Candidate detail page with AI explanations
- [ ] Interview review interface
- [ ] Coding exercise review

---

## 📝 Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
NEXT_PUBLIC_LANGGRAPH_API_URL=http://localhost:2024
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

---

Built with ❤️ using Next.js and TailwindCSS
