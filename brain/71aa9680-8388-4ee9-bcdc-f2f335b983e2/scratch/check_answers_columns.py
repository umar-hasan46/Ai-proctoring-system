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
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='answers'")
    cols = [r[0] for r in cur.fetchall()]
    print(f"Answers table columns ({len(cols)}):")
    print(cols)
    
    cur.execute("SELECT indexname, indexdef FROM pg_indexes WHERE tablename='answers'")
    indexes = cur.fetchall()
    print("Answers table indexes:")
    for idx in indexes:
        print(f"  Name: {idx[0]} | Def: {idx[1]}")
        
    cur.close()
    conn.close()

if __name__ == "__main__":
    run()
