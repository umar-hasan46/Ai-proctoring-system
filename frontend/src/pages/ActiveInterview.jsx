import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/api';
import { formatToIST } from '../utils/dateUtils';
import InterviewTimer from '../components/InterviewTimer';
import { formatTime } from '../utils/time';

function ActiveInterview({ user }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const isRegistered = localStorage.getItem("interviewRegistered") === "true";
    if (!isRegistered) {
      alert("Please register for the interview before starting.");
      navigate("/register");
    }
  }, [navigate]);
  const [interviewId, setInterviewId] = useState(() => location.state?.interviewId || localStorage.getItem("active_interview_id") || "");
  const [sessionId, setSessionId] = useState(() => location.state?.sessionId || localStorage.getItem("active_session_id") || "");

  const storedQuestions = JSON.parse(localStorage.getItem("interviewQuestions") || "[]");
  const [questions, setQuestions] = useState(storedQuestions);
  const [currentIdx, setCurrentIdx] = useState(() => parseInt(localStorage.getItem("current_question_index") || "0", 10));
  const [highestIdx, setHighestIdx] = useState(0);
  const [answers, setAnswers] = useState(() => JSON.parse(localStorage.getItem("answers") || "{}"));
  const [warnings, setWarnings] = useState(0);
  const [warningsList, setWarningsList] = useState(() => JSON.parse(localStorage.getItem("interviewWarnings") || "[]"));
  const [starting, setStarting] = useState(false);
  const [startMessage, setStartMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const [terminationHandled, setTerminationHandled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [skippedIds, setSkippedIds] = useState(new Set());
  const [autosaveStatus, setAutosaveStatus] = useState('');
  const [liveStatus, setLiveStatus] = useState({
    camera: 'active',
    audio: 'active',
    face: 'detected'
  });
  const [detectedSkillsState, setDetectedSkillsState] = useState(() => {
    try {
      return location.state?.detectedSkills || location.state?.skills || JSON.parse(localStorage.getItem("detected_skills") || "[]");
    } catch {
      return location.state?.detectedSkills || location.state?.skills || localStorage.getItem("detected_skills") || [];
    }
  });
  const [isListening, setIsListening] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const MAX_WARNINGS = 3;
  const [warningCount, setWarningCount] = useState(Number(localStorage.getItem("warningCount") || 0));
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isSupported] = useState(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition));
  const recognitionRef = useRef(null);
  const isAiSpeakingRef = useRef(false);
  const finalRef = useRef('');
  const typedTextRef = useRef('');
  const isMicEnabledRef = useRef(false);
  const currentIdxRef = useRef(0);
  const questionsRef = useRef([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // High performance speech-to-text refs for re-render bypass
  const textareaRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const currentQuestionIdRef = useRef('');
  const isListeningRef = useRef(false);

  const liveTranscriptSidebarRef = useRef(null);
  const liveTranscriptSidebarContainerRef = useRef(null);
  const liveTranscriptBottomRef = useRef(null);

  const TOTAL_TIME = 30 * 60;
  const getInitialTimeLeft = () => {
    const startTime = localStorage.getItem("interviewStartTime");
    if (!startTime) {
      localStorage.setItem("interviewStartTime", Date.now().toString());
      return TOTAL_TIME;
    }
    const elapsed = Math.floor((Date.now() - Number(startTime)) / 1000);
    return Math.max(TOTAL_TIME - elapsed, 0);
  };
  const [timeLeft, setTimeLeft] = useState(getInitialTimeLeft);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleFinalSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(getInitialTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const showAndSpeak = (text) => {
    window.speechSynthesis.cancel();
    if (!voiceEnabled) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 1.0;
    u.pitch = 1.0;
    u.volume = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(x => x.name === "Google US English" || (x.lang === "en-US" && !x.localService));
    if (v) u.voice = v;
    u.onstart = () => { setIsSpeaking(true); isAiSpeakingRef.current = true; };
    u.onend = () => { setIsSpeaking(false); isAiSpeakingRef.current = false; };
    u.onerror = () => { setIsSpeaking(false); isAiSpeakingRef.current = false; };
    window.speechSynthesis.speak(u);
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
      stopMic();
    };
  }, []);

  useEffect(() => {
    currentIdxRef.current = currentIdx;
    questionsRef.current = questions;
    const activeQ = questions[currentIdx];
    if (activeQ) {
      currentQuestionIdRef.current = activeQ.id;
      typedTextRef.current = answers[activeQ.id] || '';
      finalRef.current = '';
      if (textareaRef.current) {
        textareaRef.current.value = answers[activeQ.id] || '';
      }
    }
  }, [currentIdx, questions]);

  useEffect(() => {
    if (!voiceEnabled || !questions[currentIdx]) return;
    const cq = questions[currentIdx];
    const text = `Question ${currentIdx + 1}. ${cq.question || cq.question_text || cq.text || 'Question text not available'}. Please answer clearly.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return () => window.speechSynthesis.cancel();
  }, [currentIdx, voiceEnabled, questions]);


  useEffect(() => {
    if (isStarted && !isTerminated && questions[currentIdx]) {
      const q = questions[currentIdx];
      const rawText = q.text || '';
      const category = q.category || 'Self Introduction';
      const intro = currentIdx === 0 ? `Welcome to your proctored interview. Let's begin with the ${category} section. ` : '';
      api.post('/interview/spoken-question', {
        question_text: rawText,
        question_no: currentIdx + 1,
        skills: detectedSkillsState
      }).then(res => {
        showAndSpeak(intro + (res?.spoken_question || rawText));
      }).catch(() => {
        showAndSpeak(intro + rawText);
      });
    }
  }, [isStarted, currentIdx, isTerminated]);

  const isRecordingRef = useRef(false);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.continuous = true;
      r.interimResults = false; // Use only final results for speed
      r.lang = 'en-US';
      r.maxAlternatives = 1;

      r.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
      };

      r.onresult = (e) => {
        if (isAiSpeakingRef.current) return;
        let finalVoiceText = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            finalVoiceText += e.results[i][0].transcript;
          }
        }
        const activeQ = questionsRef.current[currentIdxRef.current];
        if (!activeQ) return;

        finalTranscriptRef.current = finalVoiceText;
        // Update UI with final transcript only
        if (liveTranscriptSidebarRef.current) {
          liveTranscriptSidebarRef.current.innerText = finalVoiceText;
        }
        if (liveTranscriptSidebarContainerRef.current) {
          liveTranscriptSidebarContainerRef.current.style.display = finalVoiceText ? 'block' : 'none';
        }
        if (liveTranscriptBottomRef.current) {
          liveTranscriptBottomRef.current.innerText = finalVoiceText || (isListeningRef.current ? "Listening for your answer..." : "Click Turn On Mic to start speaking");
        }
        let textToShow = typedTextRef.current || '';
        if (finalVoiceText) {
          const combined = typedTextRef.current ? typedTextRef.current + ' ' + finalVoiceText.trim() : finalVoiceText.trim();
          typedTextRef.current = combined;
          textToShow = combined;
        }
        if (textareaRef.current) {
          textareaRef.current.value = textToShow;
        }
      };

      r.onend = () => {
        setIsListening(false);
        isListeningRef.current = false;
        if (!isMicEnabledRef.current) {
          if (liveTranscriptSidebarRef.current) {
            liveTranscriptSidebarRef.current.innerText = '';
          }
          if (liveTranscriptSidebarContainerRef.current) {
            liveTranscriptSidebarContainerRef.current.style.display = 'none';
          }
          if (liveTranscriptBottomRef.current) {
            liveTranscriptBottomRef.current.innerText = 'Click Turn On Mic to start speaking';
          }
        }
      };

      r.onerror = (e) => {
        if (e.error === 'not-allowed') {
          setWarningMessage('Microphone permission denied.');
          setTimeout(() => setWarningMessage(''), 5000);
          isMicEnabledRef.current = false;
          setIsMicEnabled(false);
          setIsListening(false);
          isListeningRef.current = false;
        }
      };
      
      recognitionRef.current = r;
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const startMic = () => {
    if (!recognitionRef.current) {
      setWarningMessage('Speech recognition not supported. Please use Chrome.');
      setTimeout(() => setWarningMessage(''), 5000);
      return;
    }
    window.speechSynthesis.cancel();
    isMicEnabledRef.current = true;
    setIsMicEnabled(true);
    setIsListening(true);
    isListeningRef.current = true;
    try { recognitionRef.current.start(); } catch (_) {}
    
    if (liveTranscriptBottomRef.current) {
      liveTranscriptBottomRef.current.innerText = "Listening for your answer...";
    }
  };

  const stopMic = () => {
    isMicEnabledRef.current = false;
    setIsMicEnabled(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    setIsListening(false);
    isListeningRef.current = false;
    
    if (liveTranscriptSidebarRef.current) {
      liveTranscriptSidebarRef.current.innerText = '';
    }
    if (liveTranscriptSidebarContainerRef.current) {
      liveTranscriptSidebarContainerRef.current.style.display = 'none';
    }
    if (liveTranscriptBottomRef.current) {
      liveTranscriptBottomRef.current.innerText = 'Click Turn On Mic to start speaking';
    }
  };

  const toggleMic = () => {
    if (isMicEnabledRef.current) {
      stopMic();
    } else {
      isRecordingRef.current = true;
      startMic();
    }
  };

  const toggleListening = () => {
    if (isMicEnabledRef.current) {
      stopMic();
    } else {
      window.speechSynthesis.cancel();
      startMic();
    }
  };

  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [backendError, setBackendError] = useState('');
  const [dataError, setDataError] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking', 'online', 'offline'

  const checkBackendHealth = async () => {
    try {
      setBackendStatus('checking');
      const health = await api.checkHealth();
      if (health.success) {
        setBackendStatus('online');
        setBackendError('');
      } else {
        setBackendStatus('offline');
      }
    } catch (err) {
      setBackendStatus('offline');
    }
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  const videoRef = useRef(null);
  const streamRef = useRef(null);



  const canvasRef = useRef(document.createElement('canvas'));
  const lastViolationTime = useRef(0);
  const lastActivityTime = useRef(Date.now());
  const startTimeRef = useRef(Date.now());
  const questionStartTimeRef = useRef(Date.now());
  const submitLock = useRef(false);
  const isCompletedRef = useRef(false);

  const getStoredUser = () => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      localStorage.removeItem("user");
      return null;
    }
  };

  const storedUser = getStoredUser();
  const email = user?.email || storedUser?.email || localStorage.getItem("email") || sessionStorage.getItem("email") || "";
  const role = user?.role || storedUser?.role || localStorage.getItem("role") || sessionStorage.getItem("role") || "";

  useEffect(() => {
  if (!email) {
    setAuthError('Please login again to continue interview.');
    setAuthLoading(false);
    const timer = setTimeout(() => {
      navigate('/login');
    }, 2000);
    return () => clearTimeout(timer);
  }
  // Allow any non‑empty role
  setAuthLoading(false);
}, [email, navigate]);

  useEffect(() => {
    if (!email) return;

    const checkAndInit = async () => {
      let activeId = location.state?.interviewId || localStorage.getItem("interview_id") || localStorage.getItem("active_interview_id");
      
      if (!activeId) {
        try {
          const latestRes = await api.getLatestInterview(email);
          if (latestRes.success && latestRes.interview) {
            const status = latestRes.interview.status;
            if (status !== 'completed' && status !== 'terminated' && status !== 'evaluating') {
              activeId = latestRes.interview.id;
              setInterviewId(activeId);
              localStorage.setItem("interview_id", activeId);
              localStorage.setItem("active_interview_id", activeId);
            }
          }
        } catch (err) {
          console.error("Error checking active interview status:", err);
        }
      } else {
        setInterviewId(activeId);
      }
    };

    checkAndInit();
  }, [location.state, email, authLoading, navigate]);

  useEffect(() => {
    if (!email || backendStatus !== 'online') return;

    if (questions.length === 0) {
      setDataError("No interview questions found. Please start a new interview.");
      setLoading(false);
    } else {
      setLoading(false);
      setIsStarted(true);
      startCamera();
    }
  }, [email, backendStatus, questions.length]);

  useEffect(() => {
    if (isStarted && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isStarted, videoRef.current]);

  useEffect(() => {
    return () => {
      if (isStarted && !isCompletedRef.current && interviewId) {
        api.completeInterview({ interview_id: interviewId }).catch(console.error);
      }
    };
  }, [isStarted, interviewId]);

  useEffect(() => {
    let statusInterval;
    let behaviorInterval;
    let adminActionInterval;

    // Real-time proctoring window events
    const handleBlur = () => {
      if (isStarted && !isTerminated) {
        addWarning("Tab switched / Window out of focus");
      }
    };
    
    const handleContextMenu = (e) => {
      if (isStarted && !isTerminated) {
        e.preventDefault();
        addWarning("Right click is disabled during the interview");
      }
    };
    
    const handleCopy = (e) => {
      if (isStarted && !isTerminated) {
        e.preventDefault();
        addWarning("Copying text is disabled");
      }
    };
    
    const handlePaste = (e) => {
      if (isStarted && !isTerminated) {
        e.preventDefault();
        addWarning("Pasting text is disabled");
      }
    };

    if (isStarted && !isTerminated) {
      window.addEventListener('blur', handleBlur);
      window.addEventListener('contextmenu', handleContextMenu);
      window.addEventListener('copy', handleCopy);
      window.addEventListener('paste', handlePaste);
    }


    if (isStarted && !isTerminated && email) {
      setupListeners();
      statusInterval = setInterval(sendLiveUpdate, 5000);
      behaviorInterval = setInterval(checkBehavior, 10000);

      adminActionInterval = setInterval(async () => {
        try {
          const statusRes = await api.getInterviewStatus(interviewId);
          if (statusRes.success && statusRes.status === 'terminated' && !terminationHandled) {
            setWarningMessage(`Terminated by Admin: ${statusRes.termination_reason || 'Administrative Override'}`);
            setIsTerminated(true);
            setTerminationHandled(true);
            isCompletedRef.current = true;
          }

          const notifyRes = await api.getUserNotifications(email);
          if (notifyRes.success) {
            const latest = notifyRes.notifications[0];
            if (latest && latest.event_type === 'Admin Appreciation' && latest.status === 'New') {
              setWarningMessage(`✨ ${latest.message}`);
              setTimeout(() => setWarningMessage(''), 8000);
            }
          }
        } catch (err) {
          
        }
      }, 5000);
    }

    return () => {
      removeListeners();
      if (statusInterval) clearInterval(statusInterval);
      if (behaviorInterval) clearInterval(behaviorInterval);
      if (adminActionInterval) clearInterval(adminActionInterval);
    };
  }, [isStarted, isTerminated, interviewId, navigate, email, terminationHandled]);

  useEffect(() => {
    if (isTerminated && terminationHandled && interviewId) {
      const timer = setTimeout(() => {
        cleanup();
        navigate('/results/' + interviewId);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isTerminated, terminationHandled, interviewId, navigate]);

  useEffect(() => {
    // Timer synchronization and tracking is now delegated to InterviewTimer component.
  }, [isStarted, isTerminated, interviewId]);

  useEffect(() => {
    let autosaveInterval;
    if (isStarted && !isTerminated && interviewId && questions[currentIdx]) {
      const q = questions[currentIdx];
      autosaveInterval = setInterval(async () => {
        const currentAns = textareaRef.current ? textareaRef.current.value : (answers[q.id] || '');
        if (currentAns.trim()) {
          try {
            await api.autosaveAnswer({
              interview_id: interviewId,
              question_no: currentIdx + 1,
              answer_text: currentAns,
              candidate_email: email
            });
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setAutosaveStatus(`Saved draft at ${timeStr}`);
            setTimeout(() => setAutosaveStatus(''), 3000);
          } catch (e) {
          }
        }
      }, 10000);
    }
    return () => {
      if (autosaveInterval) clearInterval(autosaveInterval);
    };
  }, [isStarted, isTerminated, interviewId, currentIdx, answers, email, questions]);

  const handleAutoSubmit = async () => {
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    setWarningMessage("Time is up. Submitting interview automatically.");
    try {
      const activeSessionId = sessionId || localStorage.getItem("active_session_id") || '';
      if (activeSessionId) {
        try {
          await api.getSessionReport(activeSessionId);
        } catch (reportErr) {
          console.error("Session report generation failed on auto submit:", reportErr);
        }
      }
      try {
        await api.autoSubmitInterview({ interview_id: interviewId });
      } catch (err) {}
      isCompletedRef.current = true;
      cleanup();
      navigate('/results/' + interviewId);
    } catch (err) {
      isCompletedRef.current = true;
      cleanup();
      navigate('/results/' + interviewId);
    }
  };

  const terminateInterview = async (reason) => {
    stopListening();
    window.speechSynthesis.cancel();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    localStorage.setItem("interviewTerminated", "true");
    localStorage.setItem("terminationReason", reason);
    const intvId = localStorage.getItem("currentInterviewId") || localStorage.getItem("active_session_id") || interviewId || "unknown";
    const API_BASE_URL = import.meta.env.VITE_API_URL || "https://ai-proctoring-backend-5t3k.onrender.com";
    await fetch(`${API_BASE_URL}/api/interview/finish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": localStorage.getItem("userId") || "",
        "X-User-Role": localStorage.getItem("userRole") || "user"
      },
      body: JSON.stringify({
        interviewId: intvId,
        status: "terminated",
        reason,
        answers: JSON.parse(localStorage.getItem("answers") || "{}"),
        evaluations: JSON.parse(localStorage.getItem("interviewEvaluations") || "{}"),
        warnings: JSON.parse(localStorage.getItem("interviewWarnings") || "[]")
      })
    }).catch(() => {});
    navigate(`/results/${intvId}`);
  };

  const addWarning = (message) => {
    setWarningCount(prev => {
      const newCount = prev + 1;
      localStorage.setItem("warningCount", String(newCount));
      const warning = {
        id: Date.now(),
        count: newCount,
        max: MAX_WARNINGS,
        message,
        time: new Date().toLocaleTimeString()
      };
      const savedWarnings = JSON.parse(localStorage.getItem("interviewWarnings") || "[]");
      localStorage.setItem("interviewWarnings", JSON.stringify([warning, ...savedWarnings]));
      setWarningsList([warning, ...savedWarnings]);
      
      if (newCount <= MAX_WARNINGS) {
        setWarningMessage(`Warning ${newCount}/3: ${message}`);
        setTimeout(() => setWarningMessage(''), 5000);
      }
      // Automatically log the event to localStorage to feed the Results Integrity Dashboard
      const storedEvents = JSON.parse(localStorage.getItem("proctoringEvents") || "[]");
      storedEvents.push({ type: message, time: new Date().toLocaleTimeString(), id: Date.now() });
      localStorage.setItem("proctoringEvents", JSON.stringify(storedEvents));

      if (newCount > 3) {
        terminateInterview("Interview terminated because warning count exceeded 3.");
      }
      
      const API_BASE_URL = import.meta.env.VITE_API_URL || "https://ai-proctoring-backend-5t3k.onrender.com";
      fetch(`${API_BASE_URL}/api/proctoring/warning`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Email": email },
        body: JSON.stringify({ interviewId, message, eventType: "warning", timestamp: new Date().toISOString(), count: newCount })
      }).catch(err => console.log("Warning save error:", err));
      
      return newCount;
    });
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    addWarning("Right click is disabled during the interview.");
  };

  const setupListeners = () => {
    if (!videoRef.current) return;
    window.addEventListener('blur', handleTabSwitch);
    document.addEventListener('visibilitychange', handleTabSwitch);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('contextmenu', handleContextMenu);
  };

  const removeListeners = () => {
    window.removeEventListener('blur', handleTabSwitch);
    document.removeEventListener('visibilitychange', handleTabSwitch);
    document.removeEventListener('copy', handleCopyPaste);
    document.removeEventListener('paste', handleCopyPaste);
    document.removeEventListener('contextmenu', handleContextMenu);
  };

  const handleCopyPaste = (e) => {
    e.preventDefault();
    addWarning("Pasting is not allowed during the interview.");
    logAIEvent('Cheating Alert', 'Candidate attempted to copy or paste content.', 15, 'High');
    processViolation('Copy/Paste Detected', 'Copying or pasting is strictly prohibited.');
  };

  const logAIEvent = async (type, msg, score, severity = 'Low') => {
    try {
      const videoSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const h = Math.floor(videoSeconds / 3600).toString().padStart(2, '0');
      const m = Math.floor((videoSeconds % 3600) / 60).toString().padStart(2, '0');
      const s = (videoSeconds % 60).toString().padStart(2, '0');
      const timestamp = `${h}:${m}:${s}`;
      await api.saveAILog({
        interview_id: interviewId,
        candidate_name: user?.name || user?.full_name || storedUser?.name || "Candidate",
        candidate_email: email,
        timestamp,
        event_type: type,
        message: msg,
        severity,
        score
      });
    } catch (err) {
      
    }
  };

  const handleTabSwitch = () => {
    if (isTerminated) return;
    const now = Date.now();
    if (now - lastViolationTime.current < 5000) return;
    lastViolationTime.current = now;
    addWarning("Tab switch detected. Please stay on the interview page.");
    logAIEvent('Cheating Alert', 'Candidate switched tab or exited fullscreen.', 20, 'High');
    processViolation('Tab Switching', 'Candidate switched tabs or windows.');
  };

  const checkBehavior = () => {
    if (isTerminated || submitting) return;
    const now = Date.now();
    const idleTime = (now - lastActivityTime.current) / 1000;
    if (idleTime > 15 && questions[currentIdx]?.category === 'Technical') {
      logAIEvent('Confidence Drop', 'Candidate paused for an extended period during a technical question.', 45, 'Medium');
      lastActivityTime.current = now;
    }
  };

  const processViolation = async (type, msg) => {
    if (isTerminated) return;
    try {
      const res = await api.saveViolation({
        interview_id: interviewId,
        user_email: email,
        violation_type: type,
        message: msg,
        severity: 'high'
      });
      if (res.success) {
        const newCount = res.warning_count;
        setWarnings(newCount);
        if (newCount <= 3) {
          setWarningMessage(`Warning ${newCount} of 3: ${type} detected!`);
          setTimeout(() => setWarningMessage(''), 5000);
        }
        if (res.auto_terminated && !terminationHandled) {
          handleTerminationEffect();
        }
      }
    } catch (err) {
      
    }
  };

  const handleTerminationEffect = () => {
    if (terminationHandled) return;
    setTerminationHandled(true);
    setIsTerminated(true);
    isCompletedRef.current = true;
    localStorage.removeItem("active_interview_id");
    setWarningMessage('Interview terminated due to multiple integrity violations.');
  };

  const sendLiveUpdate = async () => {
    if (!isStarted || isTerminated) return;
    let frame = null;
    if (videoRef.current && videoRef.current.readyState === 4) {
      const canvas = canvasRef.current;
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      frame = canvas.toDataURL('image/jpeg', 0.5);
    }
    try {
      await api.updateLiveStatus({
        interview_id: interviewId,
        camera_status: liveStatus.camera,
        audio_status: liveStatus.audio,
        face_status: liveStatus.face,
        latest_frame: frame
      });
    } catch (err) {
      console.error(err);
    }
  };

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      streamRef.current = stream;
      stream.getTracks().forEach(track => {
        track.onended = () => {
          if (track.kind === 'video') {
             addWarning("Camera disconnected or turned off");
          }
          if (track.kind === 'audio') {
             addWarning("Microphone disconnected or muted");
          }
        };
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setLiveStatus(prev => ({
        ...prev,
        camera: "active",
        audio: "active"
      }));

      return true;
    } catch (error) {
      console.error("Camera/Mic error:", error);

      setLiveStatus(prev => ({
        ...prev,
        camera: "blocked",
        audio: "blocked"
      }));

      setWarningMessage("Camera or microphone permission denied. Please allow access.");

      return false;
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }

  useEffect(() => {
    // startCamera is now called only when user starts or resumes the interview
    return () => stopCamera();
  }, []);

  const handleStart = async () => {
    // Hard reset all previous state
    localStorage.removeItem("current_question_index");
    localStorage.removeItem("currentIdx");
    localStorage.removeItem("questionIndex");
    localStorage.removeItem("lastQuestion");
    localStorage.removeItem("active_question_no");
    localStorage.removeItem("answers");
    sessionStorage.clear();
    setCurrentIdx(0);
    setHighestIdx(0);
    setAnswers({});
    setSkippedIds(new Set());
    setWarnings(0);
    setIsTerminated(false);
    setTerminationHandled(false);
    setQuestions([]);

    try {
      setLoading(true);
      setDataError("");

      // Determine sessionId – use one from navigation state or localStorage, or create fresh
      const activeSessionId = sessionId ||
        location.state?.sessionId ||
        localStorage.getItem("active_session_id") ||
        ("session_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11));
      setSessionId(activeSessionId);
      localStorage.setItem("active_session_id", activeSessionId);

      const camOk = await startCamera();
      if (!camOk) {
        logAIEvent('Proctoring Violation', 'Candidate camera/mic access blocked or not available.', 50, 'Medium');
      }

      // Show loading message during AI question generation
      setWarningMessage('Generating fresh interview questions based on your resume...');

      const detectedSkillsList = Array.isArray(detectedSkillsState)
        ? detectedSkillsState
        : (detectedSkillsState ? String(detectedSkillsState).split(',').map(s => s.trim()) : []);

      const storedUser = (() => { try { return JSON.parse(localStorage.getItem("user") || '{}'); } catch { return {}; } })();
      const roleApplied = location.state?.role || user?.role_applied || storedUser?.role_applied || 'Software Engineer';

      // Call the new session-based start endpoint
      const startRes = await api.startInterviewSession({
        sessionId: activeSessionId,
        userId: user?.id || storedUser?.id,
        email: email,
        role: roleApplied,
        skills: detectedSkillsList,
        detectedSkills: detectedSkillsList,
        resumeId: interviewId   // pass interviewId as resume reference
      });

      setWarningMessage('');

      if (startRes.success && startRes.questions && startRes.questions.length > 0) {
        const mappedQuestions = startRes.questions.slice(0, 30).map(q => ({
          id: q.id || q.question_id || `q_${q.questionNumber}`,
          text: q.question || q.question_text || q.text || '',
          difficulty: q.difficulty || 'Easy',
          category: q.skill || q.question_type || q.type || 'Technical',
          expected_answer: q.expected_answer || '',
          skill: q.skill || '',
          question_type: q.type || q.question_type || 'dynamic'
        }));
        setQuestions(mappedQuestions);
        setCurrentIdx(0);
        setHighestIdx(0);
        const firstQ = mappedQuestions[0];
        showAndSpeak(`Welcome to your proctored interview. Let's begin. Here is your first question: ${firstQ.text}`);

        // Also keep legacy interview_id updated
        if (interviewId) {
          localStorage.setItem("active_interview_id", interviewId);
        }
      } else {
        throw new Error(startRes.message || 'Failed to generate interview questions. Please try again.');
      }

      setIsStarted(true);
      startTimeRef.current = Date.now();
      logAIEvent('Positive Communication', 'Candidate started the interview.', 90, 'Low');
    } catch (err) {
      console.error("Failed to start interview:", err);
      setWarningMessage('');
      setDataError(err.message || 'Failed to start interview.');
    } finally {
      setLoading(false);
    }
  };

  const cleanup = () => {
    localStorage.removeItem("active_interview_id");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    stopMic();
  };

  const syncTextareaToAnswers = () => {
    if (textareaRef.current && questions[currentIdx]) {
      const val = textareaRef.current.value;
      setAnswers(prev => ({ ...prev, [questions[currentIdx].id]: val }));
      typedTextRef.current = val;
    }
  };

  const handleAnswerChange = (val) => {
    if (isTerminated) return;
    setAnswers(prev => ({ ...prev, [questions[currentIdx].id]: val }));
    typedTextRef.current = val;
    finalRef.current = '';
    lastActivityTime.current = Date.now();
    if (val.trim()) {
      setSkippedIds(prev => {
        if (prev.has(questions[currentIdx].id)) {
          const copy = new Set(prev);
          copy.delete(questions[currentIdx].id);
          return copy;
        }
        return prev;
      });
    }
  };

  const saveCurrentAnswer = async (status = 'attended') => {
    if (isTerminated) return;
    const q = questions[currentIdx];
    const ans = textareaRef.current ? textareaRef.current.value : (answers[q.id] || '');
    try {
      // Save via legacy endpoint for proctoring compatibility
      await api.saveAnswer({
        interview_id: interviewId,
        user_email: email,
        question_id: q.id,
        question_text: q.text,
        answer_text: ans,
        status: ans.trim() ? status : (status === 'skipped' ? 'skipped' : 'unanswered')
      });
    } catch (err) {
      // legacy save failed, not critical
    }
    // Also save via new session-based endpoint for AI evaluation
    const activeSessionId = sessionId || localStorage.getItem("active_session_id") || '';
    if (activeSessionId && q.id && ans.trim()) {
      try {
        const storedUser = (() => { try { return JSON.parse(localStorage.getItem("user") || '{}'); } catch { return {}; } })();
        await api.saveSessionAnswer(activeSessionId, {
          questionId: q.id,
          userAnswer: ans,
          userId: user?.id || storedUser?.id
        });
      } catch (err) {
        // session answer save failed, not critical
      }
    }
  };

  const handleNext = async () => {
    setSubmitting(true);
    const q = questions[currentIdx];
    const ans = textareaRef.current ? textareaRef.current.value : (answers[q.id] || '');
    
    const newAnswers = { ...answers, [q.id]: ans };
    setAnswers(newAnswers);
    localStorage.setItem("answers", JSON.stringify(newAnswers));

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "https://ai-proctoring-backend-5t3k.onrender.com";
      const res = await fetch(`${API_BASE_URL}/api/interview/evaluate-answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": localStorage.getItem("token") ? `Bearer ${localStorage.getItem("token")}` : "",
        },
        body: JSON.stringify({
          interviewId,
          questionId: q.id,
          questionNumber: currentIdx + 1,
          question: q.question || q.question_text || q.text,
          answer: ans,
          skill: q.skill || q.skill_tag || "General",
          userId: user?.id || ""
        })
      });
      const data = await res.json();
      const evals = JSON.parse(localStorage.getItem("interviewEvaluations") || "{}");
      if (data.success) {
        evals[q.id] = data;
      } else {
        evals[q.id] = {
          score: ans.length > 40 ? 6 : 3,
          technicalScore: ans.length > 40 ? 6 : 3,
          communicationScore: ans.length > 20 ? 6 : 3,
          confidenceScore: ans.length > 20 ? 6 : 3,
          feedback: "Answer saved. Detailed AI evaluation unavailable.",
          suggestedImprovement: "Add more explanation and examples."
        };
      }
      localStorage.setItem("interviewEvaluations", JSON.stringify(evals));
      if (voiceEnabled) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance("Answer submitted. Your response is evaluated. Moving to next question.");
        u.lang = "en-US";
        window.speechSynthesis.speak(u);
      }
    } catch (err) {
      console.error("Backend error saving answer:", err);
    }

    setSubmitting(false);

    if (currentIdx < questions.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      localStorage.setItem("current_question_index", nextIdx.toString());
      if (textareaRef.current) {
        textareaRef.current.value = '';
      }
    } else {
      handleFinalSubmit();
    }
  };

  const handlePrev = async () => {
    if (currentIdx > 0) {
      const prevIdx = currentIdx - 1;
      setCurrentIdx(prevIdx);
      localStorage.setItem("current_question_index", prevIdx.toString());
      if (textareaRef.current) {
        textareaRef.current.value = answers[questions[prevIdx]?.id] || '';
      }
    }
  };

  const handleSkip = async () => {
    const q = questions[currentIdx];
    const newAnswers = { ...answers, [q.id]: "" };
    setAnswers(newAnswers);
    localStorage.setItem("answers", JSON.stringify(newAnswers));

    if (currentIdx < questions.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      localStorage.setItem("current_question_index", nextIdx.toString());
      if (textareaRef.current) {
        textareaRef.current.value = newAnswers[questions[nextIdx]?.id] || '';
      }
    } else {
      handleFinalSubmit();
    }
  };

  const handleFinalSubmit = async () => {
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    
    const q = questions[currentIdx];
    if (q) {
      const ans = textareaRef.current ? textareaRef.current.value : (answers[q.id] || '');
      const newAnswers = { ...answers, [q.id]: ans };
      setAnswers(newAnswers);
      localStorage.setItem("answers", JSON.stringify(newAnswers));
    }

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "https://ai-proctoring-backend-5t3k.onrender.com";
      await fetch(`${API_BASE_URL}/api/interview/finish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": localStorage.getItem("token") ? `Bearer ${localStorage.getItem("token")}` : ""
        },
        body: JSON.stringify({
          interviewId,
          answers: JSON.parse(localStorage.getItem("answers") || "{}"),
          evaluations: JSON.parse(localStorage.getItem("interviewEvaluations") || "{}"),
          warnings: JSON.parse(localStorage.getItem("interviewWarnings") || "[]"),
          timeTaken: Math.floor((Date.now() - Number(localStorage.getItem("interviewStartTime"))) / 1000)
        })
      });

      isCompletedRef.current = true;
      cleanup();
      navigate('/results/' + interviewId);
    } catch (err) {
      console.error(err);
      setWarningMessage('Could not submit interview. Please try again.');
      setTimeout(() => setWarningMessage(''), 5000);
      submitLock.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="card" style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center', padding: '3rem' }}>
        <h3 style={{ color: '#1e3a5f' }}>Loading interview...</h3>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="card" style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center', padding: '3rem' }}>
        <h3 style={{ color: '#e53e3e' }}>{authError}</h3>
      </div>
    );
  }

  if (backendStatus === 'checking') {
    return (
      <div className="card" style={{ maxWidth: '450px', margin: '100px auto', textAlign: 'center', padding: '3rem' }}>
        <h3 style={{ color: '#1e3a5f' }}>Connecting to Server...</h3>
        <p style={{ color: '#718096', marginTop: '10px' }}>Please wait while we establish a connection.</p>
        <p style={{ fontSize: '0.85rem', color: '#a0aec0', marginTop: '1rem' }}>Note: Free tier servers may take up to 50 seconds to wake up.</p>
      </div>
    );
  }

  if (backendStatus === 'offline' || backendError) {
    return (
      <div className="card" style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center', padding: '3rem' }}>
        <h3 style={{ color: '#e53e3e' }}>{backendError || 'Backend Server Offline'}</h3>
        <p style={{ color: '#718096', marginTop: '10px' }}>Could not connect to the backend server. It might be sleeping or down.</p>
        <button className="btn btn-primary" onClick={checkBackendHealth} style={{ marginTop: '1rem' }}>Retry Connection</button>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="card" style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center', padding: '3rem' }}>
        <h3 style={{ color: '#e53e3e' }}>{dataError}</h3>
        {dataError.includes("No active interview") ? (
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')} style={{ marginTop: '1rem' }}>Go to Dashboard</button>
        ) : (
          <button className="btn btn-primary" onClick={() => window.location.reload()} style={{ marginTop: '1rem' }}>Retry</button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center', padding: '3rem' }}>
        <h3 style={{ color: '#1e3a5f' }}>Loading Interview...</h3>
        <p style={{ color: '#718096', marginTop: '10px' }}>Preparing questions and setting up proctoring environment.</p>
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center', padding: '3rem' }}>
        <h1 style={{ color: '#1e3a5f' }}>Proctored Interview</h1>
        <p style={{ margin: '1.5rem 0', color: '#718096' }}>Please ensure you are in a well-lit, quiet environment.</p>
        <button className="btn btn-primary" onClick={handleStart} style={{ padding: '1rem 2rem' }}>Start Interview Now</button>
        {warningMessage && <p style={{ color: '#e53e3e', marginTop: '1rem', fontWeight: 'bold' }}>{warningMessage}</p>}
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const progress = ((currentIdx + 1) / (questions.length || 1)) * 100;

  const computeCounts = () => {
    let answered = 0;
    let skipped = 0;
    let notAttempted = 0;
    questions.forEach((q) => {
      if (!q) {
        notAttempted++;
        return;
      }
      const ans = answers[q.id] || '';
      if (skippedIds.has(q.id)) {
        skipped++;
      } else if (ans.trim()) {
        answered++;
      } else {
        notAttempted++;
      }
    });
    return { answered, skipped, notAttempted };
  };

  const safeSkills = Array.isArray(detectedSkillsState)
    ? detectedSkillsState
    : typeof detectedSkillsState === "string" && detectedSkillsState.trim()
    ? detectedSkillsState.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', padding: '20px' }}>
      <style>{`
        @keyframes pulseGlow {
          from {
            box-shadow: 0 0 5px rgba(229, 62, 98, 0.4);
          }
          to {
            box-shadow: 0 0 15px rgba(229, 62, 98, 0.8);
          }
        }
        @keyframes pulseMic {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(229, 62, 62, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(229, 62, 62, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(229, 62, 62, 0); }
        }
        @keyframes blink {
          50% { opacity: 0.5; }
        }
      `}</style>
      <div className="card" style={{ position: 'relative' }}>
        {warningMessage && (
          <div className={`alert alert-${isTerminated ? 'error' : 'warning'}`} style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, margin: '10px', textAlign: 'center', fontWeight: 'bold' }}>
            {warningMessage}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 'bold', color: '#1e3a5f', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span>Session: {currentQuestion?.category || 'General'} | Topic: {currentQuestion?.topic || 'General'}</span>
            <span style={{ 
              color: timeLeft <= 300 ? '#e53e3e' : '#3182ce',
              background: timeLeft <= 300 ? '#fff5f5' : '#ebf8ff',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: `1px solid ${timeLeft <= 300 ? '#e53e3e' : '#3182ce'}`,
              animation: timeLeft <= 300 ? 'pulseGlow 1.5s infinite alternate' : 'none'
            }}>
              Question {currentIdx + 1} of 30 | Time Left: {formatTime(timeLeft)}
            </span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                if (voiceEnabled) {
                  window.speechSynthesis.cancel();
                } else {
                  const text = currentQuestion?.text;
                  if (text) {
                    showAndSpeak(`Voice assistant enabled. Here is the question: ${text}`);
                  }
                }
              }}
              style={{
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: voiceEnabled ? '#ebf8ff' : '#f7fafc',
                color: voiceEnabled ? '#3182ce' : '#718096',
                border: '1px solid ' + (voiceEnabled ? '#bee3f8' : '#e2e8f0'),
                transition: 'all 0.2s',
                height: 'fit-content',
                fontWeight: '600'
              }}
              title={voiceEnabled ? "Mute Voice Assistant" : "Unmute Voice Assistant"}
            >
              {voiceEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
            </button>
          </div>
        </div>
        {safeSkills.length > 0 && (
          <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '2rem' }}>
            <div style={{ height: '100%', background: '#3182ce', width: `${progress}%`, borderRadius: '4px', transition: 'width 0.3s' }}></div>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>
            Question {currentIdx + 1} of {questions.length} | 
            <span style={{ color: timeLeft < 300 ? '#e53e3e' : 'inherit', marginLeft: '8px' }}>
              Time Left: {formatTime(timeLeft)} | Warnings: {warningCount}/3
            </span>
          </h2>
          {autosaveStatus && (
            <span style={{ fontSize: '0.85rem', color: '#38a169', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              🟢 {autosaveStatus}
            </span>
          )}
        </div>
        {warningCount > 0 && (
          <div className="warning-panel" style={{ background: '#fff7ed', border: '1px solid #fb923c', color: '#9a3412', padding: '16px', borderRadius: '12px', marginTop: '16px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Warning Count: {warningCount}/3</h3>
            {warningsList.slice(0, 5).map((warning, i) => (
              <div key={warning.id} className="warning-item" style={{ background: '#ffedd5', padding: '10px', borderRadius: '8px', marginTop: '8px', fontWeight: '500' }}>
                ⚠️ Warning {warning.count || warningCount - i}/3 - {warning.message}
                <span style={{float: 'right', fontSize: '0.85em', color: '#7c2d12'}}>{warning.time}</span>
              </div>
            ))}
          </div>
        )}

        <p className="question-text" style={{ color: '#0f172a', fontSize: '20px', fontWeight: '600', lineHeight: '1.6', background: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
          {currentQuestion?.question || currentQuestion?.question_text || currentQuestion?.text || "Question text not available"}
        </p>
        <div style={{ marginBottom: '0.5rem' }}>
          <textarea
            ref={textareaRef}
            rows="10"
            placeholder="Type your answer here..."
            defaultValue={answers[currentQuestion?.id] || ''}
            onChange={(e) => handleAnswerChange(e.target.value)}
            disabled={isTerminated || submitting}
            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', borderRadius: '8px', border: '1px solid #cbd5e0', marginBottom: 0, boxSizing: 'border-box' }}
          ></textarea>
        </div>
        {isSupported && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', gap: '10px' }}>
            <button
              onClick={toggleListening}
              type="button"
              disabled={isTerminated || submitting}
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                border: '2px solid ' + (isListening ? '#ef4444' : (isMicEnabled ? '#22c55e' : '#cbd5e0')),
                background: isListening ? '#fee2e2' : (isMicEnabled ? '#f0fdf4' : '#f8fafc'),
                color: isListening ? '#ef4444' : (isMicEnabled ? '#16a34a' : '#64748b'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isTerminated || submitting ? 'not-allowed' : 'pointer',
                boxShadow: isListening
                  ? '0 0 0 6px rgba(239,68,68,0.15), 0 0 20px rgba(239,68,68,0.4)'
                  : isMicEnabled
                  ? '0 0 0 4px rgba(34,197,94,0.15), 0 4px 12px rgba(0,0,0,0.1)'
                  : '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'all 0.3s ease',
                animation: isListening ? 'pulseMic 1.2s infinite' : 'none',
                flexShrink: 0
              }}
              title={isMicEnabled ? 'Turn Mic OFF' : 'Turn Mic ON'}
            >
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
            <div style={{
              fontSize: '0.88rem',
              fontWeight: '600',
              color: isSpeaking ? '#d97706' : isListening ? '#ef4444' : isMicEnabled ? '#16a34a' : '#94a3b8',
              textAlign: 'center',
              minHeight: '20px',
              letterSpacing: '0.01em'
            }}>
              {isSpeaking
                ? '🔊 AI Assistant speaking...'
                : isListening
                ? '🎙 Listening continuously...'
                : isMicEnabled
                ? '🎤 Mic ON — ready'
                : '🎤 Mic OFF — click to start speaking'}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          {currentIdx > 0 ? (
            <button className="btn btn-outline" onClick={handlePrev} disabled={isTerminated || submitting}>Previous</button>
          ) : (
            <div></div> /* Empty div to preserve flex space-between layout */
          )}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={handleSkip} disabled={isTerminated || submitting}>Skip</button>
            {currentIdx < questions.length - 1 ? (
              <>
                <button className="btn btn-primary" onClick={handleNext} disabled={isTerminated || submitting}>{submitting ? 'Saving...' : 'Next'}</button>
                <button className="btn btn-primary" onClick={() => setShowConfirmSubmit(true)} disabled={submitting || isTerminated}>Submit Interview</button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => setShowConfirmSubmit(true)} disabled={submitting || isTerminated}>{submitting ? 'Submitting...' : 'Submit Interview'}</button>
            )}
          </div>
        </div>
      </div>
      <div>
        <div className="card" style={{ padding: '10px' }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{ width: "100%", borderRadius: 10, transform: "scaleX(-1)", background: "#0d0d14" }}
          />
          <div style={{ marginTop: '1rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
            <p style={{ color: liveStatus.camera === 'active' ? '#10b981' : '#ef4444', margin: '5px 0' }}>
              <span style={{ marginRight: '6px' }}>●</span>
              {liveStatus.camera === 'active' ? 'Camera Active' : 'Camera Blocked'}
            </p>
            <p style={{ color: liveStatus.audio === 'active' ? '#10b981' : '#ef4444', margin: '5px 0' }}>
              <span style={{ marginRight: '6px' }}>●</span>
              {liveStatus.audio === 'active' ? 'Mic Active' : 'Mic Blocked'}
            </p>
            <p style={{ color: '#3182ce', margin: '5px 0' }}>Time: {formatToIST(new Date())}</p>
          </div>
        </div>
        <div className="card" style={{ marginTop: '1rem', padding: '1rem' }}>
          <h4>Instructions</h4>
          <ul style={{ fontSize: '0.75rem', paddingLeft: '1.2rem', marginTop: '0.5rem', color: '#4a5568' }}>
            <li>Stay in focus of the camera.</li>
            <li>No tab switching allowed.</li>
            <li>Maintain silence in surroundings.</li>
            <li>All activity is being logged.</li>
          </ul>
        </div>
      </div>

      {showConfirmSubmit && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255, 255, 255, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
          <div className="card" style={{ maxWidth: '480px', width: '90%', padding: '2.5rem', textAlign: 'center', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', background: '#ffffff', border: '1px solid #e2e8f0' }}>
            <h3 style={{ color: '#1e3a5f', fontSize: '1.5rem', marginBottom: '1rem' }}>Submit Interview?</h3>
            <p style={{ color: '#4a5568', fontSize: '1rem', marginBottom: '1.5rem' }}>Are you sure you want to submit the interview?</p>
            
            <div style={{ background: '#f7fafc', padding: '1.5rem', borderRadius: '12px', textAlign: 'left', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#4a5568', fontWeight: '500' }}>Total Questions</span>
                <span style={{ color: '#1a0dab', fontWeight: 'bold' }}>30</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#4a5568', fontWeight: '500' }}>Answered Questions</span>
                <span style={{ color: '#38a169', fontWeight: 'bold' }}>{computeCounts().answered}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#4a5568', fontWeight: '500' }}>Skipped Questions</span>
                <span style={{ color: '#d69e2e', fontWeight: 'bold' }}>{computeCounts().skipped}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#4a5568', fontWeight: '500' }}>Not Attempted Questions</span>
                <span style={{ color: '#e53e3e', fontWeight: 'bold' }}>{computeCounts().notAttempted}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold', color: '#4a5568' }}>Question {currentIdx + 1} of 30</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#4a5568', fontWeight: '500' }}>Time Left</span>
                <span style={{ color: '#3182ce', fontWeight: 'bold' }}><InterviewTimer /></span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-outline" onClick={() => setShowConfirmSubmit(false)} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px' }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleFinalSubmit} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px' }}>Submit Interview</button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed AI Voice Assistant Panel - middle right */}
      <div style={{
        position: 'fixed',
        right: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        width: '200px',
        background: 'linear-gradient(180deg, #0d1f3c 0%, #1a3a6c 100%)',
        border: '1px solid #1a56db',
        borderRight: 'none',
        borderRadius: '12px 0 0 12px',
        padding: '16px 12px',
        zIndex: 9998,
        boxShadow: '-4px 0 20px rgba(26,86,219,0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '10px' }}>
          <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>🤖</div>
          <div style={{ color: '#93c5fd', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.5px' }}>AI ASSISTANT</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isMicEnabled ? '#22c55e' : '#6b7280',
            flexShrink: 0
          }} />
          <span style={{ color: '#e2e8f0', fontSize: '0.72rem', fontWeight: 600 }}>
            Mic: {isMicEnabled ? 'ON' : 'OFF'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isListening ? '#ef4444' : '#6b7280',
            animation: isListening ? 'pulseMic 1.2s infinite' : 'none',
            flexShrink: 0
          }} />
          <span style={{ color: '#e2e8f0', fontSize: '0.72rem', fontWeight: 600 }}>
            {isListening ? '🎙 Listening' : 'Silent'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isSpeaking ? '#f59e0b' : '#6b7280',
            animation: isSpeaking ? 'pulseMic 1.2s infinite' : 'none',
            flexShrink: 0
          }} />
          <span style={{ color: '#e2e8f0', fontSize: '0.72rem', fontWeight: 600 }}>
            {isSpeaking ? '🔊 Speaking' : (voiceEnabled ? '🔊 Ready' : '🔇 Muted')}
          </span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px 8px', textAlign: 'center' }}>
          <span style={{ color: '#93c5fd', fontSize: '0.7rem', fontWeight: 700 }}>
            Q {currentIdx + 1} / {questions.length || 30}
          </span>
        </div>
        <div 
          ref={liveTranscriptSidebarContainerRef}
          style={{
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.4)',
            borderRadius: '6px',
            padding: '6px 8px',
            maxHeight: '80px',
            overflowY: 'auto',
            display: 'none'
          }}
        >
          <div style={{ color: '#a5b4fc', fontSize: '0.65rem', fontWeight: 600, marginBottom: '3px' }}>LIVE TRANSCRIPT</div>
          <div ref={liveTranscriptSidebarRef} style={{ color: '#e2e8f0', fontSize: '0.68rem', lineHeight: 1.4, fontStyle: 'italic' }}></div>
        </div>
        <button
          onClick={() => { if (assistantSpeaking) { setWarningMessage('Please wait until assistant finishes speaking.'); setTimeout(() => setWarningMessage(''), 3000); } else { isListening ? stopListening() : startListening(); } }}
          style={{
            background: isMicEnabled ? '#dc2626' : '#1a56db',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 4px',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.72rem',
            width: '100%',
            marginTop: '4px'
          }}
        >
          {isMicEnabled ? '🔴 Turn Off' : '🎤 Turn On'}
        </button>
      </div>

      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#0d1f3c",
        borderTop: "2px solid #1a56db",
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        zIndex: 9999
      }}>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: isListening ? "#dc2626" : (isMicEnabled ? "#22c55e" : "#6b7280"),
            animation: isListening ? "pulseMic 1s infinite" : "none"
          }}/>
          <span style={{color:"white",fontSize:"0.82rem",fontWeight:600}}>
            {isListening ? "🎤 Listening..." : (isMicEnabled ? "🎤 Mic Active" : "🎤 Mic Off")}
          </span>
        </div>
        <button
          onClick={() => { if (assistantSpeaking) { setWarningMessage('Please wait until assistant finishes speaking.'); setTimeout(() => setWarningMessage(''), 3000); } else { isListening ? stopListening() : startListening(); } }}
          type="button"
          style={{
            background: isMicEnabled ? "#dc2626" : "#1a56db",
            color: "white", border: "none",
            borderRadius: "8px", padding: "7px 18px",
            fontWeight: 700, cursor: "pointer", fontSize: "0.82rem"
          }}
        >
          {assistantSpeaking ? "Assistant Speaking" : (isListening ? "Stop Mic" : "Turn On Mic")}
        </button>
        <div ref={liveTranscriptBottomRef} style={{flex:1,color:"#93c5fd",fontSize:"0.78rem",fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          Click Turn On Mic to start speaking
        </div>
        <div style={{ padding: '1rem', background: '#e2e8f0', color: '#4a5568', fontWeight: 'bold', textAlign: 'center' }}>
          Q{currentIdx + 1}/30
        </div>
      </div>
    </div>
  );
}

export default ActiveInterview;
