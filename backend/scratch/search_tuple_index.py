import re

path = r"c:\Users\Admin\Desktop\ai proctor\backend\routes\interview_routes.py"
try:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Match pattern like row[0] or row[1] or user[2]
    matches = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\[\d+\]', content)
    if matches:
        print("Found tuple index lookups in interview_routes.py:")
        for m in set(matches[:20]):
            print(f"  {m}")
    else:
        print("No tuple index lookups found.")
except Exception as e:
    print("Error:", e)
