# Job API Integration - Frontend to Backend

## Overview
This document describes the integration work completed to connect the frontend jobs page with the backend job API.

## Changes Made

### 1. Backend Changes

#### Added Public Job Endpoint
**File:** `/backend/src/api/routes/jobs.py`

- **New Endpoint:** `GET /api/v1/jobs/public`
  - Public access (no authentication required)
  - Returns only published jobs
  - Supports pagination with `skip` and `limit` parameters
  
- **Existing Endpoint:** `GET /api/v1/jobs`
  - Requires authentication
  - Can filter by any status
  - Used by authenticated admin users

**Why?** The public jobs page needs to display published jobs without requiring users to log in.

### 2. Frontend Changes

#### Updated Type Definitions
**File:** `/frontend/src/lib/types/index.ts`

Extended the `Job` interface to include all backend fields:
- `company_name`, `job_type`, `experience_level`
- `salary_min`, `salary_max`, `salary_currency`, `salary_range`
- `required_skills`, `preferred_skills`, `benefits`
- `short_description`, `application_url`
- Dual field support (e.g., `created_at` and `createdAt`) for backward compatibility

Updated `JobStatus` type to match backend enum:
- Changed from: `'draft' | 'posted' | 'interviewing' | 'closed' | 'published'`
- Changed to: `'draft' | 'pending' | 'published' | 'closed' | 'archived'`

#### Enhanced Jobs API Client
**File:** `/frontend/src/lib/api/jobs.ts`

- **New Method:** `jobsApi.getPublic()`
  - Fetches published jobs from `/jobs/public` endpoint
  - No authentication required
  - Maps all backend fields to frontend Job type
  
- **Updated Method:** `jobsApi.getAll()`
  - Requires authentication
  - Maps all backend fields
  - Changed parameters to match backend (`skip`/`limit` instead of `page`/`pageSize`)

#### Rebuilt Jobs Page
**File:** `/frontend/src/app/jobs/page.tsx`

Complete rewrite to use real API data:
- Replaced mock data with `jobsApi.getPublic()` call
- Added loading states with spinner
- Added error handling with retry capability
- Displays all job fields from backend:
  - Company name with generated initials
  - Job type (formatted from snake_case)
  - Salary range (formatted from min/max or range)
  - Skills as badges (showing first 4 + count)
  - Location, department, benefits
  - Days since posting (calculated from `created_at`)
  - Application count

Features:
- Client-side filtering by search query, location, and job type
- Responsive design
- Loading and error states
- Empty state with clear filters button

#### Fixed Middleware
**File:** `/frontend/src/middleware.ts`

Fixed infinite redirect loop:
- Changed public route matching from prefix-based to exact match for `/`, `/login`, `/signup`
- Added `/jobs` and subpaths as public routes
- Only redirect logged-in users from auth pages (not all public pages)

#### Fixed Environment Configuration
**Files:** `/frontend/.env.local`, `/frontend/.env.example`

**Before (broken):**
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/apiNEXT_PUBLIC_LANGGRAPH_API_URL=http://localhost:2024
```

**After (fixed):**
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:2024/api/v1
NEXT_PUBLIC_LANGGRAPH_API_URL=http://localhost:2024
```

**Issue:** The environment variables were on one line without proper separation, causing the API client to use a malformed URL.

## API Endpoints

### Public Endpoint (No Auth Required)
```
GET /api/v1/jobs/public?skip=0&limit=100
```

Returns array of published jobs with all fields.

### Authenticated Endpoint
```
GET /api/v1/jobs?status=published&skip=0&limit=100
Authorization: Bearer <token>
```

Returns jobs filtered by status (draft, pending, published, closed, archived).

## Adding Sample Jobs

### Option 1: Using the API Script (Recommended)

1. Make sure you have a user account (admin):
   ```bash
   # If you don't have one, create it first via signup or backend
   ```

2. Edit the credentials in `/backend/create_sample_jobs_api.py`:
   ```python
   EMAIL = "admin@evalyn.com"
   PASSWORD = "admin123"
   ```

3. Run the script:
   ```bash
   cd /home/revnix/Desktop/work/Evalyn/backend
   python3 create_sample_jobs_api.py
   ```

This will create 6 sample jobs and automatically publish them.

### Option 2: Manual via API

Use cURL or Postman:

1. Login:
   ```bash
   curl -X POST http://localhost:2024/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@evalyn.com","password":"admin123"}'
   ```

2. Create job:
   ```bash
   curl -X POST http://localhost:2024/api/v1/admin/jobs \
     -H "Authorization: Bearer <YOUR_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Software Engineer",
       "description": "Build amazing things",
       "company_name": "TechCorp",
       "location": "Remote",
       "job_type": "full_time",
       "salary_min": 100000,
       "salary_max": 150000,
       "required_skills": ["Python", "JavaScript"]
     }'
   ```

3. Publish job:
   ```bash
   curl -X POST http://localhost:2024/api/v1/jobs/<JOB_ID>/publish \
     -H "Authorization: Bearer <YOUR_TOKEN>"
   ```

## Testing the Integration

1. **Start the backend** (if not already running):
   ```bash
   cd /home/revnix/Desktop/work/Evalyn/backend
   langgraph dev
   ```
   Backend should be running at `http://localhost:2024`

2. **Start the frontend** (if not already running):
   ```bash
   cd /home/revnix/Desktop/work/Evalyn/frontend
   npm run dev
   ```
   Frontend should be running at `http://localhost:3000`

3. **Add sample jobs** (see above)

4. **Visit the jobs page:**
   ```
   http://localhost:3000/jobs
   ```

5. **Verify:**
   - Jobs load without login
   - All job information displays correctly
   - Search and filters work
   - No CORS errors in browser console

## CORS Configuration

The backend is configured to allow requests from the frontend:

**File:** `/backend/src/api/main.py`
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,  # Should include http://localhost:3000
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Troubleshooting

### Jobs not showing up
- Check if jobs are published: `curl http://localhost:2024/api/v1/jobs/public`
- If empty, run the sample jobs script
- Check backend logs for errors

### CORS errors
- Verify backend is running on port 2024
- Check CORS settings in `/backend/src/api/main.py`
- Make sure frontend is requesting from correct URL

### Wrong API URL
- Clear browser cache and cookies
- Restart Next.js dev server: `Ctrl+C` then `npm run dev`
- Verify `.env.local` file has correct URL
- Check browser Network tab for actual request URL

### Infinite redirects
- Clear browser cookies for localhost
- Middleware now correctly handles public routes

## Next Steps

To fully complete the job integration:

1. **Job Detail Page:** Create `/jobs/[id]/page.tsx` to show individual job details
2. **Apply Page:** Create `/jobs/[id]/apply/page.tsx` for job applications
3. **Backend:** Add endpoints for fetching single job by ID (public)
4. **Search Improvements:** Consider adding backend search/filtering for better performance
5. **Pagination:** Implement proper pagination instead of loading all jobs

## Summary

✅ Backend public endpoint created  
✅ Frontend types updated to match backend  
✅ Jobs API client enhanced with public method  
✅ Jobs page rebuilt with real API integration  
✅ Environment configuration fixed  
✅ Middleware redirect loop resolved  
✅ Sample job creation script provided  
✅ Documentation completed  

The jobs page now successfully fetches and displays published jobs from the backend API!
