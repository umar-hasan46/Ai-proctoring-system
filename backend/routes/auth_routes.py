from flask import Blueprint, request, jsonify
from db import get_db_connection
from werkzeug.security import generate_password_hash, check_password_hash

bp = Blueprint('auth', __name__)

@bp.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()
        full_name = data.get('full_name', '').strip()
        phone = data.get('phone', '').strip()

        if not email or not password:
            return jsonify({"success": False, "message": "Email and password are required"}), 400

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({"success": False, "message": "Email already exists"}), 400

        hashed_pw = generate_password_hash(password)
        cur.execute("INSERT INTO users (full_name, name, email, phone, password_hash, role, status) VALUES (%s, %s, %s, %s, %s, 'user', 'active')",
                    (full_name, full_name, email, phone, hashed_pw))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True, "message": "User registered successfully"})
    except Exception as e:
        return jsonify({"success": False, "message": f"Signup failed: {str(e)}"}), 500

@bp.route('/user/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()

        if not email or not password:
            return jsonify({"success": False, "message": "Email and password are required"}), 400

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, full_name, email, phone, role, profile_pic, password_hash FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        cur.close()
        conn.close()

        if user and check_password_hash(user[6], password):
            return jsonify({
                "success": True,
                "user": {
                    "id": user[0],
                    "name": user[1] or "User Name",
                    "email": user[2],
                    "phone": user[3] or "9876543210",
                    "role": user[4] or "user",
                    "profile_pic": user[5]
                }
            })
        return jsonify({"success": False, "message": "Invalid email or password"}), 401
    except Exception as e:
        return jsonify({"success": False, "message": f"Login failed: {str(e)}"}), 500

@bp.route('/admin/login', methods=['POST'])
def admin_login():
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()

        if not email or not password:
            return jsonify({"success": False, "message": "Email and password are required"}), 400

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, full_name, email, phone, role, profile_pic, password_hash FROM admins WHERE email = %s", (email,))
        admin = cur.fetchone()
        cur.close()
        conn.close()

        if admin and check_password_hash(admin[6], password):
            return jsonify({
                "success": True,
                "user": {
                    "id": admin[0],
                    "name": admin[1] or "Admin",
                    "email": admin[2],
                    "role": admin[4] or "admin",
                    "profile_pic": admin[5]
                }
            })
        return jsonify({"success": False, "message": "Invalid email or password"}), 401
    except Exception as e:
        return jsonify({"success": False, "message": f"Admin login failed: {str(e)}"}), 500

@bp.route('/login', methods=['POST'])
def unified_login():
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()
        role = data.get('role', 'user').strip().lower()

        if not email or not password:
            return jsonify({"success": False, "message": "Email and password are required"}), 400

        conn = get_db_connection()
        cur = conn.cursor()

        if role == 'admin':
            cur.execute("SELECT id, full_name, email, phone, role, profile_pic, password_hash FROM admins WHERE email = %s", (email,))
            admin = cur.fetchone()
            cur.close()
            conn.close()

            if admin and check_password_hash(admin[6], password):
                return jsonify({
                    "success": True,
                    "message": "Admin login successful",
                    "token": f"mock-jwt-token-admin-{admin[0]}",
                    "user": {
                        "id": admin[0],
                        "name": admin[1] or "Admin",
                        "email": admin[2],
                        "role": "admin",
                        "profile_pic": admin[5]
                    }
                })
            return jsonify({"success": False, "message": "Invalid email or password"}), 401
        else:
            cur.execute("SELECT id, full_name, email, phone, role, profile_pic, password_hash FROM users WHERE email = %s", (email,))
            user = cur.fetchone()
            cur.close()
            conn.close()

            if user and check_password_hash(user[6], password):
                return jsonify({
                    "success": True,
                    "message": "User login successful",
                    "token": f"mock-jwt-token-user-{user[0]}",
                    "user": {
                        "id": user[0],
                        "name": user[1] or "User Name",
                        "email": user[2],
                        "phone": user[3] or "9876543210",
                        "role": "user",
                        "profile_pic": user[5]
                    }
                })
            return jsonify({"success": False, "message": "Invalid email or password"}), 401
    except Exception as e:
        return jsonify({"success": False, "message": f"Login failed: {str(e)}"}), 500

@bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({"success": True, "message": "Logged out successfully"})
