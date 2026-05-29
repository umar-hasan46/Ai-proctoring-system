import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import API_BASE_URL from '../config/api';


function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Candidate',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const { name, email, phone, role, password, confirmPassword } = formData;

    // Validate all fields are filled
    if (!name || !email || !phone || !role || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    // Validate password and confirm password match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // Build API payload without confirmPassword
      const payload = {
        name,
        email,
        phone,
        role,
        password
      };

      // Calls POST to `${API_BASE_URL}/api/auth/register` (handled by signup in api.js)
      const data = await api.signup(payload);
      if (data.success) {
        setSuccess("Account created successfully! Redirecting to login...");
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      } else {
        setError(data.message || "Signup failed. Please try again.");
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred during signup.");
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
      padding: "40px 20px",
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      zIndex: 999,
      overflowY: "auto"
    }}>
      <main role="main" style={{ width: "100%", maxWidth: "480px", margin: "auto" }}>
        <div className="card" style={{
          padding: "2.5rem 2rem",
          borderRadius: "20px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(12px)",
          color: "#ffffff"
        }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <span style={{ fontSize: "3rem", display: "block", marginBottom: "0.5rem" }}>🛡️</span>
            <h1 style={{ color: "#ffffff", fontSize: "2rem", fontWeight: "800", letterSpacing: "-0.5px", margin: 0 }}>
              Create Account
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: "0.25rem" }}>
              Join the AI Proctoring system
            </p>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: "1.5rem", fontSize: "0.9rem" }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: "1.5rem", fontSize: "0.9rem" }}>{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label htmlFor="name" style={{ color: "#e2e8f0", fontSize: "0.85rem", fontWeight: "600" }}>Name</label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleChange}
                required
                autoComplete="name"
                disabled={loading}
                style={{
                  background: "rgba(2, 6, 23, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#ffffff",
                  marginTop: "0.5rem"
                }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "1rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="email" style={{ color: "#e2e8f0", fontSize: "0.85rem", fontWeight: "600" }}>Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter email"
                  value={formData.email}
                  onChange={handleChange}
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
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="phone" style={{ color: "#e2e8f0", fontSize: "0.85rem", fontWeight: "600" }}>Phone</label>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  autoComplete="tel"
                  disabled={loading}
                  style={{
                    background: "rgba(2, 6, 23, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#ffffff",
                    marginTop: "0.5rem"
                  }}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label htmlFor="role" style={{ color: "#e2e8f0", fontSize: "0.85rem", fontWeight: "600" }}>Role</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '0.95rem',
                  backgroundColor: 'rgba(2, 6, 23, 0.6)',
                  color: '#ffffff',
                  marginTop: '0.5rem'
                }}
              >
                <option value="Candidate">Candidate</option>
                <option value="Admin">Admin</option>
                <option value="Recruiter">Recruiter</option>
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "1.75rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="password" style={{ color: "#e2e8f0", fontSize: "0.85rem", fontWeight: "600" }}>Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Create password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                  style={{
                    background: "rgba(2, 6, 23, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#ffffff",
                    marginTop: "0.5rem"
                  }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="confirmPassword" style={{ color: "#e2e8f0", fontSize: "0.85rem", fontWeight: "600" }}>Confirm</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                  style={{
                    background: "rgba(2, 6, 23, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#ffffff",
                    marginTop: "0.5rem"
                  }}
                />
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
              disabled={loading || !!success}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          <p style={{ marginTop: "1.5rem", textAlign: "center", color: "#94a3b8", fontSize: "0.9rem" }}>
            Already have an account? <Link to="/login" style={{ color: "#60a5fa", fontWeight: "600", textDecoration: "none" }}>Login</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default Signup;

