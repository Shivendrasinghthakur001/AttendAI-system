import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function AdminLogin() {
  const { login, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  // Already logged in
  if (isAdmin) { navigate('/admin/dashboard'); return null; }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) { toast.error('Enter username and password'); return; }
    setLoading(true);
    try {
      await login(form.username, form.password);
      toast.success('Welcome back, Admin!');
      navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="hex">◈</div>
          <div>
            <div className="login-title">AttendAI</div>
            <div className="login-sub">Face Recognition System</div>
          </div>
        </div>

        <div className="login-heading">Admin Login</div>
        <div className="login-desc">
          Enter your admin credentials to access the dashboard, manage students, view attendance records and print reports.
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              type="text"
              placeholder="admin"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              autoComplete="username"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                autoComplete="current-password"
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}>
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} disabled={loading}>
            {loading ? <><span className="spinner" /> Logging in...</> : '⬡ &nbsp;Login as Admin'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', padding: '0.9rem', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--mono)', marginBottom: '0.3rem' }}>// default credentials</div>
          <div style={{ fontSize: '0.78rem', display: 'flex', gap: '1.5rem' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Username: </span><span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>admin</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Password: </span><span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>admin123</span></div>
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Change in Settings after first login.</div>
        </div>

        <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
            ← Back to Student Attendance
          </button>
        </div>
      </div>
    </div>
  );
}
