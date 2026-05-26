import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatToIST, formatToDDMMYYYY } from '../utils/dateUtils';

function Results({ user: propUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { interviewId: routeInterviewId } = useParams();
  const validRouteId = routeInterviewId && routeInterviewId !== "id" ? routeInterviewId : null;
  const interviewIdFromState = validRouteId || localStorage.getItem("currentInterviewId") || localStorage.getItem("interviewSessionId");

  useEffect(() => {
    if (routeInterviewId === "id" && interviewIdFromState) {
      navigate(`/results/${interviewIdFromState}`, { replace: true });
    }
  }, [routeInterviewId, interviewIdFromState, navigate]);

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);
  const [modalTab, setModalTab] = useState('resume');
  const [slowLoading, setSlowLoading] = useState(false);
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setSlowLoading(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const [techSearch, setTechSearch] = useState('');
  const [techDifficultyFilter, setTechDifficultyFilter] = useState('All');
  const [techStatusFilter, setTechStatusFilter] = useState('All');

  const user = propUser || JSON.parse(localStorage.getItem("user") || "null");
  const email = user?.email || localStorage.getItem("email") || "";

  useEffect(() => {
    if (!email) return;
    const loadAttempts = async () => {
      try {
        const res = await api.getUserInterviews(email);
        if (res.success && res.interviews) {
          const list = res.interviews.filter(att => att.status === 'completed' || att.status === 'terminated' || att.status === 'active' || att.status === 'evaluating');
          list.sort((a, b) => b.attempt_no - a.attempt_no);
          setAttempts(list);
          if (list.length > 0) {
            const matched = list.find(x => x.id == interviewIdFromState || x.session_id == interviewIdFromState || x.interview_id == interviewIdFromState);
            const initialId = matched ? matched.id : list[0].id;
            setSelectedAttemptId(initialId);
          }
        }
      } catch (err) {}
    };
    loadAttempts();
  }, [email]);

  useEffect(() => {
    if (!email) {
      setLoading(false);
      return;
    }
    fetchData(true, selectedAttemptId);
    const interval = setInterval(() => {
      fetchData(false, selectedAttemptId);
    }, 30000);
    return () => clearInterval(interval);
  }, [email, selectedAttemptId]);

  const fetchData = async (showLoading = true, targetIntvId = null) => {
    let intvId = targetIntvId || selectedAttemptId || interviewIdFromState || localStorage.getItem("currentInterviewId") || localStorage.getItem("active_interview_id") || localStorage.getItem("interviewSessionId");
    if (!intvId && attempts.length > 0) {
      intvId = attempts[0].id;
    }
    if (!intvId) {
      if (showLoading) setLoading(false);
      return;
    }
    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    try {
      const userId = user?.id || localStorage.getItem("userId") || "";
      const userRole = localStorage.getItem("userRole") || localStorage.getItem("role") || "";
      const token = localStorage.getItem("token") || "";
      
      const API_BASE_URL = import.meta.env.VITE_API_URL || "https://ai-proctoring-backend-5t3k.onrender.com";
      const response = await fetch(`${API_BASE_URL}/api/interview/report/${intvId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "",
          "X-User-Id": userId,
          "X-User-Role": userRole
        }
      });
      
      const res = await response.json();
      
      if (res.success) {
        setReportData(res);
      } else {
        throw new Error(res.message || "Failed to load detailed results.");
      }
    } catch (err) {
      let localQuestions = [];
      try {
        const iq = localStorage.getItem("interviewQuestions");
        localQuestions = iq && iq !== "undefined" ? JSON.parse(iq) : [];
      } catch (e) {}
      if (localQuestions.length > 0) {
        const localAnswersStr = localStorage.getItem("interviewAnswers") || localStorage.getItem("answers") || "{}";
        const localAnswers = JSON.parse(localAnswersStr);
        const localEvalsStr = localStorage.getItem("interviewEvaluations") || "[]";
        const localEvals = JSON.parse(localEvalsStr);
        const localWarnings = JSON.parse(localStorage.getItem("interviewWarnings") || "[]");
        const localSkills = JSON.parse(localStorage.getItem("detectedSkills") || "[]");
        const localResumeStr = localStorage.getItem("resumeAnalysis") || "{}";
        const localResume = JSON.parse(localResumeStr);

        let sumOverall = 0;
        let sumTech = 0;
        let sumComm = 0;
        let evalDict = {};

        if (Array.isArray(localEvals)) {
           localEvals.forEach(e => {
             evalDict[e.questionId] = e;
             sumOverall += (e.score || 0);
             sumTech += (e.technicalScore || 0);
             sumComm += (e.communicationScore || 0);
           });
        }

        const answeredCount = Object.values(localAnswers).filter(a => a && a.trim().length > 0).length;
        const skippedCount = localQuestions.length - answeredCount;
        const evalCount = Object.keys(evalDict).length || 1;
        
        const avgOverall = Math.round(sumOverall / evalCount) || 0;

        const atsScore = parseInt(localStorage.getItem("atsScore") || "0", 10);
        const edScore = parseInt(localStorage.getItem("educationScore") || "0", 10);
        const skScore = parseInt(localStorage.getItem("skillsScore") || "0", 10);
        
        setReportData({
          success: true,
          isFallback: true,
          interview: { 
            id: intvId, 
            role_applied: localStorage.getItem("targetRole") || "Candidate", 
            overall_score: avgOverall > 0 ? avgOverall * 10 : (answeredCount >= 15 ? 75 : 0), 
            status: "completed",
            start_time: localStorage.getItem("interviewStartTime") ? new Date(parseInt(localStorage.getItem("interviewStartTime"))).toISOString() : new Date().toISOString()
          },
          candidate: { name: user?.name || user?.full_name || "Candidate", email: email, role: localStorage.getItem("targetRole") || "Software Engineer" },
          decision: answeredCount >= 15 ? "Shortlisted" : "Review",
          answered_count: answeredCount,
          skipped_count: skippedCount,
          total_technical: localQuestions.length,
          ai_summary_text: "Based on the local evaluation data, the candidate completed " + answeredCount + " questions.",
          ai_strengths: localResume.strengths || localSkills.slice(0, 3) || ["Communication"],
          ai_improvements: localResume.weaknesses || ["Technical depth"],
          ai_suggestions: ["Practice more scenario-based questions"],
          resume: {
            summary_paragraph: localResume.summary_paragraph || "Candidate resume analyzed successfully.",
            skills: localSkills,
            strengths: localResume.strengths || [],
            weaknesses: localResume.weaknesses || [],
            ats_score: atsScore || 75,
            experience_score: edScore || 80,
            skills_score: skScore || 85,
            role_match_score: 80,
            project_score: 70,
            education_score: edScore || 80,
            matched_skills: localSkills,
            missing_skills: []
          },
          questions: localQuestions.map(q => {
            const ev = evalDict[q.id] || {};
            return {
              question_number: q.questionNumber || q.id,
              question_text: q.question,
              answer_text: localAnswers[q.id] || "",
              ai_feedback: ev.feedback || "Not evaluated",
              suggested_improvement: ev.suggestedImprovement || "",
              score: ev.score || 0,
              technical_score: ev.technicalScore || 0,
              communication_score: ev.communicationScore || 0,
              confidence_score: ev.confidenceScore || 0,
              skill_tag: q.skill || "Technical"
            };
          }),
          skill_breakdown: localSkills.map(sk => ({
            skill: sk,
            total: 3,
            correct: 2,
            score: 70
          })),
          warnings: localWarnings.map(w => ({ violation_type: w.message || "Warning", created_at: w.time || Date.now() }))
        });
      } else {
        setError(err.message || "An error occurred while fetching details.");
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadPDFReport = (d) => {
    if (!d) return;
    const doc = new jsPDF();
    const primaryColor = [30, 58, 95];
    const secondaryColor = [79, 70, 229];

    const addPageHeader = (title) => {
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(title, 14, 13);
      doc.setFontSize(8);
      doc.text(`ID: ${d.interview?.id || 'N/A'} | Candidate: ${d.candidate?.name || 'N/A'}`, 196, 13, { align: 'right' });
      doc.setTextColor(0, 0, 0);
    };

    const addPageFooter = (pNum) => {
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Page ${pNum}`, 105, 287, { align: 'center' });
    };

    let pageNum = 1;

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("AI PROCTORING ASSESSMENT REPORT", 14, 25);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Report Generated (IST): ${formatToIST(new Date().toISOString())}`, 14, 34);

    doc.setTextColor(0, 0, 0);
    let y = 52;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("1. CANDIDATE & SESSION DETAILS", 14, y);
    doc.line(14, y + 2, 196, y + 2);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    y += 10;

    doc.text(`Name: ${d.candidate?.name || 'N/A'}`, 14, y);
    doc.text(`Email: ${d.candidate?.email || 'N/A'}`, 110, y);
    y += 6;
    doc.text(`Applied Role: ${d.candidate?.role || 'N/A'}`, 14, y);
    doc.text(`Phone: ${d.candidate?.phone || 'N/A'}`, 110, y);
    y += 6;
    doc.text(`Interview ID: ${d.interview?.id || 'N/A'}`, 14, y);
    const intvDate = d.interview?.created_at || d.interview?.start_time;
    doc.text(`Session Date (IST): ${intvDate ? formatToIST(intvDate) : 'N/A'}`, 110, y);
    y += 6;
    doc.text(`Duration: ${d.interview?.duration || 'N/A'}`, 14, y);
    doc.text(`Hiring Status: ${d.decision || 'Pending Review'}`, 110, y);
    
    y += 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("2. PERFORMANCE SCORE CARD", 14, y);
    doc.line(14, y + 2, 196, y + 2);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    y += 10;

    const overallScore = d.interview?.overall_score || 0;
    doc.text(`Overall Score: ${overallScore}%`, 14, y);
    doc.text(`Technical Score: ${d.interview?.technical_score || 0}%`, 60, y);
    doc.text(`Communication Score: ${d.interview?.communication_score || 0}%`, 110, y);
    doc.text(`Confidence Level: ${d.interview?.confidence_level || 'N/A'}`, 155, y);
    
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("3. AI PERFORMANCE SUMMARY", 14, y);
    doc.line(14, y + 2, 196, y + 2);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    y += 10;

    const splitSummary = doc.splitTextToSize(d.ai_summary_text || d.summary || "No summary available.", 182);
    doc.text(splitSummary, 14, y);
    y += (splitSummary.length * 4.5) + 6;

    if (d.ai_suggestions && d.ai_suggestions.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("AI Suggestions & Recommendations:", 14, y);
      doc.setFont("helvetica", "normal");
      y += 6;
      d.ai_suggestions.forEach(sug => {
        const splitSug = doc.splitTextToSize(`• ${sug}`, 182);
        doc.text(splitSug, 14, y);
        y += (splitSug.length * 4.5);
      });
    }

    addPageFooter(pageNum);

    doc.addPage();
    pageNum += 1;
    addPageHeader("4. RESUME EVALUATION & ATS METRICS");
    y = 30;

    if (d.resume && d.resume.summary_paragraph && d.resume.summary_paragraph !== "No resume uploaded yet.") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text("Resume Summary:", 14, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      y += 6;
      const splitResumeSummary = doc.splitTextToSize(d.resume.summary_paragraph, 182);
      doc.text(splitResumeSummary, 14, y);
      y += (splitResumeSummary.length * 4.5) + 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text("ATS Scoring Matrix:", 14, y);
      y += 4;
      
      const atsData = [
        ["ATS Score", `${d.resume.ats_score || 0}/100`, "Role Match", `${d.resume.role_match_score || 0}/100`],
        ["Experience Fit", `${d.resume.experience_score || 0}/100`, "Project Weight", `${d.resume.project_score || 0}/100`],
        ["Skills Weight", `${d.resume.skills_score || 0}/100`, "Education Match", `${d.resume.education_score || 0}/100`]
      ];
      
      doc.autoTable({
        startY: y,
        head: [["Metric", "Score", "Metric", "Score"]],
        body: atsData,
        theme: 'grid',
        headStyles: { fillColor: secondaryColor },
        margin: { left: 14, right: 14 }
      });
      y = doc.lastAutoTable.finalY + 10;

      doc.setFont("helvetica", "bold");
      doc.text("Strengths:", 14, y);
      doc.setFont("helvetica", "normal");
      y += 6;
      (d.resume.strengths || []).forEach(st => {
        doc.text(`• ${st}`, 18, y);
        y += 5;
      });
      y += 3;

      doc.setFont("helvetica", "bold");
      doc.text("Weaknesses / Gaps:", 14, y);
      doc.setFont("helvetica", "normal");
      y += 6;
      (d.resume.weaknesses || []).forEach(wk => {
        doc.text(`• ${wk}`, 18, y);
        y += 5;
      });
      y += 6;

      doc.setFont("helvetica", "bold");
      doc.text("Detected Skills:", 14, y);
      doc.setFont("helvetica", "normal");
      y += 5;
      const skillsStr = (d.resume.skills || []).join(', ') || 'N/A';
      const splitSkills = doc.splitTextToSize(skillsStr, 182);
      doc.text(splitSkills, 14, y);
      y += (splitSkills.length * 4.5) + 6;

      doc.setFont("helvetica", "bold");
      doc.text("Skills Gap Analysis:", 14, y);
      doc.setFont("helvetica", "normal");
      y += 5;
      const matchedStr = `Matched: ${(d.resume.matched_skills || []).join(', ') || 'None'}`;
      const missingStr = `Missing: ${(d.resume.missing_skills || []).join(', ') || 'None'}`;
      const splitMatched = doc.splitTextToSize(matchedStr, 182);
      doc.text(splitMatched, 14, y);
      y += (splitMatched.length * 4.5) + 2;
      const splitMissing = doc.splitTextToSize(missingStr, 182);
      doc.text(splitMissing, 14, y);
      y += (splitMissing.length * 4.5) + 6;

      if (d.combined_analysis) {
        doc.setFont("helvetica", "bold");
        doc.text(`Recommendation: ${d.combined_analysis.recommendation}`, 14, y);
        doc.setFont("helvetica", "normal");
      }
    } else {
      doc.setFont("helvetica", "italic");
      doc.text("No resume uploaded or analyzed.", 14, y);
    }

    addPageFooter(pageNum);

    doc.addPage();
    pageNum += 1;
    addPageHeader("5. DETAILED TECHNICAL QUESTION EVALUATION");
    y = 30;

    const qData = (d.scored_technical || []).map(q => [
      `Q${q.question_no}`,
      q.question_text || 'N/A',
      q.candidate_answer || q.answer_text || 'Skipped',
      `Tech: ${q.content_score || 0}/5\nClarity: ${q.clarity_score || 0}/5\nConf: ${q.confidence_score || 0}/5`,
      q.correctness_status || q.result || 'N/A',
      q.ai_feedback || q.feedback || 'N/A'
    ]);

    doc.autoTable({
      startY: y,
      head: [["No.", "Question Text", "Candidate Answer", "Scores", "Status", "AI Evaluation Feedback"]],
      body: qData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 },
        3: { cellWidth: 20 },
        4: { cellWidth: 15 },
        5: { cellWidth: 55 }
      },
      margin: { left: 14, right: 14 }
    });

    addPageFooter(pageNum);

    if (d.chat && d.chat.length > 0) {
      doc.addPage();
      pageNum += 1;
      addPageHeader("6. INTERVIEW CONVERSATION LOG");
      y = 30;

      d.chat.forEach(msg => {
        const roleName = msg.role === 'ai' ? 'AI Assistant' : (d.candidate?.name || 'Candidate');
        const textStr = `${roleName}: ${msg.text}`;
        const splitMsg = doc.splitTextToSize(textStr, 182);
        
        if (y + (splitMsg.length * 4.5) > 270) {
          addPageFooter(pageNum);
          doc.addPage();
          pageNum += 1;
          addPageHeader("6. INTERVIEW CONVERSATION LOG");
          y = 30;
        }
        
        doc.setFont("helvetica", msg.role === 'ai' ? 'bold' : 'normal');
        doc.text(splitMsg, 14, y);
        y += (splitMsg.length * 4.5) + 3;
      });
      addPageFooter(pageNum);
    }

    doc.addPage();
    pageNum += 1;
    addPageHeader("7. IGNORED PROMPTS & PROCTORING INTEGRITY");
    y = 30;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("System / Ignored Prompts Log:", 14, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    y += 6;

    if (d.ignored_prompts && d.ignored_prompts.length > 0) {
      d.ignored_prompts.forEach(p => {
        const pText = `Prompt: ${p.question_text || 'N/A'}`;
        const rText = `Response: ${p.candidate_answer || p.answer_text || 'N/A'}`;
        const splitP = doc.splitTextToSize(pText, 182);
        const splitR = doc.splitTextToSize(rText, 182);

        if (y + (splitP.length * 4.5) + (splitR.length * 4.5) > 270) {
          addPageFooter(pageNum);
          doc.addPage();
          pageNum += 1;
          addPageHeader("7. IGNORED PROMPTS & PROCTORING INTEGRITY");
          y = 30;
        }
        doc.setFont("helvetica", "bold");
        doc.text(splitP, 14, y);
        y += (splitP.length * 4.5);
        doc.setFont("helvetica", "normal");
        doc.text(splitR, 14, y);
        y += (splitR.length * 4.5) + 4;
      });
    } else {
      doc.text("No system/setup prompts recorded or ignored.", 14, y);
      y += 8;
    }

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Proctoring Violations Audit Log:", 14, y);
    doc.setFont("helvetica", "normal");
    y += 4;

    const violationData = [
      ["Camera Off Alerts", `${d.violations?.camera_off || 0} occurrences`],
      ["Audio Muted Alerts", `${d.violations?.audio_muted || 0} occurrences`],
      ["Tab Switches / Blur", `${d.violations?.tab_switches || 0} occurrences`],
      ["Face Not Detected Alerts", `${d.violations?.no_face || 0} occurrences`],
      ["Multiple Faces Detected", `${d.violations?.multiple_faces || 0} occurrences`],
      ["Total Warning Counts", `${d.interview?.warning_count || 0} warning triggers`]
    ];

    doc.autoTable({
      startY: y,
      head: [["Integrity Check Type", "Status / Count"]],
      body: violationData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor },
      margin: { left: 14, right: 14 }
    });

    addPageFooter(pageNum);
    
    doc.save(`Assessment_Report_${(d.candidate?.name || 'Student').replace(/\s+/g, '_')}_${d.interview?.id || 'N/A'}.pdf`);
  };

  if (!email) {
    return (
      <div className="card" style={{ textAlign: 'center', marginTop: '100px', padding: '50px' }}>
        <h2 style={{ color: '#e53e3e' }}>Login Required</h2>
        <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/login')}>Login Now</button>
      </div>
    );
  }

  if (loading && !reportData) {
    return (
      <div className="card" style={{ textAlign: 'center', marginTop: '100px', padding: '50px' }}>
        <h2>Loading results...</h2>
      </div>
    );
  }

  if (error && !reportData) {
    return (
      <div className="card" style={{ textAlign: 'center', marginTop: '100px', padding: '50px' }}>
        <h2 style={{ color: '#dc2626' }}>Error Loading Results</h2>
        <p style={{ color: '#64748b', marginTop: '10px' }}>{error}</p>
        <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => fetchData(true)}>Retry</button>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="card" style={{ textAlign: 'center', marginTop: '100px', padding: '50px' }}>
        <h2>No interview result found.</h2>
        <p style={{ color: '#64748b' }}>Please complete an interview first.</p>
        <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
      </div>
    );
  }

  const d = reportData;
  if (d) {
    d.answered_count = d.answered_count || 0;
    d.skipped_count = d.skipped_count || 0;
    d.total_technical = d.total_technical || (d.questions ? d.questions.length : 30);
    if (!d.interview) d.interview = {};
    d.interview.overall_score = d.interview.overall_score || 0;
  }


  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="card" style={{ padding: '30px', background: '#ffffff', color: '#1e293b', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h1 style={{ color: '#1e3a5f', margin: 0, fontSize: '1.8rem' }}>Interview Performance Analysis</h1>
            <div style={{ display: 'flex', gap: '15px', marginTop: '5px', fontSize: '0.9rem', color: '#64748b', flexWrap: 'wrap' }}>
              <span><strong>Candidate:</strong> {d.candidate?.name}</span>
              <span>|</span>
              <span><strong>Role Applied:</strong> {d.candidate?.role}</span>
              <span>|</span>
              <span><strong>Date:</strong> {d.interview?.start_time || 'N/A'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              onClick={() => downloadPDFReport(d)} 
              style={{ background: '#0f766e', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#0d5e58'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#0f766e'}
            >
              📥 Download Report
            </button>
            <button 
              onClick={() => window.print()} 
              style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
            >
              🖨️ Print Results
            </button>
          </div>
        </div>

        {attempts.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px', background: '#f8fafc', padding: '12px 18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontWeight: 'bold', color: '#1e3a5f', fontSize: '0.9rem' }}>Select Attempt:</span>
            <select
              value={selectedAttemptId || ''}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setSelectedAttemptId(val);
                fetchData(true, val);
              }}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.85rem', color: '#2d3748', background: '#fff', cursor: 'pointer' }}
            >
              {attempts.map((att) => (
                <option key={att.id} value={att.id}>
                  Attempt {att.attempt_no || 1} - {att.role_applied || 'Software Engineer'} ({formatToDDMMYYYY(att.created_at)})
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
                    <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Status</span>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', marginTop: '2px', color: d.interview?.status === 'Terminated' ? '#e53e3e' : '#38a169' }}>
              {d.interview?.status === 'Terminated' ? 'Terminated' : 'Completed'}
            </div>
            {d.interview?.status === 'Terminated' && <div style={{ fontSize: '0.8rem', color: '#e53e3e', marginTop: '4px' }}>{d.interview?.termination_reason}</div>}
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Interview ID</span>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', marginTop: '2px', color: '#1e3a5f' }}>{d.interview?.id || 'N/A'}</div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Rating Score</span>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', marginTop: '2px', color: '#3182ce' }}>{d.interview?.overall_score}%</div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Performance Badge</span>
            <div style={{ marginTop: '4px' }}>
              <span style={{
                padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold',
                background: d.interview?.overall_score >= 80 ? '#dcfce7' : (d.interview?.overall_score >= 65 ? '#eff6ff' : (d.interview?.overall_score >= 50 ? '#fef3c7' : '#fee2e2')),
                color: d.interview?.overall_score >= 80 ? '#166534' : (d.interview?.overall_score >= 65 ? '#1e40af' : (d.interview?.overall_score >= 50 ? '#92400e' : '#991b1b'))
              }}>
                {d.interview?.overall_score >= 80 ? 'Excellent' : (d.interview?.overall_score >= 65 ? 'Good' : (d.interview?.overall_score >= 50 ? 'Average' : 'Poor'))}
              </span>
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total / Tech Qs</span>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', marginTop: '2px' }}>{d.answered_count + d.skipped_count} Asked / {d.total_technical} Scored</div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Answered / Skipped</span>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', marginTop: '2px', color: '#10b981' }}>{d.answered_count} Ans / {d.skipped_count} Skip</div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Hiring Status</span>
            <div style={{ marginTop: '4px' }}>
              <span style={{
                padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold',
                background: d.decision === 'Shortlisted' ? '#dcfce7' : (d.decision === 'Hiring in Process' ? '#fef3c7' : (d.decision === 'Not Shortlisted' ? '#fee2e2' : '#f1f5f9')),
                color: d.decision === 'Shortlisted' ? '#166534' : (d.decision === 'Hiring in Process' ? '#92400e' : (d.decision === 'Not Shortlisted' ? '#991b1b' : '#475569'))
              }}>
                {d.decision ? d.decision.toUpperCase() : 'PENDING REVIEW'}
              </span>
            </div>
          </div>
        </div>

        {d.interview?.status === 'terminated' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '20px', marginTop: '20px', borderLeft: '6px solid #ef4444' }}>
            <h3 style={{ color: '#991b1b', margin: '0 0 8px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              ⚠️ Interview Terminated by Admin
            </h3>
            <p style={{ color: '#b91c1c', margin: 0, fontSize: '0.9rem', fontWeight: '500' }}>
              Reason: {d.interview?.termination_reason || 'Administrative policy violation or suspicious activity detected during live proctoring.'}
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
          <div className="card" style={{ background: '#eff6ff', borderLeft: '5px solid #3b82f6', padding: '20px', borderRadius: '12px' }}>
            <div style={{ fontWeight: '700', color: '#1e40af', fontSize: '1rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🤖</span> AI Performance Summary & Feedback
            </div>
            <div style={{ color: '#1e3a8a', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '15px' }}>
              {d.ai_summary_text || d.summary || "No AI feedback summary available yet."}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 'bold', display: 'block' }}>QUALIFICATION STATUS</span>
                <span style={{
                  fontSize: '0.95rem', fontWeight: '800',
                  color: d.answered_count >= 15 ? '#16a34a' : '#dc2626'
                }}>
                  {d.answered_count >= 15 ? 'Qualified' : 'Not Qualified'}
                </span>
              </div>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 'bold', display: 'block' }}>HIRING STATUS</span>
                <span style={{
                  fontSize: '0.95rem', fontWeight: '800',
                  color: d.answered_count >= 15 ? '#16a34a' : '#dc2626'
                }}>
                  {d.answered_count >= 15 ? 'Shortlisted' : 'Not Shortlisted'}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 'bold', display: 'block' }}>OVERALL SCORE</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e40af' }}>
                  {d.interview?.overall_score}%
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 'bold', display: 'block' }}>ANSWERED QUESTIONS</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#16a34a' }}>
                  {d.answered_count} / {d.total_technical || 30}
                </span>
              </div>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 'bold', display: 'block' }}>SKIPPED QUESTIONS</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#4b5563' }}>
                  {d.skipped_count}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {d.ai_strengths && d.ai_strengths.length > 0 && (
              <div className="card" style={{ background: '#f0fdf4', borderLeft: '5px solid #16a34a', padding: '16px', borderRadius: '10px' }}>
                <div style={{ fontWeight: '700', color: '#14532d', fontSize: '0.95rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💪</span> Key Strengths
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#15803d', fontSize: '0.85rem', lineHeight: '1.4' }}>
                  {d.ai_strengths.map((st, idx) => <li key={idx}>{st}</li>)}
                </ul>
              </div>
            )}

            {d.ai_improvements && d.ai_improvements.length > 0 && (
              <div className="card" style={{ background: '#fdf2f2', borderLeft: '5px solid #ef4444', padding: '16px', borderRadius: '10px' }}>
                <div style={{ fontWeight: '700', color: '#991b1b', fontSize: '0.95rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚠️</span> Areas for Improvement (Weaknesses)
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#b91c1c', fontSize: '0.85rem', lineHeight: '1.4' }}>
                  {d.ai_improvements.map((wk, idx) => <li key={idx}>{wk}</li>)}
                </ul>
              </div>
            )}

            {d.ai_suggestions && d.ai_suggestions.length > 0 && (
              <div className="card" style={{ background: '#fbf7ff', borderLeft: '5px solid #8b5cf6', padding: '16px', borderRadius: '10px' }}>
                <div style={{ fontWeight: '700', color: '#5b21b6', fontSize: '0.95rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💡</span> AI Personalized Suggestions
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#6d28d9', fontSize: '0.85rem', lineHeight: '1.4' }}>
                  {d.ai_suggestions.map((sug, idx) => <li key={idx}>{sug}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', gap: '8px', marginTop: '30px', overflowX: 'auto', paddingBottom: '2px' }}>
          {[
            { id: 'resume', label: '📄 Resume & ATS' },
            { id: 'skills', label: '🛠️ Skill Breakdown' },
            { id: 'chat', label: '💬 Chronological Chat' },
            { id: 'technical', label: '💻 Technical Analysis' },
            { id: 'ignored', label: '⚙️ Ignored Prompts' },
            { id: 'violations', label: '⚠️ Proctoring Integrity' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setModalTab(t.id)}
              style={{
                padding: '12px 18px', border: 'none', background: 'none', fontSize: '0.9rem', fontWeight: '600',
                color: modalTab === t.id ? '#3182ce' : '#64748b', borderBottom: modalTab === t.id ? '3px solid #3182ce' : '3px solid transparent',
                cursor: 'pointer', transition: 'all 0.2s', paddingBottom: '8px', whiteSpace: 'nowrap'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ minHeight: '300px', marginTop: '20px' }}>
          {modalTab === 'resume' && (
            <div style={{ display: 'grid', gridTemplateColumns: d.resume ? '1fr 1fr' : '1fr', gap: '20px' }}>
              {d.resume ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 10px', color: '#1e3a5f', fontSize: '1.05rem', fontWeight: 'bold' }}>Resume Summary</h3>
                      <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem', lineHeight: '1.6' }}>{d.resume.summary_paragraph || 'No summary available.'}</p>
                    </div>
                    
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 12px', color: '#1e3a5f', fontSize: '1.05rem', fontWeight: 'bold' }}>Skill Matrix</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {(d.resume.skills || []).map((skill, sIdx) => (
                          <span key={sIdx} style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' }}>{skill}</span>
                        ))}
                        {(!d.resume.skills || d.resume.skills.length === 0) && <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No skills detected.</span>}
                      </div>
                    </div>

                    <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 12px', color: '#1e3a5f', fontSize: '1.05rem', fontWeight: 'bold' }}>Strengths & Opportunities</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: '#166534' }}>Strengths:</strong>
                          <ul style={{ margin: '4px 0 0', paddingLeft: '20px', color: '#475569', fontSize: '0.85rem' }}>
                            {(d.resume.strengths || []).map((s, idx) => <li key={idx}>{s}</li>)}
                          </ul>
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: '#991b1b' }}>Weaknesses:</strong>
                          <ul style={{ margin: '4px 0 0', paddingLeft: '20px', color: '#475569', fontSize: '0.85rem' }}>
                            {(d.resume.weaknesses || []).map((w, idx) => <li key={idx}>{w}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 16px', color: '#1e3a5f', fontSize: '1.05rem', fontWeight: 'bold' }}>ATS Resume Scoring Matrix</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        {[
                          { label: 'ATS Score', val: d.resume.ats_score || 0, col: '#4f46e5' },
                          { label: 'Role Match', val: d.resume.role_match_score || 0, col: '#0891b2' },
                          { label: 'Experience', val: d.resume.experience_score || 0, col: '#059669' },
                          { label: 'Project Weight', val: d.resume.project_score || 0, col: '#7c3aed' },
                          { label: 'Skills Weight', val: d.resume.skills_score || 0, col: '#e11d48' },
                          { label: 'Education Match', val: d.resume.education_score || 0, col: '#d97706' }
                        ].map((score, sIdx) => (
                          <div key={sIdx} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>{score.label}</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: score.col, margin: '4px 0' }}>{score.val}/100</div>
                            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: score.col, width: `${score.val}%` }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 12px', color: '#1e3a5f', fontSize: '1.05rem', fontWeight: 'bold' }}>Skills Gap Analysis</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#166534' }}>Matched Role Skills:</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                            {(d.resume.matched_skills || []).map((ms, idx) => (
                              <span key={idx} style={{ background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>{ms}</span>
                            ))}
                            {(!d.resume.matched_skills || d.resume.matched_skills.length === 0) && <span style={{ color: '#86efac', fontSize: '0.75rem' }}>None</span>}
                          </div>
                        </div>
                        
                        <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#991b1b' }}>Missing Skills (Gaps):</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                            {(d.resume.missing_skills || []).map((ms, idx) => (
                              <span key={idx} style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>{ms}</span>
                            ))}
                            {(!d.resume.missing_skills || d.resume.missing_skills.length === 0) && <span style={{ color: '#fca5a5', fontSize: '0.75rem' }}>None</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {d.combined_analysis && (
                      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#1e3a5f', display: 'block', marginBottom: '4px' }}>Combined Resume + Assessment Recommendation:</span>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>{d.combined_analysis.summary}</p>
                        <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#0f766e', marginTop: '8px' }}>Action: {d.combined_analysis.recommendation}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No resume evaluations available for this candidate.</div>
              )}
            </div>
          )}

          {modalTab === 'skills' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {Object.keys(d.skill_groups || {}).map((group, gIdx) => {
                  const items = d.skill_groups[group];
                  const correctCount = items.filter(x => x.status === 'Correct').length;
                  const ratio = items.length > 0 ? (correctCount / items.length) * 100 : 0;
                  const progressColor = ratio >= 75 ? '#10b981' : (ratio >= 50 ? '#f59e0b' : '#ef4444');
                  
                  return (
                    <div key={gIdx} style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                        <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{group}</span>
                        <span style={{ fontWeight: 'bold', color: progressColor }}>{ratio.toFixed(0)}% Match</span>
                      </div>
                      <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '12px' }}>
                        <div style={{ height: '100%', background: progressColor, width: `${ratio}%`, borderRadius: '4px' }}></div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        <strong>Performance:</strong> {correctCount} correct out of {items.length} questions
                      </div>
                    </div>
                  );
                })}
                {(!d.skill_groups || Object.keys(d.skill_groups).length === 0) && (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', gridColumn: '1 / -1' }}>No skill groups evaluated.</div>
                )}
              </div>
            </div>
          )}

          {modalTab === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
              {(d.chat || []).map((msg, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: msg.role === 'ai' ? 'flex-start' : 'flex-end',
                  width: '100%'
                }}>
                  <div style={{
                    maxWidth: '75%',
                    padding: '12px 16px',
                    borderRadius: msg.role === 'ai' ? '12px 12px 12px 0px' : '12px 12px 0px 12px',
                    background: msg.role === 'ai' ? '#ffffff' : '#1e3a5f',
                    color: msg.role === 'ai' ? '#1e293b' : '#ffffff',
                    border: msg.role === 'ai' ? '1px solid #cbd5e1' : 'none',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <span style={{
                      display: 'block',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      color: msg.role === 'ai' ? '#64748b' : '#93c5fd',
                      marginBottom: '4px'
                    }}>
                      {msg.role === 'ai' ? 'AI ASSISTANT' : (d.candidate?.name || 'CANDIDATE')}
                    </span>
                    <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.4' }}>{msg.text}</p>
                  </div>
                </div>
              ))}
              {(!d.chat || d.chat.length === 0) && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No conversation messages found.</div>
              )}
            </div>
          )}

          {modalTab === 'technical' && (
            <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 15px', color: '#1e3a5f', fontSize: '1.1rem', fontWeight: 'bold' }}>Detailed Questions & Answers</h3>
              {(!d.questions || d.questions.length === 0) ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No question evaluations available.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {d.questions.map((q, i) => (
                    <div key={i} style={{ padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div style={{ fontWeight: 'bold', color: '#1e3a8a', fontSize: '1.05rem', flex: 1 }}>Q{q.question_number}: {q.question_text}</div>
                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>{q.skill_tag || 'Technical'}</span>
                      </div>
                      
                      <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #3b82f6', marginBottom: '15px' }}>
                        <strong style={{ color: '#475569', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>Candidate Answer:</strong>
                        <div style={{ color: '#334155', fontSize: '0.95rem', lineHeight: '1.5' }}>{q.answer_text || <em style={{color:'#94a3b8'}}>No answer provided</em>}</div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Overall Score</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: q.score >= 7 ? '#16a34a' : (q.score >= 5 ? '#d97706' : '#dc2626') }}>{q.score || 0}/10</div>
                        </div>
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Technical</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#3b82f6' }}>{q.technical_score || q.score || 0}/10</div>
                        </div>
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Communication</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#8b5cf6' }}>{q.communication_score || q.score || 0}/10</div>
                        </div>
                      </div>

                      <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #16a34a', marginBottom: '10px' }}>
                        <strong style={{ color: '#166534', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>AI Feedback:</strong>
                        <div style={{ color: '#15803d', fontSize: '0.9rem', lineHeight: '1.5' }}>{q.ai_feedback || 'No feedback available.'}</div>
                      </div>
                      
                      {q.suggested_improvement && (
                        <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #d97706' }}>
                          <strong style={{ color: '#92400e', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>Suggested Improvement:</strong>
                          <div style={{ color: '#b45309', fontSize: '0.9rem', lineHeight: '1.5' }}>{q.suggested_improvement}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {modalTab === 'ignored' && (
            <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 15px', color: '#1e3a5f', fontSize: '1.1rem', fontWeight: 'bold' }}>Ignored Prompts & Skipped Questions</h3>
              {(!d.questions || d.questions.filter(q => !q.answer_text || q.answer_text.trim().length < 5).length === 0) ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No ignored prompts found. Candidate answered all questions adequately.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {d.questions.filter(q => !q.answer_text || q.answer_text.trim().length < 5).map((q, i) => (
                    <div key={i} style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #94a3b8' }}>
                      <div style={{ fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Question {q.question_number}: {q.question_text}</div>
                      <div style={{ color: '#ef4444', fontSize: '0.9rem' }}>Status: {(!q.answer_text || q.answer_text.trim() === '') ? 'Skipped completely' : 'Answer too short to evaluate'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {modalTab === 'violations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                  <h3 style={{ margin: '0 0 16px', color: '#1e3a5f', fontSize: '1.05rem', fontWeight: 'bold' }}>Proctoring Violations Log</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { label: 'Camera Off Alerts', count: d.violations?.camera_off || 0 },
                      { label: 'Audio Muted Alerts', count: d.violations?.audio_muted || 0 },
                      { label: 'Tab Switches / Out of Focus', count: d.violations?.tab_switches || 0 },
                      { label: 'Face Not Detected Alerts', count: d.violations?.no_face || 0 },
                      { label: 'Multiple Faces Detected', count: d.violations?.multiple_faces || 0 }
                    ].map((v, vIdx) => (
                      <div key={vIdx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', fontSize: '0.85rem' }}>
                        <span style={{ color: '#475569' }}>{v.label}</span>
                        <span style={{ fontWeight: 'bold', color: v.count > 0 ? '#b91c1c' : '#1e293b' }}>{v.count} alerts</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <h3 style={{ margin: '0', color: '#1e3a5f', fontSize: '1.05rem', fontWeight: 'bold' }}>Integrity Assessment</h3>
                  <div style={{ background: (d.interview?.warning_count || 0) >= 3 ? '#fef2f2' : '#f0fdf4', padding: '16px', borderRadius: '8px', border: (d.interview?.warning_count || 0) >= 3 ? '1px solid #fee2e2' : '1px solid #dcfce7', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>{(d.interview?.warning_count || 0) >= 3 ? '⚠️' : '✅'}</div>
                    <div style={{ fontWeight: 'bold', color: (d.interview?.warning_count || 0) >= 3 ? '#991b1b' : '#15803d', fontSize: '1rem' }}>
                      {(d.interview?.warning_count || 0) >= 3 ? 'High Violation Warning Level' : 'Good Integrity Status'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: (d.interview?.warning_count || 0) >= 3 ? '#b91c1c' : '#166534', marginTop: '6px' }}>
                      Total Warning counts: {d.interview?.warning_count || 0} alerts. Candidate was warned of browser focus loss or face presence issues.
                    </div>
                  </div>
                </div>
              </div>

              <div className="card" style={{ background: '#fff', padding: '20px', border: '1px solid #cbd5e1', borderRadius: '10px' }}>
                <h4 style={{ margin: '0 0 15px', color: '#1e3a5f', fontSize: '1.05rem', fontWeight: 'bold' }}>Proctoring Activity Event Log</h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {d.logs && d.logs.length > 0 ? (
                    d.logs.map((log, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem', borderLeft: '3px solid #cbd5e1', borderColor: log.message.toLowerCase().includes('terminate') ? '#ef4444' : log.message.toLowerCase().includes('warning') ? '#f59e0b' : '#3b82f6' }}>
                        <span style={{ fontWeight: '500', color: '#334155' }}>{log.message}</span>
                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{log.created_at_ist || log.created_at}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>No activity logs recorded for this interview.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: '40px', borderTop: '2px solid #e2e8f0', paddingTop: '30px' }}>
          <h2 style={{ color: '#1e3a5f', fontSize: '1.4rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📝 Detailed Questions & Answers
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {(d.scored_technical || []).map((q, idx) => (
              <div key={idx} style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#1e3a5f', fontSize: '1.05rem' }}>Question {q.question_no}: {q.question_text}</span>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <span style={{ background: '#e2e8f0', color: '#4a5568', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>Difficulty: {q.difficulty || 'Medium'}</span>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>Skill: {q.skill || q.category || 'General'}</span>
                    </div>
                  </div>
                  <span style={{
                    padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold',
                    background: (q.candidate_answer || q.answer_text || '').toLowerCase() === 'skipped' ? '#edf2f7' : '#dcfce7',
                    color: (q.candidate_answer || q.answer_text || '').toLowerCase() === 'skipped' ? '#4a5568' : '#15803d'
                  }}>
                    {(q.candidate_answer || q.answer_text || '').toLowerCase() === 'skipped' ? 'Skipped' : 'Answered'}
                  </span>
                </div>
                <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '10px', fontSize: '0.9rem' }}>
                  <strong style={{ color: '#4a5568', display: 'block', marginBottom: '4px' }}>Candidate Answer:</strong>
                  <span style={{ color: '#2d3748', lineHeight: '1.5' }}>{q.candidate_answer || q.answer_text || 'Skipped'}</span>
                </div>
                {q.ai_feedback || q.feedback ? (
                  <div style={{ background: '#f0fdf4', padding: '12px 16px', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.9rem' }}>
                    <strong style={{ color: '#166534', display: 'block', marginBottom: '4px' }}>AI Feedback & Evaluation {q.content_score ? `(Score: ${q.content_score}/5)` : ''}:</strong>
                    <span style={{ color: '#14532d', lineHeight: '1.5' }}>{q.ai_feedback || q.feedback}</span>
                  </div>
                ) : null}
              </div>
            ))}
            {(!d.scored_technical || d.scored_technical.length === 0) && (
              <div style={{ textAlign: 'center', padding: '30px', color: '#718096' }}>No question evaluations available.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Results;
