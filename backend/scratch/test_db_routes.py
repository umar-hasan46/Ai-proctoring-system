import sys
import os

# Add backend directory to python path
backend_dir = r"c:\Users\Admin\Desktop\ai proctor\backend"
sys.path.insert(0, backend_dir)

# Override get_db_connection to return None (simulating down db)
import db
db.get_db_connection = lambda: None

from app import app
import json

client = app.test_client()

print("--- Testing /health/db ---")
res = client.get('/health/db')
print("Status:", res.status_code)
print("Data:", res.get_json())

print("\n--- Testing /api/auth/signup ---")
res = client.post('/api/auth/signup', 
                  data=json.dumps({"email": "test@test.com", "password": "pass"}),
                  content_type='application/json')
print("Status:", res.status_code)
print("Data:", res.get_json())

print("\n--- Testing /api/auth/user/login ---")
res = client.post('/api/auth/user/login', 
                  data=json.dumps({"email": "test@test.com", "password": "pass"}),
                  content_type='application/json')
print("Status:", res.status_code)
print("Data:", res.get_json())

print("\n--- Testing /api/auth/admin/login ---")
res = client.post('/api/auth/admin/login', 
                  data=json.dumps({"email": "test@test.com", "password": "pass"}),
                  content_type='application/json')
print("Status:", res.status_code)
print("Data:", res.get_json())

print("\n--- Testing /api/auth/login (unified login) ---")
res = client.post('/api/auth/login', 
                  data=json.dumps({"email": "test@test.com", "password": "pass"}),
                  content_type='application/json')
print("Status:", res.status_code)
print("Data:", res.get_json())
