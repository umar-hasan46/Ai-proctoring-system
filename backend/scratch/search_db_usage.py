import os
import re

backend_dir = r"c:\Users\Admin\Desktop\ai proctor\backend"

for root, dirs, files in os.walk(backend_dir):
    for file in files:
        if file.endswith('.py'):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Check for get_db_connection
                matches_conn = [m.start() for m in re.finditer(r'get_db_connection\(\)', content)]
                if matches_conn:
                    print(f"File: {os.path.relpath(path, backend_dir)}")
                    lines = content.splitlines()
                    for idx, line in enumerate(lines):
                        if 'get_db_connection' in line or '.cursor(' in line:
                            print(f"  Line {idx+1}: {line.strip()}")
            except Exception as e:
                pass
