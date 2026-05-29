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

@app.route('/api/users/<int:user_id>/status', methods=['PUT', 'OPTIONS'])
def api_update_user_status(user_id):
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200
    
    data = request.get_json() or {}
    status = (data.get('status') or '').strip()
    if not status:
        return jsonify({"success": False, "message": "Missing status"}), 400

    from db import get_db_connection, get_ist_time
    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database connection failed"}), 500
    cur = conn.cursor()
    try:
        cur.execute("SELECT COALESCE(admin_status, 'Pending Review'), COALESCE(name, full_name, email) FROM users WHERE id = %s", (user_id,))
        user_row = cur.fetchone()
        previous_status = user_row[0] if user_row else 'Pending Review'
        candidate_name = user_row[1] if user_row else 'Candidate'

        cur.execute("UPDATE users SET admin_status = %s, admin_hiring_status = %s WHERE id = %s RETURNING email", (status, status, user_id))
        row = cur.fetchone()
        if not row:
            return jsonify({"success": False, "message": "User not found"}), 404
        user_email = row[0]

        cur.execute("SELECT id FROM interviews WHERE user_email = %s ORDER BY created_at DESC LIMIT 1", (user_email,))
        intv_row = cur.fetchone()
        intv_id = intv_row[0] if intv_row else None

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
            "Not Shortlisted": ("Application Status Update", "Thank you for your interview. You have not been shortlisted at this time.", "warning"),
            "Rejected": ("Application Status Update", "Thank you for your interest. You have not been selected for this position.", "warning")
        }
        title, msg, ntype = msgs.get(status, ("Status Updated", status, "info"))
        ist_now = get_ist_time()
        ist_now_str = ist_now.strftime('%d %b %Y, %I:%M %p')
        
        # User notification
        cur.execute("""
            INSERT INTO notifications (user_email, interview_id, title, message, type, event_type, status, target_role, created_at_ist, created_at)
            VALUES (%s, %s, %s, %s, %s, 'Status Update', 'unread', 'user', %s, %s)
        """, (user_email, intv_id, title, msg, ntype, ist_now_str, ist_now))

        # Admin notification
        admin_msgs = {
            "Shortlisted": f"You shortlisted {candidate_name}.",
            "Hiring in Process": f"You moved {candidate_name} to hiring process.",
            "Not Shortlisted": f"You marked {candidate_name} as not shortlisted.",
            "Rejected": f"You marked {candidate_name} as rejected."
        }
        admin_message = admin_msgs.get(status, f"You updated {candidate_name}'s status to {status}.")
        cur.execute("""
            INSERT INTO notifications (user_email, interview_id, title, message, type, event_type, status, target_role, created_at_ist, created_at)
            VALUES (%s, %s, %s, %s, %s, 'Status Update', 'unread', 'admin', %s, %s)
        """, ('admin', intv_id, "Admin Action", admin_message, ntype, ist_now_str, ist_now))

        # Status History
        cur.execute("""
            INSERT INTO candidate_status_history (candidate_id, previous_status, new_status, changed_by, action_note)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, previous_status, status, 'admin', f"Status updated to {status} by admin"))

        conn.commit()
        return jsonify({"success": True, "message": "Status updated successfully", "status": status})
    except Exception as e:
        conn.rollback()
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
