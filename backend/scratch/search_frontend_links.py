import os
import re

frontend_dir = r"c:\Users\Admin\Desktop\ai proctor\frontend\src"

for root, dirs, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith(('.jsx', '.js', '.css')):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Check for href="#"
                matches = re.finditer(r'href\s*=\s*["\']#["\']', content)
                for m in matches:
                    start = max(0, m.start() - 30)
                    end = min(len(content), m.end() + 30)
                    snippet = content[start:end].replace('\n', ' ')
                    print(f"File: {os.path.relpath(path, frontend_dir)}")
                    print(f"  Line {content[:m.start()].count(chr(10))+1}: ...{snippet}...")
            except Exception:
                pass
