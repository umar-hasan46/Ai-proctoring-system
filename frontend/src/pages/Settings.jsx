import React, { useState, useEffect } from 'react';
import { api } from '../api/api';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';

function Settings({ user: propUser, onUpdate }) {
  const navigate = useNavigate();

  const getStoredUser = () => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      localStorage.removeItem("user");
      return null;
    }
  };

  const user = propUser || getStoredUser();


  const [formData, setFormData] = useState({
    full_name: user?.full_name || user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: ''
  });
  const [adminSettings, setAdminSettings] = useState({
    emailAlerts: true,
    securityFlags: true,
    maintenanceMode: false,
    autoEvaluate: true,
    tabSwitchDetection: true,
    faceDetection: true,
    audioMonitoring: true
  });
  const [profilePic, setProfilePic] = useState(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      return storedUser.profilePic || storedUser.profile_pic || "";
    } catch {
      return "";
    }
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  useEffect(() => {
    if (user) {
        setFormData({
            full_name: user.full_name || user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            password: ''
        });
    }
  }, [user]);

  if (!user) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center', padding: '50px' }}>
        <h2 style={{ color: '#e53e3e' }}>Access Denied</h2>
        <p style={{ color: '#718096' }}>Please login again to change settings.</p>
        <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/login')}>Go to Login</button>
      </div>
    );
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ text: 'File size exceeds 2MB limit.', type: 'error' });
        return;
      }
      setProfilePic(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePic = async () => {
    setShowRemoveConfirm(false);
    setLoading(true);
    try {
      const res = await api.updateProfile({
        ...formData,
        old_email: user.email,
        role: user.role,
        profile_pic: null
      });
      if (res.success) {
        const updatedUser = { ...user, profile_pic: null };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        if (onUpdate) onUpdate(updatedUser);
        setPreviewUrl(null);
        setProfilePic(null);
        setMessage({ text: 'Profile picture removed successfully.', type: 'success' });
      }
    } catch (err) {
      setMessage({ text: 'Could not remove profile picture.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      if (profilePic) {
        const picData = new FormData();
        picData.append('image', profilePic);
        picData.append('email', user.email);
        picData.append('role', user.role);

        const picRes = await api.uploadProfilePic(picData);
        if (picRes.success && picRes.user) {
          if (onUpdate) onUpdate(picRes.user);
          localStorage.setItem("user", JSON.stringify(picRes.user));
          setMessage({ text: 'Profile picture updated successfully!', type: 'success' });
          setProfilePic(null);
          setLoading(false);
          return;
        } else {
          throw new Error(picRes.message || "Profile picture upload failed");
        }
      }

      const payload = {
        ...formData,
        old_email: user.email,
        role: user.role
      };

      const res = await api.updateProfile(payload);

      if (res.success && res.user) {
        localStorage.setItem("user", JSON.stringify(res.user));
        localStorage.setItem("email", res.user.email);
        if (onUpdate) onUpdate(res.user);

        setMessage({ text: 'Settings updated successfully!', type: 'success' });
        setProfilePic(null);
      } else {
        throw new Error(res.message || "Failed to update settings");
      }
    } catch (err) {
      setMessage({ text: err.message || 'Update failed', type: 'error' });
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '40px auto' }} className="card">
      <div style={{ padding: '20px' }}>
        <h2 style={{ color: '#1e3a5f', marginBottom: '0.5rem' }}>Account Settings</h2>
        <p style={{ color: '#718096', marginBottom: '2rem' }}>Update your personal information and profile security.</p>

        {message.text && (
          <div style={{
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            background: message.type === 'error' ? '#fff5f5' : '#f0fff4',
            color: message.type === 'error' ? '#c53030' : '#2f855a',
            border: `1px solid ${message.type === 'error' ? '#feb2b2' : '#9ae6b4'}`
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem', background: '#f8fafc', padding: '30px', borderRadius: '15px', position: 'relative' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{ width: '130px', height: '130px', borderRadius: '50%', objectFit: 'cover', border: '5px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
                />
              ) : (
                <Avatar
                  name={formData.full_name}
                  email={formData.email}
                  profile_pic={user.profile_pic}
                  size={130}
                />
              )}
              <label style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                background: '#3182ce',
                color: '#fff',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                border: '3px solid #fff'
              }} title="Upload New Photo">
                📷
                <input type="file" hidden onChange={handleFileChange} accept="image/*" />
              </label>
            </div>
            {(profilePic || user.profile_pic) && (
              <div style={{ marginTop: '15px' }}>
                {profilePic && <span style={{ fontSize: '0.85rem', color: '#3182ce', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Ready to upload: {profilePic.name}</span>}
                {user.profile_pic && !profilePic && (
                  <button
                    type="button"
                    onClick={() => setShowRemoveConfirm(true)}
                    style={{ background: 'none', border: 'none', color: '#e53e3e', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Remove Current Photo
                  </button>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
              <label style={{ fontWeight: '600', color: '#4a5568' }}>Full Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                required
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '5px' }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: '600', color: '#4a5568' }}>Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '5px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div className="form-group">
              <label style={{ fontWeight: '600', color: '#4a5568' }}>Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="N/A"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '5px' }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: '600', color: '#4a5568' }}>New Password (Optional)</label>
              <input
                type="password"
                placeholder="Leave blank to keep current"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '5px' }}
              />
            </div>
          </div>

          {user.role === 'admin' && (
            <div style={{ marginTop: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
              <h3 style={{ color: '#1e3a5f', marginBottom: '1.2rem', fontSize: '1.2rem' }}>Notification Settings</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.95rem', color: '#4a5568' }}>
                  <input
                    type="checkbox"
                    checked={adminSettings.emailAlerts}
                    onChange={(e) => setAdminSettings({ ...adminSettings, emailAlerts: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Receive email alerts for new student registrations and interview submissions</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.95rem', color: '#4a5568' }}>
                  <input
                    type="checkbox"
                    checked={adminSettings.securityFlags}
                    onChange={(e) => setAdminSettings({ ...adminSettings, securityFlags: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Trigger real-time notifications for active proctoring rule violations</span>
                </label>
              </div>

              <h3 style={{ color: '#1e3a5f', marginBottom: '1.2rem', marginTop: '25px', fontSize: '1.2rem' }}>System Settings</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.95rem', color: '#4a5568' }}>
                  <input
                    type="checkbox"
                    checked={adminSettings.maintenanceMode}
                    onChange={(e) => setAdminSettings({ ...adminSettings, maintenanceMode: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Enable System Maintenance Mode (locks non-admin logins)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.95rem', color: '#4a5568' }}>
                  <input
                    type="checkbox"
                    checked={adminSettings.autoEvaluate}
                    onChange={(e) => setAdminSettings({ ...adminSettings, autoEvaluate: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Automatically evaluate candidate answers using Gemini AI</span>
                </label>
                <h3 style={{ color: '#1e3a5f', marginBottom: '1.2rem', marginTop: '25px', fontSize: '1.2rem' }}>Proctoring Settings</h3>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.95rem', color: '#4a5568' }}>
                  <input
                    type="checkbox"
                    checked={adminSettings.tabSwitchDetection}
                    onChange={(e) => setAdminSettings({ ...adminSettings, tabSwitchDetection: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Enable Tab-Switch Detection</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.95rem', color: '#4a5568' }}>
                  <input
                    type="checkbox"
                    checked={adminSettings.faceDetection}
                    onChange={(e) => setAdminSettings({ ...adminSettings, faceDetection: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Enable Face Detection</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.95rem', color: '#4a5568' }}>
                  <input
                    type="checkbox"
                    checked={adminSettings.audioMonitoring}
                    onChange={(e) => setAdminSettings({ ...adminSettings, audioMonitoring: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Enable Audio Monitoring</span>
                </label>
              </div>
            </div>
          )}

          <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2, padding: '14px', borderRadius: '10px', fontWeight: 'bold' }}
              disabled={loading}
            >
              {loading ? 'Saving Changes...' : 'Save All Changes'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/profile')}
              style={{ flex: 1, padding: '14px', borderRadius: '10px' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {showRemoveConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.35)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
          <div className="card" style={{ maxWidth: '450px', padding: '2rem', textAlign: 'center' }}>
            <h3 style={{ color: '#1e3a5f' }}>Remove Photo</h3>
            <p style={{ margin: '1.5rem 0', color: '#4a5568' }}>Are you sure you want to remove your profile picture?</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-outline" onClick={() => setShowRemoveConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleRemovePic}>Yes, Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
