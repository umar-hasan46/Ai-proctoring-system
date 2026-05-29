import React, { useState, useEffect } from 'react';
import { formatTime } from '../utils/time';

function InterviewTimer({ onTimeUp, currentQuestionIdx, totalQuestions }) {
  const [timeLeft, setTimeLeft] = useState(1800);

  useEffect(() => {
    const totalSeconds = 1800;
    
    // Check if start time exists, if not set it
    let startTimeStr = localStorage.getItem("interviewStartTime");
    if (!startTimeStr) {
      startTimeStr = Date.now().toString();
      localStorage.setItem("interviewStartTime", startTimeStr);
    }

    const startTime = parseInt(startTimeStr, 10);

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = totalSeconds - elapsed;
      
      if (remaining <= 0) {
        setTimeLeft(0);
        if (onTimeUp) onTimeUp();
      } else {
        setTimeLeft(remaining);
      }
    };

    updateTimer(); // Initial call
    const timerId = setInterval(updateTimer, 1000);

    return () => clearInterval(timerId);
  }, [onTimeUp]);

  const isWarning = timeLeft <= 300; // less than 5 minutes
  const isCritical = timeLeft <= 60; // less than 1 minute

  const timerStyle = {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    backgroundColor: isCritical ? '#fff5f5' : (isWarning ? '#fffaf0' : 'var(--bg-primary)'),
    color: isCritical ? '#c53030' : (isWarning ? '#dd6b20' : '#2b6cb0'),
    border: isCritical ? '2px solid #e53e3e' : (isWarning ? '2px solid #dd6b20' : '1px solid #e2e8f0'),
    fontWeight: 'bold',
    fontSize: '1.1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    animation: isWarning ? 'pulseGlow 1.5s infinite alternate' : 'none'
  };

  return (
    <>
      <style>{`
        @keyframes pulseGlow {
          from {
            box-shadow: 0 0 5px rgba(229, 62, 98, 0.4);
          }
          to {
            box-shadow: 0 0 15px rgba(229, 62, 98, 0.8);
          }
        }
      `}</style>
      <div style={timerStyle}>
        <span>
          {currentQuestionIdx !== undefined && totalQuestions !== undefined
            ? `Question ${currentQuestionIdx + 1} of ${totalQuestions} | Time Left: ${formatTime(timeLeft)}`
            : `Time Left: ${formatTime(timeLeft)}`}
        </span>
      </div>
    </>
  );
}

export default InterviewTimer;
