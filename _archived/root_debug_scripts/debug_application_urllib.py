
import urllib.request
import urllib.parse
import os
import uuid

url = "http://localhost:8123/api/v1/applications/guest"
file_path = "dummy_resume.pdf"

if not os.path.exists(file_path):
    with open(file_path, "wb") as f:
        f.write(b"dummy pdf content")

boundary = str(uuid.uuid4())
data = []

fields = {
    'job_id': '18',
    'full_name': 'Test User',
    'email': 'test@example.com',
    'phone_number': '1234567890',
    'linkedin_url': 'https://linkedin.com/in/test',
    'skills': '[]',
    'experience_years': '0'
}

for name, value in fields.items():
    data.append(f'--{boundary}')
    data.append(f'Content-Disposition: form-data; name="{name}"')
    data.append('')
    data.append(str(value))

# File
filename = os.path.basename(file_path)
with open(file_path, 'rb') as f:
    file_content = f.read()

data.append(f'--{boundary}')
data.append(f'Content-Disposition: form-data; name="resume_file"; filename="{filename}"')
data.append('Content-Type: application/pdf')
data.append('')
# Binary data handling in list of strings is tricky, so we separate body construction
# We will construct body as bytes

body = b''
for item in data:
    body += item.encode('utf-8') + b'\r\n'

body += file_content + b'\r\n'
body += f'--{boundary}--'.encode('utf-8') + b'\r\n'

headers = {
    'Content-Type': f'multipart/form-data; boundary={boundary}',
    'Content-Length': str(len(body))
}

req = urllib.request.Request(url, data=body, headers=headers, method='POST')

print(f"Sending request to {url}")
try:
    with urllib.request.urlopen(req) as response:
        print(f"Status Code: {response.getcode()}")
        print(f"Response Body: {response.read().decode('utf-8')}")
except urllib.error.HTTPError as e:
    print(f"Status Code: {e.code}")
    print(f"Response Body: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
