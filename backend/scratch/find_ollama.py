import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('c:/Users/Admin/Desktop/ai proctor/backend/routes/interview_routes.py', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if 'ask_ollama' in line or 'ollama' in line.lower():
            print(f"{i}: {line.rstrip()}")
