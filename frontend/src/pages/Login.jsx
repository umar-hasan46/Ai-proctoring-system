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
  const [backendStatus, setBackendStatus] = useState("online");
  const navigate = useNavigate();

  useEffect(() => {
    setRole(location.pathname === "/admin-login" ? "admin" : "user");
  }, [location.pathname]);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const health = await api.checkHealth();
        if (health.success) {
          setBackendStatus("online");
        } else {
          setBackendStatus("offline");
        }
      } catch (err) {
        setBackendStatus("offline");
      }
    };
    const timer = setTimeout(checkBackend, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (backendStatus === "offline") {
      setError("Backend connection failed. Please check Render backend service.");
      return;
    }

    if (backendStatus === "checking") {
      setError("Still checking backend status... Please wait a moment.");
      return;
    }

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
    <div style={{ maxWidth: "450px", margin: "100px auto" }} className="card">
      <h1 style={{ textAlign: "center", color: "#1e3a5f", marginBottom: "1.5rem" }}>
        AI Proctoring System
      </h1>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
        <button
          className={`btn ${role === "user" ? "btn-primary" : "btn-outline"}`}
          style={{ flex: 1 }}
          onClick={() => { setRole("user"); setError(""); }}
        >
          User Login
        </button>
        <button
          className={`btn ${role === "admin" ? "btn-primary" : "btn-outline"}`}
          style={{ flex: 1 }}
          onClick={() => { setRole("admin"); setError(""); }}
        >
          Admin Login
        </button>
      </div>

      {/* Backend connection warning will be shown in error state on login attempt */}

      {error && <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email Address</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            autoComplete="email"
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            autoComplete="current-password"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: "100%", height: "45px", fontSize: "1rem" }}
          disabled={loading || backendStatus === "checking"}
        >
          {backendStatus === "checking" ? "Checking Server..." : (loading ? "Authenticating..." : "Login")}
        </button>
      </form>

      <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
        {role === "user" ? (
          <p>
            New user? <Link to="/signup">Create an account</Link>
          </p>
        ) : (
          <p className="hint" style={{ color: "#718096", fontSize: "0.85rem" }}>
            Default Admin: <strong>admin@gmail.com / admin123</strong>
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;
