import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/api';

const NotificationBell = React.memo(function NotificationBell({ user }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = async () => {
    if (!user) return;
    try {
      const res = user.role === 'admin'
        ? await api.getAdminUnreadCount('admin')
        : await api.getUnreadCount(user.email);
      
      if (res.success) {
        setUnreadCount(res.unread_count || 0);
      }
    } catch (err) {
      
    }
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 4000);
    return () => clearInterval(interval);
  }, [user?.email, user?.role]);

  if (!user) return null;

  return (
    <Link to={user.role === 'admin' ? '/admin/notifications' : '/notifications'} style={{ position: 'relative', marginLeft: '1.5rem' }} aria-label="Notifications">
      🔔
      {unreadCount > 0 && (
        <span style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          background: '#e53e3e',
          color: 'white',
          borderRadius: '50%',
          padding: '2px 6px',
          fontSize: '0.7rem'
        }}>
          {unreadCount}
        </span>
      )}
    </Link>
  );
});

export default NotificationBell;

