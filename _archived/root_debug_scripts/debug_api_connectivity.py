
import urllib.request
import json
import sys

def test_endpoint(url):
    print(f"Testing {url}")
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            print(f"Status: {response.status}")
            print(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code}")
        print(e.read().decode('utf-8'))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    base_url = "http://localhost:8123/api/v1"
    test_endpoint("http://localhost:8123/") # Root
    test_endpoint(f"{base_url}/applications/") # Should be 200 now
