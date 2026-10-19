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
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <span class="toast-icon">${iconMap[type] || 'ℹ'}</span>
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
function showConfirm(title, message, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  const titleElem = document.getElementById('confirm-modal-title');
  const msgElem = document.getElementById('confirm-modal-msg');
  const confirmBtn = document.getElementById('confirm-modal-action-btn');
  const cancelBtn = document.getElementById('confirm-modal-cancel-btn');

  if (!modal) {
    if (confirm(message)) onConfirm();
    return;
  }

  if (titleElem) titleElem.textContent = title;
  if (msgElem) msgElem.textContent = message;

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
  };

  const cleanup = () => {
    confirmBtn.removeEventListener('click', handleAction);
    cancelBtn.removeEventListener('click', handleCancel);
  };

  confirmBtn.addEventListener('click', handleAction);
  cancelBtn.addEventListener('click', handleCancel);

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Router
const Router = {
  routes: ['#home', '#tutors', '#how-it-works', '#student-portal', '#teacher-portal', '#admin-portal'],

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  },

  async handleRoute() {
    const hash = window.location.hash || '#home';

    // Route Guards for Portals
    if (hash === '#student-portal') {
      const user = Auth.currentUser;
      if (!user) {
        showToast('Please sign in to access the Student Portal.', 'info');
        Auth.openModal('login');
        window.location.hash = '#home';
        return;
      }
      if (user.role !== 'student') {
        showToast('You are currently signed in as ' + user.role + '. Please switch to a student account.', 'warning');
        return;
      }
    }

    if (hash === '#teacher-portal') {
      const user = Auth.currentUser;
      if (!user) {
        showToast('Please sign in to access the Teacher Portal.', 'info');
        Auth.openModal('login');
        window.location.hash = '#home';
        return;
      }
      if (user.role !== 'teacher') {
        showToast('You are currently signed in as ' + user.role + '. Please switch to a teacher account.', 'warning');
        return;
      }
    }

    if (hash === '#admin-portal') {
      const user = Auth.currentUser;
      if (!user) {
        showToast('Administrator privileges required. Please log in with admin credentials.', 'warning');
        Auth.openModal('login');
        window.location.hash = '#home';
        return;
      }
      if (user.role !== 'admin') {
        showToast('Access denied. Administrator privileges required.', 'error');
        window.location.hash = '#home';
        return;
      }
    }

    // Hide all main page views
    document.querySelectorAll('.app-page-view').forEach(view => {
      view.style.display = 'none';
    });

    // Update Nav Active state
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === hash);
    });

    // Show appropriate page view
    if (hash === '#tutors') {
      const view = document.getElementById('view-tutors');
      if (view) view.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await Tutors.fetchTutors();
    } else if (hash === '#student-portal') {
      const view = document.getElementById('view-student-portal');
      if (view) view.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await Student.loadDashboard();
    } else if (hash === '#teacher-portal') {
      const view = document.getElementById('view-teacher-portal');
      if (view) view.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await Teacher.loadTeacherView();
    } else if (hash === '#admin-portal') {
      const view = document.getElementById('view-admin-portal');
      if (view) view.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await Admin.loadDashboardMetrics();
    } else {
      // Default to Home
      const view = document.getElementById('view-home');
      if (view) view.style.display = 'block';

      if (hash === '#how-it-works') {
        document.getElementById('how-it-works-section')?.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
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
      navLinks.style.right = '0';
      navLinks.style.background = 'var(--charcoal-900)';
      navLinks.style.padding = '1.5rem';
      navLinks.style.borderBottom = '1px solid rgba(229, 169, 60, 0.2)';
    });
  }

  // How It Works Tabs (Student vs Tutor)
  const tabStudent = document.getElementById('tab-how-student');
  const tabTutor = document.getElementById('tab-how-tutor');
  const stepsStudent = document.getElementById('steps-student');
  const stepsTutor = document.getElementById('steps-tutor');

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
    if (statRating) statRating.textContent = `${stats.avgRating || '4.9'} ★`;
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

  // Initialize Modules
  await Auth.init();
  await Tutors.init();
  Student.init();
  Teacher.init();
  Admin.init();

  // Initialize Router
  Router.init();
});

function openPolicyModal(type) {
  const modal = document.getElementById('policy-modal');
  const title = document.getElementById('policy-modal-title');
  const body = document.getElementById('policy-modal-content');

  if (type === 'privacy') {
    if (title) title.textContent = 'Aviora Education Privacy Policy';
    if (body) {
      body.innerHTML = `
        <h4 style="color: var(--white); margin-bottom: 0.5rem;">Data Protection & Trust</h4>
        <p style="color: var(--charcoal-300); font-size: 0.9rem; line-height: 1.6; margin-bottom: 1rem;">
          At Aviora Education, privacy and security are fundamental principles. We collect and process user data solely to facilitate academic matching, session scheduling, and secure communication between verified tutors and students.
        </p>
        <h4 style="color: var(--white); margin-bottom: 0.5rem;">Credential Security</h4>
        <p style="color: var(--charcoal-300); font-size: 0.9rem; line-height: 1.6; margin-bottom: 1rem;">
          All educator credentials, academic degrees, and verification documents are stored securely on encrypted servers. Only authorized academic directors have permission to audit educator background records.
        </p>
        <h4 style="color: var(--white); margin-bottom: 0.5rem;">Cookies & Session Management</h4>
        <p style="color: var(--charcoal-300); font-size: 0.9rem; line-height: 1.6;">
          Authentication tokens are managed strictly via industry standard JWT protocols. We do not sell personal student or tutor information to third-party advertisers.
        </p>
      `;
    }
  } else {
    if (title) title.textContent = 'Aviora Education Terms of Service';
    if (body) {
      body.innerHTML = `
        <h4 style="color: var(--white); margin-bottom: 0.5rem;">Academic Integrity</h4>
        <p style="color: var(--charcoal-300); font-size: 0.9rem; line-height: 1.6; margin-bottom: 1rem;">
          Aviora Education provides conceptual tutoring, exam preparation, and mentoring. Tutors and students agree to adhere to strict institutional honor codes and academic integrity standards.
        </p>
        <h4 style="color: var(--white); margin-bottom: 0.5rem;">Verification & Directory Rules</h4>
        <p style="color: var(--charcoal-300); font-size: 0.9rem; line-height: 1.6; margin-bottom: 1rem;">
          Only educators whose academic credentials and background have been formally vetted and approved by our Academic Board will be listed publicly on the Aviora tutor directory.
        </p>
        <h4 style="color: var(--white); margin-bottom: 0.5rem;">Cancellation & Rescheduling</h4>
        <p style="color: var(--charcoal-300); font-size: 0.9rem; line-height: 1.6;">
          Students and tutors may reschedule or cancel upcoming tutoring sessions up to 12 hours prior to scheduled start times without penalty.
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
