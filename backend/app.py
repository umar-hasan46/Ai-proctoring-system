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

allowed_origins = [
    "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176",
    "http://localhost:5177", "http://localhost:5178", "http://localhost:5179",
    "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175", "http://127.0.0.1:5176",
    "http://127.0.0.1:5177", "http://127.0.0.1:5178", "http://127.0.0.1:5179",
    "https://ai-proctoring-frontend-rvo7.onrender.com"
]
frontend_render_url = os.getenv("FRONTEND_URL")
if frontend_render_url:
    allowed_origins.append(frontend_render_url)
    allowed_origins.append(frontend_render_url.rstrip('/'))

CORS(app, resources={r"/*": {
    "origins": allowed_origins,
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}}, supports_credentials=True)

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
        cur.execute("""
            INSERT INTO notifications (user_email, interview_id, title, message, type, event_type, status, target_role, created_at_ist, created_at)
            VALUES (%s, %s, %s, %s, %s, 'Status Update', 'unread', 'user', %s, %s)
        """, (user_email, intv_id, title, msg, ntype, ist_now_str, ist_now))

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
