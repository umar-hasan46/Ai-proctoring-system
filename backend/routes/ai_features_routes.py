import json
from flask import Blueprint, request, jsonify
from db import get_db_connection, get_ist_time
from datetime import datetime

bp = Blueprint('ai_features', __name__)

def format_ist_time(dt):
    return dt.strftime("%d %b %Y, %I:%M %p")

@bp.route('/interview/results', methods=['GET'])
def get_all_interview_results():
    email = request.args.get('email')
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        if email:
            cur.execute("SELECT * FROM results WHERE user_email = %s ORDER BY created_at DESC", (email,))
        else:
            cur.execute("SELECT * FROM results ORDER BY created_at DESC")
        rows = cur.fetchall()
        columns = [d[0] for d in cur.description]
        return jsonify({"success": True, "results": [dict(zip(columns, row)) for row in rows]})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/interview/results/<int:interview_id>', methods=['GET'])
def get_single_result(interview_id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM results WHERE interview_id = %s", (interview_id,))
        row = cur.fetchone()
        if row:
            columns = [d[0] for d in cur.description]
            return jsonify({"success": True, "result": dict(zip(columns, row))})
        return jsonify({"success": True, "result": None, "message": "Result not found"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/interview/candidate-feedback', methods=['POST'])
def save_candidate_feedback():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        ist_now = get_ist_time()
        indian_time = format_ist_time(ist_now)
        cur.execute("""
            INSERT INTO candidate_ai_feedback (interview_id, candidate_name, role, overall_score, confidence_score, communication_score, hesitation_score, response_time_score, cheating_alert_count, final_recommendation, strengths, areas_to_improve, personalized_suggestions, indian_time)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (interview_id) DO UPDATE SET
                overall_score = EXCLUDED.overall_score,
                confidence_score = EXCLUDED.confidence_score,
                communication_score = EXCLUDED.communication_score,
                hesitation_score = EXCLUDED.hesitation_score,
                response_time_score = EXCLUDED.response_time_score,
                cheating_alert_count = EXCLUDED.cheating_alert_count,
                final_recommendation = EXCLUDED.final_recommendation,
                strengths = EXCLUDED.strengths,
                areas_to_improve = EXCLUDED.areas_to_improve,
                personalized_suggestions = EXCLUDED.personalized_suggestions,
                indian_time = EXCLUDED.indian_time
        """, (data['interview_id'], data['candidate_name'], data['role'], data['overall_score'], data['confidence_score'],
              data['communication_score'], data['hesitation_score'], data['response_time_score'], data['cheating_alert_count'],
              data['final_recommendation'], json.dumps(data['strengths']), json.dumps(data['areas_to_improve']),
              json.dumps(data['personalized_suggestions']), indian_time))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/interview/candidate-feedback/<int:interview_id>', methods=['GET'])
def get_candidate_feedback(interview_id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM candidate_ai_feedback WHERE interview_id = %s", (interview_id,))
        row = cur.fetchone()
        if row:
            columns = [d[0] for d in cur.description]
            feedback = dict(zip(columns, row))
            try:
                if isinstance(feedback['strengths'], str): feedback['strengths'] = json.loads(feedback['strengths'])
                if isinstance(feedback['areas_to_improve'], str): feedback['areas_to_improve'] = json.loads(feedback['areas_to_improve'])
                if isinstance(feedback['personalized_suggestions'], str): feedback['personalized_suggestions'] = json.loads(feedback['personalized_suggestions'])
            except: pass
            return jsonify({"success": True, "data": feedback})

        cur.execute("SELECT final_percentage, warning_count FROM results WHERE interview_id = %s", (interview_id,))
        res_row = cur.fetchone()

        default_feedback = {
            "interview_id": interview_id,
            "overall_feedback": "Your interview has been evaluated by AI. Some detailed feedback is still being generated.",
            "strengths": ["Answered the interview questions.", "Completed the interview flow."],
            "areas_to_improve": ["Improve clarity in technical answers.", "Reduce long pauses.", "Practice structured responses."],
            "suggestions": ["Use definition, example, and real-world use case format.", "Keep answers clear and direct.", "Practice mock interviews to improve confidence."],
            "created_at_ist": format_ist_time(get_ist_time()),
            "overall_score": res_row[0] if res_row else 0,
            "cheating_alert_count": res_row[1] if res_row else 0
        }
        return jsonify({"success": True, "data": default_feedback, "message": "Candidate feedback not available yet"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/admin/ai-report', methods=['POST'])
def save_admin_report():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        ist_now = get_ist_time()
        indian_time = format_ist_time(ist_now)
        cur.execute("""
            INSERT INTO admin_ai_reports (interview_id, candidate_name, candidate_email, phone, role, duration, status, overall_score, confidence_score, communication_score, hesitation_score, response_time_score, cheating_alert_count, final_recommendation, admin_summary, recruiter_decision, indian_time)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (interview_id) DO UPDATE SET
                overall_score = EXCLUDED.overall_score,
                confidence_score = EXCLUDED.confidence_score,
                communication_score = EXCLUDED.communication_score,
                hesitation_score = EXCLUDED.hesitation_score,
                response_time_score = EXCLUDED.response_time_score,
                cheating_alert_count = EXCLUDED.cheating_alert_count,
                final_recommendation = EXCLUDED.final_recommendation,
                admin_summary = EXCLUDED.admin_summary,
                indian_time = EXCLUDED.indian_time
        """, (data['interview_id'], data['candidate_name'], data['candidate_email'], data['phone'], data['role'],
              data['duration'], data['status'], data['overall_score'], data['confidence_score'],
              data['communication_score'], data['hesitation_score'], data['response_time_score'],
              data['cheating_alert_count'], data['final_recommendation'], data['admin_summary'],
              data.get('recruiter_decision', ''), indian_time))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/admin/ai-report/<int:interview_id>', methods=['GET'])
def get_admin_report(interview_id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM admin_ai_reports WHERE interview_id = %s", (interview_id,))
        row = cur.fetchone()
        if row:
            columns = [d[0] for d in cur.description]
            return jsonify({"success": True, "report": dict(zip(columns, row))})
        return jsonify({"success": True, "report": None, "message": "Report not found"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/admin/reports', methods=['GET'])
def get_admin_reports():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM admin_ai_reports ORDER BY created_at DESC")
        rows = cur.fetchall()
        columns = [d[0] for d in cur.description]
        return jsonify({"success": True, "reports": [dict(zip(columns, row)) for row in rows]})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/chatbot/message', methods=['POST'])
def chatbot_message():
    data = request.json
    user_email = data.get('user_email')
    user_role = data.get('user_role')
    page_name = data.get('page_name')
    message = data.get('message', '').lower()

    message_clean = message.strip()

    if message_clean == "explain my overall score":
        resp = "Your overall score is calculated as a weighted sum of:\n- Answer Correctness (40% weight)\n- Technical Score (25% weight)\n- Communication Score (15% weight)\n- Confidence Score (15% weight)\n- Response Time Score (5% weight)\n\nAll metrics are compiled using our AI evaluation engine, ensuring a balanced, comprehensive assessment."
    elif message_clean == "how was my technical score evaluated?":
        resp = "Your technical score evaluates the depth, accuracy, and structural completeness of your answers. The AI compares your answers against expert-level model responses to detect key technical keywords, correct usage of industry terminology, and implementation patterns."
    elif message_clean == "what does my confidence score mean?":
        resp = "The confidence score measures your speaking posture, hesitation counts, eye contact, and voice stability. A high score indicates calm, structured delivery with minimal speech pauses or structural hesitation."
    elif message_clean == "why was my interview status shown as incomplete?":
        resp = "An 'incomplete' status means the interview was terminated midway before answering all 30 questions. This can happen if you clicked 'Leave' early, or if there was a network disconnection. Rest assured, all answered questions are preserved and evaluated correctly."
    elif message_clean == "summarize candidate performance":
        resp = "To summarize candidate performance, go to the Students Dashboard or Reports tab. The candidate's final score, key strengths (e.g., strong conceptual accuracy), areas of improvement, and overall recruiter recommendation (e.g., 'Strong Candidate') are presented visually with complete statistical summaries."
    elif message_clean == "list critical proctoring violations":
        resp = "Critical violations are logged automatically during live proctoring. The AI flags eye tracking deviation (looking away from screen), tab switching, multiple faces detected in frame, and background voice alerts. You can view logs and count summaries in real-time or under the candidate's detailed audit tab."
    elif message_clean == "show technical scoring breakdown":
        resp = "The technical scoring breakdown displays question-by-question metrics. You can view the question text, candidate response, expected response, AI correctness status, and individual score components (Technical Accuracy, Communication, and Confidence) under the evaluations tab in candidate details."
    elif message_clean == "compare this candidate with overall average":
        resp = "You can compare candidate scores to the overall average by opening the Reports page. The visual metrics compare the individual's technical, communication, and confidence scores against the average benchmark of all candidates registered in the system."
    elif "dynamic" in message or "progression" in message or "escalat" in message or "difficulty" in message:
        resp = "Our interview system features a dynamic question selection engine. The system begins with Easy behavior questions and moves to Aptitude and Role-Specific technical questions. Based on your correctness, confidence, and communication scores, the AI dynamically escalates or de-escalates difficulty between Easy, Medium, and Advanced levels to perfectly evaluate your skill."
    elif "gemini" in message or "evaluat" in message or "grading" in message:
        resp = "The system leverages Gemini API to perform automatic answer grading based on correctness, technical accuracy, relevance, communication clarity, confidence level, and response time. This ensures fully objective and automated technical candidate evaluations."
    elif "overall score" in message or "performance score" in message or "completion percentage" in message:
        resp = "The final overall score is computed weighted: 80% is determined by your performance score (the average AI score of answered questions) and 20% by your completion percentage (questions answered out of 30)."
    elif page_name == 'Settings Page' or 'update profile' in message or 'profile picture' in message:
        if 'update' in message or 'change' in message or 'how to' in message:
            resp = "To update your profile, go to the Settings page. You can change your name, phone, password, and upload a profile picture. Once you save, changes will reflect instantly across the dashboard and navbar."
        elif 'not showing' in message:
            resp = "If your profile picture is not showing, ensure the file is a valid image (JPG, PNG, or WebP) and under 2MB. Try re-uploading in the Settings page and ensure you click 'Update Profile'."
        else:
            resp = "On the Settings page, you can manage your personal information and profile visibility. It's important to keep your details updated for accurate interview reporting."

    elif page_name == 'Results Page' or 'result' in message or 'score' in message:
        if 'confidence' in message:
            resp = "Confidence level is calculated based on your facial expressions, eye contact, and body language during the interview. To improve it, maintain steady eye contact with the camera and speak clearly."
        elif 'communication' in message:
            resp = "Communication score evaluates your clarity, tone, and grammar. It helps recruiters understand how well you can articulate your thoughts."
        elif 'technical' in message:
            resp = "The technical score measures how accurately your answers matched the core concepts and keywords expected for the role."
        elif 'low score' in message:
            resp = "A low score can be due to missing technical keywords or high hesitation. Practice structured answers (Definition, Example, Usage) to improve."
        else:
            resp = "The Results page provides a detailed audit of your performance, including AI feedback, technical scores, and behavioral analysis."

    elif page_name == 'Admin Dashboard' or 'admin dashboard' in message:
        if user_role == 'admin':
            resp = "The Admin Dashboard gives you a bird's-eye view of all system activities, including total students, active interviews, and recent violations."
        else:
            resp = "The Admin Dashboard is only accessible to system administrators. Candidates can use the User Dashboard to manage their interviews."

    elif page_name == 'Students Dashboard' or 'manage student' in message or 'view student' in message:
        if user_role == 'admin':
            resp = "In the Students Dashboard, you can see all registered candidates, their recent scores, and interview history. Use 'View Details' to see a candidate's full profile and recordings."
        elif 'missing data' in message:
            resp = "If student data is missing, ensure the student has completed their registration and started at least one session. You can also check the database logs."
        else:
            resp = "The Students Dashboard is for administrators to track and manage candidate progress and performance metrics."

    elif page_name == 'Live Proctoring Page' or 'live proctor' in message:
        if user_role == 'admin':
            resp = "Live Proctoring allows you to monitor candidates in real-time. You can see their camera feed, mic status, and any active violations. You can also 'Appreciate' or 'Terminate' sessions from here."
        else:
            resp = "Live Proctoring is an administrative feature used to ensure interview integrity. Candidates are monitored automatically by AI during their sessions."

    elif 'how to start' in message or 'register interview' in message:
        resp = "First, go to 'Register Interview' to enter your details and upload a resume. Then, you can start the interview from your dashboard. Make sure your camera and mic are working."

    elif 'appreciate' in message:
        if user_role == 'admin':
            resp = "The 'Appreciate' button sends a positive notification to the candidate, encouraging them without interrupting the flow."
        else:
            resp = "If you receive an appreciation, it means the admin is impressed with your current performance or conduct."

    elif 'terminate' in message:
        if user_role == 'admin':
            resp = "The 'Terminate' button ends the session immediately. Use it if you detect serious cheating or rule violations. You must provide a reason for termination."
        else:
            resp = "Termination happens if rules are broken or if the admin manually ends the session. You can see the reason on your results page."

    elif 'cheating' in message or 'alert' in message:
        resp = "AI triggers alerts for tab switching, multiple people, or looking away. Too many alerts may lead to automatic interview termination."

    elif 'notification' in message:
        resp = "Check your Notifications page for updates on your interview status, evaluation results, and important announcements."

    elif 'download' in message:
        if user_role == 'admin':
            resp = "Admins can download comprehensive CSV reports from the Reports page or the Students Dashboard."
        else:
            resp = "Report downloads are currently restricted to administrators."

    else:
        if user_role == 'admin':
            resp = "I can help you with Students Dashboard, Live Proctoring, AI Reports, and downloading data. Try asking 'How to manage students?'"
        else:
            resp = "I can explain your scores, help you update your profile, or guide you to your results. Try asking 'Explain my confidence score'."

    ist_now = get_ist_time()
    indian_time = format_ist_time(ist_now)

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO chatbot_messages (user_email, user_role, page_name, message, response, created_at_ist)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (user_email, user_role, page_name, message, resp, indian_time))
        conn.commit()
        return jsonify({"success": True, "response": resp})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/chatbot/history/<user_email>', methods=['GET'])
def chatbot_history(user_email):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM chatbot_messages WHERE user_email = %s ORDER BY created_at ASC", (user_email,))
        rows = cur.fetchall()
        columns = [d[0] for d in cur.description]
        return jsonify({"success": True, "history": [dict(zip(columns, row)) for row in rows]})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/notifications', methods=['GET'])
def get_all_notifications():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM notifications ORDER BY created_at DESC")
        rows = cur.fetchall()
        columns = [d[0] for d in cur.description]
        return jsonify({"success": True, "notifications": [dict(zip(columns, row)) for row in rows]})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/notifications/user/<string:email>', methods=['GET'])
def get_user_notifications(email):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM notifications WHERE user_email = %s ORDER BY created_at DESC", (email,))
        rows = cur.fetchall()
        columns = [d[0] for d in cur.description]
        return jsonify({"success": True, "notifications": [dict(zip(columns, row)) for row in rows]})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/notifications', methods=['POST'])
def create_notification():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        ist_now = get_ist_time().strftime('%d %b %Y, %I:%M %p')
        cur.execute("""
            INSERT INTO notifications (user_email, candidate_name, interview_id, title, message, type, event_type, status, created_at_ist)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (data['user_email'], data.get('candidate_name', 'N/A'), data.get('interview_id'),
              data['title'], data['message'], data.get('type', 'info'), data.get('event_type'),
              'New', ist_now))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/interview/status/<int:interview_id>', methods=['GET'])
def get_interview_status(interview_id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT status, termination_reason FROM interviews WHERE id = %s", (interview_id,))
        row = cur.fetchone()
        if row:
            return jsonify({"success": True, "status": row[0], "termination_reason": row[1]})
        return jsonify({"success": False, "message": "Interview not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()
