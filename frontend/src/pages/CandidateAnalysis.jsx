import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/api';

function CandidateAnalysis() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const analysisData = await api.getInterviewAnalysis(id);
      if (analysisData.success) setAnalysis(analysisData.analysis);

      const violationData = await api.getInterviewViolations(id);
      if (violationData.success) setViolations(violationData.violations);
    } catch (err) {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) return <div className="card"><h1>Loading Analysis...</h1></div>;

  return (
    <div>
      <div className="card">
        <h1>Candidate Integrity & Skills Analysis</h1>
        <p>Detailed breakdown for Interview #{id}</p>
      </div>

      <div className="card">
        <h3>Question Breakdown</h3>
        {analysis.map((a, i) => (
          <div key={i} className="card" style={{ background: 'var(--bg-primary)', borderLeft: '5px solid var(--text-primary)' }}>
            <p><strong>Q: {a.question}</strong></p>
            <p style={{ marginTop: '0.5rem' }}><strong>Answer:</strong> {a.answer_text}</p>
            <hr style={{ margin: '1rem 0' }} />
            <div className="stats-grid">
              <div><strong>Technical:</strong> {a.technical_accuracy}</div>
              <div><strong>Confidence:</strong> {a.confidence_level}</div>
              <div><strong>Communication:</strong> {a.communication_score}/10</div>
            </div>
            <p style={{ marginTop: '1rem', color: '#2c5282' }}><strong>Feedback:</strong> {a.feedback}</p>
          </div>
        ))}
        {analysis.length === 0 && <p>No answers analyzed yet.</p>}
      </div>

      <div className="card">
        <h3>Violations Recorded</h3>
        {violations.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Message</th>
                <th>Severity</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {violations.map(v => (
                <tr key={v.id}>
                  <td><strong>{v.violation_type}</strong></td>
                  <td>{v.message}</td>
                  <td style={{ color: v.severity === 'High' ? 'red' : 'orange' }}>{v.severity}</td>
                  <td>{new Date(v.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No violations recorded for this interview.</p>
        )}
      </div>
    </div>
  );
}

export default CandidateAnalysis;
