import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { formatToIST, formatToDDMMYYYY } from '../utils/dateUtils';

function AIReport() {
  const params = useParams();
  const id = params.interview_id || params.id;
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [logs, setLogs] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [decision, setDecision] = useState('Pending');
  const [adminNote, setAdminNote] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const videoRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportRes, logRes, feedbackRes] = await Promise.allSettled([
        api.getAdminReport(id),
        api.getAILogs(id),
        api.getCandidateFeedback(id)
      ]);

      if (reportRes.status === 'fulfilled' && reportRes.value.success && reportRes.value.report) {
        setReport(reportRes.value.report);
        setDecision(reportRes.value.report.recruiter_decision || 'Pending');
        setAdminNote(reportRes.value.report.admin_note || '');
      } else {
        setError("Interview report not found or processing.");
      }

      if (logRes.status === 'fulfilled' && logRes.value.success) {
        setLogs(Array.isArray(logRes.value.logs) ? logRes.value.logs : []);
      }

      if (feedbackRes.status === 'fulfilled' && feedbackRes.value.success) {
        setFeedback(feedbackRes.value.data);
      }
    } catch (err) {
      
      setError("Failed to load AI analysis report.");
    } finally {
      setLoading(false);
    }
  };

  const handleJump = (timestamp) => {
    if (!timestamp || !videoRef.current) return;
    try {
      const parts = timestamp.split(':');
      if (parts.length < 2) return;

      let seconds = 0;
      if (parts.length === 3) {
        seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
      } else {
        seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
      }

      videoRef.current.currentTime = seconds;
      videoRef.current.play();

      const logItems = document.querySelectorAll('.log-item');
      logItems.forEach(item => item.style.background = 'transparent');
      const activeItem = document.getElementById(`log-${timestamp}`);
      if (activeItem) {
        activeItem.style.background = '#eff6ff';
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (err) {
      
    }
  };

  const handleSaveDecision = async () => {
    if (!report) return;
    try {
      await api.saveAdminReport({
        interview_id: id,
        recruiter_decision: decision,
        admin_note: adminNote
      });
      setMsg({ text: 'Decision saved successfully', type: 'success' });
      setTimeout(() => setMsg({ text: '', type: '' }), 3000);
    } catch (err) {
      
      setMsg({ text: 'Failed to save decision', type: 'error' });
      setTimeout(() => setMsg({ text: '', type: '' }), 3000);
    }
  };

  if (loading) return (
    <div className="card" style={{ textAlign: 'center', marginTop: '100px', padding: '50px' }}>
      <h3>Loading AI Analysis...</h3>
      <p>Fetching logs and behavioral metrics.</p>
    </div>
  );

  if (error || !report) return (
    <div className="card" style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center', padding: '40px' }}>
      <h2 style={{ color: '#e53e3e' }}>Report Unavailable</h2>
      <p>{error || "The AI report for this interview is not available yet."}</p>
      <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate(-1)}>Back to Dashboard</button>
    </div>
  );

  return (
    <div style={{ maxWidth: '1250px', margin: '30px auto', padding: '0 20px' }}>
      {msg.text && (
        <div style={{
          position: 'fixed', top: '90px', right: '24px', padding: '15px 25px', borderRadius: '8px',
          backgroundColor: msg.type === 'success' ? '#10b981' : '#ef4444', color: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999, fontWeight: 'bold', animation: 'slideIn 0.3s ease-out'
        }}>
          {msg.text}
        </div>
      )}

      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', padding: '20px 30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ color: '#1e3a5f', margin: 0, fontSize: '1.8rem' }}>AI Interview Report</h1>
          <p style={{ color: '#718096', margin: '5px 0 0', fontSize: '0.95rem' }}>
            <strong>Candidate:</strong> {report.candidate_name || 'N/A'} | <strong>ID:</strong> #{id} | <strong>Date:</strong> {formatToDDMMYYYY(report.interview_date_ist || report.created_at || report.indian_time)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={() => navigate(-1)}>Back</button>
          <button className="btn btn-primary" onClick={() => window.print()}>Print Report</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px' }}>
        <div style={{ flex: '1.5' }}>
          <div className="card" style={{ padding: '0', overflow: 'hidden', background: '#000', borderRadius: '16px', marginBottom: '25px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <video
              ref={videoRef}
              controls
              style={{ width: '100%', display: 'block', maxHeight: '480px' }}
              src={`http://127.0.0.1:5000/uploads/recordings/interview_${id}.mp4`}
            >
              Your browser does not support the video tag.
            </video>
          </div>

          <div className="card" style={{ padding: '25px' }}>
            <h3 style={{ color: '#1e3a5f', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🕒</span> Timestamped AI Analysis Log
            </h3>
            <div style={{ maxHeight: '480px', overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '15px', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</th>
                    <th style={{ textAlign: 'left', padding: '15px', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Event</th>
                    <th style={{ textAlign: 'left', padding: '15px', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Insight</th>
                    <th style={{ textAlign: 'left', padding: '15px', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const uniqueLogs = [];
                    const seen = new Set();
                    logs.forEach(log => {
                      const key = `${log.timestamp}_${log.event_type}_${log.message}`;
                      if (!seen.has(key)) {
                        seen.add(key);
                        uniqueLogs.push(log);
                      }
                    });
                    return uniqueLogs;
                  })().map((log, i) => (
                    <tr
                      key={i}
                      id={`log-${log.timestamp}`}
                      className="log-item"
                      onClick={() => handleJump(log.timestamp)}
                      style={{ cursor: 'pointer', borderBottom: '1px solid #f8fafc', transition: 'all 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '15px', color: '#4f46e5', fontWeight: '700', fontSize: '0.9rem' }}>{log.timestamp || 'N/A'}</td>
                      <td style={{ padding: '15px', fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>{log.event_type || 'N/A'}</td>
                      <td style={{ padding: '15px', fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>{log.message || 'No details.'}</td>
                      <td style={{ padding: '15px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          background: log.severity === 'High' ? '#fee2e2' : (log.severity === 'Medium' ? '#ffedd5' : '#dcfce7'),
                          color: log.severity === 'High' ? '#991b1b' : (log.severity === 'Medium' ? '#9a3412' : '#166534')
                        }}>
                          {log.severity || 'LOW'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No AI analysis logs available for this session.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <div className="card" style={{ padding: '25px' }}>
            <h3 style={{ color: '#1e3a5f', marginBottom: '20px' }}>Candidate Metrics</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Overall Score</span>
                <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#4f46e5' }}>{report.overall_score || 0}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Recommendation</span>
                <span style={{
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  color: report.final_recommendation?.includes('Rejected') ? '#dc2626' : (report.final_recommendation?.includes('Strong') ? '#16a34a' : '#2563eb'),
                  textAlign: 'right'
                }}>
                  {report.final_recommendation || 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Cheating Alerts</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '800', color: (report.cheating_alert_count || 0) > 0 ? '#dc2626' : '#1e293b' }}>{report.cheating_alert_count || 0}</span>
              </div>

              <div style={{ marginTop: '10px', padding: '18px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <h4 style={{ margin: '0 0 10px', color: '#1e293b', fontSize: '0.95rem' }}>AI Executive Summary</h4>
                <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.6', margin: 0 }}>{report.admin_summary || 'No summary generated for this interview.'}</p>
              </div>
            </div>
          </div>

          {feedback && (
            <div className="card" style={{ padding: '25px', background: '#f0f9ff', border: '1px solid #e0f2fe' }}>
              <h3 style={{ color: '#0369a1', marginBottom: '15px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📋</span> Candidate Feedback Copy
              </h3>
              <div style={{ fontSize: '0.85rem', color: '#0c4a6e' }}>
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontWeight: '700', marginBottom: '6px', color: '#0284c7' }}>STRENGTHS</p>
                  <ul style={{ paddingLeft: '1.2rem', margin: '0' }}>
                    {(Array.isArray(feedback.strengths) ? feedback.strengths : []).map((s, i) => <li key={i} style={{ marginBottom: '4px' }}>{s}</li>)}
                    {(!feedback.strengths || feedback.strengths.length === 0) && <li>No specific strengths recorded.</li>}
                  </ul>
                </div>
                <div>
                  <p style={{ fontWeight: '700', marginBottom: '6px', color: '#b91c1c' }}>AREAS TO IMPROVE</p>
                  <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                    {(Array.isArray(feedback.areas_to_improve) ? feedback.areas_to_improve : []).map((s, i) => <li key={i} style={{ marginBottom: '4px' }}>{s}</li>)}
                    {(!feedback.areas_to_improve || feedback.areas_to_improve.length === 0) && <li>No specific areas for improvement recorded.</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="card" style={{ padding: '25px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ color: '#1e3a5f', marginBottom: '15px' }}>Recruiter Decision</h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Hiring Status</label>
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e0',
                  fontSize: '0.95rem',
                  outline: 'none',
                  background: '#fff'
                }}
              >
                <option value="Pending Review">Pending Review</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Hiring in Process">Hiring in Process</option>
                <option value="Rejected">Rejected</option>
                <option value="Selected">Selected</option>
                <option value="Not Selected">Not Selected</option>
              </select>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Recruiter Notes</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Enter internal candidate notes or highlights..."
                style={{
                  width: '100%',
                  height: '100px',
                  padding: '15px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e0',
                  fontSize: '0.95rem',
                  outline: 'none',
                  resize: 'none',
                  background: '#fcfcfc'
                }}
              ></textarea>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: '700' }} onClick={handleSaveDecision}>
              Submit Decision
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default AIReport;
