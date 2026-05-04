import socket
try:
    host = "ep-aged-wave-a1yo44hi-pooler.ap-southeast-1.aws.neon.tech"
    print(f"Resolving {host}...")
    ip = socket.gethostbyname(host)
    print(f"Resolved to: {ip}")
except Exception as e:
    print(f"Resolution failed: {e}")
