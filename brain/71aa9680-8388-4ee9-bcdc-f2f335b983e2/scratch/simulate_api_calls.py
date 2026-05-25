import sys
import os
import traceback

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", ".."))
BACKEND_PATH = os.path.join(WORKSPACE_ROOT, "backend")
if WORKSPACE_ROOT not in sys.path:
    sys.path.insert(0, WORKSPACE_ROOT)
if BACKEND_PATH not in sys.path:
    sys.path.insert(0, BACKEND_PATH)

from backend.db import get_db_connection
from backend.routes.interview_routes import get_or_generate_question


def close_db(cur=None, conn=None):
    if cur:
        cur.close()
    if conn:
        conn.close()


def test():
    interview_id = 11

    conn = None
    cur = None

    try:
        print(f"Checking evaluations for interview_id = {interview_id}")

        conn = get_db_connection()
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
        close_db(cur, conn)

    conn = None
    cur = None

    try:
        print(f"\nChecking current question for interview_id = {interview_id}")

        conn = get_db_connection()
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
            print(f"Interview {interview_id} not found")
            return

        email, role, question_no, difficulty = row

        role = role or "Software Developer"
        question_no = question_no or 1
        difficulty = difficulty or "Easy"

        print(f"Email: {email}")
        print(f"Role: {role}")
        print(f"Question No: {question_no}")
        print(f"Difficulty: {difficulty}")

        question = get_or_generate_question(
            interview_id,
            email,
            role,
            difficulty,
            question_no
        )

        print("\nGenerated Question:")
        print(question)

    except Exception as e:
        print(f"Current question failed: {e}")
        traceback.print_exc()

    finally:
        close_db(cur, conn)


if __name__ == "__main__":
    test()