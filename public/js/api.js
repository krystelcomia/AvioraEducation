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
  oauthLogin: (body) => apiRequest('/auth/oauth', { method: 'POST', body }),
  getMe: () => apiRequest('/auth/me'),
  updateProfile: (body) => apiRequest('/auth/profile', { method: 'PUT', body }),
  changePassword: (body) => apiRequest('/auth/change-password', { method: 'PUT', body }),

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

  // Teacher
  getTeacherStatus: () => apiRequest('/teacher/application-status'),
  submitTeacherApplication: (formData) => apiRequest('/teacher/apply', { method: 'POST', body: formData }),
  getTeacherDashboard: () => apiRequest('/teacher/dashboard'),
  updateRequestStatus: (id, body) => apiRequest(`/teacher/requests/${id}/status`, { method: 'POST', body }),

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
