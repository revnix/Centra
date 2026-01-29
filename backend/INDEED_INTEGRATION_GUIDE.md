# Indeed Integration Implementation Guide

## 📋 Overview
This document explains the complete Indeed integration implementation for the Evalyn platform, following the exact same pattern as the LinkedIn integration.

---

## 🏗️ Architecture Overview

The Indeed integration follows a **3-layer architecture**:

1. **Router Layer** (`indeed.py`) - API endpoints that handle HTTP requests
2. **Service Layer** (`indeed_service.py`) - Business logic and external API calls
3. **Database Layer** (`UserIntegration` model) - Stores OAuth tokens and user data

---

## 📁 Files Created/Modified

### ✅ Files Created:
1. `backend/src/api/services/indeed_service.py` - Service class for Indeed API interactions
2. `backend/src/api/routes/admin/integrations/indeed.py` - API endpoints for Indeed integration

### ✅ Files Modified:
1. `backend/src/api/core/config.py` - Added Indeed configuration settings
2. `backend/src/api/schemas/integration.py` - Added Indeed request/response schemas
3. `backend/src/api/main.py` - Registered Indeed router
4. `backend/src/api/routes/admin/integrations/__init__.py` - Exported Indeed router

---

## 🔧 Configuration (.env file)

Your `.env` file already has the Indeed credentials:

```env
INDEED_CLIENT_SECRET=gn6VUBG6MxQ5ypzdUZ4CzvB3KM7L3tS1PQSaX8c0Ie6blnaem6lAm9wc4ToKO2wW
INDEED_CLIENT_ID=dbf9aa66788d08bf22993a4479ce4215f31ef73a8579ad5eac9cbee6c31dd95e
INDEED_REDIRECT_URL=http://localhost:3000/callback
```

⚠️ **IMPORTANT NOTE**: Your redirect URL is different from LinkedIn:
- **LinkedIn**: `http://localhost:3000/dashboard/integrations/callback`
- **Indeed**: `http://localhost:3000/callback`

Make sure this matches what you configured in your Indeed Developer Portal!

---

## 📝 Detailed File Explanations

### 1️⃣ `config.py` - Configuration Settings

**What it does:**
- Loads environment variables from `.env` file
- Provides centralized configuration for the entire application
- Makes credentials available throughout the codebase

**What I added:**
```python
# Indeed Integration
INDEED_API_ENDPOINT: str = "https://apis.indeed.com"
INDEED_CLIENT_ID: str = os.getenv("INDEED_CLIENT_ID", "")
INDEED_CLIENT_SECRET: str = os.getenv("INDEED_CLIENT_SECRET", "")
INDEED_REDIRECT_URI: str = os.getenv("INDEED_REDIRECT_URL", "http://localhost:3000/callback")
```

**Why it's needed:**
- Centralizes all Indeed API configuration
- Allows easy environment-specific configuration (dev/staging/production)
- Keeps sensitive credentials out of code (loaded from `.env`)

---

### 2️⃣ `integration.py` (Schemas) - Data Validation

**What it does:**
- Defines Pydantic models for request/response validation
- Ensures data sent to/from the API has the correct structure
- Provides automatic documentation in Swagger/OpenAPI

**What I added:**
```python
class IndeedAuthURLResponse(BaseModel):
    authorization_url: str

class IndeedCallbackRequest(BaseModel):
    code: str
    state: str

class IndeedJobPostRequest(BaseModel):
    title: str
    description: str
    location: str
    company: str
```

**Why it's needed:**
- **Type safety**: Prevents bugs by validating data types
- **Auto-documentation**: FastAPI generates API docs automatically
- **Client-server contract**: Defines what data the API expects/returns

---

### 3️⃣ `indeed_service.py` - Business Logic Layer

**What it does:**
This is the **core service** that handles all Indeed API interactions. It's responsible for:

#### 🔐 **OAuth2 Authentication Flow:**

1. **`get_authorization_url(state)`**
   - Generates the URL to redirect users to Indeed for login
   - Includes your `client_id`, `redirect_uri`, and CSRF protection `state`
   - User clicks this URL → goes to Indeed → logs in → grants permissions

2. **`exchange_code_for_token(code)`**
   - After user authorizes, Indeed redirects back with a `code`
   - This method exchanges that code for an `access_token`
   - The access token is used for all subsequent API calls

3. **`get_user_profile(access_token)`**
   - Fetches the employer's profile from Indeed
   - Gets employer ID and other profile information
   - Used to identify which Indeed account is connected

4. **`save_integration(user_id, token_data, profile_data)`**
   - Stores the access token and profile data in your database
   - Checks if integration already exists (update) or creates new one
   - Calculates token expiration time

#### 📤 **Job Posting:**

5. **`post_job_to_indeed(user_id, title, description, location, company)`**
   - Retrieves the stored access token for the user
   - Makes API call to Indeed to post a job
   - Returns the response from Indeed (job ID, status, etc.)

**Why it's needed:**
- **Separation of concerns**: Keeps business logic separate from API routes
- **Reusability**: Can be used by multiple endpoints or background tasks
- **Testability**: Easy to unit test without HTTP layer
- **Security**: Handles token management and API authentication

---

### 4️⃣ `indeed.py` (Router) - API Endpoints

**What it does:**
Defines the HTTP endpoints that your frontend will call. Each endpoint corresponds to a step in the integration flow.

#### 📍 **Endpoints:**

1. **`GET /api/v1/admin/integrations/indeed/login`**
   - **Purpose**: Start the OAuth flow
   - **Returns**: Authorization URL for Indeed
   - **Frontend action**: Redirect user to this URL
   
   ```json
   Response: {
     "authorization_url": "https://secure.indeed.com/oauth/v2/authorize?..."
   }
   ```

2. **`POST /api/v1/admin/integrations/indeed/callback`**
   - **Purpose**: Complete the OAuth flow
   - **Receives**: Authorization code from Indeed
   - **Returns**: Saved integration details
   - **What happens**: Exchanges code for token, saves to database
   
   ```json
   Request: {
     "code": "abc123...",
     "state": "random_csrf_token"
   }
   
   Response: {
     "id": 1,
     "platform": "indeed",
     "user_id": 123,
     "platform_user_id": "employer_id_from_indeed",
     "created_at": "2026-01-29T12:00:00Z",
     "expires_at": "2026-02-28T12:00:00Z"
   }
   ```

3. **`GET /api/v1/admin/integrations/indeed/status`**
   - **Purpose**: Check if user has connected Indeed
   - **Returns**: Connection status and details
   - **Use case**: Show "Connected" badge in UI
   
   ```json
   Response (connected): {
     "connected": true,
     "platform_user_id": "employer_123",
     "created_at": "2026-01-29T12:00:00Z",
     "expires_at": "2026-02-28T12:00:00Z"
   }
   
   Response (not connected): {
     "connected": false
   }
   ```

4. **`DELETE /api/v1/admin/integrations/indeed/disconnect`**
   - **Purpose**: Remove Indeed integration
   - **What happens**: Deletes stored tokens from database
   - **Use case**: "Disconnect" button in settings
   
   ```json
   Response: {
     "message": "Indeed disconnected successfully"
   }
   ```

5. **`POST /api/v1/admin/integrations/indeed/post-job`**
   - **Purpose**: Post a job to Indeed
   - **Receives**: Job details (title, description, location, company)
   - **Returns**: Indeed's response with job posting details
   
   ```json
   Request: {
     "title": "Senior Software Engineer",
     "description": "We are looking for...",
     "location": "San Francisco, CA",
     "company": "Evalyn Inc."
   }
   
   Response: {
     "jobId": "indeed_job_123",
     "status": "ACTIVE",
     "url": "https://indeed.com/job/123"
   }
   ```

**Why it's needed:**
- **API interface**: Provides HTTP endpoints for frontend to call
- **Authentication**: Uses `get_current_user` dependency to ensure user is logged in
- **Error handling**: Catches exceptions and returns proper HTTP error codes
- **Documentation**: FastAPI auto-generates Swagger docs from these routes

---

### 5️⃣ `main.py` - Application Registration

**What I added:**
```python
from src.api.routes.admin.integrations import linkedin as linkedin_integration, indeed as indeed_integration

app.include_router(
    indeed_integration.router, 
    prefix=f"{settings.API_V1_PREFIX}/admin/integrations/indeed", 
    tags=["admin-integrations-indeed"]
)
```

**What it does:**
- Registers the Indeed router with the FastAPI application
- Sets the URL prefix: `/api/v1/admin/integrations/indeed`
- Adds tags for API documentation grouping

**Why it's needed:**
- Without this, the endpoints won't be accessible
- Organizes routes under a common prefix
- Enables Swagger UI to group Indeed endpoints together

---

## 🔄 OAuth2 Flow Diagram

```
┌─────────────┐                                    ┌─────────────┐
│   Frontend  │                                    │   Backend   │
└──────┬──────┘                                    └──────┬──────┘
       │                                                  │
       │  1. GET /indeed/login                           │
       │─────────────────────────────────────────────────>│
       │                                                  │
       │  2. Return authorization_url                    │
       │<─────────────────────────────────────────────────│
       │                                                  │
       │  3. Redirect user to Indeed                     │
       │─────────────────────────>┌──────────────┐       │
       │                          │    Indeed    │       │
       │  4. User logs in         │   OAuth      │       │
       │     & authorizes         └──────┬───────┘       │
       │                                 │               │
       │  5. Indeed redirects back       │               │
       │     with code                   │               │
       │<────────────────────────────────┘               │
       │                                                  │
       │  6. POST /indeed/callback {code, state}         │
       │─────────────────────────────────────────────────>│
       │                                                  │
       │                          7. Exchange code for   │
       │                             access_token        │
       │                          ─────────────────────> │
       │                                    Indeed API   │
       │                          8. Return tokens       │
       │                          <───────────────────── │
       │                                                  │
       │                          9. Save to database    │
       │                          ───────────────────>   │
       │                                    Database     │
       │                                                  │
       │  10. Return integration details                 │
       │<─────────────────────────────────────────────────│
       │                                                  │
```

---

## 🎯 How to Use (Frontend Integration)

### Step 1: Start OAuth Flow
```typescript
// Call the login endpoint
const response = await fetch('/api/v1/admin/integrations/indeed/login');
const { authorization_url } = await response.json();

// Redirect user to Indeed
window.location.href = authorization_url;
```

### Step 2: Handle Callback
```typescript
// After Indeed redirects back to http://localhost:3000/callback?code=...&state=...
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');

// Send to backend
const response = await fetch('/api/v1/admin/integrations/indeed/callback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code, state })
});

const integration = await response.json();
console.log('Indeed connected!', integration);
```

### Step 3: Post a Job
```typescript
const response = await fetch('/api/v1/admin/integrations/indeed/post-job', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Senior Developer',
    description: 'Join our team...',
    location: 'Remote',
    company: 'Evalyn'
  })
});

const result = await response.json();
console.log('Job posted!', result);
```

---

## 🔍 Database Schema

The integration uses the existing `UserIntegration` model:

```python
class UserIntegration(Base):
    __tablename__ = "user_integrations"
    
    id: int                          # Primary key
    user_id: int                     # Foreign key to User
    platform: str                    # "indeed"
    platform_user_id: str            # Indeed employer ID
    access_token: str                # OAuth access token
    refresh_token: str               # OAuth refresh token (if provided)
    expires_at: datetime             # When token expires
    created_at: datetime             # When integration was created
    updated_at: datetime             # Last update time
```

---

## ⚠️ Important Notes & Potential Issues

### 1. **Redirect URI Mismatch**
Your `.env` has:
```
INDEED_REDIRECT_URL=http://localhost:3000/callback
```

Make sure this **EXACTLY** matches what you configured in the Indeed Developer Portal. Even a trailing slash difference will cause OAuth to fail!

### 2. **Indeed API Scope**
I used `employer_access` as the OAuth scope. Verify this is correct for your Indeed API plan. You might need different scopes like:
- `employer_access` - Basic employer features
- `post_jobs` - Job posting permissions
- `read_employer_info` - Read employer profile

Check Indeed's documentation for the correct scopes.

### 3. **API Endpoints**
Indeed's API endpoints might differ based on your API version. I used:
- Auth: `https://secure.indeed.com/oauth/v2/authorize`
- Token: `https://apis.indeed.com/oauth/v2/tokens`
- Jobs: `https://apis.indeed.com/v1/jobs`

Verify these with Indeed's official documentation.

### 4. **Job Posting Payload**
The job posting payload I used is a basic structure:
```python
{
    "title": "...",
    "description": "...",
    "location": "...",
    "company": "...",
    "jobType": "FULL_TIME",
    "postingStatus": "ACTIVE"
}
```

Indeed might require additional fields like:
- `salary`
- `requirements`
- `benefits`
- `applicationMethod`

Check Indeed's API documentation for required fields.

### 5. **Token Refresh**
The current implementation doesn't handle token refresh. If Indeed tokens expire, you'll need to implement a refresh mechanism using the `refresh_token`.

---

## 🧪 Testing the Integration

### 1. Check if endpoints are registered:
Visit: `http://127.0.0.1:2024/docs`

You should see a new section: **admin-integrations-indeed** with 5 endpoints:
- GET `/api/v1/admin/integrations/indeed/login`
- POST `/api/v1/admin/integrations/indeed/callback`
- GET `/api/v1/admin/integrations/indeed/status`
- DELETE `/api/v1/admin/integrations/indeed/disconnect`
- POST `/api/v1/admin/integrations/indeed/post-job`

### 2. Test the login endpoint:
```bash
curl http://127.0.0.1:2024/api/v1/admin/integrations/indeed/login
```

Should return:
```json
{
  "authorization_url": "https://secure.indeed.com/oauth/v2/authorize?..."
}
```

### 3. Test the status endpoint (requires authentication):
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://127.0.0.1:2024/api/v1/admin/integrations/indeed/status
```

---

## 📚 Comparison: LinkedIn vs Indeed

| Feature | LinkedIn | Indeed |
|---------|----------|--------|
| **Auth URL** | `linkedin.com/oauth/v2/authorization` | `secure.indeed.com/oauth/v2/authorize` |
| **Token URL** | `linkedin.com/oauth/v2/accessToken` | `apis.indeed.com/oauth/v2/tokens` |
| **API Base** | `api.linkedin.com/v2` | `apis.indeed.com` |
| **Scope** | `openid profile email w_member_social` | `employer_access` |
| **Redirect URI** | `/dashboard/integrations/callback` | `/callback` |
| **Platform ID** | `sub` from userinfo | `id` or `employer_id` |
| **Post Endpoint** | `/ugcPosts` | `/v1/jobs` |

---

## ✅ Checklist

- [x] Config settings added to `config.py`
- [x] Schemas created in `integration.py`
- [x] Service layer created (`indeed_service.py`)
- [x] Router created (`indeed.py`)
- [x] Router registered in `main.py`
- [x] Router exported in `__init__.py`
- [ ] **TODO**: Verify Indeed API endpoints with official docs
- [ ] **TODO**: Test OAuth flow end-to-end
- [ ] **TODO**: Implement token refresh mechanism
- [ ] **TODO**: Add error handling for expired tokens
- [ ] **TODO**: Update frontend to use Indeed endpoints

---

## 🎓 Key Concepts Explained

### What is OAuth2?
OAuth2 is an authorization framework that lets users grant your app access to their Indeed account without sharing their password. It works through:
1. **Authorization Code**: User logs in to Indeed, you get a temporary code
2. **Access Token**: Exchange code for a token that proves you're authorized
3. **API Calls**: Use the token to make API requests on behalf of the user

### What is a Service Layer?
The service layer contains business logic separate from HTTP handling. Benefits:
- **Reusability**: Same logic can be used by API, CLI, background jobs
- **Testability**: Easy to test without HTTP layer
- **Maintainability**: Changes to business logic don't affect API structure

### What is a Router?
In FastAPI, a router is a collection of related endpoints. It helps organize your API:
- Groups related functionality (all Indeed endpoints together)
- Applies common prefixes (`/admin/integrations/indeed`)
- Enables modular application structure

---

## 🚀 Next Steps

1. **Restart your backend** to load the new code:
   ```bash
   # Stop current server (Ctrl+C)
   uv run langgraph dev
   ```

2. **Verify endpoints** in Swagger UI:
   - Visit: `http://127.0.0.1:2024/docs`
   - Look for "admin-integrations-indeed" section

3. **Test OAuth flow**:
   - Call `/login` endpoint
   - Visit the returned URL
   - Complete Indeed authorization
   - Handle callback in your frontend

4. **Implement frontend**:
   - Create Indeed integration page
   - Add "Connect Indeed" button
   - Handle OAuth callback
   - Show connection status

---

## 📞 Support

If you encounter any issues:

1. **Check logs** for error messages
2. **Verify .env** credentials are correct
3. **Confirm redirect URI** matches Indeed Developer Portal
4. **Test endpoints** in Swagger UI first
5. **Check Indeed API docs** for any API changes

---

**Created by**: Antigravity AI
**Date**: 2026-01-29
**Version**: 1.0
