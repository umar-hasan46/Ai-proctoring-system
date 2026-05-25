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
    cur.execute("SELECT id, user_email, status, current_question_no, current_difficulty, role_applied FROM interviews WHERE id = 11")
    row = cur.fetchone()
    if row:
        print(f"Interview 11: ID: {row[0]} | Email: {row[1]} | Status: {row[2]} | QNo: {row[3]} | Diff: {row[4]} | Role: {row[5]}")
    else:
        print("Interview 11 not found!")
    
    cur.execute("SELECT COUNT(*) FROM interview_questions WHERE interview_id = 11")
    print(f"Questions in interview_questions for 11: {cur.fetchone()[0]}")
    
    cur.execute("SELECT id, question_no, question_text, expected_answer FROM interview_questions WHERE interview_id = 11 ORDER BY question_no ASC")
    for r in cur.fetchall():
        print(f"  QNo: {r[1]} | Text: {r[2][:40]} | Exp: {r[3][:40]}")
        
    cur.execute("SELECT COUNT(*) FROM answer_evaluations WHERE interview_id = 11")
    print(f"Evaluations: {cur.fetchone()[0]}")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    run()
