/**
 * AVIORA EDUCATION - MAIN APPLICATION & ROUTER
 */

// Toast System
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconMap = {
    success: (window.AvioraIcons ? AvioraIcons.checkCircle(18) : '✓'),
    error: (window.AvioraIcons ? AvioraIcons.x(18) : '✕'),
    warning: (window.AvioraIcons ? AvioraIcons.shield(18) : '•'),
    info: (window.AvioraIcons ? AvioraIcons.sparkle(18) : '•')
  };

  toast.innerHTML = `
    <span class="toast-icon" style="display: inline-flex; align-items: center; justify-content: center;">${iconMap[type] || '•'}</span>
    <span class="toast-content">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Confirmation Dialog Modal
function showConfirm(title, message, onConfirm, options = {}) {
  const modal = document.getElementById('confirm-modal');
  const titleElem = document.getElementById('confirm-modal-title');
  const msgElem = document.getElementById('confirm-modal-msg');
  const confirmBtn = document.getElementById('confirm-modal-action-btn');
  const cancelBtn = document.getElementById('confirm-modal-cancel-btn');
  const closeBtn = document.getElementById('confirm-modal-close-btn');

  if (!modal) {
    if (confirm(message)) onConfirm();
    return;
  }

  if (titleElem) titleElem.textContent = title;
  if (msgElem) msgElem.textContent = message;

  const defaultConfirmText = (typeof I18n !== 'undefined' && I18n.t) ? I18n.t('common.confirm', 'Confirm') : 'Confirm';
  const defaultCancelText = (typeof I18n !== 'undefined' && I18n.t) ? I18n.t('common.cancel', 'Cancel') : 'Cancel';

  if (confirmBtn) {
    confirmBtn.textContent = options.confirmText || defaultConfirmText;
    if (options.confirmBtnClass) {
      confirmBtn.className = options.confirmBtnClass;
    } else {
      confirmBtn.className = 'btn btn-primary btn-sm';
    }
  }

  if (cancelBtn) {
    cancelBtn.textContent = options.cancelText || defaultCancelText;
  }

  const handleAction = () => {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    cleanup();
    onConfirm();
  };

  const handleCancel = () => {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    cleanup();
    if (options.onCancel) {
      options.onCancel();
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === modal) {
      handleCancel();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const cleanup = () => {
    confirmBtn?.removeEventListener('click', handleAction);
    cancelBtn?.removeEventListener('click', handleCancel);
    closeBtn?.removeEventListener('click', handleCancel);
    modal.removeEventListener('click', handleOverlayClick);
    document.removeEventListener('keydown', handleKeyDown);
  };

  confirmBtn?.addEventListener('click', handleAction);
  cancelBtn?.addEventListener('click', handleCancel);
  closeBtn?.addEventListener('click', handleCancel);
  modal.addEventListener('click', handleOverlayClick);
  document.addEventListener('keydown', handleKeyDown);

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Router
const Router = {
  routes: ['#home', '#about', '#tutors', '#aviora-buddy', '#buddy', '#aviora-buddy-studio', '#how-it-works', '#book-now', '#book-lesson', '#subscriptions', '#subscription', '#student-subscriptions', '#login', '#signup', '#student-portal', '#dashboard', '#student-lessons', '#student-tutors', '#student-history', '#student-schedule', '#student-profile', '#teacher-portal', '#teacher-classes', '#teacher-class', '#teacher-students', '#teacher-schedule', '#teacher-buddy', '#teacher-dashboard', '#teacher-profile', '#teacher-application', '#admin-portal', '#admin-profile'],

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  },

  updateActiveNav() {
    const hash = window.location.hash || '#home';
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      let isActive = (href === hash);
      if (!isActive && (href === '#student-portal' || href === '#dashboard') && ['#student-portal', '#dashboard', '#student-lessons', '#student-schedule', '#student-history', '#student-tutors'].includes(hash)) {
        isActive = true;
      }
      if (!isActive && (href === '#student-profile' || (href === '#profile' && (!Auth.currentUser || Auth.currentUser.role === 'student')) || (link.id === 'nav-user-profile-btn' && (!Auth.currentUser || Auth.currentUser.role === 'student'))) && (hash === '#student-profile' || (hash === '#profile' && (!Auth.currentUser || Auth.currentUser.role === 'student')))) {
        isActive = true;
      }
      if (!isActive && (href === '#teacher-profile' || (href === '#profile' && Auth.currentUser && (Auth.currentUser.role === 'teacher' || Auth.currentUser.role === 'tutor')) || (link.id === 'nav-user-profile-btn' && Auth.currentUser && (Auth.currentUser.role === 'teacher' || Auth.currentUser.role === 'tutor'))) && (hash === '#teacher-profile' || (hash === '#profile' && Auth.currentUser && (Auth.currentUser.role === 'teacher' || Auth.currentUser.role === 'tutor')))) {
        isActive = true;
      }
      if (!isActive && (href === '#admin-profile' || (href === '#profile' && Auth.currentUser && Auth.currentUser.role === 'admin') || (link.id === 'nav-user-profile-btn' && Auth.currentUser && Auth.currentUser.role === 'admin')) && (hash === '#admin-profile' || (hash === '#profile' && Auth.currentUser && Auth.currentUser.role === 'admin'))) {
        isActive = true;
      }
      if (!isActive && (href === '#teacher-portal' || href === '#teacher-dashboard' || link.id === 'nav-link-teacher-dashboard') && (hash === '#teacher-portal' || hash === '#teacher-dashboard')) {
        isActive = true;
      }
      if (!isActive && (href === '#teacher-classes' || href === '#teacher-class' || link.id === 'nav-link-teacher-classes') && (hash === '#teacher-classes' || hash === '#teacher-class')) {
        isActive = true;
      }
      if (!isActive && (href === '#teacher-students' || link.id === 'nav-link-teacher-students') && hash === '#teacher-students') {
        isActive = true;
      }
      if (!isActive && (href === '#teacher-schedule' || link.id === 'nav-link-teacher-schedule') && hash === '#teacher-schedule') {
        isActive = true;
      }
      if (!isActive && href === '#tutors' && (hash === '#tutors' || hash.startsWith('#tutor-profile') || hash.startsWith('#book-lesson') || hash.startsWith('#book-now'))) {
        isActive = true;
      }
      if (!isActive && (href === '#teacher-buddy' || href === '#aviora-buddy' || href === '#buddy' || link.id === 'nav-link-teacher-buddy') && (hash.startsWith('#aviora-buddy') || hash.startsWith('#buddy') || hash === '#teacher-buddy')) {
        isActive = true;
      }
      if (!isActive && (href === '#subscriptions' || href === '#subscription') && (hash === '#subscriptions' || hash === '#subscription' || hash === '#student-subscriptions')) {
        isActive = true;
      }
      link.classList.toggle('active', isActive);
    });
  },

  async handleRoute() {
    const hash = window.location.hash || '#home';

    // Route Guards for Portals & Lesson Booking
    if (hash === '#student-portal' || hash === '#book-lesson' || hash.startsWith('#book-lesson') || hash.startsWith('#student-')) {
      const user = Auth.currentUser;
      if (!user) {
        showToast('Please sign in to access the Student Portal.', 'info');
        window.location.hash = '#login';
        return;
      }
      if (user.role !== 'student') {
        showToast('You are currently signed in as ' + user.role + '. Please switch to a student account.', 'warning');
        return;
      }
    }

    if (hash === '#teacher-portal' || hash === '#teacher-dashboard' || hash.startsWith('#teacher-')) {
      const user = Auth.currentUser;
      if (!user) {
        showToast('Please sign in to access the Tutor Portal.', 'info');
        window.location.hash = '#login';
        return;
      }
      if (user.role !== 'teacher' && user.role !== 'tutor') {
        showToast('You are currently signed in as ' + user.role + '. Please switch to an educator account.', 'warning');
        return;
      }

      // If tutor has not submitted their credentials, resume, and diploma yet,
      // direct them to the application form first
      if (hash !== '#teacher-application') {
        if (typeof Teacher !== 'undefined') {
          if (!Teacher.application) {
            await Teacher.ensureTeacherStatus();
          }
          if (!Teacher.hasSubmittedApplication()) {
            showToast('Please complete and submit your application with your resume and diploma first.', 'info');
            window.location.hash = '#teacher-application';
            return;
          }
        }
      }
    }

    if (hash === '#admin-portal') {
      const user = Auth.currentUser;
      if (!user) {
        showToast('Administrator privileges required. Please log in with admin credentials.', 'warning');
        window.location.hash = '#login';
        return;
      }
      if (user.role !== 'admin') {
        showToast('Access denied. Administrator privileges required.', 'error');
        window.location.hash = '#login';
        return;
      }
    }

    // Hide all main page views
    document.querySelectorAll('.app-page-view').forEach(view => {
      view.style.display = 'none';
    });

    // Update Nav Active state
    this.updateActiveNav();

    // Show appropriate page view directly
    if (hash === '#about') {
      const view = document.getElementById('view-about');
      if (view) view.style.display = 'block';
      window.scrollTo(0, 0);
    } else if (hash === '#contact' || hash === '#about-contact') {
      const view = document.getElementById('view-about');
      if (view) view.style.display = 'block';
      const contactSec = document.getElementById('contact');
      if (contactSec) {
        contactSec.scrollIntoView({ behavior: 'instant', block: 'start' });
      } else {
        window.scrollTo(0, 0);
      }
    } else if (hash === '#how-it-works') {
      const view = document.getElementById('view-how-it-works');
      if (view) view.style.display = 'block';
      window.scrollTo(0, 0);
    } else if (hash === '#subscriptions' || hash === '#subscription' || hash === '#student-subscriptions') {
      const user = Auth.currentUser;
      if (user && user.role === 'student') {
        const studentSubView = document.getElementById('view-student-subscription');
        if (studentSubView) studentSubView.style.display = 'block';
        window.scrollTo(0, 0);
        if (typeof StudentSub !== 'undefined' && StudentSub.loadSubscriptionHub) {
          await StudentSub.loadSubscriptionHub();
        }
      } else {
        const view = document.getElementById('view-subscriptions');
        if (view) view.style.display = 'block';
        window.scrollTo(0, 0);
      }
    } else if (hash === '#book-now' || hash === '#book-lesson' || hash.startsWith('#book-lesson') || hash.startsWith('#book-now')) {
      const view = document.getElementById('view-book-lesson');
      if (view) view.style.display = 'block';
      window.scrollTo(0, 0);
      if (typeof BookLesson !== 'undefined' && BookLesson.loadPage) {
        await BookLesson.loadPage();
      }
    } else if (hash.startsWith('#auth-success')) {
      if (typeof Auth !== 'undefined' && Auth.handleOAuthCallbackHash) {
        await Auth.handleOAuthCallbackHash();
      }
      return;
    } else if (hash === '#login' || hash.startsWith('#login')) {
      const view = document.getElementById('view-login');
      if (view) view.style.display = 'block';
      window.scrollTo(0, 0);
      const queryStr = hash.includes('?') ? hash.split('?')[1] : '';
      const params = new URLSearchParams(queryStr);
      if (params.get('error')) {
        showToast(decodeURIComponent(params.get('error')), 'error');
      }
      if (typeof Auth !== 'undefined' && Auth.updateLinkedAccountBadges) {
        Auth.updateLinkedAccountBadges();
      }
    } else if (hash === '#signup') {
      const view = document.getElementById('view-signup');
      if (view) view.style.display = 'block';
      window.scrollTo(0, 0);
      if (typeof Auth !== 'undefined' && Auth.updateLinkedAccountBadges) {
        Auth.updateLinkedAccountBadges();
      }
    } else if (hash.startsWith('#tutor-profile')) {
      const view = document.getElementById('view-tutor-profile');
      if (view) view.style.display = 'block';
      window.scrollTo(0, 0);
      const queryStr = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
      const params = new URLSearchParams(queryStr);
      const tutorId = params.get('id');
      if (tutorId && typeof Tutors !== 'undefined') {
        await Tutors.loadFullProfilePage(tutorId);
      }
    } else if (hash === '#tutors') {
      const view = document.getElementById('view-tutors');
      if (view) view.style.display = 'block';
      window.scrollTo(0, 0);
      await Tutors.fetchTutors();
    } else if (hash === '#aviora-buddy' || hash.startsWith('#aviora-buddy') || hash === '#buddy' || hash.startsWith('#buddy') || hash === '#teacher-buddy') {
      const user = Auth.currentUser;
      if (user && (user.role === 'teacher' || user.role === 'tutor') && hash !== '#aviora-buddy-studio') {
        const view = document.getElementById('view-teacher-buddy');
        if (view) view.style.display = 'block';
        window.scrollTo(0, 0);
        await Teacher.loadBuddyPage();
      } else {
        const view = document.getElementById('view-aviora-buddy');
        if (view) view.style.display = 'block';
        window.scrollTo(0, 0);
        if (typeof AvioraBuddy !== 'undefined' && AvioraBuddy.init) {
          await AvioraBuddy.init();
        }
      }
    } else if (hash === '#student-profile' || (hash === '#profile' && (!Auth.currentUser || Auth.currentUser.role === 'student'))) {
      const user = Auth.currentUser;
      if (!user) {
        showToast('Please sign in to access your profile and settings.', 'info');
        window.location.hash = '#login';
        return;
      }
      if (user.role !== 'student') {
        if (user.role === 'admin') {
          window.location.hash = '#admin-profile';
        } else {
          showToast('You are currently signed in as ' + user.role + '. Redirecting to educator profile...', 'info');
          window.location.hash = '#teacher-profile';
        }
        return;
      }
      const view = document.getElementById('view-student-profile');
      if (view) view.style.display = 'block';
      window.scrollTo(0, 0);
      if (typeof Profile !== 'undefined' && Profile.loadProfilePage) {
        await Profile.loadProfilePage();
      }
    } else if (hash === '#teacher-profile' || (hash === '#profile' && Auth.currentUser && (Auth.currentUser.role === 'teacher' || Auth.currentUser.role === 'tutor'))) {
      const user = Auth.currentUser;
      if (!user) {
        showToast('Please sign in to access your profile and settings.', 'info');
        window.location.hash = '#login';
        return;
      }
      if (user.role !== 'teacher' && user.role !== 'tutor') {
        if (user.role === 'admin') {
          window.location.hash = '#admin-profile';
        } else {
          showToast('You are currently signed in as ' + user.role + '. Please switch to an educator account.', 'warning');
        }
        return;
      }
      const view = document.getElementById('view-teacher-profile');
      if (view) view.style.display = 'block';
      window.scrollTo(0, 0);
      if (typeof Teacher !== 'undefined' && Teacher.loadProfilePage) {
        await Teacher.loadProfilePage();
      }
    } else if (hash === '#admin-profile' || (hash === '#profile' && Auth.currentUser && Auth.currentUser.role === 'admin')) {
      const user = Auth.currentUser;
      if (!user) {
        showToast('Please sign in to access administrator profile and settings.', 'info');
        window.location.hash = '#login';
        return;
      }
      if (user.role !== 'admin') {
        showToast('Administrator clearance required.', 'warning');
        window.location.hash = (user.role === 'student') ? '#student-portal' : '#teacher-dashboard';
        return;
      }
      const view = document.getElementById('view-admin-profile');
      if (view) view.style.display = 'block';
      window.scrollTo(0, 0);
      if (typeof Admin !== 'undefined' && Admin.loadProfilePage) {
        await Admin.loadProfilePage();
      }
    } else if (hash === '#student-portal' || hash === '#student-lessons' || hash === '#student-tutors' || hash === '#student-history' || hash === '#student-schedule') {
      const view = document.getElementById('view-student-portal');
      if (view) view.style.display = 'block';
      window.scrollTo(0, 0);

      if (hash === '#student-lessons') {
        Student.activeTab = 'all';
        document.querySelectorAll('.student-filter-tab').forEach(t => t.classList.toggle('active', t.dataset.status === 'all'));
        await Student.loadDashboard();
        Student.scrollToSection('lessons');
      } else if (hash === '#student-tutors') {
        await Student.loadDashboard();
        Student.scrollToSection('tutors');
      } else if (hash === '#student-history') {
        Student.activeTab = 'completed';
        document.querySelectorAll('.student-filter-tab').forEach(t => t.classList.toggle('active', t.dataset.status === 'completed'));
        await Student.loadDashboard();
        Student.scrollToSection('history');
      } else if (hash === '#student-schedule') {
        await Student.loadDashboard();
        Student.scrollToSection('schedule');
      } else {
        await Student.loadDashboard();
      }
    } else if (hash === '#teacher-classes' || hash === '#teacher-class') {
      const view = document.getElementById('view-teacher-classes');
      if (view) view.style.display = 'block';
      window.scrollTo(0, 0);
      await Teacher.loadClassesPage();
    } else if (hash === '#teacher-students') {
      const view = document.getElementById('view-teacher-students');
      if (view) view.style.display = 'block';
      window.scrollTo(0, 0);
      await Teacher.loadStudentsPage();
    } else if (hash === '#teacher-schedule') {
      const view = document.getElementById('view-teacher-schedule');
      if (view) view.style.display = 'block';
      window.scrollTo(0, 0);
      await Teacher.loadSchedulePage();
    } else if (hash === '#teacher-buddy') {
      const view = document.getElementById('view-teacher-buddy');
      if (view) view.style.display = 'block';
      window.scrollTo(0, 0);
      await Teacher.loadBuddyPage();
    } else if (hash === '#teacher-application') {
      const view = document.getElementById('view-teacher-application');
      if (view) view.style.display = 'block';
      window.scrollTo(0, 0);
      await Teacher.loadApplicationPage();
    } else if (hash === '#teacher-dashboard' || hash === '#teacher-portal' || (hash === '#dashboard' && Auth.currentUser && (Auth.currentUser.role === 'teacher' || Auth.currentUser.role === 'tutor'))) {
      const view = document.getElementById('view-teacher-dashboard');
      if (view) view.style.display = 'block';
      window.scrollTo(0, 0);
      await Teacher.loadDashboardPage();
    } else if (hash.startsWith('#teacher-')) {
      const view = document.getElementById('view-teacher-dashboard');
      if (view) view.style.display = 'block';
      window.scrollTo(0, 0);
      await Teacher.loadDashboardPage();
    } else if (hash === '#admin-portal') {
      const view = document.getElementById('view-admin-portal');
      if (view) view.style.display = 'block';
      window.scrollTo(0, 0);
      await Admin.loadDashboardMetrics();
    } else {
      // Default to Home
      const view = document.getElementById('view-home');
      if (view) view.style.display = 'block';
      window.scrollTo(0, 0);
    }

    if (typeof I18n !== 'undefined' && I18n.applyLanguage) {
      I18n.applyLanguage(I18n.currentLanguage, false);
    }
  }
};

// Global App Initialization
document.addEventListener('DOMContentLoaded', async () => {
  // Sticky Navbar blur on scroll
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }
  });

  // Mobile Menu Toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');
  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
      navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
      navLinks.style.flexDirection = 'column';
      navLinks.style.position = 'absolute';
      navLinks.style.top = 'var(--header-height)';
      navLinks.style.left = '0';
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      navLinks.style.background = isDark ? '#000000' : 'rgba(250, 247, 242, 0.98)';
      navLinks.style.padding = '1.5rem';
      navLinks.style.borderBottom = isDark ? '1px solid rgba(216, 170, 60, 0.35)' : '1px solid rgba(198, 138, 40, 0.2)';
      navLinks.style.boxShadow = isDark ? '0 16px 36px rgba(0, 0, 0, 0.6)' : '0 16px 36px rgba(0, 0, 0, 0.08)';
    });
  }

  // How It Works Tabs (Student vs Tutor)
  const tabStudent = document.getElementById('tab-hiw-page-student') || document.getElementById('tab-how-student');
  const tabTutor = document.getElementById('tab-hiw-page-tutor') || document.getElementById('tab-how-tutor');
  const stepsStudent = document.getElementById('hiw-steps-student') || document.getElementById('steps-student');
  const stepsTutor = document.getElementById('hiw-steps-tutor') || document.getElementById('steps-tutor');

  if (tabStudent && tabTutor && stepsStudent && stepsTutor) {
    tabStudent.addEventListener('click', () => {
      tabStudent.classList.add('active');
      tabTutor.classList.remove('active');
      stepsStudent.style.display = 'grid';
      stepsTutor.style.display = 'none';
    });

    tabTutor.addEventListener('click', () => {
      tabTutor.classList.add('active');
      tabStudent.classList.remove('active');
      stepsStudent.style.display = 'none';
      stepsTutor.style.display = 'grid';
    });
  }

  // Fetch Public Stats
  try {
    const stats = await API.getStats();
    const statTutors = document.getElementById('stat-counter-tutors');
    const statStudents = document.getElementById('stat-counter-students');
    const statSessions = document.getElementById('stat-counter-sessions');
    const statRating = document.getElementById('stat-counter-rating');

    if (statTutors) statTutors.textContent = `${stats.totalTutors || 6}+`;
    if (statStudents) statStudents.textContent = `${stats.totalStudents || 35}+`;
    if (statSessions) statSessions.textContent = `${stats.totalSessions || 450}+`;
    if (statRating) statRating.innerHTML = `${stats.avgRating || '4.9'} <span style="color: #F59E0B; display: inline-flex; vertical-align: middle;">${Icons.star(16)}</span>`;
  } catch (e) {
    console.warn('Could not load stats counters:', e);
  }

  // Policy Modals (Terms & Privacy)
  document.querySelectorAll('.open-policy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const policyType = btn.dataset.policy;
      openPolicyModal(policyType);
    });
  });

  const policyCloseBtn = document.getElementById('policy-modal-close');
  if (policyCloseBtn) {
    policyCloseBtn.addEventListener('click', () => closePolicyModal());
  }

  const policyOverlay = document.getElementById('policy-modal');
  if (policyOverlay) {
    policyOverlay.addEventListener('click', (e) => {
      if (e.target === policyOverlay) closePolicyModal();
    });
  }

  // Newsletter form
  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = newsletterForm.querySelector('input');
      if (input && input.value) {
        showToast('Thank you for subscribing to Aviora Academic Insights!', 'success');
        input.value = '';
      }
    });
  }

  // About Page Send Inquiry form (routed strictly to Administrator Console)
  const aboutInquiryForm = document.getElementById('about-inquiry-form');
  if (aboutInquiryForm) {
    aboutInquiryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('inquiry-name')?.value.trim();
      const email = document.getElementById('inquiry-email')?.value.trim();
      const role = document.getElementById('inquiry-role')?.value;
      const subject = document.getElementById('inquiry-subject')?.value.trim();
      const message = document.getElementById('inquiry-message')?.value.trim();

      if (!name || !email || !message) {
        showToast('Please fill out your name, email, and message.', 'error');
        return;
      }

      const submitBtn = document.getElementById('about-inquiry-submit-btn') || aboutInquiryForm.querySelector('button[type="submit"]');
      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '<span>Send Inquiry</span><span>→</span>';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Sending Inquiry...</span>';
      }

      try {
        const res = await API.submitInquiry({ name, email, role, subject, message });
        showToast(res.message || `Thank you, ${name}! Your inquiry has been routed to the administrator.`, 'success');
        aboutInquiryForm.reset();
      } catch (err) {
        showToast(err.message || 'Failed to submit inquiry. Please try again.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      }
    });
  }

  // Initialize Modules
  await Auth.init();
  await Tutors.init();
  Student.init();
  Teacher.init();
  Admin.init();
  if (typeof BookLesson !== 'undefined' && BookLesson.setupEventListeners) {
    BookLesson.setupEventListeners();
  }

  // Initialize Real-Time Analytics & Student Work Showcase
  initRealTimeAnalytics();
  initStudentWorkShowcase();

  // Initialize Router
  Router.init();
});

// =========================================
// REAL-TIME ANALYTICS MODULE (LINE CHART)
// =========================================
const RealTimeAnalyticsChart = {
  currentMetric: 'views', // 'views' | 'sessions' | 'demand'
  timeSeriesData: [],
  isInitialized: false,

  init() {
    const chartContainer = document.getElementById('analytics-line-chart-container');
    if (!chartContainer) return;

    if (!this.isInitialized) {
      this.setupToggles();
      this.setupSubjectPills();
      this.isInitialized = true;
    }
  },

  setupToggles() {
    const toggleBtns = document.querySelectorAll('.analytics-toggle-btn');
    toggleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        toggleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentMetric = btn.dataset.metric || 'views';
        this.renderChart();
      });
    });
  },

  setupSubjectPills() {
    const pills = document.querySelectorAll('.legend-subject-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const subject = pill.dataset.subject;
        if (subject && window.Tutors) {
          window.location.hash = '#tutors';
          Tutors.activeSubjectFilter = subject;
          Tutors.applyFilters();
        }
      });
    });
  },

  updateData(analyticsData) {
    if (analyticsData && Array.isArray(analyticsData.timeSeries)) {
      this.timeSeriesData = analyticsData.timeSeries;
    } else if (this.timeSeriesData.length === 0) {
      this.generateFallbackData();
    }
    this.renderChart();
    this.updateKPIs(analyticsData);
  },

  generateFallbackData() {
    const now = Date.now();
    const data = [];
    for (let i = 9; i >= 0; i--) {
      const stepDate = new Date(now - i * 5 * 60 * 1000);
      const timeLabel = i === 0 ? 'Now' : stepDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const wave = Math.sin((stepDate.getTime() / 480000) * 1.8);
      data.push({
        time: timeLabel,
        views: Math.round(3150 + wave * 620),
        sessions: Math.round(18 + wave * 5),
        demand: Math.round(85 + wave * 9),
        topSubject: 'Calculus BC'
      });
    }
    this.timeSeriesData = data;
  },

  updateKPIs(data) {
    if (!data) return;
    const onlineEl = document.getElementById('kpi-online-students');
    const sessionsEl = document.getElementById('kpi-active-sessions');
    const hoursEl = document.getElementById('kpi-study-hours');
    const clockEl = document.getElementById('analytics-live-clock');

    if (onlineEl && data.activeStudentsOnline) onlineEl.textContent = data.activeStudentsOnline;
    if (sessionsEl && data.activeSessionsNow) sessionsEl.textContent = data.activeSessionsNow;
    if (hoursEl && data.totalStudyHoursThisMonth) hoursEl.textContent = data.totalStudyHoursThisMonth.toLocaleString() + '+';
    const topSubjectEl = document.getElementById('kpi-top-subject');
    if (topSubjectEl && data.topSubjects && data.topSubjects[0]) {
      topSubjectEl.textContent = data.topSubjects[0].name.replace('AP ', '').split('&')[0].trim();
    }
    if (clockEl) {
      clockEl.textContent = `Live • Updated ${data.lastUpdated || new Date().toLocaleTimeString()}`;
    }
  },

  renderChart() {
    const container = document.getElementById('analytics-line-chart-container');
    if (!container || !this.timeSeriesData || this.timeSeriesData.length === 0) return;

    const data = this.timeSeriesData;
    const metric = this.currentMetric;

    let values = [];
    let unitSuffix = '';

    if (metric === 'views') {
      values = data.map(d => d.views || 0);
      unitSuffix = ' views';
    } else if (metric === 'sessions') {
      values = data.map(d => d.sessions || 0);
      unitSuffix = ' sessions';
    } else { // demand
      values = data.map(d => d.demand || 0);
      unitSuffix = '%';
    }

    const rawMax = Math.max(...values, 10);
    const rawMin = Math.min(...values, 0);

    let maxVal, minVal;
    const stepCount = 4;
    if (metric === 'views') {
      const step = Math.ceil(rawMax / 4 / 200) * 200;
      maxVal = step * 4;
      minVal = 0;
    } else if (metric === 'sessions') {
      const step = Math.ceil(rawMax / 4 / 5) * 5;
      maxVal = step * 4;
      minVal = 0;
    } else { // demand
      maxVal = 100;
      minVal = 40;
    }

    const width = 880;
    const height = 260;
    const padLeft = 52;
    const padRight = 36;
    const padTop = 24;
    const padBottom = 38;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;
    const baseY = padTop + plotH;

    const points = data.map((d, i) => {
      const val = metric === 'views' ? d.views : (metric === 'sessions' ? d.sessions : d.demand);
      const x = padLeft + (i / (data.length - 1)) * plotW;
      const normalized = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal)));
      const y = baseY - normalized * plotH;
      return { x, y, val, time: d.time, topSubject: d.topSubject, i };
    });

    let curvePath = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      curvePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    const areaPath = `${curvePath} L ${points[points.length - 1].x.toFixed(1)} ${baseY} L ${points[0].x.toFixed(1)} ${baseY} Z`;

    let gridSvg = '';
    for (let i = 0; i <= stepCount; i++) {
      const stepVal = minVal + ((maxVal - minVal) / stepCount) * (stepCount - i);
      const yPos = padTop + (plotH / stepCount) * i;
      let label = '';
      if (metric === 'views') {
        label = stepVal >= 1000 ? `${(stepVal / 1000).toFixed(stepVal % 1000 === 0 ? 0 : 1)}k` : `${Math.round(stepVal)}`;
      } else if (metric === 'demand') {
        label = `${Math.round(stepVal)}%`;
      } else {
        label = `${Math.round(stepVal)}`;
      }

      gridSvg += `
        <line x1="${padLeft}" y1="${yPos.toFixed(1)}" x2="${(padLeft + plotW).toFixed(1)}" y2="${yPos.toFixed(1)}" stroke="rgba(198, 138, 40, 0.12)" stroke-dasharray="3 3" />
        <text x="${padLeft - 10}" y="${(yPos + 4).toFixed(1)}" font-size="10.5" font-family="var(--font-heading)" font-weight="600" text-anchor="end" fill="var(--gold-700)">${label}</text>
      `;
    }

    let xLabelsSvg = '';
    points.forEach((pt, idx) => {
      const isNow = idx === points.length - 1;
      xLabelsSvg += `
        <line x1="${pt.x.toFixed(1)}" y1="${baseY}" x2="${pt.x.toFixed(1)}" y2="${(baseY + 4).toFixed(1)}" stroke="rgba(198, 138, 40, 0.25)" />
        <text x="${pt.x.toFixed(1)}" y="${(baseY + 18).toFixed(1)}" font-size="10.5" font-family="var(--font-sans)" font-weight="${isNow ? '700' : '500'}" text-anchor="middle" fill="${isNow ? '#C68A28' : 'var(--text-muted)'}">${pt.time}</text>
      `;
    });

    let pointsSvg = '';
    points.forEach((pt, idx) => {
      const isLast = idx === points.length - 1;
      pointsSvg += `
        <g class="analytics-chart-hit" data-idx="${pt.i}" data-val="${pt.val}" data-time="${pt.time}">
          <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="14" fill="transparent" style="cursor: pointer;" />
          <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${isLast ? '5.5' : '4'}" fill="${isLast ? '#C68A28' : '#FFFFFF'}" stroke="#C68A28" stroke-width="2.5" class="chart-point-dot" />
          ${isLast ? `
            <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="12" fill="none" stroke="#C68A28" stroke-width="2" class="live-chart-pulse-ring" />
          ` : ''}
        </g>
      `;
    });

    container.innerHTML = `
      <svg class="analytics-line-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="realtimeLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#E5A93C" />
            <stop offset="50%" stop-color="#C68A28" />
            <stop offset="100%" stop-color="#9E6B15" />
          </linearGradient>
          <linearGradient id="realtimeAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#C68A28" stop-opacity="0.28" />
            <stop offset="60%" stop-color="#E5A93C" stop-opacity="0.08" />
            <stop offset="100%" stop-color="#C68A28" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        ${gridSvg}
        <path d="${areaPath}" fill="url(#realtimeAreaGrad)" />
        <path d="${curvePath}" fill="none" stroke="url(#realtimeLineGrad)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
        ${xLabelsSvg}
        ${pointsSvg}
      </svg>
    `;

    this.bindHoverTooltip(container, points, unitSuffix);
  },

  bindHoverTooltip(container, points, unitSuffix) {
    const tooltip = document.getElementById('analytics-chart-tooltip');
    if (!tooltip) return;

    const hitAreas = container.querySelectorAll('.analytics-chart-hit');
    hitAreas.forEach(hit => {
      hit.addEventListener('mouseenter', () => {
        const idx = parseInt(hit.dataset.idx, 10);
        const pt = points[idx];
        if (!pt) return;

        const metricLabel = this.currentMetric === 'views' ? 'Learning Traffic' : (this.currentMetric === 'sessions' ? 'Active Mentorships' : 'Curriculum Demand');
        const formattedVal = pt.val.toLocaleString() + unitSuffix;

        tooltip.innerHTML = `
          <div style="font-weight: 700; color: #F59E0B; margin-bottom: 2px;">${pt.time} • ${metricLabel}</div>
          <div style="font-size: 1.1rem; font-weight: 800; color: #FFFFFF;">${formattedVal}</div>
          ${pt.topSubject ? `<div style="font-size: 0.72rem; color: #E2E8F0; margin-top: 3px;">Top Subject: ${pt.topSubject}</div>` : ''}
        `;

        tooltip.style.opacity = '1';
        const rect = container.getBoundingClientRect();
        const hitRect = hit.getBoundingClientRect();
        const xOffset = hitRect.left - rect.left + hitRect.width / 2;
        const yOffset = hitRect.top - rect.top;

        tooltip.style.left = `${xOffset}px`;
        tooltip.style.top = `${yOffset - 12}px`;
        tooltip.style.transform = 'translate(-50%, -100%)';
      });

      hit.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
      });
    });
  }
};

async function initRealTimeAnalytics() {
  const chartContainer = document.getElementById('analytics-line-chart-container');
  if (!chartContainer) return;

  RealTimeAnalyticsChart.init();

  async function updateAnalytics() {
    try {
      const data = await API.getAnalytics();
      if (!data) return;
      RealTimeAnalyticsChart.updateData(data);
    } catch (e) {
      console.warn('Analytics polling error:', e);
    }
  }

  await updateAnalytics();
  // Real-time automatic update every 5 seconds
  setInterval(updateAnalytics, 5000);
}

// STUDENT WORK SHOWCASE MODULE
// =========================================
let allStudentWorks = [];

async function initStudentWorkShowcase() {
  const grid = document.getElementById('student-works-grid');
  if (!grid) return;

  try {
    allStudentWorks = await API.getStudentWork();
    renderStudentWorks('all');
  } catch (e) {
    console.warn('Error fetching student work:', e);
  }

  // Filter Buttons
  const filterBtns = document.querySelectorAll('.work-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter || 'all';
      renderStudentWorks(filter);
    });
  });

  // Modal setup
  const modal = document.getElementById('student-work-modal');
  const closeBtn = document.getElementById('student-work-modal-close');
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }
}

function renderStudentWorks(filter = 'all') {
  const grid = document.getElementById('student-works-grid');
  if (!grid) return;

  const filtered = filter === 'all' 
    ? allStudentWorks 
    : allStudentWorks.filter(w => w.category === filter);

  if (filtered.length === 0) {
    grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--charcoal-400);">No student creations found in this category.</p>`;
    return;
  }

  grid.innerHTML = filtered.map(work => `
    <div class="student-work-card" onclick="openStudentWorkModal('${work.id}')">
      <div class="work-image-container">
        <span class="work-category-badge ${work.category === 'drawing' ? 'badge-drawing' : 'badge-craft'}" style="display: inline-flex; align-items: center; gap: 0.35rem;">
          ${work.category === 'drawing' ? Icons.pencil(13) + ' Drawing' : Icons.palette(13) + ' Handmade Craft'}
        </span>
        <img src="${work.image}" alt="${work.title}" loading="lazy" />
      </div>

      <div class="work-card-content">
        <!-- Prominent Student Attribution Tag -->
        <div class="student-creator-tag">
          <span class="student-creator-avatar" style="font-weight: 700; font-size: 0.8rem; letter-spacing: 0.05em; display: inline-flex; align-items: center; justify-content: center;">${work.studentAvatar || Icons.graduationCap(16)}</span>
          <div class="student-creator-info">
            <span class="student-creator-name">Created by ${work.studentName}</span>
            <span class="student-creator-grade">${work.studentGrade}</span>
          </div>
        </div>

        <h3 class="work-title-h3">${work.title}</h3>
        <p class="work-materials-desc">${work.summary}</p>

        <div class="work-footer-info">
          <span class="work-mentor-tag">Mentored by <strong>${work.mentorName}</strong></span>
          <button class="work-inspect-btn">Inspect Piece →</button>
        </div>
      </div>
    </div>
  `).join('');
}

function openStudentWorkModal(workId) {
  const work = allStudentWorks.find(w => w.id === workId);
  if (!work) return;

  const modal = document.getElementById('student-work-modal');
  if (!modal) return;

  document.getElementById('sw-modal-category').textContent = work.categoryLabel || (work.category === 'drawing' ? 'Drawing' : 'Craft & Model');
  document.getElementById('sw-modal-award').textContent = work.award || 'Aviora Student Showcase';
  document.getElementById('sw-modal-img').src = work.image;
  document.getElementById('sw-modal-img').alt = work.title;
  const avatarEl = document.getElementById('sw-modal-avatar');
  if (avatarEl) {
    if (work.studentAvatar && work.studentAvatar.length <= 3) {
      avatarEl.textContent = work.studentAvatar;
    } else {
      avatarEl.innerHTML = Icons.palette(18);
    }
  }
  document.getElementById('sw-modal-student-name').textContent = `Created by ${work.studentName}`;
  document.getElementById('sw-modal-student-grade').textContent = `${work.studentGrade} • Student Contributor`;
  document.getElementById('sw-modal-title').textContent = work.title;
  document.getElementById('sw-modal-summary').textContent = work.summary;
  document.getElementById('sw-modal-reflection').textContent = work.reflection || '';
  document.getElementById('sw-modal-materials').textContent = work.materials || 'Bespoke mixed media';
  document.getElementById('sw-modal-mentor').textContent = `${work.mentorName} (${work.mentorSpecialty || 'Faculty Mentor'})`;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function openPolicyModal(type) {
  const modal = document.getElementById('policy-modal');
  const title = document.getElementById('policy-modal-title');
  const body = document.getElementById('policy-modal-content');

  if (type === 'privacy') {
    if (title) title.textContent = 'Aviora Education Privacy Policy';
    if (body) {
      body.innerHTML = `
        <h4 style="color: var(--charcoal-900); font-weight: 700; margin-bottom: 0.5rem;">Data Protection & Trust</h4>
        <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin-bottom: 1rem;">
          At Aviora Education, privacy and security are fundamental principles. We collect and process user data solely to facilitate academic matching, session scheduling, and secure communication between verified tutors and students.
        </p>
        <h4 style="color: var(--charcoal-900); font-weight: 700; margin-bottom: 0.5rem;">Credential Security</h4>
        <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin-bottom: 1rem;">
          All educator credentials, academic degrees, and verification documents are stored securely on encrypted servers. Only authorized academic directors have permission to audit educator background records.
        </p>
        <h4 style="color: var(--charcoal-900); font-weight: 700; margin-bottom: 0.5rem;">Cookies & Session Management</h4>
        <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">
          Authentication tokens are managed strictly via industry standard JWT protocols. We do not sell personal student or tutor information to third-party advertisers.
        </p>
      `;
    }
  } else {
    if (title) title.textContent = 'Aviora Education Terms of Service';
    if (body) {
      body.innerHTML = `
        <h4 style="color: var(--charcoal-900); font-weight: 700; margin-bottom: 0.5rem;">Academic Integrity</h4>
        <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin-bottom: 1rem;">
          Aviora Education provides conceptual tutoring, exam preparation, and mentoring. Tutors and students agree to adhere to strict institutional honor codes and academic integrity standards.
        </p>
        <h4 style="color: var(--charcoal-900); font-weight: 700; margin-bottom: 0.5rem;">Verification & Directory Rules</h4>
        <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin-bottom: 1rem;">
          Only educators whose academic credentials and background have been formally vetted and approved by our Academic Board will be listed publicly on the Aviora tutor directory.
        </p>
        <h4 style="color: var(--charcoal-900); font-weight: 700; margin-bottom: 0.5rem;">Cancellation & Rescheduling</h4>
        <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin-bottom: 1rem;">
          Students and tutors may reschedule or cancel upcoming tutoring sessions up to 3 hours prior to scheduled start times without penalty.
        </p>
        <h4 style="color: var(--charcoal-900); font-weight: 700; margin-bottom: 0.5rem;">Class Duration</h4>
        <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">
          All subjects are a maximum of 50 minutes of class per session to optimize student focus and academic retention.
        </p>
      `;
    }
  }

  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closePolicyModal() {
  const modal = document.getElementById('policy-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}
