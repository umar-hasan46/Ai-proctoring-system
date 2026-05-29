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
      background: "linear-gradient(135deg, #020617 0%, #0f172a 40%, #1e3a8a 100%)",
      padding: "20px",
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      zIndex: 999
    }}>
      <main role="main" style={{ width: "100%", maxWidth: "450px" }}>
        <div className="card" style={{
          padding: "2.5rem 2rem",
          borderRadius: "20px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(12px)",
          color: "#ffffff"
        }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <span style={{ fontSize: "3rem", display: "block", marginBottom: "0.5rem" }}>🛡️</span>
            <h1 style={{ color: "#ffffff", fontSize: "2rem", fontWeight: "800", letterSpacing: "-0.5px", margin: 0 }}>
              AI Proctoring
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: "0.25rem" }}>
              Secure Online Examination & Monitoring
            </p>
          </div>

          <div style={{
            display: "flex",
            background: "rgba(2, 6, 23, 0.6)",
            padding: "4px",
            borderRadius: "10px",
            marginBottom: "2rem",
            border: "1px solid rgba(255, 255, 255, 0.05)"
          }}>
            <button
              type="button"
              className={`btn`}
              style={{
                flex: 1,
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "0.9rem",
                background: role === "user" ? "#2563eb" : "transparent",
                color: "#ffffff"
              }}
              onClick={() => { setRole("user"); setError(""); }}
            >
              Candidate
            </button>
            <button
              type="button"
              className={`btn`}
              style={{
                flex: 1,
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "0.9rem",
                background: role === "admin" ? "#2563eb" : "transparent",
                color: "#ffffff"
              }}
              onClick={() => { setRole("admin"); setError(""); }}
            >
              Administrator
            </button>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: "1.5rem", fontSize: "0.9rem" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: "1.25rem" }}>
              <label htmlFor="email" style={{ color: "#e2e8f0", fontSize: "0.85rem", fontWeight: "600" }}>Email Address</label>
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
                  background: "rgba(2, 6, 23, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#ffffff",
                  marginTop: "0.5rem"
                }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: "1.75rem", position: "relative" }}>
              <label htmlFor="password" style={{ color: "#e2e8f0", fontSize: "0.85rem", fontWeight: "600" }}>Password</label>
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
                    background: "rgba(2, 6, 23, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#ffffff",
                    paddingRight: "45px"
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
                    fontSize: "1.1rem",
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
              className="btn"
              style={{
                width: "100%",
                height: "48px",
                fontSize: "1rem",
                background: "#2563eb",
                color: "#ffffff",
                borderRadius: "10px",
                fontWeight: "700"
              }}
              disabled={loading}
            >
              {loading ? "Authenticating..." : "Login"}
            </button>
          </form>

          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            {role === "user" ? (
              <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                New user? <Link to="/signup" style={{ color: "#60a5fa", fontWeight: "600", textDecoration: "none" }}>Create an account</Link>
              </p>
            ) : (
              <p className="hint" style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                Default Admin: <strong>admin@gmail.com / admin123</strong>
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Login;

