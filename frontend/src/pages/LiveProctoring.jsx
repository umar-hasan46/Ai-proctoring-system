import React, { useState, useEffect } from 'react';
import { api } from '../api/api';
import { formatToIST } from '../utils/dateUtils';

function LiveProctoring() {
  const [activeInterviews, setActiveInterviews] = useState([]);
  const [logs, setLogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [terminatingIntv, setTerminatingIntv] = useState(null);
  const [terminationReason, setTerminationReason] = useState('');

  const fetchData = async () => {
    try {
      const res = await api.getLiveProctoring();
      if (res.success) {
        setActiveInterviews(res.data);
        res.data.forEach(intv => fetchLogs(intv.interview_id));
      }
    } catch (err) {
      
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (id) => {
    try {
      const res = await api.getProctoringLogs(id);
      if (res.success) {
        setLogs(prev => ({ ...prev, [id]: res.logs }));
      }
    } catch (err) {
      
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAppreciate = async (intv) => {
    try {
      const res = await api.appreciateCandidate({
        interview_id: intv.interview_id,
        candidate_email: intv.candidate_email,
        candidate_name: intv.candidate_name,
        message: "Admin appreciated your interview performance. Keep going with clear and confident answers."
      });
      if (res.success) {
        setMsg({ text: 'Appreciation sent to candidate.', type: 'success' });
        setTimeout(() => setMsg({ text: '', type: '' }), 3000);
      }
    } catch (err) {
      setMsg({ text: 'Failed to send appreciation.', type: 'error' });
      setTimeout(() => setMsg({ text: '', type: '' }), 3000);
    }
  };

  const handleTerminateClick = (intv) => {
    setTerminatingIntv(intv);
    setTerminationReason('Interview terminated by admin during live proctoring.');
  };

  const confirmTermination = async () => {
    if (!terminatingIntv) return;
    try {
      const res = await api.terminateCandidate({
        interview_id: terminatingIntv.interview_id,
        candidate_email: terminatingIntv.candidate_email,
        candidate_name: terminatingIntv.candidate_name,
        reason: terminationReason || 'Interview terminated by admin during live proctoring.'
      });
      if (res.success) {
        setMsg({ text: 'Interview terminated successfully.', type: 'success' });
        setTimeout(() => setMsg({ text: '', type: '' }), 3000);
        setTerminatingIntv(null);
        fetchData();
      }
    } catch (err) {
      setMsg({ text: 'Failed to terminate interview.', type: 'error' });
      setTimeout(() => setMsg({ text: '', type: '' }), 3000);
    }
  };

  if (loading && activeInterviews.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '400px' }}>
          <h3 style={{ color: 'var(--text-primary)' }}>Loading Live Feed...</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>Synchronizing with active candidate sessions.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '30px auto', padding: '0 20px' }}>
      {msg.text && (
        <div style={{
          position: 'fixed', top: '90px', right: '24px', padding: '15px 25px', borderRadius: '8px',
          backgroundColor: msg.type === 'success' ? '#10b981' : '#ef4444', color: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999, fontWeight: 'bold', animation: 'slideIn 0.3s ease-out'
        }}>
          {msg.text}
        </div>
      )}

      <div className="card" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', margin: 0 }}>Live Proctoring Dashboard</h1>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--text-secondary)' }}>Real-time monitoring of candidates currently in session.</p>
        </div>
        <div style={{ background: activeInterviews.length > 0 ? '#38a169' : 'var(--text-secondary)', color: '#fff', padding: '0.5rem 1.2rem', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold' }}>
          {activeInterviews.length} CANDIDATES ACTIVE
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '20px' }}>
        {activeInterviews.length > 0 ? activeInterviews.map((intv) => (
          <div key={intv.interview_id} className="card" style={{ padding: '0', overflow: 'hidden', border: intv.warning_count >= 3 ? '2px solid #e53e3e' : '1px solid #e2e8f0' }}>
            <div style={{ background: 'var(--text-primary)', color: '#fff', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{intv.candidate_name || 'N/A'}</h3>
                <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>ID: #{intv.interview_id} | {intv.candidate_email}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.7rem', display: 'block', opacity: 0.8 }}>WARNINGS</span>
                <span style={{ fontWeight: 'bold', color: intv.warning_count >= 3 ? '#feb2b2' : '#fff', fontSize: '1.2rem' }}>{intv.warning_count}/3</span>
              </div>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ background: '#000', borderRadius: '10px', height: '150px', position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
                  {intv.camera_frame ? (
                    <img src={intv.camera_frame} alt="Live feed preview" width="200" height="150" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ color: '#fff', fontSize: '0.75rem', textAlign: 'center', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                      <span style={{ fontSize: '1.5rem', marginBottom: '10px' }}>📷</span>
                      Connecting camera...
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(229, 62, 62, 0.8)', color: '#fff', fontSize: '0.65rem', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                    <span style={{ width: '6px', height: '6px', background: '#fff', borderRadius: '50%', animation: 'pulse 1s infinite' }}></span> LIVE
                  </div>
                </div>

                <div style={{ fontSize: '0.9rem' }}>
                  <div style={{ marginBottom: '10px' }}>Role: <strong style={{ color: 'var(--text-primary)' }}>{intv.role || 'N/A'}</strong></div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '15px' }}>
                    <StatusBadge label="Camera" active={intv.camera_status === 'active'} />
                    <StatusBadge label="Mic" active={intv.mic_status === 'active'} />
                    <StatusBadge label="Face" active={intv.face_status === 'detected'} />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <div>📞 Phone: {intv.phone || 'N/A'}</div>
                    <div style={{ marginTop: '5px' }}>⏱️ Started: {intv.started_at_ist || 'N/A'}</div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-primary)', borderRadius: '10px', padding: '15px', height: '140px', overflowY: 'auto', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
                <h5 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#64748b', position: 'sticky', top: 0, background: 'var(--bg-primary)', paddingBottom: '5px', borderBottom: '1px solid #e2e8f0' }}>ACTIVITY LOG</h5>
                {(() => {
                  const rawLogs = logs[intv.interview_id] || [];
                  const uniqueLogs = [];
                  const seen = new Set();
                  rawLogs.forEach(log => {
                    const key = `${log.message}_${log.created_at}`;
                    if (!seen.has(key)) {
                      seen.add(key);
                      uniqueLogs.push(log);
                    }
                  });
                  return uniqueLogs.length > 0 ? uniqueLogs.map((log, idx) => (
                    <div key={idx} style={{ fontSize: '0.75rem', marginBottom: '6px', paddingBottom: '4px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: log.message.toLowerCase().includes('warning') ? '#e53e3e' : 'var(--text-primary)' }}>{log.message}</span>
                      <span style={{ color: '#a0aec0', fontSize: '0.7rem' }}>
                        {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                      </span>
                    </div>
                  )) : <div style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', paddingTop: '20px' }}>No activity logged yet.</div>;
                })()}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => handleAppreciate(intv)} className="btn" style={{ flex: 1, background: '#38a169', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Appreciate</button>
                <button onClick={() => handleTerminateClick(intv)} className="btn btn-danger" style={{ flex: 1, padding: '10px', borderRadius: '8px', fontWeight: 'bold' }}>Terminate</button>
              </div>
            </div>
          </div>
        )) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px 20px' }} className="card">
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📡</div>
            <h2 style={{ color: '#a0aec0' }}>No active interviews right now.</h2>
            <p style={{ color: 'var(--border-color)', maxWidth: '400px', margin: '0 auto' }}>Live candidate feeds will appear here once they start their interview sessions.</p>
          </div>
        )}
      </div>

      {terminatingIntv && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.35)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
          <div className="card" style={{ maxWidth: '500px', padding: '2rem', textAlign: 'center' }}>
            <h3 style={{ color: '#e53e3e' }}>Terminate Interview</h3>
            <p style={{ margin: '1rem 0', color: 'var(--text-secondary)' }}>Are you sure you want to terminate <strong>{terminatingIntv.candidate_name}</strong>'s interview?</p>
            <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}>Termination Reason:</label>
              <textarea 
                value={terminationReason} 
                onChange={(e) => setTerminationReason(e.target.value)}
                style={{ width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.9rem', height: '100px' }}
                placeholder="Enter reason for termination..."
              ></textarea>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-outline" onClick={() => setTerminatingIntv(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmTermination}>Terminate Now</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function StatusBadge({ label, active }) {
  return (
    <span style={{
      fontSize: '0.65rem',
      padding: '2px 6px',
      borderRadius: '10px',
      background: active ? '#c6f6d5' : '#fed7d7',
      color: active ? '#22543d' : '#822727',
      fontWeight: 'bold'
    }}>
      {label}: {active ? 'ON' : 'OFF'}
    </span>
  );
}

export default LiveProctoring;
