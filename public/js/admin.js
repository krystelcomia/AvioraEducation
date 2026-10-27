/**
 * AVIORA EDUCATION - ADMINISTRATOR DASHBOARD LOGIC
 */

const Admin = {
  currentSection: 'overview',
  users: [],
  currentRoleFilter: 'all',
  applications: [],
  tutors: [],
  students: [],
  requests: [],
  inquiries: [],
  currentInquiryFilter: 'all',
  selectedInquiry: null,
  selectedApp: null,

  async init() {
    this.setupEventListeners();
    await this.loadDashboardMetrics();
  },

  setupEventListeners() {
    // Admin Sidebar Navigation
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const section = item.dataset.section;
        this.switchSection(section);
      });
    });

    // Role filter buttons for All User Accounts
    document.querySelectorAll('.user-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.user-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const role = btn.dataset.role;
        this.currentRoleFilter = role;
        this.loadUsers(role);
      });
    });

    // Real-time user search filter
    const userSearchInput = document.getElementById('admin-user-search');
    if (userSearchInput) {
      userSearchInput.addEventListener('input', (e) => {
        this.filterUsersBySearch(e.target.value);
      });
    }

    // Application filter buttons
    document.querySelectorAll('.app-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.app-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const status = btn.dataset.status;
        this.loadApplications(status);
      });
    });

    // Inquiry filter buttons (solely for Admin)
    document.querySelectorAll('.inquiry-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.inquiry-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const status = btn.dataset.status;
        this.currentInquiryFilter = status;
        this.loadInquiries(status);
      });
    });

    // Real-time inquiry search filter
    const inquirySearchInput = document.getElementById('admin-inquiry-search');
    if (inquirySearchInput) {
      inquirySearchInput.addEventListener('input', (e) => {
        this.filterInquiriesBySearch(e.target.value);
      });
    }

    // Inquiry Response Modal Events
    const inqModalClose = document.getElementById('admin-inquiry-modal-close');
    const inqModalCancel = document.getElementById('admin-inquiry-modal-cancel');
    const inqModal = document.getElementById('admin-inquiry-response-modal');
    if (inqModalClose) inqModalClose.addEventListener('click', () => this.closeInquiryResponseModal());
    if (inqModalCancel) inqModalCancel.addEventListener('click', () => this.closeInquiryResponseModal());
    if (inqModal) {
      inqModal.addEventListener('click', (e) => {
        if (e.target === inqModal) this.closeInquiryResponseModal();
      });
    }

    const inqForm = document.getElementById('admin-inquiry-response-form');
    if (inqForm) {
      inqForm.addEventListener('submit', (e) => this.handleInquiryResponseSubmit(e));
    }

    // Close Review Modal
    const reviewCloseBtn = document.getElementById('admin-review-modal-close');
    if (reviewCloseBtn) {
      reviewCloseBtn.addEventListener('click', () => this.closeReviewModal());
    }

    const reviewOverlay = document.getElementById('admin-review-modal');
    if (reviewOverlay) {
      reviewOverlay.addEventListener('click', (e) => {
        if (e.target === reviewOverlay) this.closeReviewModal();
      });
    }

    // Modal Action Buttons
    const approveBtn = document.getElementById('admin-action-approve-btn');
    if (approveBtn) {
      approveBtn.addEventListener('click', () => this.handleReviewDecision(approveBtn.dataset.action || 'approved'));
    }

    const rejectBtn = document.getElementById('admin-action-reject-btn');
    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => this.handleReviewDecision('rejected'));
    }

    // Create User Modal Events
    const createUserClose = document.getElementById('admin-create-user-modal-close');
    const createUserCancel = document.getElementById('admin-create-user-modal-cancel');
    const createUserModal = document.getElementById('admin-create-user-modal');
    if (createUserClose) createUserClose.addEventListener('click', () => this.closeCreateUserModal());
    if (createUserCancel) createUserCancel.addEventListener('click', () => this.closeCreateUserModal());
    if (createUserModal) {
      createUserModal.addEventListener('click', (e) => {
        if (e.target === createUserModal) this.closeCreateUserModal();
      });
    }

    // Role select change in Create User Modal
    const roleSelect = document.getElementById('admin-new-user-role');
    if (roleSelect) {
      roleSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        const studentFields = document.getElementById('admin-new-user-student-fields');
        const teacherFields = document.getElementById('admin-new-user-teacher-fields');
        if (studentFields) studentFields.style.display = val === 'student' ? 'block' : 'none';
        if (teacherFields) teacherFields.style.display = (val === 'teacher' || val === 'tutor') ? 'block' : 'none';
      });
    }

    // Create User Form Submit
    const createUserForm = document.getElementById('admin-create-user-form');
    if (createUserForm) {
      createUserForm.addEventListener('submit', (e) => this.handleCreateUserSubmit(e));
    }
  },

  switchSection(section) {
    this.currentSection = section;

    // Update Sidebar Active Class
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.section === section);
    });

    // Hide all admin views
    document.querySelectorAll('.admin-view-panel').forEach(panel => {
      panel.style.display = 'none';
    });

    const activePanel = document.getElementById(`admin-panel-${section}`);
    if (activePanel) {
      activePanel.style.display = 'block';
    }

    // Load section specific data
    if (section === 'overview') {
      this.loadDashboardMetrics();
    } else if (section === 'users') {
      this.loadUsers(this.currentRoleFilter || 'all');
    } else if (section === 'applications') {
      this.loadApplications('pending');
    } else if (section === 'tutors') {
      this.loadTutors();
    } else if (section === 'students') {
      this.loadStudents();
    } else if (section === 'requests') {
      this.loadRequests();
    } else if (section === 'inquiries') {
      this.loadInquiries(this.currentInquiryFilter || 'all');
    }
  },

  async loadDashboardMetrics() {
    const user = Auth.currentUser;
    if (!user || user.role !== 'admin') return;

    try {
      const data = await API.getAdminDashboard();
      const m = data.metrics || {};

      // Fill Metric Cards with 100% accurate connected DB figures
      const totalUsersEl = document.getElementById('m-total-users');
      if (totalUsersEl) totalUsersEl.textContent = m.totalUsers || 0;

      const studentsEl = document.getElementById('m-students');
      if (studentsEl) studentsEl.textContent = m.totalStudents || 0;

      const teachersEl = document.getElementById('m-teachers');
      if (teachersEl) teachersEl.textContent = m.totalTeachers || 0;

      const adminsEl = document.getElementById('m-admins');
      if (adminsEl) adminsEl.textContent = m.totalAdmins || 0;

      const approvedTutorsEl = document.getElementById('m-approved-tutors');
      if (approvedTutorsEl) approvedTutorsEl.textContent = m.approvedTutors || 0;

      const pendingAppsEl = document.getElementById('m-pending-apps');
      if (pendingAppsEl) pendingAppsEl.textContent = m.pendingApps || 0;

      const requestsEl = document.getElementById('m-requests');
      if (requestsEl) requestsEl.textContent = m.totalRequests || 0;

      const volumeEl = document.getElementById('m-volume');
      if (volumeEl) volumeEl.textContent = `$${m.platformVolume?.toFixed(2) || '0.00'}`;

      const pendingInquiriesEl = document.getElementById('m-pending-inquiries');
      if (pendingInquiriesEl) pendingInquiriesEl.textContent = m.pendingInquiries || 0;

      const inqBadge = document.getElementById('admin-inquiries-badge');
      if (inqBadge) {
        if (m.pendingInquiries > 0) {
          inqBadge.textContent = m.pendingInquiries;
          inqBadge.style.display = 'inline-block';
        } else {
          inqBadge.style.display = 'none';
        }
      }

      // Update User Badge in sidebar
      const usersBadge = document.getElementById('admin-users-badge');
      if (usersBadge) {
        usersBadge.textContent = m.totalUsers || 0;
        usersBadge.style.display = 'inline-block';
      }

      // Update Pending Badge in sidebar
      const pendingBadge = document.getElementById('admin-pending-badge');
      if (pendingBadge) {
        if (m.pendingApps > 0) {
          pendingBadge.style.display = 'inline-block';
          pendingBadge.textContent = m.pendingApps;
        } else {
          pendingBadge.style.display = 'none';
        }
      }

      this.renderCharts(data.charts || {});
      this.renderRecentActivity(data.recentActivity || []);
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    }
  },

  renderCharts(charts) {
    const subjectsContainer = document.getElementById('chart-subjects-container');
    const appsContainer = document.getElementById('chart-apps-container');

    // 1. Subjects Chart (Horizontal CSS Bar Chart)
    if (subjectsContainer) {
      const subjects = charts.subjects || [];
      if (subjects.length === 0) {
        subjectsContainer.innerHTML = '<p class="empty-desc">No session request data yet.</p>';
      } else {
        const maxCount = Math.max(...subjects.map(s => s.count), 1);
        subjectsContainer.innerHTML = subjects.map(s => {
          const pct = Math.round((s.count / maxCount) * 100);
          return `
            <div style="margin-bottom: 0.85rem;">
              <div style="display: flex; justify-content: space-between; font-size: 0.825rem; margin-bottom: 0.25rem;">
                <span style="color: var(--charcoal-900); font-weight: 600;">${s.subject}</span>
                <span style="color: var(--gold-800); font-weight: 700;">${s.count} requests</span>
              </div>
              <div style="height: 8px; background: rgba(0,0,0,0.06); border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${pct}%; background: var(--gradient-gold); border-radius: 4px;"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 2. Applications Status Breakdown (Donut/Pill Cards)
    if (appsContainer) {
      const apps = charts.applications || [];
      appsContainer.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; text-align: center;">
          ${['pending', 'approved', 'rejected'].map(st => {
            const item = apps.find(a => a.status === st);
            const count = item ? item.count : 0;
            const colors = {
              pending: '#F59E0B',
              approved: '#10B981',
              rejected: '#EF4444'
            };
            return `
              <div style="background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.08); border-radius: var(--radius-md); padding: 1.25rem 0.75rem;">
                <div style="font-size: 1.75rem; font-weight: 800; color: ${colors[st]}; font-family: var(--font-heading);">${count}</div>
                <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--charcoal-500); margin-top: 0.25rem; font-weight: 600;">${st}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
  },

  renderRecentActivity(activity) {
    const container = document.getElementById('admin-recent-activity-list');
    if (!container) return;

    if (activity.length === 0) {
      container.innerHTML = '<p class="empty-desc">No platform activity recorded yet.</p>';
      return;
    }

    container.innerHTML = activity.map(a => {
      let icon = Icons.graduationCap(18);
      let desc = '';
      if (a.type === 'registration') {
        icon = Icons.user(18);
        desc = `Registered new user account (${a.info})`;
      } else if (a.type === 'application') {
        icon = Icons.fileText(18);
        desc = `Teacher Application submitted: ${a.info || 'Educator'}`;
      } else if (a.type === 'inquiry') {
        icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
        desc = `New user inquiry (${a.info})`;
      } else {
        icon = Icons.calendar(18);
        desc = `Tutoring Session booked for ${a.info}`;
      }
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 0; border-bottom: 1px solid rgba(0,0,0,0.06); font-size: 0.875rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="color: var(--gold-600); display: flex; align-items: center;">${icon}</span>
            <div>
              <strong style="color: var(--charcoal-900);">${a.user_name}</strong>
              <span style="color: var(--text-secondary);"> — ${desc}</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span class="status-pill ${a.status}">${a.status}</span>
            <span style="font-size: 0.75rem; color: var(--text-secondary);">${new Date(a.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  /* ========================================================
     ALL USER ACCOUNTS (STUDENTS, TEACHERS, ADMINS)
     ======================================================== */
  async loadUsers(role = 'all') {
    try {
      this.currentRoleFilter = role;
      const data = await API.getAdminUsers(role);
      this.users = data.users || [];

      // Update counters in role filter buttons
      const allData = role === 'all' ? this.users : (await API.getAdminUsers('all')).users || [];
      const countAll = allData.length;
      const countStudent = allData.filter(u => u.role === 'student').length;
      const countTeacher = allData.filter(u => u.role === 'teacher' || u.role === 'tutor').length;
      const countAdmin = allData.filter(u => u.role === 'admin').length;

      const cAll = document.getElementById('count-all-users');
      const cStu = document.getElementById('count-student-users');
      const cTea = document.getElementById('count-teacher-users');
      const cAdm = document.getElementById('count-admin-users');

      if (cAll) cAll.textContent = countAll;
      if (cStu) cStu.textContent = countStudent;
      if (cTea) cTea.textContent = countTeacher;
      if (cAdm) cAdm.textContent = countAdmin;

      this.renderUsersTable(this.users);
    } catch (err) {
      console.error('Failed to load admin users:', err);
      showToast('Failed to load user accounts: ' + err.message, 'error');
    }
  },

  filterUsersBySearch(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      this.renderUsersTable(this.users);
      return;
    }
    const filtered = this.users.filter(u => 
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.school && u.school.toLowerCase().includes(q)) ||
      (u.institution && u.institution.toLowerCase().includes(q)) ||
      (u.teacher_headline && u.teacher_headline.toLowerCase().includes(q))
    );
    this.renderUsersTable(filtered);
  },

  renderUsersTable(userList) {
    const tbody = document.getElementById('admin-users-table-body');
    if (!tbody) return;

    if (!userList || userList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 3rem;">
            <div class="empty-state">
              <div class="empty-icon" style="color: var(--gold-600);">${Icons.users(36)}</div>
              <h4 class="empty-title">No User Accounts Found</h4>
              <p class="empty-desc">No accounts found matching the selected filter criteria.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = userList.map(u => {
      let roleIcon = Icons.graduationCap(14);
      let roleClass = 'student';
      let roleLabel = 'Student';
      let detailsHtml = '';

      if (u.role === 'teacher' || u.role === 'tutor') {
        roleIcon = Icons.user(14);
        roleClass = 'teacher';
        roleLabel = 'Teacher / Tutor';
        detailsHtml = `
          <div style="font-weight: 600; color: var(--charcoal-900); font-size: 0.85rem;">${u.highest_degree || u.teacher_headline || 'Educator Specialist'}</div>
          <div style="font-size: 0.775rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.25rem;">${u.institution || 'Aviora Faculty'} • ${u.application_status === 'approved' ? Icons.check(12) + ' Verified' : (u.application_status || 'Pending')}</div>
        `;
      } else if (u.role === 'admin') {
        roleIcon = Icons.shield(14);
        roleClass = 'admin';
        roleLabel = 'Administrator';
        detailsHtml = `
          <div style="font-weight: 600; color: #DC2626; font-size: 0.85rem;">System Super-Administrator</div>
          <div style="font-size: 0.775rem; color: var(--text-secondary);">Full Platform &amp; Database Authority</div>
        `;
      } else {
        detailsHtml = `
          <div style="font-weight: 600; color: var(--charcoal-900); font-size: 0.85rem;">${u.grade_level || 'Grade 11 - High School'}</div>
          <div style="font-size: 0.775rem; color: var(--text-secondary);">${u.school || 'High School'} • ${u.student_requests || 0} sessions</div>
        `;
      }

      const dateStr = u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }) : 'Active';

      const isProtectedAdmin = u.role === 'admin';

      return `
        <tr>
          <td>
            <div class="user-cell">
              <img src="${u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" class="user-cell-avatar" />
              <div>
                <div class="user-cell-name">${u.name}</div>
                <div class="user-cell-email">${u.email}</div>
                ${u.phone ? `<div style="font-size: 0.725rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.25rem;">${Icons.phone(12)} ${u.phone}</div>` : ''}
              </div>
            </div>
          </td>
          <td>
            <span class="role-badge ${roleClass}" style="display: inline-flex; align-items: center; gap: 0.35rem;">${roleIcon} ${roleLabel}</span>
          </td>
          <td>
            ${detailsHtml}
          </td>
          <td>
            <div style="font-size: 0.84rem; color: var(--charcoal-900); font-weight: 500;">${dateStr}</div>
            <div style="font-size: 0.725rem; color: var(--text-secondary);">ID: #${u.id}</div>
          </td>
          <td>
            <span class="status-pill ${u.status}">${u.status}</span>
          </td>
          <td style="text-align: right;">
            ${isProtectedAdmin ? `
              <span style="font-size: 0.8rem; color: var(--text-secondary); font-style: italic;">Protected</span>
            ` : `
              <button class="btn ${u.status === 'active' ? 'btn-secondary' : 'btn-outline-gold'} btn-sm" onclick="Admin.toggleUserStatus(${u.id}, '${u.status === 'active' ? 'suspended' : 'active'}', true)">
                ${u.status === 'active' ? 'Suspend' : 'Activate'}
              </button>
            `}
          </td>
        </tr>
      `;
    }).join('');
  },

  openCreateUserModal() {
    const modal = document.getElementById('admin-create-user-modal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeCreateUserModal() {
    const modal = document.getElementById('admin-create-user-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      document.getElementById('admin-create-user-form')?.reset();
    }
  },

  async handleCreateUserSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('admin-new-user-name')?.value.trim();
    const email = document.getElementById('admin-new-user-email')?.value.trim();
    const password = document.getElementById('admin-new-user-password')?.value;
    const role = document.getElementById('admin-new-user-role')?.value;
    const phone = document.getElementById('admin-new-user-phone')?.value.trim();

    if (!name || !email || !password || !role) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    const payload = { name, email, password, role, phone };

    if (role === 'student') {
      payload.grade_level = document.getElementById('admin-new-user-grade')?.value.trim();
      payload.school = document.getElementById('admin-new-user-school')?.value.trim();
      payload.subjects = document.getElementById('admin-new-user-student-subjects')?.value.trim();
    } else if (role === 'teacher' || role === 'tutor') {
      payload.headline = document.getElementById('admin-new-user-headline')?.value.trim();
      payload.hourly_rate = parseFloat(document.getElementById('admin-new-user-rate')?.value) || 50;
      payload.highest_degree = document.getElementById('admin-new-user-degree')?.value.trim();
      payload.institution = document.getElementById('admin-new-user-institution')?.value.trim();
      payload.subjects = document.getElementById('admin-new-user-teacher-subjects')?.value.trim();
    }

    const submitBtn = document.getElementById('admin-create-user-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving to Database...';
    }

    try {
      const res = await API.createAdminUser(payload);
      showToast(res.message || 'Account successfully created and saved to database.', 'success');
      this.closeCreateUserModal();
      await this.loadUsers(this.currentRoleFilter || 'all');
      await this.loadDashboardMetrics();
      if (role === 'teacher' || role === 'tutor') await Tutors.fetchTutors();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save & Create Account';
      }
    }
  },

  /* ========================================================
     TEACHER APPLICATIONS
     ======================================================== */
  async loadApplications(status = 'all') {
    try {
      const data = await API.getAdminApplications(status);
      this.applications = data.applications || [];
      this.renderApplicationsTable();
    } catch (err) {
      console.error('Failed to load applications:', err);
    }
  },

  // Derive the application review stage: under_review -> interview -> approved (or rejected)
  getAppStage(app) {
    if (!app) return 'under_review';
    if (app.status === 'approved') return 'approved';
    if (app.status === 'rejected') return 'rejected';
    if (app.interview_status === 'scheduled') return 'interview';
    return 'under_review';
  },

  getAppStageLabel(stage) {
    return {
      under_review: 'Under Review',
      interview: 'Interview Scheduled',
      approved: 'Approved',
      rejected: 'Rejected'
    }[stage] || stage;
  },

  formatInterviewDate(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(String(value || ''));
    if (!m) return value || '';
    const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    return d.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  },

  renderApplicationsTable() {
    const tbody = document.getElementById('admin-apps-table-body');
    if (!tbody) return;

    if (this.applications.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 3rem;">
            <div class="empty-state">
              <div class="empty-icon">${Icons.checkCircle(36)}</div>
              <h4 class="empty-title">No Teacher Applications Found</h4>
              <p class="empty-desc">All applications in this category have been processed.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.applications.map(app => `
      <tr>
        <td>
          <div class="user-cell">
            <img src="${app.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}" class="user-cell-avatar" />
            <div>
              <div class="user-cell-name">${app.name}</div>
              <div class="user-cell-email">${app.email}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight: 600; color: var(--charcoal-900);">${app.highest_degree || 'Degree'}</div>
          <div style="font-size: 0.775rem; color: var(--gold-800);">${app.institution || 'University'} (${app.years_experience} yrs exp)</div>
        </td>
        <td>
          <div style="font-size: 0.8rem; color: var(--charcoal-700); max-width: 180px;">
            ${(app.subjects || []).slice(0, 2).join(', ')} ${(app.subjects || []).length > 2 ? `+${app.subjects.length - 2}` : ''}
          </div>
        </td>
        <td>
          <span style="font-weight: 700; color: var(--charcoal-900);">$${app.hourly_rate}/hr</span>
        </td>
        <td>
          <span class="status-pill ${this.getAppStage(app) === 'interview' ? 'accepted' : app.status}">${this.getAppStageLabel(this.getAppStage(app))}</span>
          ${this.getAppStage(app) === 'interview' && app.interview_scheduled_at ? `<div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.25rem;">${this.formatInterviewDate(app.interview_scheduled_at)}</div>` : ''}
        </td>
        <td>
          <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
            <button class="btn btn-secondary btn-sm" onclick="Admin.inspectApplication(${app.id})">${this.getAppStage(app) === 'interview' ? 'Review Notes' : 'Review &amp; Verify'}</button>
            ${this.getAppStage(app) === 'under_review' ? `
              <button class="btn btn-primary btn-sm" onclick="Admin.inspectApplication(${app.id})">Approve (Schedule Interview)</button>
            ` : this.getAppStage(app) === 'interview' ? `
              <button class="btn btn-primary btn-sm" onclick="Admin.quickApprove(${app.id})">Mark Approved</button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  },

  inspectApplication(appId) {
    const app = this.applications.find(a => a.id == appId);
    if (!app) return;

    this.selectedApp = app;

    const modal = document.getElementById('admin-review-modal');
    const content = document.getElementById('admin-review-details');
    const notesInput = document.getElementById('admin-review-notes');

    if (notesInput) notesInput.value = app.admin_notes || '';

    if (content) {
      content.innerHTML = `
        <div style="display: flex; gap: 1.25rem; align-items: center; margin-bottom: 1.5rem;">
          <img src="${app.avatar_url}" style="width: 70px; height: 70px; border-radius: var(--radius-md); object-fit: cover; border: 2px solid var(--gold-500);" />
          <div>
            <h3 style="color: var(--charcoal-900); font-size: 1.3rem;">${app.name}</h3>
            <p style="color: var(--text-secondary); font-size: 0.875rem;">${app.email} • ${app.phone || 'No phone provided'}</p>
            <span class="status-pill ${this.getAppStage(app) === 'interview' ? 'accepted' : app.status}" style="margin-top: 0.4rem;">${this.getAppStageLabel(this.getAppStage(app))}</span>
          </div>
        </div>

        <div style="background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.08); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem;">
          <h4 style="color: var(--charcoal-900); margin-bottom: 0.5rem; font-size: 0.95rem;">Academic Qualifications</h4>
          <p style="font-size: 0.875rem; color: var(--charcoal-700); margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem;">
            ${Icons.graduationCap(15)} <strong>Degree:</strong> ${app.highest_degree} (${app.graduation_year || 'N/A'})
          </p>
          <p style="font-size: 0.875rem; color: var(--charcoal-700); margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem;">
            ${Icons.landmark(15)} <strong>Institution:</strong> ${app.institution}
          </p>
          <p style="font-size: 0.875rem; color: var(--charcoal-700); display: flex; align-items: center; gap: 0.4rem;">
            ${Icons.clock(15)} <strong>Experience:</strong> ${app.years_experience} years • <strong>Target Rate:</strong> $${app.hourly_rate}/hr
          </p>
        </div>

        <div style="margin-bottom: 1.25rem;">
          <h4 style="color: var(--charcoal-900); margin-bottom: 0.35rem; font-size: 0.95rem;">Subjects &amp; Grade Levels</h4>
          <p style="color: var(--gold-800); font-size: 0.85rem; font-weight: 600; margin-bottom: 0.25rem;">${(app.subjects || []).join(', ')}</p>
          <p style="color: var(--text-secondary); font-size: 0.8rem;">Grade Levels: ${(app.grade_levels || []).join(', ')}</p>
        </div>

        <div style="margin-bottom: 1.25rem;">
          <h4 style="color: var(--charcoal-900); margin-bottom: 0.35rem; font-size: 0.95rem;">Applicant Bio</h4>
          <p style="color: var(--charcoal-700); font-size: 0.875rem; line-height: 1.5;">${app.bio || 'None provided.'}</p>
        </div>

        <div style="margin-bottom: 1.25rem;">
          <h4 style="color: var(--charcoal-900); margin-bottom: 0.5rem; font-size: 0.95rem;">Uploaded Verification Documents (Resume & Diploma)</h4>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <!-- Resume Document -->
            ${(app.resume_file || app.resume_filename) ? `
              <div style="display: flex; align-items: center; gap: 0.75rem; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.3); padding: 0.75rem 1rem; border-radius: var(--radius-md);">
                <span style="display: inline-flex; align-items: center; justify-content: center; color: #3B82F6;">${Icons.fileText(22)}</span>
                <div style="flex: 1;">
                  <div style="font-size: 0.85rem; font-weight: 600; color: #1D4ED8;">${app.resume_filename || 'Applicant_Resume_CV.pdf'}</div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary);">Applicant Resume / Curriculum Vitae</div>
                </div>
                <a href="${app.resume_file || '#'}" target="_blank" class="btn btn-outline-gold btn-sm">Inspect Resume</a>
              </div>
            ` : `
              <div style="font-size: 0.82rem; color: var(--text-muted); font-style: italic;">No separate resume uploaded (legacy application).</div>
            `}

            <!-- Diploma Document -->
            ${(app.diploma_file || app.credentials_file) ? `
              <div style="display: flex; align-items: center; gap: 0.75rem; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); padding: 0.75rem 1rem; border-radius: var(--radius-md);">
                <span style="display: inline-flex; align-items: center; justify-content: center; color: #10B981;">${Icons.award(22)}</span>
                <div style="flex: 1;">
                  <div style="font-size: 0.85rem; font-weight: 600; color: #10B981;">${app.diploma_filename || app.credentials_filename || 'Degree_Diploma.pdf'}</div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary);">Official degree diploma / university credential</div>
                </div>
                <a href="${app.diploma_file || app.credentials_file}" target="_blank" class="btn btn-outline-gold btn-sm">Inspect Diploma</a>
              </div>
            ` : `
              <p style="color: var(--text-secondary); font-size: 0.85rem;">Standard verified document cleared via institutional portal.</p>
            `}
          </div>
        </div>

        ${this.getAppStage(app) === 'under_review' ? `
          <div style="background: rgba(198, 138, 40, 0.06); border: 1px solid rgba(198, 138, 40, 0.35); border-radius: var(--radius-md); padding: 1rem 1.25rem; margin-bottom: 0.5rem;">
            <h4 style="color: var(--charcoal-900); margin-bottom: 0.35rem; font-size: 0.95rem;">Step 2: Approve Application &amp; Schedule Virtual Interview</h4>
            <p style="color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 0.65rem;">
              Approving the application documents moves the applicant to the interview step. Set the interview date and time below. This will be sent directly to the applicant's notification bell. Live operations remain locked during the interview phase.
            </p>
            <label class="form-label" for="admin-interview-datetime">Interview Date &amp; Time *</label>
            <input type="datetime-local" id="admin-interview-datetime" class="form-control" />
          </div>
        ` : this.getAppStage(app) === 'interview' ? `
          <div style="background: rgba(16, 185, 129, 0.06); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: var(--radius-md); padding: 1rem 1.25rem; margin-bottom: 0.5rem;">
            <h4 style="color: var(--charcoal-900); margin-bottom: 0.35rem; font-size: 0.95rem;">Step 3: Mark Application as "Approved"</h4>
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.5rem;">
              Virtual interview scheduled for <strong>${this.formatInterviewDate(app.interview_scheduled_at)}</strong>.
            </p>
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0;">
              Once marked as <strong>Approved</strong>, all features become accessible to the tutor, allowing them to begin operations, accept student bookings, and conduct classes.
            </p>
          </div>
        ` : ''}
      `;
    }

    const approveBtn = document.getElementById('admin-action-approve-btn');
    if (approveBtn) {
      const stage = this.getAppStage(app);
      if (stage === 'under_review' || stage === 'rejected') {
        approveBtn.dataset.action = 'interview';
        approveBtn.textContent = 'Approve Application & Schedule Interview';
        approveBtn.style.display = '';
      } else if (stage === 'interview') {
        approveBtn.dataset.action = 'approved';
        approveBtn.textContent = 'Mark Application as "Approved"';
        approveBtn.style.display = '';
      } else {
        approveBtn.dataset.action = 'approved';
        approveBtn.style.display = 'none';
      }
    }

    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeReviewModal() {
    const modal = document.getElementById('admin-review-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  async quickApprove(appId) {
    showConfirm(
      'Mark Application as Approved',
      'Mark this application as approved? All features will become accessible to the tutor, allowing them to begin operations, accept student bookings, and conduct classes.',
      async () => {
        try {
          const res = await API.reviewApplication(appId, {
            status: 'approved',
            admin_notes: 'Virtual interview completed. Approved by Aviora Academic Director.'
          });
          showToast(res.message, 'success');
          await this.loadApplications(this.currentAppFilter || 'all');
          await this.loadDashboardMetrics();
          await Tutors.fetchTutors(); // Refresh public directory
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    );
  },

  async handleReviewDecision(status) {
    if (!this.selectedApp) return;

    const notes = document.getElementById('admin-review-notes')?.value.trim();
    const payload = {
      status,
      admin_notes: notes || (status === 'approved' ? 'Approved by Academic Director.' : status === 'interview' ? '' : 'Credentials could not be verified.')
    };

    if (status === 'interview') {
      const when = document.getElementById('admin-interview-datetime')?.value;
      if (!when) {
        showToast('Please set the interview date and time before scheduling.', 'warning');
        return;
      }
      payload.interview_scheduled_at = when;
    }

    try {
      const res = await API.reviewApplication(this.selectedApp.id, payload);

      this.closeReviewModal();
      showToast(res.message, 'success');
      await this.loadApplications('all');
      await this.loadDashboardMetrics();
      await Tutors.fetchTutors();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  /* ========================================================
     FACULTY TUTORS
     ======================================================== */
  async loadTutors() {
    try {
      const data = await API.getAdminTutors();
      this.tutors = data.tutors || [];
      this.renderTutorsTable();
    } catch (err) {
      console.error('Failed to load admin tutors:', err);
    }
  },

  renderTutorsTable() {
    const tbody = document.getElementById('admin-tutors-table-body');
    if (!tbody) return;

    tbody.innerHTML = this.tutors.map(t => `
      <tr>
        <td>
          <div class="user-cell">
            <img src="${t.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}" class="user-cell-avatar" />
            <div>
              <div class="user-cell-name">${t.name}</div>
              <div class="user-cell-email">${t.email}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-size: 0.85rem; color: var(--gold-800); font-weight: 600;">${t.headline || 'Tutor Specialist'}</div>
          <div style="font-size: 0.775rem; color: var(--text-secondary);">${t.institution}</div>
        </td>
        <td>
          <div style="font-size: 0.85rem; color: #F59E0B; font-weight: 700; display: flex; align-items: center; gap: 0.25rem;">${Icons.star(13)} ${t.rating.toFixed(1)} (${t.reviews_count})</div>
          <div style="font-size: 0.775rem; color: var(--text-secondary);">${t.total_sessions} completed</div>
        </td>
        <td>
          <strong style="color: var(--charcoal-900);">$${t.hourly_rate}/hr</strong>
        </td>
        <td>
          <span class="status-pill ${t.is_active === 1 ? 'active' : 'inactive'}">
            ${t.is_active === 1 ? 'Public' : 'Hidden'}
          </span>
        </td>
        <td>
          <label class="switch" title="Toggle public directory visibility">
            <input type="checkbox" ${t.is_active === 1 ? 'checked' : ''} onchange="Admin.toggleTutorVisibility(${t.id})">
            <span class="slider"></span>
          </label>
        </td>
      </tr>
    `).join('');
  },

  async toggleTutorVisibility(profileId) {
    try {
      const res = await API.toggleTutorStatus(profileId);
      showToast(res.message, 'success');
      await this.loadTutors();
      await Tutors.fetchTutors();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  /* ========================================================
     STUDENT ACCOUNTS DIRECTORY
     ======================================================== */
  async loadStudents() {
    try {
      const data = await API.getAdminStudents();
      this.students = data.students || [];
      this.renderStudentsTable();
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  },

  renderStudentsTable() {
    const tbody = document.getElementById('admin-students-table-body');
    if (!tbody) return;

    tbody.innerHTML = this.students.map(s => `
      <tr>
        <td>
          <div class="user-cell">
            <img src="${s.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" class="user-cell-avatar" />
            <div>
              <div class="user-cell-name">${s.name}</div>
              <div class="user-cell-email">${s.email}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-size: 0.85rem; color: var(--charcoal-900); font-weight: 600;">${s.grade_level || 'Grade 11'}</div>
          <div style="font-size: 0.775rem; color: var(--text-secondary);">${s.school || 'High School'}</div>
        </td>
        <td>
          <div style="font-size: 0.85rem; color: var(--charcoal-900); font-weight: 600;">${s.request_count} sessions</div>
          <div style="font-size: 0.75rem; color: var(--gold-800);">${s.completed_count} completed</div>
        </td>
        <td>
          <span class="status-pill ${s.status}">${s.status}</span>
        </td>
        <td>
          <button class="btn ${s.status === 'active' ? 'btn-secondary' : 'btn-outline-gold'} btn-sm" onclick="Admin.toggleUserStatus(${s.id}, '${s.status === 'active' ? 'suspended' : 'active'}')">
            ${s.status === 'active' ? 'Suspend' : 'Activate'}
          </button>
        </td>
      </tr>
    `).join('');
  },

  async toggleUserStatus(userId, newStatus, reloadAllUsers = false) {
    showConfirm(
      'Update Account Status',
      `Are you sure you want to change this user status to ${newStatus}?`,
      async () => {
        try {
          const res = await API.updateUserStatus(userId, { status: newStatus });
          showToast(res.message, 'success');
          if (reloadAllUsers) {
            await this.loadUsers(this.currentRoleFilter || 'all');
          } else {
            await this.loadStudents();
          }
          await this.loadDashboardMetrics();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    );
  },

  /* ========================================================
     PLATFORM REQUESTS AUDIT
     ======================================================== */
  async loadRequests() {
    try {
      const data = await API.getAdminRequests();
      this.requests = data.requests || [];
      this.renderRequestsTable();
    } catch (err) {
      console.error('Failed to load platform requests:', err);
    }
  },

  renderRequestsTable() {
    const tbody = document.getElementById('admin-requests-table-body');
    if (!tbody) return;

    tbody.innerHTML = this.requests.map(r => `
      <tr>
        <td>
          <strong style="color: var(--charcoal-900);">${r.student_name}</strong>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">${r.student_email}</div>
        </td>
        <td>
          <strong style="color: var(--gold-800);">${r.tutor_name}</strong>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">${r.tutor_email}</div>
        </td>
        <td>
          <strong style="color: var(--charcoal-900);">${r.subject}</strong>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.35rem;">${Icons.calendar(13)} ${r.requested_date}</div>
          <div style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">${Icons.clock(13)} ${r.requested_time} (${r.duration_hours}h)</div>
        </td>
        <td>
          <span style="font-weight: 700; color: var(--charcoal-900);">$${r.total_amount.toFixed(2)}</span>
        </td>
        <td>
          <span class="status-pill ${r.status}">${r.status}</span>
        </td>
      </tr>
    `).join('');
  },

  /* ========================================================
     INQUIRIES (SUBMITTED VIA "SEND INQUIRY" - SOLELY FOR ADMIN)
     ======================================================== */
  async loadInquiries(status = 'all') {
    try {
      this.currentInquiryFilter = status;
      const data = await API.getAdminInquiries(status);
      this.inquiries = data.inquiries || [];

      // Update counters in filter bar
      const counts = data.counts || {};
      const cAll = document.getElementById('count-all-inquiries');
      const cPending = document.getElementById('count-pending-inquiries');
      const cResponded = document.getElementById('count-responded-inquiries');
      if (cAll) cAll.textContent = counts.all || 0;
      if (cPending) cPending.textContent = counts.pending || 0;
      if (cResponded) cResponded.textContent = counts.responded || 0;

      // Update badge in sidebar
      const badge = document.getElementById('admin-inquiries-badge');
      if (badge) {
        if (counts.pending > 0) {
          badge.textContent = counts.pending;
          badge.style.display = 'inline-block';
        } else {
          badge.style.display = 'none';
        }
      }

      this.renderInquiries(this.inquiries);
    } catch (err) {
      console.error('Failed to load inquiries:', err);
      showToast('Could not load inquiries: ' + err.message, 'error');
    }
  },

  renderInquiries(inquiries) {
    const container = document.getElementById('admin-inquiries-list');
    if (!container) return;

    if (!inquiries || inquiries.length === 0) {
      container.innerHTML = `
        <div style="background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.15); border-radius: 12px; padding: 3rem 1.5rem; text-align: center;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(198,138,40,0.12); color: var(--gold-400); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <h3 style="color: var(--white); font-size: 1.15rem; margin-bottom: 0.35rem;">No Inquiries Found</h3>
          <p style="color: var(--charcoal-400); font-size: 0.88rem; max-width: 450px; margin: 0 auto;">No student or guest inquiries match the current filter. Inquiries submitted via "Send Inquiry" are automatically routed here for personal admin response.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = inquiries.map(inq => {
      const isPending = inq.status === 'pending';
      const statusBadge = isPending
        ? `<span class="badge-gold" style="background: rgba(245, 158, 11, 0.15); color: #F59E0B; border-color: rgba(245, 158, 11, 0.3); font-size: 0.75rem;">● Pending Response</span>`
        : `<span class="badge-gold" style="background: rgba(16, 185, 129, 0.15); color: #10B981; border-color: rgba(16, 185, 129, 0.3); font-size: 0.75rem;">✓ Responded</span>`;

      const roleColors = {
        'Student': 'rgba(198, 138, 40, 0.15)',
        'Parent / Guardian': 'rgba(59, 130, 246, 0.15)',
        'Prospective Tutor': 'rgba(168, 85, 247, 0.15)',
        'Institutional Partner': 'rgba(236, 72, 153, 0.15)'
      };

      const dateStr = new Date(inq.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

      return `
        <div class="inquiry-card" style="background: #FFFFFF; border: 1.5px solid ${isPending ? 'rgba(245, 158, 11, 0.35)' : 'rgba(0, 0, 0, 0.08)'}; border-radius: 14px; padding: 1.5rem; box-shadow: var(--shadow-sm); color: var(--charcoal-900);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.25rem;">
                <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--charcoal-950); margin: 0;">${inq.name}</h3>
                <span class="badge-gold" style="font-size: 0.72rem; background: ${roleColors[inq.role] || 'rgba(0,0,0,0.06)'}; color: var(--charcoal-800);">${inq.role || 'Student'}</span>
                ${statusBadge}
              </div>
              <div style="font-size: 0.85rem; color: var(--charcoal-600); display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap;">
                <span><strong>Email:</strong> <a href="mailto:${inq.email}" style="color: var(--gold-700); text-decoration: underline;">${inq.email}</a></span>
                <span>•</span>
                <span><strong>Received:</strong> ${dateStr}</span>
                <span>•</span>
                <span><strong>ID:</strong> #${inq.id}</span>
              </div>
            </div>

            <div>
              <button type="button" class="btn ${isPending ? 'btn-primary' : 'btn-outline-gold'} btn-sm" onclick="Admin.openInquiryResponseModal(${inq.id})">
                <span>${isPending ? 'Personally Respond →' : 'View / Edit Response'}</span>
              </button>
            </div>
          </div>

          <!-- Subject -->
          <div style="background: #FAF7F2; border-left: 3px solid var(--gold-500); padding: 0.6rem 0.85rem; margin-bottom: 0.85rem; border-radius: 0 6px 6px 0;">
            <span style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--gold-800); font-weight: 700;">Subject of Interest:</span>
            <div style="font-weight: 700; color: var(--charcoal-950); font-size: 0.95rem;">${inq.subject || 'General Inquiry'}</div>
          </div>

          <!-- Question message -->
          <div style="background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.06); border-radius: 8px; padding: 1rem; margin-bottom: ${inq.admin_response ? '1rem' : '0'};">
            <div style="font-size: 0.75rem; color: var(--charcoal-500); font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Question / Inquiry Message:</div>
            <p style="font-size: 0.92rem; color: var(--charcoal-900); line-height: 1.6; margin: 0; white-space: pre-wrap;">${inq.message}</p>
          </div>

          <!-- Admin Response Box if already responded -->
          ${inq.admin_response ? `
            <div style="background: rgba(16, 185, 129, 0.06); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 8px; padding: 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <div style="font-size: 0.78rem; color: #059669; font-weight: 700; text-transform: uppercase; display: flex; align-items: center; gap: 0.35rem;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Admin Personal Response (${inq.responder_name || 'Administrator'}):
                </div>
                <div style="font-size: 0.72rem; color: var(--charcoal-500);">${inq.responded_at ? new Date(inq.responded_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}</div>
              </div>
              <p style="font-size: 0.9rem; color: var(--charcoal-900); line-height: 1.6; margin: 0; white-space: pre-wrap;">${inq.admin_response}</p>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  },

  filterInquiriesBySearch(term) {
    if (!term || !term.trim()) {
      this.renderInquiries(this.inquiries);
      return;
    }
    const q = term.toLowerCase().trim();
    const filtered = this.inquiries.filter(i => 
      (i.name && i.name.toLowerCase().includes(q)) ||
      (i.email && i.email.toLowerCase().includes(q)) ||
      (i.subject && i.subject.toLowerCase().includes(q)) ||
      (i.message && i.message.toLowerCase().includes(q))
    );
    this.renderInquiries(filtered);
  },

  openInquiryResponseModal(inquiryId) {
    const inq = this.inquiries.find(i => i.id === inquiryId);
    if (!inq) return;

    this.selectedInquiry = inq;
    const modal = document.getElementById('admin-inquiry-response-modal');
    if (!modal) return;

    document.getElementById('inq-modal-sender-name').textContent = inq.name;
    document.getElementById('inq-modal-sender-email').textContent = inq.email;
    document.getElementById('inq-modal-sender-role').textContent = inq.role || 'Student';
    document.getElementById('inq-modal-subject').textContent = inq.subject || 'General Inquiry';
    document.getElementById('inq-modal-message').textContent = inq.message;

    const existingBox = document.getElementById('inq-modal-existing-response-box');
    const existingText = document.getElementById('inq-modal-existing-response-text');
    const existingMeta = document.getElementById('inq-modal-existing-response-meta');
    const replyTextarea = document.getElementById('inq-admin-reply-text');

    if (inq.admin_response) {
      existingBox.style.display = 'block';
      existingText.textContent = inq.admin_response;
      existingMeta.textContent = `Sent on ${new Date(inq.responded_at).toLocaleString()} by ${inq.responder_name || 'Administrator'}`;
      replyTextarea.value = inq.admin_response;
    } else {
      existingBox.style.display = 'none';
      replyTextarea.value = '';
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => replyTextarea.focus(), 100);
  },

  closeInquiryResponseModal() {
    const modal = document.getElementById('admin-inquiry-response-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      this.selectedInquiry = null;
    }
  },

  async handleInquiryResponseSubmit(e) {
    e.preventDefault();
    if (!this.selectedInquiry) return;

    const response = document.getElementById('inq-admin-reply-text')?.value.trim();
    if (!response) {
      showToast('Please type your personal response before submitting.', 'error');
      return;
    }

    const submitBtn = document.getElementById('admin-inquiry-modal-submit');
    const origHtml = submitBtn ? submitBtn.innerHTML : '<span>Send Personal Response</span><span>→</span>';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Saving & Delivering...</span>';
    }

    try {
      const res = await API.respondToInquiry(this.selectedInquiry.id, { response });
      showToast(res.message || 'Personal response sent successfully!', 'success');
      this.closeInquiryResponseModal();
      await this.loadInquiries(this.currentInquiryFilter || 'all');
      await this.loadDashboardMetrics();
    } catch (err) {
      showToast('Failed to save response: ' + err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origHtml;
      }
    }
  }
};
