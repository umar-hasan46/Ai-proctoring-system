import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatToIST } from '../utils/dateUtils';

function AllResults({ isReportView = false }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = isReportView
        ? await api.getAllAdminReports()
        : await api.apiRequest('/interview/results');

      if (res.success) {
        setResults(Array.isArray(res.reports || res.results) ? (res.reports || res.results) : []);
      } else {
        setError(res.message || "Failed to load results");
      }
    } catch (err) {
      
      setError("Unable to load results. Please check your connection or login again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isReportView]);

  const stats = {
    total: results.length,
    completed: results.filter(r => r.status === 'completed').length,
    active: results.filter(r => r.status === 'active').length,
    terminated: results.filter(r => r.status === 'terminated').length,
    avgScore: results.length ? (results.reduce((acc, r) => acc + Number(r.overall_score || r.final_percentage || 0), 0) / results.length).toFixed(1) : 0,
    avgTech: results.length ? (results.reduce((acc, r) => acc + Number(r.technical_score || 0), 0) / results.length).toFixed(1) : 0,
    avgComm: results.length ? (results.reduce((acc, r) => acc + Number(r.communication_score || 0), 0) / results.length).toFixed(1) : 0,
    cheatingAlerts: results.reduce((acc, r) => acc + Number(r.cheating_alert_count || 0), 0),
    passed: results.filter(r => Number(r.overall_score || r.final_percentage || 0) >= 50).length,
    rejected: results.filter(r => Number(r.overall_score || r.final_percentage || 0) < 50 || r.status === 'terminated').length
  };

  const filteredResults = Array.isArray(results) ? results.filter(r => {
    if (!r) return false;
    if (filter === 'all') return true;
    if (filter === 'completed') return r.status === 'completed';
    if (filter === 'terminated') return r.status === 'terminated';
    if (filter === 'passed') return Number(r.overall_score || r.final_percentage || 0) >= 50;
    if (filter === 'failed') return Number(r.overall_score || r.final_percentage || 0) < 50;
    return true;
  }) : [];

  const StatCard = ({ label, value, color }) => (
    <div className="card" style={{ flex: 1, minWidth: '180px', padding: '20px', borderTop: `4px solid ${color}`, textAlign: 'center' }}>
      <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold' }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b' }}>{value}</div>
    </div>
  );

  if (loading) return (
    <div style={{ textAlign: 'center', marginTop: '100px', padding: '2rem' }} className="card">
      <h3>Loading {isReportView ? 'Admin Reports' : 'Results'}...</h3>
      <p>Please wait while we fetch the latest data.</p>
    </div>
  );

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '20px' }}>
      <div className="card" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ color: '#1e3a5f', margin: 0 }}>{isReportView ? 'Interview Performance Reports' : 'My Interview Results'}</h1>
          <p style={{ color: '#718096', margin: '0.5rem 0 0' }}>Comprehensive audit of candidate integrity and skills.</p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {isReportView && (
            <button className="btn btn-primary" style={{ background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => api.downloadReports()}>
              📥 Export CSV
            </button>
          )}
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e0', outline: 'none' }}>
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="terminated">Terminated</option>
            <option value="passed">Passed (&gt;=50%)</option>
            <option value="failed">Failed (&lt;50%)</option>
          </select>
          <button className="btn btn-primary" onClick={fetchData}>Refresh</button>
        </div>
      </div>

      {isReportView && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '25px' }}>
          <StatCard label="Total" value={stats.total} color="#4f46e5" />
          <StatCard label="Completed" value={stats.completed} color="#059669" />
          <StatCard label="Terminated" value={stats.terminated} color="#dc2626" />
          <StatCard label="Avg Score" value={`${stats.avgScore}%`} color="#0891b2" />
          <StatCard label="Avg Duration" value={results.length ? (results.reduce((acc, r) => {
            const d = r.duration || "0";
            const match = d.match(/(\d+)m/);
            return acc + (match ? parseInt(match[1]) : 0);
          }, 0) / results.length).toFixed(1) + "m" : "0m"} color="#4b5563" />
          <StatCard label="Cheating" value={stats.cheatingAlerts} color="#e11d48" />
          <StatCard label="Passed" value={stats.passed} color="#10b981" />
        </div>
      )}

      <div className="card" style={{ padding: '0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #edf2f7' }}>
                <th style={{ padding: '18px 15px', textAlign: 'left', color: '#64748b', fontSize: '0.85rem' }}>Candidate / Role</th>
                {isReportView && <th style={{ padding: '18px 15px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>Attempt</th>}
                <th style={{ padding: '18px 15px', textAlign: 'left', color: '#64748b', fontSize: '0.85rem' }}>Interview ID</th>
                <th style={{ padding: '18px 15px', textAlign: 'left', color: '#64748b', fontSize: '0.85rem' }}>Date (IST)</th>
                <th style={{ padding: '18px 15px', textAlign: 'left', color: '#64748b', fontSize: '0.85rem' }}>Status</th>
                {isReportView && <th style={{ padding: '18px 15px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>Hiring Status</th>}
                <th style={{ padding: '18px 15px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>Overall</th>
                <th style={{ padding: '18px 15px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>Tech</th>
                <th style={{ padding: '18px 15px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>Comm</th>
                <th style={{ padding: '18px 15px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>Conf</th>
                <th style={{ padding: '18px 15px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>Alerts</th>
                <th style={{ padding: '18px 15px', textAlign: 'right', color: '#64748b', fontSize: '0.85rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((r, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #edf2f7', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#fcfcfc'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '15px' }}>
                    <div style={{ fontWeight: '700', color: '#1e293b' }}>{r.candidate_name || r.full_name || 'N/A'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.candidate_email || r.user_email || 'N/A'} • {r.role || r.role_applied}</div>
                  </td>
                  {isReportView && (
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <span style={{ fontWeight: '600', color: '#4a5568' }}>#{r.attempt_no || 1}</span>
                    </td>
                  )}
                  <td style={{ padding: '15px' }}>
                    <span style={{ fontFamily: 'monospace', padding: '3px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.85rem' }}>#{r.interview_id}</span>
                  </td>
                  <td style={{ padding: '15px', fontSize: '0.85rem', color: '#4b5563' }}>{formatToIST(r.created_at)}</td>
                  <td style={{ padding: '15px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase',
                      background: r.status === 'completed' ? '#dcfce7' : (r.status === 'terminated' ? '#fee2e2' : '#fef3c7'),
                      color: r.status === 'completed' ? '#166534' : (r.status === 'terminated' ? '#991b1b' : '#92400e'),
                    }}>
                      {r.status}
                    </span>
                  </td>
                  {isReportView && (
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase',
                        background: r.admin_hiring_status === 'Shortlisted' ? '#d1fae5' : (r.admin_hiring_status === 'Not Shortlisted' ? '#fee2e2' : '#fef3c7'),
                        color: r.admin_hiring_status === 'Shortlisted' ? '#065f46' : (r.admin_hiring_status === 'Not Shortlisted' ? '#991b1b' : '#92400e'),
                      }}>
                        {r.admin_hiring_status || 'Pending'}
                      </span>
                    </td>
                  )}
                  <td style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', color: '#4f46e5' }}>{Number(r.overall_score || r.final_percentage || 0).toFixed(0)}%</td>
                  <td style={{ padding: '15px', textAlign: 'center', color: '#0891b2' }}>{Number(r.technical_score || 0)}%</td>
                  <td style={{ padding: '15px', textAlign: 'center', color: '#059669' }}>{Number(r.communication_score || 0)}%</td>
                  <td style={{ padding: '15px', textAlign: 'center', color: '#d97706' }}>{Number(r.confidence_score || 0)}%</td>
                  <td style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', color: Number(r.cheating_alert_count || 0) > 0 ? '#e11d48' : '#64748b' }}>{Number(r.cheating_alert_count || 0)}</td>
                  <td style={{ padding: '15px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => navigate(isReportView ? `/admin/ai-report/${r.interview_id}` : `/results`)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                      >
                        {isReportView ? 'View Report' : 'Details'}
                      </button>
                      {isReportView && (
                        <button
                          onClick={() => api.downloadInterviewPDF(r.interview_id)}
                          className="btn btn-outline"
                          style={{ fontSize: '0.75rem', padding: '6px 12px', borderColor: '#3b82f6', color: '#3b82f6', cursor: 'pointer' }}
                        >
                          Download PDF
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredResults.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
            <p style={{ fontSize: '1.1rem' }}>No reports found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AllResults;
