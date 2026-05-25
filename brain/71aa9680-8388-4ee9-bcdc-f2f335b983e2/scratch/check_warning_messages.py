import sys

with open("c:/Users/Admin/Desktop/ai proctor/frontend/src/pages/ActiveInterview.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

sys.stdout.reconfigure(encoding='utf-8')

for i, line in enumerate(lines):
    if "setWarningMessage" in line:
        print(f"Line {i+1}: {line.strip()}")
        start = max(0, i - 3)
        end = min(len(lines), i + 4)
        print("Surrounding lines:")
        for j in range(start, end):
            print(f"  {j+1}: {lines[j].strip()}")
        print("-" * 40)
