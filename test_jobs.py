
import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def test_jobs_proxy():
    url = "http://localhost:3000/api/v1/jobs/"
    print(f"Testing Jobs Proxy: {url}")
    
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, context=ctx) as resp:
            print(f"Jobs Proxy Status: {resp.status}")
            data = json.loads(resp.read().decode('utf-8'))
            print(f"Found {len(data)} jobs.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_jobs_proxy()
