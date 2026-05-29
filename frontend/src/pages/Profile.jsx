import React, { useState, useEffect } from 'react';
import { api } from '../api/api';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api';

function Profile({ user: propUser }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();


  const getStoredUser = () => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      localStorage.removeItem("user");
      return null;
    }
  };

  const user = propUser || getStoredUser();
  const email = user?.email || localStorage.getItem("email") || "";

  useEffect(() => {
    if (!email) {
      setLoading(false);
      return;
    }
    fetchProfile();
  }, [email]);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getProfile(email);
      if (res.success) {
        setProfile(res.data);
      } else {
        setError(res.message || "Failed to load profile.");
      }
    } catch (err) {
      setError("Could not connect to server. Please try again.");
      
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center', padding: '50px' }}>
        <h2 style={{ color: '#e53e3e' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Please login again to view your profile.</p>
        <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/login')}>Go to Login</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: '800px', margin: '100px auto', textAlign: 'center', padding: '50px' }}>
        <div className="spinner"></div>
        <h3 style={{ color: 'var(--text-primary)', marginTop: '20px' }}>Loading profile...</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Synchronizing your secure data.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center', padding: '50px' }}>
        <h2 style={{ color: '#e53e3e' }}>Error</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={fetchProfile}>Try Again</button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card" style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center', padding: '50px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>👤</div>
        <h2 style={{ color: 'var(--text-primary)' }}>Profile Not Found</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Profile information is not available yet.</p>
        <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
      </div>
    );
  }

  const defaultAvatar = "https://ui-avatars.com/api/?name=" + (profile.name || "User") + "&background=1e3a5f&color=fff&size=150";

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
      <div className="card" style={{ padding: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', borderRadius: '20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '150px', background: 'linear-gradient(135deg, var(--text-primary) 0%, #3182ce 100%)', zIndex: 1 }}></div>

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', marginTop: '50px' }}>
          <div style={{ display: 'inline-block', position: 'relative' }}>
            <img
              src={profile.profile_pic ? (profile.profile_pic.startsWith('http') ? profile.profile_pic : `${API_BASE_URL}${profile.profile_pic}`) : defaultAvatar}
              alt="User Profile Picture"
              width="180"
              height="180"
              loading="lazy"
              onError={(e) => { e.target.src = defaultAvatar; }}
              style={{ width: '180px', height: '180px', borderRadius: '50%', objectFit: 'cover', border: '8px solid #fff', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', background: '#fff' }}
            />
          </div>

          <h1 style={{ color: 'var(--text-primary)', marginTop: '20px', marginBottom: '5px', fontSize: '2.5rem' }}>{profile.name || 'N/A'}</h1>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
            <span style={{ background: '#eef2ff', color: '#4f46e5', padding: '5px 15px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
              {profile.role || 'N/A'}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>•</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Member since {profile.created_at_ist || 'N/A'}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '3rem' }}>
          {}
          <div className="card" style={{ background: 'var(--bg-primary)', border: '1px solid #e2e8f0' }}>
            <h3 style={{ color: 'var(--text-primary)', marginTop: 0, borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📧 Contact Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
                <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '1.1rem' }}>{profile.email || 'N/A'}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone Number</label>
                <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '1.1rem' }}>{profile.phone || 'N/A'}</div>
              </div>
            </div>
          </div>

          {}
          <div className="card" style={{ background: 'var(--bg-primary)', border: '1px solid #e2e8f0' }}>
            <h3 style={{ color: 'var(--text-primary)', marginTop: 0, borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📊 Interview Activity
            </h3>
            {profile.role !== 'Admin' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Latest Status</label>
                  <div style={{ fontWeight: '600', color: profile.latest_interview_status === 'completed' ? '#059669' : '#d97706', fontSize: '1.1rem' }}>
                    {(profile.latest_interview_status || 'N/A').toUpperCase()}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Performance Score</label>
                  <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '1.8rem' }}>{profile.latest_score || 'N/A'}</div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '10px' }}>
                <p style={{ color: 'var(--text-secondary)', margin: '5px 0' }}>✅ System Administrator</p>
                <p style={{ color: 'var(--text-secondary)', margin: '5px 0' }}>✅ Live Proctoring Access</p>
                <p style={{ color: 'var(--text-secondary)', margin: '5px 0' }}>✅ User Performance Oversight</p>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: '30px', textAlign: 'center' }}>
          <button className="btn btn-primary" onClick={() => navigate('/settings')} style={{ padding: '12px 30px', borderRadius: '10px' }}>Edit Profile Settings</button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
