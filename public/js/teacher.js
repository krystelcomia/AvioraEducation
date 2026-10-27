/**
 * AVIORA EDUCATION - TUTOR PROFILE, ACCOUNT & TEACHING WORKSPACE
 * Features:
 *  - Header & Tab Navigation: Dashboard, Class, Students, Schedule, Aviora Buddy, Profile & Rates
 *  - Financial Dashboard: Gross Student Revenue, Aviora 15% Commission Cut, Net Take-Home Earnings, Monthly Ledger
 *  - Virtual Classes: Room status, Launch Virtual Session (alerts student, opens WebRTC classroom)
 *  - Students Management: Respective subjects roster, Assign Coursework Tasks, Grade Submissions with Feedback
 *  - Schedule & Availability: Weekly timetable calendar with interactive Occupied / Available slot toggling
 *  - Aviora Buddy: Manage assigned 2-student study duos and collaborative cohort classes
 */

const Teacher = {
  application: null,
  tutorProfile: null,
  requests: [],
  classes: [],
  students: [],
  tasks: [],
  scheduleData: { appointments: [], occupiedSlots: [] },
  buddySessions: [],
  dashboardData: null,
  currentTab: 'dashboard',
  classFilter: 'all',
  taskFilter: 'all',

  async init() {
    this.setupEventListeners();
    const hash = window.location.hash || '#teacher-portal';
    await this.loadTeacherView(hash);
  },

  setupEventListeners() {
    // Teacher application form submission
    const appForm = document.getElementById('teacher-application-form');
    if (appForm) {
      appForm.addEventListener('submit', (e) => this.handleApplicationSubmit(e));
    }

    // Teacher file upload change
    const fileInput = document.getElementById('credential-file-input');
    const fileBadge = document.getElementById('selected-file-name');
    if (fileInput && fileBadge) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          fileBadge.style.display = 'inline-flex';
          fileBadge.innerHTML = `${Icons.paperclip(14)} ${e.target.files[0].name} (${(e.target.files[0].size / 1024 / 1024).toFixed(2)} MB)`;
        } else {
          fileBadge.style.display = 'none';
        }
      });
    }

    // Teacher profile settings form submit
    const profileForm = document.getElementById('teacher-profile-settings-form');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => this.handleProfileSettingsSubmit(e));
    }

    // Close modals on overlay click or Escape key
    ['modal-teacher-assign-task', 'modal-teacher-grade-task', 'modal-teacher-instant-class'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', (e) => {
          if (e.target === el) this.closeModal(id);
        });
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ['modal-teacher-assign-task', 'modal-teacher-grade-task', 'modal-teacher-instant-class'].forEach(id => {
          this.closeModal(id);
        });
      }
    });
  },

  // Modal open & close helpers
  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
      el.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
      el.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  // Tab switcher
  switchTab(tabId) {
    this.currentTab = tabId;

    // Hide all tab contents
    document.querySelectorAll('.teacher-tab-content').forEach(el => {
      el.style.display = 'none';
    });

    // Remove active class from all pills
    document.querySelectorAll('.teacher-nav-pill').forEach(el => {
      el.classList.remove('active');
    });

    // Show selected content and activate pill
    const targetContent = document.getElementById(`teacher-tab-${tabId}`);
    const targetPill = document.getElementById(`teacher-pill-${tabId}`);

    if (targetContent) targetContent.style.display = 'block';
    if (targetPill) targetPill.classList.add('active');

    // Trigger lazy loading of specific tab data
    if (tabId === 'dashboard') {
      this.loadTeacherDashboard();
    } else if (tabId === 'classes') {
      this.loadClasses();
    } else if (tabId === 'students') {
      this.loadStudents();
      this.loadTasks();
    } else if (tabId === 'schedule') {
      this.loadSchedule();
    } else if (tabId === 'buddy') {
      this.loadBuddySessions();
    }

    // Update active nav link in header
    if (typeof Router !== 'undefined' && Router.updateActiveNav) {
      Router.updateActiveNav();
    }
  },

  async loadTeacherView(hash = null) {
    const user = Auth.currentUser;
    if (!user || (user.role !== 'teacher' && user.role !== 'tutor')) return;

    try {
      const statusData = await API.getTeacherStatus();
      this.application = statusData.application;
      this.tutorProfile = statusData.tutorProfile;

      const appStatus = this.application ? this.application.status : 'pending';

      const bannerContainer = document.getElementById('teacher-status-banner-wrap');
      const appFormSection = document.getElementById('teacher-application-section');
      const portalDashboardSection = document.getElementById('teacher-dashboard-section');

      if (appStatus === 'approved') {
        if (bannerContainer) {
          bannerContainer.innerHTML = `
            <div class="app-status-banner approved" style="margin-bottom: 1.5rem;">
              <div class="status-icon-circle">${Icons.check(18)}</div>
              <div class="status-banner-content">
                <h3 style="color: var(--text-primary);">Approved Aviora Academic Tutor</h3>
                <p style="color: var(--text-secondary);">Your academic credentials have been verified by the Aviora Academic Board. Your profile is live in the public tutor directory and students can schedule sessions with you.</p>
                <div style="margin-top: 0.75rem; display: flex; gap: 0.75rem;">
                  <a href="#tutors" class="btn btn-secondary btn-sm">View in Directory</a>
                  <button class="btn btn-outline-gold btn-sm" onclick="Teacher.toggleEditApplication()">Update Credentials</button>
                </div>
              </div>
            </div>
          `;
        }

        if (appFormSection) appFormSection.style.display = 'none';
        if (portalDashboardSection) portalDashboardSection.style.display = 'block';

        // Update educator hero info
        const heroName = document.getElementById('teacher-hero-name');
        const heroBio = document.getElementById('teacher-hero-bio');
        const heroTag = document.getElementById('teacher-headline-tag');
        const heroAvatar = document.getElementById('teacher-hero-avatar');

        if (heroName) heroName.textContent = user.name || 'Dr. Elena Vance';
        if (heroBio && this.tutorProfile?.bio) heroBio.textContent = this.tutorProfile.bio;
        if (heroTag && this.tutorProfile?.headline) heroTag.textContent = this.tutorProfile.headline;
        if (heroAvatar && (user.avatar || this.tutorProfile?.avatar)) {
          heroAvatar.src = user.avatar || this.tutorProfile.avatar;
        }

        // Determine which tab to open based on current URL hash
        const currentHash = hash || window.location.hash || '#teacher-portal';
        if (currentHash === '#teacher-classes' || currentHash === '#teacher-class') {
          this.switchTab('classes');
        } else if (currentHash === '#teacher-students') {
          this.switchTab('students');
        } else if (currentHash === '#teacher-schedule') {
          this.switchTab('schedule');
        } else if (currentHash === '#teacher-buddy' || currentHash === '#aviora-buddy') {
          this.switchTab('buddy');
        } else {
          this.switchTab('dashboard');
        }
      } else if (appStatus === 'rejected') {
        if (bannerContainer) {
          bannerContainer.innerHTML = `
            <div class="app-status-banner rejected">
              <div class="status-icon-circle">${Icons.x(18)}</div>
              <div class="status-banner-content">
                <h3 style="color: var(--text-primary);">Application Requires Revisions</h3>
                <p style="color: var(--text-secondary);">The Academic Board reviewed your application with feedback: <em>"${this.application?.admin_notes || 'Please provide updated degree verification or teaching credentials.'}"</em></p>
                <p style="margin-top: 0.5rem; color: var(--gold-400);">You may update your details below and resubmit for reconsideration.</p>
              </div>
            </div>
          `;
        }

        if (appFormSection) appFormSection.style.display = 'block';
        if (portalDashboardSection) portalDashboardSection.style.display = 'none';
        this.populateApplicationForm();
      } else {
        // Pending Status
        if (bannerContainer) {
          bannerContainer.innerHTML = `
            <div class="app-status-banner pending">
              <div class="status-icon-circle">${Icons.hourglass(18)}</div>
              <div class="status-banner-content">
                <h3 style="color: var(--text-primary);">Application Under Review by Academic Board</h3>
                <p style="color: var(--text-secondary);">Thank you for applying to Aviora Education! Our academic evaluation committee is actively verifying your academic credentials, teaching experience, and background. You will receive an in-app notification once approved.</p>
                <p style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-secondary);">Status: <strong>PENDING REVIEW</strong> • Applied: ${new Date(this.application?.created_at || Date.now()).toLocaleDateString()}</p>
              </div>
            </div>
          `;
        }

        if (appFormSection) appFormSection.style.display = 'block';
        if (portalDashboardSection) portalDashboardSection.style.display = 'none';
        this.populateApplicationForm();
      }
    } catch (err) {
      console.error('Failed to load teacher view:', err);
    }
  },

  // ==============================================================
  // 1. DASHBOARD & FINANCIAL ANALYTICS
  // ==============================================================
  async loadTeacherDashboard() {
    try {
      const data = await API.getTeacherDashboard();
      this.dashboardData = data;
      this.requests = data.requests || [];
      const stats = data.stats || {};

      // 1. Gross Revenue from Students
      const grossEl = document.getElementById('teacher-stat-gross-revenue');
      const grossVal = stats.gross_revenue_students || 0;
      if (grossEl) grossEl.textContent = `$${grossVal.toFixed(2)}`;

      // 2. Aviora Platform Commission / Cut (15%)
      const cutEl = document.getElementById('teacher-stat-commission-cut');
      const cutVal = stats.platform_commission_amount || (grossVal * 0.15);
      if (cutEl) cutEl.textContent = `$${cutVal.toFixed(2)}`;

      // 3. Net Tutor Take-Home Earnings (85%)
      const netEl = document.getElementById('teacher-stat-net-earnings');
      const netVal = stats.net_earnings_tutor || (grossVal * 0.85);
      if (netEl) netEl.textContent = `$${netVal.toFixed(2)}`;

      // 4. Current Month Net Payout & Sessions
      const monthNetEl = document.getElementById('teacher-stat-month-net');
      if (monthNetEl) monthNetEl.textContent = `$${(stats.current_month_net || 0).toFixed(2)}`;

      const completedCountEl = document.getElementById('teacher-stat-completed-count');
      if (completedCountEl) completedCountEl.textContent = stats.completed_sessions || 0;

      const activeSessionsEl = document.getElementById('teacher-stat-active-sessions');
      if (activeSessionsEl) activeSessionsEl.textContent = stats.active_sessions || 0;

      const ratingEl = document.getElementById('teacher-stat-rating');
      if (ratingEl) ratingEl.textContent = `${stats.rating?.toFixed(1) || '5.0'} ★ (${stats.reviews_count || 0})`;

      // Render Tables
      this.renderMonthlyFinancials(data.monthlyFinancials || []);
      this.renderStudentRevenueBreakdown(data.studentRevenueBreakdown || []);
      this.renderTeacherRequests();
      this.populateProfileSettings(data.tutorProfile);
    } catch (err) {
      console.error('Failed to load teacher dashboard:', err);
    }
  },

  renderMonthlyFinancials(monthlyList) {
    const tbody = document.getElementById('teacher-monthly-financials-tbody');
    if (!tbody) return;

    if (!monthlyList || monthlyList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">
            No monthly statement records yet. As student sessions complete, your earnings statements will appear here.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = monthlyList.map(m => `
      <tr>
        <td>
          <strong style="color: var(--text-primary); font-size: 0.95rem;">${m.month_label}</strong>
        </td>
        <td style="color: var(--text-secondary);">
          ${m.students_count} active student${m.students_count === 1 ? '' : 's'}
        </td>
        <td>
          <span class="badge-gold">${m.sessions_count} lesson${m.sessions_count === 1 ? '' : 's'}</span>
        </td>
        <td>
          <strong style="color: var(--gold-400); font-weight: 700;">$${Number(m.gross_amount || 0).toFixed(2)}</strong>
        </td>
        <td>
          <span style="color: #EF4444; font-weight: 600;">-$${Number(m.commission_cut || 0).toFixed(2)}</span>
          <span style="font-size: 0.75rem; color: var(--text-secondary); margin-left: 0.2rem;">(15%)</span>
        </td>
        <td>
          <strong style="color: #10B981; font-size: 1rem; font-weight: 800;">$${Number(m.net_payout || 0).toFixed(2)}</strong>
        </td>
        <td style="text-align: right;">
          <span class="status-pill ${m.status === 'Paid Out' ? 'accepted' : 'pending'}" style="font-size: 0.775rem;">
            ${m.status || 'Pending Settlement'}
          </span>
        </td>
      </tr>
    `).join('');
  },

  renderStudentRevenueBreakdown(breakdownList) {
    const tbody = document.getElementById('teacher-student-revenue-tbody');
    if (!tbody) return;

    if (!breakdownList || breakdownList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
            No student revenue records found.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = breakdownList.map(item => `
      <tr>
        <td>
          <div class="user-cell">
            <img src="${item.student_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" class="user-cell-avatar" />
            <div>
              <div class="user-cell-name">${item.student_name}</div>
              <div class="user-cell-email">${item.student_email}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge-accent">${item.subject}</span>
        </td>
        <td>
          ${item.completed_sessions} completed session${item.completed_sessions === 1 ? '' : 's'}
        </td>
        <td>
          <strong style="color: var(--gold-400);">$${Number(item.gross_amount || 0).toFixed(2)}</strong>
        </td>
        <td>
          <span style="color: #EF4444;">-$${Number(item.platform_cut || 0).toFixed(2)}</span>
        </td>
        <td>
          <strong style="color: #10B981;">$${Number(item.tutor_net || 0).toFixed(2)}</strong>
        </td>
      </tr>
    `).join('');
  },

  renderTeacherRequests() {
    const container = document.getElementById('teacher-requests-table-body');
    if (!container) return;

    if (this.requests.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 3rem;">
            <div class="empty-state">
              <div class="empty-icon" style="color: var(--gold-400);">${Icons.inbox(36)}</div>
              <h4 class="empty-title" style="color: var(--text-primary); margin-top: 0.5rem;">No Incoming Tutoring Requests</h4>
              <p class="empty-desc" style="color: var(--text-secondary);">When students book a session with you, their requests will appear here for you to accept or manage.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    container.innerHTML = this.requests.map(r => `
      <tr>
        <td>
          <div class="user-cell">
            <img src="${r.student_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" class="user-cell-avatar" />
            <div>
              <div class="user-cell-name">${r.student_name}</div>
              <div class="user-cell-email">${r.student_email} • ${r.student_grade || 'Student'}</div>
            </div>
          </div>
        </td>
        <td>
          <strong style="color: var(--text-primary);">${r.subject}</strong>
          ${r.notes ? `<div style="font-size: 0.775rem; color: var(--text-secondary); max-width: 220px;">"${r.notes}"</div>` : ''}
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.3rem; color: var(--text-primary);">${Icons.calendar(14)} ${r.requested_date}</div>
          <div style="font-size: 0.775rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.3rem;">${Icons.clock(14)} ${r.requested_time} (${r.duration_hours}h)</div>
        </td>
        <td>
          <span style="font-weight: 700; color: var(--gold-400);">$${Number(r.total_amount || 0).toFixed(2)}</span>
        </td>
        <td>
          <span class="status-pill ${r.status}">${r.status}</span>
        </td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 0.4rem; justify-content: flex-end; align-items: center;">
            ${r.status === 'pending' ? `
              <button class="btn btn-primary btn-sm" onclick="Teacher.updateStatus(${r.id}, 'accepted')">Accept</button>
              <button class="btn btn-secondary btn-sm" onclick="Teacher.updateStatus(${r.id}, 'declined')">Decline</button>
            ` : ''}
            ${r.status === 'accepted' ? `
              ${r.room_status === 'open' ? `
                <button class="btn btn-primary btn-sm" onclick="VirtualRoom.joinRoom(${r.id}, 'tutor')" style="background: #10B981; border-color: #10B981;">${Icons.video(14)} Enter Room (Live)</button>
              ` : `
                <button class="btn btn-primary btn-sm" onclick="VirtualRoom.openRoomAsTutor(${r.id})">${Icons.video(14)} Open Room</button>
              `}
              <button class="btn btn-outline-gold btn-sm" onclick="Teacher.updateStatus(${r.id}, 'completed')">Mark Done</button>
            ` : ''}
            ${r.status === 'completed' ? `
              <span style="font-size: 0.8rem; color: #10B981; font-weight: 600;">✓ Completed</span>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  },

  async updateStatus(requestId, status) {
    let note = '';
    if (status === 'declined') {
      note = prompt('Please specify a brief reason for declining (e.g. Schedule conflict):', 'Scheduling conflict on this date.');
      if (note === null) return;
    }

    try {
      const res = await API.updateRequestStatus(requestId, { status, note });
      showToast(res.message, 'success');
      await this.loadTeacherDashboard();
      if (this.currentTab === 'classes') {
        await this.loadClasses();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  // ==============================================================
  // 2. VIRTUAL CLASSES & SESSIONS
  // ==============================================================
  async loadClasses() {
    try {
      const data = await API.getTeacherClasses();
      this.classes = data.classes || [];
      this.renderClasses();
    } catch (err) {
      console.error('Failed to load teacher classes:', err);
    }
  },

  filterClasses(filter, btn) {
    this.classFilter = filter;
    if (btn) {
      document.querySelectorAll('#teacher-tab-classes .teacher-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    this.renderClasses();
  },

  renderClasses() {
    const container = document.getElementById('teacher-classes-cards-grid');
    if (!container) return;

    let filtered = this.classes;
    if (this.classFilter === 'open') {
      filtered = filtered.filter(c => c.room_status === 'open');
    } else if (this.classFilter === 'accepted') {
      filtered = filtered.filter(c => c.status === 'accepted' && c.room_status !== 'open');
    } else if (this.classFilter === 'pending') {
      filtered = filtered.filter(c => c.status === 'pending');
    } else if (this.classFilter === 'completed') {
      filtered = filtered.filter(c => c.status === 'completed');
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-xl);">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🎓</div>
          <h3 style="color: var(--text-primary); font-size: 1.25rem;">No Classes Found</h3>
          <p style="color: var(--text-secondary); font-size: 0.9rem; max-width: 480px; margin: 0.5rem auto 1.5rem;">
            ${this.classFilter === 'open' 
              ? 'No live virtual classrooms currently open. You can launch a virtual session for any accepted student booking.' 
              : 'You do not have any classes in this category yet.'}
          </p>
          <button type="button" class="btn btn-primary btn-sm" onclick="Teacher.openInstantClassModal()">
            🚀 Launch Instant Class with Student
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(c => {
      const isLive = c.room_status === 'open';
      const isAccepted = c.status === 'accepted';
      const isPending = c.status === 'pending';
      const isCompleted = c.status === 'completed';

      return `
        <div class="teacher-class-card ${isLive ? 'is-live-room' : ''}">
          
          <!-- Card Header: Status & Room Badge -->
          <div class="class-card-header">
            <div>
              <span class="badge-accent">${c.subject}</span>
              ${isLive ? `
                <span class="live-pulse-badge">
                  <span class="live-dot"></span> LIVE CLASSROOM OPEN
                </span>
              ` : ''}
            </div>
            <span class="status-pill ${c.status}">${c.status.toUpperCase()}</span>
          </div>

          <!-- Student Profile in Card -->
          <div class="class-card-student">
            <img src="${c.student_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}" alt="${c.student_name}" class="class-card-avatar" />
            <div>
              <h4 class="class-card-student-name">${c.student_name}</h4>
              <div class="class-card-student-meta">${c.student_grade || 'Student'} • ${c.student_school || 'Enrolled Student'}</div>
            </div>
          </div>

          <!-- Schedule & Details -->
          <div class="class-card-details">
            <div class="class-detail-item">
              <span class="detail-icon">${Icons.calendar(14)}</span>
              <span><strong>Date:</strong> ${c.requested_date}</span>
            </div>
            <div class="class-detail-item">
              <span class="detail-icon">${Icons.clock(14)}</span>
              <span><strong>Time:</strong> ${c.requested_time} (50m tailored lesson)</span>
            </div>
            <div class="class-detail-item">
              <span class="detail-icon">${Icons.award(14)}</span>
              <span><strong>Fee:</strong> $${Number(c.total_amount || 0).toFixed(2)} (${c.payment_method === 'subscription' ? 'Subscription Credit' : 'Card Payment'})</span>
            </div>
            ${c.notes ? `
              <div class="class-card-notes">
                <strong>Student Focus:</strong> "${c.notes}"
              </div>
            ` : ''}
          </div>

          <!-- Action Launch Pad -->
          <div class="class-card-actions">
            ${isLive ? `
              <button type="button" class="btn btn-primary btn-sm btn-vroom-live-pulse" style="flex: 1; justify-content: center; background: #10B981; border-color: #10B981; font-weight: 700;" onclick="VirtualRoom.joinRoom(${c.id}, 'tutor')">
                🚀 Enter Live Classroom
              </button>
            ` : isAccepted ? `
              <button type="button" class="btn btn-primary btn-sm" style="flex: 1; justify-content: center; font-weight: 700;" onclick="Teacher.launchClassSession(${c.id})">
                🎥 Launch Virtual Class Session
              </button>
            ` : isPending ? `
              <button type="button" class="btn btn-primary btn-sm" style="flex: 1;" onclick="Teacher.updateStatus(${c.id}, 'accepted')">Accept</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="Teacher.updateStatus(${c.id}, 'declined')">Decline</button>
            ` : ''}

            ${isAccepted ? `
              <button type="button" class="btn btn-secondary btn-sm" title="Mark session as completed" onclick="Teacher.updateStatus(${c.id}, 'completed')">
                Done
              </button>
            ` : ''}

            ${isCompleted ? `
              <div style="flex: 1; text-align: center; color: #10B981; font-size: 0.85rem; font-weight: 700; padding: 0.5rem; background: rgba(16, 185, 129, 0.1); border-radius: var(--radius-md);">
                ✓ Class Session Completed
              </div>
            ` : ''}
          </div>

        </div>
      `;
    }).join('');
  },

  async launchClassSession(sessionId) {
    try {
      await VirtualRoom.openRoomAsTutor(sessionId);
      await this.loadClasses();
    } catch (err) {
      showToast(err.message || 'Failed to launch class session.', 'error');
    }
  },

  // Instant 1-on-1 class modal
  openInstantClassModal(preselectedStudentId = null) {
    const studentSelect = document.getElementById('instant-class-student-id');
    const subjectInput = document.getElementById('instant-class-subject');

    if (studentSelect) {
      studentSelect.innerHTML = '<option value="">-- Choose an enrolled student --</option>';
      this.students.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.student_id;
        opt.textContent = `${s.student_name} (${s.student_grade || 'Student'}) - ${(s.enrolled_subjects || []).join(', ')}`;
        studentSelect.appendChild(opt);
      });

      if (preselectedStudentId) {
        studentSelect.value = preselectedStudentId;
        this.handleInstantStudentChange(preselectedStudentId);
      }
    }

    this.openModal('modal-teacher-instant-class');
  },

  handleInstantStudentChange(studentId) {
    const subjectInput = document.getElementById('instant-class-subject');
    if (!subjectInput) return;

    const student = this.students.find(s => String(s.student_id) === String(studentId));
    if (student && student.enrolled_subjects && student.enrolled_subjects.length > 0) {
      subjectInput.value = student.enrolled_subjects[0];
    }
  },

  async handleInstantClassSubmit() {
    const studentId = document.getElementById('instant-class-student-id').value;
    const subject = document.getElementById('instant-class-subject').value.trim();
    const notes = document.getElementById('instant-class-notes').value.trim();
    const submitBtn = document.getElementById('btn-submit-instant-class');

    if (!studentId || !subject) {
      showToast('Please select a student and specify the subject.', 'warning');
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Launching Virtual Classroom...';
      }

      const res = await API.launchInstantClass({
        student_id: parseInt(studentId, 10),
        subject,
        notes
      });

      this.closeModal('modal-teacher-instant-class');
      showToast(res.message || 'Virtual room opened! Class session is live.', 'success');

      // Refresh classes list
      await this.loadClasses();

      // Launch and enter virtual room directly
      if (res.session && res.session.id) {
        await VirtualRoom.joinRoom(res.session.id, 'tutor');
      }
    } catch (err) {
      showToast(err.message || 'Failed to launch instant virtual class.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '🚀 Open Room & Start Class Now';
      }
    }
  },

  // ==============================================================
  // 3. STUDENTS & ACADEMIC TASK GRADING
  // ==============================================================
  async loadStudents() {
    try {
      const data = await API.getTeacherStudents();
      this.students = data.students || [];
      this.renderStudents();
    } catch (err) {
      console.error('Failed to load enrolled students:', err);
    }
  },

  renderStudents() {
    const container = document.getElementById('teacher-students-roster-grid');
    const countBadge = document.getElementById('teacher-students-count-badge');
    if (!container) return;

    if (countBadge) countBadge.textContent = `${this.students.length} Student${this.students.length === 1 ? '' : 's'} Enrolled`;

    if (this.students.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-xl);">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">👥</div>
          <h4 style="color: var(--text-primary); font-size: 1.15rem;">No Students Enrolled Yet</h4>
          <p style="color: var(--text-secondary); font-size: 0.85rem; max-width: 450px; margin: 0.5rem auto 0;">
            As students book lessons with you or enroll in your subjects, their profiles and coursework progress will appear here.
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.students.map(s => {
      const subjectsList = s.enrolled_subjects || ['General Academics'];
      return `
        <div class="teacher-student-card">
          <div class="student-card-top">
            <img src="${s.student_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}" alt="${s.student_name}" class="student-card-avatar" />
            <div style="flex: 1;">
              <h4 class="student-card-name">${s.student_name}</h4>
              <div class="student-card-email">${s.student_email}</div>
              <div class="student-card-grade">${s.student_grade || 'High School'} • ${s.student_school || 'Aviora Academy'}</div>
            </div>
          </div>

          <!-- Respective Subjects -->
          <div class="student-subjects-wrap">
            <div class="student-section-subhead">Respective Subjects:</div>
            <div class="subject-tags-container">
              ${subjectsList.map(subj => `<span class="badge-gold" style="font-size: 0.775rem;">${subj}</span>`).join('')}
            </div>
          </div>

          <!-- Coursework Stats -->
          <div class="student-metrics-grid">
            <div class="student-metric-box">
              <span class="metric-num">${s.completed_sessions || 0}</span>
              <span class="metric-label">Completed Classes</span>
            </div>
            <div class="student-metric-box">
              <span class="metric-num">${s.total_tasks || 0}</span>
              <span class="metric-label">Tasks Assigned</span>
            </div>
            <div class="student-metric-box">
              <span class="metric-num" style="color: ${(s.pending_grade_tasks || 0) > 0 ? '#F59E0B' : 'var(--text-primary)'};">${s.pending_grade_tasks || 0}</span>
              <span class="metric-label">Needs Grading</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="student-card-actions">
            <button type="button" class="btn btn-primary btn-sm" style="flex: 1; justify-content: center;" onclick="Teacher.openAssignTaskModal(${s.student_id})">
              + Assign Task
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="Teacher.openInstantClassModal(${s.student_id})" title="Launch Instant Class">
              🚀 Class
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  async loadTasks() {
    try {
      const data = await API.getTeacherTasks();
      this.tasks = data.tasks || [];
      this.renderTasks();
    } catch (err) {
      console.error('Failed to load teacher tasks:', err);
    }
  },

  filterTasks(filter, btn) {
    this.taskFilter = filter;
    if (btn) {
      document.querySelectorAll('#teacher-tab-students .teacher-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    this.renderTasks();
  },

  renderTasks() {
    const container = document.getElementById('teacher-tasks-list-container');
    if (!container) return;

    let filtered = this.tasks;
    if (this.taskFilter === 'submitted') {
      filtered = filtered.filter(t => t.status === 'submitted');
    } else if (this.taskFilter === 'graded') {
      filtered = filtered.filter(t => t.status === 'graded');
    } else if (this.taskFilter === 'assigned') {
      filtered = filtered.filter(t => t.status === 'assigned');
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-xl);">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📝</div>
          <h4 style="color: var(--text-primary); font-size: 1.15rem;">No Coursework Tasks Found</h4>
          <p style="color: var(--text-secondary); font-size: 0.85rem; max-width: 450px; margin: 0.5rem auto 1.25rem;">
            ${this.taskFilter === 'submitted'
              ? 'Great job! You have graded all submitted student assignments.'
              : 'You have not assigned tasks in this view yet.'}
          </p>
          <button type="button" class="btn btn-primary btn-sm" onclick="Teacher.openAssignTaskModal()">
            + Assign Task to Student
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(task => {
      const isSubmitted = task.status === 'submitted';
      const isGraded = task.status === 'graded';
      const isAssigned = task.status === 'assigned';

      return `
        <div class="teacher-task-card ${isSubmitted ? 'needs-grading-card' : ''}">
          <div class="task-card-header">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="badge-accent">${task.subject}</span>
              <span class="status-pill ${task.status}">
                ${isSubmitted ? 'SUBMITTED • NEEDS GRADING' : task.status.toUpperCase()}
              </span>
            </div>
            <div style="font-size: 0.825rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.35rem;">
              ${Icons.calendar(14)} Due: <strong style="color: var(--text-primary);">${task.due_date}</strong>
            </div>
          </div>

          <div class="task-card-body">
            <div class="task-card-student-row">
              <img src="${task.student_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" class="user-cell-avatar" />
              <div>
                <strong style="color: var(--text-primary);">${task.student_name}</strong>
                <span style="font-size: 0.8rem; color: var(--text-secondary); margin-left: 0.4rem;">(${task.student_grade || 'Student'})</span>
              </div>
            </div>

            <h4 class="task-title" style="color: var(--text-primary); font-size: 1.15rem; margin: 0.65rem 0 0.35rem;">
              ${task.title}
            </h4>
            <p class="task-desc" style="color: var(--text-secondary); font-size: 0.875rem; line-height: 1.5; margin: 0 0 1rem;">
              ${task.description}
            </p>

            <!-- Student Submission Content -->
            ${task.student_submission ? `
              <div class="task-submission-preview">
                <div style="font-size: 0.775rem; color: var(--gold-400); font-weight: 700; text-transform: uppercase; margin-bottom: 0.25rem;">
                  Student Submission:
                </div>
                <div style="font-size: 0.85rem; color: var(--text-primary); line-height: 1.5;">
                  "${task.student_submission}"
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.35rem;">
                  Submitted: ${new Date(task.submitted_at || Date.now()).toLocaleString()}
                </div>
              </div>
            ` : ''}

            <!-- Graded Evaluation & Feedback -->
            ${isGraded ? `
              <div class="task-grade-banner">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                  <span style="font-size: 0.8rem; font-weight: 700; color: #10B981;">EVALUATED GRADE:</span>
                  <span class="badge-gold" style="font-size: 0.95rem; font-weight: 800;">${task.grade}</span>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-primary); line-height: 1.5;">
                  <strong>Educator Feedback:</strong> "${task.feedback || 'Excellent work!'}"
                </div>
              </div>
            ` : ''}
          </div>

          <div class="task-card-footer">
            ${isSubmitted ? `
              <button type="button" class="btn btn-primary btn-sm" onclick="Teacher.openGradeTaskModal(${task.id})">
                ⭐ Grade Submission & Give Feedback
              </button>
            ` : isGraded ? `
              <button type="button" class="btn btn-secondary btn-sm" onclick="Teacher.openGradeTaskModal(${task.id})">
                ✏️ Edit Grade / Feedback
              </button>
            ` : `
              <span style="font-size: 0.8rem; color: var(--text-secondary);">
                Awaiting student coursework submission.
              </span>
            `}
          </div>
        </div>
      `;
    }).join('');
  },

  // Modal: Assign Task
  openAssignTaskModal(preselectedStudentId = null) {
    const studentSelect = document.getElementById('assign-task-student-id');
    const subjectInput = document.getElementById('assign-task-subject');
    const dueDateInput = document.getElementById('assign-task-due-date');

    if (studentSelect) {
      studentSelect.innerHTML = '<option value="">-- Choose an enrolled student --</option>';
      this.students.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.student_id;
        opt.textContent = `${s.student_name} (${s.student_grade || 'Student'}) - ${(s.enrolled_subjects || []).join(', ')}`;
        studentSelect.appendChild(opt);
      });

      if (preselectedStudentId) {
        studentSelect.value = preselectedStudentId;
        this.handleStudentSelectChange(preselectedStudentId);
      }
    }

    if (dueDateInput) {
      const today = new Date();
      today.setDate(today.getDate() + 3);
      dueDateInput.value = today.toISOString().split('T')[0];
    }

    this.openModal('modal-teacher-assign-task');
  },

  handleStudentSelectChange(studentId) {
    const subjectInput = document.getElementById('assign-task-subject');
    if (!subjectInput) return;

    const student = this.students.find(s => String(s.student_id) === String(studentId));
    if (student && student.enrolled_subjects && student.enrolled_subjects.length > 0) {
      subjectInput.value = student.enrolled_subjects[0];
    }
  },

  async handleAssignTaskSubmit() {
    const studentId = document.getElementById('assign-task-student-id').value;
    const subject = document.getElementById('assign-task-subject').value.trim();
    const dueDate = document.getElementById('assign-task-due-date').value;
    const title = document.getElementById('assign-task-title').value.trim();
    const desc = document.getElementById('assign-task-desc').value.trim();
    const submitBtn = document.getElementById('btn-submit-assign-task');

    if (!studentId || !subject || !dueDate || !title || !desc) {
      showToast('Please fill in all required task fields.', 'warning');
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Assigning...';
      }

      const res = await API.assignStudentTask({
        student_id: parseInt(studentId, 10),
        subject,
        due_date: dueDate,
        title,
        description: desc
      });

      showToast(res.message || 'Coursework task successfully assigned!', 'success');
      this.closeModal('modal-teacher-assign-task');

      // Refresh task and student rosters
      await this.loadTasks();
      await this.loadStudents();

      // Reset form
      document.getElementById('form-teacher-assign-task')?.reset();
    } catch (err) {
      showToast(err.message || 'Failed to assign task.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Assign Coursework Task';
      }
    }
  },

  // Modal: Grade Task
  openGradeTaskModal(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    document.getElementById('grade-task-id').value = task.id;
    const subjEl = document.getElementById('grade-task-subject-tag');
    const titleEl = document.getElementById('grade-task-title-disp');
    const metaEl = document.getElementById('grade-task-student-meta');
    const instEl = document.getElementById('grade-task-instructions-disp');
    const subContentEl = document.getElementById('grade-task-submission-content');
    const subTimeEl = document.getElementById('grade-task-submission-time');
    const gradeInput = document.getElementById('grade-task-grade-input');
    const feedbackInput = document.getElementById('grade-task-feedback-input');

    if (subjEl) subjEl.textContent = task.subject;
    if (titleEl) titleEl.textContent = task.title;
    if (metaEl) metaEl.innerHTML = `Student: <strong>${task.student_name}</strong> • Due: ${task.due_date}`;
    if (instEl) instEl.textContent = task.description;

    if (subContentEl) {
      subContentEl.textContent = task.student_submission || 'No written submission text entered by student.';
    }
    if (subTimeEl) {
      subTimeEl.textContent = task.submitted_at ? `Submitted on: ${new Date(task.submitted_at).toLocaleString()}` : 'Awaiting submission';
    }

    if (gradeInput) gradeInput.value = task.grade || '95/100 (A)';
    if (feedbackInput) feedbackInput.value = task.feedback || 'Great conceptual execution and problem breakdown!';

    this.openModal('modal-teacher-grade-task');
  },

  async handleGradeTaskSubmit() {
    const taskId = document.getElementById('grade-task-id').value;
    const grade = document.getElementById('grade-task-grade-input').value.trim();
    const feedback = document.getElementById('grade-task-feedback-input').value.trim();
    const submitBtn = document.getElementById('btn-submit-grade-task');

    if (!taskId || !grade || !feedback) {
      showToast('Please provide both a grade and educator feedback.', 'warning');
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving Grade...';
      }

      const res = await API.gradeStudentTask(taskId, { grade, feedback });
      showToast(res.message || 'Task graded and student notified successfully!', 'success');
      this.closeModal('modal-teacher-grade-task');

      await this.loadTasks();
      await this.loadStudents();
    } catch (err) {
      showToast(err.message || 'Failed to save task grade.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Grade & Feedback';
      }
    }
  },

  // ==============================================================
  // 4. SCHEDULE & OCCUPIED TIME SLOTS
  // ==============================================================
  async loadSchedule() {
    try {
      const data = await API.getTeacherSchedule();
      this.scheduleData = data;
      this.renderSchedule();
    } catch (err) {
      console.error('Failed to load teacher schedule:', err);
    }
  },

  renderSchedule() {
    const calendarGrid = document.getElementById('teacher-timetable-calendar');
    const upcomingList = document.getElementById('teacher-upcoming-appointments-list');
    const countBadge = document.getElementById('teacher-upcoming-count-badge');
    if (!calendarGrid) return;

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const timeSlots = [
      '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
      '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
      '05:00 PM', '06:00 PM', '07:00 PM'
    ];

    const appointments = this.scheduleData.appointments || [];
    const occupiedSlots = this.scheduleData.occupiedSlots || [];

    if (countBadge) {
      countBadge.textContent = `${appointments.length} Appointment${appointments.length === 1 ? '' : 's'}`;
    }

    // Render Weekly Timetable Grid
    let gridHtml = `
      <div class="timetable-time-col">
        <div class="timetable-cell-header">Time</div>
        ${timeSlots.map(t => `<div class="timetable-cell-time">${t}</div>`).join('')}
      </div>
    `;

    days.forEach(day => {
      gridHtml += `
        <div class="timetable-day-col">
          <div class="timetable-cell-header">${day}</div>
          ${timeSlots.map(slot => {
            // Check if slot has a booked appointment
            const booked = appointments.find(a => {
              if (!a.requested_date) return false;
              const dateObj = new Date(a.requested_date);
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
              return dayName === day && a.requested_time && a.requested_time.includes(slot.replace(' ', ''));
            });

            // Check if slot is marked occupied
            const occupied = occupiedSlots.find(o => o.day_of_week === day && o.time_slot === slot);

            if (booked) {
              return `
                <div class="timetable-slot slot-booked" title="Booked: ${booked.student_name} (${booked.subject})">
                  <div class="slot-badge booked">Booked</div>
                  <div class="slot-student-name">${booked.student_name}</div>
                  <div class="slot-subject">${booked.subject}</div>
                </div>
              `;
            }

            if (occupied) {
              return `
                <div class="timetable-slot slot-occupied" onclick="Teacher.toggleOccupiedSlot('${day}', '${slot}', 'Occupied')" title="Marked Occupied. Click to remove and make available.">
                  <div class="slot-badge occupied">🔒 Occupied</div>
                  <div class="slot-status-text">Unavailable</div>
                  <span class="slot-hover-action">Click to Free</span>
                </div>
              `;
            }

            return `
              <div class="timetable-slot slot-available" onclick="Teacher.toggleOccupiedSlot('${day}', '${slot}', 'Tutor Unavailable')" title="Available for bookings. Click to mark as Occupied.">
                <div class="slot-status-text open">Open</div>
                <span class="slot-hover-action">+ Mark Occupied</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    });

    calendarGrid.innerHTML = gridHtml;

    // Render Upcoming Appointments List
    if (upcomingList) {
      if (appointments.length === 0) {
        upcomingList.innerHTML = `
          <div style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">
            No upcoming appointments scheduled yet.
          </div>
        `;
      } else {
        upcomingList.innerHTML = appointments.slice(0, 6).map(apt => `
          <div class="appointment-card">
            <div style="display: flex; gap: 0.75rem; align-items: center;">
              <img src="${apt.student_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'}" class="appointment-avatar" />
              <div>
                <strong style="color: var(--text-primary); font-size: 0.95rem;">${apt.student_name}</strong>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${apt.subject}</div>
              </div>
            </div>
            <div class="appointment-meta">
              <div>${Icons.calendar(14)} ${apt.requested_date}</div>
              <div>${Icons.clock(14)} ${apt.requested_time}</div>
            </div>
            <div>
              ${apt.room_status === 'open' ? `
                <button class="btn btn-primary btn-sm" onclick="VirtualRoom.joinRoom(${apt.id}, 'tutor')" style="background: #10B981; border-color: #10B981;">Enter (Live)</button>
              ` : `
                <button class="btn btn-secondary btn-sm" onclick="VirtualRoom.openRoomAsTutor(${apt.id})">Open Room</button>
              `}
            </div>
          </div>
        `).join('');
      }
    }
  },

  async toggleOccupiedSlot(dayOfWeek, timeSlot, reason = 'Occupied') {
    try {
      const res = await API.toggleOccupiedSlot({
        day_of_week: dayOfWeek,
        time_slot: timeSlot,
        reason: reason || 'Unavailable'
      });

      showToast(res.message, res.status === 'occupied' ? 'info' : 'success');
      await this.loadSchedule();
    } catch (err) {
      showToast(err.message || 'Failed to update schedule slot.', 'error');
    }
  },

  // ==============================================================
  // 5. AVIORA BUDDY COHORTS
  // ==============================================================
  async loadBuddySessions() {
    try {
      const data = await API.getTeacherBuddySessions();
      this.buddySessions = data.sessions || [];
      this.renderBuddySessions();
    } catch (err) {
      console.error('Failed to load teacher buddy sessions:', err);
    }
  },

  renderBuddySessions() {
    const container = document.getElementById('teacher-buddy-cohorts-container');
    if (!container) return;

    if (this.buddySessions.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-xl);">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🤝</div>
          <h3 style="color: var(--text-primary); font-size: 1.25rem;">No Active Aviora Buddy Cohorts</h3>
          <p style="color: var(--text-secondary); font-size: 0.9rem; max-width: 500px; margin: 0.5rem auto 1.5rem;">
            When students pair up in your subjects for 2-student collaborative study sessions, their cohort pairings and battle sessions will appear here.
          </p>
          <a href="#aviora-buddy" class="btn btn-primary btn-sm">
            Explore Aviora Buddy Studio
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = this.buddySessions.map(b => `
      <div class="teacher-buddy-card">
        <div class="buddy-card-header">
          <span class="badge-gold">${b.subject}</span>
          <span class="status-pill ${b.status}">${b.status.toUpperCase()}</span>
        </div>

        <h4 style="color: var(--text-primary); font-size: 1.15rem; margin: 0.5rem 0;">${b.title}</h4>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
          ${b.notes || 'Collaborative 2-student diagnostic session.'}
        </p>

        <!-- 2-Student Duo Avatars -->
        <div class="buddy-duo-avatars-row">
          <div class="duo-student-col">
            <img src="${b.student1_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" class="duo-avatar" />
            <div class="duo-name">${b.student1_name}</div>
            <div class="duo-grade">${b.student1_grade || 'Student 1'}</div>
          </div>
          <div class="duo-vs-badge">VS / DUO</div>
          <div class="duo-student-col">
            <img src="${b.student2_avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80'}" class="duo-avatar" />
            <div class="duo-name">${b.student2_name}</div>
            <div class="duo-grade">${b.student2_grade || 'Student 2'}</div>
          </div>
        </div>

        <!-- Meta & Actions -->
        <div class="buddy-card-footer">
          <div style="font-size: 0.8rem; color: var(--text-secondary);">
            <div>${Icons.calendar(14)} ${b.scheduled_date}</div>
            <div>${Icons.clock(14)} ${b.scheduled_time}</div>
          </div>
          <button type="button" class="btn btn-primary btn-sm" onclick="window.location.hash = '#aviora-buddy'">
            Launch Session 🎮
          </button>
        </div>
      </div>
    `).join('');
  },

  // ==============================================================
  // 6. PROFILE & ACCREDITATION SETTINGS
  // ==============================================================
  populateProfileSettings(tutor) {
    if (!tutor) return;
    const headline = document.getElementById('t-profile-headline');
    const rate = document.getElementById('t-profile-rate');
    const bio = document.getElementById('t-profile-bio');

    if (headline) headline.value = tutor.headline || '';
    if (rate) rate.value = tutor.hourly_rate || 45;
    if (bio) bio.value = tutor.bio || '';
  },

  populateApplicationForm() {
    if (!this.application) return;

    const app = this.application;
    const headline = document.getElementById('app-headline');
    const degree = document.getElementById('app-degree');
    const institution = document.getElementById('app-institution');
    const gradYear = document.getElementById('app-grad-year');
    const exp = document.getElementById('app-years-exp');
    const rate = document.getElementById('app-hourly-rate');
    const bio = document.getElementById('app-bio');
    const phil = document.getElementById('app-philosophy');
    const subjects = document.getElementById('app-subjects');

    if (headline) headline.value = app.headline || '';
    if (degree) degree.value = app.highest_degree || '';
    if (institution) institution.value = app.institution || '';
    if (gradYear) gradYear.value = app.graduation_year || 2022;
    if (exp) exp.value = app.years_experience || 2;
    if (rate) rate.value = app.hourly_rate || 45;
    if (bio) bio.value = app.bio || '';
    if (phil) phil.value = app.teaching_philosophy || '';
    if (subjects) subjects.value = (app.subjects || []).join(', ');
  },

  toggleEditApplication() {
    const formSec = document.getElementById('teacher-application-section');
    if (formSec) {
      formSec.style.display = formSec.style.display === 'none' ? 'block' : 'none';
      if (formSec.style.display === 'block') {
        this.populateApplicationForm();
        formSec.scrollIntoView({ behavior: 'instant' });
      }
    }
  },

  async handleApplicationSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const formData = new FormData(form);

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Uploading & Submitting...';

      const res = await API.submitTeacherApplication(formData);
      showToast(res.message, 'success');
      await this.loadTeacherView();
      window.scrollTo(0, 0);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Application for Academic Review';
    }
  },

  async handleProfileSettingsSubmit(e) {
    e.preventDefault();
    const headline = document.getElementById('t-profile-headline').value.trim();
    const hourly_rate = parseFloat(document.getElementById('t-profile-rate').value);
    const bio = document.getElementById('t-profile-bio').value.trim();
    const submitBtn = e.target.querySelector('button[type="submit"]');

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating...';

      await API.updateProfile({
        tutorData: { headline, hourly_rate, bio }
      });

      showToast('Tutor public profile updated successfully!', 'success');
      await this.loadTeacherDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Public Profile';
    }
  }
};

window.Teacher = Teacher;
