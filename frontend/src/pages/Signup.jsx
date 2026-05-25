import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/api';

function Signup() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const navigate = useNavigate();

  useEffect(() => {
    const checkBackend = async () => {
      try {
        await api.checkHealth();
        setBackendStatus("online");
      } catch (err) {
        setBackendStatus("offline");
        setError("Backend connection failed. Please check Render backend service.");
      }
    };
    checkBackend();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (backendStatus === "offline") {
      setError("Backend connection failed. Please check Render backend service.");
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await api.signup(formData);
      if (data.success) {
        setSuccess("Account created successfully! Redirecting to login...");
        setTimeout(() => navigate('/login', { replace: true }), 2500);
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
    <div style={{ maxWidth: '450px', margin: '50px auto' }} className="card">
      <h2 style={{ textAlign: 'center', color: '#1e3a5f', marginBottom: '1.5rem' }}>Create User Account</h2>

      {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '1.5rem', background: '#dcfce7', color: '#166534', padding: '15px', borderRadius: '8px' }}>{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Full Name</label>
          <input
            name="full_name"
            type="text"
            placeholder="Enter your full name"
            value={formData.full_name}
            onChange={handleChange}
            required
            autoComplete="name"
          />
        </div>
        <div className="form-group">
          <label>Email Address</label>
          <input
            name="email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <label>Phone Number</label>
          <input
            name="phone"
            type="text"
            placeholder="Enter your phone number"
            value={formData.phone}
            onChange={handleChange}
            required
            autoComplete="tel"
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            name="password"
            type="password"
            placeholder="Create a strong password"
            value={formData.password}
            onChange={handleChange}
            required
            autoComplete="new-password"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', height: '45px', fontSize: '1rem' }}
          disabled={loading || backendStatus === "checking" || !!success}
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>
      <p style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
}

export default Signup;
