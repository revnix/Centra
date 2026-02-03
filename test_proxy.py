
import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def test_proxy():
    url = "http://localhost:3000/api/v1/applications/"
    print(f"Testing Proxy: {url}")
    # We need a token. Let's try to get it from the backend first.
    login_url = "http://localhost:8123/api/v1/auth/login"
    login_data = {"email": "admin@company.com", "password": "password"}
    
    try:
        req = urllib.request.Request(login_url, data=json.dumps(login_data).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')
        with urllib.request.urlopen(req, context=ctx) as resp:
            token = json.loads(resp.read().decode('utf-8'))['access_token']
            print("Login successful.")
        
        # Now hit the proxy
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req, context=ctx) as resp:
            print(f"Proxy Response Status: {resp.status}")
            data = json.loads(resp.read().decode('utf-8'))
            print(f"Found {len(data)} applications via proxy.")
            
    except Exception as e:
        print(f"Error: {e}")
        if hasattr(e, 'read'):
            print(e.read().decode('utf-8'))

if __name__ == "__main__":
    test_proxy()
