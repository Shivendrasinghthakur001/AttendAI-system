# 🎓 AttendAI v2.0 — Face Recognition Attendance System

> **Python 3.12 / 3.14 compatible** · No dlib · No cmake · No C++ compiler

---

## 🆕 What's New in v2.0

| Feature | v1 | v2 |
|---|---|---|
| Python version | 3.9–3.11 (dlib issues) | ✅ 3.12–3.14 |
| Face engine | dlib (requires cmake) | ✅ OpenCV (pip install only) |
| Admin auth | ❌ None | ✅ Token-based login |
| Student portal | Mixed with admin | ✅ Separate public page |
| Admin panel | Open to everyone | ✅ Password protected |
| Print report | ❌ | ✅ Full PDF/print report |
| Date range reports | ❌ | ✅ From–To range |
| Attendance % per student | ❌ | ✅ With progress bar |
| Dept/Year filters | ❌ | ✅ In log + reports |

---

## 📁 Project Structure

```
attendai-v2/
├── backend/
│   ├── app.py              ← Flask API (Python 3.12+)
│   ├── requirements.txt    ← pip packages
│   └── data/               ← auto-created
│       ├── attendance.db   ← SQLite database
│       └── encodings.json  ← face encoding vectors
│
├── frontend/
│   ├── package.json
│   ├── public/index.html
│   └── src/
│       ├── App.js / App.css
│       ├── index.js / index.css
│       ├── context/
│       │   └── AuthContext.js      ← admin auth state
│       └── pages/
│           ├── StudentAttendance.js ← PUBLIC: mark attendance
│           ├── AdminLogin.js        ← admin login page
│           ├── Dashboard.js         ← admin dashboard
│           ├── RegisterStudent.js   ← admin: register students
│           ├── AttendanceLog.js     ← admin: view/manage records
│           ├── ReportPrint.js       ← admin: print PDF reports
│           └── Settings.js          ← admin: change password
│
├── setup_windows.bat
├── setup_linux_mac.sh
└── README.md
```

---

## ⚙️ Prerequisites

| Tool     | Version | Where |
|----------|---------|-------|
| Python   | **3.12 or 3.14** | https://python.org |
| Node.js  | 18+     | https://nodejs.org |

> ✅ **No CMake, no Visual C++, no dlib** — just pip!

---

## 🚀 Quick Start

### Step 1 — Setup (run once)

**Windows:**
```
setup_windows.bat
```

**Linux / macOS:**
```bash
chmod +x setup_linux_mac.sh && ./setup_linux_mac.sh
```

### Step 2 — Start Backend (Terminal 1)
```bash
cd backend
# Windows:   venv\Scripts\activate
# Linux/Mac: source venv/bin/activate
python app.py
```
→ `http://localhost:5000`

### Step 3 — Start Frontend (Terminal 2)
```bash
cd frontend
npm start
```
→ `http://localhost:3000`

---

## 🔐 Access Control

| URL | Who | What |
|-----|-----|------|
| `http://localhost:3000/` | **Students** | Mark attendance via webcam — no login |
| `http://localhost:3000/admin/login` | **Admin** | Login with username/password |
| `/admin/dashboard` | Admin only | Stats, charts, overview |
| `/admin/register` | Admin only | Add new students with face enrollment |
| `/admin/log` | Admin only | View/filter/manage attendance records |
| `/admin/report` | Admin only | Generate & print attendance reports |
| `/admin/settings` | Admin only | Change password |

**Default credentials:** `admin` / `admin123`
Change in Settings after first login.

---

## ⎙ Print Report Guide

1. Go to **Admin → Print Report**
2. Set **From** and **To** dates
3. Optionally filter by Department or Year
4. Click **Generate**
5. Review the report:
   - Summary (total students, records, working days, avg %)
   - Student-wise table with attendance % and Regular/Short status
   - Day-wise detail for each date
6. Click **Print Report / Save as PDF**
7. In the print dialog → select **Save as PDF** for a PDF file

---

## 🧠 How Face Recognition Works

1. **Registration (Admin):** Webcam captures face → OpenCV Haar Cascade detects face → resizes to 100×100 → flattens to 10,000-dim vector → L2-normalised → saved to `encodings.json`

2. **Recognition (Student):** New face captured → same pipeline → Euclidean distance vs all known encodings → if distance < 0.30 threshold → matched → attendance inserted in SQLite

---

## 🔌 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin/login` | — | Admin login |
| GET  | `/api/admin/verify` | Token | Verify session |
| POST | `/api/admin/logout` | Token | Logout |
| POST | `/api/admin/change-password` | Token | Change password |
| POST | `/api/mark-attendance` | — | Mark attendance (public) |
| POST | `/api/register` | Token | Register student |
| GET  | `/api/students` | Token | List students |
| DELETE | `/api/students/<id>` | Token | Delete student |
| GET  | `/api/attendance` | Token | Get records by date |
| GET  | `/api/attendance/range` | Token | Get records by range |
| GET  | `/api/stats` | Token | Dashboard stats |
| GET  | `/api/departments` | Token | List departments |

---

## 🛠 Troubleshooting

| Problem | Fix |
|---------|-----|
| `opencv-contrib-python` install fails | Try `pip install opencv-python` instead |
| Camera not opening | Allow browser camera permission |
| Face not detected | Improve lighting; face 30–60cm from camera |
| Login says 401 | Backend not running or token expired |
| `CORS error` | Flask must run on port 5000 |

---

*AttendAI v2.0 — Final Year Project · Python 3.12+ · No dlib required*
