from flask import Blueprint, request, jsonify
from db import get_db_connection, get_ist_time
from evaluation_service import evaluate_answer
import json

bp = Blueprint('analysis', __name__)

@bp.route('/save-observation', methods=['POST'])
def save_observation():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        ist_now = get_ist_time()
        cur.execute("""
            INSERT INTO ai_observations (interview_id, user_id, question_number, session_name, observation_type, comment, confidence_level, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (data['interview_id'], data['user_id'], data['question_number'], data['session_name'],
              data['observation_type'], data['comment'], data['confidence_level'], ist_now))
        cur.execute("""
            INSERT INTO proctoring_logs (interview_id, activity_type, message, status, created_at)
            VALUES (%s, %s, %s, %s, %s)
        """, (data['interview_id'], f"AI: {data['observation_type']}", data['comment'], 'active', ist_now))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/analyze', methods=['POST'])
def analyze_answer():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        answer = data.get('answer_text', '').strip()
        expected = data.get('expected_answer', '') or data.get('expected_keywords', '') or ""
        
        metadata = {
            "hesitation_score": data.get('hesitation_count', 0),
            "warning_count": data.get('warning_count', 0),
            "response_time_seconds": data.get('response_time_seconds', 0)
        }
        
        eval_result = evaluate_answer(data['question_text'], answer, expected, metadata)
        
        ist_now = get_ist_time()
        cur.execute("""
            INSERT INTO answers (
                interview_id, user_email, question_id, question_no, question_text,
                answer_text, expected_answer, status, ai_score, correctness_status,
                technical_accuracy, confidence_level, hesitation_score, communication_score,
                feedback, suggestion, response_time_seconds, evaluated_at_ist, created_at,
                question_confidence_score, technical_score
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (interview_id, question_id) DO UPDATE SET
                answer_text = EXCLUDED.answer_text,
                ai_score = EXCLUDED.ai_score,
                correctness_status = EXCLUDED.correctness_status,
                feedback = EXCLUDED.feedback,
                suggestion = EXCLUDED.suggestion,
                evaluated_at_ist = EXCLUDED.evaluated_at_ist
        """, (
            data['interview_id'], data['user_email'], data['question_id'], data.get('question_no', 0),
            data['question_text'], answer, expected, eval_result['correctness_status'], 
            eval_result['ai_score'], eval_result['correctness_status'],
            "Strong" if eval_result['technical_score'] > 75 else ("Average" if eval_result['technical_score'] > 40 else "Needs Improvement"),
            eval_result['confidence_level'], eval_result['hesitation_score'], 
            eval_result['communication_score'], eval_result['ai_feedback'], 
            eval_result['suggestion'], data.get('response_time_seconds', 0), 
            eval_result['evaluated_at_ist'], ist_now,
            eval_result['confidence_score'], eval_result['technical_score']
        ))

        conn.commit()
        return jsonify({"success": True, "message": "Answer analyzed", "feedback": eval_result['ai_feedback'], "status": eval_result['correctness_status']})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/interview/<id>', methods=['GET'])
def get_analysis(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database connection failed"}), 500
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM answers WHERE interview_id = %s ORDER BY question_no ASC", (id,))
        rows = cur.fetchall()
        columns = [d[0] for d in cur.description]
        return jsonify({"success": True, "analysis": [dict(row) for row in rows]})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()
