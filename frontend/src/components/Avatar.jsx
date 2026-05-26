import React from 'react';
import API_BASE_URL from '../config/api';

const Avatar = ({ name, email, profile_pic, size = 40 }) => {
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [profile_pic]);

  const getInitials = () => {
    if (name && name !== 'N/A') {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return parts[0][0].toUpperCase();
    }
    if (email && email !== 'N/A') return email[0].toUpperCase();
    return '?';
  };

  const getFullImageUrl = (path) => {
    if (!path || path === 'null' || path === 'undefined') return null;
    if (path.startsWith('http')) return path;
    const baseUrl = API_BASE_URL;
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const imageUrl = getFullImageUrl(profile_pic);

  const containerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#3b82f6',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: `${size * 0.4}px`,
    flexShrink: 0,
    border: '2px solid rgba(255,255,255,0.8)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    userSelect: 'none'
  };

  if (imageUrl && !imgError) {
    return (
      <div style={containerStyle}>
        <img
          src={imageUrl}
          alt={name || 'Avatar'}
          width={size}
          height={size}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {getInitials()}
    </div>
  );
};

export default Avatar;
