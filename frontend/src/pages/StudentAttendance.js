import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = 'http://localhost:5000/api';

export default function StudentAttendance() {
  const webcamRef              = useRef(null);
  const [camReady,  setCamReady]  = useState(false);
  const [scanning,  setScanning]  = useState(false);
  const [camState,  setCamState]  = useState('idle');    // idle|scanning|success|error|warn
  const [result,    setResult]    = useState(null);
  const [history,   setHistory]   = useState([]);

  const stateColors = { idle: 'var(--text-muted)', scanning: 'var(--accent)', success: 'var(--success)', error: 'var(--danger)', warn: 'var(--warning)' };
  const stateLabels = { idle: 'Camera Ready', scanning: 'Scanning…', success: 'Recognized!', error: 'Not Recognized', warn: 'Already Marked' };

  const doScan = useCallback(async () => {
    if (!webcamRef.current || scanning) return;
    const img = webcamRef.current.getScreenshot();
    if (!img) { toast.error('Could not capture image'); return; }

    setScanning(true);
    setCamState('scanning');
    setResult(null);

    try {
      const res  = await axios.post(`${API}/mark-attendance`, { image: img });
      const data = res.data;

      if (!data.success) {
        setCamState('error');
        setResult({ type: 'error', message: data.message });
        toast.error(data.message);
        return;
      }

      const r = data.results[0];
      if (r.status === 'marked') {
        setCamState('success');
        setResult({ type: 'success', ...r });
        setHistory(h => [{ ...r, scanned_at: new Date().toLocaleTimeString() }, ...h.slice(0, 9)]);
        toast.success(`✅ ${r.name} — attendance marked!`);
      } else if (r.status === 'already_marked') {
        setCamState('warn');
        setResult({ type: 'warn', ...r });
        toast(`⚠️ ${r.name} — already marked today`, { icon: 'ℹ️' });
      } else {
        setCamState('error');
        setResult({ type: 'error', message: 'Face not recognized. Please register with admin first.' });
        toast.error('Face not recognized');
      }
    } catch (err) {
      setCamState('error');
      const msg = err.response?.data?.message || 'Server error — is Flask running?';
      setResult({ type: 'error', message: msg });
      toast.error(msg);
    } finally {
      setScanning(false);
      setTimeout(() => setCamState('idle'), 4000);
    }
  }, [scanning]);

  return (
    <div>
      {/* Info banner */}
      <div style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: '10px', padding: '0.85rem 1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.2rem' }}>◎</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Student Attendance Portal</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Position your face in front of the camera and click <strong>Scan Face</strong> to mark your attendance for today.
            Only one entry per student per day is allowed.
          </div>
        </div>
      </div>

      <div className="three-col">
        {/* LEFT — camera */}
        <div>
          <div className={`cam-wrap ${camState}`}>
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.92}
              videoConstraints={{ width: 640, height: 480, facingMode: 'user' }}
              onUserMedia={() => setCamReady(true)}
              onUserMediaError={() => toast.error('Camera access denied — allow camera permission')}
            />
            {scanning && <div className="scan-line" />}
            {scanning && <div className="face-target" />}
            {!camReady && (
              <div className="cam-overlay">
                <span className="spinner" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Starting camera…</span>
              </div>
            )}
          </div>

          {/* status row */}
          <div className="cam-status">
            <span className="cam-status-dot" style={{ background: stateColors[camState] }} />
            <span style={{ color: stateColors[camState], fontFamily: 'var(--mono)', fontSize: '0.7rem' }}>
              {stateLabels[camState]}
            </span>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.8rem', marginTop: '0.3rem', fontSize: '0.88rem' }}
            onClick={doScan}
            disabled={scanning || !camReady}
          >
            {scanning
              ? <><span className="spinner" /> Scanning Face…</>
              : '◎ &nbsp;Scan Face'}
          </button>

          {/* Tips */}
          <div style={{ marginTop: '1rem', padding: '0.9rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>// tips for best results</div>
            {['Ensure good lighting on your face', 'Look directly at the camera', 'Remove glasses if recognition fails', 'Only one face should be visible'].map((t, i) => (
              <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '0.45rem', marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--accent)' }}>›</span>{t}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — result + history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Result card */}
          <div className="card">
            <div className="card-title">Recognition Result</div>
            {!result ? (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <div className="empty-icon" style={{ fontSize: '1.8rem' }}>◎</div>
                <div>Scan your face to see result</div>
              </div>
            ) : result.type === 'error' ? (
              <div className="result-block err">
                <div className="result-name" style={{ color: 'var(--danger)' }}>❌ Recognition Failed</div>
                <div className="result-meta">{result.message}</div>
              </div>
            ) : (
              <div className={`result-block ${result.type}`}>
                <div className="result-name">{result.name}</div>
                <div className="result-meta">
                  ID: {result.student_id} &nbsp;·&nbsp; {result.department || '—'} &nbsp;·&nbsp; {result.year || '—'}
                </div>
                <span className={`result-status ${result.type}`}>
                  {result.type === 'success' && `✅ Marked present · ${result.time}`}
                  {result.type === 'warn'    && `⚠ Already marked · ${result.time}`}
                </span>
                {result.confidence && (
                  <div style={{ marginTop: '0.5rem', fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    Confidence: {result.confidence}% &nbsp;·&nbsp; Match Distance: {result.distance}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Session history */}
          {history.length > 0 && (
            <div className="card">
              <div className="card-title">
                Session History
                <span className="badge badge-accent">{history.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {history.map((h, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--bg)', borderRadius: '7px', fontSize: '0.8rem' }}>
                    <div>
                      <span style={{ fontWeight: 700 }}>{h.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: '0.68rem', marginLeft: '0.5rem' }}>{h.student_id}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)', fontSize: '0.7rem' }}>{h.scanned_at}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Date info */}
          <div style={{ padding: '0.8rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Date: <span style={{ color: 'var(--text)' }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></span>
          </div>
        </div>
      </div>
      {/* 🔥 Developer Section */}
      <div style={{ marginTop: "50px" }}>
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          👨‍💻 Project Developers
        </h2>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "20px",
            flexWrap: "wrap"
          }}
        >
          {/* 👨‍💻 Developer */}
          <div
            style={{
              width: "300px",
              padding: "20px",
              borderRadius: "15px",
              background: "linear-gradient(135deg, #4facfe, #00f2fe)",
              color: "white",
              textAlign: "center",
              boxShadow: "0 5px 15px rgba(0,0,0,0.2)"
            }}
          >
            <h3>👨‍💻 Developer</h3>
            <p><b>Name:</b> Shivendra Singh Chauhan</p>
            <p><b>Course:</b> MCA (4th Sem)</p>
            <p><b>Role:</b> Full Stack Developer</p>
            <p><b>Project:</b> AttendAI System</p>
            <p><b>Tech:</b> React, Flask, OpenCV</p>
          </div>

          {/* 👩‍💻 Co-Developer */}
          <div
            style={{
              width: "300px",
              padding: "20px",
              borderRadius: "15px",
              background: "linear-gradient(135deg, #ff758c, #ff7eb3)",
              color: "white",
              textAlign: "center",
              boxShadow: "0 5px 15px rgba(0,0,0,0.2)"
            }}
          >
            <h3>👩‍💻 Co-Developer</h3>
            <p><b>Name:</b> KM Anjali Sharma</p>
            <p><b>Course:</b> MCA (4th Sem)</p>
            <p><b>Role:</b> Frontend & UI</p>
            <p><b>Project:</b> AttendAI System</p>
            <p><b>Tech:</b> React, UI Design</p>
          </div>
        </div>
      </div>
    </div>
  );
}
