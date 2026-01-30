# Indeed Integration - Quick Reference

## 🎯 What Was Done

### Files Created:
1. ✅ `backend/src/api/services/indeed_service.py` - Indeed OAuth & API service
2. ✅ `backend/src/api/routes/admin/integrations/indeed.py` - API endpoints
3. ✅ `backend/INDEED_INTEGRATION_GUIDE.md` - Full documentation

### Files Modified:
1. ✅ `backend/src/api/core/config.py` - Added Indeed config
2. ✅ `backend/src/api/schemas/integration.py` - Added Indeed schemas
3. ✅ `backend/src/api/main.py` - Registered Indeed router
4. ✅ `backend/src/api/routes/admin/integrations/__init__.py` - Exported router

---

## 📡 API Endpoints

All endpoints are prefixed with: `/api/v1/admin/integrations/indeed`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/login` | Get Indeed authorization URL |
| POST | `/callback` | Complete OAuth flow |
| GET | `/status` | Check connection status |
| DELETE | `/disconnect` | Remove integration |
| POST | `/post-job` | Post a job to Indeed |

---

## 🔧 Environment Variables

Already configured in your `.env`:

```env
INDEED_CLIENT_ID=dbf9aa66788d08bf22993a4479ce4215f31ef73a8579ad5eac9cbee6c31dd95e
INDEED_CLIENT_SECRET=gn6VUBG6MxQ5ypzdUZ4CzvB3KM7L3tS1PQSaX8c0Ie6blnaem6lAm9wc4ToKO2wW
INDEED_REDIRECT_URL=http://localhost:3000/callback
```

⚠️ **Important**: Verify `INDEED_REDIRECT_URL` matches your Indeed Developer Portal settings!

---

## 🚀 Quick Start

### 1. Restart Backend
```bash
# Stop current server (Ctrl+C in terminal)
# Then restart:
uv run langgraph dev
```

### 2. Verify in Swagger UI
Visit: `http://127.0.0.1:2024/docs`

Look for section: **admin-integrations-indeed**

### 3. Test Login Endpoint
```bash
curl http://127.0.0.1:2024/api/v1/admin/integrations/indeed/login
```

Expected response:
```json
{
  "authorization_url": "https://secure.indeed.com/oauth/v2/authorize?..."
}
```

---

## 🔄 OAuth Flow

```
1. Frontend calls: GET /indeed/login
2. Backend returns: authorization_url
3. Frontend redirects user to Indeed
4. User logs in and authorizes
5. Indeed redirects to: http://localhost:3000/callback?code=...
6. Frontend calls: POST /indeed/callback with code
7. Backend exchanges code for token
8. Backend saves integration to database
9. Integration complete! ✅
```

---

## 📝 Example: Post a Job

```typescript
const response = await fetch('/api/v1/admin/integrations/indeed/post-job', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({
    title: 'Senior Software Engineer',
    description: 'We are looking for an experienced developer...',
    location: 'San Francisco, CA',
    company: 'Evalyn Inc.'
  })
});

const result = await response.json();
console.log('Job posted:', result);
```

---

## ⚠️ Potential Issues

### Issue 1: "Redirect URI mismatch"
**Solution**: Ensure `.env` INDEED_REDIRECT_URL exactly matches Indeed Developer Portal

### Issue 2: "Invalid scope"
**Solution**: Verify `employer_access` is the correct scope for your Indeed API plan

### Issue 3: "Invalid client credentials"
**Solution**: Double-check INDEED_CLIENT_ID and INDEED_CLIENT_SECRET in `.env`

### Issue 4: Endpoints not found
**Solution**: Restart backend server to load new routes

---

## 📚 File Purposes

| File | Purpose |
|------|---------|
| `config.py` | Loads Indeed credentials from .env |
| `integration.py` | Validates request/response data |
| `indeed_service.py` | Handles OAuth & Indeed API calls |
| `indeed.py` | Defines HTTP endpoints |
| `main.py` | Registers routes with FastAPI |

---

## 🎓 Key Differences: LinkedIn vs Indeed

| Aspect | LinkedIn | Indeed |
|--------|----------|--------|
| Redirect URI | `/dashboard/integrations/callback` | `/callback` |
| OAuth Scope | `w_member_social` | `employer_access` |
| Post Type | Social post | Job posting |
| API Endpoint | `api.linkedin.com/v2` | `apis.indeed.com` |

---

## ✅ Next Steps

1. [ ] Restart backend server
2. [ ] Test endpoints in Swagger UI
3. [ ] Verify Indeed Developer Portal settings
4. [ ] Implement frontend OAuth flow
5. [ ] Test end-to-end integration
6. [ ] Add error handling for edge cases

---

## 📖 Full Documentation

For detailed explanations, see: `INDEED_INTEGRATION_GUIDE.md`

---

**Status**: ✅ Implementation Complete
**Ready for**: Testing & Frontend Integration
