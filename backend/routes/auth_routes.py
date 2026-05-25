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
        if conn is None:
            return {
                "success": False,
                "message": "Database connection failed. Please check DATABASE_URL."
            }, 500
        cur = conn.cursor()

        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({"success": False, "message": "Email already exists"}), 400

        hashed_pw = generate_password_hash(password)
        cur.execute("INSERT INTO users (full_name, name, email, phone, password, password_hash, role, status) VALUES (%s, %s, %s, %s, %s, %s, 'user', 'active')",
                    (full_name, full_name, email, phone, password, hashed_pw))
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
        if conn is None:
            return {
                "success": False,
                "message": "Database connection failed. Please check DATABASE_URL."
            }, 500
        cur = conn.cursor()

        # Try plain-text authentication first (exact query requested)
        cur.execute("SELECT * FROM users WHERE email = %s AND password = %s", (email, password))
        user = cur.fetchone()

        # Fallback to hashed check for existing users
        if not user:
            cur.execute("SELECT * FROM users WHERE email = %s", (email,))
            user_hashed = cur.fetchone()
            if user_hashed:
                pw_hash = user_hashed.get('password_hash') or (user_hashed[4] if len(user_hashed) > 4 else None)
                if pw_hash and check_password_hash(pw_hash, password):
                    user = user_hashed

        cur.close()
        conn.close()

        if user:
            user_id = user.get('id') or user[0]
            user_name = user.get('name') or user.get('full_name') or (user[1] if len(user) > 1 else "User Name")
            user_email = user.get('email') or (user[2] if len(user) > 2 else email)
            user_phone = user.get('phone') or (user[3] if len(user) > 3 else "9876543210")
            user_role = user.get('role') or (user[4] if len(user) > 4 else "user")
            user_pic = user.get('profile_pic') or (user[5] if len(user) > 5 else None)

            return jsonify({
                "success": True,
                "user": {
                    "id": user_id,
                    "name": user_name,
                    "email": user_email,
                    "phone": user_phone,
                    "role": user_role,
                    "profile_pic": user_pic
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
        if conn is None:
            return {
                "success": False,
                "message": "Database connection failed. Please check DATABASE_URL."
            }, 500
        cur = conn.cursor()

        # Try plain-text authentication first (exact query requested)
        cur.execute("SELECT * FROM admins WHERE email = %s AND password = %s", (email, password))
        admin = cur.fetchone()

        # Fallback to hashed check for existing admins
        if not admin:
            cur.execute("SELECT * FROM admins WHERE email = %s", (email,))
            admin_hashed = cur.fetchone()
            if admin_hashed:
                pw_hash = admin_hashed.get('password_hash') or (admin_hashed[3] if len(admin_hashed) > 3 else None)
                if pw_hash and check_password_hash(pw_hash, password):
                    admin = admin_hashed

        cur.close()
        conn.close()

        if admin:
            admin_id = admin.get('id') or admin[0]
            admin_name = admin.get('name') or admin.get('full_name') or (admin[1] if len(admin) > 1 else "Admin")
            admin_email = admin.get('email') or (admin[2] if len(admin) > 2 else email)
            admin_role = admin.get('role') or (admin[4] if len(admin) > 4 else "admin")
            admin_pic = admin.get('profile_pic') or (admin[5] if len(admin) > 5 else None)

            return jsonify({
                "success": True,
                "user": {
                    "id": admin_id,
                    "name": admin_name,
                    "email": admin_email,
                    "role": admin_role,
                    "profile_pic": admin_pic
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
        if conn is None:
            return {
                "success": False,
                "message": "Database connection failed. Please check DATABASE_URL."
            }, 500
        cur = conn.cursor()

        if role == 'admin':
            # Try plain-text authentication first (exact query requested)
            cur.execute("SELECT * FROM admins WHERE email = %s AND password = %s", (email, password))
            admin = cur.fetchone()

            # Fallback to hashed check for existing admins
            if not admin:
                cur.execute("SELECT * FROM admins WHERE email = %s", (email,))
                admin_hashed = cur.fetchone()
                if admin_hashed:
                    pw_hash = admin_hashed.get('password_hash') or (admin_hashed[3] if len(admin_hashed) > 3 else None)
                    if pw_hash and check_password_hash(pw_hash, password):
                        admin = admin_hashed

            cur.close()
            conn.close()

            if admin:
                admin_id = admin.get('id') or admin[0]
                admin_name = admin.get('name') or admin.get('full_name') or (admin[1] if len(admin) > 1 else "Admin")
                admin_email = admin.get('email') or (admin[2] if len(admin) > 2 else email)
                admin_pic = admin.get('profile_pic') or (admin[5] if len(admin) > 5 else None)

                return jsonify({
                    "success": True,
                    "message": "Admin login successful",
                    "token": f"mock-jwt-token-admin-{admin_id}",
                    "user": {
                        "id": admin_id,
                        "name": admin_name,
                        "email": admin_email,
                        "role": "admin",
                        "profile_pic": admin_pic
                    }
                })
            return jsonify({"success": False, "message": "Invalid email or password"}), 401
        else:
            # Try plain-text authentication first (exact query requested)
            cur.execute("SELECT * FROM users WHERE email = %s AND password = %s", (email, password))
            user = cur.fetchone()

            # Fallback to hashed check for existing users
            if not user:
                cur.execute("SELECT * FROM users WHERE email = %s", (email,))
                user_hashed = cur.fetchone()
                if user_hashed:
                    pw_hash = user_hashed.get('password_hash') or (user_hashed[4] if len(user_hashed) > 4 else None)
                    if pw_hash and check_password_hash(pw_hash, password):
                        user = user_hashed

            cur.close()
            conn.close()

            if user:
                user_id = user.get('id') or user[0]
                user_name = user.get('name') or user.get('full_name') or (user[1] if len(user) > 1 else "User Name")
                user_email = user.get('email') or (user[2] if len(user) > 2 else email)
                user_phone = user.get('phone') or (user[3] if len(user) > 3 else "9876543210")
                user_pic = user.get('profile_pic') or (user[5] if len(user) > 5 else None)

                return jsonify({
                    "success": True,
                    "message": "User login successful",
                    "token": f"mock-jwt-token-user-{user_id}",
                    "user": {
                        "id": user_id,
                        "name": user_name,
                        "email": user_email,
                        "phone": user_phone,
                        "role": "user",
                        "profile_pic": user_pic
                    }
                })
            return jsonify({"success": False, "message": "Invalid email or password"}), 401
    except Exception as e:
        return jsonify({"success": False, "message": f"Login failed: {str(e)}"}), 500

@bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({"success": True, "message": "Logged out successfully"})
