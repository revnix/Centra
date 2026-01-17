import pytest

@pytest.mark.asyncio
async def test_full_flow(client):
    # 1. Register Admin
    admin_data = {"email": "admin@example.com", "password": "password123", "role": "admin"}
    response = await client.post("/api/v1/auth/register", json=admin_data)
    assert response.status_code == 201, f"Admin register failed: {response.text}"
    
    # 2. Login Admin
    login_data = {"username": "admin@example.com", "password": "password123"}
    response = await client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    admin_token = response.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 3. Create Job (Admin)
    job_data = {
        "title": "Backend Dev",
        "summary": "Python FastAPI",
        "company_name": "Tech Corp",
        "location": "Remote",
        "salary": "120k",
        "skills": "Python, SQL",
        "responsibilities": "Develop APIs",
        "requirements": "3+ years experience",
        "preferred_qualifications": "FastAPI knowledge",
        "benefits": "Health insurance, 401k"
    }
    response = await client.post("/api/v1/jobs/", json=job_data, headers=admin_headers)
    assert response.status_code == 201, f"Create job failed: {response.text}"
    job_id = response.json()["id"]

    # 4. Register Guest
    guest_data = {"email": "guest@example.com", "password": "password123", "role": "guest"}
    response = await client.post("/api/v1/auth/register", json=guest_data)
    assert response.status_code == 201, f"Guest register failed: {response.text}"
    
    # 5. Login Guest
    login_data = {"username": "guest@example.com", "password": "password123"}
    response = await client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200, f"Guest login failed: {response.text}"
    guest_token = response.json()["access_token"]
    guest_headers = {"Authorization": f"Bearer {guest_token}"}
    
    # 6. Guest tries to create job (Should fail)
    response = await client.post("/api/v1/jobs/", json=job_data, headers=guest_headers)
    assert response.status_code == 403, "Guest was able to create job!"
    
    # 7. Guest views jobs
    response = await client.get("/api/v1/jobs/", headers=guest_headers)
    assert response.status_code == 200, f"Guest view jobs failed: {response.text}"
    assert len(response.json()) >= 1
    assert response.json()[0]["title"] == "Backend Dev"

    # 8. User Listing (Admin only)
    response = await client.get("/api/v1/users/", headers=admin_headers)
    assert response.status_code == 200
    
    response = await client.get("/api/v1/users/", headers=guest_headers)
    assert response.status_code == 403
