import psycopg2.extras

class HybridRow(psycopg2.extras.RealDictRow):
    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self.values())[key]
        return super().__getitem__(key)

    def __iter__(self):
        return iter(self.values())

row = HybridRow([('a', 1), ('b', 2)])
print("Unpacking standard values (a, b = row):")
try:
    a, b = row
    print("a =", a, "b =", b)
except Exception as e:
    print("Unpacking error:", e)

print("\nConverting to dict via dict(row):")
try:
    d = dict(row)
    print("dict(row) =", d)
except Exception as e:
    print("dict(row) error:", e)
