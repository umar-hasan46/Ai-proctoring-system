import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/api';
import { useLocation, useNavigate } from 'react-router-dom';

const AIChatbot = ({ user: propUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const getStoredUser = () => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  };

  const user = propUser || getStoredUser();

  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const candidateSuggestions = [
    "Explain my overall score",
    "How was my technical score evaluated?",
    "What does my confidence score mean?",
    "Why was my interview status shown as incomplete?",
    "Start Interview",
    "View My Results",
    "Open Notifications"
  ];

  const adminSuggestions = [
    "Summarize candidate performance",
    "List critical proctoring violations",
    "Show technical scoring breakdown",
    "Compare this candidate with overall average",
    "Open Students Dashboard",
    "Open Live Proctoring"
  ];

  const suggestions = user?.role === 'admin' ? adminSuggestions : candidateSuggestions;

  const getPageName = () => {
    const path = location.pathname;
    if (path.includes('results')) return 'Results Page';
    if (path.includes('admin/dashboard') || (path === '/dashboard' && user?.role === 'admin')) return 'Admin Dashboard';
    if (path.includes('active-interview')) return 'Interview Page';
    if (path.includes('admin/ai-report')) return 'AI Report Page';
    if (path.includes('notifications')) return 'Notifications Page';
    if (path.includes('register-interview')) return 'Register Page';
    if (path.includes('profile')) return 'Profile Page';
    if (path.includes('settings')) return 'Settings Page';
    if (path.includes('admin/students-dashboard')) return 'Students Dashboard';
    if (path.includes('admin/live-proctoring')) return 'Live Proctoring Page';
    return 'Dashboard';
  };

  const welcomeMessage = user?.role === 'admin'
    ? "Hi! I'm your AI Admin Assistant. I can help you monitor live sessions, manage students, and interpret proctoring reports."
    : "Hi! I'm your AI Interview Assistant. I can help you understand your scores, improve your performance, and navigate your dashboard.";

  useEffect(() => {
    if (isOpen && chatHistory.length === 0) {
      setChatHistory([{ sender: 'bot', text: welcomeMessage }]);
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, loading]);

  const handleSuggestionClick = async (sug) => {
    if (sug === "Start Interview") navigate('/active-interview');
    else if (sug === "View My Results" || sug === "View Reports") navigate('/results');
    else if (sug === "Open Notifications") navigate('/notifications');
    else if (sug === "Open Students Dashboard") navigate('/admin/students-dashboard');
    else if (sug === "Open Live Proctoring") navigate('/admin/live-proctoring');
    else if (sug === "Download Reports") {
      api.downloadReports();
      setChatHistory(prev => [...prev, { sender: 'bot', text: "I've initiated the report download for you." }]);
    }
    else processMessage(sug);
  };

  const processMessage = async (text) => {
    if (!text.trim() || loading) return;

    const userMsg = text;
    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
    setLoading(true);

    const lowerMsg = userMsg.toLowerCase();

    const dashboardExplanations = {
      'last interview': "Last Interview shows the status of your most recent attempt (Completed, Terminated, or Active).",
      'confidence level': "Confidence Level is calculated by our AI based on your eye movement, tab switching, and technical answer accuracy.",
      'warnings': "Warnings represent the number of proctoring violations (like look away or tab switching) detected during your interview.",
      'notifications': "Notifications alert you about status changes, result availability, or administrator feedback.",
      'loading': "If data shows Loading, please wait a few seconds or ensure you have completed at least one interview."
    };

    for (const [key, value] of Object.entries(dashboardExplanations)) {
      if (lowerMsg.includes(key)) {
        setChatHistory(prev => [...prev, { sender: 'bot', text: value }]);
        setLoading(false);
        return;
      }
    }

    if (user?.role === 'admin') {
      if (lowerMsg.includes('view reports')) {
        setChatHistory(prev => [...prev, { sender: 'bot', text: "Navigating you to the reports page..." }]);
        setTimeout(() => { setIsOpen(false); navigate('/reports'); }, 1000);
        setLoading(false);
        return;
      }
    } else {
      if (lowerMsg.includes('view my score') || lowerMsg.includes('view results')) {
        setChatHistory(prev => [...prev, { sender: 'bot', text: "Taking you to your results page..." }]);
        setTimeout(() => { setIsOpen(false); navigate('/results'); }, 1000);
        setLoading(false);
        return;
      }
    }

    try {
      const res = await api.sendChatbotMessage({
        user_email: user?.email || "anonymous",
        user_role: user?.role || "user",
        page_name: getPageName(),
        message: userMsg
      });

      if (res.success) {
        setChatHistory(prev => [...prev, { sender: 'bot', text: res.response }]);
      } else {
        setChatHistory(prev => [...prev, { sender: 'bot', text: "This information is not available yet." }]);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { sender: 'bot', text: "This information is not available yet." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const msg = message;
    setMessage('');
    processMessage(msg);
  };

  if (!user) return null;

  return (
    <div style={{ position: 'fixed', bottom: '25px', right: '25px', zIndex: 10000 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '65px',
          height: '65px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1e3a5f 0%, #4f46e5 100%)',
          border: 'none',
          color: '#fff',
          fontSize: '28px',
          cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          transform: isOpen ? 'rotate(90deg) scale(0.9)' : 'rotate(0deg) scale(1)'
        }}
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '85px',
          right: '0',
          width: '380px',
          maxWidth: '85vw',
          height: '520px',
          maxHeight: '75vh',
          background: '#fff',
          borderRadius: '20px',
          boxShadow: '0 15px 40px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'chatSlideUp 0.3s ease-out'
        }}>
          {}
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #1e3a5f 0%, #4f46e5 100%)',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>AI Interview Assistant</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Online | Smart AI</div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '20px' }}>✕</button>
          </div>

          {}
          <div ref={scrollRef} style={{
            flex: 1,
            padding: '20px',
            overflowY: 'auto',
            background: '#f9fafb',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {chatHistory.map((chat, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: chat.sender === 'user' ? 'flex-end' : 'flex-start'
              }}>
                <div style={{
                  maxWidth: '80%',
                  padding: '12px 16px',
                  borderRadius: chat.sender === 'user' ? '18px 18px 0 18px' : '18px 18px 18px 0',
                  background: chat.sender === 'user' ? '#4f46e5' : '#fff',
                  color: chat.sender === 'user' ? '#fff' : '#1e293b',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  fontSize: '0.92rem',
                  lineHeight: '1.5'
                }}>
                  {chat.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 0', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {}
          <div style={{
            padding: '10px 15px',
            background: '#fff',
            borderTop: '1px solid #f3f4f6',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            scrollbarWidth: 'none'
          }}>
            {suggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(sug)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '15px',
                  border: '1px solid #e5e7eb',
                  background: '#fff',
                  color: '#4b5563',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = '#4f46e5'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              >
                {sug}
              </button>
            ))}
          </div>

          {}
          <form onSubmit={handleSubmit} style={{
            padding: '15px',
            borderTop: '1px solid #f3f4f6',
            display: 'flex',
            gap: '10px',
            background: '#fff'
          }}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about your interview, scores..."
              style={{
                flex: 1,
                padding: '12px 18px',
                borderRadius: '25px',
                border: '1px solid #e5e7eb',
                outline: 'none',
                fontSize: '0.95rem'
              }}
            />
            <button type="submit" style={{
              background: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '45px',
              height: '45px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>➤</button>
          </form>
        </div>
      )}

      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .typing-indicator {
          display: flex;
          gap: 4px;
        }
        .typing-indicator span {
          width: 6px;
          height: 6px;
          background: #9ca3af;
          borderRadius: 50%;
          animation: typing 1.4s infinite ease-in-out;
        }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
};

export default AIChatbot;
