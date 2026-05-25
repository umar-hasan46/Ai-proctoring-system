import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Signup";
import Dashboard from "./pages/UserDashboard";
import ActiveInterview from "./pages/ActiveInterview";
import Results from "./pages/Results";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";
import LiveProctoring from "./pages/LiveProctoring";
import Reports from "./pages/AllResults";
import StudentsDashboard from "./pages/StudentsDashboard";
import AdminNotifications from "./pages/Notifications";
import AdminSettings from "./pages/Settings";
import Navbar from "./components/Navbar";
import RegisterInterview from "./pages/RegisterInterview";
import ProtectedRoute from "./components/ProtectedRoute";
import AIChatbot from "./components/AIChatbot";
import { api } from "./api/api";

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: "" }; }
  static getDerivedStateFromError(e) { return { hasError: true, error: e.message }; }
  componentDidCatch(e, info) { console.error("ErrorBoundary:", e, info); }
  render() {
    if (this.state.hasError) return (
      <div style={{padding:40,textAlign:"center"}}>
        <h3 style={{color:"#dc2626"}}>Error: {this.state.error}</h3>
        <button onClick={() => { this.setState({hasError:false}); window.history.back(); }} style={{marginTop: 16, padding: "8px 20px", background: "#1a56db", color: "white", border: "none", borderRadius: 8, cursor: "pointer"}}>Go Back</button>
      </div>
    );
    return this.props.children;
  }
}

const wrap = (role, Component, user, onUpdate) => (
  <ProtectedRoute allowedRole={role} role={role}>
    <ErrorBoundary>
      <Component user={user} onUpdate={onUpdate} />
    </ErrorBoundary>
  </ProtectedRoute>
);

function App() {
  const [user, setUser] = React.useState(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
    return null;
  });

  const handleLogin = (userData) => {
    const standardizedUser = {
      id: userData.id,
      name: userData.name || userData.full_name || "",
      email: userData.email || "",
      phone: userData.phone || "",
      role: userData.role || "user",
      profile_pic: userData.profile_pic || null
    };
    setUser(standardizedUser);
    localStorage.setItem("user", JSON.stringify(standardizedUser));
    localStorage.setItem("role", standardizedUser.role);
    localStorage.setItem("email", standardizedUser.email);
    if (userData.token) {
      localStorage.setItem("token", userData.token);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.clear();
    sessionStorage.clear();
  };

  const [toast, setToast] = React.useState(null);
  const shownNotifIds = React.useRef(new Set());

  React.useEffect(() => {
    let interval;
    if (user) {
      interval = setInterval(async () => {
        try {
          const email = user?.email || localStorage.getItem("email");
          if (!email) return;

          const res = user.role === 'admin'
            ? await api.getAdminNotifications()
            : await api.getUserNotifications(email);

          if (res.success && res.notifications?.length > 0) {
            const latest = res.notifications[0];
            if (!shownNotifIds.current.has(latest.id)) {
              shownNotifIds.current.add(latest.id);
              if (latest.status === 'unread') {
                setToast(latest);
                setTimeout(() => setToast(null), 6000);
              }
            }
          }
        } catch (err) {}
      }, 7000);
    }
    return () => interval && clearInterval(interval);
  }, [user]);

  return (
    <>
      {user && <Navbar user={user} onLogout={handleLogout} />}

      {toast && (
        <div className="toast-container" style={{
          position: 'fixed', top: '90px', right: '24px', background: '#fff', padding: '16px 24px',
          borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          borderLeft: `6px solid ${toast.type === 'error' ? '#e53e3e' : (toast.type === 'warning' ? '#d69e2e' : '#3182ce')}`,
          zIndex: 9999, maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '4px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, color: '#1e3a5f', fontSize: '1rem' }}>{toast.title}</h4>
            <span style={{ fontSize: '0.7rem', color: '#a0aec0' }}>{toast.created_at_ist}</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#4a5568', lineHeight: '1.4' }}>{toast.message}</p>
          <button onClick={() => setToast(null)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e0', fontSize: '14px' }}>✕</button>
        </div>
      )}

      <div className="container">
        <Routes>
          <Route path="/" element={user ? (user.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/dashboard" replace />) : <Login onLogin={handleLogin} />} />
          <Route path="/login" element={user ? (user.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/dashboard" replace />) : <Login onLogin={handleLogin} />} />
          <Route path="/register" element={wrap("user", RegisterInterview, user)} />
          
          <Route path="/dashboard" element={wrap("user", Dashboard, user)} />
          <Route path="/active-interview" element={wrap("user", ActiveInterview, user)} />
          <Route path="/results" element={wrap("user", Results, user)} />
          <Route path="/results/:id" element={wrap("user", Results, user)} />
          <Route path="/notifications" element={wrap("user", Notifications, user)} />
          <Route path="/settings" element={wrap("user", Settings, user, handleLogin)} />
          
          <Route path="/admin/dashboard" element={wrap("admin", AdminDashboard, user)} />
          <Route path="/admin/live-proctoring" element={wrap("admin", LiveProctoring, user)} />
          <Route path="/admin/reports" element={wrap("admin", Reports, user)} />
          <Route path="/admin/students-dashboard" element={wrap("admin", StudentsDashboard, user)} />
          <Route path="/admin/notifications" element={wrap("admin", AdminNotifications, user)} />
          <Route path="/admin/settings" element={wrap("admin", AdminSettings, user, handleLogin)} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <AIChatbot user={user} />
    </>
  );
}

export default App;
