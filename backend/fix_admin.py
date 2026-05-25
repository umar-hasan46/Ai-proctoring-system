import sys
sys.path.insert(0, '.')
from db import get_db_connection
from werkzeug.security import generate_password_hash, check_password_hash

conn = get_db_connection()
cur = conn.cursor()
cur.execute('SELECT id, full_name, email, password_hash FROM admins')
rows = cur.fetchall()
if rows:
    for r in rows:
        print('Admin found:', r[0], r[1], r[2])
        result = check_password_hash(r[3], 'admin123')
        print('Hash test admin123:', result)
        if not result:
            hashed = generate_password_hash('admin123')
            cur.execute('UPDATE admins SET password_hash = %s WHERE email = %s', (hashed, r[2]))
            conn.commit()
            print('Password reset to admin123')
else:
    print('No admins found - creating default admin')
    hashed = generate_password_hash('admin123')
    cur.execute(
        "INSERT INTO admins (full_name, email, password_hash) VALUES (%s, %s, %s) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash",
        ('Admin', 'admin@gmail.com', hashed)
    )
    conn.commit()
    print('Admin created: admin@gmail.com / admin123')
cur.close()
conn.close()
