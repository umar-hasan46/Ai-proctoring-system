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
    <div style={{ maxWidth: '450px', margin: '50px auto' }} className="card">
      <h2 style={{ textAlign: 'center', color: '#1e3a5f', marginBottom: '1.5rem' }}>Create Account</h2>

      {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '1.5rem', background: '#dcfce7', color: '#166534', padding: '15px', borderRadius: '8px' }}>{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Name</label>
          <input
            name="name"
            type="text"
            placeholder="Enter your name"
            value={formData.name}
            onChange={handleChange}
            required
            autoComplete="name"
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            name="email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete="email"
            disabled={loading}
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
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label>Role</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e0',
              fontSize: '1rem',
              backgroundColor: '#fff'
            }}
          >
            <option value="Candidate">Candidate</option>
            <option value="Admin">Admin</option>
            <option value="Recruiter">Recruiter</option>
          </select>
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            name="password"
            type="password"
            placeholder="Create password"
            value={formData.password}
            onChange={handleChange}
            required
            autoComplete="new-password"
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label>Confirm Password</label>
          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            autoComplete="new-password"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', height: '45px', fontSize: '1rem', marginTop: '1rem' }}
          disabled={loading || !!success}
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
      <p style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}

export default Signup;
