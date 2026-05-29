import React from 'react';

function AnalyticsSummaryCards({ stats }) {
  const Card = ({ title, value, color, description }) => (
    <div
      className="card"
      style={{
        margin: 0,
        padding: '1.25rem',
        borderRadius: '12px',
        borderTop: `4px solid ${color}`,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        background: '#ffffff',
        transition: 'transform 0.2s, box-shadow 0.2s',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        minHeight: '110px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)';
      }}
    >
      <div>
        <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', tracking: '0.05em', marginBottom: '0.25rem' }}>
          {title}
        </h4>
        <h2 style={{ color: '#1a202c', fontSize: '1.8rem', fontWeight: '700', margin: '0.25rem 0' }}>
          {value}
        </h2>
      </div>
      {description && (
        <span style={{ fontSize: '0.75rem', color: '#a0aec0', marginTop: '0.25rem' }}>
          {description}
        </span>
      )}
    </div>
  );

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1.25rem',
      marginBottom: '2rem'
    }}>
      <Card title="Total Interviews" value={stats.totalInterviews} color="var(--text-primary)" description="All registered sessions" />
      <Card title="Candidates Evaluated" value={stats.totalCandidates} color="#4299e1" description="Unique students" />
      <Card title="Total Selected" value={stats.totalSelected} color="#38a169" description="Status: Shortlisted" />
      <Card title="Total Rejected" value={stats.totalRejected} color="#e53e3e" description="Status: Not Shortlisted" />
      <Card title="Total Pending" value={stats.totalPending} color="#d69e2e" description="Pending recruiter review" />
      <Card title="Avg Score" value={`${stats.avgScore}%`} color="#8b5cf6" description="AI Evaluation Percentage" />
      <Card title="Avg Confidence" value={stats.avgConfidence} color="#319795" description="Candidate posture confidence" />
      <Card title="Proctor Alerts" value={stats.proctoringAlerts} color="#e53e3e" description="Cheating alerts flagged" />
    </div>
  );
}

export default AnalyticsSummaryCards;
