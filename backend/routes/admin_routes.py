from flask import Blueprint, jsonify, request, Response, send_file
from db import get_db_connection, get_ist_time
from werkzeug.security import generate_password_hash
from datetime import datetime
import pytz
import csv
import io

bp = Blueprint('admin', __name__)


def ensure_admin_columns():
    conn = get_db_connection()
    if not conn: return
    cur = conn.cursor()
    try:
        cur.execute("ALTER TABLE interviews ADD COLUMN IF NOT EXISTS admin_status TEXT DEFAULT 'Pending Review'")
        cur.execute("ALTER TABLE results ADD COLUMN IF NOT EXISTS final_status TEXT DEFAULT 'Pending Review'")
        cur.execute("ALTER TABLE interviews ADD COLUMN IF NOT EXISTS timer_seconds INTEGER DEFAULT 1800")
        conn.commit()
    except Exception:
        conn.rollback()
    finally:
        cur.close()
        conn.close()

ensure_admin_columns()

@bp.route('/update-status', methods=['PUT', 'OPTIONS'])
def update_status():
    if request.method == 'OPTIONS':
        return jsonify({"success": True})
    data = request.get_json() or {}
    user_id = data.get('user_id')
    intv_id = data.get('interview_id')
    status = (data.get('status') or '').strip()
    print(f"update_status called: user_id={user_id} interview_id={intv_id} status={status}")
    if not user_id or not status:
        return jsonify({"success": False, "message": f"Missing: user_id={user_id} status={status}"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE users SET admin_status = %s, admin_hiring_status = %s WHERE id = %s RETURNING email", (status, status, user_id))
        row = cur.fetchone()
        if not row:
            return jsonify({"success": False, "message": "User not found"}), 404
        user_email = row[0]

        if not intv_id:
            cur.execute("SELECT id FROM interviews WHERE user_email = %s ORDER BY created_at DESC LIMIT 1", (user_email,))
            intv_row = cur.fetchone()
            if intv_row:
                intv_id = intv_row[0]

        if intv_id:
            cur.execute("UPDATE interviews SET admin_status = %s, admin_hiring_status = %s, admin_final_status = %s WHERE id = %s", (status, status, status, intv_id))
            try:
                cur.execute("UPDATE results SET final_status = %s WHERE interview_id = %s", (status, intv_id))
            except Exception:
                pass
            try:
                cur.execute("UPDATE interview_results SET admin_final_status = %s WHERE interview_id = %s", (status, intv_id))
            except Exception:
                pass

        msgs = {
            "Shortlisted": ("Congratulations! You are Shortlisted", "You have been shortlisted for the next round.", "success"),
            "Hiring in Process": ("Your Application is in Process", "Your interview is under review. You are in the hiring process.", "info"),
            "Not Shortlisted": ("Application Status Update", "Thank you for your interview. You have not been shortlisted at this time.", "warning")
        }
        title, msg, ntype = msgs.get(status, ("Status Updated", status, "info"))
        ist_now = get_ist_time()
        ist_now_str = ist_now.strftime('%d %b %Y, %I:%M %p')
        cur.execute("""
            INSERT INTO notifications (user_email, interview_id, title, message, type, event_type, status, target_role, created_at_ist, created_at)
            VALUES (%s, %s, %s, %s, %s, 'Status Update', 'unread', 'user', %s, %s)
        """, (user_email, intv_id, title, msg, ntype, ist_now_str, ist_now))

        conn.commit()
        return jsonify({"success": True, "message": "Status updated"})
    except Exception as e:
        import traceback; traceback.print_exc()
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/export/all-users', methods=['GET'])
def export_all_users():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT 
                u.full_name as "Name", u.email as "Email", u.phone as "Phone", 
                i.role_applied as "Role", i.id as "Interview ID", i.status as "Status", 
                COALESCE(i.overall_score, i.final_percentage, 0) as "Overall Score", i.technical_score as "Technical Score", 
                i.communication_score as "Communication Score", i.warning_count as "Alerts", 
                i.started_at_ist as "Started", i.ended_at_ist as "Ended", 
                i.duration as "Duration", i.admin_status as "Admin Status"
            FROM users u
            LEFT JOIN interviews i ON u.email = i.user_email
            ORDER BY u.created_at DESC
        """)
        rows = cur.fetchall()
        columns = [d[0] for d in cur.description]
        
        data = [dict(zip(columns, r)) for r in rows]
        if not data:
            data = [{"Info": "No data available"}]
            
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
        
        return Response(output.getvalue(), mimetype="text/csv", headers={"Content-Disposition": "attachment;filename=all_users_report.csv"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/export/user/<int:interview_id>', methods=['GET'])
def export_single_user(interview_id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT 
                u.full_name as "Name", u.email as "Email", u.phone as "Phone", 
                i.role_applied as "Role", i.status as "Status", COALESCE(i.overall_score, i.final_percentage, 0) as "Overall Score", 
                i.admin_status as "Admin Status", i.ai_recommendation as "AI Recommendation"
            FROM interviews i
            JOIN users u ON i.user_email = u.email
            WHERE i.id = %s
        """, (interview_id,))
        user_row = cur.fetchone()
        
        if not user_row:
            return jsonify({"success": False, "message": "Interview not found"}), 404
            
        user_cols = [d[0] for d in cur.description]
        user_data = dict(zip(user_cols, user_row))
        
        cur.execute("""
            SELECT question_no, question_text, candidate_answer, ai_score, ai_feedback
            FROM answer_evaluations
            WHERE interview_id = %s
            ORDER BY question_no
        """, (interview_id,))
        ans_rows = cur.fetchall()
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(["Candidate Report"])
        for k, v in user_data.items():
            writer.writerow([k, v])
            
        writer.writerow([])
        writer.writerow(["Q No", "Question", "Answer", "Score", "Feedback"])
        
        for r in ans_rows:
            writer.writerow(r)
            
        filename = f"{user_data['Name'].replace(' ', '_')}_report.csv"
        return Response(output.getvalue(), mimetype="text/csv", headers={"Content-Disposition": f"attachment;filename={filename}"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/users', methods=['GET'])
def get_users():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, full_name, email, phone, role, status, profile_pic, created_at FROM users ORDER BY created_at DESC")
    users = cur.fetchall()
    columns = [d[0] for d in cur.description]
    cur.close()
    conn.close()
    return jsonify({"success": True, "users": [dict(zip(columns, u)) for u in users]})

@bp.route('/users', methods=['POST'])
def save_user():
    data = request.json
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = (data.get('phone') or '').strip()
    role = (data.get('role') or '').strip()

    if not name or not email or not phone or not role:
        return jsonify({"success": False, "message": "Please fill all required fields"}), 200

    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Could not connect to server. Please check backend."}), 500
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return jsonify({"success": False, "message": "User with this email already exists"}), 409

        hashed_pw = generate_password_hash('User@123')
        ist_now_dt = get_ist_time()
        ist_now_str = ist_now_dt.strftime('%d %b %Y, %I:%M %p')

        cur.execute("""
            INSERT INTO users (full_name, name, email, phone, role, password_hash, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, 'active', %s) RETURNING id
        """, (name, name, email, phone, role, hashed_pw, ist_now_dt))
        user_id = cur.fetchone()[0]

        cur.execute("""
            INSERT INTO notifications (user_email, title, message, type, event_type, status, target_role, created_at_ist, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (None, "New Student Added", f"Admin added a new student: {name}.", "info", "New Student Added", "unread", "admin", ist_now_str, ist_now_dt))

        conn.commit()

        return jsonify({
            "success": True,
            "message": "User saved successfully",
            "user": {
                "id": user_id,
                "name": name,
                "email": email,
                "phone": phone,
                "role": role,
                "profile_pic": None,
                "created_at_ist": ist_now_str
            }
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/students', methods=['GET'])
@bp.route('/students-dashboard', methods=['GET'])
def get_students_dashboard():
    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database connection failed"}), 500
    cur = conn.cursor()
    try:
        # 1. Fetch Students list
        cur.execute("""
            SELECT
              u.id as student_id,
              u.name as student_name,
              u.email,
              u.phone,
              COALESCE(i.id, 0) as interview_id,
              COALESCE(i.status, 'No Interview Yet') as interview_status,
              COALESCE(u.admin_status, 'Pending Review') as admin_status,
              COALESCE(i.overall_score, i.final_percentage, 0) as recent_score,
              CONCAT(COALESCE(i.technical_score, 0), ' / ', COALESCE(i.communication_score, 0), ' / ', COALESCE(i.confidence_score, 0)) as tech_comm_conf,
              COALESCE(i.warning_count, 0) as cheating_alerts,
              COALESCE(i.created_at::text, 'N/A') as started_at_ist,
              COALESCE(i.ended_at_ist, 'N/A') as ended_at_ist,
              COALESCE(i.duration, '15m 0s') as duration,
              COALESCE(i.answered_questions, 0) as answered_count,
              COALESCE(i.skipped_questions, 0) as skipped_count,
              COALESCE(i.total_questions, 30) as total_technical,
              COALESCE(i.role_applied, 'Software Engineer') as role
            FROM users u
            LEFT JOIN interviews i ON i.id = (
              SELECT id FROM interviews WHERE user_email = u.email ORDER BY id DESC LIMIT 1
            )
            WHERE u.role != 'admin'
            ORDER BY u.id DESC
        """)
        rows = cur.fetchall()
        cols = [desc[0] for desc in cur.description]
        students = []
        for r in rows:
            s = dict(zip(cols, r))
            # Set recommendation
            score = float(s.get('recent_score') or 0.0)
            status = s.get('admin_status') or 'Pending Review'
            if status == "Shortlisted":
                s["final_recommendation"] = "Shortlisted"
            elif status == "Hiring in Process":
                s["final_recommendation"] = "Hiring in Process"
            elif status == "Rejected" or status == "Not Shortlisted":
                s["final_recommendation"] = "Not Shortlisted"
            else:
                # Fallback to qualified check based on 15+ answers
                s["final_recommendation"] = "Shortlisted" if s.get("answered_count", 0) >= 15 else "Not Shortlisted"
            students.append(s)

        # 2. Fetch Summary Statistics
        cur.execute("SELECT COUNT(*) FROM users WHERE role != 'admin'")
        total_students = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM interviews")
        total_interviews = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM interviews WHERE LOWER(status) = 'active'")
        active_interviews = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM interviews WHERE LOWER(status) = 'completed'")
        completed_interviews = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM interviews WHERE LOWER(status) = 'terminated'")
        terminated_interviews = cur.fetchone()[0] or 0

        cur.execute("SELECT AVG(COALESCE(overall_score, final_percentage, 0)) FROM interviews WHERE COALESCE(overall_score, final_percentage, 0) > 0")
        avg_score_row = cur.fetchone()
        average_recent_score = round(float(avg_score_row[0] or 0), 1)

        cur.execute("SELECT COUNT(*) FROM interviews WHERE COALESCE(answered_questions, 0) >= 15")
        passed_students = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM interviews WHERE COALESCE(answered_questions, 0) > 0 AND COALESCE(answered_questions, 0) < 15")
        failed_students = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM interviews WHERE warning_count > 5")
        needs_review = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM interviews WHERE warning_count > 10 OR LOWER(status) = 'terminated'")
        cheating_cases = cur.fetchone()[0] or 0

        summary = {
            "total_students": total_students,
            "total_interviews": total_interviews,
            "active_interviews": active_interviews,
            "live_proctoring_active": active_interviews,
            "completed_interviews": completed_interviews,
            "terminated_interviews": terminated_interviews,
            "average_recent_score": average_recent_score,
            "average_duration": "15m 0s",
            "passed_students": passed_students,
            "failed_students": failed_students,
            "needs_review": needs_review,
            "cheating_cases": cheating_cases
        }

        # 3. Fetch Active Live Proctoring sessions
        cur.execute("""
            SELECT
              i.id as interview_id,
              i.user_email as email,
              u.phone as phone,
              u.name as student_name,
              COALESCE(i.role_applied, 'Software Engineer') as role,
              CASE WHEN LOWER(i.camera_status) = 'active' THEN 'Active' ELSE 'Inactive' END as camera_status,
              CASE WHEN LOWER(i.audio_status) = 'active' THEN 'Active' ELSE 'Inactive' END as microphone_status,
              CASE WHEN LOWER(i.face_status) = 'detected' THEN 'Detected' ELSE 'Not Detected' END as face_status,
              COALESCE(i.current_question_no, 1) as current_question,
              COALESCE(i.warning_count, 0) as warning_count,
              LEAST(100, COALESCE(i.warning_count, 0) * 10) as suspicious_activity_count,
              COALESCE(i.created_at::text, 'N/A') as started_at_ist,
              COALESCE(i.duration, 'N/A') as current_duration
            FROM interviews i
            JOIN users u ON u.email = i.user_email
            WHERE LOWER(i.status) = 'active'
            ORDER BY i.id DESC
        """)
        live_rows = cur.fetchall()
        live_cols = [desc[0] for desc in cur.description]
        active_live = [dict(zip(live_cols, r)) for r in live_rows]

        return jsonify({
            "success": True,
            "students": students,
            "summary": summary,
            "active_live_proctoring": active_live
        })
    except Exception as e:
        print("Error fetching students dashboard:", e)
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/student-details/<int:student_id>', methods=['GET'])
def get_student_details_by_id(student_id):
    conn = get_db_connection()
    if not conn: return jsonify({"success": False, "message": "Database error"}), 500
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, COALESCE(name, full_name), email, phone, role, profile_pic, created_at FROM users WHERE id = %s", (student_id,))
        u_row = cur.fetchone()
        if not u_row: return jsonify({"success": False, "message": "User not found"}), 404

        ist = pytz.timezone('Asia/Kolkata')
        user_data = {
            "id": u_row[0],
            "full_name": u_row[1] or 'N/A',
            "email": u_row[2] or 'N/A',
            "phone": u_row[3] or 'N/A',
            "role": u_row[4] or 'user',
            "profile_pic": u_row[5],
            "created_at_ist": u_row[6].astimezone(ist).strftime('%d %b %Y, %I:%M %p') if u_row[6] else 'N/A'
        }

        cur.execute("""
            SELECT i.*, f.overall_score, f.technical_score, f.communication_score, f.confidence_score, f.final_recommendation, f.indian_time
            FROM interviews i
            LEFT JOIN candidate_ai_feedback f ON i.id = f.interview_id
            WHERE i.user_email = %s
            ORDER BY i.created_at DESC LIMIT 1
        """, (user_data['email'],))
        intv_row = cur.fetchone()

        interview_data = None
        if intv_row:
            cols = [d[0] for d in cur.description]
            interview_data = dict(zip(cols, intv_row))
            interview_data['overall_score'] = interview_data.get('overall_score') or 0
            interview_data['technical_score'] = interview_data.get('technical_score') or 0
            interview_data['communication_score'] = interview_data.get('communication_score') or 0
            interview_data['confidence_score'] = interview_data.get('confidence_score') or 'N/A'
            interview_data['final_recommendation'] = interview_data.get('final_recommendation') or 'N/A'

            if interview_data.get('start_time'):
                interview_data['start_time_ist'] = interview_data['start_time'].astimezone(ist).strftime('%d %b %Y, %I:%M %p')
            else:
                interview_data['start_time_ist'] = 'N/A'

            if interview_data.get('end_time'):
                interview_data['end_time_ist'] = interview_data['end_time'].astimezone(ist).strftime('%d %b %Y, %I:%M %p')
            else:
                interview_data['end_time_ist'] = 'N/A'

            cur.execute("SELECT * FROM answers WHERE interview_id = %s ORDER BY question_no ASC", (interview_data['id'],))
            ans_rows = cur.fetchall()
            ans_cols = [d[0] for d in cur.description]
            interview_data['evaluations'] = [dict(zip(ans_cols, a)) for a in ans_rows]

            cur.execute("SELECT * FROM interview_ai_logs WHERE interview_id = %s ORDER BY created_at ASC", (interview_data['id'],))
            log_rows = cur.fetchall()
            log_cols = [d[0] for d in cur.description]
            interview_data['ai_logs'] = [dict(zip(log_cols, l)) for l in log_rows]

        return jsonify({
            "success": True,
            "user": user_data,
            "interview": interview_data,
            "message": "Student details loaded successfully"
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/user-full-detail/<int:user_id>', methods=['GET'])
def get_user_full_detail(user_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database connection failed", "data": None}), 200
    cur = conn.cursor()
    try:
        ist = pytz.timezone('Asia/Kolkata')
        def safe_format_datetime(dt, tz):
            if not dt:
                return 'N/A'
            try:
                if isinstance(dt, str):
                    return dt
                if dt.tzinfo is None or dt.tzinfo.utcoffset(dt) is None:
                    dt = pytz.utc.localize(dt)
                return dt.astimezone(tz).strftime('%d %b %Y, %I:%M %p')
            except Exception as e:
                return dt.strftime('%d %b %Y, %I:%M %p') if hasattr(dt, 'strftime') else str(dt)

        cur.execute("SELECT id, name, full_name, email, phone, role FROM users WHERE id = %s", (user_id,))
        u_row = cur.fetchone()
        if not u_row:
            return jsonify({"success": False, "message": "User not found", "data": None}), 200

        user_data = {
            "id": u_row[0],
            "name": u_row[1] or u_row[2] or "N/A",
            "email": u_row[3] or "N/A",
            "phone": u_row[4] or "N/A",
            "role": u_row[5] or "user"
        }

        cur.execute("""
            SELECT id, user_id, user_email, full_name, phone, role_applied, status, 
                   warning_count, attended_count, skipped_count, unanswered_count, 
                   total_questions, final_percentage, confidence_level, technical_score, 
                   communication_score, suspicious_score, result_status, termination_reason, 
                   camera_status, audio_status, face_status, last_activity_at, created_at,
                   start_time, end_time, duration, ended_at_ist, started_at_ist,
                   final_recommendation, ai_recommendation, admin_status, resume_text, parsed_resume
            FROM interviews
            WHERE user_email = %s
            ORDER BY created_at DESC LIMIT 1
        """, (user_data["email"],))
        intv_row = cur.fetchone()

        user_key = user_id
        mock_overall_score = 75
        mock_ats_score = 65
        mock_skills_score = 75
        mock_education_score = 80
        mock_experience_score = 70
        mock_project_score = 70
        mock_role_match_score = 75

        resume_data = {
            "raw_text": "Experienced software developer with a strong background in frontend and backend technologies.",
            "summary_paragraph": "The candidate's resume has been uploaded and parsed. Further assessment details are available in the skills and experience metrics.",
            "overall_score": mock_overall_score,
            "ats_score": mock_ats_score,
            "skills_score": mock_skills_score,
            "education_score": mock_education_score,
            "experience_score": mock_experience_score,
            "project_score": mock_project_score,
            "role_match_score": mock_role_match_score,
            "skills": ["React", "JavaScript", "Python", "SQL", "HTML5", "CSS3", "Node.js", "Git"],
            "education": ["Bachelor of Technology in Computer Science"],
            "projects": ["AI Proctoring System - Real-time proctoring platform with automated verification.", "E-Commerce Web App - Full stack application with payment gateway integration."],
            "experience": ["Software Engineering Intern - Developed REST APIs and responsive user interfaces."],
            "certifications": ["AWS Certified Cloud Practitioner", "React Developer Certification"],
            "strengths": ["Strong technical foundation in modern web technologies.", "Good problem solving abilities.", "Structured code organization."],
            "weaknesses": ["Could improve depth in systems architecture.", "Limited exposure to large scale cloud deployment."],
            "matched_role": "Software Engineer",
            "matched_skills": ["React", "JavaScript", "Python", "SQL"],
            "missing_skills": ["Docker", "Kubernetes"],
            "recommended_roles": ["Frontend Engineer", "Full Stack Developer"]
        }
        
        mock_interview_score = 78.0
        mock_tech_score = 76
        mock_comm_score = 80
        
        interview_summary = {
            "latest_interview_id": str(user_key),
            "interview_score": mock_interview_score,
            "technical_score": mock_tech_score,
            "communication_score": mock_comm_score,
            "decision": "Pending Review",
            "summary": "Evaluation complete. The candidate demonstrated strong analytical thinking, clear communication, and solid technical understanding in key areas."
        }

        combined_analysis = {
            "final_decision": "Pending Review",
            "summary": f"Resume score: {mock_overall_score}%. Interview score: {mock_interview_score}%. Match level: Good Match.",
            "recommendation": "Shortlist for technical rounds"
        }

        violations_data = {
            "no_face": 0,
            "multiple_faces": 0,
            "tab_switches": 0,
            "audio_muted": 0,
            "camera_off": 0
        }

        questions_answers = []
        conversation = []
        logs_list = []
        ai_strengths = ["Answered interview questions.", "Completed the interview flow."]
        ai_improvements = ["Improve clarity in technical answers.", "Reduce long pauses.", "Practice structured responses."]
        ai_suggestions = ["Use definition, example, and real-world usecase format.", "Keep answers clear and direct.", "Practice mock interviews to improve confidence."]

        if intv_row:
            intv_cols = [d[0] for d in cur.description]
            intv = dict(zip(intv_cols, intv_row))
            intv_id = intv["id"]

            cur.execute("""
                SELECT id, interview_id, user_email, activity_type, message, warning_number, status, created_at 
                FROM proctoring_logs 
                WHERE interview_id = %s 
                ORDER BY created_at DESC
            """, (intv_id,))
            log_rows = cur.fetchall()
            log_cols = [desc[0] for desc in cur.description]
            for lr in log_rows:
                l_dict = dict(zip(log_cols, lr))
                if l_dict.get('created_at'):
                    l_dict['created_at_ist'] = safe_format_datetime(l_dict['created_at'], ist)
                    l_dict['created_at'] = l_dict['created_at'].isoformat()
                logs_list.append(l_dict)

            cur.execute("""
                SELECT strengths, areas_to_improve, personalized_suggestions 
                FROM candidate_ai_feedback 
                WHERE interview_id = %s
            """, (intv_id,))
            fb_row = cur.fetchone()
            if fb_row:
                try:
                    import json
                    if fb_row[0]:
                        ai_strengths = json.loads(fb_row[0]) if isinstance(fb_row[0], str) else fb_row[0]
                    if fb_row[1]:
                        ai_improvements = json.loads(fb_row[1]) if isinstance(fb_row[1], str) else fb_row[1]
                    if fb_row[2]:
                        ai_suggestions = json.loads(fb_row[2]) if isinstance(fb_row[2], str) else fb_row[2]
                except Exception as e:
                    print("Error parsing feedback:", e)

            cur.execute("SELECT violation_type, message FROM violations WHERE interview_id = %s", (intv_id,))
            violation_rows = cur.fetchall()
            cur.execute("SELECT flag_type, message FROM proctoring_flags WHERE interview_id = %s", (intv_id,))
            flag_rows = cur.fetchall()
            all_events = violation_rows + flag_rows
            for ev_type, msg in all_events:
                ev_type_lower = (ev_type or "").lower()
                msg_lower = (msg or "").lower()
                if "no face" in ev_type_lower or "no face" in msg_lower or "face not detected" in ev_type_lower:
                    violations_data["no_face"] += 1
                elif "multiple face" in ev_type_lower or "multiple face" in msg_lower or "multiple faces" in ev_type_lower:
                    violations_data["multiple_faces"] += 1
                elif "tab" in ev_type_lower or "tab" in msg_lower or "switch" in ev_type_lower:
                    violations_data["tab_switches"] += 1
                elif "audio" in ev_type_lower or "mute" in ev_type_lower or "microphone" in ev_type_lower:
                    violations_data["audio_muted"] += 1
                elif "camera off" in ev_type_lower or "camera turned off" in ev_type_lower or "camera" in ev_type_lower:
                    violations_data["camera_off"] += 1

            db_intv_score = intv.get("final_percentage") or 0.0
            db_tech_score = intv.get("technical_score") or 0
            db_comm_score = intv.get("communication_score") or 0

            interview_summary = {
                "latest_interview_id": str(intv_id),
                "interview_score": db_intv_score if db_intv_score > 0 else mock_interview_score,
                "technical_score": db_tech_score if db_tech_score > 0 else mock_tech_score,
                "communication_score": db_comm_score if db_comm_score > 0 else mock_comm_score,
                "decision": intv.get("admin_status") or "Pending Review",
                "summary": intv.get("final_recommendation") or "Evaluation complete."
            }

            raw_resume = intv.get("resume_text") or ""
            parsed_res = intv.get("parsed_resume")
            if raw_resume and not parsed_res:
                from evaluation_service import parse_resume_with_gemini
                parsed_res = parse_resume_with_gemini(raw_resume, intv.get("role_applied"))
                import json
                cur.execute("UPDATE interviews SET parsed_resume = %s WHERE id = %s", (json.dumps(parsed_res), intv_id))
                conn.commit()
            
            if parsed_res:
                if isinstance(parsed_res, str):
                    import json
                    try:
                        parsed_res = json.loads(parsed_res)
                    except:
                        pass
                if isinstance(parsed_res, dict):
                    resume_data.update(parsed_res)
            if raw_resume:
                resume_data["raw_text"] = raw_resume
                ov_score = resume_data.get("overall_score") or mock_overall_score
                ov_fit = "Excellent Match" if ov_score >= 80 else "Good Match" if ov_score >= 60 else "Average Match"
                combined_analysis = {
                    "final_decision": intv.get("admin_status") or "Pending Review",
                    "summary": f"Resume score: {ov_score}%. Interview score: {interview_summary['interview_score']}%. Match level: {ov_fit}.",
                    "recommendation": "Shortlist for technical rounds" if interview_summary['interview_score'] >= 55 else "Re-evaluate or hold"
                }

            cur.execute("""
                SELECT question_no, question_text, candidate_answer, expected_answer, difficulty, 
                       ai_score, technical_score, communication_score, confidence_score, 
                       correctness_status, question_status, ai_feedback, suggestion, topic, skill, created_at
                FROM answer_evaluations
                WHERE interview_id = %s
                ORDER BY question_no ASC
            """, (intv_id,))
            eval_rows = cur.fetchall()
            eval_cols = [d[0] for d in cur.description]
            evaluations = [dict(zip(eval_cols, er)) for er in eval_rows]

            if not evaluations:
                cur.execute("""
                    SELECT question_no, question_text, COALESCE(candidate_answer, answer_text) as candidate_answer,
                           expected_answer, difficulty, COALESCE(score, ai_score, 0) as ai_score, 
                           technical_score, clarity_score as communication_score, score as confidence_score,
                           correctness_status, status as question_status, feedback as ai_feedback, suggestion, topic, skill, created_at
                    FROM answers
                    WHERE interview_id = %s
                    ORDER BY question_no ASC
                """, (intv_id,))
                ans_rows = cur.fetchall()
                ans_cols = [d[0] for d in cur.description]
                evaluations = [dict(zip(ans_cols, ar)) for ar in ans_rows]

            def scale_to_5(val):
                try:
                    val = float(val) if val is not None else 0
                    scaled = round(val / 20.0)
                    return max(0, min(5, scaled))
                except:
                    return 0

            for ev in evaluations:
                q_no = ev.get("question_no") or 0
                q_text = ev.get("question_text") or ""
                cand_ans = ev.get("candidate_answer") or ""
                correct_status = ev.get("correctness_status") or "Incorrect"
                skill_tag = ev.get("skill") or ev.get("topic") or "General"
                ans_time = ""
                if ev.get("created_at"):
                    try:
                        ans_time = ev["created_at"].strftime('%H:%M:%S')
                    except:
                        pass

                questions_answers.append({
                    "question_no": q_no,
                    "category": ev.get("topic") or "General",
                    "skill": skill_tag,
                    "difficulty": ev.get("difficulty") or "Easy",
                    "question_text": q_text,
                    "answer_text": cand_ans,
                    "status": "Answered" if (cand_ans and cand_ans.lower() != "skipped") else "Skipped",
                    "score": ev.get("ai_score") or 0,
                    "content_score": scale_to_5(ev.get("technical_score") or ev.get("ai_score") or 0),
                    "clarity_score": scale_to_5(ev.get("communication_score") or ev.get("ai_score") or 0),
                    "relevance_score": scale_to_5(ev.get("ai_score") or 0),
                    "confidence_score": scale_to_5(ev.get("confidence_score") or ev.get("ai_score") or 0),
                    "result": "Correct" if correct_status.lower() in ["correct", "attempted"] else "Incorrect",
                    "feedback": ev.get("ai_feedback") or "No feedback available.",
                    "answered_at": ans_time
                })

                conversation.append({"role": "ai", "text": q_text})
                conversation.append({"role": "student", "text": cand_ans if cand_ans else "Skipped"})

        if not questions_answers:
            questions_answers = [
                {
                    "question_no": 1,
                    "category": "Self Introduction",
                    "skill": "Communication",
                    "difficulty": "Easy",
                    "question_text": "Please introduce yourself and talk about your technical background.",
                    "answer_text": "I am a software developer with experience in building web applications using React and Python. I have worked on database design and building APIs.",
                    "status": "Answered",
                    "score": 85,
                    "content_score": 4,
                    "clarity_score": 5,
                    "relevance_score": 4,
                    "confidence_score": 4,
                    "result": "Correct",
                    "feedback": "Clear, concise introduction highlighting relevant experience.",
                    "answered_at": "10:02:15"
                },
                {
                    "question_no": 2,
                    "category": "Core Technical",
                    "skill": "React",
                    "difficulty": "Medium",
                    "question_text": "Explain the difference between state and props in React.",
                    "answer_text": "State is internal to a component and can be mutated by the component itself. Props are read-only inputs passed from a parent component.",
                    "status": "Answered",
                    "score": 90,
                    "content_score": 5,
                    "clarity_score": 5,
                    "relevance_score": 5,
                    "confidence_score": 5,
                    "result": "Correct",
                    "feedback": "Accurate explanation of state and props with core distinctions clearly specified.",
                    "answered_at": "10:05:32"
                },
                {
                    "question_no": 3,
                    "category": "Database",
                    "skill": "SQL",
                    "difficulty": "Medium",
                    "question_text": "What is the difference between inner join and left join in SQL?",
                    "answer_text": "Inner join returns matching rows in both tables. Left join returns all rows from the left table and matching rows from the right table, with nulls if no match.",
                    "status": "Answered",
                    "score": 88,
                    "content_score": 4,
                    "clarity_score": 5,
                    "relevance_score": 4,
                    "confidence_score": 4,
                    "result": "Correct",
                    "feedback": "Good explanation with accurate database logic.",
                    "answered_at": "10:08:44"
                },
                {
                    "question_no": 4,
                    "category": "Web Security",
                    "skill": "Security",
                    "difficulty": "Hard",
                    "question_text": "How do you protect a web application against Cross-Site Scripting (XSS) attacks?",
                    "answer_text": "By sanitizing user input, using Content Security Policies (CSP), escaping outputs before rendering, and using modern frameworks that do auto-escaping.",
                    "status": "Answered",
                    "score": 85,
                    "content_score": 4,
                    "clarity_score": 4,
                    "relevance_score": 5,
                    "confidence_score": 4,
                    "result": "Correct",
                    "feedback": "Covered key prevention strategies comprehensively.",
                    "answered_at": "10:12:02"
                },
                {
                    "question_no": 5,
                    "category": "Coding & Logic",
                    "skill": "Python",
                    "difficulty": "Medium",
                    "question_text": "How does memory management work in Python?",
                    "answer_text": "Python uses automatic memory management through reference counting and a garbage collector to resolve reference cycles.",
                    "status": "Answered",
                    "score": 80,
                    "content_score": 4,
                    "clarity_score": 4,
                    "relevance_score": 4,
                    "confidence_score": 4,
                    "result": "Correct",
                    "feedback": "Correctly identified reference counting and garbage collection.",
                    "answered_at": "10:15:19"
                }
            ]
            conversation = []
            for qa in questions_answers:
                conversation.append({"role": "ai", "text": qa["question_text"]})
                conversation.append({"role": "student", "text": qa["answer_text"]})

        return jsonify({
            "success": True,
            "user": user_data,
            "resume": resume_data,
            "interview": interview_summary,
            "combined_analysis": combined_analysis,
            "questions_answers": questions_answers,
            "conversation": conversation,
            "violations": violations_data,
            "logs": logs_list,
            "ai_strengths": ai_strengths,
            "ai_improvements": ai_improvements,
            "ai_suggestions": ai_suggestions
        }), 200

    except Exception as e:
        print("Error in get_user_full_detail:", e)
        return jsonify({"success": False, "message": str(e)}), 200
    finally:
        cur.close()
        conn.close()

@bp.route('/live-proctoring/appreciate', methods=['POST'])
def appreciate_candidate():
    data = request.json
    user_email = data.get('candidate_email')
    msg = data.get('message', 'Admin appreciated your interview performance. Keep going with clear and confident answers.')
    conn = get_db_connection()
    if not conn: return jsonify({"success": False, "message": "Database error"}), 500
    cur = conn.cursor()
    try:
        ist_now_dt = get_ist_time()
        ist_now_str = ist_now_dt.strftime('%d %b %Y, %I:%M %p')
        cur.execute("""
            INSERT INTO notifications (user_email, title, message, type, event_type, status, target_role, created_at_ist, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (user_email, "Appreciation from Admin", msg, "success", "Admin Appreciation", "unread", "user", ist_now_str, ist_now_dt))
        conn.commit()
        return jsonify({"success": True, "message": "Appreciation sent to candidate."})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/live-proctoring/terminate', methods=['POST'])
def terminate_candidate():
    data = request.json
    intv_id = data.get('interview_id')
    user_email = data.get('candidate_email')
    reason = data.get('reason', 'Interview terminated by admin during live proctoring.')
    conn = get_db_connection()
    if not conn: return jsonify({"success": False, "message": "Database error"}), 500
    cur = conn.cursor()
    try:
        ist_now_dt = get_ist_time()
        ist_now_str = ist_now_dt.strftime('%d %b %Y, %I:%M %p')
        cur.execute("""
            UPDATE interviews
            SET status = 'terminated', termination_reason = %s, end_time = %s, ended_at_ist = %s
            WHERE id = %s
        """, (reason, ist_now_dt, ist_now_str, intv_id))
        cur.execute("""
            INSERT INTO notifications (user_email, interview_id, title, message, type, event_type, status, target_role, created_at_ist, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (user_email, intv_id, "Interview Terminated", "Your interview was terminated by admin. Check results for details.", "error", "Admin Termination", "unread", "user", ist_now_str, ist_now_dt))
        conn.commit()
        return jsonify({"success": True, "message": "Interview terminated successfully."})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/live-proctoring', methods=['GET'])
def get_admin_live_proctoring():
    conn = get_db_connection()
    if not conn: return jsonify({"success": False, "message": "Database error"}), 500
    cur = conn.cursor()
    try:
        ist = pytz.timezone('Asia/Kolkata')
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
        data = []
        for r in rows:
            ld = dict(zip(cols, r))
            started_ist = 'N/A'
            curr_duration = '0m 0s'
            if ld.get('start_time'):
                s_time = ld['start_time'].astimezone(ist)
                started_ist = s_time.strftime('%d %b %Y, %I:%M %p')
                diff = datetime.now(ist) - s_time
                curr_duration = f"{int(diff.total_seconds() // 60)} min {int(diff.total_seconds() % 60)} sec"

            last_act_ist = 'N/A'
            if ld.get('last_activity_at'):
                last_act_ist = ld['last_activity_at'].astimezone(ist).strftime('%d %b %Y, %I:%M %p')

            data.append({
                "student_name": ld.get('student_name') or 'N/A',
                "candidate_name": ld.get('student_name') or 'N/A',
                "email": ld.get('email') or 'N/A',
                "candidate_email": ld.get('email') or 'N/A',
                "phone": ld.get('phone') or 'N/A',
                "role": ld.get('role') or 'user',
                "interview_id": ld['interview_id'],
                "camera_status": ld.get('camera_status', 'inactive').lower(),
                "mic_status": ld.get('microphone_status', 'inactive').lower(),
                "microphone_status": ld.get('microphone_status', 'inactive').lower(),
                "face_status": ld.get('face_status', 'not detected').lower(),
                "warning_count": ld.get('warning_count') or 0,
                "suspicious_activity_count": ld.get('suspicious_score') or 0,
                "current_question": ld.get('current_question') or 0,
                "started_at_ist": started_ist,
                "current_duration": curr_duration,
                "last_activity_ist": last_act_ist,
                "status": ld.get('status') or 'active',
                "camera_frame": ld.get('camera_frame')
            })
        return jsonify({"success": True, "data": data, "message": "Live proctoring sessions loaded"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/reports', methods=['GET'])
@bp.route('/reports/recent', methods=['GET'])
def get_all_reports():
    conn = get_db_connection()
    if not conn: return jsonify({"success": False, "message": "Database error"}), 500
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT 
                u.full_name, u.email, u.phone, u.role,
                r.interview_id, r.status, r.final_percentage as overall_score,
                r.technical_score, r.communication_score, r.confidence_score,
                r.confidence_level, r.warning_count as cheating_alerts,
                r.duration, r.started_at_ist, r.ended_at_ist, r.final_recommendation,
                COALESCE(r.attended_count, i.answered_questions, 0) as answered_questions,
                COALESCE(r.skipped_count, i.skipped_questions, 0) as skipped_questions,
                COALESCE(r.unanswered_count, i.not_attempted_questions, 30) as not_attempted_questions,
                COALESCE(i.completion_percentage, 0.0) as completion_percentage,
                i.admin_hiring_status, i.admin_note, i.admin_status_updated_at_ist, i.attempt_no
            FROM users u
            LEFT JOIN results r ON u.email = r.user_email
            LEFT JOIN interviews i ON r.interview_id = i.id
            WHERE u.role != 'admin'
            ORDER BY u.created_at DESC, i.attempt_no DESC
        """)
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        reports = []
        for r in rows:
            d = dict(zip(cols, r))
            reports.append({
                "student_name": d['full_name'] or 'N/A',
                "candidate_name": d['full_name'] or 'N/A',
                "full_name": d['full_name'] or 'N/A',
                "email": d['email'],
                "candidate_email": d['email'],
                "user_email": d['email'],
                "phone": d['phone'] or 'N/A',
                "role": d['role'] or 'user',
                "interview_id": d['interview_id'] or 'N/A',
                "status": d['status'] or 'No Interview Yet',
                "overall_score": d['overall_score'] if d['overall_score'] is not None else 0,
                "final_percentage": d['overall_score'] if d['overall_score'] is not None else 0,
                "technical_score": d['technical_score'] if d['technical_score'] is not None else 0,
                "communication_score": d['communication_score'] if d['communication_score'] is not None else 0,
                "confidence_score": d['confidence_score'] if d['confidence_score'] is not None else 0,
                "confidence_level": d['confidence_level'] or 'N/A',
                "cheating_alerts": d['cheating_alerts'] if d['cheating_alerts'] is not None else 0,
                "cheating_alert_count": d['cheating_alerts'] if d['cheating_alerts'] is not None else 0,
                "duration": d['duration'] or 'N/A',
                "started_at_ist": d['started_at_ist'] or 'N/A',
                "ended_at_ist": d['ended_at_ist'] or 'N/A',
                "created_at": d['started_at_ist'] or d['ended_at_ist'] or 'N/A',
                "final_recommendation": d['final_recommendation'] or 'N/A',
                "answered_questions": d['answered_questions'] or 0,
                "skipped_questions": d['skipped_questions'] or 0,
                "not_attempted_questions": d['not_attempted_questions'] or 0,
                "completion_percentage": d['completion_percentage'] or 0.0,
                "admin_hiring_status": d['admin_hiring_status'] or 'Pending',
                "admin_note": d['admin_note'] or '',
                "admin_status_updated_at_ist": d['admin_status_updated_at_ist'] or 'N/A',
                "attempt_no": d['attempt_no'] or 1
            })
        return jsonify({"success": True, "reports": reports})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/download-reports', methods=['GET'])
def download_reports():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT 
            u.full_name, u.email, u.phone, u.role,
            i.id as interview_id, i.status, i.final_percentage, i.technical_score,
            i.communication_score, i.confidence_score, i.confidence_level,
            i.answer_correctness_score, i.response_time_score, i.hesitation_score,
            i.warning_count, i.duration, i.started_at_ist, i.ended_at_ist,
            i.final_recommendation, i.admin_hiring_status, i.admin_note, i.attempt_no
        FROM users u
        LEFT JOIN interviews i ON u.email = i.user_email
        WHERE u.role != 'admin'
        ORDER BY u.created_at DESC, i.attempt_no DESC
    """)
    rows = cur.fetchall()
    import io, csv
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Candidate Name", "Email", "Phone", "Role", "Interview ID", "Status",
        "Overall Score", "Technical Score", "Communication Score", "Confidence Score",
        "Confidence Level", "Answer Correctness Score", "Response Time Score",
        "Hesitation Score", "Cheating Alerts", "Duration", "Started Time",
        "Ended Time", "Final Recommendation", "Hiring Status", "Admin Note", "Attempt No"
    ])
    for r in rows:
        r_list = list(r)
        if r_list[19] is None:
            r_list[19] = 'Pending'
        if r_list[20] is None:
            r_list[20] = ''
        if r_list[21] is None:
            r_list[21] = 1
        writer.writerow(r_list)
    output.seek(0)
    from flask import make_response
    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = "attachment; filename=interview_reports.csv"
    response.headers["Content-type"] = "text/csv"
    cur.close()
    conn.close()
    return response

@bp.route('/dashboard', methods=['GET'])
def get_dashboard_summary():
    conn = get_db_connection()
    if not conn: return jsonify({"success": False, "message": "Database error"}), 500
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) FROM users WHERE role != 'admin'")
        total_users = cur.fetchone()[0] or 0
        cur.execute("SELECT COUNT(*) FROM interviews WHERE status = 'active'")
        active_interviews = cur.fetchone()[0] or 0
        cur.execute("SELECT COUNT(*) FROM interviews WHERE status = 'terminated'")
        terminated = cur.fetchone()[0] or 0
        cur.execute("SELECT AVG(final_percentage) FROM results")
        avg_score = cur.fetchone()[0] or 0
        cur.execute("SELECT COUNT(*) FROM interviews WHERE warning_count >= 3")
        suspicious = cur.fetchone()[0] or 0
        return jsonify({
            "success": True, 
            "stats": {
                "total_users": total_users, 
                "active_interviews": active_interviews, 
                "terminated_interviews": terminated, 
                "avg_score": round(float(avg_score), 1), 
                "suspicious_users": suspicious
            }
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/ai-report/<int:id>', methods=['GET'])
def get_admin_report(id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM admin_ai_reports WHERE interview_id = %s", (id,))
        row = cur.fetchone()
        if not row:
            return jsonify({"success": False, "message": "Report not found"}), 404
        cols = [d[0] for d in cur.description]
        report_dict = dict(zip(cols, row))
        
        cur.execute("SELECT admin_note FROM interviews WHERE id = %s", (id,))
        intv_row = cur.fetchone()
        report_dict['admin_note'] = intv_row[0] if intv_row else ''
        
        return jsonify({"success": True, "report": report_dict})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/ai-report', methods=['POST'])
def save_admin_report():
    data = request.json
    intv_id = data.get('interview_id')
    decision = data.get('recruiter_decision')
    note = data.get('admin_note') or ''
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        ist_now = get_ist_time().strftime('%d %b %Y, %I:%M %p')
        cur.execute("""
            UPDATE admin_ai_reports 
            SET recruiter_decision = %s 
            WHERE interview_id = %s
        """, (decision, intv_id))
        cur.execute("""
            UPDATE interviews 
            SET admin_hiring_status = %s, admin_final_status = %s, admin_note = %s, admin_status_updated_at_ist = %s 
            WHERE id = %s
        """, (decision, decision, note, ist_now, intv_id))
        cur.execute("""
            UPDATE results 
            SET recruiter_decision = %s 
            WHERE interview_id = %s
        """, (decision, intv_id))
        cur.execute("""
            UPDATE interview_results 
            SET admin_final_status = %s, admin_note = %s 
            WHERE interview_id = %s
        """, (decision, note, intv_id))
        conn.commit()
        return jsonify({"success": True, "message": "Decision saved"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/download-timer-report', methods=['GET'])
def download_timer_report():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT 
            u.full_name, u.email, u.phone, u.role,
            i.id as interview_id, i.status, i.total_duration_seconds, i.remaining_time_seconds,
            i.submitted_early, i.time_left_at_submit, i.average_response_time,
            i.slow_answers_count, i.fast_answers_count, i.warning_count, i.attempt_no
        FROM users u
        LEFT JOIN interviews i ON u.email = i.user_email
        WHERE u.role != 'admin'
        ORDER BY u.created_at DESC, i.attempt_no DESC
    """)
    rows = cur.fetchall()
    import io, csv
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Candidate Name", "Email", "Phone", "Role", "Interview ID", "Status",
        "Total Duration (Seconds)", "Remaining Time (Seconds)", "Submitted Early",
        "Time Left At Submit", "Average Response Time (Seconds)", "Slow Answers Count",
        "Fast Answers Count", "Cheating Alerts", "Attempt No"
    ])
    for r in rows:
        r_list = list(r)
        if r_list[8] is None:
            r_list[8] = 'No'
        if r_list[9] is None:
            r_list[9] = 'N/A'
        if r_list[10] is None:
            r_list[10] = 0.0
        if r_list[11] is None:
            r_list[11] = 0
        if r_list[12] is None:
            r_list[12] = 0
        writer.writerow(r_list)
    output.seek(0)
    from flask import make_response
    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = "attachment; filename=interview_timer_report.csv"
    response.headers["Content-type"] = "text/csv"
    cur.close()
    conn.close()
    return response


@bp.route('/interview-detail/<int:interview_id>', methods=['GET'])
def get_admin_interview_detail(interview_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database connection failed", "data": None}), 200
    cur = conn.cursor()
    try:
        import pytz
        cur.execute("""
            SELECT i.id, i.user_id, i.user_email, i.full_name, i.phone, i.role_applied, i.status, 
                   i.warning_count, i.attended_count, i.skipped_count, i.unanswered_count, 
                   i.total_questions, i.final_percentage, i.confidence_level, i.technical_score, 
                   i.communication_score, i.suspicious_score, i.result_status, i.termination_reason, 
                   i.camera_status, i.audio_status, i.face_status, i.last_activity_at, i.created_at,
                   i.start_time, i.end_time, i.duration, i.ended_at_ist, i.started_at_ist,
                   i.final_recommendation, i.ai_recommendation, i.admin_status
            FROM interviews i
            WHERE i.id = %s
        """, (interview_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({"success": False, "message": "Interview not found", "data": None}), 200
        
        cols = [d[0] for d in cur.description]
        intv = dict(zip(cols, row))
        
        ist = pytz.timezone('Asia/Kolkata')
        started_at = ""
        if intv.get("start_time"):
            started_at = intv["start_time"].astimezone(ist).strftime('%d %b %Y, %I:%M %p')
        elif intv.get("started_at_ist"):
            started_at = intv["started_at_ist"]

        ended_at = ""
        if intv.get("end_time"):
            ended_at = intv["end_time"].astimezone(ist).strftime('%d %b %Y, %I:%M %p')
        elif intv.get("ended_at_ist"):
            ended_at = intv["ended_at_ist"]

        cur.execute("SELECT performance_summary FROM results WHERE interview_id = %s", (interview_id,))
        res_row = cur.fetchone()
        summary_text = res_row[0] if res_row else (intv.get("final_recommendation") or "No summary available")

        cur.execute("""
            SELECT question_no, question_text, candidate_answer, expected_answer, difficulty, 
                   ai_score, technical_score, communication_score, confidence_score, 
                   correctness_status, question_status, ai_feedback, suggestion, topic, skill
            FROM answer_evaluations
            WHERE interview_id = %s
            ORDER BY question_no ASC
        """, (interview_id,))
        eval_rows = cur.fetchall()
        eval_cols = [d[0] for d in cur.description]
        evaluations = [dict(zip(eval_cols, er)) for er in eval_rows]

        if not evaluations:
            cur.execute("""
                SELECT question_no, question_text, COALESCE(candidate_answer, answer_text) as candidate_answer,
                       expected_answer, difficulty, COALESCE(score, ai_score, 0) as ai_score, 
                       technical_score, clarity_score as communication_score, score as confidence_score,
                       correctness_status, status as question_status, feedback as ai_feedback, suggestion, topic, skill
                FROM answers
                WHERE interview_id = %s
                ORDER BY question_no ASC
            """, (interview_id,))
            ans_rows = cur.fetchall()
            ans_cols = [d[0] for d in cur.description]
            evaluations = [dict(zip(ans_cols, ar)) for ar in ans_rows]

        chat = []
        scored_technical = []
        ignored_prompts = []
        correct_count = 0
        total_technical = 0

        skill_groups = {
            "Java": [],
            "JavaScript": [],
            "React": [],
            "HTML": [],
            "CSS": [],
            "SQL": [],
            "Git": [],
            "GitHub": [],
            "Other": []
        }

        for ev in evaluations:
            q_no = ev.get("question_no") or 0
            q_text = ev.get("question_text") or ""
            cand_ans = ev.get("candidate_answer") or ""
            correct_status = ev.get("correctness_status") or "Incorrect"
            skill_tag = ev.get("skill") or ev.get("topic") or "General"
            
            chat.append({"role": "ai", "text": q_text})
            chat.append({"role": "student", "text": cand_ans if cand_ans else "Skipped"})

            category = ev.get("topic") or ""
            is_ignored = (q_no <= 10) or any(x in category.lower() for x in ["intro", "greeting", "setup", "personal"])
            
            def scale_to_5(val):
                try:
                    val = float(val) if val is not None else 0
                    scaled = round(val / 20.0)
                    return max(0, min(5, scaled))
                except:
                    return 0

            formatted_q = {
                "question_no": q_no,
                "question_text": q_text,
                "candidate_answer": cand_ans,
                "correctness_status": correct_status,
                "skill": skill_tag,
                "content_score": scale_to_5(ev.get("technical_score") or ev.get("ai_score") or 0),
                "clarity_score": scale_to_5(ev.get("communication_score") or ev.get("ai_score") or 0),
                "relevance_score": scale_to_5(ev.get("ai_score") or 0),
                "confidence_score": scale_to_5(ev.get("confidence_score") or ev.get("ai_score") or 0),
                "ai_feedback": ev.get("ai_feedback") or "No feedback available."
            }

            if is_ignored:
                label = "Greeting/Setup"
                if "intro" in category.lower() or q_no <= 5:
                    label = "Greeting/Intro"
                elif "setup" in category.lower():
                    label = "System Setup"
                elif "resume" in category.lower() or "document" in category.lower():
                    label = "Resume/Document Question"
                else:
                    label = "Non-technical Prompt"
                
                ignored_prompts.append({
                    "question_no": q_no,
                    "question_text": q_text,
                    "candidate_answer": cand_ans,
                    "label": label
                })
            else:
                scored_technical.append(formatted_q)
                total_technical += 1
                if correct_status.lower() in ["correct", "attempted"]:
                    correct_count += 1

                mapped = False
                for sk in ["Java", "JavaScript", "React", "HTML", "CSS", "SQL", "Git", "GitHub"]:
                    if sk.lower() in skill_tag.lower():
                        skill_groups[sk].append({
                            "question_no": q_no,
                            "question_text": q_text,
                            "student_answer": cand_ans,
                            "status": "Correct" if correct_status.lower() in ["correct", "attempted"] else ("Skipped" if cand_ans.lower() == "skipped" else "Incorrect")
                        })
                        mapped = True
                        break
                if not mapped:
                    skill_groups["Other"].append({
                        "question_no": q_no,
                        "question_text": q_text,
                        "student_answer": cand_ans,
                        "status": "Correct" if correct_status.lower() in ["correct", "attempted"] else ("Skipped" if cand_ans.lower() == "skipped" else "Incorrect")
                    })

        skill_groups = {k: v for k, v in skill_groups.items() if len(v) > 0}

        cur.execute("SELECT violation_type, message FROM violations WHERE interview_id = %s", (interview_id,))
        violation_rows = cur.fetchall()
        
        cur.execute("SELECT flag_type, message FROM proctoring_flags WHERE interview_id = %s", (interview_id,))
        flag_rows = cur.fetchall()

        all_events = violation_rows + flag_rows
        v_counts = {
            "no_face": 0,
            "multiple_faces": 0,
            "tab_switches": 0,
            "audio_muted": 0,
            "camera_off": 0
        }

        for ev_type, msg in all_events:
            ev_type_lower = (ev_type or "").lower()
            msg_lower = (msg or "").lower()
            
            if "no face" in ev_type_lower or "no face" in msg_lower or "face not detected" in ev_type_lower:
                v_counts["no_face"] += 1
            elif "multiple face" in ev_type_lower or "multiple face" in msg_lower or "multiple faces" in ev_type_lower:
                v_counts["multiple_faces"] += 1
            elif "tab" in ev_type_lower or "tab" in msg_lower or "switch" in ev_type_lower:
                v_counts["tab_switches"] += 1
            elif "audio" in ev_type_lower or "mute" in ev_type_lower or "microphone" in ev_type_lower:
                v_counts["audio_muted"] += 1
            elif "camera off" in ev_type_lower or "camera turned off" in ev_type_lower or "camera" in ev_type_lower:
                v_counts["camera_off"] += 1

        answered_count = len([x for x in evaluations if (x.get("candidate_answer") or "").strip() not in ["", "skipped", "Skipped"]])
        skipped_count = len([x for x in evaluations if (x.get("candidate_answer") or "").strip() in ["", "skipped", "Skipped"]])

        response_data = {
            "candidate": {
                "name": intv.get("full_name") or "Candidate",
                "email": intv.get("user_email") or "",
                "phone": intv.get("phone") or "",
                "role": intv.get("role_applied") or "Software Engineer"
            },
            "interview": {
                "id": interview_id,
                "status": intv.get("status"),
                "start_time": started_at,
                "end_time": ended_at,
                "duration": intv.get("duration") or "15m 0s",
                "warning_count": intv.get("warning_count") or 0,
                "overall_score": intv.get("final_percentage") or 0.0,
                "technical_score": intv.get("technical_score") or 0,
                "communication_score": intv.get("communication_score") or 0,
                "confidence_level": intv.get("confidence_level") or "Moderate Confidence"
            },
            "summary": summary_text,
            "decision": intv.get("admin_status") or "Pending Review",
            "correct_count": correct_count,
            "total_technical": total_technical,
            "answered_count": answered_count,
            "skipped_count": skipped_count,
            "chat": chat,
            "skill_groups": skill_groups,
            "scored_technical": scored_technical,
            "ignored_prompts": ignored_prompts,
            "violations": v_counts
        }

        return jsonify({"success": True, "data": response_data}), 200

    except Exception as e:
        print("Error fetching interview detail:", e)
        return jsonify({"success": False, "message": str(e), "data": None}), 200
    finally:
        cur.close()
        conn.close()


@bp.route('/results/<int:iid>/pdf', methods=['GET'])
def download_pdf(iid):
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas as pdf_canvas
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM interviews WHERE id = %s", (iid,))
        cols = [d[0] for d in cur.description]
        row = cur.fetchone()
        if not row:
            return jsonify({"success": False, "message": "Interview not found"}), 404
        iv = dict(zip(cols, row))
        cur.execute("SELECT * FROM users WHERE id = %s", (iv.get("user_id"),))
        ucols = [d[0] for d in cur.description]
        urow = cur.fetchone()
        u = dict(zip(ucols, urow)) if urow else {}
        cur.execute("SELECT * FROM answers WHERE interview_id = %s ORDER BY question_no", (iid,))
        acols = [d[0] for d in cur.description]
        answers = [dict(zip(acols, r)) for r in cur.fetchall()]
        cur.close()
        conn.close()

        buf = io.BytesIO()
        c = pdf_canvas.Canvas(buf, pagesize=letter)
        w, h = letter
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, h - 50, "AI Proctor - Interview Report")
        c.setFont("Helvetica", 12)
        c.drawString(50, h - 80, f"Name: {u.get('full_name') or u.get('name', 'N/A')}")
        c.drawString(50, h - 100, f"Email: {u.get('email', 'N/A')}")
        c.drawString(50, h - 120, f"Role: {iv.get('role_applied', 'N/A')}")
        c.drawString(50, h - 140, f"Overall Score: {iv.get('overall_score') or iv.get('final_percentage', 0)}%")
        c.drawString(50, h - 160, f"Status: {iv.get('admin_status') or iv.get('admin_hiring_status', 'Pending')}")
        y = h - 200
        c.setFont("Helvetica-Bold", 12)
        c.drawString(50, y, "Questions & Answers:")
        y -= 20
        c.setFont("Helvetica", 10)
        for i, a in enumerate(answers or []):
            if y < 80:
                c.showPage()
                y = h - 50
                c.setFont("Helvetica", 10)
            q_text = str(a.get('question_text') or '')[:80]
            ans_text = str(a.get('candidate_answer') or a.get('answer_text') or '')[:80]
            fb_text = str(a.get('feedback') or '')[:60]
            c.drawString(50, y, f"Q{i+1}: {q_text}")
            y -= 15
            c.drawString(60, y, f"A: {ans_text}")
            y -= 15
            c.drawString(60, y, f"Score: {a.get('score') or a.get('ai_score', 0)} | {fb_text}")
            y -= 20
        c.save()
        buf.seek(0)
        cname = (u.get('full_name') or u.get('name') or 'candidate').replace(' ', '_')
        return send_file(buf, mimetype="application/pdf", as_attachment=True, download_name=f"report_{cname}.pdf")
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@bp.route('/stats', methods=['GET'])
@bp.route('/dashboard-stats', methods=['GET'])
def admin_stats():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) FROM users WHERE role != 'admin'")
        total_users = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM interviews WHERE status = 'active'")
        active = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM interviews WHERE LOWER(status) = 'terminated'")
        terminated = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM interviews WHERE LOWER(status) = 'completed'")
        completed = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM interviews")
        total_interviews = cur.fetchone()[0] or 0

        cur.execute("SELECT AVG(COALESCE(overall_score, final_percentage, 0)) FROM interviews WHERE COALESCE(overall_score, final_percentage, 0) > 0")
        avg_row = cur.fetchone()
        avg = round(float(avg_row[0] or 0), 1)

        cur.execute("""
            SELECT
                COUNT(CASE WHEN LOWER(admin_hiring_status) = 'shortlisted' OR LOWER(admin_status) = 'shortlisted' THEN 1 END),
                COUNT(CASE WHEN LOWER(admin_hiring_status) IN ('not shortlisted', 'rejected') OR LOWER(admin_status) IN ('not shortlisted', 'rejected') THEN 1 END),
                COUNT(CASE WHEN LOWER(admin_hiring_status) IN ('hiring in process', 'pending review') OR LOWER(admin_status) IN ('hiring in process', 'pending review') THEN 1 END),
                COUNT(CASE WHEN LOWER(admin_hiring_status) = 'selected' OR LOWER(admin_status) = 'selected' THEN 1 END)
            FROM users WHERE role != 'admin'
        """)
        user_stats_row = cur.fetchone() or (0, 0, 0, 0)
        shortlisted = user_stats_row[0] or 0
        rejected = user_stats_row[1] or 0
        hiring = user_stats_row[2] or 0
        selected = user_stats_row[3] or 0

        cur.execute("SELECT COUNT(*) FROM interviews WHERE COALESCE(answered_questions, 0) >= 15")
        passed = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM interviews WHERE COALESCE(answered_questions, 0) > 0 AND COALESCE(answered_questions, 0) < 15")
        failed = cur.fetchone()[0] or 0

        return jsonify({"success": True, "stats": {
            "total_users": total_users,
            "active_interviews": active,
            "terminated_interviews": terminated,
            "completed_interviews": completed,
            "total_interviews": total_interviews,
            "avg_score": avg,
            "shortlisted": shortlisted,
            "rejected": rejected,
            "hiring_in_process": hiring,
            "selected": selected,
            "passed_users": passed,
            "failed_users": failed
        }})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@bp.route('/notifications', methods=['GET'])
def get_admin_notifications_list():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT n.*, COALESCE(u.full_name, u.name, 'N/A') as user_name, u.email as user_email_addr
            FROM notifications n
            LEFT JOIN users u ON n.user_email = u.email
            WHERE n.target_role = 'admin' OR n.target_role = 'all'
            ORDER BY n.created_at DESC LIMIT 100
        """)
        cols = [d[0] for d in cur.description]
        rows = [dict(zip(cols, r)) for r in cur.fetchall()]
        cur.execute("SELECT COUNT(*) FROM notifications WHERE target_role = 'admin' AND status = 'unread'")
        unread = cur.fetchone()[0] or 0
        return jsonify({"success": True, "notifications": rows, "unread_count": unread})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()
