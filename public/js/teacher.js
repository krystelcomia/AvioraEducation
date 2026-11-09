/**
 * AVIORA EDUCATION - TUTOR PROFILE, ACCOUNT & TEACHING WORKSPACE
 * Features:
 *  - Header & Tab Navigation: Dashboard, Class, Students, Schedule, Profile & Rates
 *  - Financial Dashboard: Gross Student Revenue, Aviora 30% Commission Cut, Net Take-Home Earnings, Monthly Ledger
 *  - Virtual Classes: Room status, Launch Virtual Session (alerts student, opens WebRTC classroom)
 *  - Students Management: Respective subjects roster, Assign Coursework Tasks, Grade Submissions with Feedback
 *  - Schedule & Availability: Weekly timetable calendar with interactive Occupied / Available slot toggling
 */

const Teacher = {
  application: null,
  tutorProfile: null,
  subjects: [],
  subjectRates: {},
  requests: [],
  classes: [],
  students: [],
  tasks: [],
  scheduleData: { appointments: [], occupiedSlots: [] },
  dateNotes: {},
  isEditingDateNote: false,
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  selectedDate: null,
  calListenersAttached: false,
  buddySessions: [],
  dashboardData: null,
  currentTab: 'dashboard',
  viewingDashboard: false,
  classFilter: 'all',
  classSearchQuery: '',
  taskFilter: 'all',
  taskSearchQuery: '',
  initialApplicationFormHtml: null,
  showEditApplicationForm: false,
  uploadValidation: {
    resume: { valid: null, checking: false, error: null, warning: null },
    diploma: { valid: null, checking: false, error: null, warning: null }
  },

  async init() {
    const appSection = document.getElementById('teacher-application-section');
    if (appSection && !this.initialApplicationFormHtml) {
      this.initialApplicationFormHtml = appSection.innerHTML;
    }
    this.setupEventListeners();
    const hash = window.location.hash || '#teacher-portal';
    await this.loadTeacherView(hash);
  },

  setupEventListeners() {
    this.setupApplicationFormListeners();

    // Teacher profile settings form submit
    const profileForm = document.getElementById('teacher-profile-settings-form');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => this.handleProfileSettingsSubmit(e));
    }

    // Account Backup and Recovery
    const btnBackupDownload = document.getElementById('btn-backup-download');
    if (btnBackupDownload) {
      btnBackupDownload.addEventListener('click', () => this.handleDownloadBackup());
    }

    this.initBackupPreviewModal();

    // Close modals on overlay click or Escape key
    ['modal-teacher-assign-task', 'modal-teacher-grade-task', 'modal-teacher-instant-class', 'modal-teacher-class-record'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', (e) => {
          if (e.target === el) this.closeModal(id);
        });
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ['modal-teacher-assign-task', 'modal-teacher-grade-task', 'modal-teacher-instant-class', 'modal-teacher-class-record'].forEach(id => {
          this.closeModal(id);
        });
      }
    });
  },

  setupApplicationFormListeners() {
    // Teacher application form submission
    const appForm = document.getElementById('teacher-application-form');
    if (appForm) {
      appForm.onsubmit = (e) => this.handleApplicationSubmit(e);
    }

    // 1. Resume file upload change & drag-drop
    const resumeInput = document.getElementById('resume-file-input');
    const resumeBadge = document.getElementById('resume-file-badge');
    const resumeZone = document.getElementById('resume-upload-zone');
    const resumeFeedback = document.getElementById('resume-feedback-box');
    if (resumeInput && resumeBadge) {
      resumeInput.onchange = (e) => {
        if (e.target.files.length > 0) {
          const file = e.target.files[0];
          resumeBadge.style.display = 'inline-flex';
          resumeBadge.innerHTML = `${Icons.paperclip(14)} ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
          this.validateUploadedFile(file, 'resume');
        } else {
          resumeBadge.style.display = 'none';
          if (resumeFeedback) resumeFeedback.style.display = 'none';
          if (resumeZone) resumeZone.style.borderColor = '';
          this.uploadValidation.resume = { valid: null, checking: false, error: null, warning: null };
        }
      };
    }
    if (resumeZone && resumeInput) {
      resumeZone.onclick = (e) => {
        if (e.target !== resumeInput) resumeInput.click();
      };
      resumeZone.ondragover = (e) => { e.preventDefault(); resumeZone.classList.add('dragover'); };
      resumeZone.ondragleave = () => resumeZone.classList.remove('dragover');
      resumeZone.ondrop = (e) => {
        e.preventDefault();
        resumeZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
          resumeInput.files = e.dataTransfer.files;
          resumeInput.dispatchEvent(new Event('change'));
        }
      };
    }

    // 2. Diploma file upload change & drag-drop
    const diplomaInput = document.getElementById('diploma-file-input');
    const diplomaBadge = document.getElementById('diploma-file-badge');
    const diplomaZone = document.getElementById('diploma-upload-zone');
    const diplomaFeedback = document.getElementById('diploma-feedback-box');
    if (diplomaInput && diplomaBadge) {
      diplomaInput.onchange = (e) => {
        if (e.target.files.length > 0) {
          const file = e.target.files[0];
          diplomaBadge.style.display = 'inline-flex';
          diplomaBadge.innerHTML = `${Icons.paperclip(14)} ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
          this.validateUploadedFile(file, 'diploma');
        } else {
          diplomaBadge.style.display = 'none';
          if (diplomaFeedback) diplomaFeedback.style.display = 'none';
          if (diplomaZone) diplomaZone.style.borderColor = '';
          this.uploadValidation.diploma = { valid: null, checking: false, error: null, warning: null };
        }
      };
    }
    if (diplomaZone && diplomaInput) {
      diplomaZone.onclick = (e) => {
        if (e.target !== diplomaInput) diplomaInput.click();
      };
      diplomaZone.ondragover = (e) => { e.preventDefault(); diplomaZone.classList.add('dragover'); };
      diplomaZone.ondragleave = () => diplomaZone.classList.remove('dragover');
      diplomaZone.ondrop = (e) => {
        e.preventDefault();
        diplomaZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
          diplomaInput.files = e.dataTransfer.files;
          diplomaInput.dispatchEvent(new Event('change'));
        }
      };
    }
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

  // ==============================================================
  // DEDICATED SEPARATE PAGE LOADERS (Class, Students, Schedule, Buddy, Dashboard)
  // ==============================================================
  // Helper methods to track and enforce permanently deleted subjects across local and server states
  getDeletedSubjects() {
    try {
      const user = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser : null;
      const key = user ? `aviora_deleted_subjects_${user.id || user.email}` : 'aviora_deleted_subjects';
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list.map(s => String(s || '').trim().toLowerCase()) : [];
    } catch (e) {
      return [];
    }
  },

  addDeletedSubject(subject) {
    if (!subject) return;
    try {
      const user = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser : null;
      const key = user ? `aviora_deleted_subjects_${user.id || user.email}` : 'aviora_deleted_subjects';
      const list = this.getDeletedSubjects();
      const lower = String(subject).trim().toLowerCase();
      if (!list.includes(lower)) {
        list.push(lower);
        localStorage.setItem(key, JSON.stringify(list));
      }
    } catch (e) {}
  },

  restoreDeletedSubject(subject) {
    if (!subject) return;
    try {
      const user = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser : null;
      const key = user ? `aviora_deleted_subjects_${user.id || user.email}` : 'aviora_deleted_subjects';
      const list = this.getDeletedSubjects().filter(s => s !== String(subject).trim().toLowerCase());
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {}
  },

  filterOutDeletedSubjects(list) {
    if (!Array.isArray(list)) return [];
    const deleted = this.getDeletedSubjects();
    if (deleted.length === 0) return list;
    return list.filter(s => {
      const lower = String(s || '').trim().toLowerCase();
      return !deleted.includes(lower);
    });
  },

  async ensureTeacherStatus() {
    const user = Auth.currentUser;
    if (!user || (user.role !== 'teacher' && user.role !== 'tutor')) return null;

    try {
      const statusData = await API.getTeacherStatus();
      this.application = statusData.application;
      this.tutorProfile = statusData.tutorProfile;
      if (this.application && Array.isArray(this.application.subjects)) {
        this.application.subjects = this.filterOutDeletedSubjects(this.application.subjects);
      }
      if (this.tutorProfile && Array.isArray(this.tutorProfile.subjects)) {
        this.tutorProfile.subjects = this.filterOutDeletedSubjects(this.tutorProfile.subjects);
      }
      return statusData;
    } catch (err) {
      console.error('Failed to get teacher status:', err);
      return null;
    }
  },

  isApproved() {
    return !!(this.application && this.application.status === 'approved');
  },

  hasSubmittedApplication() {
    if (!this.application) return false;
    if (this.application.status === 'approved' || this.application.status === 'pending' || this.application.status === 'rejected') {
      return true;
    }
    return !!(this.application.id || this.application.resume_file || this.application.diploma_file || this.application.credentials_file);
  },

  // Application stage for the tutor: not_submitted -> under_review -> interview -> approved (or rejected)
  getApplicationStage() {
    const app = this.application;
    if (!app) return 'not_submitted';
    if (app.status === 'approved') return 'approved';
    if (app.status === 'rejected') return 'rejected';
    if (!this.hasSubmittedApplication()) return 'not_submitted';
    if (app.interview_status === 'scheduled') return 'interview';
    return 'under_review';
  },

  formatInterviewDate(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(String(value || ''));
    if (!m) return value || '';
    const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    return d.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  },

  renderStatusBanner(targetContainerId) {
    const bannerContainer = document.getElementById(targetContainerId);
    if (!bannerContainer) return;

    const stage = this.getApplicationStage();
    const applicantName = (typeof Auth !== 'undefined' && Auth.currentUser && Auth.currentUser.name)
      ? Auth.currentUser.name
      : (this.application?.name || 'Applicant');

    if (stage === 'not_submitted') {
      bannerContainer.innerHTML = '';
      return;
    }

    if (stage === 'approved') {
      const currentUserId = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser.id : null;
      const isDismissed = currentUserId && localStorage.getItem(`aviora_dismissed_approved_banner_${currentUserId}`) === 'true';
      if (isDismissed) {
        bannerContainer.innerHTML = '';
        return;
      }

      // Show the approved status on the dashboard only; other pages stay clean
      bannerContainer.innerHTML = targetContainerId !== 'teacher-banner-dashboard' ? '' : `
        <div class="app-status-banner approved-dashboard" style="margin-bottom: 1.5rem; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: var(--radius-md); padding: 1.25rem; display: flex; gap: 1rem; align-items: flex-start; position: relative;">
          <div class="status-icon-circle" style="background: rgba(16, 185, 129, 0.2); color: #10B981; width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            ${Icons.check(22)}
          </div>
          <div class="status-banner-content" style="flex: 1;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
              <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700;">
                Tutor Application • ${applicantName}
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="status-pill approved" style="font-size: 0.75rem;">Status: Approved</span>
                <button type="button" class="btn btn-outline-secondary btn-xs" onclick="Teacher.dismissApprovedBanner()" title="Remove this banner so it no longer appears on your dashboard" style="font-size: 0.75rem; padding: 0.25rem 0.65rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; color: var(--text-secondary); border-color: rgba(16, 185, 129, 0.45); background: rgba(255, 255, 255, 0.9); cursor: pointer; font-weight: 700; transition: all 0.2s ease;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  <span>Remove</span>
                </button>
              </div>
            </div>
            <h3 style="color: var(--text-primary); margin: 0.2rem 0 0; font-size: 1.15rem; font-weight: 700;">
              Application Approved • All Features Accessible
            </h3>
            <div style="display: flex; align-items: center; margin: 0.85rem 0 0.4rem; flex-wrap: wrap; row-gap: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.45rem; flex: 1;">
                <span style="width: 22px; height: 22px; border-radius: 50%; background: #10B981; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700;">✓</span>
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); white-space: nowrap;">1. Application Submitted</span>
                <span style="flex: 1; height: 2px; min-width: 16px; background: #10B981; margin: 0 0.35rem;"></span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.45rem; flex: 1;">
                <span style="width: 22px; height: 22px; border-radius: 50%; background: #10B981; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700;">✓</span>
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); white-space: nowrap;">2. Virtual Interview</span>
                <span style="flex: 1; height: 2px; min-width: 16px; background: #10B981; margin: 0 0.35rem;"></span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.45rem; flex: 0 0 auto;">
                <span style="width: 22px; height: 22px; border-radius: 50%; background: #10B981; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700;">✓</span>
                <span style="font-size: 0.8rem; font-weight: 700; color: #10B981; white-space: nowrap;">3. Approved</span>
              </div>
            </div>
            <p style="color: var(--text-secondary); margin: 0.5rem 0 0 0; font-size: 0.88rem; line-height: 1.5;">
              Congratulations, <strong>${applicantName}</strong>! Your application has been marked as <strong>Approved</strong> by the administrator. All features are now accessible: you can begin operations, accept student bookings, and conduct classes.
            </p>
            <div style="margin-top: 0.65rem; background: rgba(16, 185, 129, 0.08); border-left: 3px solid #10B981; padding: 0.5rem 0.75rem; font-size: 0.82rem; color: var(--text-primary);">
              <strong style="display: inline-flex; align-items: center; gap: 0.35rem;">${Icons.checkCircle(15, 'color: #10B981;')} Live Operations Active:</strong> Your tutor profile is live in the Aviora directory and open for student lesson bookings and coursework management.
            </div>
          </div>
        </div>
      `;
      return;
    }

    if (stage === 'rejected') {
      bannerContainer.innerHTML = `
        <div class="app-status-banner rejected" style="margin-bottom: 1.5rem;">
          <div class="status-icon-circle">${Icons.x(18)}</div>
          <div class="status-banner-content">
            <h3 style="color: var(--text-primary);">Application Requires Revisions</h3>
            <p style="color: var(--text-secondary);">The Academic Board reviewed your application with feedback: <em>"${this.application?.admin_notes || 'Please provide updated degree verification or teaching credentials.'}"</em></p>
            <div style="margin-top: 0.75rem;">
              <button class="btn btn-primary btn-sm" onclick="Teacher.toggleEditApplication()">Update Credentials & Resubmit</button>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // Under review or interview stage: operations remain locked
    const isInterview = stage === 'interview';
    const accent = isInterview ? '#3B82F6' : '#F59E0B';
    const accentBg = isInterview ? 'rgba(59, 130, 246, 0.08)' : 'rgba(245, 158, 11, 0.08)';
    const accentBorder = isInterview ? 'rgba(59, 130, 246, 0.35)' : 'rgba(245, 158, 11, 0.35)';

    const steps = [
      { key: 'under_review', label: '1. Under Review' },
      { key: 'interview', label: '2. Virtual Interview' },
      { key: 'approved', label: '3. Final Approval' }
    ];
    const currentIndex = isInterview ? 1 : 0;

    const tracker = steps.map((s, i) => {
      const done = i < currentIndex;
      const active = i === currentIndex;
      const dotBg = done ? '#10B981' : active ? accent : 'rgba(0,0,0,0.12)';
      const textColor = (done || active) ? 'var(--text-primary)' : 'var(--text-secondary)';
      return `
        <div style="display: flex; align-items: center; gap: 0.45rem; flex: ${i < steps.length - 1 ? '1' : '0 0 auto'};">
          <span style="width: 22px; height: 22px; border-radius: 50%; background: ${dotBg}; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; flex-shrink: 0;">${done ? '✓' : i + 1}</span>
          <span style="font-size: 0.8rem; font-weight: ${active ? '700' : '600'}; color: ${textColor}; white-space: nowrap;">${s.label}</span>
          ${i < steps.length - 1 ? `<span style="flex: 1; height: 2px; min-width: 16px; background: ${done ? '#10B981' : 'rgba(0,0,0,0.1)'}; margin: 0 0.35rem;"></span>` : ''}
        </div>
      `;
    }).join('');

    const title = isInterview
      ? 'Application Approved • Next Step: Virtual Interview'
      : 'Application Under Review • Pending Admin Approval';

    const statusPill = isInterview
      ? '<span class="status-pill accepted" style="font-size: 0.75rem;">Status: Virtual Interview Scheduled</span>'
      : '<span class="status-pill pending" style="font-size: 0.75rem;">Status: Under Review</span>';

    const message = isInterview
      ? `Your application has been approved by the Administrator! The next step is your virtual interview, scheduled for <strong>${this.formatInterviewDate(this.application.interview_scheduled_at)}</strong>. Check your <strong>notification bell</strong> in the top header to see the date and time set by the admin for your interview.`
      : `The submitted application is currently under review under the name of the applicant (<strong>${applicantName}</strong>). You will be notified once a schedule for your virtual interview is set.`;

    const operationalNotice = isInterview
      ? `<strong style="display: inline-flex; align-items: center; gap: 0.35rem;">${Icons.lock(14, 'color: #D97706;')} Operational Notice:</strong> You still cannot begin operations during the interview phase. Once the administrator marks your application as "Approved" following your interview, all features become accessible to begin operations, accept student bookings, and conduct classes.`
      : `<strong style="display: inline-flex; align-items: center; gap: 0.35rem;">${Icons.lock(14, 'color: #D97706;')} Operational Notice:</strong> While your application is under review or pending approval, you cannot yet begin operations, though you can still view the website's content through your account.`;

    bannerContainer.innerHTML = `
      <div class="app-status-banner pending-dashboard" style="margin-bottom: 1.5rem; background: ${accentBg}; border: 1px solid ${accentBorder}; border-radius: var(--radius-md); padding: 1.25rem; display: flex; gap: 1rem; align-items: flex-start;">
        <div class="status-icon-circle" style="background: ${accentBg}; color: ${accent}; width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          ${isInterview ? Icons.calendar(22) : Icons.hourglass(22)}
        </div>
        <div class="status-banner-content" style="flex: 1;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
            <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700;">
              Tutor Application • Applicant: ${applicantName}
            </div>
            ${statusPill}
          </div>
          <h3 style="color: var(--text-primary); margin: 0.2rem 0 0; font-size: 1.15rem; font-weight: 700;">${title}</h3>
          <div style="display: flex; align-items: center; margin: 0.85rem 0 0.25rem; flex-wrap: wrap; row-gap: 0.5rem;">${tracker}</div>
          <p style="color: var(--text-secondary); margin: 0.6rem 0 0 0; font-size: 0.88rem; line-height: 1.5;">${message}</p>
          <div style="margin-top: 0.65rem; background: rgba(0, 0, 0, 0.04); border-left: 3px solid ${accent}; padding: 0.5rem 0.75rem; font-size: 0.82rem; color: var(--text-primary);">
            ${operationalNotice}
          </div>
          <div style="margin-top: 0.75rem; display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
            ${isInterview ? `
              <button class="btn btn-primary btn-sm" onclick="document.getElementById('notif-bell-btn')?.click();" style="display: inline-flex; align-items: center; gap: 0.4rem;">
                ${Icons.bell(15)} Check Notification Bell
              </button>
            ` : ''}
            <button class="btn btn-outline-gold btn-sm" onclick="Teacher.toggleEditApplication()">View / Update Submitted Documents</button>
          </div>
        </div>
      </div>
    `;
  },

  dismissApprovedBanner() {
    // Only verified/approved tutors can remove the approved status banner
    if (this.getApplicationStage() !== 'approved') return;
    const currentUserId = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser.id : null;
    if (currentUserId) {
      try {
        localStorage.setItem(`aviora_dismissed_approved_banner_${currentUserId}`, 'true');
      } catch (e) {}
    }
    const bannerContainer = document.getElementById('teacher-banner-dashboard');
    if (bannerContainer) {
      bannerContainer.innerHTML = '';
    }
    showToast('Application status banner removed from dashboard.', 'info');
  },

  // 1. Dedicated Class Page
  async loadClassesPage() {
    this.currentTab = 'classes';
    await this.ensureTeacherStatus();
    this.renderStatusBanner('teacher-banner-classes');
    await Promise.all([this.loadClasses(), this.loadSchedule()]);
    if (typeof Router !== 'undefined' && Router.updateActiveNav) Router.updateActiveNav();
  },

  // 2. Dedicated Students Page
  async loadStudentsPage() {
    this.currentTab = 'students';
    await this.ensureTeacherStatus();
    this.renderStatusBanner('teacher-banner-students');
    await this.loadStudents();
    await this.loadTasks();
    if (typeof Router !== 'undefined' && Router.updateActiveNav) Router.updateActiveNav();

    // Start live polling for student inquiries while on the Students page
    if (!this.studentsInquiriesPollInterval) {
      this.studentsInquiriesPollInterval = setInterval(async () => {
        const view = document.getElementById('view-teacher-students');
        if (view && view.style.display !== 'none' && document.visibilityState !== 'hidden') {
          try {
            const data = await API.getTeacherStudents();
            if (data && data.students) {
              const prevJson = JSON.stringify((this.students || []).map(s => ({ id: s.student_id, inq: s.inquiries ? s.inquiries.length : 0, last: s.latest_inquiry?.id })));
              const nextJson = JSON.stringify((data.students || []).map(s => ({ id: s.student_id, inq: s.inquiries ? s.inquiries.length : 0, last: s.latest_inquiry?.id })));
              if (prevJson !== nextJson) {
                this.students = data.students;
                this.renderStudents();
                this.renderStudentInquiries();
              }
            }
          } catch (e) {}
        }
      }, 3000);
    }
  },

  // 3. Dedicated Schedule Page
  async loadSchedulePage() {
    this.currentTab = 'schedule';
    await this.ensureTeacherStatus();
    this.renderStatusBanner('teacher-banner-schedule');
    this.setupCalendarListeners();
    await this.loadSchedule();
    if (typeof Router !== 'undefined' && Router.updateActiveNav) Router.updateActiveNav();
  },

  // 4. Dedicated Messages Page (Student Chats Hub)
  async loadMessagesPage() {
    this.currentTab = 'messages';
    await this.ensureTeacherStatus();
    this.renderStatusBanner('teacher-banner-messages');
    await this.loadTeacherMessages();
    if (typeof Router !== 'undefined' && Router.updateActiveNav) Router.updateActiveNav();
  },

  // 5. Dedicated Aviora Buddy Page (Removed from Teacher)
  async loadBuddyPage() {
    window.location.hash = '#teacher-dashboard';
  },

  // 5. Dedicated Dashboard Page
  async loadDashboardPage() {
    this.currentTab = 'dashboard';
    await this.ensureTeacherStatus();
    this.renderStatusBanner('teacher-banner-dashboard');

    const user = Auth.currentUser;
    const heroName = document.getElementById('teacher-hero-name');
    const heroBio = document.getElementById('teacher-hero-bio');
    const heroTag = document.getElementById('teacher-headline-tag');
    const heroAvatar = document.getElementById('teacher-hero-avatar');

    if (heroName) heroName.textContent = user?.name || 'Dr. Elena Vance';
    if (heroBio) heroBio.textContent = this.tutorProfile?.bio || this.application?.bio || 'Educator workspace for live virtual classroom sessions, student coursework management, schedule availability, and financial earnings tracking.';
    if (heroTag) heroTag.textContent = this.tutorProfile?.headline || this.application?.headline || 'Verified Academic Educator';
    if (heroAvatar && (user?.avatar || this.tutorProfile?.avatar)) {
      heroAvatar.src = user?.avatar || this.tutorProfile.avatar;
    }

    const countryVal = this.tutorProfile?.country || (typeof localStorage !== 'undefined' ? localStorage.getItem('aviora_country') : null) || 'United States';
    const tzVal = this.tutorProfile?.timezone || (typeof localStorage !== 'undefined' ? localStorage.getItem('aviora_timezone') : null) || 'America/New_York';
    const dashFlag = document.getElementById('teacher-dashboard-country-flag');
    const dashName = document.getElementById('teacher-dashboard-country-name');
    const dashClock = document.getElementById('teacher-dashboard-live-clock');
    if (dashFlag && typeof AvioraGeo !== 'undefined') dashFlag.textContent = AvioraGeo.getCountryFlag(countryVal);
    if (dashName) dashName.textContent = countryVal;
    if (dashClock) {
      dashClock.setAttribute('data-tz', tzVal);
      if (typeof AvioraGeo !== 'undefined') {
        const timeStr = AvioraGeo.getCurrentTimeInZone(tzVal);
        const tzAbbr = AvioraGeo.getTimezoneAbbr(tzVal);
        dashClock.textContent = `${timeStr} (${tzAbbr})`;
      }
    }

    await this.loadTeacherDashboard();
    if (typeof Router !== 'undefined' && Router.updateActiveNav) Router.updateActiveNav();
  },

  // 5b. Dedicated Ratings Page (Strictly Read-Only)
  async loadRatingsPage() {
    this.currentTab = 'ratings';
    await this.ensureTeacherStatus();
    this.renderStatusBanner('teacher-banner-ratings');

    const tableBody = document.getElementById('teacher-ratings-table-body');
    const summaryAvg = document.getElementById('ratings-summary-avg');
    const summaryCount = document.getElementById('ratings-summary-count');
    const summaryPercent = document.getElementById('ratings-summary-percent');

    try {
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
              Loading verified student evaluations...
            </td>
          </tr>
        `;
      }

      const res = await API.getTeacherRatings();
      const reviews = res.reviews || [];
      const stats = res.stats || {};

      if (summaryAvg) summaryAvg.textContent = stats.average != null ? stats.average.toFixed(1) : '5.0';
      if (summaryCount) summaryCount.textContent = stats.count != null ? stats.count : reviews.length;
      if (summaryPercent) summaryPercent.textContent = (stats.five_star_percent != null ? stats.five_star_percent : 100) + '%';

      if (!tableBody) return;

      if (!reviews.length) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">
              <div style="font-size: 1.05rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.35rem;">No student reviews recorded yet</div>
              <div style="font-size: 0.85rem;">Official evaluations submitted by students upon completing tutoring sessions will automatically appear in this ledger.</div>
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = reviews.map(rev => {
        const studentName = rev.student_name || 'Verified Student';
        const studentAvatar = rev.student_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=C68A28&color=fff`;
        const schoolOrGrade = rev.student_school || rev.student_grade || 'Aviora Learner';
        const subject = rev.session_subject || rev.subject || 'Calculus BC';
        const ratingNum = Math.max(1, Math.min(5, Math.round(Number(rev.rating) || 5)));
        const comment = rev.comment ? this.escapeHtml(rev.comment) : 'Outstanding guidance and clear explanations throughout the session.';

        let dateStr = 'Recent';
        if (rev.created_at) {
          const d = new Date(rev.created_at);
          dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }

        const starsHtml = '★'.repeat(ratingNum) + '☆'.repeat(Math.max(0, 5 - ratingNum));

        return `
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <img src="${this.escapeHtml(studentAvatar)}" alt="${this.escapeHtml(studentName)}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(198, 138, 40, 0.3);" />
                <div>
                  <div style="font-weight: 700; color: var(--text-primary); font-size: 0.92rem;">${this.escapeHtml(studentName)}</div>
                  <div style="font-size: 0.78rem; color: var(--text-secondary);">${this.escapeHtml(schoolOrGrade)}</div>
                </div>
              </div>
            </td>
            <td>
              <span class="badge-gold" style="font-size: 0.78rem; padding: 0.25rem 0.55rem;">${this.escapeHtml(subject)}</span>
            </td>
            <td>
              <div style="display: flex; flex-direction: column; gap: 0.15rem;">
                <span style="color: #e5a50a; font-size: 1.05rem; letter-spacing: 1px;">${starsHtml}</span>
                <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-secondary);">${ratingNum}.0 / 5.0</span>
              </div>
            </td>
            <td>
              <div style="font-size: 0.88rem; color: var(--text-primary); line-height: 1.5; font-style: italic; background: rgba(0,0,0,0.02); padding: 0.65rem 0.85rem; border-radius: 6px; border-left: 3px solid var(--gold-500);">
                "${comment}"
              </div>
            </td>
            <td style="font-size: 0.82rem; color: var(--text-secondary); white-space: nowrap;">
              ${this.escapeHtml(dateStr)}
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to load ratings page:', err);
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 2rem; color: #ef4444;">
              Failed to load student ratings ledger. Please try again later.
            </td>
          </tr>
        `;
      }
    } finally {
      if (typeof Router !== 'undefined' && Router.updateActiveNav) Router.updateActiveNav();
    }
  },

  // 6. Dedicated Application Page
  // 6. Dedicated Application Page
  async loadApplicationPage() {
    await this.ensureTeacherStatus();
    const appSection = document.getElementById('teacher-application-section');
    const bannerContainer = document.getElementById('teacher-banner-application');
    if (bannerContainer) bannerContainer.innerHTML = '';

    if (!this.initialApplicationFormHtml && appSection) {
      this.initialApplicationFormHtml = appSection.innerHTML;
    }

    const hasSubmitted = this.hasSubmittedApplication();

    if (hasSubmitted && !this.showEditApplicationForm) {
      this.renderApplicationUnderReviewView();
    } else {
      if (appSection && this.initialApplicationFormHtml) {
        appSection.innerHTML = this.initialApplicationFormHtml;
        this.setupApplicationFormListeners();
        this.populateApplicationForm();

        const proceedBtn = document.getElementById('btn-proceed-dashboard');
        if (proceedBtn) {
          proceedBtn.style.display = hasSubmitted ? 'inline-flex' : 'none';
        }

        const submitBtn = document.getElementById('submit-teacher-app-btn');
        if (submitBtn) {
          submitBtn.innerHTML = '<span>' + (hasSubmitted ? 'Update Submitted Documents' : 'Submit Application') + '</span> <span>→</span>';
        }

        if (this.showEditApplicationForm) {
          const banner = document.createElement('div');
          banner.style.cssText = 'margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.35); padding: 0.85rem 1.25rem; border-radius: var(--radius-md);';
          banner.innerHTML = `
            <div style="font-size: 0.9rem; color: var(--text-primary);">
              <strong>Updating Application Credentials:</strong> You can update qualifications or replace documents.
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="Teacher.toggleEditApplication()">
              ← Back to Review Status
            </button>
          `;
          appSection.insertBefore(banner, appSection.firstChild);
        }
      }
    }

    if (typeof Router !== 'undefined' && Router.updateActiveNav) Router.updateActiveNav();
  },

  renderApplicationUnderReviewView() {
    const appSection = document.getElementById('teacher-application-section');
    if (!appSection) return;

    const app = this.application || {};
    const user = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser : {};
    const applicantName = user.name || app.name || 'Joshua Garcia';
    const isApproved = app.status === 'approved';
    const isInterview = !isApproved && app.interview_status === 'scheduled';
    const accent = isApproved ? '#10B981' : (isInterview ? '#3B82F6' : '#F59E0B');
    const accentBg = isApproved ? 'rgba(16, 185, 129, 0.08)' : (isInterview ? 'rgba(59, 130, 246, 0.08)' : 'rgba(245, 158, 11, 0.08)');
    const accentBorder = isApproved ? 'rgba(16, 185, 129, 0.35)' : (isInterview ? 'rgba(59, 130, 246, 0.35)' : 'rgba(245, 158, 11, 0.35)');

    let interviewNotice = `Your submitted credentials and academic qualifications are undergoing review by the Academic Board. You will be notified once a schedule for your virtual interview is set.`;
    if (isApproved) {
      interviewNotice = `Congratulations, <strong>${applicantName}</strong>! Following your virtual interview, your educator application was officially approved by the Academic Board. All teacher operations and functions are fully unlocked across your account.`;
    } else if (isInterview) {
      interviewNotice = `Virtual interview is scheduled for <strong>${this.formatInterviewDate(app.interview_scheduled_at)}</strong>. Please check your notification bell in the top header for instructions.`;
    }

    const currentSubjs = (this.subjects && this.subjects.length > 0) ? this.subjects : (app.subjects || []);
    const subjectsArr = this.filterOutDeletedSubjects(Array.isArray(currentSubjs) ? currentSubjs : (typeof currentSubjs === 'string' ? currentSubjs.split(',').map(s => s.trim()).filter(Boolean) : ['Mathematics', 'Algebra']));
    const subjectsBadges = subjectsArr.map(s => `<span class="badge-gold" style="font-size: 0.8rem; margin-right: 0.35rem; margin-bottom: 0.35rem; display: inline-block;">${s}</span>`).join('');

    appSection.innerHTML = `
      <div style="text-align: center; margin-bottom: 2rem;">
        <span class="badge-gold" style="font-size: 0.8rem; padding: 0.35rem 0.85rem;">${isApproved ? 'EDUCATOR ACCREDITATION • FULLY APPROVED' : 'EDUCATOR ACCREDITATION • UNDER REVIEW'}</span>
        <h2 style="font-size: 1.85rem; color: var(--text-primary); margin-top: 0.65rem; font-weight: 800;">
          ${isApproved ? 'Application Approved & Active' : 'Application Under Review'}
        </h2>
        <p style="font-size: 0.95rem; color: var(--text-secondary); max-width: 680px; margin: 0.5rem auto 0; line-height: 1.6;">
          ${isApproved
        ? 'Your tutor credentials and virtual interview have been approved. All operational features are unlocked for live teaching, booking management, and coursework.'
        : 'Your tutor application is currently under review by the Academic Board. <strong style="color: var(--text-primary);">There is no need to re-apply or fill out the form again.</strong> You can explore and view everything within your account while the review is underway.'}
        </p>
      </div>

      <!-- Main Status Card -->
      <div style="background: ${accentBg}; border: 1.5px solid ${accentBorder}; border-radius: var(--radius-lg, 16px); padding: 1.75rem; margin-bottom: 2rem;">
        <div style="display: flex; gap: 1.25rem; align-items: flex-start; flex-wrap: wrap;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: ${isApproved ? 'rgba(16, 185, 129, 0.2)' : (isInterview ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)')}; color: ${accent}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            ${isApproved ? Icons.check(24) : (isInterview ? Icons.calendar(24) : Icons.hourglass(24))}
          </div>
          <div style="flex: 1; min-width: 260px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
              <span style="font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: var(--text-secondary);">
                Applicant: ${applicantName} • Application ID: #${app.id || 'APP-2026'}
              </span>
              <span class="status-pill ${isApproved ? 'approved' : 'pending'}" style="font-size: 0.8rem; background: ${accentBg}; color: ${accent}; border: 1px solid ${accentBorder};">
                ● ${isApproved ? 'Status: Approved & Active' : (isInterview ? 'Virtual Interview Scheduled' : 'Status: Under Review')}
              </span>
            </div>
            <h3 style="color: var(--text-primary); font-size: 1.25rem; margin: 0.4rem 0 0.25rem; font-weight: 800;">
              ${isApproved ? 'Accreditation Approved • All Operations Unlocked' : (isInterview ? 'Interview Scheduled • Pending Board Confirmation' : 'Credentials Under Review • No Further Action Needed')}
            </h3>
            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin: 0.4rem 0 0;">
              ${interviewNotice}
            </p>
          </div>
        </div>

        <!-- 3-Step Verification Pipeline -->
        <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid ${accentBorder};">
          <div style="font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin-bottom: 0.85rem;">
            Accreditation Progress
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <!-- Step 1 -->
            <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 170px;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: #10B981; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700;">✓</span>
              <div>
                <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary);">1. Application Submitted</div>
                <div style="font-size: 0.72rem; color: #10B981; font-weight: 600;">Completed</div>
              </div>
              <span style="flex: 1; height: 2px; min-width: 12px; background: #10B981; margin: 0 0.25rem;"></span>
            </div>

            <!-- Step 2 -->
            <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 170px;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: #10B981; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700;">✓</span>
              <div>
                <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary);">2. Virtual Interview</div>
                <div style="font-size: 0.72rem; color: #10B981; font-weight: 600;">${isApproved ? 'Completed & Verified' : (isInterview ? 'Interview Scheduled' : 'Pending Scheduling')}</div>
              </div>
              <span style="flex: 1; height: 2px; min-width: 12px; background: ${isApproved || isInterview ? '#10B981' : 'rgba(0,0,0,0.1)'}; margin: 0 0.25rem;"></span>
            </div>

            <!-- Step 3 -->
            <div style="display: flex; align-items: center; gap: 0.5rem; flex: 0 0 auto;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: ${isApproved ? '#10B981' : 'rgba(0,0,0,0.12)'}; color: ${isApproved ? '#fff' : 'var(--text-secondary)'}; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700;">${isApproved ? '✓' : '3'}</span>
              <div>
                <div style="font-size: 0.82rem; font-weight: ${isApproved ? '700' : '600'}; color: ${isApproved ? '#10B981' : 'var(--text-secondary)'};">3. Final Approval</div>
                <div style="font-size: 0.72rem; color: ${isApproved ? '#10B981' : 'var(--text-secondary)'}; font-weight: 600;">${isApproved ? 'Approved & Operating' : 'Unlocks operations'}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Operational Status Box -->
        ${isApproved ? `
          <div style="margin-top: 1.25rem; background: rgba(16, 185, 129, 0.12); border-left: 3px solid #10B981; padding: 0.85rem 1.1rem; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; font-size: 0.86rem; color: var(--text-primary); line-height: 1.55;">
            <strong style="display: inline-flex; align-items: center; gap: 0.35rem;">${Icons.checkCircle(16, 'color: #10B981;')} Live Operations Active:</strong> Your tutor account has received final approval from the Administrator following your virtual interview. All operational functions are accessible: you can now conduct live virtual classes, accept student booking requests, assign coursework, and update your public teaching rates and availability schedule.
          </div>
          <div style="margin-top: 1rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <a href="#teacher-classes" class="btn btn-primary btn-sm">View Classes &amp; Launch Sessions →</a>
            <a href="#teacher-schedule" class="btn btn-secondary btn-sm">Configure Schedule Availability →</a>
            <a href="#teacher-profile" class="btn btn-secondary btn-sm">Configure Profile &amp; Rates →</a>
          </div>
        ` : `
          <div style="margin-top: 1.25rem; background: rgba(0,0,0,0.05); border-left: 3px solid ${accent}; padding: 0.75rem 1rem; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; font-size: 0.84rem; color: var(--text-primary); line-height: 1.55;">
            <strong style="display: inline-flex; align-items: center; gap: 0.35rem;">${Icons.lock(15, 'color: ' + accent + ';')} Operational Lock Notice:</strong> While your application is under review, you can freely view and explore everything within your account (Dashboard, Classes, Students, and Schedule). Operational actions (conducting live sessions, assigning tasks, and accepting student bookings) remain locked until your application is approved following your virtual interview.
          </div>
        `}
      </div>

      <!-- Submitted Information Overview (Read-Only) -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-lg, 16px); padding: 1.75rem; margin-bottom: 2rem; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-light);">
          <div>
            <h3 style="font-size: 1.15rem; color: var(--text-primary); margin: 0; font-weight: 700;">Submitted Qualifications &amp; Credentials</h3>
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0.2rem 0 0;">These credentials were recorded upon application submission and are under review.</p>
          </div>
          <span class="badge-gold" style="font-size: 0.75rem;">Verified on File</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem;">
          <div>
            <div style="font-size: 0.76rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Professional Headline</div>
            <div style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary); margin-top: 0.25rem;">
              ${app.headline || 'Mathematics & Calculus Specialist'}
            </div>
          </div>

          <div>
            <div style="font-size: 0.76rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Academic Degree &amp; University</div>
            <div style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary); margin-top: 0.25rem;">
              ${app.highest_degree || 'Bachelor of Science in Education'}
              <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: normal;">• ${app.institution || 'University of California, Berkeley'} (${app.graduation_year || 2021})</span>
            </div>
          </div>

          <div>
            <div style="font-size: 0.76rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Tutoring Experience</div>
            <div style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary); margin-top: 0.25rem;">
              ${app.years_experience || 3} Years Teaching / Tutoring Experience
            </div>
          </div>

          <div>
            <div style="font-size: 0.76rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Preferred Hourly Rate</div>
            <div style="font-size: 0.95rem; font-weight: 700; color: var(--gold-600); margin-top: 0.25rem;">
              $${Number(app.hourly_rate || 45).toFixed(2)} USD / hr
            </div>
          </div>

          <div style="grid-column: 1 / -1;">
            <div style="font-size: 0.76rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.35rem;">Subjects Taught</div>
            <div>${subjectsBadges}</div>
          </div>

          <div style="grid-column: 1 / -1; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.5rem; padding-top: 1rem; border-top: 1px solid var(--border-light);">
            <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-md); padding: 0.85rem 1rem; display: flex; align-items: center; gap: 0.75rem;">
              <span style="display: flex; align-items: center; color: #10B981;">${Icons.fileText(24)}</span>
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 0.78rem; font-weight: 700; color: #10B981; text-transform: uppercase;">1. Applicant Resume / CV</div>
                <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${app.resume_filename || 'Joshua_Garcia_Resume.pdf'}
                </div>
              </div>
              <span style="color: #10B981; font-weight: 700; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 0.25rem;">${Icons.check(13)} Submitted</span>
            </div>

            <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-md); padding: 0.85rem 1rem; display: flex; align-items: center; gap: 0.75rem;">
              <span style="display: flex; align-items: center; color: #10B981;">${Icons.award(24)}</span>
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 0.78rem; font-weight: 700; color: #10B981; text-transform: uppercase;">2. Degree Diploma</div>
                <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${app.diploma_filename || 'UC_Berkeley_Diploma.pdf'}
                </div>
              </div>
              <span style="color: #10B981; font-weight: 700; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 0.25rem;">${Icons.check(13)} Submitted</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Platform Navigation Links (Explore everything in view mode) -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-lg, 16px); padding: 1.75rem; text-align: center;">
        <h3 style="font-size: 1.15rem; color: var(--text-primary); margin: 0 0 0.35rem; font-weight: 700;">
          Explore Your Account Sections (View Mode)
        </h3>
        <p style="font-size: 0.88rem; color: var(--text-secondary); max-width: 600px; margin: 0 auto 1.5rem; line-height: 1.55;">
          You can view everything within your account right now. Check your dashboard metrics, see your scheduled timetable calendar, or inspect classes.
        </p>

        <div style="display: flex; gap: 0.75rem; justify-content: center; align-items: center; flex-wrap: wrap;">
          <button type="button" class="btn btn-primary" onclick="Teacher.proceedToDashboard()">
            Explore Dashboard →
          </button>
          <button type="button" class="btn btn-outline-gold" onclick="window.location.hash='#teacher-classes';">
            View Classes
          </button>
          <button type="button" class="btn btn-outline-gold" onclick="window.location.hash='#teacher-students';">
            View Students
          </button>
          <button type="button" class="btn btn-outline-gold" onclick="window.location.hash='#teacher-schedule';">
            View Schedule Calendar
          </button>
        </div>

        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-light); font-size: 0.82rem; color: var(--text-secondary);">
          <span>Need to modify or replace your submitted credentials? </span>
          <button type="button" class="btn btn-link" style="font-size: 0.82rem; color: var(--gold-600); text-decoration: underline; background: none; border: none; cursor: pointer; padding: 0;" onclick="Teacher.toggleEditApplication()">
            Update Submitted Documents
          </button>
        </div>
      </div>
    `;
  },

  // Backward compatibility alias for any existing caller
  async loadTeacherView(hash = null) {
    const currentHash = hash || window.location.hash || '#teacher-dashboard';
    if (currentHash === '#teacher-classes' || currentHash === '#teacher-class') {
      await this.loadClassesPage();
    } else if (currentHash === '#teacher-students') {
      await this.loadStudentsPage();
    } else if (currentHash === '#teacher-schedule') {
      await this.loadSchedulePage();
    } else if (currentHash === '#teacher-ratings' || currentHash === '#teacher-reviews') {
      await this.loadRatingsPage();
    } else if (currentHash === '#teacher-messages') {
      window.location.hash = '#teacher-students';
      return;
    } else if (currentHash === '#teacher-buddy') {
      window.location.hash = '#teacher-dashboard';
    } else if (currentHash === '#teacher-application') {
      await this.loadApplicationPage();
    } else if (currentHash === '#teacher-profile') {
      await this.loadProfilePage();
    } else {
      await this.loadDashboardPage();
    }
  },

  // Separate page navigation helper
  switchTab(tabId) {
    if (tabId === 'classes') window.location.hash = '#teacher-classes';
    else if (tabId === 'students') window.location.hash = '#teacher-students';
    else if (tabId === 'schedule') window.location.hash = '#teacher-schedule';
    else if (tabId === 'ratings' || tabId === 'reviews') window.location.hash = '#teacher-ratings';
    else if (tabId === 'messages') window.location.hash = '#teacher-students';
    else if (tabId === 'profile') window.location.hash = '#teacher-profile';
    else {
      window.location.hash = '#teacher-dashboard';
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

      // 2. Aviora Platform Commission / Cut (30%)
      const cutEl = document.getElementById('teacher-stat-commission-cut');
      const cutVal = stats.platform_commission_amount != null ? stats.platform_commission_amount : (grossVal * 0.30);
      if (cutEl) cutEl.textContent = `$${cutVal.toFixed(2)}`;

      // 3. Net Tutor Take-Home Earnings (70%)
      const netEl = document.getElementById('teacher-stat-net-earnings');
      const netVal = stats.net_earnings_tutor != null ? stats.net_earnings_tutor : (grossVal * 0.70);
      if (netEl) netEl.textContent = `$${netVal.toFixed(2)}`;

      // Update Request Withdrawal button state next to salary amount
      const requestBtn = document.getElementById('btn-request-payout-dashboard');
      if (requestBtn) {
        if (stats.has_pending_payout) {
          requestBtn.disabled = true;
          requestBtn.innerHTML = `${Icons.check(13)} Requested`;
          requestBtn.style.background = 'rgba(16, 185, 129, 0.15)';
          requestBtn.style.color = '#10B981';
          requestBtn.style.borderColor = 'rgba(16, 185, 129, 0.3)';
          requestBtn.style.boxShadow = 'none';
          requestBtn.style.cursor = 'default';
          requestBtn.title = 'Withdrawal request submitted, pending administrator review';
        } else if (netVal <= 0) {
          requestBtn.disabled = true;
          requestBtn.innerHTML = `Request`;
          requestBtn.style.opacity = '0.5';
          requestBtn.style.cursor = 'not-allowed';
          requestBtn.title = 'No earnings available to withdraw yet';
        } else {
          requestBtn.disabled = false;
          requestBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 0.25rem;"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>Request`;
          requestBtn.style.opacity = '1';
          requestBtn.style.cursor = 'pointer';
          requestBtn.style.background = '';
          requestBtn.style.color = '';
          requestBtn.style.borderColor = '';
          requestBtn.style.boxShadow = '0 2px 6px rgba(198, 138, 40, 0.25)';
          requestBtn.title = `Request salary withdrawal of $${netVal.toFixed(2)}`;
        }
      }

      // 4. Current Month Net Payout & Sessions
      const monthNetEl = document.getElementById('teacher-stat-month-net');
      if (monthNetEl) monthNetEl.textContent = `$${(stats.current_month_net || 0).toFixed(2)}`;

      const completedCountEl = document.getElementById('teacher-stat-completed-count');
      if (completedCountEl) completedCountEl.textContent = stats.completed_sessions || 0;

      const activeSessionsEl = document.getElementById('teacher-stat-active-sessions');
      if (activeSessionsEl) activeSessionsEl.textContent = stats.active_sessions || 0;

      const ratingEl = document.getElementById('teacher-stat-rating');
      if (ratingEl) ratingEl.innerHTML = `${Icons.star(14, 'margin-right: 2px;', '#F59E0B')} ${stats.rating?.toFixed(1) || '5.0'} (${stats.reviews_count || 0})`;

      const headerRatingValEl = document.getElementById('teacher-header-rating-val');
      if (headerRatingValEl) headerRatingValEl.textContent = stats.rating != null ? stats.rating.toFixed(1) : '5.0';

      const headerReviewsCountEl = document.getElementById('teacher-header-reviews-count');
      if (headerReviewsCountEl) headerReviewsCountEl.textContent = stats.reviews_count != null ? stats.reviews_count : '0';

      // Render Tables
      this.renderMonthlyFinancials(data.monthlyFinancials || []);
      this.renderStudentRevenueBreakdown(data.studentRevenueBreakdown || []);
      this.renderTeacherRequests();
      this.populateProfileSettings(data.tutorProfile);
      await this.loadTeacherMessages();
    } catch (err) {
      console.error('Failed to load teacher dashboard:', err);
    }
  },

  async requestSalaryPayout() {
    try {
      const stats = this.dashboardData?.stats || {};
      const netVal = stats.net_earnings_tutor != null ? stats.net_earnings_tutor : ((stats.gross_revenue_students || 0) * 0.70);

      if (stats.has_pending_payout) {
        showToast('A salary withdrawal request is already pending administrator processing.', 'info');
        return;
      }

      if (netVal <= 0) {
        showToast('No earnings available for withdrawal at this time.', 'info');
        return;
      }

      const confirmed = confirm(`Submit a salary withdrawal request for $${netVal.toFixed(2)} (70% net tutor share after 30% company commission)?\n\nThis will immediately notify the administrator to review and process your payout.`);
      if (!confirmed) return;

      const btn = document.getElementById('btn-request-payout-dashboard');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Submitting...';
      }

      const res = await API.requestTeacherPayout({ amount: netVal });

      if (res && res.success) {
        showToast(res.message || 'Withdrawal request submitted! Administrator has been notified.', 'success');
        if (typeof NotificationsUI !== 'undefined' && NotificationsUI.fetchRealtimeUpdates) {
          NotificationsUI.fetchRealtimeUpdates();
        }
        await this.loadTeacherDashboard();
      } else {
        showToast(res?.error || 'Failed to submit withdrawal request. Please try again.', 'error');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 0.25rem;"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>Request`;
        }
      }
    } catch (err) {
      console.error('Request salary payout error:', err);
      showToast(err.message || 'Failed to submit withdrawal request.', 'error');
      const btn = document.getElementById('btn-request-payout-dashboard');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 0.25rem;"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>Request`;
      }
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

    const hasPendingPayout = this.dashboardData?.stats?.has_pending_payout || false;

    tbody.innerHTML = monthlyList.map(m => {
      const gross = Number(m.gross_amount || 0);
      const commission = Number(m.commission_cut || (gross * 0.30));
      const net = Number(m.net_payout || (gross - commission));
      const isRequested = hasPendingPayout || m.status === 'Payout Requested' || m.status === 'Pending Admin Review';
      const isDisbursed = m.status === 'Disbursed' || m.status === 'Paid Out';

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.45rem;">
              <span style="color: var(--gold-400);">${Icons.calendar(15)}</span>
              <strong style="color: var(--text-primary); font-size: 0.95rem;">${m.month_label}</strong>
            </div>
          </td>
          <td style="color: var(--text-secondary);">
            ${m.students_count} active student${m.students_count === 1 ? '' : 's'}
          </td>
          <td>
            <span class="badge-gold" style="font-size: 0.78rem; font-weight: 600;">${m.sessions_count} lesson${m.sessions_count === 1 ? '' : 's'}</span>
          </td>
          <td>
            <strong style="color: var(--gold-400); font-weight: 700; font-size: 0.95rem;">$${gross.toFixed(2)}</strong>
          </td>
          <td>
            <span style="color: #EF4444; font-weight: 600;">-$${commission.toFixed(2)}</span>
            <span style="font-size: 0.75rem; color: #EF4444; opacity: 0.85; margin-left: 0.2rem;">(30%)</span>
          </td>
          <td>
            <strong style="color: #10B981; font-size: 1rem; font-weight: 800;">$${net.toFixed(2)}</strong>
            <span style="font-size: 0.75rem; color: #10B981; opacity: 0.85; margin-left: 0.2rem;">(70%)</span>
          </td>
          <td style="text-align: right;">
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem;">
              ${isDisbursed ? `
                <span class="status-pill accepted" style="font-size: 0.775rem;">Disbursed</span>
              ` : isRequested ? `
                <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3); font-weight: 700; padding: 0.25rem 0.55rem; font-size: 0.75rem; border-radius: 6px;">Requested ✓</span>
              ` : `
                <span class="status-pill pending" style="font-size: 0.775rem;">Pending Settlement</span>
                ${net > 0 ? `
                  <button type="button" class="btn btn-primary btn-xs" onclick="Teacher.requestSalaryPayout()" style="padding: 0.2rem 0.6rem; font-size: 0.75rem; font-weight: 700;" title="Request salary withdrawal">
                    Request
                  </button>
                ` : ''}
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
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

    tbody.innerHTML = breakdownList.map(item => {
      const sessions = item.completed_sessions ?? item.sessions_count ?? 1;
      const gross = Number(item.gross_amount || 0);
      const commission = Number(item.platform_cut ?? item.commission_cut ?? (gross * 0.30));
      const net = Number(item.tutor_net ?? item.net_tutor_share ?? (gross - commission));

      return `
        <tr>
          <td>
            <div class="user-cell">
              <img src="${item.student_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" class="user-cell-avatar" />
              <div>
                <div class="user-cell-name">${item.student_name}</div>
                <div class="user-cell-email">${item.student_email || ''}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="badge-accent">${item.subject || 'Tutoring'}</span>
          </td>
          <td>
            <span class="badge-gold" style="font-size: 0.78rem; font-weight: 600;">
              ${sessions} completed session${sessions === 1 ? '' : 's'}
            </span>
          </td>
          <td>
            <strong style="color: var(--gold-400); font-weight: 700; font-size: 0.95rem;">$${gross.toFixed(2)}</strong>
          </td>
          <td>
            <span style="color: #EF4444; font-weight: 600;">-$${commission.toFixed(2)}</span>
            <span style="font-size: 0.75rem; color: #EF4444; opacity: 0.85; margin-left: 0.2rem;">(30%)</span>
          </td>
          <td>
            <strong style="color: #10B981; font-size: 1rem; font-weight: 800;">$${net.toFixed(2)}</strong>
            <span style="font-size: 0.75rem; color: #10B981; opacity: 0.85; margin-left: 0.2rem;">(70%)</span>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderDashboard() {
    this.renderTeacherRequests();
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
          <span class="status-pill ${(r.status === 'completed' || r.status === 'done' || r.room_status === 'ended') ? 'completed' : (r.status === 'declined' || r.status === 'cancelled') ? 'declined' : 'pending'}">${(r.status === 'completed' || r.status === 'done' || r.room_status === 'ended') ? 'DONE' : (r.status === 'declined' || r.status === 'cancelled') ? 'CANCELLED' : 'PENDING'}</span>
        </td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 0.4rem; justify-content: flex-end; align-items: center;">
            ${!this.isApproved() ? `
              <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #D97706; font-size: 0.75rem; padding: 0.35rem 0.65rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.25rem;" title="Operations locked while application is under review">${Icons.lock(12)} Locked (Under Review)</span>
            ` : (r.status === 'completed' || r.status === 'done' || r.room_status === 'ended') ? `
              <span style="font-size: 0.8rem; color: #10B981; font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem;">${Icons.check(13)} Done</span>
            ` : r.status === 'declined' || r.status === 'cancelled' ? `
              <span style="font-size: 0.8rem; color: #EF4444; font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem;">${Icons.x(13)} Cancelled</span>
            ` : (r.status === 'pending' || r.status === 'accepted') ? `
              ${r.room_status === 'open' ? `
                <button class="btn btn-primary btn-sm" onclick="VirtualRoom.joinRoom(${r.id}, 'tutor')" style="background: #10B981; border-color: #10B981;">${Icons.video(14)} Enter Room (Live)</button>
              ` : `
                <button class="btn btn-primary btn-sm" onclick="Teacher.startVirtualClassSession(${r.id}, this)">${Icons.video(14)} Open Room</button>
              `}
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  },

  async updateStatus(requestId, status, btnEl = null, customPayload = null) {
    if (!this.isApproved()) {
      showToast('Account Under Review: Responding to tutoring requests is locked until your application is approved by the Administrator following your virtual interview.', 'warning');
      return;
    }

    const existingClass = (this.classes || []).find(c => Number(c.id) === Number(requestId));
    if (existingClass && existingClass.status === 'completed') {
      showToast('This lesson is already marked as done and complete. No further actions are available.', 'warning');
      return;
    }

    const actionType = customPayload?.action || (status === 'accepted' ? 'accept' : status);
    const effectiveStatus = (actionType === 'reschedule' || actionType === 'update')
      ? (existingClass ? existingClass.status : (status || 'pending'))
      : (actionType === 'accept' || actionType === 'start_class')
        ? 'accepted'
        : (actionType === 'decline' || actionType === 'declined')
          ? 'declined'
          : (actionType === 'done' || actionType === 'completed')
            ? 'completed'
            : (existingClass ? existingClass.status : status);

    let note = customPayload?.note !== undefined ? customPayload.note : '';
    if (effectiveStatus === 'declined' && !note) {
      note = 'Scheduling conflict on this date.';
    }

    const payload = {
      action: actionType,
      status: effectiveStatus,
      note,
      ...(customPayload?.requested_date ? { requested_date: customPayload.requested_date } : {}),
      ...(customPayload?.requested_time ? { requested_time: customPayload.requested_time } : {})
    };

    const origText = btnEl ? btnEl.innerHTML : '';
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.innerHTML = actionType === 'start_class'
        ? 'Starting Class...'
        : (actionType === 'reschedule' || actionType === 'update')
          ? 'Saving...'
          : effectiveStatus === 'accepted'
            ? 'Accepting...'
            : effectiveStatus === 'completed'
              ? 'Marking Done...'
              : 'Updating...';
    }

    try {
      const res = await API.updateRequestStatus(requestId, payload);
      const updated = res.request;

      if (this.editingClassId === Number(requestId)) {
        this.editingClassId = null;
      }

      // Immediately update in-memory state so UI responds with zero delay
      if (Array.isArray(this.classes)) {
        this.classes = this.classes.map(c => {
          if (Number(c.id) === Number(requestId)) {
            return updated ? { ...c, ...updated } : { ...c, ...payload, status: effectiveStatus };
          }
          return c;
        });
      }

      if (Array.isArray(this.requests)) {
        this.requests = this.requests.map(r => {
          if (Number(r.id) === Number(requestId)) {
            return updated ? { ...r, ...updated } : { ...r, ...payload, status: effectiveStatus };
          }
          return r;
        });
      }

      // Immediately sync accepted/completed schedule to Calendar state
      const targetRec = updated || (this.classes || []).find(c => Number(c.id) === Number(requestId));
      if (targetRec) {
        if (!this.scheduleData) {
          this.scheduleData = { appointments: [], occupiedSlots: [] };
        }
        const existingApts = Array.isArray(this.scheduleData.appointments) ? [...this.scheduleData.appointments] : [];
        const aptIdx = existingApts.findIndex(a => Number(a.id) === Number(requestId));

        if (effectiveStatus === 'accepted' || effectiveStatus === 'completed') {
          if (aptIdx !== -1) {
            existingApts[aptIdx] = { ...existingApts[aptIdx], ...targetRec, status: effectiveStatus };
          } else {
            existingApts.push({ ...targetRec, status: effectiveStatus });
          }
          existingApts.sort((a, b) => {
            const dCmp = String(a.requested_date || '').localeCompare(String(b.requested_date || ''));
            return dCmp !== 0 ? dCmp : String(a.requested_time || '').localeCompare(String(b.requested_time || ''));
          });

          if (effectiveStatus === 'accepted' && targetRec.requested_date) {
            const cleanDate = String(targetRec.requested_date).split('T')[0];
            this.selectedDate = cleanDate;
            const dObj = new Date(cleanDate + 'T00:00:00');
            if (!isNaN(dObj.getTime())) {
              this.calYear = dObj.getFullYear();
              this.calMonth = dObj.getMonth();
            }
          }
        } else {
          if (aptIdx !== -1) {
            existingApts.splice(aptIdx, 1);
          }
        }
        this.scheduleData.appointments = existingApts;
      }

      // Re-render active views immediately
      try {
        this.renderClasses();
        this.renderSchedule();
        if (typeof this.renderTeacherRequests === 'function') {
          this.renderTeacherRequests();
        }
      } catch (renderErr) {
        console.error('Error re-rendering teacher views:', renderErr);
      }

      showToast(res.message || ((actionType === 'reschedule' || actionType === 'update') ? 'Class schedule updated successfully.' : `Class updated (${actionType.toUpperCase()}).`), 'success');

      if (actionType === 'start_class') {
        if (typeof VirtualRoom !== 'undefined' && VirtualRoom.joinRoom) {
          await VirtualRoom.joinRoom(requestId, 'tutor');
        }
      }

      // Sync all teacher datasets with SQLite in background
      Promise.all([
        this.loadClasses(),
        this.loadSchedule(),
        this.loadTeacherDashboard()
      ]).catch(bgErr => console.error('Background sync error:', bgErr));
    } catch (err) {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerHTML = origText;
      }
      showToast(err.message || 'Failed to update class status.', 'error');
    }
  },

  toggleClassUpdatePanel(requestId) {
    if (!this.isApproved()) {
      showToast('Account Under Review: Updating class schedules and statuses is locked until your application is approved by the Administrator.', 'warning');
      return;
    }
    const existingClass = (this.classes || []).find(c => Number(c.id) === Number(requestId));
    if (existingClass && existingClass.status === 'completed') {
      showToast('This lesson is already marked as done and complete. No further actions are available.', 'info');
      return;
    }
    const numId = Number(requestId);
    this.editingClassId = this.editingClassId === numId ? null : numId;
    this.renderClasses();
  },

  onClassUpdateActionChange(requestId, actionVal) {
    const schedFields = document.getElementById(`class-update-schedule-fields-${requestId}`);
    const noteFieldWrap = document.getElementById(`class-update-note-wrap-${requestId}`);
    const noteInput = document.getElementById(`class-update-note-${requestId}`);
    if (schedFields) {
      schedFields.style.display = (actionVal === 'decline') ? 'none' : 'grid';
    }
    if (noteFieldWrap) {
      noteFieldWrap.style.display = 'flex';
    }
    if (noteInput) {
      if (actionVal === 'decline') {
        noteInput.placeholder = 'Reason for cancellation (e.g., Scheduling conflict)...';
      } else {
        noteInput.placeholder = 'Optional note for student regarding the updated schedule...';
      }
    }
  },

  async saveClassUpdate(requestId, btnEl) {
    if (!this.isApproved()) {
      showToast('Account Under Review: Updating class schedules and statuses is locked until your application is approved by the Administrator.', 'warning');
      return;
    }
    const actionEl = document.getElementById(`class-update-action-${requestId}`);
    const dateEl = document.getElementById(`class-update-date-${requestId}`);
    const timeEl = document.getElementById(`class-update-time-${requestId}`);
    const noteEl = document.getElementById(`class-update-note-${requestId}`);

    const action = actionEl ? actionEl.value : 'reschedule';
    const requested_date = dateEl ? dateEl.value.trim() : '';
    const requested_time = timeEl ? timeEl.value.trim() : '';
    const note = noteEl ? noteEl.value.trim() : undefined;

    if (action === 'reschedule' && (!requested_date || !requested_time)) {
      showToast('Please provide both a valid Date and Time for the class schedule.', 'warning');
      return;
    }

    const existingClass = (this.classes || []).find(c => Number(c.id) === Number(requestId));
    const effectiveStatus = (action === 'decline' || action === 'declined')
      ? 'declined'
      : (existingClass ? existingClass.status : 'accepted');

    await this.updateStatus(requestId, effectiveStatus, btnEl, {
      action,
      requested_date,
      requested_time,
      ...(note !== undefined && note !== '' ? { note } : {})
    });
  },

  viewClassOnCalendar(dateStr) {
    if (!dateStr) return;
    const cleanDate = String(dateStr).split('T')[0];
    this.selectedDate = cleanDate;
    const dObj = new Date(cleanDate + 'T00:00:00');
    if (!isNaN(dObj.getTime())) {
      this.calYear = dObj.getFullYear();
      this.calMonth = dObj.getMonth();
    }
    if (typeof Router !== 'undefined' && Router.navigate) {
      Router.navigate('#teacher-schedule');
    } else {
      window.location.hash = '#teacher-schedule';
    }
    setTimeout(() => {
      this.selectCalendarDate(cleanDate);
    }, 120);
  },

  // ==============================================================
  // 2. VIRTUAL CLASSES & SESSIONS + SUBJECTS & INDIVIDUAL RATES
  // ==============================================================
  async loadClasses() {
    try {
      const data = await API.getTeacherClasses();
      this.classes = data.classes || [];

      const rawSubjs = Array.isArray(data.subjects)
        ? data.subjects
        : (Array.isArray(this.tutorProfile?.subjects)
          ? this.tutorProfile.subjects
          : (Array.isArray(this.application?.subjects) ? this.application.subjects : []));
      this.subjects = this.filterOutDeletedSubjects(rawSubjs);

      const rawRates = (data.subject_rates && typeof data.subject_rates === 'object')
        ? data.subject_rates
        : (this.tutorProfile?.subject_rates || this.application?.subject_rates || {});
      const cleanRates = {};
      const deletedSet = new Set(this.getDeletedSubjects());
      for (const [k, v] of Object.entries(rawRates)) {
        if (!deletedSet.has(k.toLowerCase())) {
          cleanRates[k] = v;
        }
      }
      this.subjectRates = cleanRates;

      this.renderTeacherSubjects();
      this.renderClasses();
    } catch (err) {
      console.error('Failed to load teacher classes:', err);
    }
  },

  async refreshClassesList() {
    try {
      const data = await API.getTeacherClasses();
      this.classes = data.classes || [];
      this.renderClasses();
    } catch (err) {
      console.error('Failed to refresh classes list:', err);
    }
  },

  escapeSubjectAttr(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  renderTeacherSubjects() {
    const grid = document.getElementById('teacher-subjects-rates-grid');
    const countBadge = document.getElementById('teacher-subjects-count-badge');
    const openAddBtn = document.getElementById('btn-open-formal-add-subject');
    if (!grid) return;

    const approved = this.isApproved();
    const rawList = Array.isArray(this.subjects) ? this.subjects : [];
    const subjectsList = this.filterOutDeletedSubjects(rawList);
    this.subjects = subjectsList;
    const ratesMap = this.subjectRates || {};
    const defaultRate = Number(this.tutorProfile?.hourly_rate || this.application?.hourly_rate || 45);

    if (countBadge) {
      countBadge.textContent = `${subjectsList.length} ${subjectsList.length === 1 ? 'Subject' : 'Subjects'}`;
    }

    if (openAddBtn) {
      openAddBtn.disabled = !approved;
      openAddBtn.title = approved ? 'Add new qualified subject' : 'Operational Lock: Managing subjects unlocks once approved by administrator';
    }

    if (subjectsList.length === 0) {
      grid.innerHTML = `
        <div class="teacher-subject-empty" style="grid-column: 1 / -1; text-align: center; padding: 2.5rem 1rem;">
          <div style="color: var(--gold-600); margin-bottom: 0.5rem;">${Icons.book(32)}</div>
          <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem; font-size: 1.05rem;">No Qualified Subjects Added Yet</div>
          <p style="color: var(--text-secondary); font-size: 0.88rem; max-width: 440px; margin: 0 auto 1.25rem;">
            Add the academic subjects and specializations you are qualified to teach. They will appear on your profile for students to book.
          </p>
          <button type="button" class="btn btn-primary btn-sm" onclick="Teacher.openAddSubjectModal()">
            Add Your First Qualified Subject
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = subjectsList.map((subj, idx) => {
      const rateVal = ratesMap[subj] !== undefined ? Number(ratesMap[subj]) : defaultRate;
      const safeSubj = this.escapeSubjectAttr(subj);
      return `
        <div class="teacher-subject-rate-card" data-subject="${safeSubj}">
          <div class="teacher-subject-card-top">
            <div class="teacher-subject-name-wrap">
              <span class="teacher-subject-icon">${Icons.book(18)}</span>
              <div>
                <div class="teacher-subject-name">${safeSubj}</div>
                <div class="teacher-subject-meta">50-min 1-on-1 Session • Individual Rate</div>
              </div>
            </div>
            <span class="teacher-subject-rate-pill">$${rateVal.toFixed(2)}/hr</span>
          </div>

          <div class="teacher-subject-card-controls">
            <div class="subject-rate-input-group subject-rate-inline-group">
              <span class="subject-rate-currency">$</span>
              <input
                type="number"
                id="teacher-subj-rate-input-${idx}"
                class="form-control subject-rate-inline-input"
                min="5"
                max="1000"
                step="1"
                value="${rateVal}"
                ${!approved ? 'disabled' : ''}
                aria-label="Hourly rate for ${safeSubj}"
              />
              <span class="subject-rate-unit">/hr</span>
            </div>

            <button
              type="button"
              class="btn btn-primary btn-sm teacher-subject-save-btn"
              data-subject="${safeSubj}"
              data-idx="${idx}"
              onclick="Teacher.updateSubjectRateFromBtn(this)"
              ${!approved ? 'disabled title="Locked while application is under review"' : 'title="Save rate for this subject"'}
            >
              Save Rate
            </button>

            <button
              type="button"
              class="btn btn-outline-danger btn-sm teacher-subject-delete-btn"
              data-subject="${safeSubj}"
              onclick="Teacher.confirmDeleteSubject('${safeSubj}')"
              ${!approved ? 'disabled title="Locked while application is under review"' : 'title="Delete subject from profile"'}
            >
              Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  syncUpdatedSubjectsAcrossApp(res) {
    if (!res) return;
    if (Array.isArray(res.subjects)) {
      this.subjects = this.filterOutDeletedSubjects(res.subjects);
    }
    if (res.subject_rates && typeof res.subject_rates === 'object') {
      const cleanRates = {};
      const deletedSet = new Set(this.getDeletedSubjects());
      for (const [k, v] of Object.entries(res.subject_rates)) {
        if (!deletedSet.has(k.toLowerCase())) cleanRates[k] = v;
      }
      this.subjectRates = cleanRates;
    }

    if (this.tutorProfile) {
      this.tutorProfile.subjects = this.subjects;
      this.tutorProfile.subject_rates = this.subjectRates;
      if (res.hourly_rate) this.tutorProfile.hourly_rate = res.hourly_rate;
    }
    if (this.application) {
      this.application.subjects = this.subjects;
      this.application.subject_rates = this.subjectRates;
      if (res.hourly_rate) this.application.hourly_rate = res.hourly_rate;
    }

    if (typeof Auth !== 'undefined' && Auth.currentUser) {
      Auth.currentUser.subjects = this.subjects.join(', ');
      if (typeof Storage !== 'undefined' && Storage.setUser) {
        Storage.setUser(Auth.currentUser);
      }
      try {
        const accounts = JSON.parse(localStorage.getItem('aviora_created_accounts') || '{}');
        const emailKey = (Auth.currentUser.email || '').toLowerCase();
        if (accounts[emailKey]) {
          accounts[emailKey].subjects = this.subjects.join(', ');
          localStorage.setItem('aviora_created_accounts', JSON.stringify(accounts));
        }
      } catch (e) {}
    }

    this.renderTeacherSubjects();

    // Refresh public Tutors cache so Student views on the same session also reflect immediately
    if (typeof Tutors !== 'undefined') {
      if (typeof Tutors.fetchTutors === 'function') {
        Tutors.fetchTutors().catch(() => { });
      }
      if (typeof Tutors.loadTutors === 'function') {
        Tutors.loadTutors().catch(() => { });
      }
    }
  },

  // Formal Subject Accreditation Modal Workflow
  openAddSubjectModal() {
    if (!this.isApproved()) {
      showToast('Operational Lock: Adding qualified subjects unlocks once your account is approved by the Administrator following your virtual interview.', 'warning');
      return;
    }
    const modal = document.getElementById('modal-add-qualified-subject');
    if (!modal) return;

    const catSelect = document.getElementById('formal-subject-category');
    const nameInput = document.getElementById('formal-subject-name');
    const levelSelect = document.getElementById('formal-subject-level');
    const rateInput = document.getElementById('formal-subject-rate');
    const qualInput = document.getElementById('formal-subject-qualification');

    if (catSelect) catSelect.value = 'Mathematics';
    if (nameInput) nameInput.value = '';
    if (levelSelect) levelSelect.value = 'AP & College Prep';
    if (rateInput) rateInput.value = (this.tutorProfile?.hourly_rate || this.application?.hourly_rate || 45);
    if (qualInput) qualInput.value = '';

    this.onSubjectCategoryChange('Mathematics');

    modal.classList.add('active');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (nameInput) setTimeout(() => nameInput.focus(), 80);
  },

  closeAddSubjectModal() {
    const modal = document.getElementById('modal-add-qualified-subject');
    if (!modal) return;
    modal.classList.remove('active');
    modal.style.display = 'none';
    document.body.style.overflow = '';
  },

  onSubjectCategoryChange(category) {
    const pillsContainer = document.getElementById('formal-subject-pills');
    if (!pillsContainer) return;

    const suggestionsByCategory = {
      'Mathematics': ['AP Calculus BC', 'AP Calculus AB', 'Linear Algebra', 'Multivariable Calculus', 'AP Statistics', 'Geometry', 'SAT Math Prep'],
      'Sciences': ['AP Physics C: Mechanics', 'AP Chemistry', 'AP Biology', 'Organic Chemistry', 'Anatomy & Physiology', 'Biochemistry'],
      'Computer Science': ['AP Computer Science A', 'Data Structures & Algorithms', 'Python Programming', 'Web Development', 'Machine Learning Basics'],
      'Languages': ['AP English Literature', 'AP Spanish Language', 'Academic Writing & Essay Prep', 'French', 'Public Speaking'],
      'Economics': ['AP Microeconomics', 'AP Macroeconomics', 'Corporate Finance', 'Econometrics', 'Intro to Accounting'],
      'Test Prep': ['SAT Comprehensive Prep', 'ACT Math & Science', 'AP Exam Cram Sprint', 'Olympiad Math Problem Solving'],
      'Other': ['Data Analysis', 'Logic & Critical Thinking', 'Philosophy', 'Creative Writing']
    };

    const list = suggestionsByCategory[category] || suggestionsByCategory['Mathematics'];
    pillsContainer.innerHTML = list.map(item => `
      <button type="button" class="btn btn-outline-gold btn-xs" style="font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 999px;" onclick="Teacher.selectSuggestedSubject('${item}')">
        + ${item}
      </button>
    `).join('');
  },

  selectSuggestedSubject(name) {
    const nameInput = document.getElementById('formal-subject-name');
    if (nameInput) {
      nameInput.value = name;
      nameInput.focus();
    }
  },

  async submitFormalQualifiedSubject() {
    if (!this.isApproved()) {
      showToast('Operational Lock: Adding subjects unlocks once approved by the administrator.', 'warning');
      return;
    }

    const catSelect = document.getElementById('formal-subject-category');
    const nameInput = document.getElementById('formal-subject-name');
    const levelSelect = document.getElementById('formal-subject-level');
    const rateInput = document.getElementById('formal-subject-rate');
    const qualInput = document.getElementById('formal-subject-qualification');
    const submitBtn = document.getElementById('btn-submit-formal-subject');

    const subject = (nameInput?.value || '').trim();
    const rate = parseFloat(rateInput?.value);
    const category = catSelect?.value || 'Mathematics';
    const level = levelSelect?.value || 'AP & College Prep';
    const qualification = (qualInput?.value || '').trim();

    if (!subject) {
      showToast('Please specify the subject or specialization name.', 'warning');
      if (nameInput) nameInput.focus();
      return;
    }

    if (isNaN(rate) || rate < 5 || rate > 1000) {
      showToast('Please enter a valid hourly rate between $5 and $1,000.', 'warning');
      if (rateInput) rateInput.focus();
      return;
    }

    if (!qualification) {
      showToast('Please provide your teaching qualification, credentials, or syllabus coverage for this subject.', 'warning');
      if (qualInput) qualInput.focus();
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying & Adding...';
      }

      // If this subject was previously marked as deleted, restore it
      this.restoreDeletedSubject(subject);

      const res = await API.updateTeacherSubjects({
        action: 'add',
        subject,
        rate,
        category,
        level,
        qualification
      });

      this.syncUpdatedSubjectsAcrossApp(res);
      this.closeAddSubjectModal();
      await this.refreshClassesList();

      showToast(`"${subject}" ($${rate.toFixed(2)}/hr) added to your teaching profile and is now bookable by students!`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to add qualified subject.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Subject to Teaching Profile';
      }
    }
  },

  async addSubjectSpecialization() {
    if (!this.isApproved()) {
      showToast('Operational Lock: Managing subjects and rates unlocks once your account is approved by the Administrator following your virtual interview.', 'warning');
      return;
    }
    const nameInput = document.getElementById('teacher-new-subject-name');
    const rateInput = document.getElementById('teacher-new-subject-rate');
    const btn = document.getElementById('btn-teacher-add-subject');

    const subject = (nameInput?.value || '').trim();
    const rate = parseFloat(rateInput?.value);

    if (!subject) {
      showToast('Please enter a subject or area of specialization name.', 'warning');
      return;
    }
    if (isNaN(rate) || rate < 5 || rate > 1000) {
      showToast('Please enter a valid hourly rate between $5 and $1,000.', 'warning');
      return;
    }

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Saving...';
      }

      this.restoreDeletedSubject(subject);

      const res = await API.updateTeacherSubjects({
        action: 'add',
        subject,
        rate
      });
      this.syncUpdatedSubjectsAcrossApp(res);
      if (nameInput) nameInput.value = '';
      await this.refreshClassesList();
      showToast(`"${subject}" ($${rate.toFixed(2)}/hr) saved and synced to Student & Admin portals!`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to add subject.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Add Subject & Rate';
      }
    }
  },

  async updateSubjectRateFromBtn(btnEl) {
    if (!this.isApproved()) {
      showToast('Operational Lock: Managing subjects and rates unlocks once your account is approved by the Administrator.', 'warning');
      return;
    }
    const subject = btnEl?.getAttribute('data-subject');
    const idx = btnEl?.getAttribute('data-idx');
    const rateInput = document.getElementById(`teacher-subj-rate-input-${idx}`);
    const rate = parseFloat(rateInput?.value);

    if (!subject) return;
    if (isNaN(rate) || rate < 5 || rate > 1000) {
      showToast('Please enter a valid hourly rate between $5 and $1,000.', 'warning');
      if (rateInput) rateInput.focus();
      return;
    }

    try {
      if (btnEl) {
        btnEl.disabled = true;
        btnEl.textContent = 'Saving...';
      }
      const res = await API.updateTeacherSubjects({
        action: 'update',
        subject,
        rate
      });
      this.syncUpdatedSubjectsAcrossApp(res);
      await this.refreshClassesList();
      showToast(`Updated "${subject}" rate to $${rate.toFixed(2)}/hr (synced to Student & Admin).`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update subject rate.', 'error');
    } finally {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.textContent = 'Save Rate';
      }
    }
  },

  confirmDeleteSubject(subject) {
    if (!this.isApproved()) {
      showToast('Operational Lock: Managing subjects unlocks once your account is approved by the Administrator.', 'warning');
      return;
    }
    if (!subject) return;

    if (this.subjects && this.subjects.length <= 1) {
      showToast('You must maintain at least one qualified teaching subject on your profile. Please add another subject before deleting this one.', 'warning');
      return;
    }

    showConfirm(
      'Delete Subject',
      `Are you sure you want to delete "${subject}" from your teaching profile? It will be removed from your account and will no longer be available for student bookings.`,
      async () => {
        await this.executeDeleteSubject(subject);
      },
      {
        confirmText: 'Delete Subject',
        cancelText: 'Cancel',
        confirmBtnClass: 'btn btn-danger btn-sm'
      }
    );
  },

  async executeDeleteSubject(subject) {
    if (!this.isApproved()) {
      showToast('Operational Lock: Managing subjects unlocks once approved by the administrator.', 'warning');
      return;
    }
    if (!subject) return;

    const cleanSubj = String(subject).trim();

    // 1. Permanently register this subject into the deleted blacklist immediately
    this.addDeletedSubject(cleanSubj);

    // 2. Optimistically remove it from memory so the UI updates instantly
    if (Array.isArray(this.subjects)) {
      this.subjects = this.subjects.filter(s => s.toLowerCase() !== cleanSubj.toLowerCase());
    }
    if (this.subjectRates && typeof this.subjectRates === 'object') {
      const updatedRates = { ...this.subjectRates };
      for (const k of Object.keys(updatedRates)) {
        if (k.toLowerCase() === cleanSubj.toLowerCase()) delete updatedRates[k];
      }
      this.subjectRates = updatedRates;
    }

    if (this.tutorProfile) {
      this.tutorProfile.subjects = this.subjects;
      this.tutorProfile.subject_rates = this.subjectRates;
    }
    if (this.application) {
      this.application.subjects = this.subjects;
      this.application.subject_rates = this.subjectRates;
    }
    if (typeof Auth !== 'undefined' && Auth.currentUser) {
      Auth.currentUser.subjects = this.subjects.join(', ');
      if (typeof Storage !== 'undefined' && Storage.setUser) {
        Storage.setUser(Auth.currentUser);
      }
      try {
        const accounts = JSON.parse(localStorage.getItem('aviora_created_accounts') || '{}');
        const emailKey = (Auth.currentUser.email || '').toLowerCase();
        if (accounts[emailKey]) {
          accounts[emailKey].subjects = this.subjects.join(', ');
          localStorage.setItem('aviora_created_accounts', JSON.stringify(accounts));
        }
      } catch (e) {}
    }

    // 3. Immediately re-render cards in UI so deleted card disappears with zero latency
    this.renderTeacherSubjects();

    try {
      const res = await API.updateTeacherSubjects({
        action: 'remove',
        subject: cleanSubj
      });
      this.syncUpdatedSubjectsAcrossApp(res);
      await this.refreshClassesList();
      showToast(`"${cleanSubj}" has been successfully deleted from your account.`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to delete subject.', 'error');
    }
  },

  removeSubjectFromBtn(btnEl) {
    const subject = btnEl?.getAttribute('data-subject');
    if (subject) this.confirmDeleteSubject(subject);
  },

  filterClasses(filter, btn) {
    this.classFilter = filter || 'all';
    const selectEl = document.getElementById('teacher-classes-status-filter');
    if (selectEl && selectEl.value !== this.classFilter) {
      selectEl.value = this.classFilter;
    }
    if (btn && btn.classList) {
      document.querySelectorAll('#view-teacher-classes .teacher-filter-btn, #teacher-tab-classes .teacher-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    this.renderClasses();
  },

  searchClasses(query) {
    this.classSearchQuery = (query || '').trim();
    this.renderClasses();
  },

  renderClasses() {
    const container = document.getElementById('teacher-classes-cards-grid');
    if (!container) return;

    let filtered = this.classes;
    if (this.classFilter === 'open') {
      filtered = filtered.filter(c => c.room_status === 'open');
    } else if (this.classFilter === 'pending' || this.classFilter === 'accepted') {
      filtered = filtered.filter(c => (c.status === 'pending' || c.status === 'accepted') && c.room_status !== 'open' && c.status !== 'completed' && c.status !== 'done' && c.room_status !== 'ended');
    } else if (this.classFilter === 'done' || this.classFilter === 'completed') {
      filtered = filtered.filter(c => c.status === 'completed' || c.status === 'done' || c.room_status === 'ended');
    } else if (this.classFilter === 'cancelled' || this.classFilter === 'declined') {
      filtered = filtered.filter(c => c.status === 'declined' || c.status === 'cancelled');
    }

    const q = (this.classSearchQuery || '').toLowerCase();
    if (q) {
      filtered = filtered.filter(c =>
        String(c.student_name || '').toLowerCase().includes(q) ||
        String(c.subject || '').toLowerCase().includes(q) ||
        String(c.requested_date || '').toLowerCase().includes(q) ||
        String(c.requested_time || '').toLowerCase().includes(q) ||
        String(c.notes || '').toLowerCase().includes(q) ||
        String(c.student_grade || '').toLowerCase().includes(q) ||
        String(c.student_school || '').toLowerCase().includes(q) ||
        String(c.status || '').toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-xl);">
          <div style="margin-bottom: 0.75rem; color: var(--gold-600);">${Icons.graduationCap(44)}</div>
          <h3 style="color: var(--text-primary); font-size: 1.25rem;">No Classes Found</h3>
          <p style="color: var(--text-secondary); font-size: 0.9rem; max-width: 480px; margin: 0.5rem auto 1.5rem;">
            ${q
          ? 'No classes match your current search or filter criteria.'
          : this.classFilter === 'open'
            ? 'No live virtual classrooms currently open. You can launch a virtual session for any scheduled student booking.'
            : this.classFilter === 'pending'
              ? 'No pending classes scheduled at this time.'
              : this.classFilter === 'done'
                ? 'No completed classes yet.'
                : this.classFilter === 'cancelled'
                  ? 'No cancelled classes.'
                  : 'You do not have any classes in this category yet.'}
          </p>
          <button type="button" class="btn btn-primary btn-sm" onclick="Teacher.openInstantClassModal()" style="display: inline-flex; align-items: center; gap: 0.35rem;">
            ${Icons.video(14)} Launch Instant Class with Student
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(c => {
      const isLive = c.room_status === 'open';
      const isCompleted = c.status === 'completed' || c.status === 'done' || c.room_status === 'ended';
      const isDeclined = !isCompleted && (c.status === 'declined' || c.status === 'cancelled');
      const isAccepted = !isCompleted && c.status === 'accepted';
      const isPending = !isCompleted && c.status === 'pending';
      const isEditing = !isCompleted && this.editingClassId === Number(c.id);
      const cleanDateVal = String(c.requested_date || '').split('T')[0];

      const statusBadgeText = isCompleted 
        ? 'DONE' 
        : (isDeclined 
          ? 'CANCELLED' 
          : (isAccepted 
            ? 'ACCEPTED' 
            : (isPending 
              ? 'PENDING' 
              : String(c.status || 'PENDING').toUpperCase())));

      const statusClass = isCompleted 
        ? 'completed' 
        : (isDeclined 
          ? 'declined' 
          : (isAccepted 
            ? 'accepted' 
            : 'pending'));

      return `
        <div class="teacher-class-card ${isLive ? 'is-live-room' : ''}" id="teacher-class-card-${c.id}">
          
          <!-- Card Header: Status & Room Badge (Compact) -->
          <div class="class-card-header">
            <div class="class-card-header-left" style="display: flex; align-items: center;">
              <span class="badge-accent" style="font-size: 0.8rem; padding: 0.2rem 0.55rem;">${c.subject}</span>
              ${isLive ? `
                <span class="live-pulse-badge">
                  <span class="live-dot"></span> LIVE CLASSROOM OPEN
                </span>
              ` : ''}
            </div>
            <div class="class-card-header-right">
              <span class="status-pill ${statusClass}" style="font-size: 0.68rem; padding: 0.15rem 0.5rem;">${statusBadgeText}</span>
            </div>
          </div>

          <!-- Student Profile in Card (Compact) -->
          <div class="class-card-student">
            <img src="${c.student_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'}" alt="${c.student_name}" class="class-card-avatar" />
            <div style="flex: 1; min-width: 0;">
              <h4 class="class-card-student-name">${c.student_name}</h4>
              <div class="class-card-student-meta">${c.student_grade || 'Student'} • ${c.student_school || 'Enrolled Student'}</div>
            </div>
          </div>

          <!-- Schedule & Details (Streamlined & Space-Saving) -->
          <div class="class-card-details">
            <div class="class-meta-inline-row">
              <span class="class-meta-pill" title="Lesson Date">${Icons.calendar(12)} ${c.requested_date}</span>
              <span class="class-meta-pill" title="Lesson Time & Duration">${Icons.clock(12)} ${c.requested_time} (50m)</span>
              <span class="class-meta-pill" title="Session Fee">${Icons.award(12)} $${Number(c.total_amount || 0).toFixed(2)}</span>
            </div>

            ${!isDeclined ? `
              <div class="class-calendar-sync-badge ${isCompleted ? 'is-completed' : ''}" ${isCompleted ? '' : `onclick="Teacher.viewClassOnCalendar('${cleanDateVal}')"`} title="${isCompleted ? 'Class concluded on ' + cleanDateVal : 'Open Schedule Calendar on ' + cleanDateVal}">
                <span style="display: inline-flex; align-items: center; gap: 0.35rem;">
                  ${isCompleted ? Icons.check(13) + ' <strong>Concluded:</strong> ' : Icons.calendar(13) + ' <strong>Calendar:</strong> '}
                  ${c.requested_date} • ${c.requested_time}
                </span>
                ${isCompleted ? `<span class="class-calendar-sync-link" style="color: #10B981; font-weight: 600; text-decoration: none;">(Concluded Session)</span>` : `<span class="class-calendar-sync-link">View Schedule →</span>`}
              </div>
            ` : `
              <div class="class-action-indicator-badge status-declined" style="padding: 0.3rem 0.5rem; font-size: 0.75rem;">
                <strong>Cancelled:</strong> <span>${c.tutor_response_note || 'Session cancelled'}</span>
              </div>
            `}

            ${c.notes ? `
              <div class="class-card-notes" title="Student Focus Request">
                <strong>Focus:</strong> "${this.escapeHtml(c.notes)}"
              </div>
            ` : ''}
          </div>

          <!-- Inline Action & Schedule Update Drawer (Only available when NOT marked as Done) -->
          ${this.isApproved() && !isCompleted && isEditing ? `
            <div class="class-update-drawer">
              <div class="class-update-drawer-header">
                <strong>Update Class Schedule &amp; Details</strong>
                <span>Modify date, time, or send an update note to student</span>
              </div>
              <div class="class-update-field">
                <label for="class-update-action-${c.id}">Action</label>
                <select id="class-update-action-${c.id}" class="form-control" onchange="Teacher.onClassUpdateActionChange(${c.id}, this.value)">
                  <option value="reschedule" selected>Update Schedule (Set Date &amp; Time)</option>
                  <option value="decline">Cancel Class (Remove from Schedule)</option>
                </select>
              </div>
              <div class="class-update-fields-grid" id="class-update-schedule-fields-${c.id}">
                <div class="class-update-field">
                  <label for="class-update-date-${c.id}">Set Date</label>
                  <input type="date" id="class-update-date-${c.id}" class="form-control" value="${cleanDateVal}" />
                </div>
                <div class="class-update-field">
                  <label for="class-update-time-${c.id}">Set Time</label>
                  <input type="text" id="class-update-time-${c.id}" class="form-control" value="${this.escapeSubjectAttr(c.requested_time || '10:00')}" placeholder="e.g. 10:00 or 14:00" />
                </div>
              </div>
              <div class="class-update-field" id="class-update-note-wrap-${c.id}">
                <label for="class-update-note-${c.id}">Note for Student (Optional)</label>
                <input type="text" id="class-update-note-${c.id}" class="form-control" placeholder="Optional note or reason for student..." value="" />
              </div>
              <div class="class-update-drawer-actions">
                <button type="button" class="btn btn-primary btn-sm" onclick="Teacher.saveClassUpdate(${c.id}, this)">
                  Save Update
                </button>
                <button type="button" class="btn btn-secondary btn-sm" onclick="Teacher.toggleClassUpdatePanel(${c.id})">
                  Cancel
                </button>
              </div>
            </div>
          ` : ''}

          <!-- Action Launch Pad (Compact) -->
          <div class="class-card-actions">
            ${!this.isApproved() ? `
              <button type="button" class="btn btn-secondary btn-sm" style="flex: 1; opacity: 0.7; cursor: not-allowed; display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem; padding: 0.35rem 0.6rem; font-size: 0.8rem;" disabled title="Classroom operations locked while application is under review">
                ${Icons.lock(12)} Operations Locked (Under Review)
              </button>
            ` : isCompleted ? `
              <div class="class-status-summary-pill is-completed-summary" style="flex: 1; justify-content: center; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.38rem 0.65rem; font-size: 0.82rem; font-weight: 700; border-radius: 6px;" title="This class has concluded (allotted 50-minute duration elapsed)">
                ${Icons.check(14)} Done
              </div>
              <button type="button" class="btn btn-outline-gold btn-sm" style="justify-content: center; font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.65rem; font-size: 0.82rem;" onclick="Teacher.openClassRecordModal(${c.id})" title="View class record, history, and send lesson summary to student">
                ${Icons.fileText(13)} Class Record &amp; Summary
              </button>
            ` : isLive ? `
              <button type="button" class="btn btn-primary btn-sm btn-vroom-live-pulse" style="flex: 1; justify-content: center; background: #10B981; border-color: #10B981; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.65rem; font-size: 0.82rem;" onclick="VirtualRoom.joinRoom(${c.id}, 'tutor')">
                ${Icons.video(13)} Enter Live Room
              </button>
              <button type="button" class="btn btn-outline-gold btn-sm class-card-update-toggle-btn ${isEditing ? 'active' : ''}" style="padding: 0.35rem 0.65rem; font-size: 0.82rem;" title="Update class schedule" onclick="Teacher.toggleClassUpdatePanel(${c.id})">
                ${isEditing ? 'Close' : 'Update'}
              </button>
            ` : !isDeclined ? `
              <button type="button" class="btn btn-primary btn-sm btn-start-virtual-class" style="flex: 1; justify-content: center; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.65rem; font-size: 0.82rem;" onclick="Teacher.startVirtualClassSession(${c.id}, this)">
                ${Icons.video(13)} Start Virtual Class
              </button>
              <button type="button" class="btn btn-outline-gold btn-sm class-card-update-toggle-btn ${isEditing ? 'active' : ''}" style="padding: 0.35rem 0.65rem; font-size: 0.82rem;" title="Update class schedule" onclick="Teacher.toggleClassUpdatePanel(${c.id})">
                ${isEditing ? 'Close' : 'Update'}
              </button>
            ` : `
              <div class="class-status-summary-pill is-declined-summary" style="display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.35rem 0.6rem; font-size: 0.8rem;">
                ${Icons.x(12)} Class Cancelled
              </div>
              <button type="button" class="btn btn-outline-gold btn-sm class-card-update-toggle-btn ${isEditing ? 'active' : ''}" style="padding: 0.35rem 0.65rem; font-size: 0.82rem;" title="Reschedule class" onclick="Teacher.toggleClassUpdatePanel(${c.id})">
                ${isEditing ? 'Close' : 'Update'}
              </button>
            `}
          </div>

        </div>
      `;
    }).join('');
  },

  async startVirtualClassSession(requestId, btnEl = null) {
    if (!this.isApproved()) {
      showToast('Operational Lock: Live virtual class operations unlock once your account has been approved by the Administrator following your virtual interview.', 'warning');
      return;
    }
    const existingClass = (this.classes || []).find(c => Number(c.id) === Number(requestId));
    if (existingClass && existingClass.status === 'completed') {
      showToast('This lesson has already concluded.', 'info');
      return;
    }

    const origHtml = btnEl ? btnEl.innerHTML : '';
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.innerHTML = `${Icons.video(13)} Starting Room...`;
    }

    try {
      if (typeof VirtualRoom !== 'undefined' && VirtualRoom.openRoomAsTutor) {
        await VirtualRoom.openRoomAsTutor(requestId);
      } else {
        await this.updateStatus(requestId, 'accepted', btnEl, { action: 'start_class' });
      }
      await this.loadClasses();
    } catch (err) {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerHTML = origHtml;
      }
      showToast(err.message || 'Failed to start virtual class.', 'error');
    }
  },

  async launchClassSession(sessionId) {
    if (!this.isApproved()) {
      showToast('Operational Lock: Live virtual class operations unlock once your account has been approved by the Administrator following your virtual interview.', 'warning');
      return;
    }
    try {
      await VirtualRoom.openRoomAsTutor(sessionId);
      await this.loadClasses();
    } catch (err) {
      showToast(err.message || 'Failed to launch class session.', 'error');
    }
  },

  // ==============================================================
  // CLASS RECORD & LESSON SUMMARY (AI + MANUAL + NOTIFICATION)
  // ==============================================================
  activeRecordClassId: null,

  async openClassRecordModal(classId) {
    this.activeRecordClassId = classId;
    const modal = document.getElementById('modal-teacher-class-record');
    const metaBox = document.getElementById('class-record-meta-box');
    const summaryInput = document.getElementById('class-record-summary-input');
    const sentWrap = document.getElementById('class-record-sent-badge-wrap');
    const titleEl = document.getElementById('class-record-title');

    if (!modal) return;

    let record = (this.classes || []).find(c => Number(c.id) === Number(classId));

    if (metaBox) {
      metaBox.innerHTML = `
        <div style="text-align: center; padding: 1.25rem; color: var(--text-secondary); font-size: 0.88rem;">
          Loading class record & history...
        </div>
      `;
    }

    this.openModal('modal-teacher-class-record');

    try {
      const res = await API.getClassRecord(classId);
      if (res && res.record) record = res.record;
    } catch (e) {
      console.warn('Could not fetch latest class record from API, using in-memory record:', e);
    }

    if (!record) {
      showToast('Class record not found.', 'error');
      this.closeModal('modal-teacher-class-record');
      return;
    }

    if (titleEl) {
      titleEl.textContent = `${record.subject} — Class Record & History`;
    }

    const isCompleted = record.status === 'completed';

    if (metaBox) {
      metaBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <img src="${record.student_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--gold-400);" />
            <div>
              <h4 style="margin: 0 0 0.1rem; font-size: 1rem; color: var(--text-primary); font-weight: 700;">${record.student_name}</h4>
              <div style="font-size: 0.76rem; color: var(--text-secondary);">${record.student_grade || 'Student'} • ${record.student_school || 'Enrolled Scholar'} • ${record.student_email || ''}</div>
            </div>
          </div>
          <div style="text-align: right; display: flex; align-items: center; gap: 0.35rem;">
            <span class="badge-accent" style="font-size: 0.78rem; padding: 0.2rem 0.5rem;">${record.subject}</span>
            <span class="status-pill ${isCompleted ? 'completed' : record.status}" style="font-size: 0.68rem; padding: 0.15rem 0.5rem;">${isCompleted ? 'DONE' : record.status.toUpperCase()}</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.5rem; margin-top: 0.75rem; padding-top: 0.65rem; border-top: 1px solid var(--border-color); font-size: 0.78rem; color: var(--text-secondary);">
          <div>📅 <strong>Date:</strong> ${record.requested_date}</div>
          <div>🕒 <strong>Time:</strong> ${record.requested_time} (50m)</div>
          <div>💰 <strong>Fee:</strong> $${Number(record.total_amount || 0).toFixed(2)}</div>
          <div>🎓 <strong>Status:</strong> ${isCompleted ? 'Concluded / Done' : 'Scheduled'}</div>
        </div>

        ${record.notes ? `
          <div style="margin-top: 0.65rem; padding: 0.45rem 0.65rem; background: rgba(198, 138, 40, 0.07); border-left: 3px solid var(--gold-500); border-radius: 4px; font-size: 0.78rem; color: var(--text-primary);">
            <strong>Student Focus Request:</strong> "${this.escapeHtml(record.notes)}"
          </div>
        ` : ''}
      `;
    }

    if (summaryInput) {
      summaryInput.value = record.lesson_summary || '';
      if (!summaryInput.value) {
        summaryInput.placeholder = `Write a comprehensive lesson summary for ${record.student_name} covering concepts mastered, practice problems solved, and recommended next steps... Or click "Generate with AI" above!`;
      }
    }

    if (sentWrap) {
      if (record.summary_sent_at) {
        const sentDate = new Date(record.summary_sent_at).toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        sentWrap.innerHTML = `
          <span style="color: #059669; font-weight: 700; display: inline-flex; align-items: center; gap: 0.3rem;">
            ${Icons.check(14)} Lesson summary was sent to ${record.student_name} on ${sentDate}
          </span>
        `;
      } else {
        sentWrap.innerHTML = `
          <span style="color: var(--text-secondary); font-style: italic;">
            Summary has not been sent to the student yet. You can write your own notes or click "Generate with AI" above, then save &amp; send it.
          </span>
        `;
      }
    }

    const transcriptSection = document.getElementById('class-record-transcript-section');
    const transcriptPreview = document.getElementById('class-record-transcript-preview');
    if (transcriptSection && transcriptPreview) {
      if (record.lesson_transcript && record.lesson_transcript.trim()) {
        transcriptSection.style.display = 'block';
        transcriptPreview.textContent = record.lesson_transcript.trim();
      } else {
        transcriptSection.style.display = 'none';
        transcriptPreview.textContent = '';
      }
    }
  },

  insertTranscriptToSummary() {
    const transcriptPreview = document.getElementById('class-record-transcript-preview');
    const summaryInput = document.getElementById('class-record-summary-input');
    if (!transcriptPreview || !summaryInput) return;
    const txt = transcriptPreview.textContent.trim();
    if (!txt) {
      showToast('No transcript available to insert.', 'info');
      return;
    }
    const appendStr = `\n\n#### 🎙️ Auto-Transcribed Lesson Remarks:\n${txt}`;
    summaryInput.value = (summaryInput.value ? summaryInput.value.trim() : '') + appendStr;
    showToast('Appended lesson transcript into summary.', 'success');
  },

  async copyClassTranscript() {
    const transcriptPreview = document.getElementById('class-record-transcript-preview');
    if (!transcriptPreview || !transcriptPreview.textContent.trim()) {
      showToast('No transcript to copy.', 'info');
      return;
    }
    try {
      await navigator.clipboard.writeText(transcriptPreview.textContent.trim());
      showToast('Session transcript copied to clipboard!', 'success');
    } catch (e) {
      showToast('Unable to copy to clipboard.', 'error');
    }
  },

  async generateAISummary() {
    if (!this.activeRecordClassId) return;
    const btn = document.getElementById('btn-ai-generate-summary');
    const summaryInput = document.getElementById('class-record-summary-input');
    const origHtml = btn ? btn.innerHTML : '';

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '✨ Generating with AI...';
    }

    try {
      const res = await API.generateAISummary(this.activeRecordClassId);
      if (res && res.summary) {
        if (summaryInput) {
          summaryInput.value = res.summary;
        }
        showToast('AI lesson summary generated! You can review or edit before sending to the student.', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to generate AI lesson summary.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    }
  },

  resetSummaryTemplate() {
    const record = (this.classes || []).find(c => Number(c.id) === Number(this.activeRecordClassId));
    const summaryInput = document.getElementById('class-record-summary-input');
    if (!summaryInput) return;

    const studentName = record?.student_name || 'Student';
    const subject = record?.subject || 'Subject';
    const topic = record?.notes || 'Comprehensive lesson review and problem-solving';

    summaryInput.value = `### 📚 ${subject} — 1-on-1 Lesson Summary\n` +
      `**Student:** ${studentName}\n` +
      `**Session Focus:** "${topic}"\n\n` +
      `#### 1. 🎯 Core Concepts Mastered\n` +
      `• Thorough review of foundational mechanics and analytical definitions.\n` +
      `• Addressed targeted questions regarding ${topic}.\n\n` +
      `#### 2. 💡 Problem-Solving & Exercises Covered\n` +
      `• Worked step-by-step through standard diagnostic problems.\n` +
      `• Verified calculation accuracy and discussed alternative solving methods.\n\n` +
      `#### 3. 📝 Recommended Homework & Action Items\n` +
      `• Rework the problems covered in today's class session.\n` +
      `• Complete independent review exercises before our next meeting.\n\n` +
      `#### 4. 🌟 Educator Feedback\n` +
      `Great focus and participation today, ${studentName.split(' ')[0]}! Keep up the dedicated effort.`;
    showToast('Applied standard lesson summary template.', 'info');
  },

  async sendLessonSummary() {
    if (!this.activeRecordClassId) return;
    const summaryInput = document.getElementById('class-record-summary-input');
    const btn = document.getElementById('btn-send-lesson-summary');
    const sentWrap = document.getElementById('class-record-sent-badge-wrap');

    const summaryText = summaryInput ? summaryInput.value.trim() : '';
    if (!summaryText) {
      showToast('Please enter or generate a lesson summary before sending.', 'warning');
      return;
    }

    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = 'Sending...';
    }

    try {
      const res = await API.saveAndSendLessonSummary(this.activeRecordClassId, { summary: summaryText });
      showToast(res.message || 'Lesson summary saved and sent to student!', 'success');

      if (sentWrap) {
        sentWrap.innerHTML = `
          <span style="color: #059669; font-weight: 700; display: inline-flex; align-items: center; gap: 0.3rem;">
            ${Icons.check(14)} Lesson summary sent to student (Just now)
          </span>
        `;
      }

      // Update in-memory record
      if (Array.isArray(this.classes)) {
        this.classes = this.classes.map(c => {
          if (Number(c.id) === Number(this.activeRecordClassId)) {
            return { ...c, lesson_summary: summaryText, summary_sent_at: res.summary_sent_at || new Date().toISOString() };
          }
          return c;
        });
      }

      setTimeout(() => {
        this.closeModal('modal-teacher-class-record');
      }, 900);
    } catch (err) {
      showToast(err.message || 'Failed to send lesson summary.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    }
  },

  // Instant 1-on-1 class modal
  openInstantClassModal(preselectedStudentId = null) {
    if (this.application?.status !== 'approved') {
      showToast('Operational Lock: Live virtual class operations unlock once your account has been approved by the Administrator following your virtual interview.', 'warning');
      return;
    }
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
    if (!this.isApproved()) {
      showToast('Operational Lock: Live virtual class operations unlock once your account has been approved by the Administrator following your virtual interview.', 'warning');
      return;
    }
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
        submitBtn.innerHTML = `${Icons.video(14)} Open Room &amp; Start Class Now`;
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
      this.renderStudentInquiries();
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
          <div style="margin-bottom: 0.5rem; color: var(--gold-600);">${Icons.users(36)}</div>
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

          <!-- Student Inquiry / Question Preview -->
          ${s.latest_inquiry ? `
            <div class="student-inquiry-box" style="margin-top: 0.85rem; padding: 0.75rem 0.9rem; background: rgba(198, 138, 40, 0.07); border: 1.5px solid rgba(198, 138, 40, 0.25); border-radius: 10px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.3rem;">
                <span style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: var(--gold-800); letter-spacing: 0.04em; display: inline-flex; align-items: center; gap: 4px;">
                  ${Icons.message(12)} Student Inquiry / Question
                </span>
                <span style="font-size: 0.72rem; color: var(--text-secondary);">${new Date(s.latest_inquiry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div style="font-size: 0.86rem; color: var(--charcoal-900); font-weight: 600; line-height: 1.4;">
                "${this.escapeHtml(s.latest_inquiry.content || s.latest_inquiry.subject || 'Student inquiry')}"
              </div>
              ${s.latest_reply ? `
                <div style="margin-top: 0.45rem; padding-top: 0.45rem; border-top: 1px dashed rgba(198, 138, 40, 0.25); font-size: 0.8rem; color: var(--charcoal-700);">
                  <strong style="color: var(--gold-800);">Your Response:</strong> "${this.escapeHtml(s.latest_reply.content)}"
                </div>
              ` : `
                <div style="margin-top: 0.4rem; font-size: 0.75rem; color: #B45309; font-weight: 700;">
                  ● Needs Response
                </div>
              `}
            </div>
          ` : ''}

          <!-- Actions -->
          <div class="student-card-actions">
            ${!this.isApproved() ? `
              <button type="button" class="btn btn-secondary btn-sm" style="flex: 1; opacity: 0.7; cursor: not-allowed; display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem;" disabled title="Coursework operations locked while application is under review">
                ${Icons.lock(13)} Operations Locked (Under Review)
              </button>
            ` : `
              ${s.latest_inquiry ? `
                <button type="button" class="btn btn-outline-gold btn-sm" onclick="Teacher.scrollToInquiry(${s.student_id})" title="Respond to Question" style="display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 700;">
                  ${Icons.message(13)} Respond to Question
                </button>
              ` : ''}
              <button type="button" class="btn btn-primary btn-sm" style="flex: 1; justify-content: center; display: inline-flex; align-items: center; gap: 0.35rem;" onclick="Teacher.openAssignTaskModal(${s.student_id})">
                ${Icons.plus(13)} Assign Task
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="Teacher.openInstantClassModal(${s.student_id})" title="Launch Instant Class" style="display: inline-flex; align-items: center; gap: 0.3rem;">
                ${Icons.video(13)} Class
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  },

  renderStudentInquiries() {
    const container = document.getElementById('teacher-students-inquiries-container');
    const badge = document.getElementById('teacher-students-inquiries-count-badge');
    if (!container) return;

    const studentsWithInquiries = (this.students || []).filter(s => s.inquiries && s.inquiries.length > 0);
    const unansweredCount = studentsWithInquiries.filter(s => s.has_unanswered_inquiry).length;

    if (badge) {
      if (unansweredCount > 0) {
        badge.textContent = `${unansweredCount} Needs Response (${studentsWithInquiries.length} Total)`;
        badge.className = 'badge-accent';
      } else {
        badge.textContent = `${studentsWithInquiries.length} Inquir${studentsWithInquiries.length === 1 ? 'y' : 'ies'}`;
        badge.className = 'badge-gold';
      }
    }

    if (studentsWithInquiries.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-xl);">
          <div style="margin-bottom: 0.5rem; color: var(--gold-600);">${Icons.message(32)}</div>
          <h4 style="color: var(--text-primary); font-size: 1.05rem;">No Student Inquiries Yet</h4>
          <p style="color: var(--text-secondary); font-size: 0.85rem; max-width: 440px; margin: 0.4rem auto 0; line-height: 1.45;">
            When students submit questions or inquiries about your subjects, they will appear here where you can respond directly.
          </p>
        </div>
      `;
      return;
    }

    const currentTeacherId = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser.id : null;

    container.innerHTML = studentsWithInquiries.map(s => {
      const messages = s.inquiries || [];
      const studentAvatar = s.student_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80';
      const isOnline = !!s.is_online;
      const statusPill = s.has_unanswered_inquiry 
        ? `<span class="badge-accent" style="background: rgba(245, 158, 11, 0.15); color: #B45309; font-weight: 700; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem;">● Needs Response</span>`
        : `<span class="badge-gold" style="background: rgba(16, 185, 129, 0.15); color: #047857; font-weight: 700; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem;">✓ Answered</span>`;

      return `
        <div class="student-inquiry-card" id="student-inquiry-card-${s.student_id}" style="background: var(--bg-card); border: 1.5px solid var(--border-color); border-radius: var(--radius-xl); padding: 1.5rem; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 1rem;">
          <!-- Inquiry Card Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.85rem;">
              <div style="position: relative;">
                <img src="${studentAvatar}" alt="${s.student_name}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--gold-500);" />
                <span style="position: absolute; bottom: 0; right: 0; width: 12px; height: 12px; border-radius: 50%; background: ${isOnline ? '#10B981' : '#94A3B8'}; border: 2px solid #FFFFFF;"></span>
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <h4 style="margin: 0; font-size: 1.05rem; color: var(--text-primary); font-weight: 700;">${this.escapeHtml(s.student_name)}</h4>
                  <span class="badge-gold" style="font-size: 0.72rem;">${(s.enrolled_subjects || [])[0] || 'Academic Inquiry'}</span>
                  ${statusPill}
                </div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
                  ${this.escapeHtml(s.student_email)} • ${isOnline ? '<strong style="color: #10B981;">● Online (Account Open)</strong>' : '○ Offline'}
                </div>
              </div>
            </div>
            <div>
              <span style="font-size: 0.78rem; color: var(--text-secondary);">${messages.length} message${messages.length === 1 ? '' : 's'} in thread</span>
            </div>
          </div>

          <!-- Messages Stream (Question & Responses) -->
          <div style="display: flex; flex-direction: column; gap: 0.85rem; max-height: 380px; overflow-y: auto; padding-right: 0.5rem;">
            ${messages.map(m => {
              const isTeacher = m.sender_role === 'teacher' || (currentTeacherId && Number(m.sender_id) === Number(currentTeacherId));
              const timeStr = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              
              if (isTeacher) {
                return `
                  <div style="display: flex; justify-content: flex-end; width: 100%;">
                    <div style="max-width: 80%;">
                      <div style="font-size: 0.73rem; color: var(--text-secondary); margin-bottom: 2px; text-align: right;">
                        <strong>You (Educator)</strong> • ${timeStr}
                      </div>
                      <div style="background: #1E293B; border: 1px solid #334155; border-radius: 12px; border-top-right-radius: 2px; padding: 0.75rem 1rem; color: #FFFFFF; font-size: 0.88rem; line-height: 1.45; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                        ${this.formatMessageBody(m)}
                      </div>
                    </div>
                  </div>
                `;
              } else {
                return `
                  <div style="display: flex; gap: 0.65rem; align-items: flex-start; max-width: 80%;">
                    <img src="${studentAvatar}" alt="${s.student_name}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; margin-top: 2px;" />
                    <div style="flex: 1;">
                      <div style="font-size: 0.73rem; color: var(--text-secondary); margin-bottom: 2px;">
                        <strong>${this.escapeHtml(s.student_name)}</strong> • ${timeStr}
                      </div>
                      <div style="background: #FFFFFF; border: 1.5px solid var(--border-color); border-radius: 12px; border-top-left-radius: 2px; padding: 0.75rem 1rem; color: var(--charcoal-900); font-size: 0.88rem; line-height: 1.45; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                        ${m.subject ? `<div style="font-size: 0.73rem; font-weight: 800; text-transform: uppercase; color: var(--gold-800); margin-bottom: 0.25rem;">${this.escapeHtml(m.subject)}</div>` : ''}
                        ${this.formatMessageBody(m)}
                      </div>
                    </div>
                  </div>
                `;
              }
            }).join('')}
          </div>

          <!-- Response Composer -->
          <div style="border-top: 1px solid var(--border-color); padding-top: 0.85rem;">
            ${!this.isApproved() ? `
              <div style="font-size: 0.82rem; color: var(--text-secondary); font-style: italic; display: flex; align-items: center; gap: 4px;">
                ${Icons.lock(13)} Response operations locked while teacher application is under review.
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <textarea 
                  id="inquiry-reply-input-${s.student_id}" 
                  class="form-control" 
                  rows="2" 
                  placeholder="Type your response to ${this.escapeHtml(s.student_name)}'s question..." 
                  style="resize: vertical; font-size: 0.88rem; border-radius: 8px;"
                  onkeydown="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); Teacher.sendInquiryReply(${s.student_id}); }"
                ></textarea>

                <!-- Attachment preview -->
                <div id="inquiry-attachment-preview-${s.student_id}" style="display: none;"></div>

                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                  <div style="display: flex; align-items: center; gap: 0.4rem;">
                    <input type="file" id="inquiry-doc-input-${s.student_id}" accept="*/*" style="display: none;" onchange="Teacher.handleInquiryFileSelected(this, ${s.student_id}, false)" />
                    <input type="file" id="inquiry-pic-input-${s.student_id}" accept="image/*" style="display: none;" onchange="Teacher.handleInquiryFileSelected(this, ${s.student_id}, true)" />

                    <button type="button" class="btn btn-outline-secondary btn-xs" onclick="document.getElementById('inquiry-pic-input-${s.student_id}').click()" title="Attach Photo" style="font-size: 0.75rem; padding: 0.25rem 0.55rem; display: inline-flex; align-items: center; gap: 3px;">
                      ${Icons.image(13)} Picture
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-xs" onclick="document.getElementById('inquiry-doc-input-${s.student_id}').click()" title="Attach Document" style="font-size: 0.75rem; padding: 0.25rem 0.55rem; display: inline-flex; align-items: center; gap: 3px;">
                      ${Icons.paperclip(13)} File
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-xs" onclick="Teacher.insertInquiryLinkPrompt(${s.student_id})" title="Insert URL Link" style="font-size: 0.75rem; padding: 0.25rem 0.55rem; display: inline-flex; align-items: center; gap: 3px;">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> Link
                    </button>
                  </div>

                  <button type="button" class="btn btn-primary btn-sm" onclick="Teacher.sendInquiryReply(${s.student_id})" style="font-weight: 700; padding: 0.4rem 1rem; display: inline-flex; align-items: center; gap: 0.35rem;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg> Send Response
                  </button>
                </div>
              </div>
            `}
          </div>
        </div>
      `;
    }).join('');
  },

  scrollToInquiry(studentId) {
    const card = document.getElementById(`student-inquiry-card-${studentId}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
      card.style.borderColor = 'var(--gold-500)';
      card.style.boxShadow = '0 0 0 3px rgba(198, 138, 40, 0.35)';
      setTimeout(() => {
        card.style.borderColor = '';
        card.style.boxShadow = '';
      }, 2000);
      const input = document.getElementById(`inquiry-reply-input-${studentId}`);
      if (input) setTimeout(() => input.focus(), 350);
    } else {
      const header = document.getElementById('teacher-students-inquiries-header');
      if (header) header.scrollIntoView({ behavior: 'smooth' });
    }
  },

  inquiryAttachments: {},

  async handleInquiryFileSelected(inputEl, studentId, isImage) {
    const file = inputEl.files && inputEl.files[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      showToast('File size exceeds the 25MB limit.', 'error');
      inputEl.value = '';
      return;
    }

    try {
      showToast(`Uploading ${isImage ? 'picture' : 'file'}...`, 'info');
      const formData = new FormData();
      formData.append('file', file);

      const res = await API.uploadMessageAttachment(formData);
      if (res && res.fileUrl) {
        if (!this.inquiryAttachments) this.inquiryAttachments = {};
        this.inquiryAttachments[studentId] = {
          url: res.fileUrl,
          name: res.fileName || file.name,
          type: res.fileType || file.type,
          size: res.fileSize || file.size
        };
        this.renderInquiryAttachmentPreview(studentId);
        showToast(`${isImage ? 'Picture' : 'File'} ready to send.`, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Attachment upload failed.', 'error');
    } finally {
      inputEl.value = '';
    }
  },

  renderInquiryAttachmentPreview(studentId) {
    const previewEl = document.getElementById(`inquiry-attachment-preview-${studentId}`);
    if (!previewEl) return;
    const att = this.inquiryAttachments && this.inquiryAttachments[studentId];
    if (!att) {
      previewEl.innerHTML = '';
      previewEl.style.display = 'none';
      return;
    }

    const isImg = (att.type && att.type.startsWith('image/')) || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(att.name);
    previewEl.style.display = 'flex';
    previewEl.style.alignItems = 'center';
    previewEl.style.gap = '0.5rem';
    previewEl.style.padding = '0.45rem 0.65rem';
    previewEl.style.background = 'rgba(198, 138, 40, 0.08)';
    previewEl.style.border = '1px solid var(--gold-500)';
    previewEl.style.borderRadius = '8px';
    previewEl.style.marginTop = '0.35rem';
    previewEl.innerHTML = `
      ${isImg ? `<img src="${att.url}" alt="Preview" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px;" />` : `<span style="font-size: 1.1rem;">📄</span>`}
      <div style="flex: 1; font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        <strong>${this.escapeHtml(att.name)}</strong> (${this.formatFileSize(att.size)})
      </div>
      <button type="button" class="btn btn-xs btn-outline-danger" onclick="Teacher.removeInquiryAttachment(${studentId})" title="Remove attachment" style="padding: 2px 6px; font-size: 0.75rem;">✕</button>
    `;
  },

  removeInquiryAttachment(studentId) {
    if (this.inquiryAttachments) {
      delete this.inquiryAttachments[studentId];
    }
    this.renderInquiryAttachmentPreview(studentId);
  },

  insertInquiryLinkPrompt(studentId) {
    const url = prompt('Enter website link URL (e.g. https://...):', 'https://');
    if (url && url.trim() && url.trim() !== 'https://') {
      const input = document.getElementById(`inquiry-reply-input-${studentId}`);
      if (input) {
        const val = input.value;
        const prefix = val && !val.endsWith(' ') ? ' ' : '';
        input.value = val + prefix + url.trim() + ' ';
        input.focus();
      }
    }
  },

  async sendInquiryReply(studentId) {
    const input = document.getElementById(`inquiry-reply-input-${studentId}`);
    const text = input ? input.value.trim() : '';
    const attachment = (this.inquiryAttachments && this.inquiryAttachments[studentId]) || null;

    if (!text && !attachment) {
      showToast('Please type a response or attach a file.', 'error');
      return;
    }

    const student = (this.students || []).find(s => s.student_id === studentId);
    if (!student) return;

    try {
      showToast(`Delivering response to ${student.student_name}...`, 'info');
      if (input) input.value = '';

      await API.teacherReplyMessage({
        student_id: studentId,
        subject: (student.latest_inquiry && student.latest_inquiry.subject) || 'Academic Inquiry Response',
        message: text,
        attachment_url: attachment ? attachment.url : null,
        attachment_name: attachment ? attachment.name : null,
        attachment_type: attachment ? attachment.type : null,
        attachment_size: attachment ? attachment.size : null
      });

      if (this.inquiryAttachments) {
        delete this.inquiryAttachments[studentId];
      }
      const prevEl = document.getElementById(`inquiry-attachment-preview-${studentId}`);
      if (prevEl) {
        prevEl.innerHTML = '';
        prevEl.style.display = 'none';
      }

      showToast(`Response delivered to ${student.student_name} in real time.`, 'success');

      // Refresh student roster and inquiry feed
      await this.loadStudents();
    } catch (err) {
      showToast(err.message || 'Failed to send response.', 'error');
    }
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
    this.taskFilter = filter || 'all';
    const selectEl = document.getElementById('teacher-tasks-status-filter');
    if (selectEl && selectEl.value !== this.taskFilter) {
      selectEl.value = this.taskFilter;
    }
    if (btn) {
      document.querySelectorAll('#teacher-tab-students .teacher-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    this.renderTasks();
  },

  searchTasks(query) {
    this.taskSearchQuery = (query || '').trim().toLowerCase();
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

    if (this.taskSearchQuery) {
      filtered = filtered.filter(t => {
        const studentName = (t.student_name || '').toLowerCase();
        const subject = (t.subject || '').toLowerCase();
        const title = (t.title || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const dueDate = (t.due_date || '').toLowerCase();
        const status = (t.status || '').toLowerCase();
        return (
          studentName.includes(this.taskSearchQuery) ||
          subject.includes(this.taskSearchQuery) ||
          title.includes(this.taskSearchQuery) ||
          desc.includes(this.taskSearchQuery) ||
          dueDate.includes(this.taskSearchQuery) ||
          status.includes(this.taskSearchQuery)
        );
      });
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-xl);">
          <div style="margin-bottom: 0.5rem; color: var(--gold-600);">${Icons.fileText(36)}</div>
          <h4 style="color: var(--text-primary); font-size: 1.15rem;">No Coursework Tasks Found</h4>
          <p style="color: var(--text-secondary); font-size: 0.85rem; max-width: 450px; margin: 0.5rem auto 1.25rem;">
            ${this.taskFilter === 'submitted'
          ? 'Great job! You have graded all submitted student assignments.'
          : 'You have not assigned tasks in this view yet.'}
          </p>
          <button type="button" class="btn btn-primary btn-sm" onclick="Teacher.openAssignTaskModal()" style="display: inline-flex; align-items: center; gap: 0.35rem;">
            ${Icons.plus(13)} Assign Task to Student
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
            <p class="task-desc" style="color: var(--text-secondary); font-size: 0.875rem; line-height: 1.5; margin: 0 0 0.85rem;">
              ${task.description}
            </p>

            ${(task.activity_link || task.attachment_url) ? `
              <div style="display: flex; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 1rem;">
                ${task.attachment_url ? `
                  <a href="${task.attachment_url}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-gold btn-sm" style="font-size: 0.78rem; padding: 0.3rem 0.7rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem;">
                    ${Icons.paperclip(13)} ${task.attachment_name || 'Download Activity File'}
                  </a>
                ` : ''}
                ${task.activity_link ? `
                  <a href="${task.activity_link}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="font-size: 0.78rem; padding: 0.3rem 0.7rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem;">
                    ${Icons.externalLink(13)} Open Activity Link
                  </a>
                ` : ''}
              </div>
            ` : ''}

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
            ${!this.isApproved() ? `
              <span style="font-size: 0.8rem; color: #D97706; font-weight: 600; display: inline-flex; align-items: center; gap: 0.3rem;">
                ${Icons.lock(13)} Coursework grading locked while application is under review.
              </span>
            ` : isSubmitted ? `
              <button type="button" class="btn btn-primary btn-sm" onclick="Teacher.openGradeTaskModal(${task.id})" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                ${Icons.award(14)} Grade Submission &amp; Give Feedback
              </button>
            ` : isGraded ? `
              <button type="button" class="btn btn-secondary btn-sm" onclick="Teacher.openGradeTaskModal(${task.id})" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                ${Icons.edit(14)} Edit Grade / Feedback
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
    if (this.application?.status !== 'approved') {
      showToast('Operational Lock: Assigning coursework tasks unlocks once your tutor account has been approved by the Administrator.', 'warning');
      return;
    }
    const studentSelect = document.getElementById('assign-task-student-id');
    const dueDateInput = document.getElementById('assign-task-due-date');
    const linkInput = document.getElementById('assign-task-link');
    const fileInput = document.getElementById('assign-task-file');
    const fileBadge = document.getElementById('assign-task-file-badge');

    if (linkInput) linkInput.value = '';
    if (fileInput) fileInput.value = '';
    if (fileBadge) {
      fileBadge.style.display = 'none';
      fileBadge.textContent = '';
    }

    if (studentSelect) {
      studentSelect.innerHTML = '<option value="">-- Choose an enrolled student --</option>';
      this.students.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.student_id;
        opt.textContent = `${s.student_name} (${s.student_grade || 'Student'})`;
        studentSelect.appendChild(opt);
      });

      const targetId = preselectedStudentId || (this.students.length > 0 ? this.students[0].student_id : '');
      if (targetId) {
        studentSelect.value = targetId;
        this.handleStudentSelectChange(targetId);
      } else {
        this.handleStudentSelectChange('');
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
    const student = this.students.find(s => String(s.student_id) === String(studentId));
    const availedSubject = (student && Array.isArray(student.enrolled_subjects) && student.enrolled_subjects.length > 0)
      ? student.enrolled_subjects[0]
      : '';

    if (subjectInput) {
      subjectInput.value = availedSubject;
    }
  },

  handleAssignTaskFileSelect(inputEl) {
    const fileBadge = document.getElementById('assign-task-file-badge');
    if (!fileBadge) return;
    if (inputEl && inputEl.files && inputEl.files.length > 0) {
      const f = inputEl.files[0];
      fileBadge.style.display = 'block';
      fileBadge.textContent = `Attached file: ${f.name}`;
    } else {
      fileBadge.style.display = 'none';
      fileBadge.textContent = '';
    }
  },

  async handleAssignTaskSubmit() {
    if (!this.isApproved()) {
      showToast('Operational Lock: Assigning coursework tasks unlocks once your tutor account has been approved by the Administrator.', 'warning');
      return;
    }
    const studentId = document.getElementById('assign-task-student-id')?.value || '';
    const student = this.students.find(s => String(s.student_id) === String(studentId));
    const autoSubject = (student && Array.isArray(student.enrolled_subjects) && student.enrolled_subjects.length > 0)
      ? student.enrolled_subjects[0]
      : (document.getElementById('assign-task-subject')?.value.trim() || '');
    const dueDate = document.getElementById('assign-task-due-date')?.value || '';
    const title = document.getElementById('assign-task-title')?.value.trim() || '';
    const desc = document.getElementById('assign-task-desc')?.value.trim() || '';
    const activityLink = document.getElementById('assign-task-link')?.value.trim() || '';
    const fileInput = document.getElementById('assign-task-file');
    const activityFile = (fileInput && fileInput.files && fileInput.files.length > 0) ? fileInput.files[0] : null;
    const submitBtn = document.getElementById('btn-submit-assign-task');

    if (!studentId || !dueDate || !title || !desc) {
      showToast('Please select a student and fill in the required task fields.', 'warning');
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Assigning...';
      }

      const formData = new FormData();
      formData.append('student_id', String(parseInt(studentId, 10)));
      if (autoSubject) formData.append('subject', autoSubject);
      formData.append('due_date', dueDate);
      formData.append('title', title);
      formData.append('description', desc);
      if (activityLink) formData.append('activity_link', activityLink);
      if (activityFile) formData.append('activity_file', activityFile);

      const res = await API.assignStudentTask(formData);

      showToast(res.message || 'Coursework task successfully assigned!', 'success');
      this.closeModal('modal-teacher-assign-task');

      // Refresh task and student rosters
      await this.loadTasks();
      await this.loadStudents();

      // Reset form
      document.getElementById('form-teacher-assign-task')?.reset();
      const fileBadge = document.getElementById('assign-task-file-badge');
      if (fileBadge) {
        fileBadge.style.display = 'none';
        fileBadge.textContent = '';
      }
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
    if (this.application?.status !== 'approved') {
      showToast('Operational Lock: Grading operations unlock once your tutor account has been approved by the Administrator.', 'warning');
      return;
    }
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
    if (!this.isApproved()) {
      showToast('Operational Lock: Grading operations unlock once your tutor account has been approved by the Administrator.', 'warning');
      return;
    }
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
      const rawAppointments = data?.appointments || [];
      const activeAppointments = rawAppointments.filter(a => a.status !== 'completed' && a.status !== 'done' && a.status !== 'cancelled' && a.status !== 'declined' && a.room_status !== 'ended');
      this.scheduleData = {
        ...(data || {}),
        appointments: activeAppointments,
        occupiedSlots: data?.occupiedSlots || []
      };

      // Auto-navigate calendar to upcoming student session if available
      if (!this.selectedDate && activeAppointments.length > 0) {
        const sorted = [...activeAppointments].sort((a, b) => (a.requested_date + ' ' + a.requested_time).localeCompare(b.requested_date + ' ' + b.requested_time));
        const nextApt = sorted[0];
        if (nextApt && nextApt.requested_date) {
          const parts = nextApt.requested_date.split('-');
          if (parts.length >= 2) {
            const aY = parseInt(parts[0], 10);
            const aM = parseInt(parts[1], 10) - 1;
            if (!isNaN(aY) && !isNaN(aM)) {
              this.calYear = aY;
              this.calMonth = aM;
              this.selectedDate = nextApt.requested_date;
            }
          }
        }
      }

      // Load educator personal date notes (both from server & localStorage to guarantee zero loss across refreshes)
      const user = Auth.currentUser;
      const localKey = user ? `aviora_teacher_date_notes_${user.id}` : null;
      let localNotes = {};
      if (localKey) {
        try { localNotes = JSON.parse(localStorage.getItem(localKey) || '{}'); } catch (e) {}
      }
      const serverNotes = data?.availabilitySchedule?.date_notes || {};
      this.dateNotes = Object.assign({}, localNotes, serverNotes);
      if (localKey) {
        try { localStorage.setItem(localKey, JSON.stringify(this.dateNotes)); } catch (e) {}
      }

      // Load educator hours modifications (both from server & localStorage to prevent loss upon refresh)
      const localHoursKey = user ? `aviora_teacher_hours_${user.id}` : null;
      let localHours = {};
      if (localHoursKey) {
        try { localHours = JSON.parse(localStorage.getItem(localHoursKey) || '{}'); } catch (e) {}
      }
      if (this.scheduleData && this.scheduleData.availabilitySchedule) {
        if (!this.scheduleData.availabilitySchedule.date_hours) this.scheduleData.availabilitySchedule.date_hours = {};
        if (!this.scheduleData.availabilitySchedule.date_modes) this.scheduleData.availabilitySchedule.date_modes = {};
        if (!this.scheduleData.availabilitySchedule.day_modes) this.scheduleData.availabilitySchedule.day_modes = {};

        if (localHours.date_hours) {
          for (const [d, blks] of Object.entries(localHours.date_hours)) {
            if (!this.scheduleData.availabilitySchedule.date_hours[d]) {
              this.scheduleData.availabilitySchedule.date_hours[d] = blks;
            }
          }
        }
        if (localHours.date_modes) {
          for (const [d, m] of Object.entries(localHours.date_modes)) {
            if (!this.scheduleData.availabilitySchedule.date_modes[d]) {
              this.scheduleData.availabilitySchedule.date_modes[d] = m;
            }
          }
        }
        if (localHours.day_hours) {
          for (const [d, blks] of Object.entries(localHours.day_hours)) {
            if (!this.scheduleData.availabilitySchedule[d] || this.scheduleData.availabilitySchedule[d].length === 0) {
              this.scheduleData.availabilitySchedule[d] = blks;
            }
          }
        }
        if (localHours.day_modes) {
          for (const [d, m] of Object.entries(localHours.day_modes)) {
            if (!this.scheduleData.availabilitySchedule.day_modes[d]) {
              this.scheduleData.availabilitySchedule.day_modes[d] = m;
            }
          }
        }

        if (localHoursKey) {
          try {
            const cacheObj = {
              date_hours: this.scheduleData.availabilitySchedule.date_hours,
              date_modes: this.scheduleData.availabilitySchedule.date_modes,
              day_modes: this.scheduleData.availabilitySchedule.day_modes
            };
            localStorage.setItem(localHoursKey, JSON.stringify(cacheObj));
          } catch (e) {}
        }
      }

      this.renderSchedule();
    } catch (err) {
      console.error('Failed to load teacher schedule:', err);
    }
  },

  setupCalendarListeners() {
    if (this.calListenersAttached) return;
    const prevBtn = document.getElementById('teacher-cal-prev-btn');
    const nextBtn = document.getElementById('teacher-cal-next-btn');
    const todayBtn = document.getElementById('teacher-cal-today-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.calMonth--;
        if (this.calMonth < 0) {
          this.calMonth = 11;
          this.calYear--;
        }
        this.renderCalendar();
        this.renderDateSchedulePanel();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.calMonth++;
        if (this.calMonth > 11) {
          this.calMonth = 0;
          this.calYear++;
        }
        this.renderCalendar();
        this.renderDateSchedulePanel();
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        const now = new Date();
        this.calYear = now.getFullYear();
        this.calMonth = now.getMonth();
        this.selectedDate = `${this.calYear}-${String(this.calMonth + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        this.renderCalendar();
        this.renderDateSchedulePanel();
      });
    }

    this.calListenersAttached = true;
  },

  renderSchedule() {
    this.renderDefaultAvailabilitySection();
    this.renderCalendar();
    this.renderDateSchedulePanel();
    this.renderUpcomingAppointmentsList();
  },

  renderDefaultAvailabilitySection() {
    const container = document.getElementById('teacher-default-availability-card');
    if (!container) return;

    const availSched = this.scheduleData?.availabilitySchedule || this.tutorProfile?.availability_schedule || {};
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const daysHtml = days.map(day => {
      const blocks = Array.isArray(availSched[day]) ? availSched[day] : [];
      const mode = availSched.day_modes?.[day];
      const isAllDay = mode === 'all_day' || (blocks.length === 1 && blocks[0] === '08:00 - 20:00');
      const hasHours = blocks.length > 0;

      let hoursDisplay = 'Unavailable / Off';
      let statusClass = 'off';

      if (isAllDay) {
        hoursDisplay = 'All Day (8:00 AM – 8:00 PM)';
        statusClass = 'open';
      } else if (hasHours) {
        hoursDisplay = blocks.join(', ');
        statusClass = 'open';
      }

      return `
        <div class="default-avail-day-card ${statusClass}" onclick="Teacher.openDayInWeeklyEditor('${day}')" title="Click to modify ${day} availability">
          <div class="default-avail-day-name">${day}</div>
          <div class="default-avail-day-status">
            ${statusClass === 'open' 
              ? `<span class="default-avail-badge open">${Icons.checkCircle(12, 'color: #059669;')} Open</span>` 
              : `<span class="default-avail-badge off">${Icons.ban(12, 'color: var(--text-secondary);')} Off</span>`}
          </div>
          <div class="default-avail-day-hours">${hoursDisplay}</div>
          <div style="font-size: 0.68rem; color: var(--gold-600); font-weight: 600; margin-top: 0.2rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.2rem;">${Icons.edit(10)} Modify</div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="default-avail-header">
        <div>
          <h3 class="default-avail-title">
            ${Icons.clock(18)} Default Weekly Availability
          </h3>
          <p class="default-avail-subtitle">
            Your recurring standard weekly operating schedule. Click 'Modify Available Days &amp; Times' or select any day below to customize your schedule.
          </p>
        </div>
        <div>
          <button type="button" class="btn btn-outline-gold btn-sm" id="btn-toggle-weekly-editor" onclick="Teacher.toggleWeeklyAvailabilityEditor()" style="font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;">
            ${this.isEditingWeekly ? Icons.x(13) + ' Close Editor' : Icons.edit(13) + ' Modify Available Days &amp; Times'}
          </button>
        </div>
      </div>
      <div style="margin-top: 0.75rem; margin-bottom: 1.25rem; padding: 0.75rem 1rem; background: rgba(198, 138, 40, 0.08); border: 1px solid rgba(198, 138, 40, 0.25); border-radius: 8px; font-size: 0.83rem; color: var(--gold-800); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.6rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: 1.2rem;">${typeof AvioraGeo !== 'undefined' ? AvioraGeo.getCountryFlag(this.tutorProfile?.country || localStorage.getItem('aviora_country') || 'United States') : '🌐'}</span>
          <span><strong>Your Operating Country & Timezone:</strong> ${this.tutorProfile?.country || localStorage.getItem('aviora_country') || 'United States'} (${this.tutorProfile?.timezone || localStorage.getItem('aviora_timezone') || 'America/New_York'} • ${typeof AvioraGeo !== 'undefined' ? AvioraGeo.getTimezoneAbbr(this.tutorProfile?.timezone || localStorage.getItem('aviora_timezone')) : 'EST'})</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.4rem; font-weight: 600;">
          <span id="teacher-live-clock" data-tz="${this.tutorProfile?.timezone || localStorage.getItem('aviora_timezone') || 'America/New_York'}">🕒 ${typeof AvioraGeo !== 'undefined' ? AvioraGeo.getCurrentTimeInZone(this.tutorProfile?.timezone || localStorage.getItem('aviora_timezone')) : ''} local</span>
          <span style="font-weight: 400; opacity: 0.8; font-size: 0.76rem;">• Availability is set in your local time; students see automatically converted slots</span>
        </div>
      </div>
      <div class="default-avail-days-grid">
        ${daysHtml}
      </div>
      ${this.isEditingWeekly ? this.renderWeeklyAvailabilityEditorHtml(availSched) : ''}
    `;
  },

  toggleWeeklyAvailabilityEditor() {
    if (this.application?.status !== 'approved') {
      showToast('Operational Lock: Schedule availability and student bookings unlock once your account has been approved by the Administrator.', 'warning');
      return;
    }
    this.isEditingWeekly = !this.isEditingWeekly;
    this.renderDefaultAvailabilitySection();
    if (this.isEditingWeekly) {
      setTimeout(() => {
        const p = document.getElementById('teacher-weekly-editor-panel');
        if (p) p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    }
  },

  openDayInWeeklyEditor(dayName) {
    if (this.application?.status !== 'approved') {
      showToast('Operational Lock: Schedule availability and student bookings unlock once your account has been approved by the Administrator.', 'warning');
      return;
    }
    this.isEditingWeekly = true;
    this.focusedWeeklyDay = dayName;
    this.renderDefaultAvailabilitySection();
    setTimeout(() => {
      const row = document.getElementById(`weekly-day-row-${dayName}`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        row.style.borderColor = 'var(--gold-500)';
        setTimeout(() => row.style.borderColor = '', 1600);
      }
    }, 60);
  },

  toggleWeeklyDayStatus(dayName) {
    const input = document.getElementById(`weekly-day-status-input-${dayName}`);
    const btn = document.getElementById(`weekly-day-toggle-${dayName}`);
    const hoursWrap = document.getElementById(`weekly-day-hours-wrap-${dayName}`);
    const row = document.getElementById(`weekly-day-row-${dayName}`);
    if (!input || !btn) return;

    const isCurrentlyOpen = input.value === 'open';
    if (isCurrentlyOpen) {
      input.value = 'off';
      btn.className = 'weekly-day-toggle-btn is-off';
      btn.innerHTML = `${Icons.ban(13)} Off (Unavailable)`;
      if (hoursWrap) hoursWrap.style.display = 'none';
      if (row) row.classList.add('is-off');
    } else {
      input.value = 'open';
      btn.className = 'weekly-day-toggle-btn is-open';
      btn.innerHTML = `${Icons.checkCircle(13)} Open (Available)`;
      if (hoursWrap) hoursWrap.style.display = 'flex';
      if (row) row.classList.remove('is-off');
    }
  },

  onWeeklyDayModeChange(dayName, mode) {
    const timeSelects = document.getElementById(`weekly-day-time-selects-${dayName}`);
    if (!timeSelects) return;
    timeSelects.style.display = (mode === 'all_day') ? 'none' : 'inline-flex';
  },

  applyWeeklyPreset(presetName) {
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const weekends = ['Saturday', 'Sunday'];
    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const setDay = (d, status, mode, start, end) => {
      const input = document.getElementById(`weekly-day-status-input-${d}`);
      const btn = document.getElementById(`weekly-day-toggle-${d}`);
      const hoursWrap = document.getElementById(`weekly-day-hours-wrap-${d}`);
      const modeSelect = document.getElementById(`weekly-day-mode-${d}`);
      const timeSelects = document.getElementById(`weekly-day-time-selects-${d}`);
      const startSelect = document.getElementById(`weekly-day-start-${d}`);
      const endSelect = document.getElementById(`weekly-day-end-${d}`);
      const row = document.getElementById(`weekly-day-row-${d}`);

      if (input) input.value = status;
      if (btn) {
        btn.className = `weekly-day-toggle-btn ${status === 'open' ? 'is-open' : 'is-off'}`;
        btn.innerHTML = status === 'open' ? `${Icons.checkCircle(13)} Open (Available)` : `${Icons.ban(13)} Off (Unavailable)`;
      }
      if (hoursWrap) hoursWrap.style.display = status === 'open' ? 'flex' : 'none';
      if (row) {
        if (status === 'open') row.classList.remove('is-off');
        else row.classList.add('is-off');
      }
      if (modeSelect) modeSelect.value = mode;
      if (timeSelects) timeSelects.style.display = mode === 'all_day' ? 'none' : 'inline-flex';
      if (startSelect && start) startSelect.value = start;
      if (endSelect && end) endSelect.value = end;
    };

    if (presetName === 'standard_workweek') {
      weekdays.forEach(d => setDay(d, 'open', 'specific', '09:00', '17:00'));
      weekends.forEach(d => setDay(d, 'off', 'specific', '09:00', '17:00'));
      showToast('Applied Mon–Fri (9 AM – 5 PM) workweek preset.', 'info');
    } else if (presetName === 'all_day_weekdays') {
      weekdays.forEach(d => setDay(d, 'open', 'all_day', '08:00', '20:00'));
      weekends.forEach(d => setDay(d, 'off', 'specific', '09:00', '17:00'));
      showToast('Applied Mon–Fri All Day (8 AM – 8 PM) preset.', 'info');
    } else if (presetName === 'all_days_all_day') {
      allDays.forEach(d => setDay(d, 'open', 'all_day', '08:00', '20:00'));
      showToast('Applied All 7 Days Open preset.', 'info');
    } else if (presetName === 'weekends_off') {
      weekends.forEach(d => setDay(d, 'off', 'specific', '09:00', '17:00'));
      showToast('Set Saturdays & Sundays to Off (Unavailable).', 'info');
    }
  },

  async saveWeeklyAvailability(btnEl = null) {
    if (this.application?.status !== 'approved') {
      showToast('Operational Lock: Schedule availability unlocks once approved.', 'warning');
      return;
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const weeklySchedule = {};
    const dayModes = {};

    for (const d of days) {
      const input = document.getElementById(`weekly-day-status-input-${d}`);
      const modeSelect = document.getElementById(`weekly-day-mode-${d}`);
      const startSelect = document.getElementById(`weekly-day-start-${d}`);
      const endSelect = document.getElementById(`weekly-day-end-${d}`);

      const status = input ? input.value : 'open';
      const mode = modeSelect ? modeSelect.value : 'specific';

      if (status === 'off') {
        weeklySchedule[d] = [];
        dayModes[d] = 'unavailable';
      } else {
        if (mode === 'all_day') {
          weeklySchedule[d] = ['08:00 - 20:00'];
          dayModes[d] = 'all_day';
        } else {
          const s = startSelect ? startSelect.value : '09:00';
          const e = endSelect ? endSelect.value : '17:00';
          const sH = parseInt(s.split(':')[0], 10);
          const eH = parseInt(e.split(':')[0], 10);
          if (isNaN(sH) || isNaN(eH) || eH <= sH) {
            showToast(`For ${d}, the end time must be later than start time.`, 'warning');
            if (endSelect) endSelect.focus();
            return;
          }
          weeklySchedule[d] = [`${s} - ${e}`];
          dayModes[d] = 'specific';
        }
      }
    }

    const origText = btnEl ? btnEl.innerHTML : '';
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.innerHTML = `${Icons.loader(14)} Saving...`;
    }

    const user = Auth.currentUser;
    const localWeeklyKey = user ? `aviora_teacher_weekly_${user.id}` : null;
    if (localWeeklyKey) {
      try {
        localStorage.setItem(localWeeklyKey, JSON.stringify({ weeklySchedule, dayModes }));
      } catch (e) {}
    }

    try {
      const res = await API.setDayAvailability({
        action: 'save_weekly_schedule',
        weekly_schedule: weeklySchedule,
        day_modes: dayModes
      });

      if (res && res.availabilitySchedule) {
        if (!this.scheduleData) this.scheduleData = {};
        this.scheduleData.availabilitySchedule = res.availabilitySchedule;
        if (this.tutorProfile) this.tutorProfile.availability_schedule = res.availabilitySchedule;
      }

      this.isEditingWeekly = false;
      this.focusedWeeklyDay = null;
      this.renderSchedule();
      showToast('Weekly availability successfully updated! Operating hours are now live.', 'success');
    } catch (err) {
      console.error('Failed to save weekly availability:', err);
      showToast(err.message || 'Failed to save weekly schedule.', 'error');
    } finally {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerHTML = origText;
      }
    }
  },

  renderWeeklyAvailabilityEditorHtml(availSched) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const timeOptions = [];
    for (let h = 7; h <= 21; h++) {
      const val24 = `${String(h).padStart(2, '0')}:00`;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hr12 = h % 12 === 0 ? 12 : h % 12;
      const lbl = `${String(hr12).padStart(2, '0')}:00 ${ampm}`;
      timeOptions.push({ val: val24, lbl });
    }

    const rowsHtml = days.map(day => {
      const blocks = Array.isArray(availSched[day]) ? availSched[day] : [];
      const mode = availSched.day_modes?.[day];
      const isDayOff = mode === 'unavailable' || (blocks.length === 0 && mode !== 'all_day');
      const isAllDay = !isDayOff && (mode === 'all_day' || (blocks.length === 1 && blocks[0] === '08:00 - 20:00'));

      let startVal = '09:00';
      let endVal = '17:00';
      if (blocks.length > 0 && typeof blocks[0] === 'string') {
        const parts = blocks[0].split('-').map(s => s.trim());
        if (parts.length === 2) {
          const sH = this.parseTimeHour(parts[0]);
          const eH = this.parseTimeHour(parts[1]);
          if (sH) startVal = `${String(sH.hour).padStart(2, '0')}:00`;
          if (eH) endVal = `${String(eH.hour).padStart(2, '0')}:00`;
        }
      }

      const isFocused = this.focusedWeeklyDay === day;

      return `
        <div class="weekly-day-editor-row ${isDayOff ? 'is-off' : ''}" id="weekly-day-row-${day}" style="${isFocused ? 'border-color: var(--gold-500);' : ''}">
          <div class="weekly-day-name-col">
            <span>${day}</span>
          </div>
          
          <div>
            <button type="button" class="weekly-day-toggle-btn ${!isDayOff ? 'is-open' : 'is-off'}" id="weekly-day-toggle-${day}" onclick="Teacher.toggleWeeklyDayStatus('${day}')">
              ${!isDayOff ? Icons.checkCircle(13) + ' Open (Available)' : Icons.ban(13) + ' Off (Unavailable)'}
            </button>
            <input type="hidden" id="weekly-day-status-input-${day}" value="${!isDayOff ? 'open' : 'off'}" />
          </div>

          <div class="weekly-day-hours-controls" id="weekly-day-hours-wrap-${day}" style="display: ${!isDayOff ? 'flex' : 'none'};">
            <div style="display: flex; gap: 0.35rem; align-items: center;">
              <label style="margin: 0; font-size: 0.76rem; color: var(--text-secondary); font-weight: 600;">Mode:</label>
              <select class="weekly-hour-select" id="weekly-day-mode-${day}" onchange="Teacher.onWeeklyDayModeChange('${day}', this.value)">
                <option value="specific" ${!isAllDay ? 'selected' : ''}>Specific Hours</option>
                <option value="all_day" ${isAllDay ? 'selected' : ''}>All Day (8 AM – 8 PM)</option>
              </select>
            </div>

            <div id="weekly-day-time-selects-${day}" style="display: ${!isAllDay ? 'inline-flex' : 'none'}; align-items: center; gap: 0.35rem;">
              <span style="font-size: 0.76rem; color: var(--text-secondary);">From:</span>
              <select class="weekly-hour-select" id="weekly-day-start-${day}">
                ${timeOptions.slice(0, -1).map(t => `<option value="${t.val}" ${t.val === startVal ? 'selected' : ''}>${t.lbl}</option>`).join('')}
              </select>
              <span style="font-size: 0.76rem; color: var(--text-secondary);">To:</span>
              <select class="weekly-hour-select" id="weekly-day-end-${day}">
                ${timeOptions.slice(1).map(t => `<option value="${t.val}" ${t.val === endVal ? 'selected' : ''}>${t.lbl}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="weekly-avail-editor-panel" id="teacher-weekly-editor-panel">
        <div class="weekly-avail-editor-header">
          <div>
            <h4 style="margin: 0 0 0.2rem 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 0.45rem;">
              ${Icons.edit(16)} Modify Standard Weekly Operating Schedule
            </h4>
            <p style="margin: 0; font-size: 0.8rem; color: var(--text-secondary);">
              Toggle available days and customize operating hours for recurring student bookings. Changes take effect immediately.
            </p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="Teacher.toggleWeeklyAvailabilityEditor()" style="padding: 0.25rem 0.65rem; font-size: 0.78rem;">
            ${Icons.x(12)} Close
          </button>
        </div>

        <!-- Quick Presets -->
        <div class="weekly-presets-row">
          <span style="font-size: 0.76rem; font-weight: 700; color: var(--text-primary); margin-right: 0.25rem;">Quick Presets:</span>
          <button type="button" class="btn btn-outline-gold btn-sm" onclick="Teacher.applyWeeklyPreset('standard_workweek')" style="padding: 0.2rem 0.55rem; font-size: 0.74rem;">
            Mon–Fri 9 AM – 5 PM
          </button>
          <button type="button" class="btn btn-outline-gold btn-sm" onclick="Teacher.applyWeeklyPreset('all_day_weekdays')" style="padding: 0.2rem 0.55rem; font-size: 0.74rem;">
            Mon–Fri 8 AM – 8 PM
          </button>
          <button type="button" class="btn btn-outline-gold btn-sm" onclick="Teacher.applyWeeklyPreset('all_days_all_day')" style="padding: 0.2rem 0.55rem; font-size: 0.74rem;">
            All 7 Days Open
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="Teacher.applyWeeklyPreset('weekends_off')" style="padding: 0.2rem 0.55rem; font-size: 0.74rem;">
            Weekends Off
          </button>
        </div>

        <!-- Day Rows -->
        <div class="weekly-days-list" style="margin-bottom: 1.15rem;">
          ${rowsHtml}
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.65rem; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.85rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="Teacher.toggleWeeklyAvailabilityEditor()" style="padding: 0.45rem 1rem;">
            Cancel
          </button>
          <button type="button" class="btn btn-primary btn-sm" id="btn-save-weekly-avail" onclick="Teacher.saveWeeklyAvailability(this)" style="font-weight: 700; padding: 0.45rem 1.35rem; display: inline-flex; align-items: center; gap: 0.35rem;">
            ${Icons.save(14)} Save Weekly Availability
          </button>
        </div>
      </div>
    `;
  },

  clearSelectedCalendarDate() {
    this.selectedDate = null;
    this.isEditingDateNote = false;
    this.showHoursEditor = false;
    this.renderCalendar();
    this.renderDateSchedulePanel();
  },

  parseTimeHour(timeStr) {
    if (!timeStr) return null;
    const m = String(timeStr).trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!m) return null;
    let hr = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ampm = m[3] ? m[3].toUpperCase() : null;
    if (ampm === 'PM' && hr < 12) hr += 12;
    if (ampm === 'AM' && hr === 12) hr = 0;
    return { hour: hr, minute: min };
  },

  doesTimeMatchSlot(requestedTime, slotLabel) {
    if (!requestedTime || !slotLabel) return false;
    const reqParsed = this.parseTimeHour(requestedTime);
    const slotParsed = this.parseTimeHour(slotLabel);
    if (reqParsed && slotParsed) {
      return reqParsed.hour === slotParsed.hour;
    }
    return String(requestedTime).replace(/\s+/g, '').toLowerCase().includes(String(slotLabel).replace(/\s+/g, '').toLowerCase());
  },

  expandBlocksToHours(blocks) {
    if (!Array.isArray(blocks)) return [];
    const hours = [];
    blocks.forEach(b => {
      if (typeof b !== 'string') return;
      const parts = b.split('-').map(s => s.trim());
      if (parts.length === 2) {
        const sParsed = this.parseTimeHour(parts[0]);
        const eParsed = this.parseTimeHour(parts[1]);
        if (sParsed && eParsed && eParsed.hour > sParsed.hour) {
          for (let h = sParsed.hour; h < eParsed.hour; h++) {
            if (!hours.includes(h)) hours.push(h);
          }
        }
      } else {
        const single = this.parseTimeHour(b);
        if (single && !hours.includes(single.hour)) hours.push(single.hour);
      }
    });
    return hours.sort((a, b) => a - b);
  },

  formatHour12Label(hr) {
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const hr12 = hr % 12 === 0 ? 12 : hr % 12;
    return `${String(hr12).padStart(2, '0')}:00 ${ampm}`;
  },

  isDateMarkedUnavailable(dateStr, dayOfWeekName) {
    const unavailableDates = this.scheduleData?.unavailableDates || this.scheduleData?.availabilitySchedule?.unavailable_dates || [];
    if (unavailableDates.includes(dateStr)) return true;
    const dateMode = this.scheduleData?.availabilitySchedule?.date_modes?.[dateStr];
    if (dateMode === 'unavailable') return true;
    const occupiedSlots = this.scheduleData?.occupiedSlots || [];
    const dayOccupied = occupiedSlots.filter(o => o.date === dateStr || (!o.date && dayOfWeekName && o.day_of_week === dayOfWeekName));
    if (dayOccupied.some(o => o.time_slot === 'ALL_DAY')) return true;
    if (dayOccupied.filter(o => o.date === dateStr).length >= 11) return true;
    return false;
  },

  renderCalendar() {
    const calendarGrid = document.getElementById('teacher-calendar-grid');
    const monthTitle = document.getElementById('teacher-cal-month-title');
    if (!calendarGrid) return;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const monthDate = new Date(this.calYear, this.calMonth, 1);
    if (monthTitle) {
      monthTitle.textContent = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    const firstDayIndex = monthDate.getDay(); // 0 is Sunday
    const daysInMonth = new Date(this.calYear, this.calMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(this.calYear, this.calMonth, 0).getDate();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const appointments = this.scheduleData?.appointments || [];
    const occupiedSlots = this.scheduleData?.occupiedSlots || [];

    // Render upcoming session banner above calendar
    const nextSessionBar = document.getElementById('teacher-cal-next-session-bar');
    if (nextSessionBar) {
      const activeUpcomingApts = appointments
        .filter(a => a.requested_date && a.status !== 'completed' && a.status !== 'done' && a.status !== 'cancelled' && a.status !== 'declined' && a.room_status !== 'ended')
        .sort((a, b) => {
          const da = `${a.requested_date.split('T')[0]} ${a.requested_time || '00:00'}`;
          const db = `${b.requested_date.split('T')[0]} ${b.requested_time || '00:00'}`;
          return da.localeCompare(db);
        });

      if (activeUpcomingApts.length > 0) {
        const nextApt = activeUpcomingApts[0];
        const nextDateStr = nextApt.requested_date.split('T')[0];
        const nextDateObj = new Date(nextDateStr + 'T00:00:00');
        const nextDateFormatted = nextDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        nextSessionBar.style.display = 'flex';
        nextSessionBar.style.background = 'rgba(59, 130, 246, 0.08)';
        nextSessionBar.style.borderColor = 'rgba(59, 130, 246, 0.2)';
        nextSessionBar.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
            <span style="font-weight: 700; color: #1D4ED8; display: inline-flex; align-items: center; gap: 0.35rem;">
              ${Icons.calendar(15, 'color: #3B82F6;')} Next Scheduled Class:
            </span>
            <strong style="color: var(--text-primary); font-size: 0.88rem;">${this.escapeHtml(nextApt.student_name || 'Student')}</strong>
            <span class="badge" style="background: rgba(59, 130, 246, 0.12); color: #2563EB; font-size: 0.72rem; padding: 0.15rem 0.5rem; font-weight: 600;">${this.escapeHtml(nextApt.subject || 'Class')}</span>
            <span style="color: var(--text-secondary); font-size: 0.8rem;">● ${nextDateFormatted} at ${this.escapeHtml(nextApt.requested_time || '')} (50m)</span>
            <span class="status-pill ${nextApt.status === 'accepted' ? 'accepted' : 'pending'}" style="font-size: 0.68rem; padding: 0.1rem 0.45rem; text-transform: uppercase;">${nextApt.status === 'accepted' ? 'Confirmed' : 'Pending'}</span>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="Teacher.selectCalendarDate('${nextDateStr}')" style="padding: 0.25rem 0.65rem; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.25rem;">
            View on Calendar →
          </button>
        `;
      } else {
        nextSessionBar.style.display = 'flex';
        nextSessionBar.style.background = 'rgba(16, 185, 129, 0.08)';
        nextSessionBar.style.borderColor = 'rgba(16, 185, 129, 0.2)';
        nextSessionBar.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.5rem; color: #047857; font-size: 0.82rem;">
            <span>${Icons.checkCircle(14, 'color: #10B981;')}</span>
            <span><strong>No pending or ongoing sessions</strong> — All completed classes are cleared from your schedule. Ready for upcoming bookings!</span>
          </div>
        `;
      }
    }

    // Update calendar header info bar (no duplicate action buttons)
    const calHintBox = document.querySelector('#view-teacher-schedule .teacher-cal-hint');
    if (calHintBox) {
      if (this.selectedDate) {
        const selDateObj = new Date(this.selectedDate + 'T00:00:00');
        const selShortDate = selDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        calHintBox.innerHTML = `
          <div class="teacher-cal-selected-bar">
            <span class="teacher-cal-selected-label">Selected: <strong>${selShortDate}</strong></span>
            <button type="button" class="btn btn-secondary btn-sm" onclick="Teacher.clearSelectedCalendarDate()" style="padding: 0.2rem 0.55rem; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 0.25rem;" title="Deselect date">${Icons.x(12)} Deselect</button>
          </div>
        `;
      } else {
        calHintBox.innerHTML = `
          <span style="font-size: 0.85rem; color: var(--gold-400); font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem;">${Icons.calendar(13, 'color: var(--gold-500);')} Click any date to view notes &amp; edit availability</span>
        `;
      }
    }

    // Map appointments by YYYY-MM-DD (exclude completed or cancelled sessions)
    const aptsByDate = {};
    appointments.forEach(apt => {
      if (!apt.requested_date) return;
      if (apt.status === 'completed' || apt.status === 'done' || apt.status === 'cancelled' || apt.status === 'declined' || apt.room_status === 'ended') return;
      const dStr = apt.requested_date.split('T')[0];
      if (!aptsByDate[dStr]) aptsByDate[dStr] = [];
      aptsByDate[dStr].push(apt);
    });

    let cellsHtml = '';

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      let prevM = this.calMonth;
      let prevY = this.calYear;
      if (prevM === 0) {
        prevM = 12;
        prevY--;
      }
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayApts = aptsByDate[dateStr] || [];
      cellsHtml += `
        <div class="teacher-cal-day-cell is-other-month" onclick="Teacher.selectCalendarDate('${dateStr}')">
          <div class="teacher-cal-day-header">
            <span class="teacher-cal-day-num">${dayNum}</span>
          </div>
          ${dayApts.length > 0 ? `
            <div class="teacher-cal-events-list">
              ${dayApts.slice(0, 1).map(apt => `
                <div class="cal-event-chip chip-class" style="opacity: 0.85;" title="${this.escapeHtml(apt.student_name || 'Student')} • ${this.escapeHtml(apt.subject || 'Class')}">
                  <div class="chip-time">${this.escapeHtml(apt.requested_time || '')}</div>
                  <div class="chip-student">${this.escapeHtml(apt.student_name || 'Student')}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${this.calYear}-${String(this.calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const cellDate = new Date(this.calYear, this.calMonth, day);
      const dayOfWeekName = dayNames[cellDate.getDay()];

      const isToday = dateStr === todayStr;
      const isSelected = dateStr === this.selectedDate;
      const isDateOccupied = this.isDateMarkedUnavailable(dateStr, dayOfWeekName);

      const dayApts = aptsByDate[dateStr] || [];
      const hasPersonalNote = !!(this.dateNotes && this.dateNotes[dateStr]);
      const personalNote = hasPersonalNote ? this.dateNotes[dateStr] : '';
      const hasStudentNotes = dayApts.some(a => a.notes);

      cellsHtml += `
        <div class="teacher-cal-day-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''} ${isDateOccupied ? 'is-date-occupied' : ''}" 
             onclick="Teacher.selectCalendarDate('${dateStr}')"
             title="${dayOfWeekName}, ${dateStr}${isDateOccupied ? ' • Marked Occupied' : ''}${dayApts.length > 0 ? ` • ${dayApts.length} class(es)` : ''}${hasPersonalNote ? ` • Note: ${personalNote}` : ''} — Click to view notes & schedule">
          <div class="teacher-cal-day-header">
            <span class="teacher-cal-day-num">${day}</span>
            ${hasPersonalNote || hasStudentNotes ? `<span class="cal-note-indicator-dot" title="Has Notes (Click to view)">${Icons.note(12, 'color: var(--gold-600);')}</span>` : ''}
          </div>
          <div class="teacher-cal-events-list">
            ${dayApts.length > 0 ? `
              ${dayApts.slice(0, 2).map(apt => `
                <div class="cal-event-chip chip-class" title="${this.escapeHtml(apt.student_name || 'Student')} • ${this.escapeHtml(apt.subject || 'Class')} (${this.escapeHtml(apt.requested_time || '')})">
                  <div class="chip-time">${this.escapeHtml(apt.requested_time || '')}</div>
                  <div class="chip-student">${this.escapeHtml(apt.student_name || 'Student')}</div>
                </div>
              `).join('')}
              ${dayApts.length > 2 ? `<div style="font-size: 0.62rem; color: #2563EB; font-weight: 700; padding: 0.05rem 0.2rem;">+${dayApts.length - 2} more</div>` : ''}
            ` : isDateOccupied ? `
              <div class="cal-event-chip chip-occupied" title="Marked Occupied">
                <span>${Icons.ban(10, 'color: #EF4444;')} Occupied</span>
              </div>
            ` : (hasPersonalNote ? `
              <span class="cal-mini-badge badge-note" style="margin-top: 0.2rem;">${Icons.note(10, 'color: var(--gold-600);')} Note</span>
            ` : '')}
          </div>
        </div>
      `;
    }

    // Trailing days for next month to complete the row
    const totalRendered = firstDayIndex + daysInMonth;
    const remaining = (7 - (totalRendered % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      let nextM = this.calMonth + 2;
      let nextY = this.calYear;
      if (nextM > 12) {
        nextM = 1;
        nextY++;
      }
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayApts = aptsByDate[dateStr] || [];
      cellsHtml += `
        <div class="teacher-cal-day-cell is-other-month" onclick="Teacher.selectCalendarDate('${dateStr}')">
          <div class="teacher-cal-day-header">
            <span class="teacher-cal-day-num">${day}</span>
          </div>
          ${dayApts.length > 0 ? `
            <div class="teacher-cal-events-list">
              ${dayApts.slice(0, 1).map(apt => `
                <div class="cal-event-chip chip-class" style="opacity: 0.85;" title="${this.escapeHtml(apt.student_name || 'Student')} • ${this.escapeHtml(apt.subject || 'Class')}">
                  <div class="chip-time">${this.escapeHtml(apt.requested_time || '')}</div>
                  <div class="chip-student">${this.escapeHtml(apt.student_name || 'Student')}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }

    calendarGrid.innerHTML = cellsHtml;
  },

  selectCalendarDate(dateStr) {
    this.selectedDate = dateStr;
    const dateObj = new Date(dateStr + 'T00:00:00');
    if (dateObj.getMonth() !== this.calMonth || dateObj.getFullYear() !== this.calYear) {
      this.calYear = dateObj.getFullYear();
      this.calMonth = dateObj.getMonth();
    }
    this.renderCalendar();
    this.renderDateSchedulePanel();

    // Smooth scroll down to date schedule & notes panel so the note is instantly visible
    const panel = document.getElementById('teacher-date-schedule-panel');
    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  renderDateSchedulePanel() {
    const panel = document.getElementById('teacher-date-schedule-panel');
    if (!panel) return;

    if (!this.selectedDate) {
      panel.innerHTML = `
        <div class="date-schedule-empty-prompt">
          <div style="margin-bottom: 0.6rem; color: var(--gold-600);">${Icons.calendar(32)}</div>
          <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.35rem;">
            Select a Date to View Notes &amp; Customize Availability
          </h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0; max-width: 520px;">
            Click any date on the calendar above to view notes, mark availability, or customize hours for that date while preserving your default weekly schedule.
          </p>
        </div>
      `;
      return;
    }

    const dateObj = new Date(this.selectedDate + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    const dayOfWeekName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

    const appointments = this.scheduleData?.appointments || [];
    const occupiedSlots = this.scheduleData?.occupiedSlots || [];
    const availSched = this.scheduleData?.availabilitySchedule || this.tutorProfile?.availability_schedule || {};

    const isDateOccupied = this.isDateMarkedUnavailable(this.selectedDate, dayOfWeekName);
    const dayApts = appointments.filter(a => (a.requested_date || '').startsWith(this.selectedDate) && a.status !== 'completed' && a.status !== 'done' && a.status !== 'cancelled' && a.status !== 'declined' && a.room_status !== 'ended');
    const dayOccupied = occupiedSlots.filter(o => (o.date === this.selectedDate || (!o.date && o.day_of_week === dayOfWeekName)) && o.time_slot !== 'ALL_DAY');

    // Resolve configured available hours for this date / weekday
    const hasDateOverride = Array.isArray(availSched.date_hours?.[this.selectedDate]);
    const rawBlocks = hasDateOverride
      ? availSched.date_hours[this.selectedDate]
      : (Array.isArray(availSched[dayOfWeekName]) ? availSched[dayOfWeekName] : ['09:00 - 17:00']);
    const configuredHours = this.expandBlocksToHours(rawBlocks);

    const savedMode = availSched.date_modes?.[this.selectedDate] || availSched.day_modes?.[dayOfWeekName] || (configuredHours.length >= 11 ? 'all_day' : 'specific');
    const activeMode = this.editingHoursMode || (savedMode === 'all_day' ? 'all_day' : 'specific');

    const defaultStartHour = configuredHours.length > 0 ? configuredHours[0] : 9;
    const defaultEndHour = configuredHours.length > 0 ? (configuredHours[configuredHours.length - 1] + 1) : 17;

    const timeSlots = [
      '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
      '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
      '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'
    ];

    const startHourOptions = [];
    const endHourOptions = [];
    for (let h = 8; h <= 20; h++) {
      const val24 = `${String(h).padStart(2, '0')}:00`;
      const lbl12 = this.formatHour12Label(h);
      startHourOptions.push(`<option value="${val24}" ${h === defaultStartHour ? 'selected' : ''}>${lbl12} (${val24})</option>`);
    }
    for (let h = 9; h <= 21; h++) {
      const val24 = `${String(h).padStart(2, '0')}:00`;
      const lbl12 = this.formatHour12Label(h);
      endHourOptions.push(`<option value="${val24}" ${h === defaultEndHour ? 'selected' : ''}>${lbl12} (${val24})</option>`);
    }

    const activeHoursDisplayText = isDateOccupied
      ? 'Blocked for Student Bookings'
      : (savedMode === 'all_day'
          ? 'All Day (8:00 AM – 8:00 PM)'
          : (rawBlocks.length > 0 ? `Specific Hours (${rawBlocks.join(', ')})` : 'No hours configured'));

    const savedDateNote = (this.dateNotes && this.dateNotes[this.selectedDate]) || '';

    panel.innerHTML = `
      <div class="date-schedule-header">
        <div>
          <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
            <h3 class="date-schedule-title" style="margin: 0; font-size: 1.15rem;">
              ${Icons.calendar(18)} ${formattedDate}
            </h3>
            ${isDateOccupied ? `
              <span class="status-pill declined" style="font-size: 0.72rem; padding: 0.15rem 0.6rem; display: inline-flex; align-items: center; gap: 0.25rem;">${Icons.ban(12, 'color: #EF4444;')} Occupied</span>
            ` : `
              <span class="status-pill accepted" style="font-size: 0.72rem; padding: 0.15rem 0.6rem; display: inline-flex; align-items: center; gap: 0.25rem;">${Icons.checkCircle(12, 'color: #10B981;')} Open</span>
            `}
          </div>
          <p style="margin: 0.2rem 0 0; font-size: 0.825rem; color: var(--text-secondary);">
            Options for this selected date (maintains default settings on other dates).
          </p>
        </div>
        <div class="date-schedule-actions">
          ${isDateOccupied ? `
            <button type="button" class="btn btn-primary btn-sm" onclick="Teacher.bulkSetDayAvailability('date_available')" style="background: #10B981; border-color: #10B981; display: inline-flex; align-items: center; gap: 0.35rem;">
              ${Icons.checkCircle(13)} Mark Available
            </button>
          ` : `
            <button type="button" class="btn btn-sm btn-mark-date-unavailable" onclick="Teacher.bulkSetDayAvailability('date_occupied')" style="display: inline-flex; align-items: center; gap: 0.35rem;">
              ${Icons.ban(13)} Mark Occupied
            </button>
            <button type="button" class="btn btn-outline-gold btn-sm" onclick="Teacher.bulkSetDayAvailability('date_available')" style="display: inline-flex; align-items: center; gap: 0.35rem;">
              ${Icons.check(13)} Set All Open
            </button>
          `}
          <button type="button" class="btn btn-secondary btn-sm" onclick="Teacher.clearSelectedCalendarDate()" title="Close editor and return to default view" style="display: inline-flex; align-items: center; gap: 0.3rem;">
            ${Icons.x(13)} Close
          </button>
        </div>
      </div>

      <!-- Selected Date Notes Section -->
      <div class="date-notes-section">
        <div class="date-notes-title-row">
          <h4 class="date-notes-title">
            <span style="display: inline-flex; align-items: center; gap: 0.4rem;">${Icons.note(16, 'color: var(--gold-600);')} Session Notes &amp; Focus</span>
          </h4>
          <div style="display: flex; gap: 0.4rem; align-items: center;">
            ${savedDateNote && !this.isEditingDateNote ? `
              <button type="button" class="btn btn-outline-gold btn-sm" onclick="Teacher.toggleEditDateNote()" style="padding: 0.25rem 0.65rem; font-size: 0.76rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                ${Icons.edit(12)} Edit
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="Teacher.deleteDateNote('${this.selectedDate}')" style="padding: 0.25rem 0.65rem; font-size: 0.76rem; color: #EF4444; display: inline-flex; align-items: center; gap: 0.25rem;">
                ${Icons.trash(12)} Clear
              </button>
            ` : !this.isEditingDateNote ? `
              <button type="button" class="btn btn-outline-gold btn-sm" onclick="Teacher.toggleEditDateNote()" style="padding: 0.25rem 0.65rem; font-size: 0.76rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                ${Icons.plus(12)} Add Note
              </button>
            ` : ''}
          </div>
        </div>

        <div class="date-notes-grid">
          ${isDateOccupied ? `
            <div class="date-note-box occupied-note-box">
              <div class="date-note-header">
                <span class="date-note-badge" style="color: #DC2626; display: inline-flex; align-items: center; gap: 0.25rem;">${Icons.ban(12)} Date Status Note</span>
                <span class="status-pill declined" style="font-size: 0.68rem; padding: 0.1rem 0.45rem;">Occupied</span>
              </div>
              <div class="date-note-body" style="font-style: normal; color: #B91C1C;">
                This date is marked as <strong>Not Available / Occupied</strong>. Student bookings are disabled on this date.
              </div>
            </div>
          ` : ''}

          <!-- Personal Educator Note / Reminders -->
          <div class="date-note-box personal-note-box">
            <div class="date-note-header">
              <span class="date-note-badge" style="color: #2563EB; display: inline-flex; align-items: center; gap: 0.25rem;">${Icons.note(12)} Educator Reminder</span>
            </div>
            ${this.isEditingDateNote ? `
              <div style="margin-top: 0.5rem;">
                <textarea id="teacher-date-note-input" class="form-control" rows="2" style="font-size: 0.85rem;" placeholder="Write a note or reminder for ${formattedDate}...">${savedDateNote || ''}</textarea>
                <div style="display: flex; justify-content: flex-end; gap: 0.45rem; margin-top: 0.45rem;">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="Teacher.toggleEditDateNote()">Cancel</button>
                  <button type="button" class="btn btn-primary btn-sm" onclick="Teacher.saveDateNote('${this.selectedDate}')">Save</button>
                </div>
              </div>
            ` : savedDateNote ? `
              <div class="date-note-body" style="font-style: normal; color: var(--text-primary);">
                ${this.escapeHtml(savedDateNote)}
              </div>
            ` : `
              <div class="date-note-empty">
                No personal note added. Click <strong>+ Add Note</strong> above to write reminders or prep tasks.
              </div>
            `}
          </div>

          <!-- Student Focus & Booking Notes for this Date -->
          ${dayApts.length > 0 ? dayApts.filter(a => a.notes).map(apt => `
            <div class="date-note-box student-focus-box">
              <div class="date-note-header">
                <span class="date-note-badge" style="display: inline-flex; align-items: center; gap: 0.25rem;">${Icons.graduationCap(13)} Student Focus</span>
                <span class="date-note-author">${apt.student_name} (${apt.subject} • ${apt.requested_time})</span>
              </div>
              <div class="date-note-body">
                "${this.escapeHtml(apt.notes)}"
              </div>
              ${apt.tutor_response_note ? `
                <div class="date-note-response">
                  <strong>Your Response:</strong> ${this.escapeHtml(apt.tutor_response_note)}
                </div>
              ` : ''}
            </div>
          `).join('') : ''}
        </div>
      </div>

      <div class="date-schedule-columns">
        <!-- Time Slot Availability (Full Width, Compact Vertical Profile) -->
        <div class="time-slot-availability-section">
          <div class="date-schedule-col-title">
            <span>Time Slot Availability</span>
            <span style="font-size: 0.75rem; color: var(--gold-400); font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem;">${Icons.zap(12, 'color: var(--gold-500);')} Live</span>
          </div>

          <!-- Specify & Edit Available Hours Card -->
          <div class="time-slot-availability-editor">
            <div class="tsa-top-bar">
              <div class="tsa-current-info">
                <div class="tsa-current-label">Current Hours (${dayOfWeekName})</div>
                <div class="tsa-current-value ${isDateOccupied ? 'is-occupied' : ''}">${activeHoursDisplayText}</div>
              </div>

              <div class="tsa-top-actions">
                <div class="tsa-mode-pills-row">
                  <button type="button" class="tsa-mode-pill ${!isDateOccupied && activeMode === 'all_day' ? 'active' : ''}" onclick="Teacher.selectAvailabilityMode('all_day')" style="display: inline-flex; align-items: center; gap: 0.35rem; justify-content: center;">
                    ${Icons.sun(14)} All Day (8 AM – 8 PM)
                  </button>
                  <button type="button" class="tsa-mode-pill ${!isDateOccupied && activeMode === 'specific' ? 'active' : ''}" onclick="Teacher.selectAvailabilityMode('specific')" style="display: inline-flex; align-items: center; gap: 0.35rem; justify-content: center;">
                    ${Icons.target(14)} Specific Hours
                  </button>
                </div>

                <button type="button" class="btn btn-outline-gold btn-sm" onclick="Teacher.toggleHoursEditor()" style="padding: 0.35rem 0.75rem; font-size: 0.76rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.3rem;">
                  ${this.showHoursEditor ? Icons.x(13) + ' Close' : Icons.edit(13) + ' Edit Hours'}
                </button>
              </div>
            </div>

            <div id="teacher-hours-editor-body" class="tsa-editor-body" style="display: ${this.showHoursEditor || activeMode === 'specific' ? 'block' : 'none'};">
              ${activeMode === 'all_day' ? `
                <div class="tsa-allday-row">
                  <div style="font-size: 0.85rem; color: var(--text-secondary);">
                    Set to <strong>Available All Day (8:00 AM – 8:00 PM)</strong>. Open 50-minute sessions throughout the day.
                  </div>
                  <div style="display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap;">
                    <div style="min-width: 200px;">
                      <label class="tsa-field-label">Apply To</label>
                      <select id="tsa-apply-scope" class="form-control tsa-select">
                        <option value="date" selected>This Date Only (${this.selectedDate})</option>
                        <option value="weekday">Every ${dayOfWeekName}</option>
                        <option value="all_days">All Days (Mon–Sun)</option>
                      </select>
                    </div>
                    <button type="button" class="btn btn-primary btn-sm tsa-save-btn" onclick="Teacher.saveTimeSlotAvailabilityHours('${activeMode}')">
                      ${Icons.save(14)} Save Hours
                    </button>
                  </div>
                </div>
              ` : `
                <div class="tsa-horizontal-controls">
                  <div class="tsa-control-field">
                    <label class="tsa-field-label">From (Start Hour)</label>
                    <select id="tsa-start-hour" class="form-control tsa-select">
                      ${startHourOptions.join('')}
                    </select>
                  </div>
                  <div class="tsa-control-field">
                    <label class="tsa-field-label">Until (End Hour)</label>
                    <select id="tsa-end-hour" class="form-control tsa-select">
                      ${endHourOptions.join('')}
                    </select>
                  </div>
                  <div class="tsa-control-field">
                    <label class="tsa-field-label">Apply To</label>
                    <select id="tsa-apply-scope" class="form-control tsa-select">
                      <option value="date" selected>This Date Only (${this.selectedDate})</option>
                      <option value="weekday">Every ${dayOfWeekName}</option>
                      <option value="all_days">All Days (Mon–Sun)</option>
                    </select>
                  </div>
                  <div class="tsa-control-field tsa-btn-field">
                    <button type="button" class="btn btn-primary btn-sm tsa-save-btn" onclick="Teacher.saveTimeSlotAvailabilityHours('${activeMode}')">
                      ${Icons.save(14)} Save Hours
                    </button>
                  </div>
                </div>
              `}
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin: 0.85rem 0 0.55rem; font-size: 0.78rem; color: var(--text-secondary);">
            <span><strong>Hourly Slots</strong> (Click to toggle Available / Occupied)</span>
          </div>

          <div class="date-slot-pills-grid">
            ${timeSlots.map(slot => {
      const slotParsed = this.parseTimeHour(slot);
      const slotHour = slotParsed ? slotParsed.hour : null;
      const booked = dayApts.find(a => this.doesTimeMatchSlot(a.requested_time, slot));
      const isExplicitlyOccupied = dayOccupied.some(o => o.time_slot === slot || this.doesTimeMatchSlot(o.time_slot, slot));
      const isWithinConfiguredHours = configuredHours.length === 0 ? false : (slotHour !== null ? configuredHours.includes(slotHour) : true);
      const isOccupied = isDateOccupied || isExplicitlyOccupied || !isWithinConfiguredHours;

      if (booked) {
        return `
                  <div class="date-slot-pill is-booked" title="Scheduled Class: ${booked.student_name} (${booked.subject}) at ${booked.requested_time}">
                    <span class="slot-pill-time">${slot}</span>
                    <span class="slot-pill-status">Booked: ${booked.student_name.split(' ')[0]}</span>
                  </div>
                `;
      }

      if (isOccupied) {
        return `
                  <div class="date-slot-pill is-occupied" 
                       onclick="Teacher.toggleOccupiedSlot('${dayOfWeekName}', '${slot}', 'Unavailable', '${this.selectedDate}')"
                       title="${isDateOccupied ? 'Date marked Occupied. Click to make this slot available.' : 'Occupied. Click to make Available.'}">
                    <span class="slot-pill-time">${slot}</span>
                    <span class="slot-pill-status" style="display: inline-flex; align-items: center; gap: 0.2rem;">${isDateOccupied ? Icons.ban(11, 'color: #EF4444;') + ' Occupied' : Icons.lock(11, 'color: var(--text-secondary);') + ' Unavailable'}</span>
                  </div>
                `;
      }

      return `
                <div class="date-slot-pill is-available" 
                     onclick="Teacher.toggleOccupiedSlot('${dayOfWeekName}', '${slot}', 'Unavailable', '${this.selectedDate}')"
                     title="Available. Click to mark Unavailable.">
                  <span class="slot-pill-time">${slot}</span>
                  <span class="slot-pill-status" style="display: inline-flex; align-items: center; gap: 0.2rem;">${Icons.checkCircle(11, 'color: #10B981;')} Available</span>
                </div>
              `;
    }).join('')}
          </div>
        </div>
      </div>
    `;
  },

  toggleEditDateNote() {
    this.isEditingDateNote = !this.isEditingDateNote;
    this.renderDateSchedulePanel();
    if (this.isEditingDateNote) {
      setTimeout(() => {
        const inp = document.getElementById('teacher-date-note-input');
        if (inp) inp.focus();
      }, 50);
    }
  },

  async saveDateNote(dateStr) {
    const input = document.getElementById('teacher-date-note-input');
    const noteText = input ? input.value.trim() : '';
    const user = Auth.currentUser;
    const localKey = user ? `aviora_teacher_date_notes_${user.id}` : null;

    if (!this.dateNotes) this.dateNotes = {};
    if (noteText) {
      this.dateNotes[dateStr] = noteText;
    } else {
      delete this.dateNotes[dateStr];
    }

    if (localKey) {
      try { localStorage.setItem(localKey, JSON.stringify(this.dateNotes)); } catch (e) {}
    }

    this.isEditingDateNote = false;
    this.renderCalendar();
    this.renderDateSchedulePanel();

    try {
      await API.post('/teacher/schedule/set-day-availability', {
        date: dateStr,
        action: 'save_date_note',
        note: noteText
      });
      showToast(noteText ? `Note saved for ${dateStr}!` : `Note cleared for ${dateStr}.`, 'success');
    } catch (err) {
      showToast('Note saved locally.', 'info');
    }
  },

  async deleteDateNote(dateStr) {
    const user = Auth.currentUser;
    const localKey = user ? `aviora_teacher_date_notes_${user.id}` : null;
    if (this.dateNotes) {
      delete this.dateNotes[dateStr];
    }
    if (localKey) {
      try { localStorage.setItem(localKey, JSON.stringify(this.dateNotes)); } catch (e) {}
    }
    this.isEditingDateNote = false;
    this.renderCalendar();
    this.renderDateSchedulePanel();
    try {
      await API.post('/teacher/schedule/set-day-availability', {
        date: dateStr,
        action: 'save_date_note',
        note: ''
      });
      showToast('Note removed.', 'info');
    } catch (err) {}
  },

  toggleHoursEditor() {
    this.showHoursEditor = !this.showHoursEditor;
    this.renderDateSchedulePanel();
  },

  async selectAvailabilityMode(mode) {
    this.editingHoursMode = mode;
    this.showHoursEditor = true;
    if (mode === 'all_day') {
      await this.saveTimeSlotAvailabilityHours('all_day');
    } else {
      this.renderDateSchedulePanel();
    }
  },

  async saveTimeSlotAvailabilityHours(modeOverride) {
    if (this.application?.status !== 'approved') {
      showToast('Operational Lock: Schedule availability unlocks once your account has been approved by the Administrator following your virtual interview.', 'warning');
      return;
    }
    try {
      const mode = modeOverride || this.editingHoursMode || 'specific';
      const dateObj = new Date((this.selectedDate || '') + 'T00:00:00');
      const dayOfWeekName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      const startEl = document.getElementById('tsa-start-hour');
      const endEl = document.getElementById('tsa-end-hour');
      const scopeEl = document.getElementById('tsa-apply-scope');

      const startTime = startEl ? startEl.value : '09:00';
      const endTime = endEl ? endEl.value : '17:00';
      const applyScope = scopeEl ? scopeEl.value : 'weekday';

      if (mode === 'specific') {
        const sH = parseInt(startTime.split(':')[0], 10);
        const eH = parseInt(endTime.split(':')[0], 10);
        if (eH <= sH) {
          showToast('Available end hour must be after the start hour.', 'warning');
          return;
        }
      }

      // Persist in localStorage as immediate client cache so it survives refreshes
      const user = Auth.currentUser;
      const localHoursKey = user ? `aviora_teacher_hours_${user.id}` : null;
      if (localHoursKey) {
        try {
          const stored = JSON.parse(localStorage.getItem(localHoursKey) || '{}');
          if (!stored.date_hours) stored.date_hours = {};
          if (!stored.date_modes) stored.date_modes = {};
          if (!stored.day_hours) stored.day_hours = {};
          if (!stored.day_modes) stored.day_modes = {};
          const blocks = mode === 'all_day' ? ['08:00 - 20:00'] : [`${startTime} - ${endTime}`];
          if (applyScope === 'date' && this.selectedDate) {
            stored.date_hours[this.selectedDate] = blocks;
            stored.date_modes[this.selectedDate] = mode;
          } else if (applyScope === 'all_days') {
            const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            allDays.forEach(d => {
              stored.day_hours[d] = blocks;
              stored.day_modes[d] = mode;
            });
            if (this.selectedDate) {
              stored.date_hours[this.selectedDate] = blocks;
              stored.date_modes[this.selectedDate] = mode;
            }
          } else {
            stored.day_hours[dayOfWeekName] = blocks;
            stored.day_modes[dayOfWeekName] = mode;
            if (this.selectedDate) {
              stored.date_hours[this.selectedDate] = blocks;
              stored.date_modes[this.selectedDate] = mode;
            }
          }
          localStorage.setItem(localHoursKey, JSON.stringify(stored));
        } catch (e) {}
      }

      const res = await API.setDayAvailability({
        date: this.selectedDate,
        day_of_week: dayOfWeekName,
        action: 'save_hours',
        mode,
        start_time: startTime,
        end_time: endTime,
        apply_scope: applyScope
      });

      this.editingHoursMode = mode;
      showToast(res.message || 'Available hours saved and reflected for students!', 'success');
      await this.loadSchedule();
      if (typeof Tutors !== 'undefined' && typeof Tutors.loadTutors === 'function') {
        Tutors.loadTutors();
      }
    } catch (err) {
      showToast(err.message || 'Failed to save available hours.', 'error');
    }
  },

  renderUpcomingAppointmentsList() {
    const upcomingList = document.getElementById('teacher-upcoming-appointments-list');
    const countBadge = document.getElementById('teacher-upcoming-count-badge');
    const rawAppointments = this.scheduleData?.appointments || [];
    const appointments = rawAppointments.filter(a => a.status !== 'completed' && a.status !== 'done' && a.status !== 'cancelled' && a.status !== 'declined' && a.room_status !== 'ended');

    if (countBadge) {
      countBadge.textContent = `${appointments.length} Appointment${appointments.length === 1 ? '' : 's'}`;
    }

    if (!upcomingList) return;

    if (appointments.length === 0) {
      upcomingList.innerHTML = `
        <div style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">
          No upcoming appointments scheduled yet.
        </div>
      `;
      return;
    }

    upcomingList.innerHTML = appointments.slice(0, 8).map(apt => `
      <div class="appointment-card" onclick="Teacher.selectCalendarDate('${apt.requested_date}')" style="cursor: pointer;" title="Click to view on calendar">
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
        <div onclick="event.stopPropagation();">
          ${!this.isApproved() ? `
            <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #D97706; font-size: 0.75rem; padding: 0.3rem 0.6rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.25rem;" title="Operations locked while application is under review">${Icons.lock(12)} Locked</span>
          ` : apt.room_status === 'open' ? `
            <button class="btn btn-primary btn-sm" onclick="VirtualRoom.joinRoom(${apt.id}, 'tutor')" style="background: #10B981; border-color: #10B981;">Enter (Live)</button>
          ` : `
            <button class="btn btn-secondary btn-sm" onclick="VirtualRoom.openRoomAsTutor(${apt.id})">Open Room</button>
          `}
        </div>
      </div>
    `).join('');
  },

  async toggleOccupiedSlot(dayOfWeek, timeSlot, reason = 'Occupied', date = null) {
    if (this.application?.status !== 'approved') {
      showToast('Operational Lock: Schedule availability and student bookings unlock once your account has been approved by the Administrator following your virtual interview.', 'warning');
      return;
    }
    try {
      const res = await API.toggleOccupiedSlot({
        day_of_week: dayOfWeek,
        time_slot: timeSlot,
        reason: reason || 'Unavailable',
        date: date || this.selectedDate
      });

      showToast(res.message, res.isOccupied ? 'info' : 'success');
      await this.loadSchedule();
      if (typeof Tutors !== 'undefined' && typeof Tutors.loadTutors === 'function') {
        Tutors.loadTutors();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update schedule slot.', 'error');
    }
  },

  async bulkSetDayAvailability(action) {
    if (this.application?.status !== 'approved') {
      showToast('Operational Lock: Schedule availability unlocks once your account has been approved by the Administrator following your virtual interview.', 'warning');
      return;
    }
    try {
      const dateObj = new Date((this.selectedDate || '') + 'T00:00:00');
      const dayOfWeekName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      const res = await API.setDayAvailability({
        date: this.selectedDate,
        day_of_week: dayOfWeekName,
        action
      });
      showToast(res.message, (action === 'date_occupied' || action === 'block_all') ? 'info' : 'success');
      await this.loadSchedule();
      if (typeof Tutors !== 'undefined' && typeof Tutors.loadTutors === 'function') {
        Tutors.loadTutors();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update schedule: ' + err.message, 'error');
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
          <div style="margin-bottom: 0.75rem; color: var(--gold-600);">${Icons.users(40)}</div>
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
          <button type="button" class="btn btn-primary btn-sm" onclick="window.location.hash = '#aviora-buddy'" style="display: inline-flex; align-items: center; gap: 0.35rem;">
            ${Icons.video(14)} Launch Session
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
    const resumeBadge = document.getElementById('resume-file-badge');
    const diplomaBadge = document.getElementById('diploma-file-badge');
    if (resumeBadge && app.resume_filename) {
      resumeBadge.style.display = 'inline-flex';
      resumeBadge.innerHTML = `${Icons.paperclip(14)} Uploaded: ${app.resume_filename} (Attached)`;
    }
    if (diplomaBadge && (app.diploma_filename || app.credentials_filename)) {
      diplomaBadge.style.display = 'inline-flex';
      diplomaBadge.innerHTML = `${Icons.paperclip(14)} Uploaded: ${app.diploma_filename || app.credentials_filename} (Attached)`;
    }
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

  proceedToDashboard() {
    this.viewingDashboard = true;
    window.location.hash = '#teacher-dashboard';
    if (typeof Router !== 'undefined' && Router.handleRoute) {
      Router.handleRoute();
    }
  },

  toggleEditApplication() {
    this.showEditApplicationForm = !this.showEditApplicationForm;
    window.location.hash = '#teacher-application';
    if (typeof Router !== 'undefined' && Router.handleRoute) {
      Router.handleRoute();
    }
  },

  async validateUploadedFile(file, expectedType) {
    const feedbackBox = document.getElementById(expectedType === 'resume' ? 'resume-feedback-box' : 'diploma-feedback-box');
    const uploadZone = document.getElementById(expectedType === 'resume' ? 'resume-upload-zone' : 'diploma-upload-zone');
    if (!feedbackBox || !uploadZone) return;

    this.uploadValidation[expectedType] = { valid: null, checking: true, error: null, warning: null };

    uploadZone.style.borderColor = 'var(--gold-400)';
    feedbackBox.style.display = 'block';
    feedbackBox.style.background = 'rgba(217, 119, 6, 0.1)';
    feedbackBox.style.border = '1px solid rgba(217, 119, 6, 0.25)';
    feedbackBox.style.color = '#F59E0B';
    feedbackBox.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span class="spinner-sm" style="display: inline-block; width: 14px; height: 14px; border: 2px solid #F59E0B; border-top-color: transparent; border-radius: 50%; animation: docDetectSpin 0.8s linear infinite;"></span>
        <span>Scanning document criteria (authenticity, clarity, completeness)...</span>
      </div>
    `;

    // 1. Instant client-side check on filename anti-patterns
    const lowerName = file.name.toLowerCase();
    const RANDOM_PATTERNS = [
      'pickleball', 'tournament', 'poster', 'flyer', 'championship',
      'bracket', 'party', 'meme', 'connected learning', 'marketing',
      'sports', 'festival', 'concert', 'match', 'league', 'banner', 'graphic'
    ];
    const antiMatch = RANDOM_PATTERNS.find(p => lowerName.includes(p));
    if (antiMatch) {
      this.uploadValidation[expectedType] = {
        valid: false,
        checking: false,
        error: expectedType === 'resume'
          ? `Document Rejected: The file "${file.name}" appears to be a promotional poster/graphic (${antiMatch}), not an applicant resume/CV. Please upload an official resume.`
          : `Document Rejected: The file "${file.name}" appears to be a promotional poster/graphic (${antiMatch}), not a degree diploma. Please upload an official diploma.`
      };
      this.renderFeedbackBox(expectedType);
      return;
    }

    // 2. Client-side image dimensions check (clarity & completeness/cropping)
    if (file.type && file.type.startsWith('image/')) {
      try {
        const dimensions = await this.readImageDimensions(file);
        if (dimensions) {
          const { width, height } = dimensions;
          const ratio = height / width;

          // Clarity check
          if (width < 450 || height < 500 || (width * height < 280000)) {
            this.uploadValidation[expectedType] = {
              valid: false,
              checking: false,
              error: `Document Rejected: Low resolution / blurry scan (${width}x${height}px). Scans must be legible, clear, and uncompressed.`
            };
            this.renderFeedbackBox(expectedType);
            return;
          }

          // Completeness & Cropping check
          if (expectedType === 'resume') {
            if (ratio < 0.95) {
              this.uploadValidation[expectedType] = {
                valid: false,
                checking: false,
                error: `Document Rejected: A resume must be a complete, uncropped portrait document. Landscape format (${width}x${height}px) detected. Please upload the complete vertical document.`
              };
              this.renderFeedbackBox(expectedType);
              return;
            } else if (ratio > 2.6) {
              this.uploadValidation[expectedType] = {
                valid: false,
                checking: false,
                error: `Document Rejected: Cropped vertical strip (${width}x${height}px) detected. Please upload the complete uncropped resume page.`
              };
              this.renderFeedbackBox(expectedType);
              return;
            }
          }

          if (expectedType === 'diploma') {
            const maxDim = Math.max(width, height);
            const minDim = Math.min(width, height);
            if ((maxDim / minDim) > 2.2) {
              this.uploadValidation[expectedType] = {
                valid: false,
                checking: false,
                error: `Document Rejected: The uploaded certificate appears severely cropped or panoramic. Please upload the full diploma showing all seals and signatures.`
              };
              this.renderFeedbackBox(expectedType);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Client image check error:', err);
      }
    }

    // 3. Server-side deep inspection via open-source OCR / parser
    try {
      const formData = new FormData();
      formData.append('document_file', file);
      formData.append('expected_type', expectedType);

      const inspection = await API.detectDocument(formData);
      if (!inspection.valid) {
        this.uploadValidation[expectedType] = {
          valid: false,
          checking: false,
          error: inspection.error || `Document does not meet the specified criteria for ${expectedType}.`
        };
      } else if (inspection.warning) {
        this.uploadValidation[expectedType] = {
          valid: true,
          checking: false,
          warning: inspection.warning
        };
      } else {
        this.uploadValidation[expectedType] = {
          valid: true,
          checking: false
        };
      }
    } catch (err) {
      console.warn('Server document inspection note:', err);
      if (!this.uploadValidation[expectedType].error) {
        this.uploadValidation[expectedType] = {
          valid: true,
          checking: false,
          warning: 'Initial format verified. Final credentials will be reviewed by the administrator.'
        };
      }
    }

    this.renderFeedbackBox(expectedType);
  },

  readImageDimensions(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  },

  renderFeedbackBox(type) {
    const feedbackBox = document.getElementById(type === 'resume' ? 'resume-feedback-box' : 'diploma-feedback-box');
    const uploadZone = document.getElementById(type === 'resume' ? 'resume-upload-zone' : 'diploma-upload-zone');
    if (!feedbackBox || !uploadZone) return;

    const state = this.uploadValidation[type];
    if (!state) return;

    if (state.valid === false) {
      uploadZone.style.borderColor = '#EF4444';
      feedbackBox.style.display = 'block';
      feedbackBox.style.background = 'rgba(239, 68, 68, 0.12)';
      feedbackBox.style.border = '1px solid rgba(239, 68, 68, 0.35)';
      feedbackBox.style.color = '#EF4444';
      feedbackBox.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 0.5rem; line-height: 1.45;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          <div>
            <div style="font-weight: 700; margin-bottom: 0.2rem; color: #EF4444;">Upload Rejected</div>
            <div style="font-size: 0.78rem; color: #FCA5A5;">${state.error}</div>
          </div>
        </div>
      `;
    } else if (state.warning) {
      uploadZone.style.borderColor = '#F59E0B';
      feedbackBox.style.display = 'block';
      feedbackBox.style.background = 'rgba(245, 158, 11, 0.12)';
      feedbackBox.style.border = '1px solid rgba(245, 158, 11, 0.35)';
      feedbackBox.style.color = '#F59E0B';
      feedbackBox.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 0.5rem; line-height: 1.45;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          <div>
            <div style="font-weight: 700; margin-bottom: 0.2rem; color: #F59E0B;">Document Warning</div>
            <div style="font-size: 0.78rem; color: #FCD34D;">${state.warning}</div>
          </div>
        </div>
      `;
    } else if (state.valid === true) {
      uploadZone.style.borderColor = '#10B981';
      feedbackBox.style.display = 'block';
      feedbackBox.style.background = 'rgba(16, 185, 129, 0.12)';
      feedbackBox.style.border = '1px solid rgba(16, 185, 129, 0.35)';
      feedbackBox.style.color = '#10B981';
      feedbackBox.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 0.5rem; line-height: 1.45;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <div>
            <div style="font-weight: 700; margin-bottom: 0.2rem; color: #10B981;">Document Verified</div>
            <div style="font-size: 0.78rem; color: #6EE7B7;">Clear, complete, and authentic ${type === 'resume' ? 'Resume / CV' : 'Degree Diploma'} format detected.</div>
          </div>
        </div>
      `;
    }
  },

  async handleApplicationSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const resumeInput = document.getElementById('resume-file-input');
    const diplomaInput = document.getElementById('diploma-file-input');

    const hasResume = (resumeInput && resumeInput.files && resumeInput.files.length > 0) || (this.application && this.application.resume_file);
    const hasDiploma = (diplomaInput && diplomaInput.files && diplomaInput.files.length > 0) || (this.application && (this.application.diploma_file || this.application.credentials_file));

    if (!hasResume || !hasDiploma) {
      showToast('Applicants are required to upload both a Resume (CV) and a Degree Diploma.', 'warning');
      return;
    }

    // Verify document checks
    if (this.uploadValidation.resume && this.uploadValidation.resume.checking) {
      showToast('Please wait while your Applicant Resume is being verified...', 'info');
      return;
    }
    if (this.uploadValidation.diploma && this.uploadValidation.diploma.checking) {
      showToast('Please wait while your Degree Diploma is being verified...', 'info');
      return;
    }

    if (this.uploadValidation.resume && this.uploadValidation.resume.valid === false) {
      showToast(this.uploadValidation.resume.error || 'Your uploaded Resume does not meet the specified criteria.', 'error');
      const rZone = document.getElementById('resume-upload-zone');
      if (rZone) rZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (this.uploadValidation.diploma && this.uploadValidation.diploma.valid === false) {
      showToast(this.uploadValidation.diploma.error || 'Your uploaded Degree Diploma does not meet the specified criteria.', 'error');
      const dZone = document.getElementById('diploma-upload-zone');
      if (dZone) dZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const formData = new FormData(form);

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Uploading & Submitting...';

      const res = await API.submitTeacherApplication(formData);
      showToast('Application submitted! Your documents are undergoing review and you will be notified once a virtual interview schedule is set. You can now explore the platform.', 'success');

      // Update application state
      await this.ensureTeacherStatus();
      this.viewingDashboard = true;

      window.location.hash = '#teacher-dashboard';
      await this.loadDashboardPage();
      window.scrollTo(0, 0);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Submit Application</span> <span>→</span>';
    }
  },

  // 7. Dedicated Profile & Settings Page
  async loadProfilePage() {
    await this.ensureTeacherStatus();
    const user = Auth.currentUser;
    if (!user) {
      showToast('Please sign in to view your profile and settings.', 'info');
      window.location.hash = '#login';
      return;
    }

    try {
      const data = await API.getMe();
      const u = data.user || user;
      const tp = data.tutorProfile || this.tutorProfile || {};
      const app = data.teacherApplication || this.application || {};
      const prefs = data.preferences || u.preferences || {};

      // Render Hero Details
      const heroAvatar = document.getElementById('teacher-profile-hero-avatar');
      const heroName = document.getElementById('teacher-profile-hero-name');
      const heroEmail = document.getElementById('teacher-profile-hero-email');
      const statusBadge = document.getElementById('teacher-profile-status-badge');
      const rateBadge = document.getElementById('teacher-profile-rate-badge');
      const subjectBadge = document.getElementById('teacher-profile-subject-badge');

      if (heroName) heroName.textContent = u.name || 'Dr. Elena Vance';
      if (heroEmail) heroEmail.textContent = u.email || '';
      if (heroAvatar) {
        heroAvatar.src = u.avatar_url || tp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';
      }

      const isApproved = (app.status === 'approved');
      if (statusBadge) {
        statusBadge.innerHTML = isApproved ? `${Icons.check(13)} Verified Educator` : (app.status === 'pending' ? `${Icons.hourglass(13)} Application Under Review` : 'Accredited Educator');
        statusBadge.className = isApproved ? 'badge-gold' : 'badge-accent';
      }

      const rateVal = tp.hourly_rate || app.hourly_rate || 45;
      if (rateBadge) {
        rateBadge.textContent = `$${rateVal} / hr`;
      }

      const degreeText = app.highest_degree || tp.highest_degree || 'Stanford Ph.D.';
      const instText = app.institution || tp.institution || 'Applied Mathematics';
      if (subjectBadge) {
        subjectBadge.textContent = `${degreeText} • ${instText}`;
      }

      // Populate Profile Form fields
      const nameInp = document.getElementById('teacher-profile-name');
      const emailInp = document.getElementById('teacher-profile-email');
      const phoneInp = document.getElementById('teacher-profile-phone');
      const rateInp = document.getElementById('t-profile-rate');
      const headlineInp = document.getElementById('t-profile-headline');
      const instInp = document.getElementById('teacher-profile-institution');
      const subjInp = document.getElementById('teacher-profile-subjects');
      const bioInp = document.getElementById('t-profile-bio');

      if (nameInp) nameInp.value = u.name || '';
      if (emailInp) emailInp.value = u.email || '';
      if (phoneInp) phoneInp.value = u.phone || '';
      if (rateInp) rateInp.value = rateVal;
      if (headlineInp) headlineInp.value = tp.headline || app.headline || '';
      if (instInp) instInp.value = `${app.highest_degree || tp.highest_degree || ''}${app.institution ? ' • ' + app.institution : ''}`;

      const activeSubjs = this.filterOutDeletedSubjects(
        (this.subjects && this.subjects.length > 0) ? this.subjects : (tp.subjects || app.subjects || [])
      );
      const subjectsList = Array.isArray(activeSubjs)
        ? activeSubjs.join(', ')
        : (typeof activeSubjs === 'string' ? activeSubjs : '');
      if (subjInp) subjInp.value = subjectsList;

      if (bioInp) bioInp.value = tp.bio || app.bio || '';

      const countryVal = tp.country || u.country || localStorage.getItem('aviora_country') || 'United States';
      const tzVal = tp.timezone || u.timezone || localStorage.getItem('aviora_timezone') || 'America/New_York';

      const countryInp = document.getElementById('teacher-profile-country');
      const tzInp = document.getElementById('teacher-profile-timezone');
      if (countryInp) countryInp.value = countryVal;
      if (tzInp) tzInp.value = tzVal;

      const flag = typeof AvioraGeo !== 'undefined' ? AvioraGeo.getCountryFlag(countryVal) : '🌐';
      const timeStr = typeof AvioraGeo !== 'undefined' ? AvioraGeo.getCurrentTimeInZone(tzVal) : '';
      const tzAbbr = typeof AvioraGeo !== 'undefined' ? AvioraGeo.getTimezoneAbbr(tzVal) : '';

      const flagEl = document.getElementById('teacher-profile-country-flag');
      const nameEl = document.getElementById('teacher-profile-country-name');
      const clockEl = document.getElementById('teacher-profile-live-clock');
      if (flagEl) flagEl.textContent = flag;
      if (nameEl) nameEl.textContent = countryVal;
      if (clockEl) {
        clockEl.textContent = `${timeStr} (${tzAbbr})`;
        clockEl.setAttribute('data-tz', tzVal);
      }

      // Sync settings / preferences in Profile module
      if (typeof Profile !== 'undefined' && Profile.syncAllPreferences) {
        Profile.syncAllPreferences(prefs);
      }
    } catch (err) {
      console.error('Failed to load tutor profile page:', err);
      showToast('Could not load profile details.', 'error');
    }

    if (typeof Router !== 'undefined' && Router.updateActiveNav) Router.updateActiveNav();
  },

  async handleProfileSettingsSubmit(e) {
    e.preventDefault();
    if (!this.isApproved()) {
      showToast('Operational Lock: Updating public profile rates unlocks once your account has been approved by the Administrator following your virtual interview.', 'warning');
      return;
    }
    const name = document.getElementById('teacher-profile-name')?.value.trim();
    const phone = document.getElementById('teacher-profile-phone')?.value.trim();
    const headline = document.getElementById('t-profile-headline')?.value.trim();
    const hourly_rate = parseFloat(document.getElementById('t-profile-rate')?.value || 45);
    const bio = document.getElementById('t-profile-bio')?.value.trim();
    const country = document.getElementById('teacher-profile-country')?.value || document.getElementById('teacher-country-select')?.value || 'United States';
    const timezone = document.getElementById('teacher-profile-timezone')?.value || document.getElementById('teacher-timezone-select')?.value || 'America/New_York';
    const institution = document.getElementById('teacher-profile-institution')?.value.trim();
    const subjects = document.getElementById('teacher-profile-subjects')?.value.trim();
    const submitBtn = e.target.querySelector('button[type="submit"]');

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';
      }

      const res = await API.updateProfile({
        name,
        phone,
        country,
        tutorData: { headline, hourly_rate, bio, country, timezone, institution, subjects }
      });

      if (res && res.user && typeof Auth !== 'undefined') {
        Auth.currentUser = res.user;
        if (typeof Storage !== 'undefined') Storage.setUser(res.user);
      }

      showToast('Tutor public profile updated successfully!', 'success');
      if (typeof Profile !== 'undefined') {
        if (typeof Profile.applyCountry === 'function') Profile.applyCountry(country, false, true);
        if (typeof Profile.applyTimezone === 'function') Profile.applyTimezone(timezone, false, true);
      }
      await this.ensureTeacherStatus();
      if (window.location.hash === '#teacher-profile') {
        await this.loadProfilePage();
      } else {
        await this.loadTeacherDashboard();
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Profile Changes';
      }
    }
  },

  async handleDownloadBackup() {
    const btn = document.getElementById('btn-backup-download');
    const statusEl = document.getElementById('backup-recovery-status');
    const origText = btn ? btn.innerHTML : '';
    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner" style="width: 14px; height: 14px; display: inline-block; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; vertical-align: middle;"></span> Generating...`;
      }
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.color = 'var(--gold-600)';
        statusEl.textContent = 'Preparing secure account data package...';
      }

      const res = await API.downloadAccountBackup();
      if (!res || !res.data) {
        throw new Error(res?.error || 'Failed to download account backup.');
      }

      // Augment with current local preferences from localStorage
      const u = (typeof Auth !== 'undefined' && Auth.currentUser) || (typeof Storage !== 'undefined' ? Storage.getUser() : null);
      if (u && u.id) {
        const cs = {
          theme: localStorage.getItem(`aviora_theme_${u.id}`) || localStorage.getItem('aviora_theme') || 'light',
          language: localStorage.getItem(`aviora_language_${u.id}`) || localStorage.getItem('aviora_language') || 'en-US',
          country: localStorage.getItem(`aviora_country_${u.id}`) || localStorage.getItem('aviora_country') || 'United States',
          timezone: localStorage.getItem(`aviora_timezone_${u.id}`) || localStorage.getItem('aviora_timezone') || 'America/New_York'
        };
        res.data.client_storage = cs;
        if (res.data.categories && res.data.categories.preferences_and_settings) {
          res.data.categories.preferences_and_settings.client_storage = cs;
        }
      }

      const jsonStr = JSON.stringify(res.data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename || `aviora-account-backup-${(u?.name || 'tutor').toLowerCase().replace(/[^a-z0-9]/g, '_')}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (statusEl) {
        statusEl.style.color = '#10B981';
        statusEl.textContent = `✓ Backup downloaded (${(blob.size / 1024).toFixed(1)} KB). Keep this file safe!`;
        setTimeout(() => { if (statusEl) statusEl.style.display = 'none'; }, 6000);
      }
      showToast('Account data backup downloaded successfully! In case of any system crash, upload this file to recover everything.', 'success');
    } catch (err) {
      console.error('Download backup error:', err);
      if (statusEl) {
        statusEl.style.color = '#EF4444';
        statusEl.textContent = `Error: ${err.message}`;
      }
      showToast(err.message || 'Could not generate backup file.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    }
  },

  pendingBackupData: null,
  pendingBackupFile: null,

  initBackupPreviewModal() {
    const btnRestoreTrigger = document.getElementById('btn-backup-restore-trigger');
    const fileInputRestore = document.getElementById('backup-restore-file-input');
    if (btnRestoreTrigger && fileInputRestore) {
      btnRestoreTrigger.addEventListener('click', () => {
        fileInputRestore.value = '';
        fileInputRestore.click();
      });

      fileInputRestore.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          this.handleFileSelectedForReview(file);
        }
      });
    }

    const closeBtn = document.getElementById('backup-preview-close-btn');
    const cancelBtn = document.getElementById('backup-preview-cancel-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeBackupPreviewModal());
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeBackupPreviewModal());

    const modal = document.getElementById('backup-preview-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeBackupPreviewModal();
      });
    }

    const check = document.getElementById('backup-allow-overwrite-check');
    if (check) {
      check.addEventListener('change', () => this.updateBackupOverwriteWarning(check.checked));
    }

    const confirmBtn = document.getElementById('backup-preview-confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.executeRestoreBackup());
    }
  },

  updateBackupOverwriteWarning(isOverwrite) {
    const box = document.getElementById('backup-overwrite-warning-box');
    const icon = document.getElementById('backup-warning-icon');
    const title = document.getElementById('backup-warning-title');
    const desc = document.getElementById('backup-warning-desc');
    if (!box) return;

    if (isOverwrite) {
      box.className = 'overwrite-mode';
      box.style.borderColor = 'rgba(234, 179, 8, 0.45)';
      box.style.background = 'rgba(234, 179, 8, 0.09)';
      box.style.color = '#B45309';
      if (icon) icon.textContent = '⚠️';
      if (title) {
        title.textContent = 'Warning: Overwrite Mode Active';
        title.style.color = '#B45309';
      }
      if (desc) {
        desc.innerHTML = 'Your current profile headline, biography, highest degree, institution, and hourly rate will be <strong>overwritten</strong> with values from this backup file. Other records (such as completed classes, reviews, and tasks) will continue to be safely merged.';
      }
    } else {
      box.className = 'safe-mode';
      box.style.borderColor = 'rgba(16, 185, 129, 0.35)';
      box.style.background = 'rgba(16, 185, 129, 0.08)';
      box.style.color = '#065F46';
      if (icon) icon.textContent = '🛡️';
      if (title) {
        title.textContent = 'Non-Destructive Protection Active';
        title.style.color = '#047857';
      }
      if (desc) {
        desc.innerHTML = 'Your current profile details, rates, and existing calendar records are safely protected and will <strong>not</strong> be overwritten. Missing coursework, sessions, and subjects will be restored.';
      }
    }
  },

  closeBackupPreviewModal() {
    const modal = document.getElementById('backup-preview-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
    const fileInput = document.getElementById('backup-restore-file-input');
    if (fileInput) fileInput.value = '';
    this.pendingBackupData = null;
    this.pendingBackupFile = null;
  },

  async handleFileSelectedForReview(file) {
    if (!file) return;
    const statusEl = document.getElementById('backup-recovery-status');

    if (!file.name.toLowerCase().endsWith('.json') && file.type && !file.type.includes('json')) {
      showToast('Please select a valid JSON backup file.', 'error');
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.color = '#EF4444';
        statusEl.textContent = 'Please select a valid .json backup file.';
      }
      return;
    }

    try {
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.color = 'var(--gold-600)';
        statusEl.textContent = 'Loading and reading backup file...';
      }

      const fileText = await file.text();
      let parsedData;
      try {
        parsedData = JSON.parse(fileText);
      } catch (parseErr) {
        throw new Error('Invalid JSON format in the backup file. Please ensure the file contains valid JSON text.');
      }

      if (!parsedData || typeof parsedData !== 'object') {
        throw new Error('The selected backup file is empty or does not contain a valid JSON object.');
      }

      this.pendingBackupData = parsedData;
      this.pendingBackupFile = file;

      this.renderBackupPreviewModal(parsedData, file);

      // Reset overwrite checkbox to safe mode
      const check = document.getElementById('backup-allow-overwrite-check');
      if (check) check.checked = false;
      this.updateBackupOverwriteWarning(false);

      const modal = document.getElementById('backup-preview-modal');
      if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
      }

      if (statusEl) {
        statusEl.style.color = 'var(--gold-600)';
        statusEl.textContent = `Reviewing "${file.name}" (${(file.size / 1024).toFixed(1)} KB)...`;
      }
    } catch (err) {
      console.error('File review error:', err);
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.color = '#EF4444';
        statusEl.textContent = `Error: ${err.message}`;
      }
      showToast(err.message || 'Failed to read backup file.', 'error');
    }
  },

  renderBackupPreviewModal(data, file) {
    const metaEl = document.getElementById('backup-preview-meta');
    const bodyEl = document.getElementById('backup-preview-body');
    if (!bodyEl) return;

    const cats = data.categories || (data.data && data.data.categories) || {};
    const profile = cats.profile_and_identity || data.profile || data.user || {};
    const creds = cats.credentials_and_bio || data.tutorProfile || data.teacherApplication || {};
    const subjectsCat = cats.subjects_and_rates || {};
    const scheduleCat = cats.schedule_and_calendar || {};
    const tasksCat = cats.academic_tasks_and_coursework || data.tasks || [];
    const sessionsCat = cats.classes_and_sessions || data.tutoringRequests || [];
    const reviewsCat = cats.student_ratings_and_reviews || data.reviews || [];
    const prefsCat = cats.preferences_and_settings || data.preferences || {};

    const subjectsList = Array.isArray(subjectsCat.subjects) ? subjectsCat.subjects : (Array.isArray(creds.subjects) ? creds.subjects : []);
    const ratesMap = (subjectsCat.subject_rates && typeof subjectsCat.subject_rates === 'object') ? subjectsCat.subject_rates : {};
    const tasksList = Array.isArray(tasksCat) ? tasksCat : (tasksCat.tasks || []);
    const sessionsList = Array.isArray(sessionsCat) ? sessionsCat : (sessionsCat.sessions || []);
    const reviewsList = Array.isArray(reviewsCat) ? reviewsCat : (reviewsCat.reviews || []);
    const slotsList = Array.isArray(scheduleCat.occupied_slots) ? scheduleCat.occupied_slots : (data.occupiedSlots || []);
    const notesList = Array.isArray(scheduleCat.date_notes) ? scheduleCat.date_notes : (data.dateNotes || []);

    const exportedDate = data.exported_at ? new Date(data.exported_at).toLocaleString() : 'Recent export';
    const fileSizeKb = file ? (file.size / 1024).toFixed(1) + ' KB' : 'Archive';

    if (metaEl) {
      metaEl.innerHTML = `File: <strong style="color: var(--text-primary);">${file?.name || 'backup.json'}</strong> (${fileSizeKb}) &bull; Exported: ${exportedDate}`;
    }

    const escapeHTML = (str) => {
      if (typeof str !== 'string') return String(str || '');
      return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag));
    };

    let subjectsHtml = '';
    if (subjectsList.length > 0) {
      subjectsHtml = subjectsList.map(s => {
        const rate = ratesMap[s] ? `$${ratesMap[s]}/hr` : (creds.hourly_rate ? `$${creds.hourly_rate}/hr` : '');
        return `<span style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.2rem 0.55rem; border-radius: 9999px; background: rgba(198, 138, 40, 0.12); color: var(--gold-600); border: 1px solid rgba(198, 138, 40, 0.25); font-size: 0.72rem; font-weight: 600;">
          ${escapeHTML(s)} ${rate ? `<span style="opacity: 0.75; font-size: 0.68rem;">(${rate})</span>` : ''}
        </span>`;
      }).join(' ');
    } else {
      subjectsHtml = '<em style="color: var(--text-secondary); font-size: 0.75rem;">No explicit subjects recorded in backup</em>';
    }

    let tasksHtml = '';
    if (tasksList.length > 0) {
      tasksHtml = tasksList.slice(0, 3).map(t => `<li style="margin-bottom: 0.25rem;">${escapeHTML(t.title || 'Coursework assignment')} ${t.subject ? `<span style="opacity: 0.7;">(${escapeHTML(t.subject)})</span>` : ''}</li>`).join('');
      if (tasksList.length > 3) tasksHtml += `<li style="opacity: 0.65;">+${tasksList.length - 3} additional tasks</li>`;
    } else {
      tasksHtml = '<li style="list-style: none; color: var(--text-secondary); font-style: italic;">No coursework tasks in backup</li>';
    }

    bodyEl.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.85rem;">
        
        <!-- Category 1: Profile & Identity -->
        <div class="backup-category-card" style="border: 1px solid var(--border-color); border-radius: 10px; padding: 0.85rem 1rem; background: var(--bg-surface-alt, rgba(0,0,0,0.015));">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span style="font-size: 1.1rem;">👤</span>
            <strong style="font-size: 0.82rem; color: var(--gold-600); text-transform: uppercase; letter-spacing: 0.5px;">Profile &amp; Personal Identity</strong>
          </div>
          <div style="font-size: 0.78rem; line-height: 1.5; color: var(--text-secondary);">
            <div>Name: <strong style="color: var(--text-primary);">${escapeHTML(profile.name || 'Not specified')}</strong></div>
            <div>Email: <strong style="color: var(--text-primary);">${escapeHTML(profile.email || 'Not specified')}</strong></div>
            <div>Phone: <strong style="color: var(--text-primary);">${escapeHTML(profile.phone || 'None')}</strong></div>
            <div>Country: <strong style="color: var(--text-primary);">${escapeHTML(profile.country || 'United States')}</strong></div>
          </div>
        </div>

        <!-- Category 2: Credentials & Bio -->
        <div class="backup-category-card" style="border: 1px solid var(--border-color); border-radius: 10px; padding: 0.85rem 1rem; background: var(--bg-surface-alt, rgba(0,0,0,0.015));">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span style="font-size: 1.1rem;">🎓</span>
            <strong style="font-size: 0.82rem; color: var(--gold-600); text-transform: uppercase; letter-spacing: 0.5px;">Credentials &amp; Biography</strong>
          </div>
          <div style="font-size: 0.78rem; line-height: 1.5; color: var(--text-secondary);">
            <div>Headline: <strong style="color: var(--text-primary);">${escapeHTML(creds.headline || 'Not specified')}</strong></div>
            <div>Degree: <strong style="color: var(--text-primary);">${escapeHTML(creds.highest_degree || 'None')}</strong></div>
            <div>Institution: <strong style="color: var(--text-primary);">${escapeHTML(creds.institution || 'None')}</strong></div>
            <div>Base Rate: <strong style="color: #10B981;">$${escapeHTML(String(creds.hourly_rate || 45))}/hr</strong></div>
          </div>
        </div>

        <!-- Category 3: Subjects & Rates -->
        <div class="backup-category-card" style="border: 1px solid var(--border-color); border-radius: 10px; padding: 0.85rem 1rem; background: var(--bg-surface-alt, rgba(0,0,0,0.015));">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span style="font-size: 1.1rem;">📚</span>
            <strong style="font-size: 0.82rem; color: var(--gold-600); text-transform: uppercase; letter-spacing: 0.5px;">Teaching Subjects (${subjectsList.length})</strong>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.35rem;">
            ${subjectsHtml}
          </div>
        </div>

        <!-- Category 4: Schedule & Calendar -->
        <div class="backup-category-card" style="border: 1px solid var(--border-color); border-radius: 10px; padding: 0.85rem 1rem; background: var(--bg-surface-alt, rgba(0,0,0,0.015));">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span style="font-size: 1.1rem;">📅</span>
            <strong style="font-size: 0.82rem; color: var(--gold-600); text-transform: uppercase; letter-spacing: 0.5px;">Schedule &amp; Availability</strong>
          </div>
          <div style="font-size: 0.78rem; line-height: 1.5; color: var(--text-secondary);">
            <div>Timezone: <strong style="color: var(--text-primary);">${escapeHTML(scheduleCat.timezone || creds.timezone || 'America/New_York')}</strong></div>
            <div>Occupied/Booked Slots: <strong style="color: var(--text-primary);">${slotsList.length} records</strong></div>
            <div>Date Calendar Notes: <strong style="color: var(--text-primary);">${notesList.length} entries</strong></div>
          </div>
        </div>

        <!-- Category 5: Academic Coursework -->
        <div class="backup-category-card" style="border: 1px solid var(--border-color); border-radius: 10px; padding: 0.85rem 1rem; background: var(--bg-surface-alt, rgba(0,0,0,0.015));">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span style="font-size: 1.1rem;">📝</span>
            <strong style="font-size: 0.82rem; color: var(--gold-600); text-transform: uppercase; letter-spacing: 0.5px;">Coursework Tasks (${tasksList.length})</strong>
          </div>
          <ul style="margin: 0; padding-left: 1.2rem; font-size: 0.75rem; color: var(--text-secondary); line-height: 1.45;">
            ${tasksHtml}
          </ul>
        </div>

        <!-- Category 6: Tutoring Sessions, Reviews & Settings -->
        <div class="backup-category-card" style="border: 1px solid var(--border-color); border-radius: 10px; padding: 0.85rem 1rem; background: var(--bg-surface-alt, rgba(0,0,0,0.015));">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span style="font-size: 1.1rem;">⚙️</span>
            <strong style="font-size: 0.82rem; color: var(--gold-600); text-transform: uppercase; letter-spacing: 0.5px;">Sessions, Reviews &amp; Settings</strong>
          </div>
          <div style="font-size: 0.78rem; line-height: 1.5; color: var(--text-secondary);">
            <div>Tutoring Sessions: <strong style="color: var(--text-primary);">${sessionsList.length} classes</strong></div>
            <div>Student Reviews: <strong style="color: var(--text-primary);">${reviewsList.length} reviews</strong></div>
            <div>Appearance Theme: <strong style="color: var(--text-primary); text-transform: capitalize;">${escapeHTML(prefsCat.theme || 'Light')} Mode</strong></div>
            <div>System Language: <strong style="color: var(--text-primary);">${escapeHTML(prefsCat.language || 'English (US)')}</strong></div>
          </div>
        </div>
      </div>

      <!-- Collapsible Raw JSON Explorer -->
      <details style="border: 1px solid var(--border-color); border-radius: 8px; padding: 0.65rem 0.85rem; font-size: 0.76rem; background: var(--bg-surface-alt, rgba(0,0,0,0.02)); margin-top: 0.5rem;">
        <summary style="cursor: pointer; font-weight: 700; color: var(--gold-600); outline: none;">
          🔍 Inspect Raw JSON Backup Content (${fileSizeKb})
        </summary>
        <pre style="margin-top: 0.65rem; max-height: 200px; overflow-y: auto; background: var(--bg-surface, #FFFFFF); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.75rem; font-family: var(--font-mono, monospace); font-size: 0.72rem; line-height: 1.45; white-space: pre-wrap; word-break: break-all; color: var(--text-primary);"><code>${escapeHTML(JSON.stringify(data, null, 2))}</code></pre>
      </details>
    `;
  },

  async executeRestoreBackup() {
    if (!this.pendingBackupData) return;
    const confirmBtn = document.getElementById('backup-preview-confirm-btn');
    const cancelBtn = document.getElementById('backup-preview-cancel-btn');
    const statusEl = document.getElementById('backup-recovery-status');
    const origConfirmText = confirmBtn ? confirmBtn.innerHTML : '';
    const allowOverwrite = document.getElementById('backup-allow-overwrite-check')?.checked || false;

    try {
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = `<span class="spinner" style="width: 14px; height: 14px; display: inline-block; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; vertical-align: middle;"></span> Restoring Data...`;
      }
      if (cancelBtn) cancelBtn.disabled = true;

      const payload = {
        data: this.pendingBackupData,
        allow_overwrite: allowOverwrite
      };

      const res = await API.restoreAccountBackup(payload);
      if (!res || !res.success) {
        throw new Error(res?.error || 'Failed to restore account data from backup.');
      }

      // Restore client-side localStorage preferences if present
      const u = (typeof Auth !== 'undefined' && Auth.currentUser) || (typeof Storage !== 'undefined' ? Storage.getUser() : null);
      const cats = this.pendingBackupData.categories || (this.pendingBackupData.data && this.pendingBackupData.data.categories) || {};
      const prefsCat = cats.preferences_and_settings || this.pendingBackupData.preferences || {};
      const cs = prefsCat.client_storage || this.pendingBackupData.client_storage;
      if (cs && u && u.id) {
        const uid = u.id;
        if (cs.theme && (!localStorage.getItem(`aviora_theme_${uid}`) || allowOverwrite)) {
          localStorage.setItem(`aviora_theme_${uid}`, cs.theme);
          if (typeof Profile !== 'undefined') Profile.applyTheme(cs.theme, false, false);
        }
        if (cs.language && (!localStorage.getItem(`aviora_language_${uid}`) || allowOverwrite)) {
          localStorage.setItem(`aviora_language_${uid}`, cs.language);
          if (typeof I18n !== 'undefined') I18n.applyLanguage(cs.language);
        }
        if (cs.country && (!localStorage.getItem(`aviora_country_${uid}`) || allowOverwrite)) {
          localStorage.setItem(`aviora_country_${uid}`, cs.country);
        }
        if (cs.timezone && (!localStorage.getItem(`aviora_timezone_${uid}`) || allowOverwrite)) {
          localStorage.setItem(`aviora_timezone_${uid}`, cs.timezone);
        }
      }

      if (res.user && typeof Auth !== 'undefined') {
        Auth.currentUser = res.user;
        if (typeof Storage !== 'undefined') Storage.setUser(res.user);
      }
      if (res.tutorProfile) {
        this.tutorProfile = res.tutorProfile;
      }
      if (res.preferences && typeof Profile !== 'undefined') {
        Profile.syncAllPreferences(res.preferences, false);
      }

      this.closeBackupPreviewModal();

      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.color = '#10B981';
        const catsText = (res.restored_categories && res.restored_categories.length > 0)
          ? res.restored_categories.join(', ')
          : 'Profile, Credentials, Subjects, Schedule, Tasks, and Settings';
        statusEl.textContent = allowOverwrite
          ? `✓ Account data restored by category (${catsText}) with profile updates applied.`
          : `✓ Data restored by category (${catsText}). Existing data safely preserved!`;
      }

      showToast(
        allowOverwrite
          ? 'Account data restored successfully with profile updates applied.'
          : 'All account data restored by category! Existing data was safely preserved.',
        'success'
      );

      // Reload profile page to display restored content immediately
      await this.loadProfilePage();
    } catch (err) {
      console.error('Execute restore error:', err);
      showToast(err.message || 'Failed to restore account data.', 'error');
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.color = '#EF4444';
        statusEl.textContent = `Restore failed: ${err.message}`;
      }
    } finally {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = origConfirmText;
      }
      if (cancelBtn) cancelBtn.disabled = false;
    }
  },

  // ==========================================
  // DIRECT STUDENT MESSAGES & MESSENGER HUB (3-COLUMN REFERENCE CRM LAYOUT)
  // ==========================================
  teacherMessages: [],
  teacherMessagesPollInterval: null,
  teacherMessageFilter: 'all',
  teacherChatTypeFilter: 'all',
  teacherTimeRangeFilter: 'all',
  teacherMessageSearchQuery: '',
  activeConversationKey: null,
  archivedConversations: new Set(),
  pendingMessageAttachment: null,
  isContactInfoEditing: false,

  filterMessages(filterType, btnEl) {
    this.teacherMessageFilter = filterType;
    document.querySelectorAll('.teacher-msg-filter-btn').forEach(b => {
      b.classList.toggle('active', b === btnEl || b.dataset.filter === filterType);
    });
    this.renderTeacherMessages();
  },

  toggleFilterUnread(btnEl) {
    if (this.teacherMessageFilter === 'unread') {
      this.teacherMessageFilter = 'all';
      if (btnEl) btnEl.classList.remove('active');
    } else {
      this.teacherMessageFilter = 'unread';
      if (btnEl) btnEl.classList.add('active');
    }
    this.renderTeacherMessages();
  },

  filterChatType(type) {
    this.teacherChatTypeFilter = type || 'all';
    this.renderTeacherMessages();
  },

  filterTimeRange(range) {
    this.teacherTimeRangeFilter = range || 'all';
    this.renderTeacherMessages();
  },

  toggleSidebarSearch() {
    const wrap = document.getElementById('teacher-messenger-search-wrap');
    const input = document.getElementById('teacher-messages-search-input');
    if (wrap) {
      const isHidden = window.getComputedStyle(wrap).display === 'none' || wrap.style.display === 'none';
      wrap.style.display = isHidden ? 'block' : 'none';
      if (isHidden && input) input.focus();
    }
  },

  searchMessages(query) {
    this.teacherMessageSearchQuery = (query || '').toLowerCase().trim();
    this.renderTeacherMessages();
  },

  copyContactIdentifier(text) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard: ' + text, 'info');
      }).catch(() => {
        showToast('Copied: ' + text, 'info');
      });
    } else {
      showToast('Contact: ' + text, 'info');
    }
  },

  archiveConversation(convKey) {
    if (!convKey) return;
    if (this.archivedConversations.has(convKey)) {
      this.archivedConversations.delete(convKey);
      showToast('Conversation unarchived.', 'info');
    } else {
      this.archivedConversations.add(convKey);
      showToast('Conversation moved to archive.', 'info');
    }
    this.renderTeacherMessages();
  },

  clearConversation(convKey) {
    showToast('Official conversation messages are permanently preserved.', 'info');
  },

  toggleTemplatesMenu() {
    const el = document.getElementById('teacher-templates-dropdown');
    if (!el) return;
    const isShown = el.style.display !== 'none';
    if (isShown) {
      el.style.display = 'none';
    } else {
      const templates = [
        "Hello! How can I assist you with your coursework today?",
        "Looking forward to our upcoming lesson! Please have your practice problems ready.",
        "Thank you for reaching out! I've reviewed your question and will guide you step-by-step.",
        "Great work in our session today! Don't hesitate to reach out if you have follow-up questions.",
        "Please let me know if you would like to book a follow-up review session."
      ];
      el.innerHTML = `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.5rem; box-shadow: 0 8px 24px rgba(0,0,0,0.12); margin-bottom: 0.5rem; display: flex; flex-direction: column; gap: 0.35rem; max-height: 180px; overflow-y: auto;">
          <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; padding: 0.2rem 0.4rem;">Select Response Template</div>
          ${templates.map(t => `
            <button type="button" style="text-align: left; background: transparent; border: none; padding: 0.35rem 0.5rem; font-size: 0.8rem; color: var(--text-primary); border-radius: 6px; cursor: pointer; transition: background 0.15s;" onmouseover="this.style.background='rgba(37,99,235,0.08)'" onmouseout="this.style.background='transparent'" onclick="Teacher.insertTemplate('${this.escapeHtml(t).replace(/'/g, "\\'")}')">
              ${this.escapeHtml(t)}
            </button>
          `).join('')}
        </div>
      `;
      el.style.display = 'block';
    }
  },

  insertTemplate(text) {
    const input = document.getElementById('teacher-composer-input');
    if (input) {
      input.value = text;
      input.focus();
    }
    const el = document.getElementById('teacher-templates-dropdown');
    if (el) el.style.display = 'none';
  },

  toggleEmojiMenu() {
    const el = document.getElementById('teacher-emoji-dropdown');
    if (!el) return;
    const isShown = el.style.display !== 'none';
    if (isShown) {
      el.style.display = 'none';
    } else {
      const emojis = ['👍', '😊', '📚', '💡', '🎯', '👏', '💯', '🎓', '✨', '📝', '🙌', '⭐'];
      el.innerHTML = `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.4rem; box-shadow: 0 8px 24px rgba(0,0,0,0.12); margin-bottom: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.35rem;">
          ${emojis.map(e => `
            <button type="button" style="background: transparent; border: none; font-size: 1.15rem; cursor: pointer; padding: 0.2rem 0.35rem; border-radius: 6px;" onmouseover="this.style.background='rgba(0,0,0,0.08)'" onmouseout="this.style.background='transparent'" onclick="Teacher.insertEmoji('${e}')">
              ${e}
            </button>
          `).join('')}
        </div>
      `;
      el.style.display = 'block';
    }
  },

  insertEmoji(char) {
    const input = document.getElementById('teacher-composer-input');
    if (input) {
      input.value += char;
      input.focus();
    }
    const el = document.getElementById('teacher-emoji-dropdown');
    if (el) el.style.display = 'none';
  },

  openCalendarShortcut() {
    window.location.hash = '#teacher-schedule';
  },

  triggerAttachmentChooser() {
    // Open choice prompt: Photo or Document
    const choice = confirm('Click OK to attach a Photo/Image, or Cancel to attach a Document/File.');
    if (choice) {
      this.triggerPictureUpload();
    } else {
      this.triggerFileUpload();
    }
  },

  async loadTeacherMessages() {
    try {
      const res = await API.getTeacherMessages();
      this.teacherMessages = res.messages || [];
      this.renderTeacherMessages();
    } catch (err) {
      console.warn('Could not load teacher messages:', err);
    }

    if (!this.teacherMessagesPollInterval) {
      this.teacherMessagesPollInterval = setInterval(async () => {
        const dashboard = document.getElementById('view-teacher-dashboard');
        const messagesPage = document.getElementById('view-teacher-messages');
        const isDashboardOpen = dashboard && dashboard.style.display !== 'none';
        const isMessagesPageOpen = messagesPage && messagesPage.style.display !== 'none';
        if (isDashboardOpen || isMessagesPageOpen) {
          try {
            const res = await API.getTeacherMessages();
            const incoming = res.messages || [];

            const incomingIds = new Set(incoming.map(m => String(m.id)));
            const merged = [...incoming];
            for (const localMsg of (this.teacherMessages || [])) {
              const isTemp = String(localMsg.id).startsWith('temp-');
              if (isTemp) {
                const alreadySynced = incoming.some(m => 
                  m.sender_role === localMsg.sender_role &&
                  (m.content || '') === (localMsg.content || '') &&
                  (m.attachment_url || null) === (localMsg.attachment_url || null)
                );
                if (!alreadySynced) {
                  merged.push(localMsg);
                }
              } else if (!incomingIds.has(String(localMsg.id))) {
                merged.push(localMsg);
              }
            }
            this.teacherMessages = merged;

            this.updateSidebarConversations();
            const convs = this.getConversations();
            const activeConv = convs.find(c => c.key === this.activeConversationKey);
            if (activeConv) {
              this.updateActiveConversationHeaderPresence(activeConv);
              this.syncActiveThreadMessages(activeConv);
            }
          } catch (e) {}
        }
      }, 1500);
    }
  },

  getConversations() {
    const convMap = new Map();
    const currentTeacherId = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser.id : null;

    (this.teacherMessages || []).forEach(m => {
      const isFromTeacher = m.sender_role === 'teacher' || (currentTeacherId && Number(m.sender_id) === Number(currentTeacherId));
      const studentId = isFromTeacher ? (m.receiver_id || m.student_id) : (m.student_id || m.sender_id);
      const studentIdent = studentId || m.student_email || m.other_email || m.sender_email || 'student';
      const key = String(studentIdent);

      if (!convMap.has(key)) {
        convMap.set(key, {
          id: studentId || (m.student_id || (!isNaN(key) ? Number(key) : null)),
          key: key,
          name: m.student_name || (!isFromTeacher && m.sender_name) || 'Student',
          email: m.student_email || m.other_email || (!isFromTeacher && m.sender_email) || '',
          avatar: m.student_avatar || m.other_avatar || null,
          phone: m.student_phone || m.other_phone || '+1 (555) 382-9014',
          country: m.student_country || m.other_country || 'United States',
          gradeLevel: m.student_grade_level || 'Grade 11 - High School',
          school: m.student_school || 'Westlake High School',
          learningGoals: m.student_learning_goals || '',
          subject: m.subject || 'Calculus BC',
          isOnline: typeof m.student_is_online !== 'undefined' ? Boolean(m.student_is_online) : false,
          messages: [],
          unreadCount: 0,
          lastMessage: null
        });
      }
      const conv = convMap.get(key);
      if (!conv.id && studentId) conv.id = studentId;
      if (!conv.name || conv.name === 'Student') {
        if (m.student_name) conv.name = m.student_name;
        else if (!isFromTeacher && m.sender_name) conv.name = m.sender_name;
      }
      if (!conv.email && (m.student_email || m.other_email)) conv.email = m.student_email || m.other_email;
      if (!conv.avatar && (m.student_avatar || m.other_avatar)) conv.avatar = m.student_avatar || m.other_avatar;
      if (typeof m.student_is_online !== 'undefined') {
        conv.isOnline = Boolean(m.student_is_online);
      }
      if ((m.student_phone || m.other_phone) && (!conv.phone || conv.phone === '+1 254-125-4446')) {
        conv.phone = m.student_phone || m.other_phone;
      }
      if ((m.student_country || m.other_country) && (!conv.country || conv.country === 'Philippines')) {
        conv.country = m.student_country || m.other_country;
      }
      if (m.student_grade_level && !conv.gradeLevel) conv.gradeLevel = m.student_grade_level;
      if (m.student_school && !conv.school) conv.school = m.student_school;
      if (m.student_learning_goals && !conv.learningGoals) conv.learningGoals = m.student_learning_goals;
      if (m.subject && (!conv.subject || conv.subject === 'Academic Mentorship Inquiry')) conv.subject = m.subject;
      conv.messages.push(m);
      if (m.sender_role === 'student' && Number(m.is_read) === 0) {
        conv.unreadCount++;
      }
    });

    const convs = Array.from(convMap.values());
    convs.forEach(c => {
      c.messages.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
      c.lastMessage = c.messages[c.messages.length - 1];
    });

    // Sort by latest message descending
    convs.sort((a, b) => new Date(b.lastMessage?.created_at || 0) - new Date(a.lastMessage?.created_at || 0));
    return convs;
  },

  updateActiveConversationHeaderPresence(activeConv) {
    if (!activeConv) return;
    const dot = document.getElementById('teacher-active-header-dot');
    const indicator = document.getElementById('teacher-active-header-status-text');
    const dotBg = activeConv.isOnline ? '#10B981' : '#9CA3AF';
    const dotShadow = activeConv.isOnline ? '0 0 0 2px var(--bg-card), 0 0 8px rgba(16, 185, 129, 0.6)' : '0 0 0 2px var(--bg-card)';
    const statusText = activeConv.isOnline ? '● Active now' : '○ Offline';
    const statusColor = activeConv.isOnline ? '#059669' : '#6B7280';

    if (dot) {
      dot.style.backgroundColor = dotBg;
      dot.style.boxShadow = dotShadow;
      dot.title = activeConv.isOnline ? 'Active now' : 'Offline';
    }
    if (indicator) {
      indicator.textContent = statusText;
      indicator.style.color = statusColor;
    }
  },

  syncActiveThreadMessages(activeConv) {
    if (!activeConv) return;
    const threadEl = document.getElementById('teacher-messages-thread-container');
    if (!threadEl) return;

    const renderedCount = threadEl.children.length;
    const lastRenderedEl = threadEl.lastElementChild;
    const lastMsg = activeConv.messages[activeConv.messages.length - 1];
    const lastIdMatches = lastRenderedEl && lastMsg && lastRenderedEl.id === `teacher-msg-row-${lastMsg.id}`;

    if (renderedCount !== activeConv.messages.length || !lastIdMatches) {
      this.renderThreadMessagesOnly(activeConv);
    } else {
      activeConv.messages.forEach(m => {
        if (m.sender_role === 'teacher') {
          const row = document.getElementById(`teacher-msg-row-${m.id}`);
          if (row) {
            const footerSpan = row.querySelector('.messenger-msg-status');
            if (footerSpan) {
              const statusHtml = m.status === 'seen' || m.is_read === 1 ? '• Seen' : '• Delivered';
              footerSpan.textContent = statusHtml;
            }
          }
        }
      });
    }
  },

  updateSidebarConversations() {
    const convListEl = document.getElementById('teacher-messenger-conv-list');
    if (!convListEl) return;
    let convs = this.getConversations();

    // Filtering
    if (this.teacherChatTypeFilter === 'active') {
      convs = convs.filter(c => !this.archivedConversations.has(c.key));
    } else if (this.teacherChatTypeFilter === 'archived') {
      convs = convs.filter(c => this.archivedConversations.has(c.key));
    }

    if (this.teacherTimeRangeFilter && this.teacherTimeRangeFilter !== 'all') {
      const now = Date.now();
      convs = convs.filter(c => {
        const msgTime = new Date(c.lastMessage?.created_at || 0).getTime();
        const diffHours = (now - msgTime) / (1000 * 60 * 60);
        if (this.teacherTimeRangeFilter === 'today') return diffHours <= 24;
        if (this.teacherTimeRangeFilter === '7days') return diffHours <= 24 * 7;
        if (this.teacherTimeRangeFilter === '30days') return diffHours <= 24 * 30;
        return true;
      });
    }

    if (this.teacherMessageFilter === 'unread') {
      convs = convs.filter(c => c.unreadCount > 0);
    }

    const q = this.teacherMessageSearchQuery;
    if (q) {
      convs = convs.filter(c => {
        const sName = String(c.name || '').toLowerCase();
        const sEmail = String(c.email || '').toLowerCase();
        const sPhone = String(c.phone || '').toLowerCase();
        const hasMatchingMsg = c.messages.some(m => String(m.content || '').toLowerCase().includes(q));
        return sName.includes(q) || sEmail.includes(q) || sPhone.includes(q) || hasMatchingMsg;
      });
    }

    if (convs.length === 0) {
      convListEl.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-secondary);">
          <div style="font-size: 1.5rem; margin-bottom: 0.4rem;">💬</div>
          <div style="font-size: 0.85rem; font-weight: 600;">No chats found</div>
        </div>
      `;
      return;
    }

    convListEl.innerHTML = convs.map(c => {
      const isActive = c.key === this.activeConversationKey;
      const isUnread = c.unreadCount > 0;
      const lastText = c.lastMessage ? (c.lastMessage.sender_role === 'teacher' ? 'You: ' + c.lastMessage.content : c.lastMessage.content) : 'Started a chat';
      const timeStr = c.lastMessage?.created_at ? new Date(c.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const dotBg = c.isOnline ? '#10B981' : '#9CA3AF';
      const dotShadow = c.isOnline ? '0 0 0 2px var(--bg-card), 0 0 8px rgba(16, 185, 129, 0.6)' : '0 0 0 2px var(--bg-card)';
      const dotTitle = c.isOnline ? 'Active now' : 'Offline';

      return `
        <div class="messenger-conv-item ${isActive ? 'active' : ''} ${isUnread ? 'unread' : ''}" onclick="Teacher.selectConversation('${c.key}')">
          <div class="messenger-conv-avatar-wrap">
            ${c.avatar ? `
              <img src="${c.avatar}" alt="${this.escapeHtml(c.name)}" class="messenger-conv-avatar" />
            ` : `
              <div class="messenger-conv-avatar">
                ${this.escapeHtml(c.name.charAt(0).toUpperCase())}
              </div>
            `}
            <span class="messenger-status-dot ${c.isOnline ? 'online' : 'offline'}" style="background-color: ${dotBg}; box-shadow: ${dotShadow};" title="${dotTitle}"></span>
          </div>

          <div class="messenger-conv-details">
            <div class="messenger-conv-name-row">
              <span class="messenger-conv-name">${this.escapeHtml(c.name)}</span>
              <span class="messenger-conv-time">${timeStr}</span>
            </div>
            <div class="messenger-conv-snippet-row">
              <span class="messenger-conv-snippet">${this.escapeHtml(lastText)}</span>
              ${isUnread ? `<span class="messenger-conv-badge-pill">${c.unreadCount}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  selectConversation(convKey) {
    this.activeConversationKey = convKey;
    const conv = this.getConversations().find(c => c.key === convKey);
    if (conv && conv.id) {
      API.markConversationRead(conv.id).catch(() => {});
      (this.teacherMessages || []).forEach(m => {
        if (m.student_id == conv.id || m.sender_id == conv.id) {
          m.is_read = 1;
          m.status = 'seen';
        }
      });
    }
    this.renderTeacherMessages();
    setTimeout(() => {
      this.scrollTeacherMessengerToBottom();
      const input = document.getElementById('teacher-composer-input');
      if (input) input.focus();
    }, 100);
  },

  scrollTeacherMessengerToBottom() {
    const stream = document.getElementById('teacher-messages-stream');
    if (stream) {
      stream.scrollTop = stream.scrollHeight;
    }
  },

  renderTeacherMessages() {
    const convListEl = document.getElementById('teacher-messenger-conv-list');
    const mainPaneEl = document.getElementById('teacher-messenger-main-pane');
    const contactPaneEl = document.getElementById('teacher-messenger-contact-pane');
    const countBadge = document.getElementById('teacher-messages-page-count-badge');
    const dashboardTbody = document.getElementById('teacher-messages-table-body');

    const totalCount = (this.teacherMessages || []).length;
    if (countBadge) {
      countBadge.textContent = `${totalCount} ${totalCount === 1 ? 'Message' : 'Messages'}`;
    }

    let convs = this.getConversations();

    // Default active conversation
    if (!this.activeConversationKey && convs.length > 0) {
      this.activeConversationKey = convs[0].key;
    } else if (this.activeConversationKey && !convs.some(c => c.key === this.activeConversationKey) && convs.length > 0) {
      this.activeConversationKey = convs[0].key;
    }

    // 1. Render Left Sidebar Conversations List
    this.updateSidebarConversations();

    // 2. Render Middle Active Conversation Pane
    this.renderTeacherActiveConversation(mainPaneEl);

    // 3. Render Right Column Contact Info Pane
    this.renderTeacherContactInfo(contactPaneEl);

    // 4. Render Dashboard Table if present
    if (dashboardTbody) {
      if (convs.length === 0) {
        dashboardTbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-secondary);">
              <div style="color: var(--gold-600); margin-bottom: 0.5rem;">${Icons.message(24)}</div>
              <strong>No Direct Student Messages Yet</strong>
            </td>
          </tr>
        `;
      } else {
        dashboardTbody.innerHTML = convs.map(c => {
          const lastMsg = c.lastMessage;
          const timeStr = lastMsg?.created_at ? new Date(lastMsg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent';

          return `
            <tr>
              <td>
                <div style="display: flex; align-items: center; gap: 0.65rem;">
                  <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(198, 138, 40, 0.15); display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--gold-800); font-size: 0.85rem; border: 1px solid var(--gold-400);">
                    ${c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong style="color: var(--text-primary); font-size: 0.88rem; display: block;">${this.escapeHtml(c.name)}</strong>
                    <div style="font-size: 0.74rem; color: var(--text-secondary);">${this.escapeHtml(c.email)}</div>
                  </div>
                </div>
              </td>
              <td style="max-width: 300px;">
                <div style="font-size: 0.85rem; color: var(--text-primary); line-height: 1.45; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${this.escapeHtml(lastMsg?.content || '')}
                </div>
              </td>
              <td>
                <span class="messenger-conv-time" style="font-size: 0.78rem;">${timeStr}</span>
              </td>
              <td>
                <span style="font-size: 0.75rem; font-weight: 700; color: ${c.unreadCount === 0 ? '#059669' : '#D97706'};">
                  ${c.unreadCount === 0 ? 'Seen' : 'Unread'}
                </span>
              </td>
              <td>
                <button type="button" class="btn btn-outline-gold btn-xs" onclick="window.location.hash='#teacher-students'; setTimeout(() => Teacher.scrollToInquiry(${c.studentId || `'${c.key}'`}), 200);">
                  Reply
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  },

  renderTeacherActiveConversation(container) {
    if (!container) container = document.getElementById('teacher-messenger-main-pane');
    if (!container) return;

    const convs = this.getConversations();
    const activeConv = convs.find(c => c.key === this.activeConversationKey);

    if (!activeConv) {
      container.innerHTML = `
        <div class="messenger-empty-state">
          <div style="color: var(--gold-600); margin-bottom: 0.75rem;">${Icons.message(44)}</div>
          <h4 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.4rem;">Select a Conversation</h4>
          <p style="font-size: 0.88rem; color: var(--text-secondary); max-width: 340px; margin: 0;">
            Choose a student from the left sidebar to view their full message history and reply in real time.
          </p>
        </div>
      `;
      return;
    }

    const dotBg = activeConv.isOnline ? '#10B981' : '#9CA3AF';
    const dotShadow = activeConv.isOnline ? '0 0 0 2px var(--bg-card), 0 0 8px rgba(16, 185, 129, 0.6)' : '0 0 0 2px var(--bg-card)';
    const statusText = activeConv.isOnline ? '● Active now' : '○ Offline';
    const statusColor = activeConv.isOnline ? '#059669' : '#6B7280';

    container.innerHTML = `
      <!-- Active Conversation Header Matching Reference -->
      <div class="messenger-active-header">
        <div class="messenger-active-contact">
          <div class="messenger-conv-avatar-wrap">
            ${activeConv.avatar ? `
              <img src="${activeConv.avatar}" alt="${this.escapeHtml(activeConv.name)}" class="messenger-header-avatar" />
            ` : `
              <div class="messenger-header-avatar" style="display: flex; align-items: center; justify-content: center; background: rgba(198, 138, 40, 0.15); font-weight: 700; color: var(--gold-700);">
                ${this.escapeHtml(activeConv.name.charAt(0).toUpperCase())}
              </div>
            `}
            <span class="messenger-status-dot ${activeConv.isOnline ? 'online' : 'offline'}" id="teacher-active-header-dot" style="background-color: ${dotBg}; box-shadow: ${dotShadow};" title="${activeConv.isOnline ? 'Active now' : 'Offline'}"></span>
          </div>
          <div>
            <h4 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary); line-height: 1.2;">${this.escapeHtml(activeConv.name)}</h4>
            <div style="display: flex; align-items: center; gap: 0.35rem; margin-top: 2px;">
              <span style="font-size: 0.8rem; color: var(--text-secondary);">${this.escapeHtml(activeConv.phone || activeConv.email)}</span>
              <button type="button" class="messenger-header-copy-btn" onclick="Teacher.copyContactIdentifier('${this.escapeHtml(activeConv.phone || activeConv.email)}')" title="Copy identifier">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
              <span style="font-size: 0.74rem; color: ${statusColor}; font-weight: 600;" id="teacher-active-header-status-text">${statusText}</span>
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 0.45rem;">
          <button type="button" class="messenger-header-action-btn" title="Archive Chat" onclick="Teacher.archiveConversation('${activeConv.key}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
          </button>
        </div>
      </div>

      <!-- Messages Stream (Matching Reference Image) -->
      <div class="messenger-body" id="teacher-messages-stream" style="flex: 1; overflow-y: auto; padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 0.85rem;">
        <div style="text-align: center; margin: 0.5rem 0 1rem;">
          <span style="background: var(--bg-secondary, #F3F4F6); color: var(--text-secondary); font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.85rem; border-radius: 999px;">Today</span>
        </div>

        <div class="messenger-thread" id="teacher-messages-thread-container" style="display: flex; flex-direction: column; gap: 0.85rem;">
          <!-- Dynamically populated -->
        </div>
      </div>

      <!-- Composer Toolbar & Input Matching Reference Image -->
      <div class="messenger-footer" style="padding: 0.65rem 1.25rem 1rem; border-top: 1px solid var(--border-color); background: var(--bg-card); display: flex; flex-direction: column; gap: 0.45rem;">
        <!-- Hidden file inputs -->
        <input type="file" id="teacher-messenger-pic-input" accept="image/*" style="display:none;" onchange="Teacher.handleAttachmentUpload(this, true)" />
        <input type="file" id="teacher-messenger-doc-input" accept="*/*" style="display:none;" onchange="Teacher.handleAttachmentUpload(this, false)" />

        <!-- Attachment Preview Pill -->
        <div id="teacher-composer-attachment-preview" style="display:none;"></div>

        <!-- Quick Template Dropdown & Emoji Picker Container -->
        <div id="teacher-templates-dropdown" style="display: none;"></div>
        <div id="teacher-emoji-dropdown" style="display: none;"></div>

        <!-- Action Toolbar Matching Reference Image -->
        <div class="messenger-composer-toolbar" style="display: flex; align-items: center; gap: 0.85rem; padding: 0; margin-bottom: 0.15rem;">
          <button type="button" class="messenger-tool-btn" onclick="Teacher.triggerAttachmentChooser()" title="Attach file, photo or link">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
            <span>Attach</span>
          </button>
          <button type="button" class="messenger-tool-btn" onclick="Teacher.toggleEmojiMenu()" title="Add emoji">
            😊
          </button>
          <button type="button" class="messenger-tool-btn" onclick="Teacher.toggleTemplatesMenu()" title="SMS templates / Quick reply">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span>SMS template</span>
          </button>
          <button type="button" class="messenger-tool-btn" onclick="Teacher.openCalendarShortcut()" title="Add event to calendar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>Add event to calendar</span>
          </button>
        </div>

        <form class="messenger-composer-form" onsubmit="event.preventDefault(); Teacher.sendTeacherMessage();">
          <div class="messenger-input-wrap" style="display: flex; align-items: center; gap: 0.65rem; background: var(--bg-secondary, #FAF8F5); border: 1px solid var(--border-color); border-radius: 24px; padding: 0.35rem 0.65rem 0.35rem 1.15rem;">
            <textarea 
              id="teacher-composer-input" 
              class="messenger-textarea" 
              placeholder="Type a message or share photos, files, links with ${this.escapeHtml(activeConv.name)}..." 
              rows="1"
              onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault(); Teacher.sendTeacherMessage();}"
            ></textarea>
            <button type="submit" class="messenger-send-btn" id="teacher-send-msg-btn" title="Send (Enter)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </form>
      </div>
    `;

    this.renderThreadMessagesOnly(activeConv);

    setTimeout(() => {
      this.scrollTeacherMessengerToBottom();
      this.renderAttachmentPreview();
    }, 50);
  },

  renderThreadMessagesOnly(activeConv) {
    const threadEl = document.getElementById('teacher-messages-thread-container');
    if (!threadEl) return;

    threadEl.innerHTML = activeConv.messages.map(m => {
      const isMe = m.sender_role === 'teacher';
      const timeStr = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const statusHtml = isMe ? (m.status === 'seen' || m.is_read === 1 ? '• Seen' : '• Delivered') : '';

      if (!isMe) {
        return `
          <div class="messenger-message incoming" id="teacher-msg-row-${m.id}" style="display: flex; align-items: flex-end; gap: 0.65rem; align-self: flex-start; max-width: 75%;">
            ${activeConv.avatar ? `
              <img src="${activeConv.avatar}" alt="${this.escapeHtml(activeConv.name)}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />
            ` : `
              <div style="width: 30px; height: 30px; border-radius: 50%; background: rgba(198, 138, 40, 0.15); color: var(--gold-700); font-weight: 700; font-size: 0.78rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                ${this.escapeHtml(activeConv.name.charAt(0).toUpperCase())}
              </div>
            `}
            <div>
              <div class="messenger-bubble" style="background: #F3F4F6; color: #1F2937; border-radius: 18px 18px 18px 4px; padding: 0.85rem 1.15rem; font-size: 0.92rem; line-height: 1.5; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);">
                <div id="teacher-msg-content-${m.id}">${this.formatMessageBody(m)}</div>
              </div>
              <div style="margin-top: 0.25rem; font-size: 0.72rem; color: #9CA3AF; padding-left: 0.25rem;">
                <span>${timeStr}</span>
                ${m.is_edited ? '<span class="messenger-edited-tag">(edited)</span>' : ''}
              </div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="messenger-message outgoing" id="teacher-msg-row-${m.id}" style="display: flex; flex-direction: column; align-items: flex-end; align-self: flex-end; max-width: 75%;">
            <div class="messenger-bubble" style="background: #1D64F2; color: #FFFFFF; border-radius: 18px 18px 4px 18px; padding: 0.85rem 1.15rem; font-size: 0.92rem; line-height: 1.5; box-shadow: 0 4px 14px rgba(29, 100, 242, 0.22);">
              <div id="teacher-msg-content-${m.id}" style="color: #FFFFFF;">${this.formatMessageBody(m)}</div>
            </div>
            <div style="margin-top: 0.25rem; font-size: 0.72rem; color: #9CA3AF; padding-right: 0.25rem; display: flex; align-items: center; gap: 0.35rem;">
              <span>${timeStr}</span>
              ${statusHtml ? `<span class="messenger-msg-status">${statusHtml}</span>` : ''}
              ${m.is_edited ? '<span class="messenger-edited-tag">(edited)</span>' : ''}
            </div>
          </div>
        `;
      }
    }).join('');

    this.scrollTeacherMessengerToBottom();
  },

  renderTeacherContactInfo(container) {
    if (!container) container = document.getElementById('teacher-messenger-contact-pane');
    if (!container) return;

    const convs = this.getConversations();
    const activeConv = convs.find(c => c.key === this.activeConversationKey);

    if (!activeConv) {
      container.innerHTML = `
        <div style="padding: 2.5rem 1.5rem; text-align: center; color: var(--text-secondary);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">👤</div>
          <h5>No Contact Selected</h5>
        </div>
      `;
      return;
    }

    const inquiryTopic = activeConv.subject || 'Calculus BC';

    container.innerHTML = `
      <div class="contact-info-header">
        <h4 class="contact-info-title">Contact Info</h4>
      </div>

      <div class="contact-info-hero">
        ${activeConv.avatar ? `
          <img src="${activeConv.avatar}" alt="${this.escapeHtml(activeConv.name)}" class="contact-info-avatar" />
        ` : `
          <div class="contact-info-avatar">
            ${this.escapeHtml(activeConv.name.charAt(0).toUpperCase())}
          </div>
        `}
        <h3 class="contact-info-name">${this.escapeHtml(activeConv.name)}</h3>
        <button type="button" class="contact-info-action-btn" title="Student Profile" onclick="window.location.hash='#teacher-students'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </button>
      </div>

      <div class="contact-info-section">
        <div class="contact-info-section-header">
          <h5 class="contact-info-section-title">About</h5>
        </div>

        <div class="contact-info-list" id="teacher-contact-info-fields">
          <div class="contact-info-item">
            <span class="contact-info-item-icon">👤</span>
            <div class="contact-info-item-content">
              <div class="contact-info-item-label">Name</div>
              <div class="contact-info-item-val">${this.escapeHtml(activeConv.name)}</div>
            </div>
          </div>

          <div class="contact-info-item">
            <span class="contact-info-item-icon">🏢</span>
            <div class="contact-info-item-content">
              <div class="contact-info-item-label">Company / School</div>
              <div class="contact-info-item-val" id="teacher-contact-val-school">${this.escapeHtml(activeConv.school || 'Westlake High School')}</div>
            </div>
          </div>

          <div class="contact-info-item">
            <span class="contact-info-item-icon">📇</span>
            <div class="contact-info-item-content">
              <div class="contact-info-item-label">Contact list / Focus</div>
              <div class="contact-info-item-val" id="teacher-contact-val-subject">${this.escapeHtml(inquiryTopic)}</div>
            </div>
          </div>

          <div class="contact-info-item">
            <span class="contact-info-item-icon">📞</span>
            <div class="contact-info-item-content">
              <div class="contact-info-item-label">Phone</div>
              <div class="contact-info-item-val" id="teacher-contact-val-phone">${this.escapeHtml(activeConv.phone || '+1 (555) 382-9014')}</div>
            </div>
          </div>

          <div class="contact-info-item">
            <span class="contact-info-item-icon">✉️</span>
            <div class="contact-info-item-content">
              <div class="contact-info-item-label">Email</div>
              <div class="contact-info-item-val">${this.escapeHtml(activeConv.email)}</div>
            </div>
          </div>

          <div class="contact-info-item">
            <span class="contact-info-item-icon">📍</span>
            <div class="contact-info-item-content">
              <div class="contact-info-item-label">Country</div>
              <div class="contact-info-item-val" id="teacher-contact-val-country">${this.escapeHtml(activeConv.country || 'United States')}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="contact-info-section" style="border-bottom: none;">
        <div class="contact-info-section-header">
          <h5 class="contact-info-section-title">Notes</h5>
        </div>

        <div class="contact-notes-card">
          <textarea id="teacher-contact-note-input" class="contact-notes-textarea" placeholder="Write a note..."></textarea>
          <div class="contact-notes-toolbar">
            <div class="contact-notes-tools">
              <button type="button" class="contact-notes-tool-btn" onclick="Teacher.insertNoteSnippet('@')" title="Mention">@</button>
              <button type="button" class="contact-notes-tool-btn" onclick="Teacher.insertNoteSnippet('📎 ')" title="Attach file note">📎</button>
              <button type="button" class="contact-notes-tool-btn" onclick="Teacher.insertNoteSnippet('😊 ')" title="Emoji">😊</button>
            </div>
            <button type="button" class="contact-notes-save-btn" onclick="Teacher.saveContactNote('${activeConv.id || activeConv.key}')" title="Save Note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
            </button>
          </div>
        </div>

        <div class="contact-notes-list" id="teacher-contact-notes-list">
          <div style="font-size: 0.78rem; color: var(--text-secondary); text-align: center; padding: 0.75rem 0;">Loading notes...</div>
        </div>
      </div>
    `;

    this.loadContactNotes(activeConv.id || activeConv.key);
  },

  insertNoteSnippet(snippet) {
    const input = document.getElementById('teacher-contact-note-input');
    if (input) {
      input.value += snippet;
      input.focus();
    }
  },

  async loadContactNotes(contactId) {
    const listEl = document.getElementById('teacher-contact-notes-list');
    if (!listEl) return;
    try {
      const res = await API.getContactNotes(contactId);
      const notes = res.notes || [];
      if (notes.length === 0) {
        listEl.innerHTML = `
          <div style="font-size: 0.76rem; color: var(--text-secondary); text-align: center; padding: 0.5rem 0;">No notes added yet.</div>
        `;
        return;
      }
      listEl.innerHTML = notes.map(n => {
        const timeStr = n.created_at ? new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        return `
          <div class="contact-note-item" id="teacher-note-item-${n.id}">
            <div class="contact-note-text">${this.escapeHtml(n.note)}</div>
            <div class="contact-note-meta-row">
              <span>${timeStr}</span>
              <button type="button" class="contact-note-del-btn" onclick="Teacher.deleteContactNote(${n.id}, '${contactId}')" title="Delete note">×</button>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      listEl.innerHTML = `<div style="font-size: 0.76rem; color: var(--text-secondary); text-align: center; padding: 0.5rem 0;">No notes available.</div>`;
    }
  },

  async saveContactNote(contactId) {
    const input = document.getElementById('teacher-contact-note-input');
    const text = (input?.value || '').trim();
    if (!text) {
      showToast('Please type a note first.', 'warning');
      return;
    }
    try {
      await API.addContactNote(contactId, text);
      input.value = '';
      showToast('Note saved permanently.', 'success');
      this.loadContactNotes(contactId);
    } catch (err) {
      showToast('Failed to save note.', 'error');
    }
  },

  async deleteContactNote(noteId, contactId) {
    try {
      await API.deleteContactNote(noteId);
      showToast('Note deleted.', 'info');
      this.loadContactNotes(contactId);
    } catch (err) {
      showToast('Failed to delete note.', 'error');
    }
  },

  appendMessageToActiveThread(m) {
    const threadEl = document.getElementById('teacher-messages-thread-container');
    if (!threadEl) {
      this.renderTeacherMessages();
      return;
    }

    const isMe = m.sender_role === 'teacher';
    const timeStr = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const statusHtml = isMe ? (m.status === 'seen' || m.is_read === 1 ? '• Seen' : '• Delivered') : '';

    const div = document.createElement('div');
    div.className = `messenger-message ${isMe ? 'outgoing' : 'incoming'}`;
    div.id = `teacher-msg-row-${m.id}`;

    if (isMe) {
      div.style.cssText = 'display: flex; flex-direction: column; align-items: flex-end; align-self: flex-end; max-width: 75%;';
      div.innerHTML = `
        <div class="messenger-bubble" style="background: #1D64F2; color: #FFFFFF; border-radius: 18px 18px 4px 18px; padding: 0.85rem 1.15rem; font-size: 0.92rem; line-height: 1.5; box-shadow: 0 4px 14px rgba(29, 100, 242, 0.22);">
          <div id="teacher-msg-content-${m.id}" style="color: #FFFFFF;">${this.formatMessageBody(m)}</div>
        </div>
        <div style="margin-top: 0.25rem; font-size: 0.72rem; color: #9CA3AF; padding-right: 0.25rem; display: flex; align-items: center; gap: 0.35rem;">
          <span>${timeStr}</span>
          ${statusHtml ? `<span class="messenger-msg-status">${statusHtml}</span>` : ''}
        </div>
      `;
    } else {
      div.style.cssText = 'display: flex; align-items: flex-end; gap: 0.65rem; align-self: flex-start; max-width: 75%;';
      div.innerHTML = `
        <div style="width: 30px; height: 30px; border-radius: 50%; background: rgba(198, 138, 40, 0.15); color: var(--gold-700); font-weight: 700; font-size: 0.78rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          S
        </div>
        <div>
          <div class="messenger-bubble" style="background: #F3F4F6; color: #1F2937; border-radius: 18px 18px 18px 4px; padding: 0.85rem 1.15rem; font-size: 0.92rem; line-height: 1.5; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);">
            <div id="teacher-msg-content-${m.id}">${this.formatMessageBody(m)}</div>
          </div>
          <div style="margin-top: 0.25rem; font-size: 0.72rem; color: #9CA3AF; padding-left: 0.25rem;">
            <span>${timeStr}</span>
          </div>
        </div>
      `;
    }

    threadEl.appendChild(div);
    this.scrollTeacherMessengerToBottom();
  },

  formatFileSize(bytes) {
    if (!bytes || isNaN(bytes)) return '';
    const b = Number(bytes);
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(1) + ' MB';
  },

  formatMessageBody(m) {
    let html = '';
    const text = (m.content || m.text || '').trim();
    if (text) {
      let escaped = this.escapeHtml(text);
      const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
      escaped = escaped.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="messenger-bubble-link">${url}</a>`;
      });
      escaped = escaped.replace(/\n/g, '<br>');
      html += `<div class="messenger-bubble-text">${escaped}</div>`;
    }

    if (m.attachment_url) {
      const isImg = (m.attachment_type && m.attachment_type.startsWith('image/')) ||
                    /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(m.attachment_url) ||
                    /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(m.attachment_name || '');
      if (isImg) {
        html += `
          <div class="messenger-bubble-img-wrap">
            <img src="${m.attachment_url}" alt="${this.escapeHtml(m.attachment_name || 'Photo')}" class="messenger-bubble-img" onclick="window.open('${m.attachment_url}', '_blank')" />
          </div>
        `;
      } else {
        html += `
          <a href="${m.attachment_url}" target="_blank" download="${this.escapeHtml(m.attachment_name || 'attachment')}" class="messenger-file-attachment">
            <span class="messenger-file-icon">📄</span>
            <div class="messenger-file-details">
              <span class="messenger-file-name">${this.escapeHtml(m.attachment_name || 'Download Attachment')}</span>
              <span class="messenger-file-size">${this.formatFileSize(m.attachment_size)}</span>
            </div>
            <span class="messenger-file-download-icon">⬇</span>
          </a>
        `;
      }
    }
    return html;
  },

  renderAttachmentPreview() {
    const previewEl = document.getElementById('teacher-composer-attachment-preview');
    if (!previewEl) return;
    const att = this.pendingMessageAttachment;
    if (!att) {
      previewEl.style.display = 'none';
      previewEl.innerHTML = '';
      return;
    }

    const isImg = att.type && att.type.startsWith('image/');
    previewEl.style.display = 'flex';
    previewEl.innerHTML = `
      <div class="messenger-attachment-preview">
        ${isImg ? `
          <img src="${att.url}" alt="${this.escapeHtml(att.name)}" class="messenger-attachment-thumb" />
        ` : `
          <span class="messenger-attachment-icon-chip">📎</span>
        `}
        <div class="messenger-attachment-info">
          <span class="messenger-attachment-name">${this.escapeHtml(att.name)}</span>
          <span class="messenger-attachment-meta">${this.formatFileSize(att.size)}</span>
        </div>
        <button type="button" class="messenger-attachment-remove" onclick="Teacher.removePendingAttachment()" title="Remove attachment">×</button>
      </div>
    `;
  },

  removePendingAttachment() {
    this.pendingMessageAttachment = null;
    this.renderAttachmentPreview();
  },

  triggerPictureUpload() {
    const inp = document.getElementById('teacher-messenger-pic-input');
    if (inp) {
      inp.value = '';
      inp.click();
    }
  },

  triggerFileUpload() {
    const inp = document.getElementById('teacher-messenger-doc-input');
    if (inp) {
      inp.value = '';
      inp.click();
    }
  },

  async handleAttachmentUpload(inputEl, isPic) {
    if (!inputEl || !inputEl.files || inputEl.files.length === 0) return;
    const file = inputEl.files[0];

    // Max 15MB
    if (file.size > 15 * 1024 * 1024) {
      showToast('File exceeds 15MB size limit.', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      showToast('Uploading attachment...', 'info');
      const res = await API.uploadMessageAttachment(formData);
      if (res && res.url) {
        this.pendingMessageAttachment = {
          url: res.url,
          name: res.name || file.name,
          type: res.type || file.type,
          size: res.size || file.size
        };
        this.renderAttachmentPreview();
        showToast('Attachment ready to send.', 'success');
      } else {
        showToast('Upload did not return URL.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to upload attachment.', 'error');
    }
  },

  insertLinkPrompt() {
    const url = prompt('Enter the link / URL to share with your student (e.g. https://...):');
    if (!url) return;
    const cleanUrl = url.trim();
    if (!cleanUrl) return;
    const validUrl = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(cleanUrl) ? cleanUrl : 'https://' + cleanUrl;

    const textarea = document.getElementById('teacher-composer-input');
    if (textarea) {
      const space = textarea.value.length > 0 && !textarea.value.endsWith(' ') ? ' ' : '';
      textarea.value = textarea.value + space + validUrl + ' ';
      textarea.focus();
    }
  },

  async sendTeacherMessage() {
    const input = document.getElementById('teacher-composer-input');
    const text = input ? input.value.trim() : '';
    const attachment = this.pendingMessageAttachment;

    if (!text && !attachment) return;

    const convs = this.getConversations();
    const activeConv = convs.find(c => c.key === this.activeConversationKey);
    if (!activeConv) return;

    const targetStudentId = activeConv.id || 
      (activeConv.messages && activeConv.messages.find(m => m.student_id || (m.sender_role === 'student' ? m.sender_id : m.receiver_id))?.student_id) ||
      (!isNaN(activeConv.key) ? Number(activeConv.key) : null);

    if (!targetStudentId) {
      showToast('Could not identify student recipient.', 'error');
      return;
    }

    // Clear input & pending attachment immediately
    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }
    this.pendingMessageAttachment = null;
    this.renderAttachmentPreview();

    const currentTeacherId = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser.id : null;
    const clientTempId = 'temp-' + Date.now();
    const tempMsg = {
      id: clientTempId,
      sender_role: 'teacher',
      sender_id: currentTeacherId,
      receiver_id: targetStudentId,
      student_id: targetStudentId,
      subject: activeConv.subject ? (activeConv.subject.startsWith('Re:') ? activeConv.subject : `Re: ${activeConv.subject}`) : 'Inquiry Response',
      content: text,
      attachment_url: attachment ? attachment.url : null,
      attachment_name: attachment ? attachment.name : null,
      attachment_type: attachment ? attachment.type : null,
      attachment_size: attachment ? attachment.size : null,
      status: 'delivered',
      is_read: 0,
      is_edited: 0,
      created_at: new Date().toISOString()
    };

    // Immediately push to state and append to DOM thread - instant response
    this.teacherMessages.push(tempMsg);
    this.appendMessageToActiveThread(tempMsg);
    this.updateSidebarConversations();

    try {
      const res = await API.teacherReplyMessage({
        student_id: targetStudentId,
        subject: activeConv.subject,
        message: text,
        attachment_url: attachment ? attachment.url : null,
        attachment_name: attachment ? attachment.name : null,
        attachment_type: attachment ? attachment.type : null,
        attachment_size: attachment ? attachment.size : null
      });

      if (res && res.data) {
        tempMsg.id = res.data.id;
        tempMsg.student_id = targetStudentId;
        tempMsg.receiver_id = targetStudentId;
        tempMsg.sender_role = 'teacher';
        tempMsg.created_at = res.data.created_at;
        tempMsg.status = res.data.status || 'delivered';
        tempMsg.subject = res.data.subject || tempMsg.subject;
        const row = document.getElementById(`teacher-msg-row-${clientTempId}`);
        if (row) row.id = `teacher-msg-row-${res.data.id}`;
      }
    } catch (err) {
      console.warn('Reply deliver warning:', err);
    }
  },

  openReplyModal(messageId, studentId, studentName, content) {
    // Switch to Students Page and scroll to this student's inquiry
    if (studentId) {
      window.location.hash = '#teacher-students';
      setTimeout(() => this.scrollToInquiry(studentId), 200);
      return;
    }
    const modal = document.getElementById('modal-teacher-reply-message');
    if (!modal) return;
    const studentIdInput = document.getElementById('teacher-reply-student-id');
    const msgIdInput = document.getElementById('teacher-reply-orig-message-id');
    const nameLabel = document.getElementById('teacher-reply-orig-student-name');
    const contentP = document.getElementById('teacher-reply-orig-content');
    const textarea = document.getElementById('teacher-reply-textarea');

    if (studentIdInput) studentIdInput.value = studentId || '';
    if (msgIdInput) msgIdInput.value = messageId || '';
    if (nameLabel) nameLabel.textContent = `Message from ${studentName}:`;
    if (contentP) contentP.textContent = content;
    if (textarea) {
      textarea.value = '';
      textarea.focus();
    }
    this.openModal('modal-teacher-reply-message');
  },

  async toggleOnlinePresence() {
    try {
      const res = await API.toggleTeacherPresence();
      const btns = document.querySelectorAll('#btn-tutor-presence-toggle, #btn-tutor-presence-toggle-page, .btn-tutor-presence-toggle');
      btns.forEach(btn => {
        if (res.is_online) {
          btn.innerHTML = '● Online (Account Open)';
          btn.style.color = '#059669';
          btn.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        } else {
          btn.innerHTML = '○ Offline (Hidden)';
          btn.style.color = '#6B7280';
          btn.style.borderColor = 'rgba(156, 163, 175, 0.4)';
        }
      });
      showToast(res.is_online ? 'Your status is now Online (Account Open).' : 'Your status is now Offline.', 'info');
    } catch (e) {
      showToast('Failed to toggle status.', 'error');
    }
  },

  async sendReplyToStudent() {
    const studentIdInput = document.getElementById('teacher-reply-student-id');
    const msgIdInput = document.getElementById('teacher-reply-orig-message-id');
    const textarea = document.getElementById('teacher-reply-textarea');
    const submitBtn = document.getElementById('btn-submit-teacher-reply');

    const studentId = studentIdInput ? studentIdInput.value : null;
    const messageId = msgIdInput ? msgIdInput.value : null;
    const replyText = textarea ? textarea.value.trim() : '';

    if (!replyText) {
      showToast('Please type a reply message.', 'warning');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
    }

    try {
      const res = await API.teacherReplyMessage({
        student_id: studentId,
        message_id: messageId,
        message: replyText
      });

      showToast(res.message || 'Reply delivered directly to the student in real time!', 'success');
      this.closeModal('modal-teacher-reply-message');
      await this.loadTeacherMessages();
    } catch (err) {
      showToast(err.message || 'Failed to send reply.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Reply';
      }
    }
  },

  highlightRequest(requestId) {
    if (!requestId) return;
    setTimeout(() => {
      const card = document.getElementById('teacher-class-card-' + requestId);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('highlight-pulse');
        setTimeout(() => card.classList.remove('highlight-pulse'), 3000);
      }
    }, 250);
  },

  highlightInterviewBanner() {
    setTimeout(() => {
      const banner = document.getElementById('teacher-interview-banner') || document.querySelector('.teacher-interview-notice');
      if (banner) {
        banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
        banner.classList.add('highlight-pulse');
        setTimeout(() => banner.classList.remove('highlight-pulse'), 3000);
      }
    }, 250);
  }
};

window.Teacher = Teacher;
window.escapeHtml = window.escapeHtml || Teacher.escapeHtml;
