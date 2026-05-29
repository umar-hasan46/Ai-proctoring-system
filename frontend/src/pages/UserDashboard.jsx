import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/api';
import Avatar from '../components/Avatar';

function UserDashboard({ user: initialUser }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pastInterviews, setPastInterviews] = useState([]);

  const [slowLoading, setSlowLoading] = useState(false);
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setSlowLoading(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const fetchDashboardData = async () => {
    let email = initialUser?.email;
    if (!email) {
      try { email = JSON.parse(localStorage.getItem('user'))?.email; } catch(e){}
    }
    if (!email) email = localStorage.getItem('email');
    if (!email) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.getUserDashboard(email);
      if (res.success) {
        setData(res);
      }
      const intRes = await api.getUserInterviews(email);
      if (intRes.success && intRes.interviews) {
        setPastInterviews(intRes.interviews);
      }
    } catch (err) {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const pollInterval = setInterval(fetchDashboardData, 4000);
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => {
      clearInterval(pollInterval);
      clearInterval(clockInterval);
    };
  }, [initialUser?.email]);

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', fontSize: '1.2rem', color: '#1e3a5f' }}>
        <div>Loading Dashboard...</div>
        {slowLoading && <div style={{marginTop: '15px', fontSize: '1rem', color: '#718096'}}>Taking longer than usual? The server might be waking up...</div>}
      </div>
    );
  }

  const user = data?.user || initialUser;
  const summary = data?.summary || {};
  const recentActivity = data?.recent_activity || [];

  const sanitizeDisplay = (val, fallback = 'Not Provided') => {
    if (val === null || val === undefined) return fallback;
    const s = String(val).trim();
    const lower = s.toLowerCase();
    if (lower === '' || lower === 'null' || lower === 'undefined' || lower === 'nan' || lower === 'n/a' || lower === 'na') {
      return fallback;
    }
    return s;
  };

  const displayName = sanitizeDisplay(user?.name || user?.full_name || (user?.email ? user?.email.split('@')[0] : 'User'), 'User');

  const getConfidenceLabel = (score) => {
    if (score === null || score === undefined || isNaN(Number(score))) return 'Moderate Confidence';
    const num = Number(score);
    if (num >= 80) return 'High Confidence';
    if (num >= 60) return 'Moderate Confidence';
    if (num >= 40) return 'Low Confidence';
    return 'Very Low Confidence';
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
      <div className="card" style={{ display: 'flex', gap: '30px', alignItems: 'center', flexWrap: 'wrap', borderLeft: '5px solid #1e3a5f' }}>
        <Avatar name={displayName} email={user?.email} profile_pic={user?.profile_pic} size={100} />
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h1 style={{ margin: '0 0 10px 0', color: '#1e3a5f' }}>Welcome back, {displayName}</h1>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div style={infoRowStyle}><span style={labelStyle}>Email:</span> {sanitizeDisplay(user?.email, 'Not Provided')}</div>
            <div style={infoRowStyle}><span style={labelStyle}>Phone:</span> {sanitizeDisplay(user?.phone, 'Not Provided')}</div>
            <div style={infoRowStyle}><span style={labelStyle}>Role:</span> {sanitizeDisplay(user?.role, 'Software Engineer')}</div>
            <div style={infoRowStyle}><span style={labelStyle}>Last Status:</span> {sanitizeDisplay(summary.latest_interview_status, 'No Interview Yet')}</div>
            <div style={infoRowStyle}><span style={labelStyle}>Score:</span> {summary.latest_interview_score !== null && summary.latest_interview_score !== undefined ? `${summary.latest_interview_score}%` : 'Pending'}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right', borderLeft: '1px solid #edf2f7', paddingLeft: '20px' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e3a5f' }}>
            {currentTime.toLocaleString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#718096' }}>Indian Standard Time</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ background: '#fff', borderBottom: '4px solid #3182ce' }}>
          <h3 style={{ color: '#4a5568', fontSize: '0.9rem', textTransform: 'uppercase' }}>Last Interview</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2d3748', margin: '10px 0' }}>{summary.latest_interview_status || 'No Interview Yet'}</p>
        </div>
        <div className="stat-card" style={{ background: '#fff', borderBottom: '4px solid #e53e3e' }}>
          <h3 style={{ color: '#4a5568', fontSize: '0.9rem', textTransform: 'uppercase' }}>Warnings</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: summary.warnings > 0 ? '#e53e3e' : '#38a169', margin: '10px 0' }}>{summary.warnings || 0}</p>
        </div>
        <div className="stat-card" style={{ background: '#fff', borderBottom: '4px solid #38a169' }}>
          <h3 style={{ color: '#4a5568', fontSize: '0.9rem', textTransform: 'uppercase' }}>Confidence Level</h3>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2d3748', margin: '10px 0' }}>{sanitizeDisplay(summary.confidence_level) !== 'Not Provided' ? summary.confidence_level : getConfidenceLabel(summary.confidence_score)}</p>
        </div>
        <div className="stat-card" style={{ background: '#fff', borderBottom: '4px solid #805ad5' }}>
          <h3 style={{ color: '#4a5568', fontSize: '0.9rem', textTransform: 'uppercase' }}>Notifications</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2d3748', margin: '10px 0' }}>{summary.notifications_count || 0}</p>
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: '40px', background: 'linear-gradient(to right, #ffffff, #f7fafc)' }}>
        <h2 style={{ color: '#1e3a5f' }}>Ready for your next challenge?</h2>
        <p style={{ marginBottom: '2rem', color: '#718096', maxWidth: '600px', margin: '0 auto 2rem' }}>
          Start a proctored AI interview to analyze your skills. Please ensure your camera and microphone are connected.
        </p>
        <Link to="/active-interview" className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '0.8rem 2.5rem', borderRadius: '30px', boxShadow: '0 4px 12px rgba(49, 130, 206, 0.3)' }}>
          Start Interview Now
        </Link>
      </div>

      <div className="card">
        <h3 style={{ color: '#1e3a5f', borderBottom: '2px solid #edf2f7', paddingBottom: '10px', marginBottom: '20px' }}>
          🎓 Your Past & Recent Interviews
        </h3>
        {pastInterviews.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {pastInterviews.map((intv) => (
              <div key={intv.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#f8fafc', padding: '1.5rem', borderRadius: '12px',
                border: '1px solid #edf2f7', flexWrap: 'wrap', gap: '15px'
              }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 'bold', color: '#1e3a5f', fontSize: '1.05rem' }}>
                      {intv.role}
                    </span>
                    <span style={{ background: '#e2e8f0', color: '#4a5568', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      #{intv.id}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#718096', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <span>📅 {intv.created_at ? new Date(intv.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : 'N/A'} (IST)</span>
                    <span>📝 Answered: {intv.answered_count || 0}/30</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#718096', fontWeight: 'bold', textTransform: 'uppercase' }}>STATUS</div>
                    <span style={{
                      padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
                      background: intv.status === 'completed' ? '#dcfce7' : (intv.status === 'failed' || intv.status === 'terminated' ? '#fee2e2' : '#fef3c7'),
                      color: intv.status === 'completed' ? '#166534' : (intv.status === 'failed' || intv.status === 'terminated' ? '#991b1b' : '#d97706')
                    }}>
                      {intv.status}
                    </span>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#718096', fontWeight: 'bold', textTransform: 'uppercase' }}>SCORE</div>
                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1e3a5f' }}>
                      {intv.status === 'completed' ? `${intv.score}%` : 'Pending'}
                    </span>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#718096', fontWeight: 'bold', textTransform: 'uppercase' }}>QUALIFIED</div>
                    <span style={{
                      padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
                      background: intv.qualified === 'Qualified' ? '#d1fae5' : '#fee2e2',
                      color: intv.qualified === 'Qualified' ? '#065f46' : '#991b1b'
                    }}>
                      {intv.qualified}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link to={`/results/${intv.id}`} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.5rem 1.2rem', borderRadius: '20px', textDecoration: 'none' }}>
                      View Details
                    </Link>
                    {intv.status === 'completed' && (
                      <button
                        onClick={() => api.downloadInterviewPDF(intv.id)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.8rem', padding: '0.5rem 1.2rem', borderRadius: '20px', cursor: 'pointer' }}
                      >
                        Download Report
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px', color: '#a0aec0' }}>
            <p>No recent interviews taken yet. Complete an interview to see your detailed reports and scores.</p>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const infoRowStyle = { fontSize: '0.95rem', color: '#4a5568', display: 'flex', gap: '8px' };
const labelStyle = { fontWeight: '700', color: '#1e3a5f', minWidth: '85px' };

export default UserDashboard;
