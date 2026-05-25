import React, { useState, useEffect } from 'react';
import { api } from '../api/api';

function Notifications({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userId = user?.id || localStorage.getItem("userId") || "";
      const userRole = user?.role || localStorage.getItem("userRole") || "";
      const token = localStorage.getItem("token") || "";
      const API_BASE_URL = import.meta.env.VITE_API_URL || "https://ai-proctoring-backend-5t3k.onrender.com";

      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "",
          "X-User-Id": userId,
          "X-User-Role": userRole
        }
      });
      const data = await res.json();
      
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 3000);
    return () => clearInterval(interval);
  }, [user?.email, user?.role]);

  const markRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      fetchNotifications();
    } catch (err) {
      
    }
  };

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead(user.email, user.role);
      fetchNotifications();
    } catch (err) {
      
    }
  };

  const clearRead = async () => {
    try {
      await api.clearReadNotifications(user.email, user.role);
      fetchNotifications();
    } catch (err) {
      
    }
  };

  if (loading && notifications.length === 0) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
      <div className="card" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ color: '#1e3a5f', margin: 0 }}>System Notifications</h2>
          <p style={{ margin: '5px 0 0', color: '#718096' }}>Real-time alerts and updates.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {unreadCount > 0 && <button onClick={markAllRead} className="btn btn-outline" style={{ fontSize: '0.8rem' }}>Mark All Read</button>}
          <button onClick={clearRead} className="btn btn-outline" style={{ fontSize: '0.8rem' }}>Clear Read</button>
        </div>
      </div>

      {notifications.length > 0 ? (
        notifications.map(n => (
          <div key={n.id} className="card" style={{
            padding: '1.5rem',
            marginBottom: '1rem',
            borderLeft: `5px solid ${n.type === 'success' ? '#10b981' : (n.type === 'info' ? '#3b82f6' : (n.type === 'warning' ? '#f59e0b' : (n.type === 'error' ? '#ef4444' : '#64748b')))}`,
            background: n.status === 'unread' ? '#f7fafc' : '#fff',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: '#edf2f7', color: '#4a5568' }}>
                    {n.event_type || 'Notification'}
                  </span>
                  {n.status === 'unread' && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e53e3e' }}></span>}
                </div>
                <h4 style={{ margin: '5px 0', color: '#2d3748' }}>{n.title}</h4>
                <p style={{ margin: '8px 0', color: '#4a5568', lineHeight: '1.5' }}>{n.message}</p>
                
                {(n.candidate_name || n.candidate_email || n.interview_id) && (
                  <div style={{ fontSize: '0.8rem', background: 'rgba(0,0,0,0.03)', padding: '8px', borderRadius: '4px', margin: '10px 0', display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                    {n.candidate_name && <span><strong>Student:</strong> {n.candidate_name}</span>}
                    {n.candidate_email && <span><strong>Email:</strong> {n.candidate_email}</span>}
                    {n.interview_id && <span><strong>ID:</strong> #{n.interview_id}</span>}
                  </div>
                )}

                <div style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: 'bold', marginTop: '5px' }}>
                  🕒 {n.created_at_ist} (IST)
                </div>
              </div>
              {n.status === 'unread' && (
                <button
                  onClick={() => markRead(n.id)}
                  className="btn btn-outline"
                  style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem', whiteSpace: 'nowrap' }}
                >
                  Mark as Read
                </button>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: '#a0aec0' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔔</div>
          <h3>No notifications available yet.</h3>
          <p>We'll notify you here when there's an update.</p>
        </div>
      )}
    </div>
  );
}

export default Notifications;

