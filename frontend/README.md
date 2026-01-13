# AI HR Automation - Frontend

Next.js frontend for the AI-powered hiring automation system.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running (default: `http://localhost:8000`)

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Update .env.local with your backend URL
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api

# Start development server
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
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
│   ├── hooks/             # TanStack Query hooks
│   ├── stores/            # Zustand stores
│   └── types/             # TypeScript types
└── middleware.ts          # Route protection
```

---

## 🔑 Key Features (Phase 1 - Complete)

✅ **Type-safe API client** with Axios interceptors  
✅ **TanStack Query** hooks for all entities (jobs, candidates, interviews, coding)  
✅ **Server-Sent Events (SSE)** for real-time updates  
✅ **Zustand** for UI state (sidebar, filters, notifications)  
✅ **shadcn/ui** component library (12 components)  
✅ **Route protection** middleware with RBAC placeholder  
✅ **Responsive layouts** for dashboard and candidate portal  
✅ **Jobs dashboard** with stats and job cards  

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **State**: TanStack Query (server) + Zustand (client)
- **HTTP Client**: Axios
- **Forms**: React Hook Form + Zod
- **Real-time**: Server-Sent Events (SSE)

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
```
GET    /api/jobs
POST   /api/jobs
GET    /api/jobs/:id
POST   /api/jobs/:id/generate
POST   /api/jobs/:id/approve
POST   /api/jobs/:id/publish
```

#### Candidates
```
GET    /api/jobs/:jobId/candidates
GET    /api/candidates/:id
GET    /api/candidates/:id/resume
GET    /api/candidates/:id/match_explanation
PUT    /api/candidates/:id/stage
POST   /api/candidates/:id/decision
```

#### Interviews
```
GET    /api/interviews/:id
GET    /api/interviews/:id/transcript
POST   /api/interviews/:id/answer
POST   /api/interviews/:id/complete
POST   /api/interviews/:id/override
```

#### Coding Exercises
```
GET    /api/coding/:id
POST   /api/coding/:id/submit
POST   /api/coding/:id/run_tests
GET    /api/coding/:id/results
```

#### Real-time Events
```
GET    /api/events/stream  (Server-Sent Events)
```

**Event types**: 
- `candidate.stage_changed`
- `candidate.review_required`
- `interview.completed`
- `coding.submitted`
- `job.published`
- `job.closed`

See [lib/types/index.ts](src/lib/types/index.ts) for complete type definitions.

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

## 📋 Next Steps (Phase 2)

- [ ] Job creation flow (intent → AI generation → approval)
- [ ] Candidate pipeline Kanban board
- [ ] Candidate detail page with AI explanations
- [ ] Interview review interface
- [ ] Coding exercise review

See [Implementation Plan](/home/revnix/.gemini/antigravity/brain/4963c865-0504-42f4-b546-2ef08da74e08/implementation_plan.md) for full roadmap.

---

## 📝 Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

---

## 🐛 Troubleshooting

### "Cannot connect to backend"
- Ensure backend is running at `NEXT_PUBLIC_API_BASE_URL`
- Check browser console for CORS errors
- Verify authentication token in localStorage

### "Real-time events not working"
- Check if backend SSE endpoint is available
- Verify access token exists: `localStorage.getItem('access_token')`
- Open browser DevTools → Network → EventStream

### "Middleware redirect loop"
- Clear localStorage: `localStorage.clear()`
- Delete cookies
- Restart dev server

---

## 📚 Documentation

- [Implementation Plan](/.gemini/antigravity/brain/.../implementation_plan.md)
- [Phase 1 Walkthrough](/.gemini/antigravity/brain/.../walkthrough.md)
- [Task Breakdown](/.gemini/antigravity/brain/.../task.md)

---

## 🤝 Contributing

1. Create feature branch from `frontend`
2. Follow existing code structure
3. Use TypeScript types from `lib/types`
4. Test with React Query DevTools
5. Submit PR

---

Built with ❤️ using Next.js and TailwindCSS
