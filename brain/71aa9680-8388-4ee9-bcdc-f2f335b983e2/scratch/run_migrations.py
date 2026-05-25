import sys
import os

sys.path.append("c:\\Users\\Admin\\Desktop\\ai proctor\\backend")

from app import app
from db import init_db

print("Starting migrations...")
with app.app_context():
    init_db()
print("Migrations completed successfully!")
