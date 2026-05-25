import os
from flask import Blueprint, request, jsonify, current_app
from db import get_db_connection
from werkzeug.security import generate_password_hash
from werkzeug.utils import secure_filename

bp = Blueprint('settings', __name__)

@bp.route('/profile', methods=['GET'])
def get_profile():
    email = request.args.get('email')
    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, full_name, email, phone, role, profile_pic, created_at FROM users WHERE email = %s", (email,))
        user = cur.fetchone()

        if user:
            cur.execute("SELECT status, final_percentage FROM interviews WHERE user_email = %s ORDER BY created_at DESC LIMIT 1", (email,))
            intv = cur.fetchone()

            return jsonify({
                "success": True,
                "data": {
                    "id": user[0],
                    "name": user[1],
                    "email": user[2],
                    "phone": user[3],
                    "role": user[4] or "Candidate",
                    "profile_pic": user[5],
                    "created_at_ist": user[6].strftime("%d %b %Y, %I:%M %p") if user[6] else "N/A",
                    "latest_interview_status": intv[0] if intv else "N/A",
                    "latest_score": f"{intv[1]}%" if intv and intv[1] is not None else "N/A"
                }
            })

        cur.execute("SELECT id, full_name, email, phone, role, profile_pic, created_at FROM admins WHERE email = %s", (email,))
        admin = cur.fetchone()

        if admin:
            return jsonify({
                "success": True,
                "data": {
                    "id": admin[0],
                    "name": admin[1],
                    "email": admin[2],
                    "phone": admin[3] or "N/A",
                    "role": admin[4] or "Admin",
                    "profile_pic": admin[5],
                    "created_at_ist": admin[6].strftime("%d %b %Y, %I:%M %p") if admin[6] else "N/A"
                }
            })

        return jsonify({"success": True, "data": None, "message": "Profile information is not available yet"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/profile/update', methods=['PUT'])
def profile_update():
    data = request.json
    role = data.get('role', '').lower()
    if role == 'admin':
        return update_admin_settings()
    return update_user_settings()

@bp.route('/settings/upload-photo', methods=['POST'])
def upload_profile_pic():
    try:
        if 'image' not in request.files:
            return jsonify({"success": False, "message": "No image file provided"}), 400

        file = request.files['image']
        email = request.form.get('email')
        role = request.form.get('role', '').lower()

        if not email or not role:
            return jsonify({"success": False, "message": "Email and role are required"}), 400

        if file.filename == '':
            return jsonify({"success": False, "message": "No selected file"}), 400

        allowed_ext = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        if ext not in allowed_ext:
            return jsonify({"success": False, "message": "Invalid file type. Supported: png, jpg, jpeg, webp"}), 400

        import uuid
        filename = secure_filename(f"profile_{uuid.uuid4().hex}.{ext}")
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], 'profiles', filename)
        file.save(filepath)

        file_url = f"/uploads/profiles/{filename}"

        conn = get_db_connection()
        cur = conn.cursor()
        if role == 'admin':
            cur.execute("UPDATE admins SET profile_pic = %s WHERE email = %s", (file_url, email))
            cur.execute("SELECT id, name, email, phone, role, profile_pic FROM admins WHERE email = %s", (email,))
        else:
            cur.execute("UPDATE users SET profile_pic = %s WHERE email = %s", (file_url, email))
            cur.execute("SELECT id, name, email, phone, role, profile_pic FROM users WHERE email = %s", (email,))
        
        updated_user = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Profile picture updated successfully",
            "user": {
                "id": updated_user[0],
                "name": updated_user[1] or "N/A",
                "email": updated_user[2],
                "phone": updated_user[3] or "N/A",
                "role": updated_user[4] or role,
                "profile_pic": updated_user[5]
            }
        })
    except Exception as e:
        return jsonify({"success": False, "message": f"Could not update profile picture: {str(e)}"}), 500

@bp.route('/user/settings', methods=['PUT'])
def update_user_settings():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        if data.get('password'):
            hashed_pw = generate_password_hash(data['password'])
            cur.execute("UPDATE users SET full_name=%s, name=%s, email=%s, phone=%s, password_hash=%s WHERE email=%s",
                        (data['full_name'], data['full_name'], data['email'], data['phone'], hashed_pw, data['old_email']))
        else:
            cur.execute("UPDATE users SET full_name=%s, name=%s, email=%s, phone=%s WHERE email=%s",
                        (data['full_name'], data['full_name'], data['email'], data['phone'], data['old_email']))

        if data['email'] != data['old_email']:
            tables = ['interviews', 'violations', 'notifications', 'results', 'answers']
            for table in tables:
                cur.execute(f"UPDATE {table} SET user_email=%s WHERE user_email=%s", (data['email'], data['old_email']))

        cur.execute("SELECT id, name, email, phone, role, profile_pic FROM users WHERE email = %s", (data['email'],))
        updated_user = cur.fetchone()
        conn.commit()
        return jsonify({
            "success": True,
            "message": "Settings updated successfully",
            "user": {
                "id": updated_user[0],
                "name": updated_user[1] or "N/A",
                "email": updated_user[2],
                "phone": updated_user[3] or "N/A",
                "role": updated_user[4] or "user",
                "profile_pic": updated_user[5]
            }
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400
    finally:
        cur.close()
        conn.close()

@bp.route('/admin/settings', methods=['PUT'])
def update_admin_settings():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        if data.get('password'):
            hashed_pw = generate_password_hash(data['password'])
            cur.execute("UPDATE admins SET full_name=%s, name=%s, email=%s, phone=%s, password_hash=%s WHERE email=%s",
                        (data['full_name'], data['full_name'], data['email'], data['phone'], hashed_pw, data['old_email']))
        else:
            cur.execute("UPDATE admins SET full_name=%s, name=%s, email=%s, phone=%s WHERE email=%s",
                        (data['full_name'], data['full_name'], data['email'], data['phone'], data['old_email']))
        cur.execute("SELECT id, name, email, phone, role, profile_pic FROM admins WHERE email = %s", (data['email'],))
        updated_user = cur.fetchone()
        conn.commit()
        return jsonify({
            "success": True,
            "message": "Admin settings updated successfully",
            "user": {
                "id": updated_user[0],
                "name": updated_user[1] or "N/A",
                "email": updated_user[2],
                "phone": updated_user[3] or "N/A",
                "role": updated_user[4] or "admin",
                "profile_pic": updated_user[5]
            }
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400
    finally:
        cur.close()
        conn.close()
