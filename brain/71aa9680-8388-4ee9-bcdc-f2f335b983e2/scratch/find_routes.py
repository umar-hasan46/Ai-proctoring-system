with open("c:/Users/Admin/Desktop/ai proctor/backend/routes/interview_routes.py", "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if "@bp.route" in line:
            print(f"Line {i+1}: {line.strip()}")
