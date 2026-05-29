import React from 'react';

function BreadcrumbNavigation({ items, onNavigate }) {
  return (
    <nav style={{
      background: 'transparent',
      color: '#4a5568',
      padding: '0.5rem 0',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '0.9rem',
      fontWeight: '500',
      flexWrap: 'wrap',
      boxShadow: 'none',
      position: 'static',
      marginBottom: '1rem'
    }}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <span
              onClick={() => !isLast && onNavigate(item.level, item.params)}
              style={{
                color: isLast ? '#1a202c' : '#4299e1',
                cursor: isLast ? 'default' : 'pointer',
                fontWeight: isLast ? '600' : '500',
                transition: 'color 0.2s',
                userSelect: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isLast) e.target.style.color = '#2b6cb0';
              }}
              onMouseLeave={(e) => {
                if (!isLast) e.target.style.color = '#4299e1';
              }}
            >
              {item.label}
            </span>
            {!isLast && (
              <span style={{ color: '#cbd5e0', padding: '0 4px', userSelect: 'none' }}>
                &gt;
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export default BreadcrumbNavigation;
