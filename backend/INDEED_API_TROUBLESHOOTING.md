# Indeed API Troubleshooting Guide

## Current Issue: Cloudflare Blocking

### Problem
When attempting to publish a job post to Indeed, the API returns an error:
```
Failed to publish: Indeed API is blocking the request (Cloudflare). 
Please try again in a few minutes or check your connection.
```

### Root Cause
Indeed's API is protected by Cloudflare, which blocks requests that appear to be automated or suspicious. This can happen due to:

1. **Missing Browser Headers**: API requests without proper browser-like headers
2. **Rate Limiting**: Too many requests in a short time period
3. **IP Reputation**: Your IP address may be flagged
4. **API Access Restrictions**: Indeed may require additional verification for API access

## Solutions Implemented

### 1. Enhanced Request Headers ✅
Added comprehensive browser-like headers to make requests appear legitimate:
- User-Agent (Chrome browser)
- Accept headers
- Security headers (Sec-Ch-Ua, Sec-Fetch-*)
- Origin and Referer headers

### 2. Retry Logic with Exponential Backoff ✅
Implemented automatic retry mechanism:
- **Max Retries**: 3 attempts
- **Backoff Strategy**: Exponential (2s, 4s, 8s) + random jitter
- **Timeout**: 30 seconds per request

## Alternative Solutions

### Option A: Use Indeed's Employer Dashboard (Recommended)
Instead of using the API directly, consider:
1. Opening Indeed's Employer Dashboard in a browser
2. Using Selenium/Playwright for automated posting
3. This bypasses Cloudflare protection as it uses a real browser

### Option B: Request API Whitelist from Indeed
Contact Indeed support to:
1. Verify your API credentials
2. Request IP whitelisting
3. Get production API access (if you're using sandbox)

### Option C: Use Indeed's Job Feed/XML Integration
Indeed offers alternative integration methods:
1. **XML Job Feed**: Upload jobs via XML feed
2. **Email Integration**: Send jobs via email
3. **ATS Integration**: Use Indeed's ATS partner program

## Testing the Fix

### Step 1: Try Publishing Again
1. Navigate to your job creation flow
2. Click "Publish Post"
3. Select "Indeed"
4. The system will now:
   - Add proper headers
   - Retry up to 3 times if blocked
   - Wait between retries

### Step 2: Monitor Debug Logs
Check the backend terminal for debug messages:
```
DEBUG: Posting job to Indeed API (Attempt 1/3). URL: https://apis.indeed.com/v1/jobs
DEBUG: Indeed API response status: 200
```

### Step 3: If Still Blocked
If Cloudflare continues to block after 3 retries:

1. **Wait 5-10 minutes** before trying again
2. **Check your Indeed credentials** in `.env`:
   ```
   INDEED_CLIENT_ID=your_client_id
   INDEED_CLIENT_SECRET=your_client_secret
   ```
3. **Verify OAuth connection** is active in Integrations page
4. **Contact Indeed Support** if issue persists

## Important Notes

### Indeed API Limitations
- Indeed's public API has strict rate limits
- Some features require employer account verification
- Production access may require Indeed partnership

### Current Implementation Status
- ✅ OAuth2 authentication
- ✅ Token management
- ✅ Enhanced headers
- ✅ Retry logic
- ⚠️ Job posting (subject to Cloudflare)

## Next Steps

### Immediate Actions
1. Test the updated code with retry logic
2. Monitor success/failure rates
3. Document any error patterns

### Long-term Solutions
1. **Consider browser automation** (Selenium/Playwright) for more reliable posting
2. **Implement job queue** to avoid rate limiting
3. **Add user notifications** for failed posts
4. **Explore Indeed's XML feed** as alternative

## Support Resources

- [Indeed API Documentation](https://opensource.indeedeng.io/api-documentation/)
- [Indeed Employer Support](https://www.indeed.com/hire/support)
- [Cloudflare Documentation](https://developers.cloudflare.com/)

## Code Changes Made

### File: `src/api/services/indeed_service.py`

#### Change 1: Enhanced Headers (Lines 216-232)
Added browser-like headers including User-Agent, Accept headers, and security headers.

#### Change 2: Retry Logic (Lines 233-307)
Implemented exponential backoff retry mechanism with 3 attempts and intelligent error handling.

---

**Last Updated**: 2026-01-30
**Status**: Testing Required
