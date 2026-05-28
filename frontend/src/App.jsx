import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";

import Login from "./pages/Login";
const Register = React.lazy(() => import("./pages/Signup"));
const Dashboard = React.lazy(() => import("./pages/UserDashboard"));
const ActiveInterview = React.lazy(() => import("./pages/ActiveInterview"));
const Results = React.lazy(() => import("./pages/Results"));
const Notifications = React.lazy(() => import("./pages/Notifications"));
const Settings = React.lazy(() => import("./pages/Settings"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const LiveProctoring = React.lazy(() => import("./pages/LiveProctoring"));
const Reports = React.lazy(() => import("./pages/AllResults"));
const StudentsDashboard = React.lazy(() => import("./pages/StudentsDashboard"));
const RegisterInterview = React.lazy(() => import("./pages/RegisterInterview"));

const AdminNotifications = Notifications;
const AdminSettings = Settings;

const Navbar = React.lazy(() => import("./components/Navbar"));
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
const AIChatbot = React.lazy(() => import("./components/AIChatbot"));
import { api } from "./api/api";
import API_BASE_URL from "./config/api";


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

const userWrap = (Component, user, onUpdate) => (
  <ProtectedRoute>
    <ErrorBoundary>
      <Component user={user} onUpdate={onUpdate} />
    </ErrorBoundary>
  </ProtectedRoute>
);

const adminWrap = (Component, user, onUpdate) => (
  <AdminProtectedRoute>
    <ErrorBoundary>
      <Component user={user} onUpdate={onUpdate} />
    </ErrorBoundary>
  </AdminProtectedRoute>
);

function App() {
  const [user, setUser] = React.useState(() => {
    const savedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (savedUser && token) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Ensure role in user matches localStorage role to prevent infinite redirect loops
        const localRole = localStorage.getItem("role");
        if (localRole && parsedUser.role !== localRole) {
          parsedUser.role = localRole;
        }
        return parsedUser;
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
    const timer = setTimeout(() => {
      api.checkHealth()
        .then(res => console.log("Backend health check:", res))
        .catch(err => {
          console.error("Backend not connected. Please check Render backend service.", err);
        });
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

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
      <React.Suspense fallback={null}>
        {user && <Navbar user={user} onLogout={handleLogout} />}
      </React.Suspense>

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
          <button onClick={() => setToast(null)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#718096', fontSize: '14px' }} aria-label="Close Toast">✕</button>
        </div>
      )}

      <div className="container">
        <React.Suspense fallback={
          <div className="card" style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center', padding: '3rem' }}>
            <h3 style={{ color: '#1e3a5f' }}>Loading...</h3>
            <p style={{ color: '#718096', marginTop: '10px' }}>Preparing component resources...</p>
          </div>
        }>
          <Routes>
            <Route path="/" element={user ? (user.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/user/dashboard" replace />) : <Login onLogin={handleLogin} />} />
            <Route path="/login" element={user ? (user.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/user/dashboard" replace />) : <Login onLogin={handleLogin} />} />
            <Route path="/admin-login" element={user ? (user.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/user/dashboard" replace />) : <Login onLogin={handleLogin} />} />
            <Route path="/signup" element={<Register />} />
            
            <Route path="/user/dashboard" element={userWrap(Dashboard, user)} />
            <Route path="/dashboard" element={<Navigate to="/user/dashboard" replace />} />
            
            <Route path="/register" element={userWrap(RegisterInterview, user)} />
            <Route path="/active-interview" element={userWrap(ActiveInterview, user)} />
            <Route path="/results" element={userWrap(Results, user)} />
            <Route path="/results/:interviewId" element={userWrap(Results, user)} />
            <Route path="/notifications" element={userWrap(Notifications, user)} />
            <Route path="/settings" element={userWrap(Settings, user, handleLogin)} />
            
            <Route path="/admin/dashboard" element={adminWrap(AdminDashboard, user)} />
            <Route path="/admin/live-proctoring" element={adminWrap(LiveProctoring, user)} />
            <Route path="/admin/reports" element={adminWrap(Reports, user)} />
            <Route path="/admin/recent-interviews" element={adminWrap(StudentsDashboard, user)} />
            <Route path="/admin/users" element={adminWrap(StudentsDashboard, user)} />
            <Route path="/admin/notifications" element={adminWrap(AdminNotifications, user)} />
            <Route path="/admin/settings" element={adminWrap(AdminSettings, user, handleLogin)} />
            
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </React.Suspense>
      </div>
      <React.Suspense fallback={null}>
        {user && <AIChatbot user={user} />}
      </React.Suspense>
    </>
  );
}

export default App;
