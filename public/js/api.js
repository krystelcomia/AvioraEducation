/**
 * AVIORA EDUCATION - API CLIENT & STORAGE HELPER
 */

const API_BASE = '/api';

const Storage = {
  getToken: () => localStorage.getItem('aviora_token'),
  setToken: (token) => localStorage.setItem('aviora_token', token),
  removeToken: () => localStorage.removeItem('aviora_token'),

  getUser: () => {
    try {
      const u = localStorage.getItem('aviora_user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem('aviora_user', JSON.stringify(user)),
  removeUser: () => localStorage.removeItem('aviora_user'),

  clearSession: () => {
    localStorage.removeItem('aviora_token');
    localStorage.removeItem('aviora_user');
  },

  getUserPreferences: (userId) => {
    try {
      const u = Storage.getUser();
      const id = userId || (u ? u.id : null);
      if (!id) return null;
      const p = localStorage.getItem(`aviora_prefs_${id}`);
      return p ? JSON.parse(p) : null;
    } catch (e) {
      return null;
    }
  },
  setUserPreferences: (userId, prefs) => {
    try {
      const u = Storage.getUser();
      const id = userId || (u ? u.id : null);
      if (id && prefs) {
        localStorage.setItem(`aviora_prefs_${id}`, JSON.stringify(prefs));
      }
    } catch (e) {}
  },
  clearUserPreferences: (userId) => {
    try {
      const u = Storage.getUser();
      const id = userId || (u ? u.id : null);
      if (id) {
        localStorage.removeItem(`aviora_prefs_${id}`);
      }
    } catch (e) {}
  }
};

async function apiRequest(endpoint, options = {}) {
  const token = Storage.getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is not FormData, add JSON Content-Type
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  options.headers = headers;

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 || (response.status === 404 && data && data.error === 'User account not found.')) {
        Storage.clearSession();
        if (typeof Auth !== 'undefined') {
          Auth.currentUser = null;
          Auth.updateNavUI(null);
        }
      }
      throw new Error(data.error || 'A network error occurred. Please try again.');
    }

    return data;
  } catch (error) {
    throw error;
  }
}

const API = {
  // Auth
  register: (body) => apiRequest('/auth/register', { method: 'POST', body }),
  login: (body) => apiRequest('/auth/login', { method: 'POST', body }),
  syncAccount: (body) => apiRequest('/auth/sync-account', { method: 'POST', body }),
  oauthLogin: (body) => apiRequest('/auth/oauth', { method: 'POST', body }),
  linkAccount: (body) => apiRequest('/auth/link-account', { method: 'POST', body }),
  getMe: () => apiRequest('/auth/me'),
  updateProfile: (body) => apiRequest('/auth/profile', { method: 'PUT', body }),
  changePassword: (body) => apiRequest('/auth/change-password', { method: 'PUT', body }),
  uploadAvatar: (formData) => {
    const token = Storage.getToken();
    return fetch('/api/auth/upload-avatar', {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: formData
    }).then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to upload profile picture.');
      return data;
    });
  },
  getUserPreferences: () => apiRequest('/user/preferences'),
  updateUserPreferences: (body) => apiRequest('/user/preferences', { method: 'PUT', body }),

  // Public
  getStats: () => apiRequest('/public/stats'),
  getAnalytics: () => apiRequest('/public/analytics'),
  getStudentWork: () => apiRequest('/public/student-work'),
  getTutors: (params = '') => apiRequest(`/tutors?${params}`),
  getTutorById: (id) => apiRequest(`/tutors/${id}`),
  sendMessageToTutor: (tutorId, body) => apiRequest(`/tutors/${tutorId}/messages`, { method: 'POST', body }),

  // Student
  getStudentDashboard: () => apiRequest('/student/dashboard'),
  getStudentSubscription: () => apiRequest('/student/subscription'),
  purchaseSubscription: (payload) => apiRequest('/student/subscription/purchase', { method: 'POST', body: typeof payload === 'string' ? { package_key: payload } : payload }),
  createRequest: (body) => apiRequest('/student/requests', { method: 'POST', body }),
  cancelRequest: (id) => apiRequest(`/student/requests/${id}/cancel`, { method: 'POST' }),
  submitReview: (id, body) => apiRequest(`/student/requests/${id}/review`, { method: 'POST', body }),

  // Teacher & Tutor Portal
  getTeacherStatus: () => apiRequest('/teacher/application-status'),
  detectDocument: (formData) => apiRequest('/teacher/detect-document', { method: 'POST', body: formData }),
  submitTeacherApplication: (formData) => apiRequest('/teacher/apply', { method: 'POST', body: formData }),
  getTeacherDashboard: () => apiRequest('/teacher/dashboard'),
  updateRequestStatus: (id, body) => apiRequest(`/teacher/requests/${id}/status`, { method: 'POST', body }),
  getTeacherClasses: () => apiRequest('/teacher/classes'),
  getTeacherSubjects: () => apiRequest('/teacher/subjects'),
  updateTeacherSubjects: (body) => apiRequest('/teacher/subjects', { method: 'PUT', body }),
  launchInstantClass: (body) => apiRequest('/teacher/classes/launch-instant', { method: 'POST', body }),
  getTeacherStudents: () => apiRequest('/teacher/students'),
  getTeacherTasks: () => apiRequest('/teacher/tasks'),
  assignStudentTask: (body) => apiRequest('/teacher/tasks', { method: 'POST', body }),
  gradeStudentTask: (id, body) => apiRequest(`/teacher/tasks/${id}/grade`, { method: 'POST', body }),
  getTeacherSchedule: () => apiRequest('/teacher/schedule'),
  toggleOccupiedSlot: (body) => apiRequest('/teacher/schedule/toggle-slot', { method: 'POST', body }),
  setDayAvailability: (body) => apiRequest('/teacher/schedule/set-day-availability', { method: 'POST', body }),
  getTeacherBuddySessions: () => apiRequest('/teacher/buddy-sessions'),

  // Admin
  getAdminDashboard: () => apiRequest('/admin/dashboard'),
  getAdminUsers: (role = 'all') => apiRequest(`/admin/users?role=${role}`),
  createAdminUser: (body) => apiRequest('/admin/users', { method: 'POST', body }),
  getAdminApplications: (status = 'all') => apiRequest(`/admin/teacher-applications?status=${status}`),
  reviewApplication: (id, body) => apiRequest(`/admin/teacher-applications/${id}/review`, { method: 'POST', body }),
  getAdminTutors: () => apiRequest('/admin/tutors'),
  toggleTutorStatus: (id) => apiRequest(`/admin/tutors/${id}/toggle-status`, { method: 'POST' }),
  getAdminStudents: () => apiRequest('/admin/students'),
  updateUserStatus: (id, body) => apiRequest(`/admin/users/${id}/status`, { method: 'POST', body }),
  getAdminRequests: () => apiRequest('/admin/requests'),
  getAdminInquiries: (status = 'all', search = '') => apiRequest(`/admin/inquiries?status=${status}&search=${encodeURIComponent(search)}`),
  respondToInquiry: (id, body) => apiRequest(`/admin/inquiries/${id}/respond`, { method: 'POST', body }),

  // Inquiries (Public / Student / Guest Submission)
  submitInquiry: (body) => apiRequest('/inquiries', { method: 'POST', body }),

  // Notifications
  getNotifications: () => apiRequest('/notifications'),
  markNotificationsRead: () => apiRequest('/notifications/mark-read', { method: 'POST' }),

  // Virtual Room
  getRoomDetails: (id) => apiRequest(`/sessions/${id}/room`),
  openRoom: (id) => apiRequest(`/sessions/${id}/room/open`, { method: 'POST' }),
  endRoom: (id) => apiRequest(`/sessions/${id}/room/end`, { method: 'POST' }),
  getRoomMessages: (id) => apiRequest(`/sessions/${id}/room/messages`),
  sendRoomMessage: (id, body) => apiRequest(`/sessions/${id}/room/messages`, { method: 'POST', body }),
  sendRoomSignal: (id, body) => apiRequest(`/sessions/${id}/room/signal`, { method: 'POST', body }),
  getRoomSignals: (id, since = 0) => apiRequest(`/sessions/${id}/room/signal?since=${since}`)
};
