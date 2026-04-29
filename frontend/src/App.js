import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';

// Pages
import StudentAttendance from './pages/StudentAttendance';
import AdminLogin        from './pages/AdminLogin';
import Dashboard         from './pages/Dashboard';
import RegisterStudent   from './pages/RegisterStudent';
import AttendanceLog     from './pages/AttendanceLog';
import ReportPrint       from './pages/ReportPrint';
import Settings          from './pages/Settings';

import './App.css';

// ── Clock component ───────────────────────────────────────────────────────────
function Clock() {
  const [t, setT] = useState('');
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="clock">{t}</span>;
}

// ── Admin sidebar ─────────────────────────────────────────────────────────────
function AdminSidebar() {
  const { logout } = useAuth();
  const navigate   = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const navLinks = [
    { label: 'Dashboard',        icon: '⬡', to: '/admin/dashboard' },
    { label: 'Register Student', icon: '⊕', to: '/admin/register'  },
    { label: 'Attendance Log',   icon: '≡', to: '/admin/log'       },
    { label: 'Print Report',     icon: '⎙', to: '/admin/report'    },
    { label: 'Settings',         icon: '⚙', to: '/admin/settings'  },
  ];

  return (
    <aside className="sidebar no-print">
      <div className="sidebar-logo">
        <div className="logo-hex">◈</div>
        <div>
          <div className="logo-name">AttendAI</div>
          <div className="logo-sub">Admin Panel</div>
        </div>
      </div>

      <div className="role-badge admin">⬡ &nbsp;Administrator</div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Management</div>
        {navLinks.map(l => (
          <NavLink key={l.to} to={l.to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}

        <div className="nav-section-label" style={{ marginTop: 'auto' }}>Account</div>
        <button className="nav-item danger" onClick={handleLogout}>
          <span className="nav-icon">⏻</span> Logout
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="status-row">
          <span className="live-dot" />
          Backend: localhost:5000
        </div>
      </div>
    </aside>
  );
}

// ── Student sidebar ───────────────────────────────────────────────────────────
function StudentSidebar() {
  const navigate = useNavigate();
  return (
    <aside className="sidebar no-print">
      <div className="sidebar-logo">
        <div className="logo-hex">◈</div>
        <div>
          <div className="logo-name">AttendAI</div>
          <div className="logo-sub">Attendance Portal</div>
        </div>
      </div>

      <div className="role-badge student">◎ &nbsp;Student Portal</div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Attendance</div>
        <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">◎</span> Mark Attendance
        </NavLink>

        <div className="nav-section-label" style={{ marginTop: '0.5rem' }}>Admin</div>
        <button className="nav-item" onClick={() => navigate('/admin/login')}>
          <span className="nav-icon">⬡</span> Admin Login
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="status-row"><span className="live-dot" /> Student Mode</div>
      </div>
    </aside>
  );
}

// ── Admin layout wrapper ──────────────────────────────────────────────────────
function AdminLayout({ children, title, sub }) {
  const { isAdmin, checking } = useAuth();
  if (checking) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)', gap: '0.75rem' }}><span className="spinner" /> Checking auth...</div>;
  if (!isAdmin)  return <Navigate to="/admin/login" replace />;

  return (
    <div className="app-layout">
      <AdminSidebar />
      <div className="app-main">
        <div className="topbar no-print">
          <div className="topbar-left">
            <div className="page-title">{title}</div>
            {sub && <div className="page-sub">{sub}</div>}
          </div>
          <div className="topbar-right"><Clock /></div>
        </div>
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}

// ── Student layout wrapper ────────────────────────────────────────────────────
function StudentLayout({ children, title, sub }) {
  return (
    <div className="app-layout">
      <StudentSidebar />
      <div className="app-main">
        <div className="topbar no-print">
          <div className="topbar-left">
            <div className="page-title">{title}</div>
            {sub && <div className="page-sub">{sub}</div>}
          </div>
          <div className="topbar-right"><Clock /></div>
        </div>
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', fontFamily: 'var(--font)', fontSize: '0.82rem' }
      }} />
      <Routes>
        {/* ── Public: Student attendance ── */}
        <Route path="/" element={
          <StudentLayout title="Mark Attendance" sub="Scan your face to mark today's attendance">
            <StudentAttendance />
          </StudentLayout>
        } />

        {/* ── Admin login ── */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* ── Admin protected routes ── */}
        <Route path="/admin/dashboard" element={
          <AdminLayout title="Dashboard" sub="Real-time attendance overview">
            <Dashboard />
          </AdminLayout>
        } />
        <Route path="/admin/register" element={
          <AdminLayout title="Register Student" sub="Enroll a new student with face biometric">
            <RegisterStudent />
          </AdminLayout>
        } />
        <Route path="/admin/log" element={
          <AdminLayout title="Attendance Log" sub="View and manage attendance records">
            <AttendanceLog />
          </AdminLayout>
        } />
        <Route path="/admin/report" element={
          <AdminLayout title="Print Attendance Report" sub="Generate and print official attendance reports">
            <ReportPrint />
          </AdminLayout>
        } />
        <Route path="/admin/settings" element={
          <AdminLayout title="Settings" sub="Manage admin account and system configuration">
            <Settings />
          </AdminLayout>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
