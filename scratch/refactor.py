import sys

path = r"c:\Users\Admin\Desktop\ai proctor\frontend\src\pages\ActiveInterview.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. State cleanups
state_target = """  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [highestIdx, setHighestIdx] = useState(0);
  const [answers, setAnswers] = useState({});"""

state_replacement = """  const storedQuestions = JSON.parse(localStorage.getItem("interviewQuestions") || "[]");
  const [questions, setQuestions] = useState(storedQuestions);
  const [currentIdx, setCurrentIdx] = useState(() => parseInt(localStorage.getItem("current_question_index") || "0", 10));
  const [highestIdx, setHighestIdx] = useState(0);
  const [answers, setAnswers] = useState(() => JSON.parse(localStorage.getItem("answers") || "{}"));"""

if state_target in content:
    content = content.replace(state_target, state_replacement)
else:
    print("State target not found!")

# 2. Timer Logic
timer_target = """  const liveTranscriptBottomRef = useRef(null);

  const showAndSpeak = (text) => {"""

timer_replacement = """  const liveTranscriptBottomRef = useRef(null);

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

  const showAndSpeak = (text) => {"""

if timer_target in content:
    content = content.replace(timer_target, timer_replacement)
else:
    print("Timer target not found!")

# 3. checkAndFetch override
fetch_start = content.find("const checkAndFetch = async () => {")
fetch_end = content.find("checkAndFetch();\n  }, [interviewId, email, backendStatus, navigate, sessionId, isStarted, questions.length]);")

if fetch_start != -1 and fetch_end != -1:
    before = content[:content.rfind("    const checkAndFetch", 0, fetch_start)]
    after = content[fetch_end + len("checkAndFetch();\n  }, [interviewId, email, backendStatus, navigate, sessionId, isStarted, questions.length]);"):]
    
    new_fetch = """    if (questions.length === 0) {
      setDataError("No interview questions found. Please start a new interview.");
      setLoading(false);
    } else {
      setLoading(false);
      setIsStarted(true);
      startCamera();
    }
  }, [email, backendStatus, questions.length]);"""
    
    content = before + new_fetch + after
else:
    print("checkAndFetch not found!")

# 4. handleNext to handleFinalSubmit replace
next_start = content.find("const handleNext = async () => {")
submit_end = content.find("return '';\n  };\n\n  if (authLoading) {")

if next_start != -1 and submit_end != -1:
    before_next = content[:next_start]
    after_submit = content[submit_end + len("return '';\n  };"):]
    
    new_logic = """const handleNextQuestion = async () => {
    setSubmitting(true);
    const q = questions[currentIdx];
    const ans = textareaRef.current ? textareaRef.current.value : (answers[q.id] || '');
    
    const newAnswers = { ...answers, [q.id]: ans };
    setAnswers(newAnswers);
    localStorage.setItem("answers", JSON.stringify(newAnswers));

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "https://ai-proctoring-backend-5t3k.onrender.com";
      await fetch(`${API_BASE_URL}/api/interview/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": localStorage.getItem("token") ? `Bearer ${localStorage.getItem("token")}` : "",
        },
        body: JSON.stringify({
          interviewId,
          questionId: q.id,
          answer: ans
        })
      });
    } catch (err) {
      console.error("Backend error saving answer:", err);
    }

    setSubmitting(false);

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
    
    // Save last answer
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
          answers: JSON.parse(localStorage.getItem("answers") || "{}")
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
  };"""

    content = before_next + new_logic + after_submit
else:
    print("Next to Submit logic not found!")

# 5. Replace onClick in buttons from handleNext to handleNextQuestion
content = content.replace("onClick={handleNext}", "onClick={handleNextQuestion}")

# 6. Timer UI at the top
timer_ui_target = """        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 'bold', color: '#1e3a5f' }}>
            Session: {currentQuestion?.category || 'General'} | Topic: {currentQuestion?.topic || 'General'} | Difficulty: <span style={{ color: currentQuestion?.difficulty === 'Easy' ? '#48bb78' : (currentQuestion?.difficulty === 'Medium' ? '#ecc94b' : '#f56565') }}>{currentQuestion?.difficulty || 'Easy'}</span>
          </span>"""

timer_ui_replacement = """        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
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
          </span>"""

if timer_ui_target in content:
    content = content.replace(timer_ui_target, timer_ui_replacement)
else:
    print("Timer UI target not found!")

# Remove the old InterviewTimer inside the submit dialog
content = content.replace("<span style={{ color: '#3182ce', fontWeight: 'bold' }}><InterviewTimer /></span>", "<span style={{ color: '#3182ce', fontWeight: 'bold' }}>{formatTime(timeLeft)}</span>")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Rewrite complete!")
