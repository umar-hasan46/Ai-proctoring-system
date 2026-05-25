import React, { useState, useEffect } from 'react';

const InterviewTimer = ({ totalSeconds = 1800, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);

  useEffect(() => {
    const startTimeStr = localStorage.getItem("interviewStartTime");
    if (!startTimeStr) return;
    
    const startTime = parseInt(startTimeStr, 10);
    
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, totalSeconds - elapsed);
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(timerInterval);
        if (onTimeUp) onTimeUp();
      }
    };
    
    updateTimer(); // Initial call
    const timerInterval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(timerInterval);
  }, [totalSeconds, onTimeUp]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isWarning = timeLeft <= 300; // 5 minutes
  const isCritical = timeLeft <= 60;  // 1 minute

  const timerStyle = {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    backgroundColor: isCritical ? '#fff5f5' : isWarning ? '#fffaf0' : '#f7fafc',
    color: isCritical ? '#e53e3e' : isWarning ? '#dd6b20' : '#2b6cb0',
    border: isCritical ? '2px solid #e53e3e' : isWarning ? '2px solid #dd6b20' : '1px solid #e2e8f0',
    fontWeight: 'bold',
    fontSize: '1.1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    animation: isWarning ? 'pulseGlow 1.5s infinite alternate' : 'none'
  };

  return (
    <div style={timerStyle}>
      <style>{`
        @keyframes pulseGlow {
          from {
            box-shadow: 0 0 5px rgba(221, 107, 32, 0.4);
          }
          to {
            box-shadow: 0 0 15px rgba(221, 107, 32, 0.8);
          }
        }
      `}</style>
      ⏰ Time Left: {formatTime(timeLeft)}
    </div>
  );
};

export default InterviewTimer;
