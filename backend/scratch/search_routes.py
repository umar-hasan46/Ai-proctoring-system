import sys
sys.path.insert(0, '.')
from app import app

for rule in app.url_map.iter_rules():
    print(f"{rule.endpoint} -> {rule.rule} ({', '.join(rule.methods)})")
