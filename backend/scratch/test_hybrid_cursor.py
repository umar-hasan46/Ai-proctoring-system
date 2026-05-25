import psycopg2
import psycopg2.extras

# Redefining RealDictCursor to act as a hybrid cursor
class HybridRow(psycopg2.extras.RealDictRow):
    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self.values())[key]
        return super().__getitem__(key)

class RealDictCursor(psycopg2.extras.RealDictCursor):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.row_factory = HybridRow

# Mock RealDictRow creation to verify without active db connection
from collections import OrderedDict

# Create mock row
description = [('id', 23), ('email', 23), ('password', 23)]
row = HybridRow(description)
row['id'] = 1
row['email'] = 'admin@gmail.com'
row['password'] = 'admin123'

print("--- Testing Hybrid Row Access ---")
print("Access by name ('email'):", row['email'])
print("Access by index (0):", row[0])
print("Access by index (1):", row[1])
print("Access by index (2):", row[2])

assert row['email'] == 'admin@gmail.com'
assert row[0] == 1
assert row[1] == 'admin@gmail.com'
assert row[2] == 'admin123'
print("SUCCESS: Hybrid RealDictCursor row supports both name and index access flawlessly!")
