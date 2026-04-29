import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000/api';

export default function Settings() {
  const { logout } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]   = useState({ old_password: '', new_password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [show, setShow]   = useState({ old: false, new: false, con: false });

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const changePassword = async (e) => {
    e.preventDefault();
    if (!form.old_password || !form.new_password) { toast.error('Fill all fields'); return; }
    if (form.new_password !== form.confirm) { toast.error('New passwords do not match'); return; }
    if (form.new_password.length < 6) { toast.error('Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      await axios.post(`${API}/admin/change-password`, {
        username:     'admin',
        old_password: form.old_password,
        new_password: form.new_password,
      });
      toast.success('Password changed! Please login again.');
      await logout();
      navigate('/admin/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setLoading(false); }
  };

  const PwInput = ({ label, name, showKey }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input className="form-input" type={show[showKey] ? 'text' : 'password'}
          name={name} value={form[name]} onChange={handleChange}
          placeholder="••••••••" style={{ paddingRight: '2.5rem' }} />
        <button type="button" onClick={() => setShow(s => ({ ...s, [showKey]: !s[showKey] }))}
          style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          {show[showKey] ? '🙈' : '👁'}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="two-col" style={{ maxWidth: 700 }}>
        {/* Change password */}
        <div className="card">
          <div className="card-title">Change Admin Password</div>
          <form onSubmit={changePassword}>
            <PwInput label="Current Password" name="old_password" showKey="old" />
            <PwInput label="New Password"     name="new_password" showKey="new" />
            <PwInput label="Confirm Password" name="confirm"      showKey="con" />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.4rem' }} disabled={loading}>
              {loading ? <><span className="spinner" /> Changing…</> : '✓ Change Password'}
            </button>
          </form>
        </div>

        {/* System info */}
        <div>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-title">System Information</div>
            {[
              ['System', 'AttendAI v2.0'],
              ['Backend', 'Python 3.12+ / Flask 3.1'],
              ['Face Engine', 'OpenCV Haar Cascade'],
              ['Database', 'SQLite3'],
              ['Frontend', 'React 18 + React Router v6'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem' }}>{v}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-title">Access Control</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              <div><span style={{ color: 'var(--success)' }}>●</span> <strong style={{ color: 'var(--text)' }}>Student Portal</strong> — Public access (no login required)</div>
              <div style={{ marginLeft: '1.1rem', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Mark attendance via face scan</div>
              <div><span style={{ color: '#a78bfa' }}>●</span> <strong style={{ color: 'var(--text)' }}>Admin Panel</strong> — Protected by password</div>
              <div style={{ marginLeft: '1.1rem', fontSize: '0.75rem' }}>Dashboard · Register · Logs · Reports</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
