from flask import Blueprint, request, jsonify
from db import get_db_connection, get_ist_time
from datetime import timedelta

bp = Blueprint('violations', __name__)

@bp.route('', methods=['POST'])
def save_violation():
    data = request.json
    interview_id = data.get('interview_id')
    user_email = data.get('user_email')
    v_type = data.get('violation_type')
    message = data.get('message')
    severity = data.get('severity', 'high').lower()

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        ist_now = get_ist_time()

        cur.execute("SELECT status, warning_count, full_name FROM interviews WHERE id = %s", (interview_id,))
        res = cur.fetchone()
        if not res:
            return jsonify({"success": False, "message": "Interview not found"}), 404

        status, current_warnings, full_name = res
        if status != 'active':
            return jsonify({"success": True, "message": "Interview is not active, skipping violation tracking", "warning_count": current_warnings, "auto_terminated": False})

        cur.execute("""
            SELECT id FROM proctoring_logs
            WHERE interview_id = %s AND activity_type = %s AND created_at > %s
        """, (interview_id, v_type, ist_now - timedelta(seconds=5)))
        if cur.fetchone():
            return jsonify({"success": True, "message": "Duplicate warning suppressed", "warning_count": current_warnings, "auto_terminated": False})

        warning_inc = 1 if severity == 'high' else 0
        new_warning_count = current_warnings + warning_inc
        auto_terminated = False

        cur.execute("""
            INSERT INTO proctoring_logs (interview_id, user_email, activity_type, message, warning_number, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (interview_id, user_email, v_type, message, new_warning_count, 'active', ist_now))

        cur.execute("""
            INSERT INTO violations (interview_id, user_email, violation_type, message, severity, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (interview_id, user_email, v_type, message, severity, ist_now))

        if new_warning_count > 3:
            cur.execute("""
                UPDATE interviews
                SET warning_count = %s, status = 'terminated', termination_reason = 'Interview terminated due to multiple integrity violations',
                    end_time = %s, last_activity_at = %s, suspicious_score = suspicious_score + 10
                WHERE id = %s
            """, (new_warning_count, ist_now, ist_now, interview_id))
            auto_terminated = True

            ist_now_str = ist_now.strftime('%d %b %Y, %I:%M %p')
            cur.execute("""
                INSERT INTO notifications (user_email, interview_id, title, message, type, event_type, status, target_role, created_at_ist, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (user_email, interview_id, "Interview Terminated", "Interview terminated due to multiple integrity violations.", "error", "Interview Terminated", "unread", "user", ist_now_str, ist_now))

            cur.execute("""
                INSERT INTO notifications (user_email, interview_id, title, message, type, event_type, status, target_role, created_at_ist, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, ('admin@gmail.com', interview_id, "Critical: User Terminated", f"{full_name} was terminated after 3 warnings.", "error", "Critical Violation", "unread", "admin", ist_now_str, ist_now))

        else:
            cur.execute("""
                UPDATE interviews
                SET warning_count = %s, last_activity_at = %s, suspicious_score = suspicious_score + 5
                WHERE id = %s
            """, (new_warning_count, ist_now, interview_id))

            if warning_inc > 0:
                ist_now_str = ist_now.strftime('%d %b %Y, %I:%M %p')
                cur.execute("""
                    INSERT INTO notifications (user_email, interview_id, title, message, type, event_type, status, target_role, created_at_ist, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (user_email, interview_id, f"Warning {new_warning_count} of 3", message, "warning", "Warning Issued", "unread", "user", ist_now_str, ist_now))

                cur.execute("""
                    INSERT INTO notifications (user_email, interview_id, title, message, type, event_type, status, target_role, created_at_ist, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, ('admin@gmail.com', interview_id, "Violation Detected", f"{full_name} received warning {new_warning_count} for {v_type}", "warning", "Violation Detected", "unread", "admin", ist_now_str, ist_now))

        conn.commit()
        return jsonify({
            "success": True,
            "warning_count": new_warning_count,
            "auto_terminated": auto_terminated,
            "message": "Violation processed"
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/<id>', methods=['GET'])
def get_violations(id):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM violations WHERE interview_id = %s", (id,))
    rows = cur.fetchall()
    columns = [d[0] for d in cur.description]
    cur.close()
    conn.close()
    return jsonify({"success": True, "violations": [dict(row) for row in rows]})
