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
  selectedDate: (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })(),
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
  async ensureTeacherStatus() {
    const user = Auth.currentUser;
    if (!user || (user.role !== 'teacher' && user.role !== 'tutor')) return null;

    try {
      const statusData = await API.getTeacherStatus();
      this.application = statusData.application;
      this.tutorProfile = statusData.tutorProfile;
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
              <strong>✅ Live Operations Active:</strong> Your tutor profile is live in the Aviora directory and open for student lesson bookings and coursework management.
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
      ? `<strong>🔒 Operational Notice:</strong> You still cannot begin operations during the interview phase. Once the administrator marks your application as "Approved" following your interview, all features become accessible to begin operations, accept student bookings, and conduct classes.`
      : `<strong>🔒 Operational Notice:</strong> While your application is under review or pending approval, you cannot yet begin operations, though you can still view the website's content through your account.`;

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

  // 4. Dedicated Aviora Buddy Page
  async loadBuddyPage() {
    this.currentTab = 'buddy';
    await this.ensureTeacherStatus();
    this.renderStatusBanner('teacher-banner-buddy');
    await this.loadBuddySessions();
    if (typeof Router !== 'undefined' && Router.updateActiveNav) Router.updateActiveNav();
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

    const subjectsArr = Array.isArray(app.subjects) ? app.subjects : (typeof app.subjects === 'string' ? app.subjects.split(',').map(s => s.trim()).filter(Boolean) : ['Mathematics', 'Algebra', 'Calculus']);
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
            <strong>✅ Live Operations Active:</strong> Your tutor account has received final approval from the Administrator following your virtual interview. All operational functions are accessible: you can now conduct live virtual classes, accept student booking requests, assign coursework, and update your public teaching rates and availability schedule.
          </div>
          <div style="margin-top: 1rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <a href="#teacher-classes" class="btn btn-primary btn-sm">View Classes &amp; Launch Sessions →</a>
            <a href="#teacher-schedule" class="btn btn-secondary btn-sm">Configure Schedule Availability →</a>
            <a href="#teacher-profile" class="btn btn-secondary btn-sm">Configure Profile &amp; Rates →</a>
          </div>
        ` : `
          <div style="margin-top: 1.25rem; background: rgba(0,0,0,0.05); border-left: 3px solid ${accent}; padding: 0.75rem 1rem; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; font-size: 0.84rem; color: var(--text-primary); line-height: 1.55;">
            <strong>🔒 Operational Lock Notice:</strong> While your application is under review, you can freely view and explore everything within your account (Dashboard, Classes, Students, Schedule, and Aviora Buddy). Operational actions (conducting live sessions, assigning tasks, and accepting student bookings) remain locked until your application is approved following your virtual interview.
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
              <span style="font-size: 1.35rem;">📄</span>
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 0.78rem; font-weight: 700; color: #10B981; text-transform: uppercase;">1. Applicant Resume / CV</div>
                <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${app.resume_filename || 'Joshua_Garcia_Resume.pdf'}
                </div>
              </div>
              <span style="color: #10B981; font-weight: 700; font-size: 0.78rem;">✓ Submitted</span>
            </div>

            <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-md); padding: 0.85rem 1rem; display: flex; align-items: center; gap: 0.75rem;">
              <span style="font-size: 1.35rem;">📜</span>
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 0.78rem; font-weight: 700; color: #10B981; text-transform: uppercase;">2. Degree Diploma</div>
                <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${app.diploma_filename || 'UC_Berkeley_Diploma.pdf'}
                </div>
              </div>
              <span style="color: #10B981; font-weight: 700; font-size: 0.78rem;">✓ Submitted</span>
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
          You can view everything within your account right now. Check your dashboard metrics, see your scheduled timetable calendar, inspect classes, or explore Aviora Buddy cohorts.
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
          <button type="button" class="btn btn-outline-gold" onclick="window.location.hash='#teacher-buddy';">
            View Aviora Buddy
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
    } else if (currentHash === '#teacher-buddy' || currentHash === '#aviora-buddy') {
      await this.loadBuddyPage();
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
    else if (tabId === 'buddy') window.location.hash = '#teacher-buddy';
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
          <span class="status-pill ${r.status}">${r.status}</span>
        </td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 0.4rem; justify-content: flex-end; align-items: center;">
            ${!this.isApproved() ? `
              <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #D97706; font-size: 0.75rem; padding: 0.35rem 0.65rem; border-radius: 4px;" title="Operations locked while application is under review">🔒 Locked (Under Review)</span>
            ` : r.status === 'pending' ? `
              <button class="btn btn-primary btn-sm" onclick="Teacher.updateStatus(${r.id}, 'accepted', this)">Accept</button>
              <button class="btn btn-secondary btn-sm" onclick="Teacher.updateStatus(${r.id}, 'declined', this)">Decline</button>
            ` : r.status === 'accepted' ? `
              ${r.room_status === 'open' ? `
                <button class="btn btn-primary btn-sm" onclick="VirtualRoom.joinRoom(${r.id}, 'tutor')" style="background: #10B981; border-color: #10B981;">${Icons.video(14)} Enter Room (Live)</button>
              ` : `
                <button class="btn btn-primary btn-sm" onclick="VirtualRoom.openRoomAsTutor(${r.id})">${Icons.video(14)} Open Room</button>
              `}
              <button class="btn btn-outline-gold btn-sm" onclick="Teacher.updateStatus(${r.id}, 'completed', this)">Mark Done</button>
            ` : r.status === 'completed' ? `
              <span style="font-size: 0.8rem; color: #10B981; font-weight: 600;">✓ Completed</span>
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
    const effectiveStatus = (actionType === 'accept' || actionType === 'start_class' || actionType === 'reschedule')
      ? 'accepted'
      : (actionType === 'decline' || actionType === 'declined')
        ? 'declined'
        : (actionType === 'done' || actionType === 'completed')
          ? 'completed'
          : status;

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
        : actionType === 'reschedule'
          ? 'Rescheduling...'
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

      showToast(res.message || `Class updated (${actionType.toUpperCase()}).`, 'success');

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
      schedFields.style.display = (actionVal === 'decline' || actionVal === 'completed') ? 'none' : 'grid';
    }
    if (noteFieldWrap) {
      noteFieldWrap.style.display = (actionVal === 'decline' || actionVal === 'reschedule' || actionVal === 'accept') ? 'flex' : 'none';
    }
    if (noteInput) {
      if (actionVal === 'decline') {
        noteInput.placeholder = 'Reason for declining (e.g., Scheduling conflict)...';
      } else if (actionVal === 'reschedule') {
        noteInput.placeholder = 'Note for student regarding the rescheduled time...';
      } else {
        noteInput.placeholder = 'Optional note for student...';
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

    const action = actionEl ? actionEl.value : 'accept';
    const requested_date = dateEl ? dateEl.value.trim() : '';
    const requested_time = timeEl ? timeEl.value.trim() : '';
    const note = noteEl ? noteEl.value.trim() : undefined;

    if ((action === 'accept' || action === 'reschedule' || action === 'start_class') && (!requested_date || !requested_time)) {
      showToast('Please provide both a valid Date and Time for the class schedule.', 'warning');
      return;
    }

    const statusMap = {
      accept: 'accepted',
      start_class: 'accepted',
      reschedule: 'accepted',
      decline: 'declined',
      completed: 'completed'
    };

    await this.updateStatus(requestId, statusMap[action] || 'accepted', btnEl, {
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
      if (Array.isArray(data.subjects)) {
        this.subjects = data.subjects;
      } else if (Array.isArray(this.tutorProfile?.subjects)) {
        this.subjects = this.tutorProfile.subjects;
      } else if (Array.isArray(this.application?.subjects)) {
        this.subjects = this.application.subjects;
      }
      if (data.subject_rates && typeof data.subject_rates === 'object') {
        this.subjectRates = data.subject_rates;
      } else if (this.tutorProfile?.subject_rates && typeof this.tutorProfile.subject_rates === 'object') {
        this.subjectRates = this.tutorProfile.subject_rates;
      } else if (this.application?.subject_rates && typeof this.application.subject_rates === 'object') {
        this.subjectRates = this.application.subject_rates;
      }
      this.renderTeacherSubjects();
      this.renderClasses();
    } catch (err) {
      console.error('Failed to load teacher classes:', err);
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

  renderTeacherSubjects() {
    const grid = document.getElementById('teacher-subjects-rates-grid');
    const countBadge = document.getElementById('teacher-subjects-count-badge');
    const addBtn = document.getElementById('btn-teacher-add-subject');
    const newNameInp = document.getElementById('teacher-new-subject-name');
    const newRateInp = document.getElementById('teacher-new-subject-rate');
    if (!grid) return;

    const approved = this.isApproved();
    const subjectsList = Array.isArray(this.subjects) ? this.subjects : [];
    const ratesMap = this.subjectRates || {};
    const defaultRate = Number(this.tutorProfile?.hourly_rate || this.application?.hourly_rate || 45);

    if (countBadge) {
      countBadge.textContent = `${subjectsList.length} ${subjectsList.length === 1 ? 'Subject' : 'Subjects'}`;
    }

    if (addBtn) {
      addBtn.disabled = !approved;
      addBtn.title = approved ? 'Add new subject or specialization with its specific rate' : 'Operations locked while application is under review';
    }
    if (newNameInp) newNameInp.disabled = !approved;
    if (newRateInp) newRateInp.disabled = !approved;

    if (subjectsList.length === 0) {
      grid.innerHTML = `
        <div class="teacher-subject-empty">
          No subjects or specializations listed yet. Add your first subject and its hourly rate below.
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
              <span class="teacher-subject-icon">📚</span>
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

            ${subjectsList.length > 1 ? `
              <button
                type="button"
                class="btn btn-secondary btn-sm teacher-subject-remove-btn"
                data-subject="${safeSubj}"
                onclick="Teacher.removeSubjectFromBtn(this)"
                ${!approved ? 'disabled title="Locked while application is under review"' : 'title="Remove subject"'}
              >
                ✕
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  syncUpdatedSubjectsAcrossApp(res) {
    if (!res) return;
    if (Array.isArray(res.subjects)) this.subjects = res.subjects;
    if (res.subject_rates && typeof res.subject_rates === 'object') this.subjectRates = res.subject_rates;

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

    this.renderTeacherSubjects();

    // Refresh public Tutors cache so Student views on the same session also reflect immediately
    if (typeof Tutors !== 'undefined' && typeof Tutors.loadTutors === 'function') {
      Tutors.loadTutors().catch(() => { });
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
      const res = await API.updateTeacherSubjects({
        action: 'add',
        subject,
        rate
      });
      this.syncUpdatedSubjectsAcrossApp(res);
      if (nameInput) nameInput.value = '';
      await this.loadClasses();
      showToast(`"${subject}" ($${rate.toFixed(2)}/hr) saved and synced to Student & Admin portals!`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to add subject.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '+ Add Subject & Rate';
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
      return;
    }

    try {
      btnEl.disabled = true;
      btnEl.textContent = 'Saving...';
      const res = await API.updateTeacherSubjects({
        action: 'update',
        subject,
        rate
      });
      this.syncUpdatedSubjectsAcrossApp(res);
      await this.loadClasses();
      showToast(`Updated "${subject}" rate to $${rate.toFixed(2)}/hr (synced to Student & Admin).`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update subject rate.', 'error');
      btnEl.disabled = false;
      btnEl.textContent = 'Save Rate';
    }
  },

  async removeSubjectFromBtn(btnEl) {
    if (!this.isApproved()) {
      showToast('Operational Lock: Managing subjects and rates unlocks once your account is approved by the Administrator.', 'warning');
      return;
    }
    const subject = btnEl?.getAttribute('data-subject');
    if (!subject) return;

    try {
      btnEl.disabled = true;
      const res = await API.updateTeacherSubjects({
        action: 'remove',
        subject
      });
      this.syncUpdatedSubjectsAcrossApp(res);
      await this.loadClasses();
      showToast(`Removed "${subject}" from your active subjects.`, 'info');
    } catch (err) {
      showToast(err.message || 'Failed to remove subject.', 'error');
      btnEl.disabled = false;
    }
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
    } else if (this.classFilter === 'accepted') {
      filtered = filtered.filter(c => c.status === 'accepted' && c.room_status !== 'open');
    } else if (this.classFilter === 'pending') {
      filtered = filtered.filter(c => c.status === 'pending');
    } else if (this.classFilter === 'completed') {
      filtered = filtered.filter(c => c.status === 'completed');
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
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🎓</div>
          <h3 style="color: var(--text-primary); font-size: 1.25rem;">No Classes Found</h3>
          <p style="color: var(--text-secondary); font-size: 0.9rem; max-width: 480px; margin: 0.5rem auto 1.5rem;">
            ${q
          ? 'No classes match your current search or filter criteria.'
          : this.classFilter === 'open'
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
      const isDeclined = c.status === 'declined';
      const isEditing = !isCompleted && this.editingClassId === Number(c.id);
      const cleanDateVal = String(c.requested_date || '').split('T')[0];

      let actionTakenText = 'Pending — Select an action (Accept, Start Virtual Class, Reschedule, or Decline)';
      if (isCompleted) {
        actionTakenText = 'Done — Lesson Complete (No further actions available)';
      } else if (isLive) {
        actionTakenText = 'Start Virtual Class — Live Classroom Active';
      } else if (isAccepted) {
        if (c.tutor_response_note && c.tutor_response_note.toLowerCase().includes('rescheduled')) {
          actionTakenText = `Rescheduled — Confirmed for ${c.requested_date} • ${c.requested_time} (Student Notified)`;
        } else {
          actionTakenText = `Accepted — Schedule Added to Calendar • Student Notified (Waiting for Virtual Class Schedule)`;
        }
      } else if (isDeclined) {
        actionTakenText = `Declined — ${c.tutor_response_note || 'Scheduling conflict'}`;
      }

      return `
        <div class="teacher-class-card ${isLive ? 'is-live-room' : ''}" id="teacher-class-card-${c.id}">
          
          <!-- Card Header: Status & Room Badge -->
          <div class="class-card-header">
            <div class="class-card-header-left">
              <span class="badge-accent">${c.subject}</span>
              ${isLive ? `
                <span class="live-pulse-badge">
                  <span class="live-dot"></span> LIVE CLASSROOM OPEN
                </span>
              ` : ''}
            </div>
            <div class="class-card-header-right">
              <span class="status-pill ${c.status}">${isCompleted ? 'DONE' : c.status.toUpperCase()}</span>
            </div>
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
            <div class="class-action-indicator-badge status-${c.status}">
              <strong>Update:</strong> <span>${actionTakenText}</span>
            </div>
            ${(isAccepted || isCompleted) ? `
              <div class="class-calendar-sync-badge" onclick="Teacher.viewClassOnCalendar('${cleanDateVal}')" title="Open Schedule Calendar on ${cleanDateVal}">
                <span>📅 Added to Calendar (${c.requested_date} • ${c.requested_time})</span>
                <span class="class-calendar-sync-link">View Calendar →</span>
              </div>
            ` : isPending ? `
              <div class="class-calendar-pending-hint">
                <span>🗓️ Set schedule (${c.requested_date} • ${c.requested_time}) will be added to Calendar once accepted</span>
              </div>
            ` : ''}
            ${c.notes ? `
              <div class="class-card-notes">
                <strong>Student Focus:</strong> "${c.notes}"
              </div>
            ` : ''}
          </div>

          <!-- Inline Action & Schedule Update Drawer (Only available when NOT marked as Done) -->
          ${this.isApproved() && !isCompleted && isEditing ? `
            <div class="class-update-drawer">
              <div class="class-update-drawer-header">
                <strong>Select Update Action</strong>
                <span>Saves action, syncs Calendar & notifies student</span>
              </div>
              <div class="class-update-field">
                <label for="class-update-action-${c.id}">Action to Take</label>
                <select id="class-update-action-${c.id}" class="form-control" onchange="Teacher.onClassUpdateActionChange(${c.id}, this.value)">
                  <option value="accept" ${(isPending || isDeclined) ? 'selected' : ''}>Accept — Confirm Schedule on Calendar & Notify Student</option>
                  <option value="start_class" ${isAccepted ? 'selected' : ''}>Start Virtual Class — Open Live Classroom Session</option>
                  <option value="reschedule">Reschedule — Adjust Set Date & Time on Calendar</option>
                  <option value="decline">Decline — Decline Lesson Request</option>
                  <option value="completed">Done — Mark Lesson as Complete (Final)</option>
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

          <!-- Action Launch Pad -->
          <div class="class-card-actions">
            ${!this.isApproved() ? `
              <button type="button" class="btn btn-secondary btn-sm" style="flex: 1; opacity: 0.7; cursor: not-allowed;" disabled title="Classroom operations locked while application is under review">
                🔒 Operations Locked (Under Review)
              </button>
            ` : isCompleted ? `
              <div class="class-status-summary-pill is-completed-summary" style="flex: 1;" title="Lesson is complete. No further actions are available.">
                ✓ Class Session Completed (Done — No further actions available)
              </div>
            ` : isLive ? `
              <button type="button" class="btn btn-primary btn-sm btn-vroom-live-pulse" style="flex: 1; justify-content: center; background: #10B981; border-color: #10B981; font-weight: 700;" onclick="VirtualRoom.joinRoom(${c.id}, 'tutor')">
                🚀 Enter Live Classroom
              </button>
              <button type="button" class="btn btn-secondary btn-sm" title="Mark lesson as done (complete)" onclick="Teacher.updateStatus(${c.id}, 'completed', this, { action: 'completed' })">
                Done
              </button>
              <button type="button" class="btn btn-outline-gold btn-sm class-card-update-toggle-btn ${isEditing ? 'active' : ''}" title="Choose update action (Accept, Start Virtual Class, Reschedule, Decline, Done)" onclick="Teacher.toggleClassUpdatePanel(${c.id})">
                ${isEditing ? 'Close' : 'Update'}
              </button>
            ` : isAccepted ? `
              <button type="button" class="btn btn-primary btn-sm" style="flex: 1; justify-content: center; font-weight: 700;" onclick="Teacher.updateStatus(${c.id}, 'accepted', this, { action: 'start_class' })">
                🎥 Start Virtual Class
              </button>
              <button type="button" class="btn btn-secondary btn-sm" title="Mark lesson as done (complete)" onclick="Teacher.updateStatus(${c.id}, 'completed', this, { action: 'completed' })">
                Done
              </button>
              <button type="button" class="btn btn-outline-gold btn-sm class-card-update-toggle-btn ${isEditing ? 'active' : ''}" title="Choose update action (Start Virtual Class, Reschedule, Decline, Done)" onclick="Teacher.toggleClassUpdatePanel(${c.id})">
                ${isEditing ? 'Close' : 'Update'}
              </button>
            ` : isPending ? `
              <button type="button" class="btn btn-primary btn-sm" style="flex: 1; font-weight: 700;" onclick="Teacher.updateStatus(${c.id}, 'accepted', this, { action: 'accept' })">
                Accept
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="Teacher.updateStatus(${c.id}, 'declined', this, { action: 'decline' })">
                Decline
              </button>
              <button type="button" class="btn btn-outline-gold btn-sm class-card-update-toggle-btn ${isEditing ? 'active' : ''}" title="Choose update action (Accept, Start Virtual Class, Reschedule, Decline)" onclick="Teacher.toggleClassUpdatePanel(${c.id})">
                ${isEditing ? 'Close' : 'Update'}
              </button>
            ` : isDeclined ? `
              <div class="class-status-summary-pill is-declined-summary">
                ✕ Request Declined
              </div>
              <button type="button" class="btn btn-outline-gold btn-sm class-card-update-toggle-btn ${isEditing ? 'active' : ''}" title="Choose update action (Accept or Reschedule)" onclick="Teacher.toggleClassUpdatePanel(${c.id})">
                ${isEditing ? 'Close' : 'Update'}
              </button>
            ` : ''}
          </div>

        </div>
      `;
    }).join('');
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
            ${!this.isApproved() ? `
              <button type="button" class="btn btn-secondary btn-sm" style="flex: 1; opacity: 0.7; cursor: not-allowed;" disabled title="Coursework operations locked while application is under review">
                🔒 Operations Locked (Under Review)
              </button>
            ` : `
              <button type="button" class="btn btn-primary btn-sm" style="flex: 1; justify-content: center;" onclick="Teacher.openAssignTaskModal(${s.student_id})">
                + Assign Task
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="Teacher.openInstantClassModal(${s.student_id})" title="Launch Instant Class">
                🚀 Class
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
            <p class="task-desc" style="color: var(--text-secondary); font-size: 0.875rem; line-height: 1.5; margin: 0 0 0.85rem;">
              ${task.description}
            </p>

            ${(task.activity_link || task.attachment_url) ? `
              <div style="display: flex; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 1rem;">
                ${task.attachment_url ? `
                  <a href="${task.attachment_url}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-gold btn-sm" style="font-size: 0.78rem; padding: 0.3rem 0.7rem; text-decoration: none;">
                    📎 ${task.attachment_name || 'Download Activity File'}
                  </a>
                ` : ''}
                ${task.activity_link ? `
                  <a href="${task.activity_link}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="font-size: 0.78rem; padding: 0.3rem 0.7rem; text-decoration: none;">
                    🔗 Open Activity Link ↗
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
              <span style="font-size: 0.8rem; color: #D97706; font-weight: 600;">
                🔒 Coursework grading locked while application is under review.
              </span>
            ` : isSubmitted ? `
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
      fileBadge.textContent = `✓ Attached file: ${f.name}`;
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
      this.scheduleData = data || { appointments: [], occupiedSlots: [] };

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
    this.renderCalendar();
    this.renderDateSchedulePanel();
    this.renderUpcomingAppointmentsList();
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
    if (!this.selectedDate) {
      this.selectedDate = todayStr;
    }

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

    // Update top-right calendar header bar with selected date & "Not Available / Date Occupied" button
    const calHintBox = document.querySelector('#view-teacher-schedule .teacher-cal-hint');
    if (calHintBox && this.selectedDate) {
      const selDateObj = new Date(this.selectedDate + 'T00:00:00');
      const selDayName = dayNames[selDateObj.getDay()];
      const selShortDate = selDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const selIsOccupied = this.isDateMarkedUnavailable(this.selectedDate, selDayName);

      calHintBox.innerHTML = `
        <div class="teacher-cal-selected-bar">
          <span class="teacher-cal-selected-label">Selected: <strong>${selShortDate}</strong></span>
          ${selIsOccupied ? `
            <span class="cal-occupied-state-pill">🚫 Not Available / Date Occupied</span>
            <button type="button" class="btn btn-outline-gold btn-sm" onclick="Teacher.bulkSetDayAvailability('date_available')" style="padding: 0.32rem 0.75rem; font-size: 0.78rem; font-weight: 700;">
              🟢 Mark Date Available
            </button>
          ` : `
            <button type="button" class="btn btn-sm btn-mark-date-unavailable" onclick="Teacher.bulkSetDayAvailability('date_occupied')" title="Mark ${selShortDate} as Not Available / Date Occupied (reflected for students)">
              🚫 Not Available / Date Occupied
            </button>
          `}
        </div>
      `;
    }

    // Map appointments by YYYY-MM-DD
    const aptsByDate = {};
    appointments.forEach(apt => {
      if (!apt.requested_date) return;
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
      cellsHtml += `
        <div class="teacher-cal-day-cell is-other-month" onclick="Teacher.selectCalendarDate('${dateStr}')">
          <div class="teacher-cal-day-header">
            <span class="teacher-cal-day-num">${dayNum}</span>
          </div>
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
            ${hasPersonalNote || hasStudentNotes ? `<span class="cal-note-indicator-dot" title="Has Notes (Click to view)">📝</span>` : ''}
          </div>
          <div class="teacher-cal-compact-indicators">
            ${isDateOccupied ? `
              <span class="cal-mini-badge badge-occupied">🚫 Occupied</span>
            ` : dayApts.length > 0 ? `
              <span class="cal-mini-badge badge-class">
                ● ${dayApts.length === 1 ? (dayApts[0].requested_time || '1 class') : `${dayApts.length} classes`}
              </span>
            ` : (hasPersonalNote ? `
              <span class="cal-mini-badge badge-note">📝 Note</span>
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
      cellsHtml += `
        <div class="teacher-cal-day-cell is-other-month" onclick="Teacher.selectCalendarDate('${dateStr}')">
          <div class="teacher-cal-day-header">
            <span class="teacher-cal-day-num">${day}</span>
          </div>
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
      const now = new Date();
      this.selectedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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
    const dayApts = appointments.filter(a => (a.requested_date || '').startsWith(this.selectedDate));
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
      ? 'Not Available / Date Occupied (Blocked for Student Bookings)'
      : (savedMode === 'all_day'
          ? 'Available All Day (08:00 AM – 08:00 PM)'
          : (rawBlocks.length > 0 ? `Specific Time Slots (${rawBlocks.join(', ')})` : 'No active hours configured'));

    const savedDateNote = (this.dateNotes && this.dateNotes[this.selectedDate]) || '';

    panel.innerHTML = `
      <div class="date-schedule-header">
        <div>
          <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
            <h3 class="date-schedule-title">
              ${Icons.calendar(20)} Schedule for ${formattedDate}
            </h3>
            ${isDateOccupied ? `
              <span class="status-pill declined" style="font-size: 0.72rem; padding: 0.2rem 0.65rem;">🚫 Not Available / Date Occupied</span>
            ` : `
              <span class="status-pill accepted" style="font-size: 0.72rem; padding: 0.2rem 0.65rem;">🟢 Date Open for Student Bookings</span>
            `}
          </div>
          <p style="margin: 0.25rem 0 0; font-size: 0.85rem; color: var(--text-secondary);">
            Click any date on the calendar above to view notes &amp; schedule details for that date.
          </p>
        </div>
        <div class="date-schedule-actions">
          ${isDateOccupied ? `
            <button type="button" class="btn btn-primary btn-sm" onclick="Teacher.bulkSetDayAvailability('date_available')" style="background: #10B981; border-color: #10B981;">
              🟢 Mark Date Available
            </button>
          ` : `
            <button type="button" class="btn btn-sm btn-mark-date-unavailable" onclick="Teacher.bulkSetDayAvailability('date_occupied')">
              🚫 Not Available / Date Occupied
            </button>
            <button type="button" class="btn btn-outline-gold btn-sm" onclick="Teacher.bulkSetDayAvailability('date_available')">
              🟢 Set All Slots Available
            </button>
          `}
        </div>
      </div>

      <!-- Selected Date Notes Section (View & Edit Date Note) -->
      <div class="date-notes-section">
        <div class="date-notes-title-row">
          <h4 class="date-notes-title">
            <span>📝 Notes &amp; Session Focus for ${formattedDate}</span>
          </h4>
          <div style="display: flex; gap: 0.4rem; align-items: center;">
            ${savedDateNote && !this.isEditingDateNote ? `
              <button type="button" class="btn btn-outline-gold btn-sm" onclick="Teacher.toggleEditDateNote()" style="padding: 0.25rem 0.65rem; font-size: 0.76rem;">
                ✏️ Edit Note
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="Teacher.deleteDateNote('${this.selectedDate}')" style="padding: 0.25rem 0.65rem; font-size: 0.76rem; color: #EF4444;">
                ✕ Clear
              </button>
            ` : !this.isEditingDateNote ? `
              <button type="button" class="btn btn-outline-gold btn-sm" onclick="Teacher.toggleEditDateNote()" style="padding: 0.25rem 0.65rem; font-size: 0.76rem;">
                + Add Date Note
              </button>
            ` : ''}
          </div>
        </div>

        <div class="date-notes-grid">
          ${isDateOccupied ? `
            <div class="date-note-box occupied-note-box">
              <div class="date-note-header">
                <span class="date-note-badge" style="color: #DC2626;">🚫 Date Availability Status</span>
                <span class="status-pill declined" style="font-size: 0.68rem; padding: 0.1rem 0.45rem;">Occupied</span>
              </div>
              <div class="date-note-body" style="font-style: normal; color: #B91C1C;">
                This date is marked as <strong>Not Available / Date Occupied</strong>. Student bookings are disabled on this date.
              </div>
            </div>
          ` : ''}

          <!-- Personal Educator Note / Reminders -->
          <div class="date-note-box personal-note-box">
            <div class="date-note-header">
              <span class="date-note-badge" style="color: #2563EB;">📌 Personal Educator Note / Reminders</span>
            </div>
            ${this.isEditingDateNote ? `
              <div style="margin-top: 0.5rem;">
                <textarea id="teacher-date-note-input" class="form-control" rows="2" style="font-size: 0.85rem;" placeholder="Write a note, student prep reminders, or task checklist for ${formattedDate}...">${savedDateNote || ''}</textarea>
                <div style="display: flex; justify-content: flex-end; gap: 0.45rem; margin-top: 0.45rem;">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="Teacher.toggleEditDateNote()">Cancel</button>
                  <button type="button" class="btn btn-primary btn-sm" onclick="Teacher.saveDateNote('${this.selectedDate}')">Save Note</button>
                </div>
              </div>
            ` : savedDateNote ? `
              <div class="date-note-body" style="font-style: normal; color: var(--text-primary);">
                ${this.escapeHtml(savedDateNote)}
              </div>
            ` : `
              <div class="date-note-empty">
                No personal note added for this date. Click <strong>+ Add Date Note</strong> above to write reminders or lesson prep.
              </div>
            `}
          </div>

          <!-- Student Focus & Booking Notes for this Date -->
          ${dayApts.length > 0 ? dayApts.filter(a => a.notes).map(apt => `
            <div class="date-note-box student-focus-box">
              <div class="date-note-header">
                <span class="date-note-badge">🎓 Student Session Focus &amp; Note</span>
                <span class="date-note-author">${apt.student_name} (${apt.subject} • ${apt.requested_time})</span>
              </div>
              <div class="date-note-body">
                "${this.escapeHtml(apt.notes)}"
              </div>
              ${apt.tutor_response_note ? `
                <div class="date-note-response">
                  <strong>Your Note / Response:</strong> ${this.escapeHtml(apt.tutor_response_note)}
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
            <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">Auto-synced from student bookings</span>
          </div>

          ${dayApts.length === 0 ? `
            <div style="padding: 2rem 1.5rem; text-align: center; color: var(--text-secondary); background: rgba(0,0,0,0.02); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
              <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">${isDateOccupied ? '🚫' : '📅'}</div>
              <strong style="color: var(--text-primary); font-size: 0.95rem;">
                ${isDateOccupied ? 'Date Marked as Not Available / Date Occupied' : 'No Classes Booked on this Date'}
              </strong>
              <p style="margin: 0.25rem 0 0; font-size: 0.825rem;">
                ${isDateOccupied
                  ? 'Students see that this date is unavailable when they set up their schedule.'
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
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${apt.subject} • <span class="status-pill ${apt.status}" style="font-size: 0.68rem; padding: 0.1rem 0.45rem;">${(apt.status || 'accepted').toUpperCase()}</span></div>
                      </div>
                    </div>
                    <div class="appointment-meta">
                      <div>${Icons.clock(14)} ${apt.requested_time}</div>
                      <div>${apt.hourly_rate ? `$${apt.hourly_rate}/hr` : 'Booked'}</div>
                    </div>
                    <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
                      ${!this.isApproved() ? `
                        <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #D97706; font-size: 0.75rem; padding: 0.3rem 0.6rem; border-radius: 4px;" title="Operations locked while application is under review">🔒 Locked</span>
                      ` : apt.status === 'completed' ? `
                        <span style="font-size: 0.78rem; color: #10B981; font-weight: 700;">✓ Completed</span>
                      ` : apt.room_status === 'open' ? `
                        <button class="btn btn-primary btn-sm" onclick="VirtualRoom.joinRoom(${apt.id}, 'tutor')" style="background: #10B981; border-color: #10B981;">Enter (Live)</button>
                      ` : `
                        <button class="btn btn-secondary btn-sm" onclick="VirtualRoom.openRoomAsTutor(${apt.id})">Open Room</button>
                        <button class="btn btn-outline-gold btn-sm" onclick="Teacher.updateStatus(${apt.id}, 'completed', this)">Done</button>
                      `}
                    </div>
                  </div>
                  ${apt.notes ? `
                    <div class="date-note-box student-focus-box" style="margin-top: 0.65rem; padding: 0.6rem 0.8rem; font-size: 0.82rem;">
                      <div class="date-note-header" style="margin-bottom: 0.2rem;">
                        <span class="date-note-badge">📝 Student Focus / Note:</span>
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
            <span style="font-size: 0.75rem; color: var(--gold-400); font-weight: 600;">⚡ Reflected live for students</span>
          </div>

          <!-- Specify & Edit Available Hours Card -->
          <div class="time-slot-availability-editor">
            <div class="tsa-current-bar">
              <div>
                <div class="tsa-current-label">Current Availability Hours (${dayOfWeekName})</div>
                <div class="tsa-current-value ${isDateOccupied ? 'is-occupied' : ''}">${activeHoursDisplayText}</div>
              </div>
              <button type="button" class="btn btn-outline-gold btn-sm" onclick="Teacher.toggleHoursEditor()" style="padding: 0.3rem 0.7rem; font-size: 0.76rem; font-weight: 700;">
                ${this.showHoursEditor ? '✕ Close Editor' : '✏️ Edit Available Hours'}
              </button>
            </div>

            <div class="tsa-mode-pills-row">
              <button type="button" class="tsa-mode-pill ${!isDateOccupied && activeMode === 'all_day' ? 'active' : ''}" onclick="Teacher.selectAvailabilityMode('all_day')">
                🌞 Available All Day (08:00 AM – 08:00 PM)
              </button>
              <button type="button" class="tsa-mode-pill ${!isDateOccupied && activeMode === 'specific' ? 'active' : ''}" onclick="Teacher.selectAvailabilityMode('specific')">
                🎯 Only During Specific Time Slots
              </button>
            </div>

            <div id="teacher-hours-editor-body" class="tsa-editor-body" style="display: ${this.showHoursEditor || activeMode === 'specific' ? 'block' : 'none'};">
              ${activeMode === 'all_day' ? `
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
                  You are set to <strong>Available All Day (08:00 AM – 08:00 PM)</strong>. Students can book any open 50-minute session throughout the day.
                </div>
              ` : `
                <div class="tsa-time-range-grid">
                  <div>
                    <label class="tsa-field-label">Available From (Start Hour)</label>
                    <select id="tsa-start-hour" class="form-control tsa-select">
                      ${startHourOptions.join('')}
                    </select>
                  </div>
                  <div>
                    <label class="tsa-field-label">Available Until (End Hour)</label>
                    <select id="tsa-end-hour" class="form-control tsa-select">
                      ${endHourOptions.join('')}
                    </select>
                  </div>
                </div>
                <div style="font-size: 0.76rem; color: var(--text-secondary); margin-top: 0.45rem; margin-bottom: 0.75rem;">
                  💡 Tip: Set your start &amp; end hours above and click <strong>Save Available Hours</strong>, or click individual time slot pills below to toggle specific hours.
                </div>
              `}

              <div class="tsa-save-row">
                <div style="flex: 1; min-width: 170px;">
                  <label class="tsa-field-label">Apply Schedule Changes To</label>
                  <select id="tsa-apply-scope" class="form-control tsa-select">
                    <option value="weekday" selected>Every ${dayOfWeekName} (including ${this.selectedDate})</option>
                    <option value="date">Selected Date Only (${this.selectedDate})</option>
                    <option value="all_days">All Days of the Week (Mon–Sun)</option>
                  </select>
                </div>
                <button type="button" class="btn btn-primary btn-sm" onclick="Teacher.saveTimeSlotAvailabilityHours('${activeMode}')" style="height: 36px; padding: 0 1rem; font-weight: 700; white-space: nowrap;">
                  💾 Save Available Hours
                </button>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin: 0.85rem 0 0.55rem; font-size: 0.78rem; color: var(--text-secondary);">
            <span><strong>Hourly Time Slots</strong> (Click any slot to toggle Available / Occupied)</span>
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
                       title="${isDateOccupied ? 'Date marked Not Available / Occupied. Click to make this slot available.' : 'Unavailable / Occupied. Click to make Open & Available.'}">
                    <span class="slot-pill-time">${slot}</span>
                    <span class="slot-pill-status">${isDateOccupied ? '🚫 Date Occupied' : '🔒 Unavailable'}</span>
                  </div>
                `;
      }

      return `
                <div class="date-slot-pill is-available" 
                     onclick="Teacher.toggleOccupiedSlot('${dayOfWeekName}', '${slot}', 'Unavailable', '${this.selectedDate}')"
                     title="Available for student bookings. Click to mark Unavailable.">
                  <span class="slot-pill-time">${slot}</span>
                  <span class="slot-pill-status">🟢 Available</span>
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
    const appointments = this.scheduleData?.appointments || [];

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
            <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #D97706; font-size: 0.75rem; padding: 0.3rem 0.6rem; border-radius: 4px;" title="Operations locked while application is under review">🔒 Locked</span>
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
        statusBadge.textContent = isApproved ? '✓ Verified Educator' : (app.status === 'pending' ? '⏳ Application Under Review' : 'Accredited Educator');
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

      const subjectsList = Array.isArray(tp.subjects || app.subjects)
        ? (tp.subjects || app.subjects).join(', ')
        : (tp.subjects || app.subjects || '');
      if (subjInp) subjInp.value = subjectsList;

      if (bioInp) bioInp.value = tp.bio || app.bio || '';

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
    const submitBtn = e.target.querySelector('button[type="submit"]');

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';
      }

      const res = await API.updateProfile({
        name,
        phone,
        tutorData: { headline, hourly_rate, bio }
      });

      if (res && res.user && typeof Auth !== 'undefined') {
        Auth.currentUser = res.user;
        if (typeof Storage !== 'undefined') Storage.setUser(res.user);
      }

      showToast('Tutor public profile updated successfully!', 'success');
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
  }
};

window.Teacher = Teacher;
