import React, { useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = 'http://localhost:5000/api';

export default function ReportPrint() {
  const today  = new Date().toISOString().slice(0, 10);
  const [from,     setFrom]     = useState(today);
  const [to,       setTo]       = useState(today);
  const [dept,     setDept]     = useState('');
  const [year,     setYear]     = useState('');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const printRef               = useRef(null);

  const depts = ['Computer Science','Electronics','Mechanical','Civil','Electrical','Information Technology','MBA','MCA'];
  const years = ['1st Year','2nd Year','3rd Year','4th Year'];

  const fetchReport = async () => {
    if (from > to) { toast.error('From date cannot be after To date'); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      if (dept) params.set('department', dept);
      if (year) params.set('year', year);
      const res = await axios.get(`${API}/attendance/range?${params}`);
      setData(res.data);
      toast.success(`Report loaded — ${res.data.records.length} records`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load report');
    } finally { setLoading(false); }
  };

  const handlePrint = () => {
    if (!data) { toast.error('Generate the report first'); return; }
    window.print();
  };

  // ── Compute stats for summary ────────────────────────────────────────
  const getStats = () => {
    if (!data) return null;
    const { records, students } = data;

    // filter students by dept/year if selected
    const filteredStudents = students.filter(s =>
      (!dept || s.department === dept) &&
      (!year || s.year === year)
    );

    // unique dates in range
    const allDates = [...new Set(records.map(r => r.date))].sort();
    const totalDays = allDates.length;

    // per-student summary
    const studentMap = {};
    filteredStudents.forEach(s => {
      studentMap[s.student_id] = { ...s, present_days: 0, dates: new Set() };
    });
    records.forEach(r => {
      if (studentMap[r.student_id]) {
        studentMap[r.student_id].present_days++;
        studentMap[r.student_id].dates.add(r.date);
      }
    });

    return { filteredStudents, allDates, totalDays, studentMap };
  };

  const stats = getStats();

  const fmtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div>
      {/* ── Filter controls (hidden on print) ── */}
      <div className="no-print">
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-title">Report Filters</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr) auto', gap: '0.85rem', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">From Date</label>
              <input type="date" className="form-input" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">To Date</label>
              <input type="date" className="form-input" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Department</label>
              <select className="form-input" value={dept} onChange={e => setDept(e.target.value)}>
                <option value="">All Departments</option>
                {depts.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Year</label>
              <select className="form-input" value={year} onChange={e => setYear(e.target.value)}>
                <option value="">All Years</option>
                {years.map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" style={{ height: 'fit-content' }}
              onClick={fetchReport} disabled={loading}>
              {loading ? <><span className="spinner" /> Loading…</> : '⬡ Generate'}
            </button>
          </div>
        </div>

        {data && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <button className="btn btn-purple" onClick={handlePrint} style={{ fontSize: '0.9rem', padding: '0.65rem 1.5rem' }}>
              ⎙ &nbsp;Print Report / Save as PDF
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
              Tip: In print dialog → choose "Save as PDF" to get a PDF file
            </div>
          </div>
        )}
      </div>

      {/* ══ PRINTABLE REPORT ══════════════════════════════════════════ */}
      {data && stats ? (
        <div ref={printRef}>
          {/* Print header (only shows on print) */}
          <div className="print-header">
            <h1>AttendAI — Attendance Report</h1>
            <p>Face Recognition Attendance System</p>
          </div>

          {/* Report title (visible always) */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.3rem' }}>
                  Attendance Report
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <span>Period: <strong style={{ color: 'var(--text)' }}>{fmtDate(from)} → {fmtDate(to)}</strong></span>
                  {dept && <span>Department: <strong style={{ color: 'var(--text)' }}>{dept}</strong></span>}
                  {year && <span>Year: <strong style={{ color: 'var(--text)' }}>{year}</strong></span>}
                  <span>Generated: <strong style={{ color: 'var(--text)' }}>{new Date().toLocaleString('en-IN')}</strong></span>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                <div>AttendAI v2.0</div>
                <div>Python 3.12+ · OpenCV</div>
              </div>
            </div>

            {/* Summary boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginTop: '1.1rem' }}>
              {[
                { label: 'Total Students', val: stats.filteredStudents.length, color: 'var(--accent)' },
                { label: 'Total Records', val: data.records.length, color: 'var(--success)' },
                { label: 'Working Days', val: stats.totalDays, color: '#a78bfa' },
                { label: 'Avg Attendance', val: stats.filteredStudents.length > 0 && stats.totalDays > 0
                  ? Math.round(data.records.length / (stats.filteredStudents.length * stats.totalDays) * 100) + '%'
                  : '—', color: 'var(--warning)' },
              ].map((b, i) => (
                <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px', padding: '0.85rem 1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: b.color, letterSpacing: '-0.04em' }}>{b.val}</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.2rem' }}>{b.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Student-wise summary table ── */}
          <div className="card" style={{ marginBottom: '1rem', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.1rem 0.6rem', fontWeight: 700, fontSize: '0.9rem', borderBottom: '1px solid var(--border)' }}>
              Student-wise Attendance Summary
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Year</th>
                  <th>Present Days</th>
                  <th>Total Days</th>
                  <th>Attendance %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.filteredStudents.length === 0 ? (
                  <tr><td colSpan="9"><div className="empty-state">No students found</div></td></tr>
                ) : stats.filteredStudents.map((s, i) => {
                  const sm   = stats.studentMap[s.student_id];
                  const pct  = stats.totalDays > 0 ? Math.round(sm.present_days / stats.totalDays * 100) : 0;
                  const good = pct >= 75;
                  return (
                    <tr key={i}>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{i+1}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.student_id}</td>
                      <td style={{ fontWeight: 700 }}>{s.name}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{s.department || '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{s.year || '—'}</td>
                      <td style={{ fontFamily: 'var(--mono)', color: 'var(--success)', fontWeight: 700 }}>{sm.present_days}</td>
                      <td style={{ fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>{stats.totalDays}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 99, height: 6, overflow: 'hidden', minWidth: 60 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: good ? 'var(--success)' : 'var(--danger)', borderRadius: 99, transition: 'width 0.8s' }} />
                          </div>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', fontWeight: 700, color: good ? 'var(--success)' : 'var(--danger)', minWidth: '36px' }}>{pct}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${good ? 'badge-present' : 'badge-absent'}`}>
                          {good ? '✓ Regular' : '✗ Short'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Day-wise attendance table ── */}
          {stats.allDates.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.1rem 0.6rem', fontWeight: 700, fontSize: '0.9rem', borderBottom: '1px solid var(--border)' }}>
                Day-wise Attendance Detail
              </div>
              {stats.allDates.map(d => {
                const dayRecs = data.records.filter(r => r.date === d &&
                  (!dept || r.department === dept) &&
                  (!year || r.year === year));
                return (
                  <div key={d} style={{ borderBottom: '1px solid var(--border)', padding: '0' }}>
                    <div style={{ padding: '0.6rem 1.1rem', background: 'rgba(0,212,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{fmtDate(d)}</span>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <span className="badge badge-present">{dayRecs.length} present</span>
                        <span className="badge badge-absent">{stats.filteredStudents.length - dayRecs.length} absent</span>
                      </div>
                    </div>
                    {dayRecs.length > 0 && (
                      <table className="data-table" style={{ fontSize: '0.78rem' }}>
                        <thead>
                          <tr><th>#</th><th>Student ID</th><th>Name</th><th>Department</th><th>Time</th></tr>
                        </thead>
                        <tbody>
                          {dayRecs.map((r, i) => (
                            <tr key={i}>
                              <td style={{ fontFamily: 'var(--mono)', color: 'var(--text-muted)', fontSize: '0.72rem' }}>{i+1}</td>
                              <td style={{ fontFamily: 'var(--mono)', color: 'var(--text-muted)', fontSize: '0.72rem' }}>{r.student_id}</td>
                              <td style={{ fontWeight: 600 }}>{r.name}</td>
                              <td style={{ color: 'var(--text-muted)' }}>{r.department || '—'}</td>
                              <td style={{ fontFamily: 'var(--mono)', color: 'var(--accent)', fontSize: '0.72rem' }}>{r.time}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Print footer */}
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
            <span>AttendAI Face Recognition Attendance System — Admin Report</span>
            <span>Generated: {new Date().toLocaleString('en-IN')}</span>
          </div>
        </div>
      ) : (
        !loading && (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem', border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem', opacity: 0.2 }}>⎙</div>
            <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>No Report Generated</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Select a date range and click Generate to create the attendance report.<br />
              You can then print it or save as PDF.
            </div>
          </div>
        )
      )}
    </div>
  );
}
