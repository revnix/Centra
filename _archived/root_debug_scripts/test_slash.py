
import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def test_backend_no_slash():
    url = "http://localhost:8123/api/v1/applications" # No slash
    print(f"Testing Backend Direct (No Slash): {url}")
    
    login_url = "http://localhost:8123/api/v1/auth/login"
    login_data = {"email": "admin@company.com", "password": "password"}
    
    try:
        req = urllib.request.Request(login_url, data=json.dumps(login_data).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')
        with urllib.request.urlopen(req, context=ctx) as resp:
            token = json.loads(resp.read().decode('utf-8'))['access_token']
        
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req, context=ctx) as resp:
            print(f"Direct Response Status: {resp.status}")
            
    except Exception as e:
        print(f"Error: {e}")
        if hasattr(e, 'read'):
            print(e.read().decode('utf-8'))

if __name__ == "__main__":
    test_backend_no_slash()
