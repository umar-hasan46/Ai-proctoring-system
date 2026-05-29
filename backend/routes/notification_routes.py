from flask import Blueprint, request, jsonify
from db import get_db_connection, get_ist_time
from datetime import datetime
import pytz

bp = Blueprint('notifications', __name__)

def format_ist_time(dt):
    return dt.strftime("%d %b %Y, %I:%M %p")

def ensure_ist(notif):
    if not notif.get('created_at_ist'):
        if notif.get('created_at'):
            ist = pytz.timezone('Asia/Kolkata')
            dt = notif['created_at']
            if dt.tzinfo is None:
                dt = pytz.utc.localize(dt)
            notif['created_at_ist'] = format_ist_time(dt.astimezone(ist))
        else:
            notif['created_at_ist'] = format_ist_time(get_ist_time())
    return notif

@bp.route('/', methods=['GET'])
def get_all_notifications():
    from flask import request
    user_id = request.headers.get("X-User-Id")
    role = request.headers.get("X-User-Role")
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    if role == 'admin':
        cur.execute("SELECT * FROM notifications WHERE target_role = 'admin' OR target_role = 'all' ORDER BY created_at DESC")
    else:
        # Get email for the user
        email = ""
        if user_id:
            cur.execute("SELECT email FROM users WHERE id = %s", (user_id,))
            user_row = cur.fetchone()
            if user_row:
                email = user_row[0]
        cur.execute("SELECT * FROM notifications WHERE user_email = %s OR target_role = 'all' ORDER BY created_at DESC", (email,))
        
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    notifications = [ensure_ist(dict(row)) for row in rows]
    
    if role == 'admin':
        cur.execute("SELECT COUNT(*) FROM notifications WHERE target_role = 'admin' AND status = 'unread'")
    else:
        email = ""
        if user_id:
            cur.execute("SELECT email FROM users WHERE id = %s", (user_id,))
            user_row = cur.fetchone()
            if user_row:
                email = user_row[0]
        cur.execute("SELECT COUNT(*) FROM notifications WHERE user_email = %s AND status = 'unread'", (email,))
        
    unread_count_row = cur.fetchone()
    unread_count = unread_count_row[0] if unread_count_row else 0
    
    cur.close()
    conn.close()
    return jsonify({"success": True, "notifications": notifications, "unread_count": unread_count})

@bp.route('/user/<email>', methods=['GET'])
def get_user_notifications(email):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM notifications WHERE user_email = %s OR target_role = 'all' ORDER BY created_at DESC", (email,))
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    notifications = [ensure_ist(dict(row)) for row in rows]
    
    cur.execute("SELECT COUNT(*) FROM notifications WHERE user_email = %s AND status = 'unread'", (email,))
    unread_count = cur.fetchone()[0]
    
    cur.close()
    conn.close()
    return jsonify({"success": True, "notifications": notifications, "unread_count": unread_count})

@bp.route('/admin', methods=['GET'])
def get_admin_notifications():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM notifications WHERE target_role = 'admin' OR target_role = 'all' ORDER BY created_at DESC")
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    notifications = [ensure_ist(dict(row)) for row in rows]

    cur.execute("SELECT COUNT(*) FROM notifications WHERE target_role = 'admin' AND status = 'unread'")
    unread_count = cur.fetchone()[0]

    cur.close()
    conn.close()
    return jsonify({"success": True, "notifications": notifications, "unread_count": unread_count})

@bp.route('/unread-count/<email>', methods=['GET'])
def get_unread_count(email):
    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database connection failed"}), 500
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) FROM notifications WHERE user_email = %s AND status = 'unread'", (email,))
        count = cur.fetchone()[0]
        return jsonify({"success": True, "unread_count": count or 0})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/admin-unread-count', methods=['GET'])
def get_admin_unread_count():
    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database connection failed"}), 500
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) FROM notifications WHERE target_role = 'admin' AND status = 'unread'")
        count = cur.fetchone()[0]
        return jsonify({"success": True, "unread_count": count or 0})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/', methods=['POST'])
def create_notification():
    data = request.json
    ist_now = get_ist_time()
    ist_str = format_ist_time(ist_now)
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO notifications (user_email, candidate_name, candidate_email, interview_id, title, message, type, event_type, status, target_role, created_at_ist, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (data.get('user_email'), data.get('candidate_name'), data.get('candidate_email'), data.get('interview_id'),
          data.get('title'), data.get('message'), data.get('type', 'info'), data.get('event_type'),
          'unread', data.get('target_role', 'user'), ist_str, ist_now))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"success": True, "message": "Notification created"})

@bp.route('/<int:id>/read', methods=['PUT'])
@bp.route('/mark-read/<int:id>', methods=['PUT'])
def mark_notification_read(id):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("UPDATE notifications SET status = 'read' WHERE id = %s", (id,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"success": True, "message": "Marked as read"})

@bp.route('/mark-all-read', methods=['PUT'])
def mark_all_read_api():
    data = request.json
    email = data.get('email')
    role = data.get('role')
    conn = get_db_connection()
    cur = conn.cursor()
    if role == 'admin':
        cur.execute("UPDATE notifications SET status = 'read' WHERE target_role = 'admin'")
    else:
        cur.execute("UPDATE notifications SET status = 'read' WHERE user_email = %s", (email,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"success": True, "message": "All marked as read"})

@bp.route('/<int:id>', methods=['DELETE'])
def delete_notification(id):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM notifications WHERE id = %s", (id,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"success": True, "message": "Notification deleted"})

@bp.route('/clear-read', methods=['DELETE'])
def clear_read_notifications():
    data = request.json
    email = data.get('email')
    role = data.get('role')
    conn = get_db_connection()
    cur = conn.cursor()
    if role == 'admin':
        cur.execute("DELETE FROM notifications WHERE target_role = 'admin' AND status = 'read'")
    else:
        cur.execute("DELETE FROM notifications WHERE user_email = %s AND status = 'read'", (email,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"success": True, "message": "Read notifications cleared"})
