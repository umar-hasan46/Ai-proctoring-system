from flask import Blueprint, jsonify
from db import get_db_connection

bp = Blueprint('dashboard', __name__)

@bp.route('/admin-stats', methods=['GET'])
def admin_stats():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) FROM users")
        total_users = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM users WHERE status = 'active'")
        active_users = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM users WHERE status = 'deactive'")
        deactive_users = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM interviews WHERE status = 'active'")
        active_interviews = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM interviews WHERE status = 'completed'")
        completed_interviews = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM interviews WHERE status = 'terminated'")
        terminated_interviews = cur.fetchone()[0]

        cur.execute("SELECT SUM(warning_count) FROM interviews")
        total_warnings = cur.fetchone()[0] or 0

        cur.execute("SELECT AVG(COALESCE(final_percentage, overall_score)) FROM interviews WHERE status = 'completed'")
        avg_score = cur.fetchone()[0] or 0

        cur.execute("SELECT MAX(COALESCE(final_percentage, overall_score)) FROM interviews WHERE status = 'completed'")
        highest_score = cur.fetchone()[0] or 0

        cur.execute("SELECT MIN(COALESCE(final_percentage, overall_score)) FROM interviews WHERE status = 'completed' AND COALESCE(final_percentage, overall_score) > 0")
        lowest_score = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM interviews WHERE status = 'completed' AND COALESCE(final_percentage, overall_score) >= 40")
        passed_users = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM interviews WHERE status = 'completed' AND COALESCE(final_percentage, overall_score) > 0 AND COALESCE(final_percentage, overall_score) < 40")
        failed_users = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM interviews WHERE detected_skills IS NOT NULL AND detected_skills != '' AND detected_skills != 'No skills detected'")
        resume_uploaded = cur.fetchone()[0]

        cur.execute("SELECT SUM(COALESCE(skipped_questions, skipped_count, 0)) FROM interviews")
        total_skipped = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM interviews WHERE warning_count > 0")
        suspicious_users = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM interviews WHERE COALESCE(admin_hiring_status, admin_final_status, 'Pending Review') = 'Shortlisted'")
        shortlisted = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM interviews WHERE COALESCE(admin_hiring_status, admin_final_status, 'Pending Review') = 'Rejected'")
        rejected = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM interviews WHERE COALESCE(admin_hiring_status, admin_final_status, 'Pending Review') = 'Hiring in Process'")
        hiring_in_process = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM interviews WHERE COALESCE(admin_hiring_status, admin_final_status, 'Pending Review') = 'Selected'")
        selected = cur.fetchone()[0]

        return jsonify({
            "success": True,
            "stats": {
                "total_users": total_users,
                "active_users": active_users,
                "deactive_users": deactive_users,
                "active_interviews": active_interviews,
                "completed_interviews": completed_interviews,
                "terminated_interviews": terminated_interviews,
                "total_warnings": int(total_warnings),
                "total_skipped": int(total_skipped),
                "avg_score": round(float(avg_score), 2),
                "highest_score": round(float(highest_score), 2),
                "lowest_score": round(float(lowest_score), 2),
                "passed_users": passed_users,
                "failed_users": failed_users,
                "resume_uploaded": resume_uploaded,
                "suspicious_users": suspicious_users,
                "shortlisted": shortlisted,
                "rejected": rejected,
                "hiring_in_process": hiring_in_process,
                "selected": selected
            }
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/user-stats/<email>', methods=['GET'])
def user_stats(email):
    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database connection failed"}), 500
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT status, warning_count, confidence_level, final_percentage
            FROM interviews
            WHERE user_email = %s
            ORDER BY created_at DESC LIMIT 1
        """, (email,))
        last_interview = cur.fetchone()

        cur.execute("SELECT COUNT(*) FROM notifications WHERE user_email = %s AND status = 'unread'", (email,))
        unread = cur.fetchone()[0]

        return jsonify({
            "success": True,
            "stats": {
                "last_interview_status": last_interview[0] if last_interview else "No Interview Yet",
                "warning_count": last_interview[1] if last_interview else 0,
                "confidence_level": last_interview[2] if last_interview else "N/A",
                "score": round(float(last_interview[3]), 2) if last_interview and last_interview[3] is not None else 0,
                "unread_notifications": unread
            }
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/user/dashboard', methods=['GET'])
def get_user_dashboard():
    from flask import request
    email = request.args.get('email')
    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database error"}), 500
    cur = conn.cursor()
    try:
        cur.execute("SELECT full_name, name, email, phone, role, profile_pic FROM users WHERE email = %s", (email,))
        user_row = cur.fetchone()
        if not user_row:
            return jsonify({"success": False, "message": "User not found"}), 404

        user_data = {
            "name": user_row[1] or user_row[0] or "User",
            "email": user_row[2],
            "phone": user_row[3],
            "role": user_row[4],
            "profile_pic": user_row[5]
        }

        cur.execute("""
            SELECT id, status, final_percentage, warning_count, confidence_level, created_at, end_time, duration, ended_at_ist
            FROM interviews
            WHERE user_email = %s
            ORDER BY created_at DESC LIMIT 1
        """, (email,))
        int_row = cur.fetchone()

        cur.execute("SELECT COUNT(*) FROM notifications WHERE user_email = %s AND status = 'unread'", (email,))
        notif_count = cur.fetchone()[0] or 0

        summary = {
            "latest_interview_status": "No Interview Yet",
            "latest_interview_score": None,
            "confidence_score": None,
            "confidence_level": "N/A",
            "warnings": 0,
            "notifications_count": notif_count
        }

        latest_interview = None
        recent_activity = []

        if int_row:
            int_id, status, score, warnings, conf_lvl, created, ended, duration, ended_ist = int_row
            summary["latest_interview_status"] = status.capitalize() if status else "N/A"
            summary["latest_interview_score"] = score
            summary["warnings"] = warnings or 0
            summary["confidence_level"] = conf_lvl or "N/A"

            latest_interview = {
                "interview_id": int_id,
                "status": status,
                "overall_score": score,
                "confidence_level": conf_lvl or "N/A",
                "started_at_ist": created.strftime('%d %b %Y, %I:%M %p') if created else "N/A",
                "ended_at_ist": ended_ist or (ended.strftime('%d %b %Y, %I:%M %p') if ended else "N/A"),
                "duration": duration or "N/A"
            }

            recent_activity.append({
                "title": "Latest Interview",
                "message": status.capitalize() if status else "N/A",
                "score": score,
                "created_at_ist": ended_ist or (ended.strftime('%d %b %Y, %I:%M %p') if ended else "N/A")
            })

        return jsonify({
            "success": True,
            "user": user_data,
            "summary": summary,
            "latest_interview": latest_interview,
            "recent_activity": recent_activity
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()
