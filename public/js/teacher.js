/**
 * AVIORA EDUCATION - TUTOR PROFILE, ACCOUNT & TEACHING WORKSPACE
 * Features:
 *  - Header & Tab Navigation: Dashboard, Class, Students, Schedule, Profile & Rates
 *  - Financial Dashboard: Gross Student Revenue, Aviora 15% Commission Cut, Net Take-Home Earnings, Monthly Ledger
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
      // Show the approved status on the dashboard only; other pages stay clean
      bannerContainer.innerHTML = targetContainerId !== 'teacher-banner-dashboard' ? '' : `
        <div class="app-status-banner approved-dashboard" style="margin-bottom: 1.5rem; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: var(--radius-md); padding: 1.25rem; display: flex; gap: 1rem; align-items: flex-start;">
          <div class="status-icon-circle" style="background: rgba(16, 185, 129, 0.2); color: #10B981; width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            ${Icons.check(22)}
          </div>
          <div class="status-banner-content" style="flex: 1;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
              <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700;">
                Tutor Application • ${applicantName}
              </div>
              <span class="status-pill approved" style="font-size: 0.75rem;">Status: Approved</span>
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
    } else if (currentHash === '#teacher-messages') {
      await this.loadMessagesPage();
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
    else if (tabId === 'messages') window.location.hash = '#teacher-messages';
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
      if (ratingEl) ratingEl.innerHTML = `${Icons.star(14, 'margin-right: 2px;', '#F59E0B')} ${stats.rating?.toFixed(1) || '5.0'} (${stats.reviews_count || 0})`;

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

          <!-- Actions -->
          <div class="student-card-actions">
            ${!this.isApproved() ? `
              <button type="button" class="btn btn-secondary btn-sm" style="flex: 1; opacity: 0.7; cursor: not-allowed; display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem;" disabled title="Coursework operations locked while application is under review">
                ${Icons.lock(13)} Operations Locked (Under Review)
              </button>
            ` : `
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

      // Load educator personal date notes (both from server & localStorage)
      const user = Auth.currentUser;
      const localKey = user ? `aviora_teacher_date_notes_${user.id}` : null;
      let localNotes = {};
      if (localKey) {
        try { localNotes = JSON.parse(localStorage.getItem(localKey) || '{}'); } catch (e) {}
      }
      const serverNotes = data?.availabilitySchedule?.date_notes || {};
      this.dateNotes = Object.assign({}, localNotes, serverNotes);

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
        <!-- Left Column: Upcoming Classes on this Date -->
        <div>
          <div class="date-schedule-col-title">
            <span>Upcoming Classes (${dayApts.length})</span>
            <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">Auto-synced</span>
          </div>

          ${dayApts.length === 0 ? `
            <div style="padding: 2rem 1.5rem; text-align: center; color: var(--text-secondary); background: rgba(0,0,0,0.02); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
              <div style="margin-bottom: 0.5rem; color: var(--text-secondary);">${isDateOccupied ? Icons.ban(26, 'color: #EF4444;') : Icons.calendar(26, 'color: var(--text-secondary);')}</div>
              <strong style="color: var(--text-primary); font-size: 0.95rem;">
                ${isDateOccupied ? 'Date Marked as Occupied' : 'No Classes on this Date'}
              </strong>
              <p style="margin: 0.25rem 0 0; font-size: 0.825rem;">
                ${isDateOccupied
                  ? 'Students see that this date is unavailable when booking.'
                  : 'Open slots on this day are ready for students to reserve.'}
              </p>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${dayApts.map(apt => `
                <div class="appointment-card" style="margin-bottom: 0.5rem; flex-direction: column; align-items: stretch;">
                  <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                    <div style="display: flex; gap: 0.75rem; align-items: center;">
                      <img src="${apt.student_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'}" class="appointment-avatar" />
                      <div>
                        <strong style="color: var(--text-primary); font-size: 0.95rem;">${apt.student_name}</strong>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${apt.subject} • <span class="status-pill ${apt.status === 'completed' ? 'completed' : apt.status === 'declined' ? 'declined' : 'pending'}" style="font-size: 0.68rem; padding: 0.1rem 0.45rem;">${(apt.status === 'completed' ? 'DONE' : apt.status === 'declined' ? 'CANCELLED' : 'PENDING')}</span></div>
                      </div>
                    </div>
                    <div class="appointment-meta">
                      <div>${Icons.clock(14)} ${apt.requested_time}</div>
                      <div>${apt.hourly_rate ? `$${apt.hourly_rate}/hr` : 'Booked'}</div>
                    </div>
                    <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
                      ${!this.isApproved() ? `
                        <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #D97706; font-size: 0.75rem; padding: 0.3rem 0.6rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.25rem;" title="Operations locked while application is under review">${Icons.lock(12)} Locked</span>
                      ` : apt.status === 'completed' ? `
                        <span style="font-size: 0.78rem; color: #10B981; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">${Icons.check(13)} Done Class</span>
                      ` : apt.room_status === 'open' ? `
                        <button class="btn btn-primary btn-sm" onclick="VirtualRoom.joinRoom(${apt.id}, 'tutor')" style="background: #10B981; border-color: #10B981;">Enter</button>
                      ` : `
                        <button class="btn btn-secondary btn-sm" onclick="Teacher.startVirtualClassSession(${apt.id}, this)">Open Room</button>
                      `}
                    </div>
                  </div>
                  ${apt.notes ? `
                    <div class="date-note-box student-focus-box" style="margin-top: 0.65rem; padding: 0.6rem 0.8rem; font-size: 0.82rem;">
                      <div class="date-note-header" style="margin-bottom: 0.2rem;">
                        <span class="date-note-badge" style="display: inline-flex; align-items: center; gap: 0.25rem;">${Icons.note(12)} Student Focus:</span>
                      </div>
                      <div class="date-note-body" style="font-size: 0.82rem;">"${this.escapeHtml(apt.notes)}"</div>
                      ${apt.tutor_response_note ? `
                        <div class="date-note-response" style="font-size: 0.76rem;"><strong>Your Note:</strong> ${this.escapeHtml(apt.tutor_response_note)}</div>
                      ` : ''}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Right Column: Time Slot Availability -->
        <div>
          <div class="date-schedule-col-title">
            <span>Time Slot Availability</span>
            <span style="font-size: 0.75rem; color: var(--gold-400); font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem;">${Icons.zap(12, 'color: var(--gold-500);')} Live</span>
          </div>

          <!-- Specify & Edit Available Hours Card -->
          <div class="time-slot-availability-editor">
            <div class="tsa-current-bar">
              <div>
                <div class="tsa-current-label">Current Hours (${dayOfWeekName})</div>
                <div class="tsa-current-value ${isDateOccupied ? 'is-occupied' : ''}">${activeHoursDisplayText}</div>
              </div>
              <button type="button" class="btn btn-outline-gold btn-sm" onclick="Teacher.toggleHoursEditor()" style="padding: 0.3rem 0.7rem; font-size: 0.76rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.3rem;">
                ${this.showHoursEditor ? Icons.x(13) + ' Close' : Icons.edit(13) + ' Edit Hours'}
              </button>
            </div>

            <div class="tsa-mode-pills-row">
              <button type="button" class="tsa-mode-pill ${!isDateOccupied && activeMode === 'all_day' ? 'active' : ''}" onclick="Teacher.selectAvailabilityMode('all_day')" style="display: inline-flex; align-items: center; gap: 0.35rem; justify-content: center;">
                ${Icons.sun(14)} All Day (8 AM – 8 PM)
              </button>
              <button type="button" class="tsa-mode-pill ${!isDateOccupied && activeMode === 'specific' ? 'active' : ''}" onclick="Teacher.selectAvailabilityMode('specific')" style="display: inline-flex; align-items: center; gap: 0.35rem; justify-content: center;">
                ${Icons.target(14)} Specific Hours
              </button>
            </div>

            <div id="teacher-hours-editor-body" class="tsa-editor-body" style="display: ${this.showHoursEditor || activeMode === 'specific' ? 'block' : 'none'};">
              ${activeMode === 'all_day' ? `
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
                  Set to <strong>Available All Day (8:00 AM – 8:00 PM)</strong>. Students can book open 50-minute sessions throughout the day.
                </div>
              ` : `
                <div class="tsa-time-range-grid">
                  <div>
                    <label class="tsa-field-label">From (Start Hour)</label>
                    <select id="tsa-start-hour" class="form-control tsa-select">
                      ${startHourOptions.join('')}
                    </select>
                  </div>
                  <div>
                    <label class="tsa-field-label">Until (End Hour)</label>
                    <select id="tsa-end-hour" class="form-control tsa-select">
                      ${endHourOptions.join('')}
                    </select>
                  </div>
                </div>
              `}

              <div class="tsa-save-row">
                <div style="flex: 1; min-width: 170px;">
                  <label class="tsa-field-label">Apply To</label>
                  <select id="tsa-apply-scope" class="form-control tsa-select">
                    <option value="date" selected>This Date Only (${this.selectedDate})</option>
                    <option value="weekday">Every ${dayOfWeekName}</option>
                    <option value="all_days">All Days (Mon–Sun)</option>
                  </select>
                </div>
                <button type="button" class="btn btn-primary btn-sm" onclick="Teacher.saveTimeSlotAvailabilityHours('${activeMode}')" style="height: 36px; padding: 0 0.85rem; font-weight: 700; white-space: nowrap; display: inline-flex; align-items: center; gap: 0.35rem;">
                  ${Icons.save(14)} Save Hours
                </button>
              </div>
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
        tutorData: { headline, hourly_rate, bio, country, timezone }
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

  // ==========================================
  // DIRECT STUDENT MESSAGES & REPLIES
  // ==========================================
  teacherMessages: [],
  teacherMessagesPollInterval: null,
  teacherMessageFilter: 'all',
  teacherMessageSearchQuery: '',

  filterMessages(filterType, btnEl) {
    this.teacherMessageFilter = filterType;
    document.querySelectorAll('.teacher-msg-filter-btn').forEach(b => {
      b.classList.toggle('active', b === btnEl || b.dataset.filter === filterType);
    });
    this.renderTeacherMessages();
  },

  searchMessages(query) {
    this.teacherMessageSearchQuery = (query || '').toLowerCase().trim();
    this.renderTeacherMessages();
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
            this.teacherMessages = res.messages || [];
            this.renderTeacherMessages();
          } catch (e) {}
        }
      }, 3000);
    }
  },

  renderTeacherMessages() {
    const dashboardTbody = document.getElementById('teacher-messages-table-body');
    const pageTbody = document.getElementById('teacher-messages-page-tbody');
    const countBadge = document.getElementById('teacher-messages-page-count-badge');

    const totalCount = (this.teacherMessages || []).length;
    if (countBadge) {
      countBadge.textContent = `${totalCount} ${totalCount === 1 ? 'Message' : 'Messages'}`;
    }

    let filtered = this.teacherMessages || [];
    if (this.teacherMessageFilter === 'unread') {
      filtered = filtered.filter(m => Number(m.is_read) === 0);
    } else if (this.teacherMessageFilter === 'seen') {
      filtered = filtered.filter(m => Number(m.is_read) === 1 || m.status === 'seen');
    }

    const q = this.teacherMessageSearchQuery;
    if (q) {
      filtered = filtered.filter(m => {
        const sName = String(m.student_name || m.sender_name || '').toLowerCase();
        const sEmail = String(m.student_email || m.sender_email || '').toLowerCase();
        const sContent = String(m.content || '').toLowerCase();
        return sName.includes(q) || sEmail.includes(q) || sContent.includes(q);
      });
    }

    const renderEmpty = () => `
      <tr>
        <td colspan="5" style="text-align: center; padding: 3rem 1.5rem;">
          <div style="color: var(--gold-700); margin-bottom: 0.5rem;">${Icons.message(28)}</div>
          <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.35rem;">
            ${q ? 'No Matching Student Chats' : 'No Direct Student Messages Yet'}
          </h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary); max-width: 460px; margin: 0 auto;">
            ${q ? 'Try searching with a different student name or keyword.' : "This is where all of a student's chats can be found. When students message you, their conversations will arrive here in real time for you to reply."}
          </p>
        </td>
      </tr>
    `;

    const renderRow = (m) => {
      const studentName = m.student_name || m.sender_name || 'Student';
      const studentEmail = m.student_email || m.sender_email || '';
      const timeStr = m.created_at ? new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent';
      const isUnread = Number(m.is_read) === 0;

      return `
        <tr style="${isUnread ? 'background: rgba(198, 138, 40, 0.05);' : ''}">
          <td>
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <div style="width: 34px; height: 34px; border-radius: 50%; background: rgba(198, 138, 40, 0.15); display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--gold-800); font-size: 0.85rem; border: 1px solid var(--gold-400);">
                ${studentName.charAt(0).toUpperCase()}
              </div>
              <div>
                <strong style="color: var(--text-primary); font-size: 0.88rem; display: block;">${this.escapeHtml(studentName)}</strong>
                <div style="font-size: 0.74rem; color: var(--text-secondary);">${this.escapeHtml(studentEmail)}</div>
              </div>
            </div>
          </td>
          <td style="max-width: 320px;">
            <div style="font-size: 0.85rem; color: var(--text-primary); line-height: 1.45; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;" title="${this.escapeHtml(m.content)}">
              ${this.escapeHtml(m.content)}
            </div>
          </td>
          <td style="font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap;">
            ${timeStr}
          </td>
          <td>
            ${(() => {
              if (m.is_read === 1 || m.status === 'seen') {
                return '<span class="badge-outline" style="font-size: 0.72rem; color: #059669; border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.08); font-weight: 700;">Seen</span>';
              } else if (m.status === 'sent') {
                return '<span class="badge-outline" style="font-size: 0.72rem; color: #6B7280; border-color: rgba(156, 163, 175, 0.4);">Sent</span>';
              } else {
                return '<span class="badge-accent" style="font-size: 0.72rem; background: rgba(198, 138, 40, 0.18); font-weight: 700;">Delivered</span>';
              }
            })()}
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button type="button" class="btn btn-outline-gold btn-sm" onclick="Teacher.openReplyModal(${m.id}, ${m.sender_id || 'null'}, '${this.escapeHtml(studentName).replace(/'/g, "\\'")}', '${this.escapeHtml(m.content).replace(/'/g, "\\'").replace(/\n/g, ' ')}')">
              ${Icons.message(13)}
              <span>Reply</span>
            </button>
          </td>
        </tr>
      `;
    };

    const rowsHtml = filtered.length === 0 ? renderEmpty() : filtered.map(renderRow).join('');

    if (dashboardTbody) {
      dashboardTbody.innerHTML = rowsHtml;
    }
    if (pageTbody) {
      pageTbody.innerHTML = rowsHtml;
    }
  },

  openReplyModal(messageId, studentId, studentName, content) {
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

    // Real-Time Seen Status: Mark message as read/seen once tutor opens/reads it
    if (messageId) {
      try {
        if (typeof API !== 'undefined' && API.markTeacherMessageRead) {
          API.markTeacherMessageRead(messageId).catch(() => {});
        }
        const m = this.teacherMessages.find(item => item.id == messageId);
        if (m) {
          m.is_read = 1;
          m.status = 'seen';
          this.renderTeacherMessages();
        }
      } catch (e) {}
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
