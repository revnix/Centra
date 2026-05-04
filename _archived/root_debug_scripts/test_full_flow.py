
import urllib.request
import json
import ssl

# Ignore SSL verification for local testing if needed
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def post_json(url, data, headers=None):
    if headers is None:
        headers = {}
    headers['Content-Type'] = 'application/json'
    
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            return response.status, json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))
    except Exception as e:
        return 0, str(e)

def get_json(url, headers=None):
    if headers is None:
        headers = {}
    
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            return response.status, json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))
    except Exception as e:
        return 0, str(e)

if __name__ == "__main__":
    base_url = "http://localhost:8123/api/v1"
    
    # 1. Login
    print("Attempting login...")
    status, res = post_json(f"{base_url}/auth/login", {"email": "admin@example.com", "password": "password123"})
    print(f"Login Status: {status}")
    if status != 200:
        print(f"Login failed: {res}")
        exit(1)

    token = res['access_token']
    print("Login successful.")

    # 2. List Applications
    print("Fetching applications...")
    status, res = get_json(f"{base_url}/applications/", {"Authorization": f"Bearer {token}"})
    print(f"List Applications Status: {status}")
    if status == 200:
        print(f"Found {len(res)} applications.")
        # print(json.dumps(res, indent=2))
    else:
        print(f"Error fetching applications: {res}")
