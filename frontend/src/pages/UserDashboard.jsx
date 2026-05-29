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
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
        <div>Loading Dashboard...</div>
        {slowLoading && <div style={{marginTop: '15px', fontSize: '1rem', color: 'var(--text-secondary)'}}>Taking longer than usual? The server might be waking up...</div>}
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
    <div className="page-fade-in">
      <div className="card" style={{ display: 'flex', gap: '30px', alignItems: 'center', flexWrap: 'wrap', borderLeft: '6px solid var(--accent)', boxShadow: 'var(--card-shadow)' }}>
        <Avatar name={displayName} email={user?.email} profile_pic={user?.profile_pic} size={100} />
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h1 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', fontWeight: '800', letterSpacing: '-0.75px' }}>Welcome back, {displayName}</h1>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div style={infoRowStyle}><span style={labelStyle}>Email:</span> {sanitizeDisplay(user?.email, 'Not Provided')}</div>
            <div style={infoRowStyle}><span style={labelStyle}>Phone:</span> {sanitizeDisplay(user?.phone, 'Not Provided')}</div>
            <div style={infoRowStyle}><span style={labelStyle}>Role:</span> <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{sanitizeDisplay(user?.role, 'Software Engineer')}</span></div>
            <div style={infoRowStyle}><span style={labelStyle}>Last Status:</span> {sanitizeDisplay(summary.latest_interview_status, 'No Interview Yet')}</div>
            <div style={infoRowStyle}><span style={labelStyle}>Score:</span> <strong style={{ color: 'var(--text-primary)' }}>{summary.latest_interview_score !== null && summary.latest_interview_score !== undefined ? `${summary.latest_interview_score}%` : 'Pending'}</strong></div>
          </div>
        </div>
        <div style={{ textAlign: 'right', borderLeft: '1.5px solid var(--border-color)', paddingLeft: '20px' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--accent)', letterSpacing: '-0.5px' }}>
            {currentTime.toLocaleString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Indian Standard Time</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ borderLeft: '4px solid var(--accent)' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Interview</h3>
          <p style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', margin: '10px 0 0 0', letterSpacing: '-0.5px' }}>{summary.latest_interview_status || 'No Interview Yet'}</p>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Warnings</h3>
          <p style={{ fontSize: '1.6rem', fontWeight: '800', color: summary.warnings > 0 ? 'var(--danger)' : 'var(--success)', margin: '10px 0 0 0', letterSpacing: '-0.5px' }}>{summary.warnings || 0}</p>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confidence Level</h3>
          <p style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', margin: '10px 0 0 0', letterSpacing: '-0.5px' }}>{sanitizeDisplay(summary.confidence_level) !== 'Not Provided' ? summary.confidence_level : getConfidenceLabel(summary.confidence_score)}</p>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notifications</h3>
          <p style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', margin: '10px 0 0 0', letterSpacing: '-0.5px' }}>{summary.notifications_count || 0}</p>
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: '50px 40px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(90deg, var(--primary-color) 0%, var(--accent) 100%)' }}></div>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem', letterSpacing: '-0.5px' }}>Ready for your next challenge?</h2>
        <p style={{ marginBottom: '2.25rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2.25rem', fontSize: '1rem', lineHeight: '1.6' }}>
          Start a proctored AI interview to analyze your skills. Please ensure your camera and microphone are connected.
        </p>
        <Link to="/active-interview" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.9rem 3rem', borderRadius: '30px', boxShadow: '0 10px 25px rgba(37, 99, 235, 0.25)' }}>
          Start Interview Now
        </Link>
      </div>

      <div className="card">
        <h3 style={{ color: 'var(--text-primary)', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px' }}>
          🎓 Your Past & Recent Interviews
        </h3>
        {pastInterviews.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {pastInterviews.map((intv) => (
              <div key={intv.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '12px',
                border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '15px'
              }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                      {intv.role}
                    </span>
                    <span style={{ background: 'var(--border-color)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      #{intv.id}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <span>📅 {intv.created_at ? new Date(intv.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : 'N/A'} (IST)</span>
                    <span>📝 Answered: {intv.answered_count || 0}/30</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>STATUS</div>
                    <span className={`badge badge-${intv.status === 'completed' ? 'completed' : (intv.status === 'failed' || intv.status === 'terminated' ? 'terminated' : 'pending')}`}>
                      {intv.status}
                    </span>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>SCORE</div>
                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      {intv.status === 'completed' ? `${intv.score}%` : 'Pending'}
                    </span>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>QUALIFIED</div>
                    <span className={`badge ${intv.qualified === 'Qualified' ? 'badge-completed' : 'badge-terminated'}`}>
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
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
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

const infoRowStyle = { fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', gap: '8px' };
const labelStyle = { fontWeight: '700', color: 'var(--primary-color)', minWidth: '85px' };

export default UserDashboard;

