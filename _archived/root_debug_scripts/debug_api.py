import requests
import json

def test_api():
    url = "http://localhost:8123/api/v1/integrations"
    print(f"Testing {url}...")
    try:
        # We don't have a real token here, but we want to see the error structure
        response = requests.get(url)
        print(f"Status: {response.status_code}")
        print(f"Body: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_api()
