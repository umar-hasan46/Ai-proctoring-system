import React from 'react';

function CandidateDetailsTable({ candidates, onViewDetails }) {
  const getStatusBadge = (status) => {
    let bg = '#eff6ff', color = '#2563eb', label = status || 'Pending';
    if (status === 'Shortlisted' || status === 'Selected') {
      bg = '#eafaf1';
      color = '#15803d';
      label = 'Selected';
    } else if (status === 'Not Shortlisted' || status === 'Rejected') {
      bg = '#fdf2f2';
      color = '#b91c1c';
      label = 'Rejected';
    } else if (status === 'Hiring in Process' || status === 'Pending Review' || status === 'Pending') {
      bg = '#fef3c7';
      color = '#b45309';
      label = 'Pending Review';
    }

    return (
      <span style={{
        padding: '0.25rem 0.6rem',
        borderRadius: '6px',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        background: bg,
        color: color,
        display: 'inline-block',
        whiteSpace: 'nowrap'
      }}>
        {label}
      </span>
    );
  };

  const getConfidenceBadge = (level) => {
    let bg = '#f3f4f6', color = '#4b5563';
    if (level === 'High Confidence' || level === 'High') {
      bg = '#ccfbf1';
      color = '#0f766e';
    } else if (level === 'Moderate Confidence' || level === 'Moderate') {
      bg = '#dbeafe';
      color = '#1d4ed8';
    } else if (level === 'Low Confidence' || level === 'Low') {
      bg = '#fef2f2';
      color = '#b91c1c';
    }

    return (
      <span style={{
        padding: '0.2rem 0.5rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: '500',
        background: bg,
        color: color,
        display: 'inline-block',
        whiteSpace: 'nowrap'
      }}>
        {level || 'Unknown'}
      </span>
    );
  };

  const getProctoringAlerts = (student) => {
    const alerts = parseInt(student.cheating_alerts || student.warning_count || 0);
    const cheatStatus = student.interview_status === 'terminated';

    if (cheatStatus) {
      return (
        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', background: '#fde8e8', color: '#e53e3e', border: '1px solid #f8b4b4' }}>
          Terminated
        </span>
      );
    }

    if (alerts > 5) {
      return (
        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
          High Risk ({alerts})
        </span>
      );
    } else if (alerts > 0) {
      return (
        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500', background: '#f3f4f6', color: '#4b5563' }}>
          Low Risk ({alerts})
        </span>
      );
    }

    return (
      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500', background: '#eafaf1', color: '#15803d' }}>
        No Alerts
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    try {
      // If date is simple string like "29 May 2026, 10:30 AM" or ISO string, format cleanly
      if (dateStr.includes(',') || dateStr.length < 15) return dateStr;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  if (candidates.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: '12px' }}>
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#a0aec0"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginBottom: '1rem' }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>No Candidate Records Found</h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Try relaxing your search terms or active chart filters.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '1.5rem', background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
          Showing {candidates.length} Candidate Evaluation Record{candidates.length !== 1 ? 's' : ''}
        </h3>
      </div>

      <div style={{ overflowX: 'auto', margin: '0 -1.5rem' }}>
        <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', marginTop: 0 }}>
          <thead>
            <tr>
              <th style={{ padding: '0.85rem 1.5rem', background: 'var(--bg-primary)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Candidate Info</th>
              <th style={{ padding: '0.85rem 1rem', background: 'var(--bg-primary)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Applied Role</th>
              <th style={{ padding: '0.85rem 1rem', background: 'var(--bg-primary)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Date</th>
              <th style={{ padding: '0.85rem 1rem', background: 'var(--bg-primary)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Resume Score</th>
              <th style={{ padding: '0.85rem 1rem', background: 'var(--bg-primary)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Interview Score</th>
              <th style={{ padding: '0.85rem 1rem', background: 'var(--bg-primary)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Confidence</th>
              <th style={{ padding: '0.85rem 1rem', background: 'var(--bg-primary)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>AI Proctor Status</th>
              <th style={{ padding: '0.85rem 1rem', background: 'var(--bg-primary)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Hiring Status</th>
              <th style={{ padding: '0.85rem 1.5rem', background: 'var(--bg-primary)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((cand, idx) => {
              const resScore = cand.resume_score || 75; // fallback matching database
              const intvScore = cand.recent_score || 0;
              const hasInterview = cand.interview_id > 0;

              return (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    background: idx % 2 === 0 ? '#fff' : '#fcfdfd',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fcfdfd'}
                >
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '700', color: '#1a202c', fontSize: '0.9rem' }}>
                        {cand.student_name}
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>
                        {cand.email}
                      </span>
                      <span style={{ color: '#a0aec0', fontSize: '0.7rem', marginTop: '2px' }}>
                        ID: {cand.student_id}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1rem', verticalAlign: 'middle' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                      {cand.role || 'Software Engineer'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1rem', verticalAlign: 'middle', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {formatDate(cand.started_at_ist || cand.created_at)}
                  </td>
                  <td style={{ padding: '1rem 1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                      {hasInterview ? `${resScore}%` : 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                    <span style={{
                      fontSize: '0.95rem',
                      fontWeight: 'bold',
                      color: intvScore >= 70 ? '#38a169' : (intvScore >= 50 ? '#d69e2e' : '#e53e3e')
                    }}>
                      {hasInterview ? `${Math.round(intvScore)}%` : 'No Session'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                    {hasInterview ? getConfidenceBadge(cand.confidence_level || 'Moderate Confidence') : <span style={{ color: 'var(--border-color)' }}>—</span>}
                  </td>
                  <td style={{ padding: '1rem 1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                    {hasInterview ? getProctoringAlerts(cand) : <span style={{ color: 'var(--border-color)' }}>—</span>}
                  </td>
                  <td style={{ padding: '1rem 1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                    {getStatusBadge(cand.admin_status)}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
                    <button
                      onClick={() => onViewDetails(cand.student_id, cand.interview_id, cand.email)}
                      className="btn btn-primary"
                      disabled={!hasInterview}
                      style={{
                        padding: '0.45rem 0.9rem',
                        fontSize: '0.8rem',
                        borderRadius: '6px',
                        fontWeight: '600',
                        opacity: hasInterview ? 1 : 0.4,
                        cursor: hasInterview ? 'pointer' : 'not-allowed',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        if (hasInterview) e.currentTarget.style.opacity = 0.9;
                      }}
                      onMouseLeave={(e) => {
                        if (hasInterview) e.currentTarget.style.opacity = 1;
                      }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CandidateDetailsTable;
