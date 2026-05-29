import React from 'react';

function AnalyticsFilters({ filters, onFilterChange, rolesList = [], monthsList = [] }) {
  const handleChange = (key, value) => {
    onFilterChange({
      ...filters,
      [key]: value
    });
  };

  const handleClear = () => {
    onFilterChange({
      searchName: '',
      searchEmail: '',
      role: '',
      status: '',
      confidence: '',
      minScore: 0,
      month: '',
      sortBy: 'latest'
    });
  };

  return (
    <div className="card" style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '12px', marginBottom: '2rem' }}>
      <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Filter Candidate Records</span>
        <button
          onClick={handleClear}
          className="btn btn-outline"
          style={{
            padding: '0.4rem 0.8rem',
            fontSize: '0.75rem',
            borderRadius: '6px',
            borderColor: '#e2e8f0',
            color: 'var(--text-secondary)',
            fontWeight: '600'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-primary)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          Reset Filters
        </button>
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        alignItems: 'end'
      }}>
        {/* Search by Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Candidate Name</label>
          <input
            type="text"
            placeholder="Search by name..."
            value={filters.searchName || ''}
            onChange={(e) => handleChange('searchName', e.target.value)}
            style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem', height: '38px' }}
          />
        </div>

        {/* Search by Email */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Email Address</label>
          <input
            type="text"
            placeholder="Search by email..."
            value={filters.searchEmail || ''}
            onChange={(e) => handleChange('searchEmail', e.target.value)}
            style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem', height: '38px' }}
          />
        </div>

        {/* Filter by Role */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Applied Role</label>
          <select
            value={filters.role || ''}
            onChange={(e) => handleChange('role', e.target.value)}
            style={{
              padding: '0.6rem 0.8rem',
              fontSize: '0.85rem',
              width: '100%',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              height: '38px',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            <option value="">All Roles</option>
            {rolesList.map((r, i) => (
              <option key={i} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Filter by Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Hiring Status</label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            style={{
              padding: '0.6rem 0.8rem',
              fontSize: '0.85rem',
              width: '100%',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              height: '38px',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            <option value="">All Statuses</option>
            <option value="Shortlisted">Selected / Shortlisted</option>
            <option value="Hiring in Process">Pending / In Process</option>
            <option value="Not Shortlisted">Rejected / Not Shortlisted</option>
          </select>
        </div>

        {/* Filter by Confidence Level */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Confidence level</label>
          <select
            value={filters.confidence || ''}
            onChange={(e) => handleChange('confidence', e.target.value)}
            style={{
              padding: '0.6rem 0.8rem',
              fontSize: '0.85rem',
              width: '100%',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              height: '38px',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            <option value="">All Levels</option>
            <option value="High Confidence">High Confidence</option>
            <option value="Moderate Confidence">Moderate Confidence</option>
            <option value="Low Confidence">Low Confidence</option>
          </select>
        </div>

        {/* Filter by Month */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Interview Month</label>
          <select
            value={filters.month || ''}
            onChange={(e) => handleChange('month', e.target.value)}
            style={{
              padding: '0.6rem 0.8rem',
              fontSize: '0.85rem',
              width: '100%',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              height: '38px',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            <option value="">All Months</option>
            {monthsList.map((m, i) => (
              <option key={i} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Filter by Min Score */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
            <span>Min Score</span>
            <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{filters.minScore || 0}%</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '38px' }}>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.minScore || 0}
              onChange={(e) => handleChange('minScore', parseInt(e.target.value))}
              style={{ flex: 1, cursor: 'pointer', height: '6px', background: '#e2e8f0', borderRadius: '3px' }}
            />
          </div>
        </div>

        {/* Sort controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Sort Candidates</label>
          <select
            value={filters.sortBy || 'latest'}
            onChange={(e) => handleChange('sortBy', e.target.value)}
            style={{
              padding: '0.6rem 0.8rem',
              fontSize: '0.85rem',
              width: '100%',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              height: '38px',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            <option value="latest">Latest Interview</option>
            <option value="score_desc">Highest Score first</option>
            <option value="score_asc">Lowest Score first</option>
            <option value="confidence_desc">Highest Confidence first</option>
            <option value="confidence_asc">Lowest Confidence first</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsFilters;
