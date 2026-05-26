// RegisterInterview.jsx - Updated flow
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import API_BASE_URL from '../config/api';

function RegisterInterview({ user }) {
  // Initialize form fields; email is read‑only as it comes from logged‑in user
  const [formData, setFormData] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: ''
  });
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState('');
  const [skills, setSkills] = useState(null);
  const [targetRole, setTargetRole] = useState(localStorage.getItem('targetRole') || localStorage.getItem('userRole') || 'Software Engineer');
  const [interviewId, setInterviewId] = useState(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setResume(e.target.files[0]);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!resume) {
      setError('Please upload your resume to continue.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const regRes = await api.registerInterview({
        ...formData,
        user_id: user.id
      });

      if (regRes.success) {
        // Save updated user info to local storage
        const updatedUser = {
          ...user,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          phone: formData.phone
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setInterviewId(regRes.interview_id);

        const uploadData = new FormData();
        uploadData.append('resume', resume);
        uploadData.append('interview_id', regRes.interview_id);
        uploadData.append('email', formData.email);

        const uploadRes = await fetch(`${API_BASE_URL}/api/interviews/upload-resume`, {
          method: 'POST',
          body: uploadData
        });
        const uploadJson = await uploadRes.json();

        if (uploadJson.success) {
          // Registration and resume upload successful
          setRegistered(true);
        } else {
          setError(uploadJson.message || 'Resume upload failed.');
        }
      } else {
        setError(regRes.message || 'Registration failed.');
      }
    } catch (err) {
      
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleDetectSkills = async () => {
    if (!interviewId) {
      setError('Interview not registered yet.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const skillRes = await api.detectSkills({ interview_id: interviewId });
      if (skillRes.success) {
        const detected = skillRes.skills || [];
        setSkills(detected);
        
        // Calculate Resume Scores
        const targetRole = formData.role || 'General';
        localStorage.setItem("targetRole", targetRole);
        
        const atsScore = Math.min(100, Math.max(30, detected.length * 8));
        const educationScore = 80 + (detected.length > 5 ? 10 : 0); 
        const skillsScore = Math.min(100, detected.length * 10);
        const resumeScore = Math.round((atsScore + educationScore + skillsScore) / 3);
        
        localStorage.setItem("atsScore", atsScore.toString());
        localStorage.setItem("educationScore", educationScore.toString());
        localStorage.setItem("skillsScore", skillsScore.toString());
        localStorage.setItem("resumeScore", resumeScore.toString());
        localStorage.setItem("interviewRegistered", "true");
        localStorage.setItem("registeredUserId", localStorage.getItem("userId") || "");
        localStorage.setItem("detectedSkills", JSON.stringify(detected));
        
        const mockResumeAnalysis = {
          summary_paragraph: `Candidate has applied for ${targetRole}. We detected ${detected.length} relevant skills including ${detected.slice(0, 3).join(', ')}. The resume format is ATS friendly.`,
          strengths: detected.slice(0, 4),
          weaknesses: ["Consider adding more measurable achievements", "Add more diverse project experience"]
        };
        localStorage.setItem("resumeAnalysis", JSON.stringify(mockResumeAnalysis));

        setSkills(skillRes.skills);
      } else {
        setError('Skill detection failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred while detecting skills.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '2rem', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h2 style={{ color: '#1e3a5f', marginBottom: '1.5rem', textAlign: 'center' }}>Interview Registration</h2>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Registration Form */}
      {!registered && (
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={formData.email} disabled />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required style={{ width: '100%', padding: '0.5rem' }} />
          </div>
          <div className="form-group">
            <label>Applied Role</label>
            <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} required style={{ width: '100%', padding: '0.5rem' }}>
              <option value="">Select Role</option>
              <option value="Software Engineer">Software Engineer</option>
              <option value="Frontend Developer">Frontend Developer</option>
              <option value="Backend Developer">Backend Developer</option>
              <option value="Full Stack Developer">Full Stack Developer</option>
              <option value="Data Scientist">Data Scientist</option>
              <option value="AI Engineer">AI Engineer</option>
            </select>
          </div>
          <div className="form-group">
            <label>Upload Resume (PDF only)</label>
            <input type="file" accept=".pdf" onChange={handleFileChange} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>{loading ? 'Processing...' : 'Register & Upload Resume'}</button>
        </form>
      )}

      {/* After registration, allow skill detection */}
      {registered && !skills && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <p>Registration successful. Ready to detect skills.</p>
          <button onClick={handleDetectSkills} className="btn btn-primary" style={{ width: '100%', padding: '1rem' }} disabled={loading}>{loading ? 'Detecting...' : 'Detect Skills'}</button>
        </div>
      )}

      {/* Show detected skills and start interview */}
      {skills && (
        <div style={{ textAlign: 'center' }}>
          <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>Skills detected successfully!</div>
          <h3 style={{ color: '#1e3a5f' }}>Detected Skills:</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', margin: '1rem 0' }}>
            {skills.map((skill, index) => (
              <span key={index} style={{ background: '#edf2f7', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.9rem', color: '#2d3748' }}>{skill}</span>
            ))}
            {skills.length === 0 && <p style={{ color: '#e53e3e' }}>No skills detected. Please try with a better resume.</p>}
          </div>
          <button onClick={async () => {
            setLoading(true);
            try {
              const safeTargetRole = targetRole || localStorage.getItem("targetRole") || localStorage.getItem("userRole") || "Software Engineer";
              const safeDetectedSkills = Array.isArray(skills) && skills.length > 0 ? skills : ["Python", "JavaScript", "SQL", "HTML", "CSS", "Git"];
              
              const payload = {
                userId: localStorage.getItem("userId") || "",
                role: localStorage.getItem("userRole") || "user",
                skills: safeDetectedSkills,
                targetRole: safeTargetRole,
                resumeAnalysis: JSON.parse(localStorage.getItem("resumeAnalysis") || "{}")
              };

              const API_BASE_URL = import.meta.env.VITE_API_URL || "https://ai-proctoring-backend-5t3k.onrender.com";
              const response = await fetch(`${API_BASE_URL}/api/interview/start`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-User-Id": localStorage.getItem("userId") || "",
                  "X-User-Role": localStorage.getItem("userRole") || "user"
                },
                body: JSON.stringify(payload)
              });

              const data = await response.json();

              if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to start interview");
              }

              localStorage.setItem("interviewRegistered", "true");
              localStorage.setItem("detectedSkills", JSON.stringify(safeDetectedSkills));
              localStorage.setItem("targetRole", safeTargetRole);
              localStorage.setItem("resumeAnalysis", localStorage.getItem("resumeAnalysis") || "{}");

              localStorage.setItem("currentInterviewId", data.interviewId || data.sessionId);
              localStorage.setItem("interviewSessionId", data.sessionId || data.interviewId);
              localStorage.setItem("active_interview_id", data.interviewId || data.sessionId);
              localStorage.setItem("interviewQuestions", JSON.stringify(data.questions || []));
              localStorage.setItem("interviewStartTime", Date.now().toString());
              localStorage.setItem("warningCount", "0");
              localStorage.setItem("interviewAnswers", "{}");
              localStorage.setItem("interviewEvaluations", "[]");
              localStorage.setItem("interviewWarnings", "[]");
              localStorage.setItem("currentQuestionIndex", "0");
              localStorage.removeItem("interviewTerminated");
              localStorage.removeItem("terminationReason");

              navigate("/active-interview");
            } catch (error) {
              console.error("Start interview error:", error);
              setError(error.message || "Network error connecting to backend.");
            } finally {
              setLoading(false);
            }
          }} className="btn btn-primary"  style={{ width: '100%', marginTop: '1.5rem', padding: '1rem' }} disabled={skills.length === 0 || loading}>
            {loading ? 'Starting...' : 'Start Interview'}
          </button>
        </div>
      )}
    </div>
  );
}

export default RegisterInterview;
