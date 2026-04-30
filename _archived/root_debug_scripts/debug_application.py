
import requests
import json
import os

url = "http://localhost:8123/api/v1/applications/guest"

file_path = "dummy_resume.pdf"
# Ensure dummy file exists
if not os.path.exists(file_path):
    with open(file_path, "wb") as f:
        f.write(b"dummy content")

files = {
    'resume_file': ('dummy_resume.pdf', open(file_path, 'rb'), 'application/pdf')
}

data = {
    'job_id': '18',
    'full_name': 'Test User',
    'email': 'test@example.com',
    'phone_number': '1234567890',
    'linkedin_url': 'https://linkedin.com/in/test',
    'skills': '[]',
    'experience_years': '0'
}

print(f"Sending request to {url}")
try:
    response = requests.post(url, data=data, files=files)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
