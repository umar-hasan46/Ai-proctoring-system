import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import NotificationBell from "./NotificationBell";
import Avatar from "./Avatar";

const Navbar = React.memo(function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = React.useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  const handleLogoutClick = () => {
    localStorage.clear();
    sessionStorage.clear();
    if (onLogout) onLogout();
    navigate('/login', { replace: true });
  };

  const isActive = (path) => {
    if (path === '/user/dashboard' && location.pathname === '/dashboard') return true;
    return location.pathname === path;
  };

  const navLinkStyle = (path) => ({
    color: '#fff',
    textDecoration: 'none',
    padding: '0.6rem 1.1rem',
    borderRadius: '8px',
    background: isActive(path) ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
    border: isActive(path) ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
    transition: 'var(--transition-smooth)',
    fontWeight: '600',
    fontSize: '0.9rem'
  });

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.9rem 2.5rem',
      background: 'var(--navbar-bg)',
      color: '#fff',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      borderBottom: '1px solid var(--border-color)',
      transition: 'var(--transition-smooth)'
    }}>
      <div style={{ fontSize: '1.4rem', fontWeight: 'bold', letterSpacing: '1px' }}>
        <Link to="/dashboard" style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.8rem' }}>🛡️</span> AI PROCTOR
        </Link>
      </div>
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        {user?.role === 'admin' ? (
          <>
            <Link to="/admin/dashboard" style={navLinkStyle('/admin/dashboard')}>Dashboard</Link>
            <Link to="/admin/live-proctoring" style={navLinkStyle('/admin/live-proctoring')}>Live Proctoring</Link>
            <Link to="/admin/recent-interviews" style={navLinkStyle('/admin/recent-interviews')}>Recent Interviews</Link>
            <Link to="/admin/users" style={navLinkStyle('/admin/users')}>Users</Link>
            <Link to="/admin/notifications" style={navLinkStyle('/admin/notifications')}>Notifications</Link>
            <Link to="/admin/settings" style={navLinkStyle('/admin/settings')}>Settings</Link>
          </>
        ) : (
          <>
            <Link to="/user/dashboard" style={navLinkStyle('/user/dashboard')}>Dashboard</Link>
            <Link to="/register" style={navLinkStyle('/register')}>Register</Link>
            <Link to="/active-interview" style={navLinkStyle('/active-interview')}>Start Interview</Link>
            <Link to="/results" style={navLinkStyle('/results')}>Results</Link>
            <Link to="/notifications" style={navLinkStyle('/notifications')}>Notifications</Link>
            <Link to="/settings" style={navLinkStyle('/settings')}>Settings</Link>
          </>
        )}
        <div style={{ margin: '0 10px', height: '24px', width: '1px', background: 'rgba(255,255,255,0.2)' }}></div>
        <button
          onClick={toggleTheme}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '1.2rem',
            cursor: 'pointer',
            padding: '0.4rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
            marginRight: '8px',
          }}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <NotificationBell user={user} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '10px' }}>
          <Avatar
            name={user?.name && user?.name !== 'N/A' ? user?.name : (user?.full_name && user?.full_name !== 'N/A' ? user?.full_name : (user?.email ? user?.email.split('@')[0] : 'User'))}
            email={user?.email}
            profile_pic={user?.profile_pic}
            size={32}
          />
          {user?.role && (
            <span style={{ color: '#fff', marginLeft: '8px', fontSize: '0.9rem' }}>{user.role}</span>
          )}
          <button
            onClick={handleLogoutClick}
            className="btn"
            style={{
              background: '#e53e3e',
              color: '#fff',
              border: 'none',
              padding: '0.5rem 1.2rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem'
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
});

export default Navbar;
