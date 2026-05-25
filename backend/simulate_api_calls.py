import sys
import os
import traceback

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

POSSIBLE_BACKEND_PATHS = [
    CURRENT_DIR,
    os.path.abspath(os.path.join(CURRENT_DIR, "backend")),
    os.path.abspath(os.path.join(CURRENT_DIR, "..", "backend")),
    os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "backend")),
    os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "..", "backend")),
    r"C:\Users\Admin\Desktop\ai proctor\backend",
]

BACKEND_PATH = None

for path in POSSIBLE_BACKEND_PATHS:
    if os.path.exists(os.path.join(path, "db.py")) and os.path.exists(os.path.join(path, "routes")):
        BACKEND_PATH = path
        break

if not BACKEND_PATH:
    raise FileNotFoundError("Backend folder not found. Please check backend path.")

if BACKEND_PATH not in sys.path:
    sys.path.insert(0, BACKEND_PATH)

try:
    from db import get_db_connection
except Exception as e:
    print("Cannot import get_db_connection from db.py")
    raise e

try:
    from routes.interview_routes import get_or_generate_question
except Exception as e:
    print("Cannot import get_or_generate_question from routes/interview_routes.py")
    raise e


def safe_close(cur=None, conn=None):
    try:
        if cur:
            cur.close()
        if conn:
            conn.close()
    except Exception:
        pass


def test():
    interview_id = 11

    print(f"Simulating get_evaluations_endpoint for interview_id = {interview_id}...")

    conn = None
    cur = None

    try:
        conn = get_db_connection()

        if not conn:
            print("Database connection failed.")
            return

        cur = conn.cursor()

        cur.execute(
            """
            SELECT *
            FROM answer_evaluations
            WHERE interview_id = %s
            ORDER BY question_no ASC
            """,
            (interview_id,)
        )

        rows = cur.fetchall()
        print(f"Evaluations rows: {len(rows)}")

    except Exception as e:
        print(f"Evaluations failed: {e}")
        traceback.print_exc()

    finally:
        safe_close(cur, conn)

    print(f"\nSimulating get_current_question_route for interview_id = {interview_id}...")

    conn = None
    cur = None

    try:
        conn = get_db_connection()

        if not conn:
            print("Database connection failed.")
            return

        cur = conn.cursor()

        cur.execute(
            """
            SELECT user_email, role_applied, current_question_no, current_difficulty
            FROM interviews
            WHERE id = %s
            """,
            (interview_id,)
        )

        row = cur.fetchone()

        if not row:
            print(f"Interview {interview_id} not found.")
            return

        email, role, q_no, diff = row

        if not email:
            print("Interview email is missing.")
            return

        if not role:
            role = "Software Developer"

        if not q_no:
            q_no = 1

        if not diff:
            diff = "Easy"

        print(f"Fetched Interview {interview_id} details:")
        print(f"Email: {email}")
        print(f"Role: {role}")
        print(f"Question No: {q_no}")
        print(f"Difficulty: {diff}")

        print("\nCalling get_or_generate_question...")

        try:
            question = get_or_generate_question(
                interview_id=interview_id,
                candidate_email=email,
                role=role,
                current_difficulty=diff,
                question_no=q_no
            )
        except TypeError:
            question = get_or_generate_question(interview_id, email, role, diff, q_no)

        print("Success. Generated question details:")
        print(question)

    except Exception as e:
        print(f"Current question failed: {e}")
        traceback.print_exc()

    finally:
        safe_close(cur, conn)


if __name__ == "__main__":
    test()
