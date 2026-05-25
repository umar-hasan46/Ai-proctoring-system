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
    cur.execute("SELECT id, interview_id, question_no, question_text, topic, difficulty FROM interview_questions WHERE interview_id = 10 ORDER BY question_no ASC")
    rows = cur.fetchall()
    print(f"Questions generated for Interview 10: {len(rows)}")
    for r in rows:
        print(f"ID: {r[0]} | QNo: {r[2]} | Topic: {r[4]} | Diff: {r[5]} | Text: {r[3][:40]}...")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    run()
