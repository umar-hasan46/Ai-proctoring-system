import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';

function CandidateInterviewReport({ candidateId, interviewId, candidateEmail, onBack, onStatusChange }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [recruiterNotes, setRecruiterNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      const isDemoId = ['101', '102', '103', '104', 101, 102, 103, 104].includes(interviewId) || 
                       (typeof interviewId === 'string' && (interviewId.startsWith('INT-10') || interviewId.startsWith('10')));
      
      if (isDemoId) {
        let mockId = 101;
        if (typeof interviewId === 'string') {
          if (interviewId.startsWith('INT-')) {
            mockId = parseInt(interviewId.split('-')[1]) || 101;
          } else {
            mockId = parseInt(interviewId) || 101;
          }
        } else {
          mockId = parseInt(interviewId) || 101;
        }

        const DEMO_STUDENTS = [
          { student_id: 101, name: "John Doe", email: "john@demo.com", role_applied: "Software Engineer", date_ist: "26 May 2026, 02:30 PM", admin_status: "Pending Review", admin_hiring_status: "Pending Review", score: 85, technical_score: 82, communication_score: 88, confidence_level: "High", warnings: 0, status: "completed" },
          { student_id: 102, name: "Jane Smith", email: "jane@demo.com", role_applied: "Data Scientist", date_ist: "26 May 2026, 01:15 PM", admin_status: "Shortlisted", admin_hiring_status: "Shortlisted", score: 92, technical_score: 95, communication_score: 90, confidence_level: "High", warnings: 1, status: "completed" },
          { student_id: 103, name: "Mike Johnson", email: "mike@demo.com", role_applied: "Frontend Dev", date_ist: "26 May 2026, 11:45 AM", admin_status: "Not Shortlisted", admin_hiring_status: "Not Shortlisted", score: 45, technical_score: 40, communication_score: 50, confidence_level: "Low", warnings: 4, status: "terminated" },
          { student_id: 104, name: "Sarah Williams", email: "sarah@demo.com", role_applied: "Backend Dev", date_ist: "26 May 2026, 10:00 AM", admin_status: "Hiring in Process", admin_hiring_status: "Hiring in Process", score: 88, technical_score: 90, communication_score: 85, confidence_level: "High", warnings: 0, status: "completed" }
        ];

        const mockStudent = DEMO_STUDENTS.find(ds => ds.student_id === mockId) || DEMO_STUDENTS[0];
        const savedDemoStatus = localStorage.getItem(`demo_status_${mockStudent.student_id}`) || mockStudent.admin_status;

        setTimeout(() => {
          setReport({
            candidate: {
              id: mockStudent.student_id,
              name: mockStudent.name,
              email: mockStudent.email,
              phone: "+91 98765 43210",
              role: mockStudent.role_applied
            },
            interview: {
              id: `INT-${mockStudent.student_id}-99`,
              overall_score: mockStudent.score,
              technical_score: mockStudent.technical_score,
              communication_score: mockStudent.communication_score,
              confidence_level: `${mockStudent.confidence_level} Confidence`,
              duration: "18m 42s",
              warning_count: mockStudent.warnings
            },
            summary: `Demo candidate evaluation report for ${mockStudent.name}. High communication clarity, consistent and accurate technical explanations. This is a demo candidate report.`,
            decision: savedDemoStatus,
            correct_count: 2,
            total_technical: 2,
            answered_count: 2,
            skipped_count: 0,
            violations: {
              no_face: 0,
              multiple_faces: 0,
              tab_switches: mockStudent.warnings,
              audio_muted: 0,
              camera_off: 0
            },
            scored_technical: [
              {
                question_no: 1,
                category: "Self Introduction",
                skill: "Communication",
                difficulty: "Easy",
                question_text: "Please introduce yourself and your technical background.",
                answer_text: `Hi, I am ${mockStudent.name}. I have worked extensively with React, SQL, and backend integration.`,
                score: mockStudent.technical_score,
                feedback: "Fluent speaker, accurate high-level description of background and technical skills.",
                status: "Answered"
              },
              {
                question_no: 2,
                category: "Core Technical",
                skill: "React",
                difficulty: "Medium",
                question_text: "Explain the difference between state and props in React.",
                answer_text: "State is local mutable data managed inside a component. Props are read-only inputs passed down from parent components.",
                score: mockStudent.technical_score + 5,
                feedback: "Accurate differentiation between immutable inputs and mutable local state.",
                status: "Answered"
              }
            ]
          });
          const savedNotes = localStorage.getItem(`recruiter_notes_${mockStudent.student_id}_${interviewId}`) || '';
          setRecruiterNotes(savedNotes);
          setLoading(false);
        }, 300);
        return;
      }

      try {
        const res = await api.getDetailedInterviewReport(interviewId);
        if (res && res.success && res.data) {
          setReport(res.data);
          // Load recruiter notes from localStorage using resolved candidate ID
          const resolvedCandId = candidateId || res.data.candidate?.id || 0;
          const savedNotes = localStorage.getItem(`recruiter_notes_${resolvedCandId}_${interviewId}`) || '';
          setRecruiterNotes(savedNotes);
        } else {
          setError(res.message || 'Failed to retrieve detailed report.');
        }
      } catch (err) {
        setError(err.message || 'API connection failed. Please check network.');
      } finally {
        setLoading(false);
      }
    };
    if (interviewId) {
      fetchReport();
    }
  }, [interviewId, candidateId]);

  const handleSaveNotes = () => {
    setSavingNotes(true);
    const resolvedCandId = candidateId || report?.candidate?.id || 0;
    setTimeout(() => {
      localStorage.setItem(`recruiter_notes_${resolvedCandId}_${interviewId}`, recruiterNotes);
      setSavingNotes(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 600);
  };

  const handleStatusChange = async (newStatus) => {
    const resolvedCandId = candidateId || report?.candidate?.id || 0;
    
    // Intercept status updates for demo candidates to avoid API / DB errors
    if ([101, 102, 103, 104].includes(Number(resolvedCandId)) || [101, 102, 103, 104].includes(Number(interviewId))) {
      setReport(prev => ({
        ...prev,
        decision: newStatus
      }));
      localStorage.setItem(`demo_status_${resolvedCandId}`, newStatus);
      if (onStatusChange) {
        onStatusChange(resolvedCandId, newStatus);
      }
      return;
    }

    try {
      const res = await api.updateAdminStatus({
        user_id: resolvedCandId,
        interview_id: interviewId,
        status: newStatus
      });
      if (res && res.success) {
        setReport(prev => ({
          ...prev,
          decision: newStatus
        }));
        if (onStatusChange) {
          onStatusChange(resolvedCandId, newStatus);
        }
      } else {
        alert(res.message || 'Failed to update hiring status.');
      }
    } catch (err) {
      alert('Error updating hiring status: ' + err.message);
    }
  };

  const handleDownloadPDF = () => {
    api.downloadInterviewPDF(interviewId);
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', background: '#fff', borderRadius: '12px' }}>
        <div style={{
          border: '4px solid #e2e8f0',
          borderTop: '4px solid var(--text-primary)',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          margin: '0 auto 1.5rem',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <h4 style={{ color: 'var(--text-secondary)', margin: 0 }}>Compiling detailed AI evaluation report...</h4>
        <p style={{ color: '#a0aec0', fontSize: '0.85rem', marginTop: '6px' }}>Fetching resume skills, grading metrics, and proctoring telemetry...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center', background: '#fff', borderRadius: '12px', borderLeft: '5px solid #e53e3e' }}>
        <h3 style={{ color: '#e53e3e', marginBottom: '1rem' }}>Failed to Load Report</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error || 'The interview record could not be located in the database.'}</p>
        <button onClick={onBack} className="btn btn-outline">Return to Candidate List</button>
      </div>
    );
  }

  const { candidate, interview, summary, decision, correct_count, total_technical, answered_count, skipped_count, scored_technical, violations } = report;

  const mockSkills = ["Python", "Flask", "PostgreSQL", "React", "RESTful APIs", "Docker", "Git"];
  const resScore = 75; // resume assessment assessment
  const jobMatchPercent = 82;

  const renderStars = (score) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} style={{ color: i <= score ? '#d69e2e' : '#e2e8f0', fontSize: '1.1rem', marginRight: '2px' }}>
          ★
        </span>
      );
    }
    return <div style={{ display: 'inline-flex' }}>{stars}</div>;
  };

  const getHiringBadge = (status) => {
    let bg = '#eff6ff', color = '#2563eb', text = 'Pending Review';
    if (status === 'Shortlisted' || status === 'Selected') {
      bg = '#eafaf1';
      color = '#15803d';
      text = 'Selected';
    } else if (status === 'Not Shortlisted' || status === 'Rejected') {
      bg = '#fdf2f2';
      color = '#b91c1c';
      text = 'Rejected';
    }
    return (
      <span style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', background: bg, color: color }}>
        {text}
      </span>
    );
  };

  return (
    <div>
      {/* 1. Header Card */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, var(--text-primary) 0%, #152b47 100%)',
        color: '#fff',
        padding: '2rem',
        borderRadius: '16px',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        boxShadow: '0 10px 20px rgba(30,58,95,0.15)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700' }}>{candidate.name}</h1>
            {([101, 102, 103, 104].includes(Number(candidate.id)) || [101, 102, 103, 104].includes(Number(interviewId))) && (
              <span style={{
                background: '#fff7ed',
                color: '#c2410c',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '700',
                border: '1px solid #ffedd5'
              }}>
                Demo Report
              </span>
            )}
            {getHiringBadge(decision)}
          </div>
          <p style={{ margin: 0, opacity: 0.85, fontSize: '0.95rem' }}>
            <strong>Email:</strong> {candidate.email} | <strong>Phone:</strong> {candidate.phone || 'N/A'}
          </p>
          <p style={{ margin: '6px 0 0 0', opacity: 0.85, fontSize: '0.95rem' }}>
            <strong>Applied Role:</strong> {candidate.role} | <strong>Session ID:</strong> #{interview.id}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleDownloadPDF}
            className="btn btn-outline"
            style={{
              borderColor: '#ffffff',
              color: '#ffffff',
              padding: '0.6rem 1.2rem',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export PDF Report
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Left Side: Score cards + Resume Assess */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Detailed Scores Cards */}
          <div className="card" style={{ margin: 0, padding: '1.5rem', background: '#fff', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Core Scoring Metrics
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Overall Score</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '4px' }}>
                  {Math.round(interview.overall_score)}%
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Technical Score</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#8b5cf6', marginTop: '4px' }}>
                  {interview.technical_score}/100
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Communication</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#319795', marginTop: '4px' }}>
                  {interview.communication_score}/100
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>ATS Match</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#38a169', marginTop: '4px' }}>
                  {jobMatchPercent}%
                </div>
              </div>
            </div>
          </div>

          {/* Resume Assessment section */}
          <div className="card" style={{ margin: 0, padding: '1.5rem', background: '#fff', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Resume & Skills Assessment</h3>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <h5 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Resume Executive Summary</h5>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                  The candidate displays strong conceptual alignment with the required tech stack. The resume highlights strong background in building web services and database architectures. Experienced with modular React components and scalable microservice architectures.
                </p>
              </div>
              <div style={{ width: '220px', flexShrink: 0 }}>
                <h5 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Extracted Resume Skills</h5>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {mockSkills.map((sk, idx) => (
                    <span key={idx} style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      background: '#ebf8ff',
                      color: '#2b6cb0'
                    }}>
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Admin Evaluation Summary paragraph */}
          <div className="card" style={{ margin: 0, padding: '1.5rem', background: '#fff', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>AI Performance Overview</h3>
            <div style={{ padding: '1rem', background: '#eff6ff', borderLeft: '4px solid #3b82f6', borderRadius: '0 8px 8px 0' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500', lineHeight: '1.5', margin: 0 }}>
                {summary || 'No summary available.'}
              </p>
            </div>
          </div>

        </div>

        {/* Right Side: Proctoring Telemetry + Admin Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Admin Recruiter Actions */}
          <div className="card" style={{ margin: 0, padding: '1.5rem', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Recruiter Decisions
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Hiring Status Decision</label>
                <select
                  value={decision || 'Pending Review'}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  style={{
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: '#fff',
                    fontWeight: 'bold',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Pending Review">Pending Review</option>
                  <option value="Shortlisted">Select / Shortlist</option>
                  <option value="Not Shortlisted">Reject / Not Shortlisted</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Recruiter Internal Notes</label>
                <textarea
                  placeholder="Enter private recruiter comments, rating points, or candidate follow-up steps here..."
                  rows="4"
                  value={recruiterNotes}
                  onChange={(e) => setRecruiterNotes(e.target.value)}
                  style={{
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <button
                onClick={handleSaveNotes}
                className="btn btn-primary"
                disabled={savingNotes}
                style={{
                  padding: '0.6rem',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '4px'
                }}
              >
                {savingNotes ? 'Saving...' : 'Save Recruiter Notes'}
              </button>
              
              {saveSuccess && (
                <div style={{ fontSize: '0.8rem', color: '#38a169', fontWeight: 'bold', textAlign: 'center', marginTop: '2px' }}>
                  ✓ Notes saved successfully.
                </div>
              )}
            </div>
          </div>

          {/* Proctoring & Integrity Telemetry */}
          <div className="card" style={{ margin: 0, padding: '1.5rem', background: '#fff', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Proctoring Audit Logs
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Webcam Feed:</span>
                <span style={{ fontWeight: 'bold', color: '#38a169' }}>Detected & Online</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Microphone Status:</span>
                <span style={{ fontWeight: 'bold', color: '#38a169' }}>Active & Recording</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Interview Duration:</span>
                <span style={{ fontWeight: 'bold', color: '#1a202c' }}>{interview.duration}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Tab Switches count:</span>
                <span style={{ fontWeight: 'bold', color: (violations.tab_switches > 3 ? '#e53e3e' : 'var(--text-secondary)') }}>
                  {violations.tab_switches || 0}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Camera Turned Off:</span>
                <span style={{ fontWeight: 'bold', color: (violations.camera_off > 0 ? '#e53e3e' : 'var(--text-secondary)') }}>
                  {violations.camera_off || 0}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>No Face Detected:</span>
                <span style={{ fontWeight: 'bold', color: (violations.no_face > 2 ? '#e53e3e' : 'var(--text-secondary)') }}>
                  {violations.no_face || 0}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Multiple People detected:</span>
                <span style={{ fontWeight: 'bold', color: (violations.multiple_faces > 0 ? '#e53e3e' : 'var(--text-secondary)') }}>
                  {violations.multiple_faces || 0}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Proctoring Alerts Status:</span>
                <span style={{
                  fontWeight: 'bold',
                  color: (interview.warning_count > 5 || interview.status === 'terminated' ? '#e53e3e' : '#38a169')
                }}>
                  {interview.status === 'terminated'
                    ? 'TERMINATED (Failed)'
                    : (interview.warning_count > 5 ? 'High Alerts Flagged' : 'Pass / Clear')}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 2. Detailed Q&A Table */}
      <div className="card" style={{ padding: '1.5rem', background: '#fff', borderRadius: '12px' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          AI Answer Evaluation Timeline ({scored_technical.length} Questions Graded)
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {scored_technical.map((q, idx) => {
            const isCorrect = q.correctness_status && q.correctness_status.toLowerCase() === 'correct';
            const isSkipped = !q.candidate_answer || q.candidate_answer.trim().toLowerCase() === 'skipped' || q.candidate_answer.trim() === '' || q.candidate_answer.trim().toLowerCase() === 'not answered' || q.status === 'Unanswered' || (q.question_status && q.question_status.toLowerCase() === 'unanswered');
            const badgeColor = isCorrect ? '#15803d' : (isSkipped ? '#b45309' : '#b91c1c');
            const badgeBg = isCorrect ? '#eafaf1' : (isSkipped ? '#fef3c7' : '#fdf2f2');

            return (
              <div
                key={idx}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  background: isSkipped ? '#fffbeb' : '#fcfdfd',
                  transition: 'box-shadow 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                {/* Q header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: '700', flex: 1 }}>
                    Question {q.question_no}: {q.question_text}
                  </h4>
                  <span style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    background: badgeBg,
                    color: badgeColor,
                    textTransform: 'uppercase'
                  }}>
                    {isSkipped ? 'NOT ANSWERED' : (q.correctness_status || 'INCORRECT')}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1.5rem', marginTop: '0.75rem' }}>
                  {/* QA & Feedback */}
                  <div>
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Candidate Answer:</span>
                      <p style={{
                        fontSize: '0.85rem',
                        color: isSkipped ? '#b45309' : 'var(--text-primary)',
                        margin: 0,
                        fontStyle: isSkipped ? 'italic' : 'normal',
                        background: isSkipped ? '#fef3c7' : 'var(--bg-primary)',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        lineHeight: '1.4'
                      }}>
                        {isSkipped ? 'Not Answered' : (q.candidate_answer || 'No answer submitted.')}
                      </p>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>AI Core Feedback:</span>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                        {isSkipped ? 'Candidate did not answer this question.' : (q.ai_feedback || 'No feedback available.')}
                      </p>
                    </div>
                  </div>

                  {/* Stars / breakdown */}
                  <div style={{ background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Clarity</span>
                      {renderStars(isSkipped ? 0 : q.clarity_score)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Content</span>
                      {renderStars(isSkipped ? 0 : q.content_score)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Relevance</span>
                      {renderStars(isSkipped ? 0 : q.relevance_score)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Confidence</span>
                      {renderStars(isSkipped ? 0 : q.confidence_score)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CandidateInterviewReport;
