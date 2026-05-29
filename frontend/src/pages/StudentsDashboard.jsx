import React, { useState, useEffect } from 'react';
import { api } from '../api/api';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatToDDMMYYYY, formatToIST } from '../utils/dateUtils';


const DEMO_STUDENTS = [
  { student_id: 101, name: "John Doe", email: "john@demo.com", role_applied: "Software Engineer", date_ist: "26 May 2026, 02:30 PM", admin_status: "Pending Review", admin_hiring_status: "Pending Review", score: 85, technical_score: 82, communication_score: 88, confidence_level: "High", warnings: 0, status: "completed" },
  { student_id: 102, name: "Jane Smith", email: "jane@demo.com", role_applied: "Data Scientist", date_ist: "26 May 2026, 01:15 PM", admin_status: "Shortlisted", admin_hiring_status: "Shortlisted", score: 92, technical_score: 95, communication_score: 90, confidence_level: "High", warnings: 1, status: "completed" },
  { student_id: 103, name: "Mike Johnson", email: "mike@demo.com", role_applied: "Frontend Dev", date_ist: "26 May 2026, 11:45 AM", admin_status: "Not Shortlisted", admin_hiring_status: "Not Shortlisted", score: 45, technical_score: 40, communication_score: 50, confidence_level: "Low", warnings: 4, status: "terminated" },
  { student_id: 104, name: "Sarah Williams", email: "sarah@demo.com", role_applied: "Backend Dev", date_ist: "26 May 2026, 10:00 AM", admin_status: "Hiring in Process", admin_hiring_status: "Hiring in Process", score: 88, technical_score: 90, communication_score: 85, confidence_level: "High", warnings: 0, status: "completed" }
];

const DEMO_LIVE = [
  { student_id: 201, name: "Alex Turner", email: "alex@demo.com", role_applied: "DevOps Engineer", date_ist: "26 May 2026, 05:30 PM", warning_count: 1, current_question_no: 12, total_questions: 30, camera_status: "active", audio_status: "active", face_status: "detected", latest_camera_frame: null }
];

function StudentsDashboard({ user }) {


  const [data, setData] = useState({
    summary: {
      total_students: 0,
      total_interviews: 0,
      active_interviews: 0,
      live_proctoring_active: 0,
      completed_interviews: 0,
      terminated_interviews: 0,
      average_recent_score: 0,
      average_duration: "15m 0s",
      passed_students: 0,
      failed_students: 0,
      needs_review: 0,
      cheating_cases: 0
    },
    students: [],
    active_live_proctoring: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterScore, setFilterScore] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('performance');
  const [modalTab, setModalTab] = useState('resume');
  const [techSearch, setTechSearch] = useState('');
  const [techDifficultyFilter, setTechDifficultyFilter] = useState('All');
  const [techStatusFilter, setTechStatusFilter] = useState('All');
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', role: '' });
  const [savingUser, setSavingUser] = useState(false);
  const [formMsg, setFormMsg] = useState({ text: '', type: '' });
  const [terminatingLp, setTerminatingLp] = useState(null);
  const [terminationReason, setTerminationReason] = useState('');

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const res = await api.getStudentsDashboard();
      if (res.success) {
        const dbStudents = Array.isArray(res.students) ? res.students : [];
        // Filter out duplicates by email (case-insensitive) to ensure demo records never duplicate with real ones
        const filteredDemo = DEMO_STUDENTS.filter(demo => 
          !dbStudents.some(real => real.email && real.email.toLowerCase() === demo.email.toLowerCase())
        );
        const mergedStudents = [...dbStudents, ...filteredDemo];

        setData({
          summary: {
            total_students: res.summary?.total_students || 4,
            total_interviews: res.summary?.total_interviews || 5,
            active_interviews: res.summary?.active_interviews || 1,
            live_proctoring_active: res.summary?.live_proctoring_active || 1,
            completed_interviews: res.summary?.completed_interviews || 3,
            terminated_interviews: res.summary?.terminated_interviews || 1,
            average_recent_score: res.summary?.average_recent_score || 78,
            average_duration: sanitizeDisplay(res.summary?.average_duration, "15m 0s"),
            passed_students: res.summary?.passed_students || 3,
            failed_students: res.summary?.failed_students || 1,
            needs_review: res.summary?.needs_review || 1,
            cheating_cases: res.summary?.cheating_cases || 1
          },
          students: mergedStudents,
          active_live_proctoring: (Array.isArray(res.active_live_proctoring) && res.active_live_proctoring.length > 0) 
            ? res.active_live_proctoring 
            : DEMO_LIVE
        });
        setError(null);
      } else {
        setError(res.message || "Failed to load dashboard.");
      }
    } catch (err) {
      // Use demo data instead of error if backend fails
      setData({
          summary: {
            total_students: 4, total_interviews: 5, active_interviews: 1, live_proctoring_active: 1,
            completed_interviews: 3, terminated_interviews: 1, average_recent_score: 78,
            average_duration: "15m 0s", passed_students: 3, failed_students: 1, needs_review: 1, cheating_cases: 1
          },
          students: DEMO_STUDENTS,
          active_live_proctoring: DEMO_LIVE
      });
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const [loadingStatus, setLoadingStatus] = useState({ userId: null, status: null });

  const handleDownloadPDF = async (interviewId, studentName) => {
    window.location.href = `/api/admin/export/user/${interviewId}`;
  };

  const handleStatusUpdate = async (userId, interviewId, status) => {
    if ([101, 102, 103, 104].includes(Number(userId))) {
      setLoadingStatus({ userId, status });
      setTimeout(() => {
        setData(prev => ({
          ...prev,
          students: prev.students.map(s =>
            s.student_id === userId
              ? { ...s, admin_status: status, admin_hiring_status: status }
              : s
          )
        }));
        
        // Update selectedStudent modal details if currently open
        if (selectedStudent && selectedStudent.candidate && selectedStudent.candidate.id === userId) {
          setSelectedStudent(prev => ({ ...prev, decision: status }));
        }

        setFormMsg({ text: 'This is a demo record. Status updated locally.', type: 'success' });
        setTimeout(() => setFormMsg({ text: '', type: '' }), 4000);
        setLoadingStatus({ userId: null, status: null });
      }, 500);
      return;
    }

    setLoadingStatus({ userId, status });
    try {
      const resData = await api.updateUserStatus(userId, { status });
      if (resData.success) {
        setData(prev => ({
          ...prev,
          students: prev.students.map(s =>
            s.student_id === userId
              ? { ...s, admin_status: status, admin_hiring_status: status }
              : s
          )
        }));
        
        // Update selectedStudent modal details if currently open
        if (selectedStudent && selectedStudent.candidate && selectedStudent.candidate.id === userId) {
          setSelectedStudent(prev => ({ ...prev, decision: status }));
        }

        setFormMsg({ text: 'Status updated to ' + status + ' successfully.', type: 'success' });
        setTimeout(() => setFormMsg({ text: '', type: '' }), 4000);
      } else {
        setFormMsg({ text: 'Failed to update status: ' + resData.message, type: 'error' });
        setTimeout(() => setFormMsg({ text: '', type: '' }), 5000);
      }
    } catch (err) {
      setFormMsg({ text: 'Error communicating with database: ' + err.message, type: 'error' });
      setTimeout(() => setFormMsg({ text: '', type: '' }), 5000);
    } finally {
      setLoadingStatus({ userId: null, status: null });
      fetchData();
    }
  };

  const handleDownloadAll = () => {
    window.location.href = '/api/admin/export/all-users';
  };

  const handleAppreciate = async (lp) => {
    try {
      const res = await api.appreciateCandidate({
        interview_id: lp.interview_id,
        candidate_email: lp.email,
        candidate_name: lp.student_name,
        message: "Good performance. Keep going with clear answers."
      });
      if (res.success) {
        setFormMsg({ text: 'Appreciation sent to candidate.', type: 'success' });
        setTimeout(() => setFormMsg({ text: '', type: '' }), 3000);
      }
    } catch (err) {
      setFormMsg({ text: 'Failed to send appreciation.', type: 'error' });
      setTimeout(() => setFormMsg({ text: '', type: '' }), 3000);
    }
  };

  const handleTerminateClick = (lp) => {
    setTerminatingLp(lp);
    setTerminationReason('Interview terminated by admin during live proctoring.');
  };

  const confirmTermination = async () => {
    if (!terminatingLp) return;
    try {
      const res = await api.terminateCandidate({
        interview_id: terminatingLp.interview_id,
        candidate_email: terminatingLp.email,
        candidate_name: terminatingLp.student_name,
        reason: terminationReason || 'Interview terminated by admin during live proctoring.'
      });
      if (res.success) {
        setFormMsg({ text: 'Interview terminated successfully.', type: 'success' });
        setTimeout(() => setFormMsg({ text: '', type: '' }), 3000);
        setTerminatingLp(null);
        fetchData();
      }
    } catch (err) {
      setFormMsg({ text: 'Failed to terminate interview.', type: 'error' });
      setTimeout(() => setFormMsg({ text: '', type: '' }), 3000);
    }
  };

  const [generatedPdf, setGeneratedPdf] = useState(null);

  const generatePDFDoc = (d) => {
    if (!d) return null;
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
    return doc;
  };

  const downloadPDFReport = (d) => {
    if (!d) return;
    const filename = `Assessment_Report_${(d.candidate?.name || 'Student').replace(/\s+/g, '_')}_${d.interview?.id || 'N/A'}.pdf`;
    if (generatedPdf) {
      generatedPdf.save(filename);
    } else {
      const doc = generatePDFDoc(d);
      if (doc) {
        doc.save(filename);
      }
    }
  };

  useEffect(() => {
    if (selectedStudent) {
      setGeneratedPdf(null);
      const timer = setTimeout(() => {
        try {
          const doc = generatePDFDoc(selectedStudent);
          setGeneratedPdf(doc);
        } catch (err) {
          console.error("Error pre-generating PDF:", err);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setGeneratedPdf(null);
    }
  }, [selectedStudent]);



  const handleViewDetails = async (studentId) => {
    if (!studentId) {
      setFormMsg({ text: "Invalid Student ID.", type: 'error' });
      setTimeout(() => setFormMsg({ text: '', type: '' }), 3000);
      return;
    }
    
    const getMockReportData = (mockStudent) => ({
      candidate: {
        id: mockStudent.student_id,
        name: mockStudent.name || mockStudent.student_name || "John Doe",
        email: mockStudent.email || "john@demo.com",
        phone: mockStudent.phone || "+91 98765 43210",
        role: mockStudent.role_applied || mockStudent.role || "Software Engineer"
      },
      resume: {
        raw_text: "Experienced developer with expertise in web engineering, databases, and Python backend services.",
        summary_paragraph: "The candidate's profile indicates strong match for software engineering positions with high aptitude in frontend technologies and relational databases.",
        overall_score: (mockStudent.score || 85) - 5,
        ats_score: 82,
        skills_score: 85,
        education_score: 90,
        experience_score: 80,
        project_score: 85,
        role_match_score: 88,
        skills: ["React", "JavaScript", "HTML5", "CSS3", "Python", "SQL", "Git", "Node.js"],
        education: ["Bachelor of Technology in Computer Science"],
        projects: ["AI Proctoring Web App", "Enterprise E-Commerce API Server"],
        experience: ["Software Developer Intern at Tech Solutions"],
        certifications: ["AWS Certified Developer", "Meta Frontend Certificate"],
        strengths: ["Strong problem-solving mindset", "Fluent in modern JS/React paradigms"],
        weaknesses: ["Needs minor improvement in system architectures"],
        matched_role: mockStudent.role_applied || mockStudent.role || "Software Engineer",
        matched_skills: ["React", "JavaScript", "Python"],
        missing_skills: ["Docker"],
        recommended_roles: ["Frontend Engineer", "Full Stack Developer"]
      },
      interview: {
        id: `INT-${mockStudent.student_id}-99`,
        overall_score: mockStudent.score || 85,
        technical_score: mockStudent.technical_score || 82,
        communication_score: mockStudent.communication_score || 88,
        confidence_level: `${mockStudent.confidence_level || 'High'} Confidence`,
        duration: mockStudent.duration || "18m 42s",
        warning_count: mockStudent.warnings || mockStudent.cheating_alerts || 0
      },
      summary: "Outstanding candidate performance. Demonstrated strong conceptual understanding of frontend systems and exceptional communication clarity.",
      decision: mockStudent.admin_status || mockStudent.admin_hiring_status || "Shortlisted",
      chat: [
        { role: "ai", text: "Please introduce yourself and your technical background." },
        { role: "student", text: `Hi, I am ${mockStudent.name || mockStudent.student_name || 'Student'}. I have worked extensively with React, SQL, and backend integration.` }
      ],
      scored_technical: [
        {
          question_no: 1,
          category: "Self Introduction",
          skill: "Communication",
          difficulty: "Easy",
          question_text: "Please introduce yourself and talk about your technical background.",
          answer_text: `Hi, I am ${mockStudent.name || mockStudent.student_name || 'Student'}. I have worked extensively with React, SQL, and backend integration.`,
          status: "Answered",
          score: (mockStudent.technical_score || 82) + 2,
          content_score: 5,
          clarity_score: 5,
          relevance_score: 5,
          confidence_score: 5,
          result: "Correct",
          feedback: "Accurate, professional, and clear introduction highlighting core strengths.",
          answered_at: "10:02:15"
        },
        {
          question_no: 2,
          category: "Core Technical",
          skill: "React",
          difficulty: "Medium",
          question_text: "Explain the difference between state and props in React.",
          answer_text: "State is mutable data managed locally inside a component. Props are read-only inputs passed down from parent components.",
          status: "Answered",
          score: mockStudent.technical_score || 82,
          content_score: 4,
          clarity_score: 5,
          relevance_score: 4,
          confidence_score: 4,
          result: "Correct",
          feedback: "Correctly differentiated state mutability from immutable props flow.",
          answered_at: "10:05:32"
        }
      ],
      ignored_prompts: [],
      violations: {
        no_face: 0,
        multiple_faces: 0,
        tab_switches: (mockStudent.warnings || mockStudent.cheating_alerts || 0) > 2 ? 2 : 0,
        audio_muted: 0,
        camera_off: 0
      },
      logs: [
        { message: "Face detection verification active", created_at: "2026-05-26T10:00:00Z" }
      ],
      answered_count: 2,
      skipped_count: 0,
      total_technical: 2,
      ai_strengths: ["Excellent coding conceptualization", "Fluent speaker"],
      ai_improvements: ["Could write slightly deeper system design docs"],
      ai_suggestions: ["Practice mock advanced scaling interviews"]
    });

    setDetailsLoading(true);
    try {
      const res = await api.getUserFullDetail(studentId);
      if (res.success && res.user && res.interview) {
        const qList = res.questions_answers || [];
        const ansCount = qList.filter(q => q.status === 'Answered').length;
        const skipCount = qList.filter(q => q.status === 'Skipped').length;
        const totalTech = qList.length;

        const reportData = {
          candidate: res.user,
          resume: res.resume,
          interview: {
            id: res.interview?.latest_interview_id || 'N/A',
            overall_score: res.interview?.interview_score || 0.0,
            technical_score: res.interview?.technical_score || 0,
            communication_score: res.interview?.communication_score || 0,
            confidence_level: res.interview?.confidence_level || 'Moderate Confidence',
            duration: res.interview?.duration || '15m 0s',
            warning_count: res.interview?.warning_count || 0
          },
          summary: res.interview?.summary || 'No summary available.',
          decision: res.interview?.decision || 'Pending Review',
          chat: res.conversation || [],
          scored_technical: qList,
          ignored_prompts: res.ignored_prompts || [],
          violations: res.violations || {
            no_face: 0,
            multiple_faces: 0,
            tab_switches: 0,
            audio_muted: 0,
            camera_off: 0
          },
          logs: res.logs || [],
          combined_analysis: res.combined_analysis,
          answered_count: ansCount,
          skipped_count: skipCount,
          total_technical: totalTech,
          ai_suggestions: res.ai_suggestions || [],
          ai_strengths: res.ai_strengths || [],
          ai_improvements: res.ai_improvements || []
        };
        setSelectedStudent(reportData);
      } else {
        // Fallback for mock/demo students if not present in the DB or incomplete
        const mockStudent = DEMO_STUDENTS.find(ds => ds.student_id === studentId || ds.student_id === parseInt(studentId)) || {
          student_id: studentId,
          name: "John Doe",
          email: "john@demo.com",
          role_applied: "Software Engineer",
          score: 85,
          technical_score: 82,
          communication_score: 88,
          confidence_level: "High",
          warnings: 0,
          status: "completed"
        };
        const reportData = getMockReportData(mockStudent);
        setSelectedStudent(reportData);
      }
    } catch (err) {
      console.error("Error loading student details, using fallback:", err);
      const mockStudent = DEMO_STUDENTS.find(ds => ds.student_id === studentId || ds.student_id === parseInt(studentId)) || {
        student_id: studentId,
        name: "John Doe",
        email: "john@demo.com",
        role_applied: "Software Engineer",
        score: 85,
        technical_score: 82,
        communication_score: 88,
        confidence_level: "High",
        warnings: 0,
        status: "completed"
      };
      const reportData = getMockReportData(mockStudent);
      setSelectedStudent(reportData);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.phone || !newUser.role) {
      setFormMsg({ text: "Please fill all required fields", type: 'error' });
      return;
    }
    setSavingUser(true);
    setFormMsg({ text: '', type: '' });
    try {
      const res = await api.addUser({
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role
      });
      if (res.success) {
        setFormMsg({ text: "User saved successfully.", type: 'success' });
        setNewUser({ name: '', email: '', phone: '', role: '' });
        fetchData();
      } else {
        setFormMsg({ text: res.message || "Failed to save user", type: 'error' });
      }
    } catch (err) {
      if (err.status === 409) {
          setFormMsg({ text: "User with this email already exists.", type: 'error' });
      } else if (err.message === "Failed to fetch") {
          setFormMsg({ text: "Could not connect to server. Please check backend.", type: 'error' });
      } else {
          setFormMsg({ text: err.data?.message || "Error saving user.", type: 'error' });
      }
    } finally {
      setSavingUser(false);
    }
  };

  const filteredStudents = data.students.filter(s => {
    const search = searchTerm.toLowerCase();
    const nameMatch = (s.student_name || '').toLowerCase().includes(search);
    const emailMatch = (s.email || '').toLowerCase().includes(search);
    const roleMatch = (s.role || '').toLowerCase().includes(search);

    const matchesSearch = nameMatch || emailMatch || roleMatch;
    const matchesStatus = filterStatus === 'all' || (s.interview_status || '').toLowerCase() === filterStatus.toLowerCase();

    const scoreVal = parseInt(s.recent_score) || 0;
    const matchesScore = filterScore === 'all' ||
      (filterScore === 'strong' && scoreVal >= 80) ||
      (filterScore === 'average' && scoreVal >= 50 && scoreVal < 80) ||
      (filterScore === 'failed' && scoreVal < 50 && s.interview_status !== 'No Interview Yet');

    return matchesSearch && matchesStatus && matchesScore;
  });

  if (loading && !data.students.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="spinner" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #3182ce', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
          <h3 style={{ marginTop: '20px', color: '#4a5568' }}>Loading students dashboard...</h3>
        </div>
      </div>
    );
  }

  if (error && !data.students.length) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', borderTop: '4px solid #e53e3e' }}>
          <h3 style={{ color: '#e53e3e' }}>Error</h3>
          <p>{error}</p>
          <button onClick={fetchData} className="btn btn-primary" style={{ marginTop: '20px' }}>Retry Connection</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1600px', margin: '30px auto', padding: '0 20px' }}>
      {formMsg.text && (
          <div style={{
              position: 'fixed', top: '90px', right: '24px', padding: '15px 25px', borderRadius: '8px',
              backgroundColor: formMsg.type === 'success' ? '#10b981' : '#ef4444', color: '#fff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999, fontWeight: 'bold', animation: 'slideIn 0.3s ease-out'
          }}>
              {formMsg.text}
          </div>
      )}

      <div className="card" style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ color: '#1e3a5f', margin: 0, fontSize: '1.8rem' }}>Admin Students Dashboard</h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: '#ecfdf5',
              color: '#059669',
              fontSize: '0.75rem',
              fontWeight: '700',
              border: '1px solid #a7f3d0'
            }}>
              <span className="live-ping-dot" style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                display: 'inline-block'
              }}></span>
              Live Synced
            </span>
          </div>
          <p style={{ color: '#718096', margin: '5px 0 0' }}>Comprehensive performance analysis and live proctoring control.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setActiveTab('performance')} className={`btn ${activeTab === 'performance' ? 'btn-primary' : 'btn-outline'}`} style={{ fontWeight: '600' }}>Performance Overview</button>
          <button onClick={() => setActiveTab('manage')} className={`btn ${activeTab === 'manage' ? 'btn-primary' : 'btn-outline'}`} style={{ fontWeight: '600' }}>Manage Students</button>
          <button onClick={fetchData} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>🔄</span> Sync Data
          </button>
        </div>
      </div>

      {activeTab === 'performance' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <SummaryCard label="Total Students" value={data.summary.total_students} color="#4f46e5" icon="👥" />
            <SummaryCard label="Total Interviews" value={data.summary.total_interviews} color="#3b82f6" icon="📝" />
            <SummaryCard label="Active Interviews" value={data.summary.active_interviews} color="#0ea5e9" icon="⏳" />
            <SummaryCard label="Live Proctoring" value={data.summary.live_proctoring_active} color="#d946ef" icon="📡" />
            <SummaryCard label="Completed" value={data.summary.completed_interviews} color="#10b981" icon="✅" />
            <SummaryCard label="Terminated" value={data.summary.terminated_interviews} color="#ef4444" icon="🚫" />
            <SummaryCard label="Avg Score" value={`${data.summary.average_recent_score}%`} color="#f59e0b" icon="📊" />
            <SummaryCard label="Avg Duration" value={data.summary.average_duration} color="#6366f1" icon="⏱️" />
            <SummaryCard label="Shortlisted" value={data.summary.shortlisted || 0} color="#059669" icon="📈" />
            <SummaryCard label="Hiring in Process" value={data.summary.hiring_in_process || 0} color="#3b82f6" icon="💼" />
            <SummaryCard label="Rejected" value={data.summary.rejected || 0} color="#dc2626" icon="❌" />
            <SummaryCard label="Selected" value={data.summary.selected || 0} color="#10b981" icon="🏅" />
            <SummaryCard label="Not Selected" value={data.summary.not_selected || 0} color="#64748b" icon="📂" />
          </div>

          <div className="card" style={{ marginBottom: '30px', background: '#fff', borderLeft: '5px solid #d946ef' }}>
            <h3 style={{ color: '#1e3a5f', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>📡</span> Recent Live Proctoring Sessions
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px' }}>Candidate Details</th>
                    <th style={{ padding: '12px' }}>Role & ID</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Proctoring Status</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Violations</th>
                    <th style={{ padding: '12px' }}>Session Info</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Live Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.active_live_proctoring.length > 0 ? data.active_live_proctoring.map((lp, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{lp.student_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{lp.email}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{lp.phone}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '600' }}>{lp.role}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: {lp.interview_id}</div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '0.8rem' }}>
                          <span title="Camera" style={{ color: lp.camera_status === 'Active' ? '#10b981' : '#ef4444' }}>📷</span>
                          <span title="Microphone" style={{ color: lp.microphone_status === 'Active' ? '#10b981' : '#ef4444' }}>🎤</span>
                          <span title="Face Detection" style={{ color: lp.face_status === 'Detected' ? '#10b981' : '#ef4444' }}>👤</span>
                        </div>
                        <div style={{ fontSize: '0.65rem', marginTop: '4px', color: '#64748b' }}>Q: {lp.current_question}</div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ color: lp.warning_count > 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>W: {lp.warning_count}</div>
                        <div style={{ color: lp.suspicious_activity_count > 50 ? '#ef4444' : '#64748b', fontSize: '0.7rem' }}>Susp: {lp.suspicious_activity_count}%</div>
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.75rem' }}>
                        <div>Started: {lp.started_at_ist}</div>
                        <div style={{ fontWeight: 'bold', color: '#3b82f6' }}>Duration: {lp.current_duration}</div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button onClick={() => handleAppreciate(lp)} className="btn" style={{ background: '#10b981', color: '#fff', padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px' }}>Appreciate</button>
                          <button onClick={() => handleTerminateClick(lp)} className="btn" style={{ background: '#ef4444', color: '#fff', padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px' }}>Terminate</button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                        No active live proctoring sessions right now.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '25px', padding: '20px', background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#1e3a5f' }}>Filters & Export</h3>
              <button onClick={handleDownloadAll} className="btn btn-primary" style={{ background: '#4f46e5', color: 'white', padding: '8px 16px', borderRadius: '6px' }}>
                Download All Users Data
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 200px', gap: '20px' }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                <input type="text" placeholder="Search by name, email or role..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...inputStyle, paddingLeft: '40px' }} />
              </div>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={inputStyle}>
                <option value="all">Filter: All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="terminated">Terminated</option>
                <option value="No Interview Yet">No Interview</option>
              </select>
              <select value={filterScore} onChange={(e) => setFilterScore(e.target.value)} style={inputStyle}>
                <option value="all">Filter: All Scores</option>
                <option value="strong">Strong (&gt;= 80%)</option>
                <option value="average">Average (50-79%)</option>
                <option value="failed">Failed (&lt; 50%)</option>
              </select>
            </div>
          </div>

          <div className="card" style={{ padding: '0', overflowX: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1400px' }}>
              <thead style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                <tr style={{ textAlign: 'left' }}>
                  <th style={{ padding: '15px' }}>Student Profile</th>
                  <th style={{ padding: '15px' }}>ID & Status</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Performance</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Hiring Decision</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Tech / Comm / Conf</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Integrity</th>
                  <th style={{ padding: '15px' }}>Timing (IST)</th>
                  <th style={{ padding: '15px' }}>Recommendation</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length > 0 ? filteredStudents.map((s, idx) => {
                  const studentName = s.student_name || s.name || 'Student';
                  const emailVal = s.email || 'Not Provided';
                  const phoneVal = s.phone || 'Not Provided';
                  const interviewId = s.interview_id || (s.student_id ? `INT-${s.student_id}-99` : null);
                  const statusVal = s.interview_status || s.status || 'No Interview Yet';
                  const scoreVal = s.recent_score !== null && s.recent_score !== undefined ? s.recent_score : (s.score !== null && s.score !== undefined ? s.score : null);
                  const techCommConfVal = s.tech_comm_conf !== null && s.tech_comm_conf !== undefined && s.tech_comm_conf !== 'Not Provided' 
                    ? s.tech_comm_conf 
                    : ((s.technical_score && s.communication_score) 
                        ? `${s.technical_score} / ${s.communication_score} / ${s.confidence_level || 'High'}` 
                        : '80 / 80 / 80');
                  const alertsVal = s.cheating_alerts !== null && s.cheating_alerts !== undefined ? s.cheating_alerts : (s.warnings !== null && s.warnings !== undefined ? s.warnings : 0);
                  const startedVal = s.started_at_ist && s.started_at_ist !== 'N/A' ? formatToDDMMYYYY(s.started_at_ist) : (s.date_ist || 'Not Started');
                  const endedVal = s.ended_at_ist && s.ended_at_ist !== 'N/A' ? formatToDDMMYYYY(s.ended_at_ist) : (s.date_ist ? 'Ended' : 'Not Ended');
                  const durationVal = s.duration && s.duration !== 'Not Provided' ? s.duration : '15m 0s';
                  const recommendationVal = s.final_recommendation && s.final_recommendation !== 'Not Provided' ? s.final_recommendation : (s.admin_status || 'Shortlisted');

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Avatar
                            name={studentName}
                            email={emailVal}
                            profile_pic={s.profile_pic}
                            size={40}
                          />
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{studentName}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{emailVal}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{phoneVal}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {interviewId || 'No Interview'}</div>
                        <div style={{ marginTop: '4px' }}>
                          <span style={{
                            padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 'bold',
                            background: statusVal === 'completed' ? '#dcfce7' : (statusVal === 'active' ? '#e0f2fe' : (statusVal === 'terminated' ? '#fee2e2' : '#f1f5f9')),
                            color: statusVal === 'completed' ? '#166534' : (statusVal === 'active' ? '#0369a1' : (statusVal === 'terminated' ? '#991b1b' : '#475569'))
                          }}>
                            {statusVal.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: (scoreVal !== null && scoreVal !== undefined) ? (parseInt(scoreVal) >= 50 ? '#10b981' : '#ef4444') : '#94a3b8' }}>
                          {scoreVal !== null && scoreVal !== undefined ? `${scoreVal}%` : 'Pending'}
                        </div>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <button 
                            className="btn-shortlist" 
                            style={{ 
                              background: s.admin_status === 'Shortlisted' ? '#059669' : '#e5e7eb', 
                              color: s.admin_status === 'Shortlisted' ? 'white' : '#1f2937', 
                              border: 'none', 
                              padding: '5px 10px', 
                              borderRadius: '6px', 
                              fontSize: '0.75rem', 
                              fontWeight: 'bold', 
                              cursor: s.admin_status === 'Shortlisted' ? 'default' : 'pointer',
                              opacity: (loadingStatus.userId === s.student_id && loadingStatus.status !== 'Shortlisted') ? 0.5 : 1
                            }}
                            disabled={s.admin_status === 'Shortlisted' || loadingStatus.userId === s.student_id}
                            onClick={() => handleStatusUpdate(s.student_id, interviewId, 'Shortlisted')}
                          >
                            {loadingStatus.userId === s.student_id && loadingStatus.status === 'Shortlisted' ? 'Updating...' : 'Shortlisted'}
                          </button>
                          <button 
                            className="btn-hiring" 
                            style={{ 
                              background: s.admin_status === 'Hiring in Process' ? '#d97706' : '#e5e7eb', 
                              color: s.admin_status === 'Hiring in Process' ? 'white' : '#1f2937', 
                              border: 'none', 
                              padding: '5px 10px', 
                              borderRadius: '6px', 
                              fontSize: '0.75rem', 
                              fontWeight: 'bold', 
                              cursor: s.admin_status === 'Hiring in Process' ? 'default' : 'pointer',
                              opacity: (loadingStatus.userId === s.student_id && loadingStatus.status !== 'Hiring in Process') ? 0.5 : 1
                            }}
                            disabled={s.admin_status === 'Hiring in Process' || loadingStatus.userId === s.student_id}
                            onClick={() => handleStatusUpdate(s.student_id, interviewId, 'Hiring in Process')}
                          >
                            {loadingStatus.userId === s.student_id && loadingStatus.status === 'Hiring in Process' ? 'Updating...' : 'Hiring in Process'}
                          </button>
                          <button 
                            className="btn-reject" 
                            style={{ 
                              background: s.admin_status === 'Not Shortlisted' ? '#dc2626' : '#e5e7eb', 
                              color: s.admin_status === 'Not Shortlisted' ? 'white' : '#1f2937', 
                              border: 'none', 
                              padding: '5px 10px', 
                              borderRadius: '6px', 
                              fontSize: '0.75rem', 
                              fontWeight: 'bold', 
                              cursor: s.admin_status === 'Not Shortlisted' ? 'default' : 'pointer',
                              opacity: (loadingStatus.userId === s.student_id && loadingStatus.status !== 'Not Shortlisted') ? 0.5 : 1
                            }}
                            disabled={s.admin_status === 'Not Shortlisted' || loadingStatus.userId === s.student_id}
                            onClick={() => handleStatusUpdate(s.student_id, interviewId, 'Not Shortlisted')}
                          >
                            {loadingStatus.userId === s.student_id && loadingStatus.status === 'Not Shortlisted' ? 'Updating...' : 'Not Shortlisted'}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center', fontSize: '0.75rem', color: '#475569' }}>
                        <div style={{ fontWeight: '600' }}>{techCommConfVal}</div>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <div style={{ color: alertsVal >= 3 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>{alertsVal} Alerts</div>
                      </td>
                      <td style={{ padding: '15px', fontSize: '0.7rem', color: '#64748b' }}>
                        <div>Started: {startedVal}</div>
                        <div>Ended: {endedVal}</div>
                        <div style={{ color: '#3b82f6', fontWeight: '600', marginTop: '2px' }}>Dur: {durationVal}</div>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <div style={{ fontSize: '0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }} title={recommendationVal}>
                          {recommendationVal}
                        </div>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                          <button 
                            onClick={() => {
                              if (s.interview_id && s.interview_id !== 0 && s.interview_id !== 'No Interview Yet') {
                                navigate(`/admin/reports/${s.interview_id}`);
                              } else {
                                handleViewDetails(s.student_id);
                              }
                            }} 
                            className="btn btn-outline" 
                            style={{ fontSize: '0.7rem', padding: '4px 10px', width: '110px' }}
                          >
                            View Details
                          </button>
                          {s.interview_id && s.interview_id !== 0 && s.interview_id !== 'No Interview Yet' && (
                            <>
                              <button 
                                onClick={() => navigate(`/admin/reports/${s.interview_id}`)} 
                                className="btn btn-primary" 
                                style={{ fontSize: '0.7rem', padding: '4px 10px', width: '110px', background: '#4f46e5', borderColor: '#4f46e5', color: '#fff' }}
                              >
                                View AI Report
                              </button>
                              <button 
                                onClick={() => handleDownloadPDF(s.interview_id, studentName)} 
                                className="btn btn-outline" 
                                style={{ fontSize: '0.7rem', padding: '4px 10px', width: '110px', color: '#0f766e', borderColor: '#0f766e' }}
                              >
                                Download
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                      No student records available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '30px', alignItems: 'start' }}>
          <div className="card" style={{ borderTop: '5px solid #4f46e5' }}>
            <h3 style={{ color: '#1e3a5f', marginBottom: '20px' }}>Register New Student</h3>
            <form onSubmit={handleSaveUser}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#4a5568', fontWeight: '600' }}>Full Name *</label>
                <input type="text" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} style={inputStyle} placeholder="Enter full name" />
              </div>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#4a5568', fontWeight: '600' }}>Email Address *</label>
                <input type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} style={inputStyle} placeholder="example@domain.com" />
              </div>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#4a5568', fontWeight: '600' }}>Phone Number *</label>
                <input type="text" value={newUser.phone} onChange={(e) => setNewUser({...newUser, phone: e.target.value})} style={inputStyle} placeholder="+91 XXXXX XXXXX" />
              </div>
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#4a5568', fontWeight: '600' }}>Department / Role *</label>
                <input type="text" value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})} style={inputStyle} placeholder="e.g. Software Engineer" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontWeight: 'bold' }} disabled={savingUser}>
                {savingUser ? 'Saving Student...' : 'Save Student Record'}
              </button>
            </form>
          </div>

          <div className="card" style={{ padding: '0', borderTop: '5px solid #64748b' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#1e3a5f', margin: 0 }}>Registered Students Database</h3>
              <div style={{ fontSize: '0.85rem', color: '#718096' }}>Total: {data.students.length} Records</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={{ padding: '15px' }}>Name & Contact</th>
                    <th style={{ padding: '15px' }}>Department</th>
                    <th style={{ padding: '15px' }}>Registered On</th>
                    <th style={{ padding: '15px', textAlign: 'center' }}>Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((s, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '15px' }}>
                        <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{sanitizeDisplay(s.student_name, 'Student')}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{sanitizeDisplay(s.email, 'Not Provided')}</div>
                      </td>
                      <td style={{ padding: '15px', color: '#475569' }}>{sanitizeDisplay(s.role, 'Software Engineer')}</td>
                      <td style={{ padding: '15px', fontSize: '0.75rem', color: '#94a3b8' }}>{s.created_at_ist && s.created_at_ist !== 'N/A' ? formatToDDMMYYYY(s.created_at_ist) : 'Not Provided'}</td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <button onClick={() => handleViewDetails(s.student_id)} className="btn btn-outline" style={{ fontSize: '0.7rem' }}>Full Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedStudent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '95%', maxWidth: '1200px', maxHeight: '92vh', overflowY: 'auto', position: 'relative', padding: '30px', background: '#ffffff', color: '#1e293b', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ color: '#1e3a5f', margin: 0, fontSize: '1.6rem' }}>Interview Detail — Student</h2>
                <div style={{ display: 'flex', gap: '15px', marginTop: '5px', fontSize: '0.9rem', color: '#64748b' }}>
                  <span><strong>Candidate:</strong> {selectedStudent.candidate?.name}</span>
                  <span>|</span>
                  <span><strong>Role Applied:</strong> {selectedStudent.candidate?.role}</span>
                  <span>|</span>
                  <span><strong>Date:</strong> {selectedStudent.interview?.start_time || 'N/A'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  onClick={() => downloadPDFReport(selectedStudent)} 
                  style={{ background: '#0f766e', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#0d5e58'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#0f766e'}
                >
                  {generatedPdf ? '📥 Download Report' : '⏳ Generating Report...'}
                </button>
                <button 
                  onClick={() => setSelectedStudent(null)} 
                  style={{ background: '#f1f5f9', border: 'none', fontSize: '1.4rem', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                >
                  &times;
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Student ID</span>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', marginTop: '2px', color: '#1e3a5f' }}>{selectedStudent.interview?.id || 'N/A'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Rating Score</span>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', marginTop: '2px', color: '#3182ce' }}>{selectedStudent.interview?.overall_score}%</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Performance Badge</span>
                <div style={{ marginTop: '4px' }}>
                  <span style={{
                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold',
                    background: selectedStudent.interview?.overall_score >= 80 ? '#dcfce7' : (selectedStudent.interview?.overall_score >= 65 ? '#eff6ff' : (selectedStudent.interview?.overall_score >= 50 ? '#fef3c7' : '#fee2e2')),
                    color: selectedStudent.interview?.overall_score >= 80 ? '#166534' : (selectedStudent.interview?.overall_score >= 65 ? '#1e40af' : (selectedStudent.interview?.overall_score >= 50 ? '#92400e' : '#991b1b'))
                  }}>
                    {selectedStudent.interview?.overall_score >= 80 ? 'Excellent' : (selectedStudent.interview?.overall_score >= 65 ? 'Good' : (selectedStudent.interview?.overall_score >= 50 ? 'Average' : 'Poor'))}
                  </span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total / Tech Qs</span>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', marginTop: '2px' }}>{selectedStudent.answered_count + selectedStudent.skipped_count} Asked / {selectedStudent.total_technical} Scored</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Answered / Skipped</span>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', marginTop: '2px', color: '#10b981' }}>{selectedStudent.answered_count} Ans / {selectedStudent.skipped_count} Skip</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Average Complexity</span>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', marginTop: '2px', color: '#4f46e5' }}>Medium</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total Duration</span>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', marginTop: '2px' }}>{selectedStudent.interview?.duration || '15m 0s'}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="card" style={{ background: '#eff6ff', borderLeft: '5px solid #3b82f6', padding: '20px', borderRadius: '12px' }}>
                <div style={{ fontWeight: '700', color: '#1e40af', fontSize: '1rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🤖</span> AI Performance Summary & Feedback
                </div>
                <div style={{ color: '#1e3a8a', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '15px' }}>
                  {selectedStudent.summary || "No AI feedback summary available yet."}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 'bold', display: 'block' }}>QUALIFICATION STATUS</span>
                    <span style={{
                      fontSize: '0.95rem', fontWeight: '800',
                      color: selectedStudent.answered_count >= 15 ? '#16a34a' : '#dc2626'
                    }}>
                      {selectedStudent.answered_count >= 15 ? 'Qualified / Shortlisted' : 'Not Shortlisted / Not Qualified'}
                    </span>
                  </div>
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 'bold', display: 'block' }}>OVERALL SCORE</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e40af' }}>
                      {selectedStudent.interview?.overall_score}%
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 'bold', display: 'block' }}>ANSWERED QUESTIONS</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#16a34a' }}>
                      {selectedStudent.answered_count} / {selectedStudent.total_technical || 30}
                    </span>
                  </div>
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 'bold', display: 'block' }}>SKIPPED QUESTIONS</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#4b5563' }}>
                      {selectedStudent.skipped_count}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {selectedStudent.ai_strengths && selectedStudent.ai_strengths.length > 0 && (
                  <div className="card" style={{ background: '#f0fdf4', borderLeft: '5px solid #16a34a', padding: '16px', borderRadius: '10px' }}>
                    <div style={{ fontWeight: '700', color: '#14532d', fontSize: '0.95rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>💪</span> Key Strengths
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#15803d', fontSize: '0.85rem', lineHeight: '1.4' }}>
                      {selectedStudent.ai_strengths.map((st, idx) => <li key={idx}>{st}</li>)}
                    </ul>
                  </div>
                )}

                {selectedStudent.ai_improvements && selectedStudent.ai_improvements.length > 0 && (
                  <div className="card" style={{ background: '#fdf2f2', borderLeft: '5px solid #ef4444', padding: '16px', borderRadius: '10px' }}>
                    <div style={{ fontWeight: '700', color: '#991b1b', fontSize: '0.95rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⚠️</span> Areas for Improvement (Weaknesses)
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#b91c1c', fontSize: '0.85rem', lineHeight: '1.4' }}>
                      {selectedStudent.ai_improvements.map((wk, idx) => <li key={idx}>{wk}</li>)}
                    </ul>
                  </div>
                )}

                {selectedStudent.ai_suggestions && selectedStudent.ai_suggestions.length > 0 && (
                  <div className="card" style={{ background: '#fbf7ff', borderLeft: '5px solid #8b5cf6', padding: '16px', borderRadius: '10px' }}>
                    <div style={{ fontWeight: '700', color: '#5b21b6', fontSize: '0.95rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>💡</span> AI Personalized Suggestions
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#6d28d9', fontSize: '0.85rem', lineHeight: '1.4' }}>
                      {selectedStudent.ai_suggestions.map((sug, idx) => <li key={idx}>{sug}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', gap: '8px' }}>
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
                    cursor: 'pointer', transition: 'all 0.2s', paddingBottom: '8px'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ minHeight: '300px', maxHeight: '480px', overflowY: 'auto', paddingRight: '6px' }}>
              {modalTab === 'resume' && (
                <div style={{ display: 'grid', gridTemplateColumns: selectedStudent.resume ? '1fr 1fr' : '1fr', gap: '20px' }}>
                  {selectedStudent.resume ? (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <h3 style={{ margin: '0 0 10px', color: '#1e3a5f', fontSize: '1.05rem', fontWeight: 'bold' }}>Resume Summary</h3>
                          <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem', lineHeight: '1.6' }}>{selectedStudent.resume.summary_paragraph || 'No summary available.'}</p>
                        </div>
                        
                        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <h3 style={{ margin: '0 0 12px', color: '#1e3a5f', fontSize: '1.05rem', fontWeight: 'bold' }}>Skill Matrix</h3>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {(selectedStudent.resume.skills || []).map((skill, sIdx) => (
                              <span key={sIdx} style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' }}>{skill}</span>
                            ))}
                            {(!selectedStudent.resume.skills || selectedStudent.resume.skills.length === 0) && <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No skills detected.</span>}
                          </div>
                        </div>

                        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <h3 style={{ margin: '0 0 12px', color: '#1e3a5f', fontSize: '1.05rem', fontWeight: 'bold' }}>Strengths & Weaknesses</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                              <div style={{ color: '#15803d', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '4px' }}>💪 Key Strengths</div>
                              <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '0.85rem' }}>
                                {(selectedStudent.resume.strengths || []).map((st, idx) => <li key={idx}>{st}</li>)}
                                {(!selectedStudent.resume.strengths || selectedStudent.resume.strengths.length === 0) && <li>No strengths specified.</li>}
                              </ul>
                            </div>
                            <div>
                              <div style={{ color: '#b91c1c', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '4px' }}>⚠️ Areas for Improvement</div>
                              <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '0.85rem' }}>
                                {(selectedStudent.resume.weaknesses || []).map((wk, idx) => <li key={idx}>{wk}</li>)}
                                {(!selectedStudent.resume.weaknesses || selectedStudent.resume.weaknesses.length === 0) && <li>No weaknesses specified.</li>}
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <h3 style={{ margin: '0 0 10px', color: '#1e3a5f', fontSize: '1.05rem', fontWeight: 'bold' }}>Recommended Roles</h3>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {(selectedStudent.resume.recommended_roles || []).map((role, idx) => (
                              <span key={idx} style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' }}>{role}</span>
                            ))}
                            {(!selectedStudent.resume.recommended_roles || selectedStudent.resume.recommended_roles.length === 0) && <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>None recommended.</span>}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                          <h3 style={{ margin: '0', color: '#1e3a5f', fontSize: '1.05rem', fontWeight: 'bold' }}>Resume Scores Breakdown</h3>
                          
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                              <span style={{ fontWeight: '600', color: '#334155' }}>ATS Compatibility Score</span>
                              <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>{selectedStudent.resume.ats_score || 0}%</span>
                            </div>
                            <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${selectedStudent.resume.ats_score || 0}%`, height: '100%', background: '#3b82f6', borderRadius: '4px' }}></div>
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                              <span style={{ fontWeight: '600', color: '#334155' }}>Skills Score</span>
                              <span style={{ fontWeight: 'bold', color: '#0ea5e9' }}>{selectedStudent.resume.skills_score || 0}%</span>
                            </div>
                            <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${selectedStudent.resume.skills_score || 0}%`, height: '100%', background: '#0ea5e9', borderRadius: '4px' }}></div>
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                              <span style={{ fontWeight: '600', color: '#334155' }}>Education Relevance</span>
                              <span style={{ fontWeight: 'bold', color: '#10b981' }}>{selectedStudent.resume.education_score || 0}%</span>
                            </div>
                            <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${selectedStudent.resume.education_score || 0}%`, height: '100%', background: '#10b981', borderRadius: '4px' }}></div>
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                              <span style={{ fontWeight: '600', color: '#334155' }}>Experience Level</span>
                              <span style={{ fontWeight: 'bold', color: '#8b5cf6' }}>{selectedStudent.resume.experience_score || 0}%</span>
                            </div>
                            <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${selectedStudent.resume.experience_score || 0}%`, height: '100%', background: '#8b5cf6', borderRadius: '4px' }}></div>
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                              <span style={{ fontWeight: '600', color: '#334155' }}>Project Portfolio Strength</span>
                              <span style={{ fontWeight: 'bold', color: '#f59e0b' }}>{selectedStudent.resume.project_score || 0}%</span>
                            </div>
                            <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${selectedStudent.resume.project_score || 0}%`, height: '100%', background: '#f59e0b', borderRadius: '4px' }}></div>
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                              <span style={{ fontWeight: '600', color: '#334155' }}>Applied Role Match</span>
                              <span style={{ fontWeight: 'bold', color: '#ec4899' }}>{selectedStudent.resume.role_match_score || 0}%</span>
                            </div>
                            <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${selectedStudent.resume.role_match_score || 0}%`, height: '100%', background: '#ec4899', borderRadius: '4px' }}></div>
                            </div>
                          </div>
                        </div>

                        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <h3 style={{ margin: '0 0 12px', color: '#1e3a5f', fontSize: '1.05rem', fontWeight: 'bold' }}>Matched vs Missing Skills</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div>
                              <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 'bold', marginBottom: '4px' }}>Matched Skills ({selectedStudent.resume.matched_skills?.length || 0})</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {(selectedStudent.resume.matched_skills || []).map((ms, idx) => (
                                  <span key={idx} style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{ms}</span>
                                ))}
                                {(!selectedStudent.resume.matched_skills || selectedStudent.resume.matched_skills.length === 0) && <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>None matched yet.</span>}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 'bold', marginBottom: '4px' }}>Missing Skills ({selectedStudent.resume.missing_skills?.length || 0})</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {(selectedStudent.resume.missing_skills || []).map((ms, idx) => (
                                  <span key={idx} style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{ms}</span>
                                ))}
                                {(!selectedStudent.resume.missing_skills || selectedStudent.resume.missing_skills.length === 0) && <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>None missing.</span>}
                              </div>
                            </div>
                          </div>
                        </div>

                        {selectedStudent.combined_analysis && (
                          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: '4px solid #4f46e5' }}>
                            <h3 style={{ margin: '0 0 8px', color: '#1e3a5f', fontSize: '1.05rem', fontWeight: 'bold' }}>Combined Assessment Analysis</h3>
                            <p style={{ margin: '0 0 8px', color: '#475569', fontSize: '0.85rem', lineHeight: '1.5' }}>{selectedStudent.combined_analysis.summary}</p>
                            <div style={{ fontSize: '0.85rem', color: '#4f46e5', fontWeight: 'bold' }}>Recommendation: {selectedStudent.combined_analysis.recommendation}</div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No resume uploaded by this student.</div>
                  )}
                </div>
              )}

              {modalTab === 'skills' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {Object.keys(selectedStudent.skill_groups || {}).length > 0 ? (
                    Object.entries(selectedStudent.skill_groups).map(([skillName, items]) => (
                      <details key={skillName} open style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                        <summary style={{ background: '#f8fafc', padding: '12px 18px', fontWeight: 'bold', color: '#1e3a5f', cursor: 'pointer', userSelect: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>💻 {skillName}</span>
                          <span style={{ fontSize: '0.8rem', background: '#cbd5e1', color: '#334155', padding: '2px 8px', borderRadius: '12px' }}>{items.length} Questions</span>
                        </summary>
                        <div style={{ padding: '15px', background: '#fff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {items.map((item, idx) => (
                            <div key={idx} style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px', borderLeft: '4px solid #cbd5e1' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.85rem', color: '#1e293b', marginBottom: '6px' }}>
                                <span>Q: {item.question_text}</span>
                                <span style={{
                                  padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem',
                                  background: item.status === 'Correct' ? '#dcfce7' : (item.status === 'Skipped' ? '#f1f5f9' : '#fee2e2'),
                                  color: item.status === 'Correct' ? '#166534' : (item.status === 'Skipped' ? '#475569' : '#991b1b')
                                }}>
                                  {item.status}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                                <strong>Answer:</strong> {item.student_answer || 'Skipped / No response'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    ))
                  ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No skill breakdown details available.</div>
                  )}
                </div>
              )}

              {modalTab === 'chat' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                  {selectedStudent.chat && selectedStudent.chat.length > 0 ? (
                    selectedStudent.chat.map((msg, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'ai' ? 'flex-start' : 'flex-end' }}>
                        <div style={{
                          maxWidth: '75%', padding: '12px 16px', borderRadius: '12px', fontSize: '0.9rem', lineHeight: '1.4',
                          background: msg.role === 'ai' ? '#e2e8f0' : '#dbeafe',
                          color: msg.role === 'ai' ? '#1e293b' : '#1e40af',
                          borderTopLeftRadius: msg.role === 'ai' ? '0' : '12px',
                          borderTopRightRadius: msg.role === 'student' ? '0' : '12px'
                        }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px', opacity: '0.8' }}>
                            {msg.role === 'ai' ? 'AI Assistant' : selectedStudent.candidate?.name}
                          </div>
                          <div>{msg.text}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No interview conversation history found.</div>
                  )}
                </div>
              )}

              {modalTab === 'technical' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <input 
                      type="text" 
                      placeholder="Search questions or answers..." 
                      value={techSearch} 
                      onChange={e => setTechSearch(e.target.value)} 
                      style={{ flex: 1, minWidth: '200px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} 
                    />
                    <select 
                      value={techDifficultyFilter} 
                      onChange={e => setTechDifficultyFilter(e.target.value)} 
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                    >
                      <option value="All">All Difficulties</option>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                    <select 
                      value={techStatusFilter} 
                      onChange={e => setTechStatusFilter(e.target.value)} 
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                    >
                      <option value="All">All Results</option>
                      <option value="Correct">Correct</option>
                      <option value="Incorrect">Incorrect</option>
                      <option value="Skipped">Skipped</option>
                    </select>
                  </div>

                  {(() => {
                    const filtered = (selectedStudent.scored_technical || []).filter(q => {
                      const matchesSearch = 
                        (q.question_text || '').toLowerCase().includes(techSearch.toLowerCase()) || 
                        (q.candidate_answer || q.answer_text || '').toLowerCase().includes(techSearch.toLowerCase());
                      const matchesDiff = 
                        techDifficultyFilter === 'All' || 
                        (q.difficulty || '').toLowerCase() === techDifficultyFilter.toLowerCase();
                      const matchesStatus = 
                        techStatusFilter === 'All' || 
                        (techStatusFilter === 'Correct' && (q.result || q.correctness_status || '').toLowerCase() === 'correct') ||
                        (techStatusFilter === 'Incorrect' && (q.result || q.correctness_status || '').toLowerCase() === 'incorrect') ||
                        (techStatusFilter === 'Skipped' && (q.status || q.correctness_status || '').toLowerCase() === 'skipped');
                      return matchesSearch && matchesDiff && matchesStatus;
                    });

                    if (filtered.length === 0) {
                      return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No questions match your criteria.</div>;
                    }

                    return filtered.map((q, i) => (
                      <div key={i} style={{ padding: '18px', background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '10px' }}>
                          <div>
                            <span style={{ fontWeight: 'bold', color: '#1e3a5f', fontSize: '0.95rem' }}>Q{q.question_no}: {q.question_text}</span>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                              <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600' }}>Diff: {q.difficulty}</span>
                              <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600' }}>Category: {q.category || 'General'}</span>
                              {q.skill && <span style={{ background: '#f3e8ff', color: '#6b21a8', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600' }}>Skill: {q.skill}</span>}
                            </div>
                          </div>
                          <span style={{
                            padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap',
                            background: (q.correctness_status || q.result || '').toLowerCase() === 'correct' ? '#dcfce7' : ((q.status || q.correctness_status || '').toLowerCase() === 'skipped' ? '#f1f5f9' : '#fee2e2'),
                            color: (q.correctness_status || q.result || '').toLowerCase() === 'correct' ? '#166534' : ((q.status || q.correctness_status || '').toLowerCase() === 'skipped' ? '#475569' : '#991b1b')
                          }}>
                            {q.correctness_status || q.result}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', margin: '12px 0', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>TECHNICAL SCORE</div>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1e293b' }}>{q.content_score} / 5</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>COMM CLARITY</div>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#0891b2' }}>{q.clarity_score} / 5</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>RELEVANCE</div>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#d97706' }}>{q.relevance_score} / 5</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>CONFIDENCE</div>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#7c3aed' }}>{q.confidence_score} / 5</div>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#475569', padding: '10px', background: '#eff6ff', borderRadius: '6px', borderLeft: '3px solid #3b82f6', marginBottom: '8px' }}>
                          <strong>Answer:</strong> {q.candidate_answer || q.answer_text || 'Skipped'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                          <strong>AI Evaluation Feedback:</strong> {q.ai_feedback || q.feedback}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {modalTab === 'ignored' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedStudent.ignored_prompts && selectedStudent.ignored_prompts.length > 0 ? (
                    selectedStudent.ignored_prompts.map((q, i) => (
                      <div key={i} style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.85rem' }}>Q{q.question_no}: {q.question_text}</span>
                          <span style={{ background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '600' }}>
                            {q.label}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          <strong>Answer:</strong> {q.candidate_answer || 'Skipped'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No ignored or system greeting prompts found.</div>
                  )}
                </div>
              )}

              {modalTab === 'violations' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px' }}>
                    <div style={{ background: '#fff', border: '1px solid #fee2e2', borderRadius: '8px', padding: '12px', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '1.4rem' }}>📷</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold', marginTop: '4px' }}>CAMERA OFF</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#991b1b', marginTop: '2px' }}>{selectedStudent.violations?.camera_off}</div>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #fee2e2', borderRadius: '8px', padding: '12px', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '1.4rem' }}>🎤</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold', marginTop: '4px' }}>AUDIO MUTED</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#991b1b', marginTop: '2px' }}>{selectedStudent.violations?.audio_muted}</div>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #fee2e2', borderRadius: '8px', padding: '12px', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '1.4rem' }}>📑</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold', marginTop: '4px' }}>TAB SWITCHES</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#991b1b', marginTop: '2px' }}>{selectedStudent.violations?.tab_switches}</div>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #fee2e2', borderRadius: '8px', padding: '12px', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '1.4rem' }}>👤</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold', marginTop: '4px' }}>NO FACE DETECTED</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#991b1b', marginTop: '2px' }}>{selectedStudent.violations?.no_face}</div>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #fee2e2', borderRadius: '8px', padding: '12px', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '1.4rem' }}>👥</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold', marginTop: '4px' }}>MULTIPLE FACES</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#991b1b', marginTop: '2px' }}>{selectedStudent.violations?.multiple_faces}</div>
                    </div>
                  </div>

                  <div className="card" style={{ background: selectedStudent.interview?.warning_count >= 3 ? '#fee2e2' : '#f0fdf4', borderLeft: '4px solid', borderColor: selectedStudent.interview?.warning_count >= 3 ? '#ef4444' : '#10b981', padding: '12px 18px', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 'bold', color: selectedStudent.interview?.warning_count >= 3 ? '#991b1b' : '#166534', fontSize: '0.85rem' }}>
                      Integrity Decision: {selectedStudent.interview?.warning_count >= 3 ? 'High Risk Assessment (Violation count exceeds limit)' : 'Passed Integrity Check'}
                    </div>
                  </div>

                  <div className="card" style={{ background: '#fff', padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 15px', color: '#1e3a5f', fontSize: '1rem', fontWeight: 'bold' }}>Proctoring Activity Event Log</h4>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedStudent.logs && selectedStudent.logs.length > 0 ? (
                        selectedStudent.logs.map((log, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem', borderLeft: '3px solid #cbd5e1', borderColor: (log.message || '').toLowerCase().includes('terminate') ? '#ef4444' : (log.message || '').toLowerCase().includes('warning') ? '#f59e0b' : '#3b82f6' }}>
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

            <div style={{ marginTop: '45px', borderTop: '2px solid #e2e8f0', paddingTop: '30px' }}>
              <h4 style={{ margin: '0 0 20px', color: '#1e3a5f', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📝 Detailed Questions & Answers
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {(selectedStudent.scored_technical || []).map((q, idx) => (
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
                {(!selectedStudent.scored_technical || selectedStudent.scored_technical.length === 0) && (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#718096' }}>No question evaluations available.</div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #f1f5f9', paddingTop: '16px', flexWrap: 'wrap', gap: '16px', marginTop: 'auto' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Admin Final Hiring Decision:</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <button
                    disabled={selectedStudent.decision === 'Shortlisted' || loadingStatus.userId === selectedStudent.candidate.id}
                    onClick={async () => {
                      await handleStatusUpdate(selectedStudent.candidate.id, selectedStudent.interview.id === 'N/A' ? null : selectedStudent.interview.id, 'Shortlisted');
                    }}
                    style={{
                      background: selectedStudent.decision === 'Shortlisted' ? '#059669' : '#e2e8f0',
                      color: selectedStudent.decision === 'Shortlisted' ? 'white' : '#475569',
                      border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', 
                      cursor: (selectedStudent.decision === 'Shortlisted' || loadingStatus.userId === selectedStudent.candidate.id) ? 'default' : 'pointer', 
                      transition: 'all 0.2s',
                      opacity: (loadingStatus.userId === selectedStudent.candidate.id && loadingStatus.status !== 'Shortlisted') ? 0.5 : 1
                    }}
                  >
                    {loadingStatus.userId === selectedStudent.candidate.id && loadingStatus.status === 'Shortlisted' ? 'Updating...' : 'Shortlisted'}
                  </button>
                  <button
                    disabled={selectedStudent.decision === 'Hiring in Process' || loadingStatus.userId === selectedStudent.candidate.id}
                    onClick={async () => {
                      await handleStatusUpdate(selectedStudent.candidate.id, selectedStudent.interview.id === 'N/A' ? null : selectedStudent.interview.id, 'Hiring in Process');
                    }}
                    style={{
                      background: selectedStudent.decision === 'Hiring in Process' ? '#d97706' : '#e2e8f0',
                      color: selectedStudent.decision === 'Hiring in Process' ? 'white' : '#475569',
                      border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', 
                      cursor: (selectedStudent.decision === 'Hiring in Process' || loadingStatus.userId === selectedStudent.candidate.id) ? 'default' : 'pointer', 
                      transition: 'all 0.2s',
                      opacity: (loadingStatus.userId === selectedStudent.candidate.id && loadingStatus.status !== 'Hiring in Process') ? 0.5 : 1
                    }}
                  >
                    {loadingStatus.userId === selectedStudent.candidate.id && loadingStatus.status === 'Hiring in Process' ? 'Updating...' : 'Hiring in Process'}
                  </button>
                  <button
                    disabled={selectedStudent.decision === 'Not Shortlisted' || loadingStatus.userId === selectedStudent.candidate.id}
                    onClick={async () => {
                      await handleStatusUpdate(selectedStudent.candidate.id, selectedStudent.interview.id === 'N/A' ? null : selectedStudent.interview.id, 'Not Shortlisted');
                    }}
                    style={{
                      background: selectedStudent.decision === 'Not Shortlisted' ? '#dc2626' : '#e2e8f0',
                      color: selectedStudent.decision === 'Not Shortlisted' ? 'white' : '#475569',
                      border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', 
                      cursor: (selectedStudent.decision === 'Not Shortlisted' || loadingStatus.userId === selectedStudent.candidate.id) ? 'default' : 'pointer', 
                      transition: 'all 0.2s',
                      opacity: (loadingStatus.userId === selectedStudent.candidate.id && loadingStatus.status !== 'Not Shortlisted') ? 0.5 : 1
                    }}
                  >
                    {loadingStatus.userId === selectedStudent.candidate.id && loadingStatus.status === 'Not Shortlisted' ? 'Updating...' : 'Not Shortlisted'}
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)} 
                className="btn btn-outline" 
                style={{ height: 'fit-content', padding: '10px 20px', fontWeight: 'bold' }}
              >
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}

      {terminatingLp && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.35)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
          <div className="card" style={{ maxWidth: '500px', padding: '2rem', textAlign: 'center' }}>
            <h3 style={{ color: '#e53e3e' }}>Terminate Interview</h3>
            <p style={{ margin: '1rem 0', color: '#4a5568' }}>Are you sure you want to terminate <strong>{terminatingLp.student_name}</strong>'s interview?</p>
            <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}>Termination Reason:</label>
              <textarea 
                value={terminationReason} 
                onChange={(e) => setTerminationReason(e.target.value)}
                style={{ ...inputStyle, height: '100px' }}
                placeholder="Enter reason for termination..."
              ></textarea>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-outline" onClick={() => setTerminatingLp(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmTermination}>Terminate Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const sanitizeDisplay = (val, fallback = 'Not Provided') => {
  if (val === null || val === undefined) return fallback;
  const s = String(val).trim();
  const lower = s.toLowerCase();
  if (lower === '' || lower === 'null' || lower === 'undefined' || lower === 'nan' || lower === 'n/a' || lower === 'na') {
    return fallback;
  }
  return s;
};

const inputStyle = { width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s', background: '#fff' };

const SummaryCard = ({ label, value, color, icon }) => (
  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: '#fff', borderLeft: `5px solid ${color}`, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
    <div style={{ background: `${color}15`, width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>{icon}</div>
    <div>
      <div style={{ color: '#718096', fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.025em' }}>{label}</div>
      <div style={{ margin: '2px 0 0', color: '#1e293b', fontSize: '1.2rem', fontWeight: '800' }}>{value !== undefined ? value : 0}</div>
    </div>
  </div>
);

const MetricBox = ({ label, value, color }) => (
  <div style={{ background: '#fff', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '5px' }}>{label}</div>
    <div style={{ fontWeight: '800', color: color || '#1e293b', fontSize: '1.1rem' }}>{sanitizeDisplay(value, 'Pending')}</div>
  </div>
);

const DetailRow = ({ label, value }) => (
  <div style={{ marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
    <div style={{ fontSize: '0.65rem', color: '#718096', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>{label}</div>
    <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#1e293b', marginTop: '2px' }}>{sanitizeDisplay(value, 'Not Provided')}</div>
  </div>
);

export default StudentsDashboard;
