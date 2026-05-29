import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CandidateInterviewReport from '../components/DrillDown/CandidateInterviewReport';

function AdminCandidateReport() {
  const { interviewId } = useParams();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <CandidateInterviewReport
        interviewId={interviewId}
        onBack={handleBack}
      />
    </div>
  );
}

export default AdminCandidateReport;
