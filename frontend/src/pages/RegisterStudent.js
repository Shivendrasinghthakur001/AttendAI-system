import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = 'http://localhost:5000/api';

export default function RegisterStudent() {
  const webcamRef = useRef(null);
  const [form, setForm] = useState({ student_id: '', name: '', department: '', year: '' });
  const [captured, setCaptured]   = useState(null);
  const [camReady, setCamReady]   = useState(false);
  const [loading,  setLoading]    = useState(false);
  const [step,     setStep]       = useState(1);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const capture = useCallback(() => {
    const img = webcamRef.current?.getScreenshot();
    if (img) { setCaptured(img); setStep(3); }
    else toast.error('Could not capture — try again');
  }, []);

  const retake = () => { setCaptured(null); setStep(2); };

  const submit = async () => {
    if (!form.student_id || !form.name) { toast.error('Student ID and Name are required'); return; }
    if (!captured) { toast.error('Please capture a face photo'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/register`, { ...form, image: captured });
      if (res.data.success) {
        toast.success(res.data.message);
        setForm({ student_id: '', name: '', department: '', year: '' });
        setCaptured(null);
        setCamReady(false);
        setStep(1);
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const depts = ['Computer Science','Electronics','Mechanical','Civil','Electrical','Information Technology','MBA','MCA'];
  const years = ['1st Year','2nd Year','3rd Year','4th Year'];

  return (
    <div>
      <div className="step-bar">
        {['Fill Details','Capture Face','Review & Save'].map((s, i) => (
          <div key={i} className={`step ${step === i+1 ? 'active' : step > i+1 ? 'done' : ''}`}>
            <span>{step > i+1 ? '✓' : i+1}</span> {s}
          </div>
        ))}
      </div>

      <div className="two-col">
        {/* Form */}
        <div className="card">
          <div className="card-title">Student Information</div>
          <div className="form-group">
            <label className="form-label">Student ID *</label>
            <input className="form-input" name="student_id" value={form.student_id} onChange={handleChange} placeholder="e.g. CS2024001" />
          </div>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-input" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Priya Sharma" />
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <select className="form-input" name="department" value={form.department} onChange={handleChange}>
              <option value="">Select department</option>
              {depts.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Year</label>
            <select className="form-input" name="year" value={form.year} onChange={handleChange}>
              <option value="">Select year</option>
              {years.map(y => <option key={y}>{y}</option>)}
            </select>
          </div>

          {step === 1 && (
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '0.4rem' }}
              onClick={() => {
                if (!form.student_id || !form.name) { toast.error('Fill required fields first'); return; }
                setStep(2);
              }}>
              Next → Capture Face
            </button>
          )}
        </div>

        {/* Camera / Preview */}
        <div>
          {step >= 2 ? (
            <>
              <div className={`cam-wrap ${captured ? 'success' : 'scanning'}`} style={{ marginBottom: '0.75rem' }}>
                {captured
                  ? <img src={captured} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <Webcam
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      screenshotQuality={0.95}
                      videoConstraints={{ width: 640, height: 480, facingMode: 'user' }}
                      onUserMedia={() => setCamReady(true)}
                      onUserMediaError={() => toast.error('Camera access denied')}
                    />
                }
                {!captured && !camReady && (
                  <div className="cam-overlay"><span className="spinner" /></div>
                )}
                {!captured && <div className="scan-line" />}
              </div>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                {!captured ? (
                  <button className="btn btn-primary" style={{ flex: 1, padding: '0.75rem' }}
                    onClick={capture} disabled={!camReady}>
                    📸 &nbsp;Capture Face
                  </button>
                ) : (
                  <>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={retake}>↺ Retake</button>
                    <button className="btn btn-success" style={{ flex: 2 }} onClick={submit} disabled={loading}>
                      {loading ? <><span className="spinner" /> Registering…</> : '✓ Register Student'}
                    </button>
                  </>
                )}
              </div>

              {captured && (
                <div style={{ marginTop: '0.75rem', padding: '0.65rem 1rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--success)' }}>
                  ✓ Face captured — review and click Register Student
                </div>
              )}
            </>
          ) : (
            <div className="card" style={{ border: '1px dashed var(--border)', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', opacity: 0.25 }}>◎</div>
              <div style={{ fontSize: '0.82rem' }}>Complete the form<br />to enable face capture</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
