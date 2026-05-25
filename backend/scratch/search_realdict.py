import os

backend_dir = r"c:\Users\Admin\Desktop\ai proctor\backend"
found = False

for root, dirs, files in os.walk(backend_dir):
    for file in files:
        if file.endswith('.py'):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                if 'RealDictCursor' in content:
                    print(f"Found in: {os.path.relpath(path, backend_dir)}")
                    found = True
            except Exception:
                pass

if not found:
    print("RealDictCursor not found anywhere in the backend.")
