import React, { useState, useEffect } from 'react';
import { api } from '../api/api';

function Violations() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchViolations = async () => {
      try {
        const data = await api.getAdminNotifications();

        setViolations(data.notifications.filter(n => n.type === 'warning'));
      } catch (err) {
        
      } finally {
        setLoading(false);
      }
    };
    fetchViolations();
  }, []);

  if (loading) return <div>Loading Alerts...</div>;

  return (
    <div className="card">
      <h2>Recent Integrity Alerts</h2>
      <table>
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Violation</th>
            <th>Message</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const uniqueViolations = [];
            const seen = new Set();
            violations.forEach(v => {
              const key = `${v.user_email}_${v.title}_${v.message}`;
              if (!seen.has(key)) {
                seen.add(key);
                uniqueViolations.push(v);
              }
            });
            return uniqueViolations;
          })().map(v => (
            <tr key={v.id}>
              <td>{v.user_email}</td>
              <td><strong>{v.title}</strong></td>
              <td>{v.message}</td>
              <td>{new Date(v.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Violations;
