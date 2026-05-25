import psycopg2
import os
from dotenv import load_dotenv

load_dotenv("c:/Users/Admin/Desktop/ai proctor/backend/.env")

def test_live_mapping():
    try:
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cur = conn.cursor()
        cur.execute("""
            SELECT
                i.id as interview_id, i.full_name as student_name, i.user_email as email,
                i.phone, i.role_applied as role, i.status, i.warning_count, i.suspicious_score,
                i.camera_status, i.audio_status as microphone_status, i.face_status, i.latest_camera_frame as camera_frame,
                i.start_time, i.last_activity_at,
                (SELECT COUNT(*) FROM answers WHERE interview_id = i.id) as current_question
            FROM interviews i
            WHERE i.status = 'active'
            ORDER BY i.last_activity_at DESC
        """)
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        print(f"Columns: {cols}")
        for r in rows:
            ld = dict(zip(cols, r))
            print("Row student_name:", ld.get('student_name'))
            print("Row email:", ld.get('email'))
            print("Row camera_frame exists:", bool(ld.get('camera_frame')))
            print("Mapped camera_status lower:", ld.get('camera_status', 'inactive').lower())
            print("Mapped mic_status lower:", ld.get('microphone_status', 'inactive').lower())
            print("Mapped face_status lower:", ld.get('face_status', 'not detected').lower())
            break
        cur.close()
        conn.close()
    except Exception as e:
        print("Error:", e)

test_live_mapping()
