import os
from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from config import Config
from db import init_db, get_db_connection
import routes.auth_routes as auth
import routes.admin_routes as admin
import routes.interview_routes as interview
import routes.violation_routes as violation
import routes.notification_routes as notification
import routes.analysis_routes as analysis
import routes.settings_routes as settings
import routes.dashboard_routes as dashboard
import routes.ai_features_routes as ai_features

app = Flask(__name__)
app.config.from_object(Config)

@app.before_request
def handle_options():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'resumes'), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'profiles'), exist_ok=True)

CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:5173",
            "https://ai-proctoring-frontend-rvo7.onrender.com"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": [
            "Content-Type",
            "Authorization",
            "X-User-Id",
            "X-User-Role",
            "x-user-id",
            "x-user-role"
        ],
        "supports_credentials": True
    }
})

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

app.register_blueprint(auth.bp, url_prefix='/api/auth')
app.register_blueprint(admin.bp, url_prefix='/api/admin')
app.register_blueprint(interview.bp, url_prefix='/api')
app.register_blueprint(violation.bp, url_prefix='/api/violations')
app.register_blueprint(notification.bp, url_prefix='/api/notifications')
app.register_blueprint(analysis.bp, url_prefix='/api/analysis')
app.register_blueprint(settings.bp, url_prefix='/api')
app.register_blueprint(dashboard.bp, url_prefix='/api/dashboard')
app.register_blueprint(ai_features.bp, url_prefix='/api')

@app.route("/", methods=["GET"])
def home():
    return {
        "success": True,
        "message": "AI Proctoring backend running successfully"
    }, 200

@app.route("/health", methods=["GET"])
def health_root():
    return {
        "success": True,
        "status": "healthy",
        "message": "Backend health check passed"
    }, 200

@app.route("/health/db", methods=["GET"])
def db_health():
    try:
        conn = get_db_connection()
        if conn is None:
            return {
                "success": False,
                "message": "Database connection failed"
            }, 500

        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        conn.close()

        return {
            "success": True,
            "message": "Database connected successfully"
        }, 200
    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }, 500

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"success": True, "message": "Backend running"})

@app.route('/api/users/<user_id>/status', methods=['PUT', 'OPTIONS'])
def api_update_user_status(user_id):
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200
    
    data = request.get_json() or {}
    status = (data.get('status') or '').strip()
    interview_id = data.get('interview_id')
    email = data.get('email')
    
    if not status:
        return jsonify({"success": False, "message": "Missing status"}), 400

    from db import get_db_connection, get_ist_time
    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database connection failed"}), 500
    cur = conn.cursor()
    try:
        user_row = None
        resolved_user_id = None
        user_email = email
        candidate_name = 'Candidate'
        
        # 1. Try to find user by integer ID
        if user_id:
            try:
                int_user_id = int(float(user_id))
                cur.execute("SELECT id, email, name FROM users WHERE id = %s", (int_user_id,))
                user_row = cur.fetchone()
                if user_row:
                    resolved_user_id = user_row[0]
                    user_email = user_row[1]
                    candidate_name = user_row[2] or 'Candidate'
            except ValueError:
                pass

        # 2. Try to find user by email if not found by ID
        if not user_row and user_id and '@' in str(user_id):
            cur.execute("SELECT id, email, name FROM users WHERE email = %s", (str(user_id),))
            user_row = cur.fetchone()
            if user_row:
                resolved_user_id = user_row[0]
                user_email = user_row[1]
                candidate_name = user_row[2] or 'Candidate'
                
        if not user_row and email:
            cur.execute("SELECT id, email, name FROM users WHERE email = %s", (str(email),))
            user_row = cur.fetchone()
            if user_row:
                resolved_user_id = user_row[0]
                user_email = user_row[1]
                candidate_name = user_row[2] or 'Candidate'

        # 3. If interview_id is provided, try to find the interview
        resolved_intv_id = None
        intv_email = None
        intv_user_id = None
        
        if interview_id:
            try:
                int_intv_id = int(float(interview_id))
                cur.execute("SELECT id, user_email, user_id FROM interviews WHERE id = %s", (int_intv_id,))
                intv_row = cur.fetchone()
                if intv_row:
                    resolved_intv_id = intv_row[0]
                    intv_email = intv_row[1]
                    intv_user_id = intv_row[2]
            except ValueError:
                pass
                
        # 4. If interview_id not resolved, lookup by user_email
        if not resolved_intv_id and user_email:
            cur.execute("SELECT id, user_email, user_id FROM interviews WHERE user_email = %s ORDER BY created_at DESC LIMIT 1", (user_email,))
            intv_row = cur.fetchone()
            if intv_row:
                resolved_intv_id = intv_row[0]
                intv_email = intv_row[1]
                intv_user_id = intv_row[2]
                
        # 5. Fallbacks
        if not user_email and intv_email:
            user_email = intv_email
        if not resolved_user_id and intv_user_id:
            resolved_user_id = intv_user_id

        # 6. Perform Updates
        updated_something = False
        previous_status = 'Pending Review'
        
        if resolved_user_id:
            cur.execute("SELECT COALESCE(admin_status, 'Pending Review') FROM users WHERE id = %s", (resolved_user_id,))
            prev_row = cur.fetchone()
            if prev_row:
                previous_status = prev_row[0]
            cur.execute("UPDATE users SET admin_status = %s, admin_hiring_status = %s WHERE id = %s", (status, status, resolved_user_id))
            updated_something = True
            
        if user_email and not resolved_user_id:
            cur.execute("SELECT COALESCE(admin_status, 'Pending Review'), id FROM users WHERE email = %s", (user_email,))
            prev_row = cur.fetchone()
            if prev_row:
                previous_status = prev_row[0]
                resolved_user_id = prev_row[1]
            cur.execute("UPDATE users SET admin_status = %s, admin_hiring_status = %s WHERE email = %s", (status, status, user_email))
            updated_something = True

        if resolved_intv_id:
            cur.execute("UPDATE interviews SET admin_status = %s, admin_hiring_status = %s, admin_final_status = %s WHERE id = %s", (status, status, status, resolved_intv_id))
            updated_something = True
            try:
                cur.execute("UPDATE results SET final_status = %s WHERE interview_id = %s", (status, resolved_intv_id))
            except Exception:
                pass
            try:
                cur.execute("UPDATE interview_results SET admin_final_status = %s WHERE interview_id = %s", (status, resolved_intv_id))
            except Exception:
                pass

        if not updated_something:
            return jsonify({"success": False, "message": "Neither user nor interview record could be located in database"}), 404

        # 7. Notifications
        msgs = {
            "Shortlisted": ("Congratulations! You are Shortlisted", "You have been shortlisted for the next round.", "success"),
            "Hiring in Process": ("Your Application is in Process", "Your interview is under review. You are in the hiring process.", "info"),
            "Not Shortlisted": ("Application Status Update", "Thank you for your interview. You have not been shortlisted at this time.", "warning"),
            "Rejected": ("Application Status Update", "Thank you for your interest. You have not been selected for this position.", "warning")
        }
        title, msg, ntype = msgs.get(status, ("Status Updated", status, "info"))
        ist_now = get_ist_time()
        ist_now_str = ist_now.strftime('%d %b %Y, %I:%M %p')
        
        # User notification
        if user_email:
            try:
                cur.execute("""
                    INSERT INTO notifications (user_email, interview_id, title, message, type, event_type, status, target_role, created_at_ist, created_at)
                    VALUES (%s, %s, %s, %s, %s, 'Status Update', 'unread', 'user', %s, %s)
                """, (user_email, resolved_intv_id, title, msg, ntype, ist_now_str, ist_now))
            except Exception as n_err:
                print("Failed user notification insert:", n_err)

        # Admin notification
        admin_msgs = {
            "Shortlisted": f"You shortlisted {candidate_name}.",
            "Hiring in Process": f"You moved {candidate_name} to hiring process.",
            "Not Shortlisted": f"You marked {candidate_name} as not shortlisted.",
            "Rejected": f"You marked {candidate_name} as rejected."
        }
        admin_message = admin_msgs.get(status, f"You updated {candidate_name}'s status to {status}.")
        try:
            cur.execute("""
                INSERT INTO notifications (user_email, interview_id, title, message, type, event_type, status, target_role, created_at_ist, created_at)
                VALUES (%s, %s, %s, %s, %s, 'Status Update', 'unread', 'admin', %s, %s)
            """, ('admin', resolved_intv_id, "Admin Action", admin_message, ntype, ist_now_str, ist_now))
        except Exception as n_err:
            print("Failed admin notification insert:", n_err)

        # Status History Log (all 11 fields)
        try:
            cur.execute("""
                INSERT INTO candidate_status_history 
                (interview_id, candidate_id, user_id, candidate_email, previous_status, new_status, changed_by_admin_id, changed_by_admin_name, changed_at, action_source, note)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                resolved_intv_id, resolved_user_id, resolved_user_id, user_email, 
                previous_status, status, 1, 'admin', ist_now, 'admin_recent_evaluations', f"Status updated to {status} by admin"
            ))
        except Exception as h_err:
            print("Failed status history insert:", h_err)

        conn.commit()
        return jsonify({
            "success": True, 
            "message": "Status updated successfully", 
            "status": status,
            "data": {
                "interviewId": resolved_intv_id,
                "candidateId": resolved_user_id,
                "candidateName": candidate_name,
                "email": user_email,
                "status": status,
                "updatedAt": ist_now_str
            }
        })
    except Exception as e:
        conn.rollback()
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/api/signup', methods=['POST'])
def api_signup():
    return auth.signup()

@app.route('/api/login', methods=['POST'])
def api_login():
    return auth.unified_login()

@app.route('/api/logout', methods=['POST'])
def api_logout():
    return auth.logout()


@app.route('/api/proctoring/warning', methods=['POST'])
def proctoring_warning():
    from db import get_db_connection, get_ist_time
    data = request.json or {}
    message = data.get('message')
    interview_id = data.get('interviewId')
    user_email = request.headers.get('X-User-Email', '')
    
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        ist_now = get_ist_time()
        cur.execute("""
            INSERT INTO violations (interview_id, user_email, violation_type, message, severity, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (interview_id, user_email, 'Proctoring Alert', message, 'high', ist_now))
        conn.commit()
        return jsonify({"success": True, "message": "Warning saved"})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "message": "Resource not found (404)"}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"success": False, "message": "Method not allowed (405)"}), 405

@app.errorhandler(500)
def server_error(e):
    return jsonify({"success": False, "message": "Internal server error (500)"}), 500

# Auto-initialize database on application startup
try:
    with app.app_context():
        init_db()
except Exception as db_err:
    print("Database auto-initialization skipped or encountered error:", db_err)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, port=port, host='0.0.0.0')
