import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = 'http://localhost:5000/api';

export default function AttendanceLog() {
  const today = new Date().toISOString().slice(0, 10);
  const [tab,      setTab]      = useState('attendance');
  const [date,     setDate]     = useState(today);
  const [records,  setRecords]  = useState([]);
  const [students, setStudents] = useState([]);
  const [depts,    setDepts]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [filters,  setFilters]  = useState({ dept: '', year: '' });

  const fetchAttendance = async (d = date, f = filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date: d });
      if (f.dept) params.set('department', f.dept);
      if (f.year) params.set('year', f.year);
      const res = await axios.get(`${API}/attendance?${params}`);
      setRecords(res.data.records);
    } catch { toast.error('Failed to load records'); }
    finally { setLoading(false); }
  };

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API}/students`);
      setStudents(res.data.students);
    } catch { toast.error('Failed to load students'); }
  };

  const fetchDepts = async () => {
    try {
      const res = await axios.get(`${API}/departments`);
      setDepts(res.data.departments);
    } catch {}
  };

  useEffect(() => {
    fetchAttendance();
    fetchStudents();
    fetchDepts();
  }, []); // eslint-disable-line

  const deleteStudent = async (sid, name) => {
    if (!window.confirm(`Delete ${name} (${sid}) and ALL their records? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/students/${sid}`);
      toast.success(`${name} deleted`);
      fetchStudents();
      fetchAttendance();
    } catch { toast.error('Delete failed'); }
  };

  const presentIds = new Set(records.map(r => r.student_id));
  const years      = ['1st Year','2nd Year','3rd Year','4th Year'];

  return (
    <div>
      <div className="tab-bar">
        {[['attendance','≡ Attendance Records'], ['students','⊕ Manage Students']].map(([key, label]) => (
          <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`}
            onClick={() => { setTab(key); if (key === 'students') fetchStudents(); }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── ATTENDANCE TAB ──────────────────────────────────────────── */}
      {tab === 'attendance' && (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={date} style={{ width: 'auto' }}
                onChange={e => { setDate(e.target.value); fetchAttendance(e.target.value); }} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Department</label>
              <select className="form-input" style={{ width: 'auto' }} value={filters.dept}
                onChange={e => { const f = { ...filters, dept: e.target.value }; setFilters(f); fetchAttendance(date, f); }}>
                <option value="">All Departments</option>
                {depts.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Year</label>
              <select className="form-input" style={{ width: 'auto' }} value={filters.year}
                onChange={e => { const f = { ...filters, year: e.target.value }; setFilters(f); fetchAttendance(date, f); }}>
                <option value="">All Years</option>
                {years.map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
            <button className="btn btn-secondary" style={{ marginBottom: '0.02rem' }} onClick={() => fetchAttendance()}>↺ Refresh</button>
            <div style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'flex-end', paddingBottom: '0.5rem' }}>
              {records.length} record{records.length !== 1 ? 's' : ''} found
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '2rem', display: 'flex', gap: '0.75rem', alignItems: 'center', color: 'var(--text-muted)' }}>
                <span className="spinner" /> Loading…
              </div>
            ) : records.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">≡</div>No records for {date}</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>#</th><th>Student ID</th><th>Name</th><th>Department</th><th>Year</th><th>Time</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: '0.75rem' }}>{i+1}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.student_id}</td>
                      <td style={{ fontWeight: 600 }}>{r.name}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{r.department || '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{r.year || '—'}</td>
                      <td style={{ fontFamily: 'var(--mono)', color: 'var(--accent)', fontSize: '0.78rem' }}>{r.time}</td>
                      <td><span className="badge badge-present">● present</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── STUDENTS TAB ────────────────────────────────────────────── */}
      {tab === 'students' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {students.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">⊕</div>No students registered yet</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Student ID</th><th>Name</th><th>Department</th><th>Year</th><th>Registered</th><th>Today</th><th></th></tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: '0.75rem' }}>{i+1}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.student_id}</td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{s.department || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{s.year || '—'}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.created_at?.slice(0, 10)}</td>
                    <td>
                      <span className={`badge ${presentIds.has(s.student_id) ? 'badge-present' : 'badge-absent'}`}>
                        {presentIds.has(s.student_id) ? '● present' : '○ absent'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-danger btn-sm"
                        onClick={() => deleteStudent(s.student_id, s.name)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
