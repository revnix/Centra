# Quick Testing Guide - Job Creation Workflow

## 🚀 How to Test the New Workflow

### Step 1: Create a New Job
1. Navigate to **Dashboard → Jobs → Create New Job**
2. Fill in the job details:
   - Job Title (e.g., "Senior Product Manager")
   - Department (e.g., "Product")
   - Location (e.g., "Remote")
   - Job Type (e.g., "Full-time")
   - Description (or use Auto-Generate)
3. Click **Next: AI Config**

### Step 2: Configure AI Settings
1. Enter Required Skills (e.g., "Product Management, Agile, Data Analysis")
2. Select Experience Level (e.g., "Mid-Level")
3. Click **Next: Review & Generate**

### Step 3: Review AI-Generated Job
1. Wait for AI to generate the job description
2. Review the generated content:
   - Job title and location
   - Summary
   - Skills
   - Responsibilities
   - Requirements
   - Benefits
3. Notice the **single "Save to DB" button** at the bottom

### Step 4: Save to Database
1. Click **"Save to DB"** button
2. Wait for success notification: "Job saved successfully!"
3. You will be automatically redirected to **Generated Jobs** page

### Step 5: View Saved Jobs
1. You should now see your job in the **Generated Jobs** list
2. The job card shows:
   - Job title
   - "AI Generated" badge
   - Creation date
   - Department and location
   - Description preview
3. Click **"Review Details"** button

### Step 6: Access Action Buttons
1. On the job details page, you'll see **two action buttons**:
   - **"Suggest Improvements"** (outlined button)
   - **"Launch Job Post"** (blue button)

### Step 7: Test Publishing (Optional)
1. Click **"Launch Job Post"**
2. A dialog will open showing connected accounts
3. Select which platforms to publish to (LinkedIn, Indeed)
4. Click **"Publish to X Account(s)"**
5. Wait for success notification

## ✅ Expected Behavior

### On Job Creation Screen
- ✅ Only ONE button visible: "Save to DB"
- ✅ NO "Suggest Improvements" button
- ✅ NO "Launch Job Post" button
- ✅ Button shows loading state when saving
- ✅ Success toast appears after save
- ✅ Automatic redirect to Generated Jobs

### On Generated Jobs Page
- ✅ Saved job appears in the list
- ✅ Job has "draft" status
- ✅ "Review Details" button is clickable
- ✅ Job data is correctly displayed

### On Job Details Page
- ✅ TWO action buttons visible for draft jobs
- ✅ "Suggest Improvements" shows info toast
- ✅ "Launch Job Post" opens publish dialog
- ✅ Publish dialog loads connected accounts
- ✅ Can select/deselect accounts
- ✅ Publish button is disabled if no accounts selected
- ✅ Publishing shows loading state
- ✅ Success/error toasts appear appropriately

## 🐛 Common Issues & Solutions

### Issue: "Failed to save job"
**Solution**: 
- Check that backend is running on port 2024
- Verify you're logged in (token exists in localStorage)
- Check browser console for detailed error

### Issue: Job doesn't appear in Generated Jobs
**Solution**:
- Refresh the page
- Check that status filter is set to "draft" or "all"
- Verify job was actually saved (check backend logs)

### Issue: "Failed to load integrations"
**Solution**:
- Go to Dashboard → Integrations
- Connect at least one account (LinkedIn or Indeed)
- Try again

### Issue: Publishing fails with Cloudflare error
**Solution**:
- This is expected for Indeed API (see INDEED_API_TROUBLESHOOTING.md)
- The system will retry automatically
- Wait a few minutes and try again

## 📊 Database Verification

To verify jobs are being saved correctly, you can check the database:

```sql
-- View all draft jobs
SELECT id, title, status, created_by, created_at 
FROM posts 
WHERE status = 'draft' 
ORDER BY created_at DESC;

-- View job details
SELECT * FROM posts WHERE id = <job_id>;
```

## 🔍 API Endpoints Used

1. **POST /api/v1/jobs** - Create new job
   - Request: Job data (title, description, skills, etc.)
   - Response: Created job with ID and status

2. **GET /api/v1/jobs?status=draft** - Get draft jobs
   - Response: List of user's draft jobs

3. **GET /api/v1/jobs/{id}** - Get job details
   - Response: Full job data

4. **GET /api/v1/integrations** - Get connected accounts
   - Response: List of user's integrations

5. **POST /api/v1/integrations/linkedin/publish** - Publish to LinkedIn
   - Request: Post content
   - Response: Success/error

6. **POST /api/v1/integrations/indeed/post-job** - Publish to Indeed
   - Request: Job data
   - Response: Success/error

## 📝 Test Checklist

- [ ] Can create a new job with AI generation
- [ ] "Save to DB" button appears on creation screen
- [ ] No "Suggest Improvements" or "Launch Job Post" buttons on creation screen
- [ ] Clicking "Save to DB" saves the job
- [ ] Success toast appears after saving
- [ ] Redirects to Generated Jobs page
- [ ] Saved job appears in the list
- [ ] Can click on job to view details
- [ ] "Suggest Improvements" button appears on details page
- [ ] "Launch Job Post" button appears on details page
- [ ] Clicking "Suggest Improvements" shows info toast
- [ ] Clicking "Launch Job Post" opens dialog
- [ ] Dialog shows connected accounts
- [ ] Can select/deselect accounts
- [ ] Can publish to selected platforms
- [ ] Success/error messages appear correctly

## 🎯 Success Criteria

The implementation is successful if:
1. ✅ Users can save jobs without publishing
2. ✅ Saved jobs persist in the database
3. ✅ Jobs appear in Generated Jobs section
4. ✅ Action buttons are available on job details page
5. ✅ Publishing workflow works from job details
6. ✅ Error handling provides clear feedback
7. ✅ UI is intuitive and matches requirements

---

**Last Updated**: 2026-01-30
**Status**: Ready for Testing
