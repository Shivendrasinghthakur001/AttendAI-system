import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

export default function Dashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/stats`);
      setStats(res.data.stats);
      setError('');
    } catch (err) {
      setError(err.response?.status === 401
        ? 'Session expired — please login again'
        : 'Cannot connect to backend');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchStats();
    const t = setInterval(fetchStats, 15000);
    return () => clearInterval(t);
  }, [fetchStats]);

  const pct = stats && stats.total_students > 0
    ? Math.round(stats.today_present / stats.total_students * 100) : 0;

  if (loading) return <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', color: 'var(--text-muted)' }}><span className="spinner" /> Loading dashboard…</div>;
  if (error)   return <div className="result-block err" style={{ display: 'inline-block' }}>⚠ {error}</div>;

  return (
    <div>
      {/* Stat cards */}
      <div className="stat-grid">
        <div className="stat-card blue">
          <div className="stat-label">Total Students</div>
          <div className="stat-value">{stats.total_students}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Present Today</div>
          <div className="stat-value">{stats.today_present}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Absent Today</div>
          <div className="stat-value">{stats.today_absent}</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Total Records</div>
          <div className="stat-value">{stats.total_records}</div>
        </div>
      </div>

      {/* Rate bar */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-title">
          Today's Attendance Rate
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{pct}%</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.55rem' }}>
          {stats.today_present} of {stats.total_students} students present
        </div>
        <div className="bar-bg"><div className="bar-fg" style={{ width: `${pct}%` }} /></div>
      </div>

      <div className="two-col">
        {/* Recent entries */}
        <div className="card">
          <div className="card-title">Recent Check-ins</div>
          {stats.recent_entries.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <div className="empty-icon">◎</div>No check-ins yet today
            </div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Name</th><th>Dept</th><th>Time</th></tr></thead>
              <tbody>
                {stats.recent_entries.map((e, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{e.name}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{e.department || '—'}</td>
                    <td style={{ fontFamily: 'var(--mono)', color: 'var(--accent)', fontSize: '0.78rem' }}>{e.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Dept breakdown */}
        <div className="card">
          <div className="card-title">Dept. Breakdown Today</div>
          {stats.dept_breakdown.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <div className="empty-icon">⬡</div>No data yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {stats.dept_breakdown.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--bg)', borderRadius: '7px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{d.department || 'Other'}</span>
                  <span className="badge badge-accent">{d.cnt} present</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '0.85rem', fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
        Auto-refreshes every 15 seconds · {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}
