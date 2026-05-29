import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { api } from "../api/api";

function Login({ onLogin }) {
  const location = useLocation();
  const [role, setRole] = useState(() => {
    return location.pathname === "/admin-login" ? "admin" : "user";
  });
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setRole(location.pathname === "/admin-login" ? "admin" : "user");
  }, [location.pathname]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data =
        role === "admin"
          ? await api.adminLogin(formData)
          : await api.login(formData);

      if (data.success) {
        const userData = {
          id: data.user.id,
          name: data.user.name || data.user.full_name || "",
          email: data.user.email || "",
          phone: data.user.phone || "",
          role: role,
          profile_pic: data.user.profile_pic || null,
          token: data.token
        };

        localStorage.setItem("role", role);
        localStorage.setItem("userRole", data.user?.role || data.role || role || "user");
        localStorage.setItem("userId", data.user?.id || data.userId || "");
        localStorage.setItem("email", userData.email);
        localStorage.setItem("userEmail", userData.email);
        localStorage.setItem("userName", userData.name);
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("token", data.token || "mock-token-fallback");

        onLogin(userData);

        if (role === "admin") {
          navigate("/admin/dashboard", { replace: true });
        } else {
          navigate("/user/dashboard", { replace: true });
        }
      } else {
        setError(data.message || "Invalid credentials. Please try again.");
      }
    } catch (err) {
      if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("NetworkError"))) {
        setError("Backend connection failed. Please check Render backend service.");
      } else {
        setError(err.message || "Login failed. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(circle at top right, #1e3a8a 0%, #020617 60%, #000000 100%)",
      padding: "20px",
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      zIndex: 999,
      overflowY: "auto"
    }}>
      <main role="main" className="page-fade-in" style={{ width: "100%", maxWidth: "450px" }}>
        <div className="card glass-card" style={{
          padding: "3rem 2.25rem",
          borderRadius: "24px",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(37, 99, 235, 0.15)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          background: "rgba(10, 15, 30, 0.8)",
          backdropFilter: "blur(20px)",
          color: "#ffffff"
        }}>
          <div style={{ textAlign: "center", marginBottom: "2.25rem" }}>
            <span style={{ fontSize: "3.5rem", display: "block", marginBottom: "0.5rem", filter: "drop-shadow(0 0 10px rgba(37,99,235,0.4))" }}>🛡️</span>
            <h1 style={{ color: "#ffffff", fontSize: "2.25rem", fontWeight: "800", letterSpacing: "-1px", margin: 0 }}>
              AI Proctoring
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "0.95rem", marginTop: "0.5rem", fontWeight: "500" }}>
              Secure Online Examination & Monitoring
            </p>
          </div>

          <div style={{
            display: "flex",
            background: "rgba(2, 6, 23, 0.7)",
            padding: "5px",
            borderRadius: "12px",
            marginBottom: "2rem",
            border: "1px solid rgba(255, 255, 255, 0.08)"
          }}>
            <button
              type="button"
              className="btn"
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "8px",
                fontSize: "0.9rem",
                background: role === "user" ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "transparent",
                color: "#ffffff",
                boxShadow: role === "user" ? "0 4px 12px rgba(37, 99, 235, 0.25)" : "none"
              }}
              onClick={() => { setRole("user"); setError(""); }}
            >
              Candidate
            </button>
            <button
              type="button"
              className="btn"
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "8px",
                fontSize: "0.9rem",
                background: role === "admin" ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "transparent",
                color: "#ffffff",
                boxShadow: role === "admin" ? "0 4px 12px rgba(37, 99, 235, 0.25)" : "none"
              }}
              onClick={() => { setRole("admin"); setError(""); }}
            >
              Administrator
            </button>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: "1.5rem", fontSize: "0.9rem", borderLeft: "4px solid var(--danger)" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: "1.25rem" }}>
              <label htmlFor="email" style={{ color: "#cbd5e1", fontSize: "0.85rem", fontWeight: "600" }}>Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                autoComplete="email"
                disabled={loading}
                style={{
                  background: "rgba(2, 6, 23, 0.5)",
                  border: "1.5px solid rgba(255, 255, 255, 0.1)",
                  color: "#ffffff",
                  marginTop: "0.5rem",
                  height: "46px"
                }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: "2rem", position: "relative" }}>
              <label htmlFor="password" style={{ color: "#cbd5e1", fontSize: "0.85rem", fontWeight: "600" }}>Password</label>
              <div style={{ position: "relative", marginTop: "0.5rem" }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  style={{
                    background: "rgba(2, 6, 23, 0.5)",
                    border: "1.5px solid rgba(255, 255, 255, 0.1)",
                    color: "#ffffff",
                    paddingRight: "45px",
                    height: "46px"
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                    fontSize: "1.2rem",
                    padding: "4px"
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "👁️" : "🙈"}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: "100%",
                height: "48px",
                fontSize: "1rem",
                borderRadius: "12px",
                fontWeight: "700"
              }}
              disabled={loading}
            >
              {loading ? "Authenticating..." : "Sign In"}
            </button>
          </form>

          <div style={{ marginTop: "1.75rem", textAlign: "center" }}>
            {role === "user" ? (
              <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                New user? <Link to="/signup" style={{ color: "#38bdf8", fontWeight: "600", textDecoration: "none" }}>Create an account</Link>
              </p>
            ) : (
              <div style={{ background: "rgba(2,6,23,0.5)", padding: "10px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p style={{ color: "#cbd5e1", fontSize: "0.85rem", margin: 0 }}>
                  Default Admin: <strong style={{ color: "#38bdf8" }}>admin@gmail.com / admin123</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Login;

