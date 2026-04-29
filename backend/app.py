"""
AttendAI Backend — Python 3.12+ / 3.14 compatible
Uses only stdlib + lightweight pip packages.
No dlib build issues — uses opencv-contrib-python for face recognition.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import io
import json
import os
import secrets
import sqlite3
from datetime import date, datetime, timedelta
from functools import wraps
from pathlib import Path

import cv2
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image

# ── App setup ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, supports_credentials=True)
# ✅ ADD THIS BLOCK JUST BELOW CORS(app...)

@app.route("/")
def home():
    return """
    <h1>✅ AttendAI Backend Running</h1>
    <p>Server is working perfectly 🚀</p>
    
    <h3>Available APIs:</h3>
    <ul>
        <li>/api/admin/login</li>
        <li>/api/mark-attendance</li>
        <li>/api/register</li>
        <li>/api/students</li>
        <li>/api/attendance</li>
        <li>/api/stats</li>
    </ul>

    <h3>Default Admin Login:</h3>
    <p><b>Username:</b> admin</p>
    <p><b>Password:</b> admin123</p>
    """
BASE_DIR     = Path(__file__).parent
DATA_DIR     = BASE_DIR / "data"
SQLITE_DB    = DATA_DIR / "attendance.db"
ENCODINGS_DB = DATA_DIR / "encodings.json"
DATA_DIR.mkdir(exist_ok=True)

# ── Admin credentials (change these!) ─────────────────────────────────────────
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"          # hashed on first run
SECRET_KEY     = secrets.token_hex(32)

# Simple in-memory token store  {token: expiry_datetime}
active_tokens: dict[str, datetime] = {}

# ── DB helpers ────────────────────────────────────────────────────────────────
def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(SQLITE_DB)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS students (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id  TEXT UNIQUE NOT NULL,
                name        TEXT NOT NULL,
                department  TEXT,
                year        TEXT,
                created_at  TEXT DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS attendance (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id  TEXT NOT NULL,
                date        TEXT NOT NULL,
                time        TEXT NOT NULL,
                status      TEXT DEFAULT 'present',
                UNIQUE(student_id, date)
            );

            CREATE TABLE IF NOT EXISTS admins (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            );
        """)
        # seed default admin if not exists
        existing = conn.execute(
            "SELECT id FROM admins WHERE username=?", (ADMIN_USERNAME,)
        ).fetchone()
        if not existing:
            pw_hash = hashlib.sha256(ADMIN_PASSWORD.encode()).hexdigest()
            conn.execute(
                "INSERT INTO admins (username, password) VALUES (?,?)",
                (ADMIN_USERNAME, pw_hash),
            )


init_db()

# ── Face encoding helpers ─────────────────────────────────────────────────────
def load_encodings() -> dict[str, np.ndarray]:
    if ENCODINGS_DB.exists():
        data = json.loads(ENCODINGS_DB.read_text())
        return {k: np.array(v, dtype=np.float64) for k, v in data.items()}
    return {}


def save_encodings(encodings: dict[str, np.ndarray]) -> None:
    ENCODINGS_DB.write_text(
        json.dumps({k: v.tolist() for k, v in encodings.items()})
    )


def decode_image(b64_string: str) -> np.ndarray:
    if "," in b64_string:
        b64_string = b64_string.split(",")[1]
    img_bytes = base64.b64decode(b64_string)
    pil_img   = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def get_face_encoding(img_bgr: np.ndarray) -> tuple[list, np.ndarray | None]:
    """Return (face_locations, encoding | None) using OpenCV LBPHFaceRecognizer."""
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    detector = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    faces = detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))

    if len(faces) == 0:
        return [], None
    if len(faces) > 1:
        return list(faces), None   # flag multiple

    x, y, w, h = faces[0]
    face_roi    = cv2.resize(gray[y : y + h, x : x + w], (100, 100))
    # flatten to 1-D float vector as "encoding"
    encoding = face_roi.flatten().astype(np.float64)
    # L2-normalise
    norm = np.linalg.norm(encoding)
    if norm > 0:
        encoding /= norm
    return list(faces), encoding


def compare_encodings(
    known: list[np.ndarray], unknown: np.ndarray, threshold: float = 0.30
) -> tuple[int, float]:
    """Return (best_index, best_distance). Distance < threshold = match."""
    distances = [
        float(np.linalg.norm(k - unknown))
        for k in known
    ]
    best_idx  = int(np.argmin(distances))
    return best_idx, distances[best_idx]


# ── Auth helpers ──────────────────────────────────────────────────────────────
def generate_token() -> str:
    return secrets.token_urlsafe(48)


def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("X-Admin-Token", "")
        entry = active_tokens.get(token)
        if not entry or datetime.now() > entry:
            active_tokens.pop(token, None)
            return jsonify({"success": False, "message": "Unauthorized — admin login required"}), 401
        # refresh expiry
        active_tokens[token] = datetime.now() + timedelta(hours=8)
        return f(*args, **kwargs)
    return decorated


# ══════════════════════════════════════════════════════════════════════════════
#  AUTH ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data     = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    with get_db() as conn:
        row = conn.execute(
            "SELECT password FROM admins WHERE username=?", (username,)
        ).fetchone()

    if not row:
        return jsonify({"success": False, "message": "Invalid credentials"}), 401

    pw_hash = hashlib.sha256(password.encode()).hexdigest()
    if not hmac.compare_digest(row["password"], pw_hash):
        return jsonify({"success": False, "message": "Invalid credentials"}), 401

    token = generate_token()
    active_tokens[token] = datetime.now() + timedelta(hours=8)
    return jsonify({"success": True, "token": token, "username": username})


@app.route("/api/admin/logout", methods=["POST"])
def admin_logout():
    token = request.headers.get("X-Admin-Token", "")
    active_tokens.pop(token, None)
    return jsonify({"success": True})


@app.route("/api/admin/verify", methods=["GET"])
def admin_verify():
    token = request.headers.get("X-Admin-Token", "")
    entry = active_tokens.get(token)
    if entry and datetime.now() < entry:
        return jsonify({"success": True})
    return jsonify({"success": False}), 401


@app.route("/api/admin/change-password", methods=["POST"])
@require_admin
def change_password():
    data         = request.json or {}
    old_password = data.get("old_password", "")
    new_password = data.get("new_password", "")
    username     = data.get("username", ADMIN_USERNAME)

    with get_db() as conn:
        row = conn.execute(
            "SELECT password FROM admins WHERE username=?", (username,)
        ).fetchone()

    if not row:
        return jsonify({"success": False, "message": "User not found"}), 404

    if not hmac.compare_digest(row["password"], hashlib.sha256(old_password.encode()).hexdigest()):
        return jsonify({"success": False, "message": "Current password incorrect"}), 401

    new_hash = hashlib.sha256(new_password.encode()).hexdigest()
    with get_db() as conn:
        conn.execute("UPDATE admins SET password=? WHERE username=?", (new_hash, username))

    return jsonify({"success": True, "message": "Password changed successfully"})


# ══════════════════════════════════════════════════════════════════════════════
#  STUDENT ROUTES  (public — no auth needed)
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/mark-attendance", methods=["POST"])
def mark_attendance():
    data      = request.json or {}
    image_b64 = data.get("image")
    if not image_b64:
        return jsonify({"success": False, "message": "No image provided"}), 400

    encodings = load_encodings()
    if not encodings:
        return jsonify({"success": False, "message": "No students registered yet."}), 400

    img             = decode_image(image_b64)
    face_locs, enc  = get_face_encoding(img)

    if not face_locs:
        return jsonify({"success": False, "message": "No face detected. Ensure good lighting."}), 400
    if enc is None:
        return jsonify({"success": False, "message": "Multiple faces detected. Only one face allowed."}), 400

    known_ids   = list(encodings.keys())
    known_encs  = list(encodings.values())
    best_idx, dist = compare_encodings(known_encs, enc)
    THRESHOLD = 0.30

    if dist > THRESHOLD:
        return jsonify({
            "success": True,
            "results": [{"student_id": None, "name": "Unknown", "status": "unknown", "distance": round(dist, 4)}]
        })

    sid      = known_ids[best_idx]
    conf     = max(0, round((1 - dist) * 100, 2))
    today_   = date.today().isoformat()
    now_     = datetime.now().strftime("%H:%M:%S")

    with get_db() as conn:
        student = conn.execute(
            "SELECT name, department, year FROM students WHERE student_id=?", (sid,)
        ).fetchone()

    if not student:
        return jsonify({"success": False, "message": "Student record not found"}), 404

    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO attendance (student_id, date, time) VALUES (?,?,?)",
                (sid, today_, now_),
            )
        status = "marked"
    except sqlite3.IntegrityError:
        with get_db() as conn:
            existing = conn.execute(
                "SELECT time FROM attendance WHERE student_id=? AND date=?", (sid, today_)
            ).fetchone()
        now_ = existing["time"] if existing else now_
        status = "already_marked"

    return jsonify({
        "success": True,
        "results": [{
            "student_id":  sid,
            "name":        student["name"],
            "department":  student["department"],
            "year":        student["year"],
            "status":      status,
            "time":        now_,
            "confidence":  conf,
            "distance":    round(dist, 4),
        }],
    })


# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN ROUTES  (all require token)
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/register", methods=["POST"])
@require_admin
def register_student():
    data       = request.json or {}
    student_id = data.get("student_id", "").strip()
    name       = data.get("name", "").strip()
    department = data.get("department", "").strip()
    year       = data.get("year", "").strip()
    image_b64  = data.get("image")

    if not all([student_id, name, image_b64]):
        return jsonify({"success": False, "message": "Student ID, name and photo are required"}), 400

    img            = decode_image(image_b64)
    face_locs, enc = get_face_encoding(img)

    if not face_locs:
        return jsonify({"success": False, "message": "No face detected in the photo"}), 400
    if enc is None:
        return jsonify({"success": False, "message": "Multiple faces detected — use a single-face photo"}), 400

    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO students (student_id, name, department, year) VALUES (?,?,?,?)",
                (student_id, name, department, year),
            )
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "message": f"Student ID '{student_id}' already exists"}), 409

    encodings = load_encodings()
    encodings[student_id] = enc
    save_encodings(encodings)

    return jsonify({"success": True, "message": f"'{name}' registered successfully!"})


@app.route("/api/students", methods=["GET"])
@require_admin
def get_students():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM students ORDER BY created_at DESC"
        ).fetchall()
    return jsonify({"success": True, "students": [dict(r) for r in rows]})


@app.route("/api/students/<student_id>", methods=["DELETE"])
@require_admin
def delete_student(student_id: str):
    with get_db() as conn:
        conn.execute("DELETE FROM students WHERE student_id=?", (student_id,))
        conn.execute("DELETE FROM attendance WHERE student_id=?", (student_id,))
    encodings = load_encodings()
    encodings.pop(student_id, None)
    save_encodings(encodings)
    return jsonify({"success": True, "message": "Student deleted."})


@app.route("/api/attendance", methods=["GET"])
@require_admin
def get_attendance():
    filter_date  = request.args.get("date", date.today().isoformat())
    filter_dept  = request.args.get("department", "")
    filter_year  = request.args.get("year", "")

    base_query = """
        SELECT a.student_id, s.name, s.department, s.year, a.date, a.time, a.status
        FROM attendance a
        JOIN students s ON a.student_id = s.student_id
        WHERE a.date = ?
    """
    params: list = [filter_date]
    if filter_dept:
        base_query += " AND s.department = ?"
        params.append(filter_dept)
    if filter_year:
        base_query += " AND s.year = ?"
        params.append(filter_year)
    base_query += " ORDER BY a.time ASC"

    with get_db() as conn:
        rows = conn.execute(base_query, params).fetchall()
    return jsonify({"success": True, "date": filter_date, "records": [dict(r) for r in rows]})


@app.route("/api/attendance/range", methods=["GET"])
@require_admin
def get_attendance_range():
    """Return attendance for a date range (for reports)."""
    from_date = request.args.get("from", date.today().isoformat())
    to_date   = request.args.get("to",   date.today().isoformat())
    dept      = request.args.get("department", "")
    year      = request.args.get("year", "")

    query = """
        SELECT a.student_id, s.name, s.department, s.year, a.date, a.time, a.status
        FROM attendance a
        JOIN students s ON a.student_id = s.student_id
        WHERE a.date BETWEEN ? AND ?
    """
    params: list = [from_date, to_date]
    if dept:
        query += " AND s.department=?"
        params.append(dept)
    if year:
        query += " AND s.year=?"
        params.append(year)
    query += " ORDER BY a.date ASC, s.name ASC"

    with get_db() as conn:
        rows     = conn.execute(query, params).fetchall()
        students = conn.execute("SELECT * FROM students ORDER BY name").fetchall()

    return jsonify({
        "success":  True,
        "from":     from_date,
        "to":       to_date,
        "records":  [dict(r) for r in rows],
        "students": [dict(s) for s in students],
    })


@app.route("/api/stats", methods=["GET"])
@require_admin
def get_stats():
    today_ = date.today().isoformat()
    with get_db() as conn:
        total_students = conn.execute("SELECT COUNT(*) FROM students").fetchone()[0]
        today_present  = conn.execute(
            "SELECT COUNT(*) FROM attendance WHERE date=?", (today_,)
        ).fetchone()[0]
        total_records  = conn.execute("SELECT COUNT(*) FROM attendance").fetchone()[0]
        recent         = conn.execute("""
            SELECT a.student_id, s.name, s.department, a.time
            FROM attendance a JOIN students s ON a.student_id=s.student_id
            WHERE a.date=?
            ORDER BY a.time DESC LIMIT 8
        """, (today_,)).fetchall()
        dept_stats     = conn.execute("""
            SELECT s.department, COUNT(*) as cnt
            FROM attendance a JOIN students s ON a.student_id=s.student_id
            WHERE a.date=?
            GROUP BY s.department
        """, (today_,)).fetchall()

    return jsonify({
        "success": True,
        "stats": {
            "total_students": total_students,
            "today_present":  today_present,
            "today_absent":   total_students - today_present,
            "total_records":  total_records,
            "recent_entries": [dict(r) for r in recent],
            "dept_breakdown": [dict(r) for r in dept_stats],
        },
    })


@app.route("/api/departments", methods=["GET"])
@require_admin
def get_departments():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT DISTINCT department FROM students WHERE department != '' ORDER BY department"
        ).fetchall()
    return jsonify({"success": True, "departments": [r["department"] for r in rows]})


if __name__ == "__main__":
    print("\n" + "═" * 56)
    print("  AttendAI Backend  —  Python 3.12+ compatible")
    print("  Running at http://localhost:5000")
    print("  Admin login: admin / admin123")
    print("═" * 56 + "\n")
    app.run(debug=True, host="0.0.0.0", port=5000)
