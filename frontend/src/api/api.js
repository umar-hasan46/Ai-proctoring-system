import API_BASE_URL from '../config/api';
const BASE_URL = `${API_BASE_URL}/api`;

const apiRequest = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  const headers = {
    'Accept': 'application/json',
  };
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  } else if (!options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const defaultOptions = {
    credentials: 'include',
    signal: controller.signal,
    headers: {
      ...headers,
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Server returned invalid content type');
    }

    const data = await response.json();
    if (!response.ok) {
        const err = new Error(data.message || 'API error');
        err.status = response.status;
        err.data = data;
        throw err;
    }
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError' || (error.message && error.message.toLowerCase().includes('aborted'))) {
      throw new Error('Request timeout. Please retry.');
    }
    throw error;
  }
};

export const api = {
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  adminLogin: (credentials) => apiRequest('/auth/admin-login', { method: 'POST', body: JSON.stringify(credentials) }),
  signup: (userData) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  logout: () => apiRequest('/logout', { method: 'POST' }),

  getAdminStats: () => apiRequest('/admin/stats'),
  getUserStats: (email) => apiRequest('/dashboard/user-stats/' + email),
  getUserDashboard: (email) => apiRequest('/dashboard/user/dashboard?email=' + encodeURIComponent(email)),

  getUsers: () => apiRequest('/admin/users'),
  addUser: (userData) => apiRequest('/admin/users', { method: 'POST', body: JSON.stringify(userData) }),

  startInterview: (data) => apiRequest('/interviews/start', { method: 'POST', body: JSON.stringify(data) }),
  startInterviewSession: (data) => apiRequest('/interview/start', { method: 'POST', body: JSON.stringify(data) }),
  getSessionQuestions: (sessionId) => apiRequest('/interview/' + sessionId + '/questions'),
  saveSessionAnswer: (sessionId, data) => apiRequest('/interview/' + sessionId + '/answer', { method: 'POST', body: JSON.stringify(data) }),
  getSessionReport: (sessionId) => apiRequest('/interview/' + sessionId + '/report'),
  endInterview: (data) => apiRequest('/interviews/end', { method: 'PUT', body: JSON.stringify(data) }),
  getActiveInterviews: () => apiRequest('/interviews/active'),
  getLatestInterview: (email) => apiRequest('/interviews/latest/' + email),
  getUserInterviews: (email) => apiRequest('/interviews/user/' + email),

  saveViolation: (data) => apiRequest('/violations', { method: 'POST', body: JSON.stringify(data) }),
  getInterviewViolations: (id) => apiRequest('/violations/' + id),
  getUserViolations: (email) => apiRequest('/violations/user/' + email),

  analyzeAnswer: (data) => apiRequest('/answers/analyze', { method: 'POST', body: JSON.stringify(data) }),
  getInterviewAnalysis: (id) => apiRequest('/answers/interview/' + id),

  getUserNotifications: (email) => apiRequest('/notifications/user/' + email),
  getAdminNotifications: () => apiRequest('/notifications/admin'),
  getUnreadCount: (email) => apiRequest('/notifications/unread-count/' + email),
  getAdminUnreadCount: () => apiRequest('/notifications/admin-unread-count'),
  markNotificationRead: (id) => apiRequest('/notifications/mark-read/' + id, { method: 'PUT' }),
  markAllNotificationsRead: (email, role) => apiRequest('/notifications/mark-all-read', { method: 'PUT', body: JSON.stringify({ email, role }) }),
  clearReadNotifications: (email, role) => apiRequest('/notifications/clear-read', { method: 'DELETE', body: JSON.stringify({ email, role }) }),

  updateUserSettings: (data) => apiRequest('/user/settings', { method: 'PUT', body: JSON.stringify(data) }),
  updateAdminSettings: (data) => apiRequest('/admin/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getProfile: (email) => apiRequest('/profile?email=' + encodeURIComponent(email)),
  updateProfile: (data) => apiRequest('/profile/update', { method: 'PUT', body: JSON.stringify(data) }),
  uploadProfilePic: (formData) => apiRequest('/settings/upload-photo', {
    method: 'POST',
    body: formData,
    headers: {}
  }),

  checkHealth: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();
      return { success: data.success === true };
    } catch (error) {
      console.error("Backend connection failed:", error);
      return { success: false };
    }
  },

  registerInterview: (data) => apiRequest('/interviews/register', { method: 'POST', body: JSON.stringify(data) }),
  detectSkills: (data) => apiRequest('/interviews/detect-skills', { method: 'POST', body: JSON.stringify(data) }),
  getQuestions: (id) => apiRequest('/interviews/questions/' + id),
  saveAnswer: (data) => apiRequest('/interviews/save-answer', { method: 'POST', body: JSON.stringify(data) }),
  submitInterview: (data) => apiRequest('/interviews/submit-interview', { method: 'POST', body: JSON.stringify(data) }),
  updateLiveStatus: (data) => apiRequest('/interviews/update-live-status', { method: 'POST', body: JSON.stringify(data) }),
  getProctoringLogs: (id) => apiRequest('/interviews/proctoring-logs/' + id),
  saveAIObservation: (data) => apiRequest('/analysis/save-observation', { method: 'POST', body: JSON.stringify(data) }),
  getAIObservations: (id) => apiRequest('/analysis/observations/' + id),

  saveAILog: (data) => apiRequest('/interview/ai-log', { method: 'POST', body: JSON.stringify(data) }),
  getAILogs: (id) => apiRequest('/interview/ai-log/' + id),
  saveCandidateFeedback: (data) => apiRequest('/interview/candidate-feedback', { method: 'POST', body: JSON.stringify(data) }),
  getCandidateFeedback: (id) => apiRequest('/interview/candidate-feedback/' + id),
  saveAdminReport: (data) => apiRequest('/admin/ai-report', { method: 'POST', body: JSON.stringify(data) }),
  getAdminReport: (id) => apiRequest('/admin/ai-report/' + id),
  getEvaluations: (id) => apiRequest('/interview/evaluations/' + id),
  sendChatbotMessage: (data) => apiRequest('/chatbot/message', { method: 'POST', body: JSON.stringify(data) }),
  getChatbotHistory: (email) => apiRequest('/chatbot/history/' + email),
  getAllAdminReports: () => apiRequest('/admin/reports'),
  getStudentsDashboard: () => apiRequest('/admin/students-dashboard'),
  getStudentDetails: (id) => apiRequest('/admin/student-details/' + id),
  getLiveProctoring: () => apiRequest('/admin/live-proctoring'),
  appreciateCandidate: (data) => apiRequest('/admin/live-proctoring/appreciate', { method: 'POST', body: JSON.stringify(data) }),
  terminateCandidate: (data) => apiRequest('/admin/live-proctoring/terminate', { method: 'POST', body: JSON.stringify(data) }),
  getInterviewStatus: (id) => apiRequest('/interview/status/' + id),
  downloadReports: () => {
    window.location.href = BASE_URL + '/admin/download-reports';
  },
  getDashboardStats: () => apiRequest('/admin/stats'),
  downloadInterviewPDF: (id) => { window.open(BASE_URL + '/admin/results/' + id + '/pdf', '_blank'); },
  generateQuestion: (data) => apiRequest('/interview/generate-question', { method: 'POST', body: JSON.stringify(data) }),
  getCurrentQuestion: (id) => apiRequest('/interview/current-question/' + id),
  evaluateAnswer: (data) => apiRequest('/interview/evaluate-answer', { method: 'POST', body: JSON.stringify(data) }),
  nextQuestion: (data) => apiRequest('/interview/next-question', { method: 'POST', body: JSON.stringify(data) }),
  evaluateAllAnswers: (data) => apiRequest('/interview/evaluate-all-answers', { method: 'POST', body: JSON.stringify(data) }),
  submitInterviewEngine: (data) => apiRequest('/interview/submit', { method: 'POST', body: JSON.stringify(data) }),
  completeInterview: (data) => apiRequest('/interview/complete', { method: 'POST', body: JSON.stringify(data) }),
  getInterviewResultsById: (id) => apiRequest('/interview/results/' + id),
  getInterviewResultsByEmail: (email) => apiRequest('/interview/results-by-email/' + email),
  getInterviewResultStatus: (id) => apiRequest('/interview/result-status/' + id),
  getTimerStatus: (id) => apiRequest('/interview/timer-status/' + id),
  evaluateAllAnswers: (data) => apiRequest('/interview/evaluate-all-answers', { method: 'POST', body: JSON.stringify(data) }),
  autosaveAnswer: (data) => apiRequest('/interview/autosave-answer', { method: 'POST', body: JSON.stringify(data) }),
  autoSubmitInterview: (data) => apiRequest('/interview/auto-submit', { method: 'POST', body: JSON.stringify(data) }),
  downloadTimerReport: () => {
    window.location.href = BASE_URL + '/admin/download-timer-report';
  },
  getDetailedInterviewReport: (id) => apiRequest('/admin/interview-detail/' + id),
  getUserDetailedResults: (id, email) => {
    const userId = localStorage.getItem("userId") || "";
    const role = localStorage.getItem("userRole") || localStorage.getItem("role") || "";
    const token = localStorage.getItem("token") || "";
    return apiRequest('/interview/my-results/' + id + '?email=' + encodeURIComponent(email), {
      headers: {
        "X-User-Id": userId,
        "X-User-Role": role,
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      }
    });
  },
  getUserFullDetail: (userId) => apiRequest('/admin/user-full-detail/' + userId),
  updateAdminStatus: (data) => apiRequest('/admin/update-status', { method: 'PUT', body: JSON.stringify(data) }),
  updateUserStatus: (userId, data) => apiRequest('/users/' + userId + '/status', { method: 'PUT', body: JSON.stringify(data) }),
  uploadResume: (formData) => apiRequest('/interviews/upload-resume', { method: 'POST', body: formData, headers: {} }),
  getSpokenQuestion: (data) => apiRequest('/interview/spoken-question', { method: 'POST', body: JSON.stringify(data) }),
  getVoiceFeedback: (data) => apiRequest('/interview/voice-feedback', { method: 'POST', body: JSON.stringify(data) }),
  post: (endpoint, data) => apiRequest(endpoint, { method: 'POST', body: JSON.stringify(data) }),
};

