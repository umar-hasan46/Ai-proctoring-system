import psycopg2

def run():
    conn = psycopg2.connect(
        host="127.0.0.1",
        port=5432,
        dbname="ai_detection",
        user="postgres",
        password="umarhasan46"
    )
    cur = conn.cursor()
    cur.execute("SELECT id, email, full_name, role, password_hash FROM admins LIMIT 10")
    rows = cur.fetchall()
    print(f"Total Admins Found: {len(rows)}")
    for r in rows:
        print(f"ID: {r[0]} | Email: {r[1]} | Name: {r[2]} | Role: {r[3]} | Hash: {r[4][:30]}...")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    run()
