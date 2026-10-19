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
  routes: ['#home', '#about', '#tutors', '#how-it-works', '#book-now', '#subscriptions', '#student-subscriptions', '#login', '#signup', '#student-portal', '#student-lessons', '#student-tutors', '#student-history', '#student-schedule', '#student-profile', '#teacher-portal', '#admin-portal'],

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  },

  updateActiveNav() {
    const hash = window.location.hash || '#home';
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === hash);
    });
  },

  async handleRoute() {
    const hash = window.location.hash || '#home';

    // Route Guards for Portals
    if (hash === '#student-portal' || hash.startsWith('#student-')) {
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

    if (hash === '#teacher-portal') {
      const user = Auth.currentUser;
      if (!user) {
        showToast('Please sign in to access the Teacher Portal.', 'info');
        window.location.hash = '#login';
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

    // Show appropriate page view
    if (hash === '#about') {
      const view = document.getElementById('view-about');
      if (view) view.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (hash === '#contact' || hash === '#about-contact') {
      const view = document.getElementById('view-about');
      if (view) view.style.display = 'block';
      setTimeout(() => {
        const contactSec = document.getElementById('contact');
        if (contactSec) contactSec.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else if (hash === '#how-it-works') {
      const view = document.getElementById('view-how-it-works');
      if (view) view.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (hash === '#subscriptions' || hash === '#student-subscriptions') {
      const user = Auth.currentUser;
      if (user && user.role === 'student') {
        const studentSubView = document.getElementById('view-student-subscription');
        if (studentSubView) studentSubView.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (typeof StudentSub !== 'undefined' && StudentSub.loadSubscriptionHub) {
          await StudentSub.loadSubscriptionHub();
        }
      } else {
        const view = document.getElementById('view-how-it-works');
        if (view) view.style.display = 'block';
        const subSection = document.getElementById('subscriptions-section');
        if (subSection) {
          setTimeout(() => {
            subSection.scrollIntoView({ behavior: 'smooth' });
          }, 80);
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } else if (hash === '#book-now') {
      const view = document.getElementById('view-tutors');
      if (view) view.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await Tutors.fetchTutors();
    } else if (hash === '#login') {
      const view = document.getElementById('view-login');
      if (view) view.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (hash === '#signup') {
      const view = document.getElementById('view-signup');
      if (view) view.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (hash.startsWith('#tutor-profile')) {
      const view = document.getElementById('view-tutor-profile');
      if (view) view.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const queryStr = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
      const params = new URLSearchParams(queryStr);
      const tutorId = params.get('id');
      if (tutorId && typeof Tutors !== 'undefined') {
        await Tutors.loadFullProfilePage(tutorId);
      }
    } else if (hash === '#tutors') {
      const view = document.getElementById('view-tutors');
      if (view) view.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await Tutors.fetchTutors();
    } else if (hash === '#student-portal' || hash === '#student-lessons' || hash === '#student-tutors' || hash === '#student-history' || hash === '#student-schedule' || hash === '#student-profile') {
      const view = document.getElementById('view-student-portal');
      if (view) view.style.display = 'block';

      if (hash === '#student-lessons') {
        Student.activeTab = 'all';
        document.querySelectorAll('.student-filter-tab').forEach(t => t.classList.toggle('active', t.dataset.status === 'all'));
        await Student.loadDashboard();
        setTimeout(() => {
          const el = document.getElementById('student-requests-container');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      } else if (hash === '#student-tutors') {
        await Student.loadDashboard();
        setTimeout(() => {
          const el = document.getElementById('student-my-tutors-section');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      } else if (hash === '#student-history') {
        Student.activeTab = 'completed';
        document.querySelectorAll('.student-filter-tab').forEach(t => t.classList.toggle('active', t.dataset.status === 'completed'));
        await Student.loadDashboard();
        setTimeout(() => {
          const el = document.getElementById('student-requests-container');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      } else if (hash === '#student-schedule') {
        Student.activeTab = 'accepted';
        document.querySelectorAll('.student-filter-tab').forEach(t => t.classList.toggle('active', t.dataset.status === 'accepted'));
        await Student.loadDashboard();
        setTimeout(() => {
          const el = document.getElementById('student-requests-container');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      } else if (hash === '#student-profile') {
        await Student.loadDashboard();
        setTimeout(() => {
          const el = document.getElementById('student-profile-section') || document.getElementById('student-profile-form');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        await Student.loadDashboard();
      }
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      navLinks.style.background = 'rgba(250, 247, 242, 0.98)';
      navLinks.style.padding = '1.5rem';
      navLinks.style.borderBottom = '1px solid rgba(198, 138, 40, 0.2)';
      navLinks.style.boxShadow = '0 16px 36px rgba(0, 0, 0, 0.08)';
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

  // About Page Inquiry form
  const aboutInquiryForm = document.getElementById('about-inquiry-form');
  if (aboutInquiryForm) {
    aboutInquiryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('inquiry-name');
      const name = nameInput ? nameInput.value.trim() : 'there';
      showToast(`Thank you, ${name}! Your inquiry has been sent to our academic advisory team. We will respond within 24 hours.`, 'success');
      aboutInquiryForm.reset();
    });
  }

  // Initialize Modules
  await Auth.init();
  await Tutors.init();
  Student.init();
  Teacher.init();
  Admin.init();

  // Initialize Real-Time Analytics & Student Work Showcase
  initRealTimeAnalytics();
  initStudentWorkShowcase();

  // Initialize Router
  Router.init();
});

// =========================================
// REAL-TIME ANALYTICS MODULE
// =========================================
async function initRealTimeAnalytics() {
  const onlineEl = document.getElementById('analytics-live-online');
  const sessionsEl = document.getElementById('analytics-active-sessions');
  const hoursEl = document.getElementById('analytics-study-hours');
  const subjectsContainer = document.getElementById('analytics-subjects-list');
  const contentContainer = document.getElementById('analytics-content-list');
  const liveFeedContainer = document.getElementById('analytics-live-feed');

  if (!subjectsContainer && !contentContainer) return;

  async function updateAnalytics() {
    try {
      const data = await API.getAnalytics();
      if (!data) return;

      if (onlineEl && data.activeStudentsOnline) {
        onlineEl.innerHTML = `${data.activeStudentsOnline} <span>online</span>`;
      }
      if (sessionsEl && data.activeSessionsNow) {
        sessionsEl.innerHTML = `${data.activeSessionsNow} <span>active</span>`;
      }
      if (hoursEl && data.totalStudyHoursThisMonth) {
        hoursEl.innerHTML = `${data.totalStudyHoursThisMonth.toLocaleString()}+ <span>hrs</span>`;
      }

      // Populate Subjects
      if (subjectsContainer && Array.isArray(data.topSubjects)) {
        subjectsContainer.innerHTML = data.topSubjects.map(sub => `
          <div class="subject-rank-row" onclick="window.location.hash='#tutors'; Tutors.activeSubjectFilter='${sub.category.split(' ')[0]}'; Tutors.applyFilters();" style="cursor: pointer;" title="Explore ${sub.name} tutors">
            <div class="subject-rank-num">0${sub.rank}</div>
            <div class="subject-info-col">
              <div class="subject-name-line">
                <span class="subject-title-text">${sub.name}</span>
                <span class="subject-cat-tag">${sub.category}</span>
              </div>
              <div class="subject-meter-wrap">
                <div class="subject-meter-fill" style="width: ${sub.demandIndex || 85}%;"></div>
              </div>
            </div>
            <div class="subject-traffic-col">
              <div class="subject-views-count">${sub.accessCount.toLocaleString()} views</div>
              <div class="subject-growth-tag">▲ ${sub.growth} ${sub.trend}</div>
            </div>
          </div>
        `).join('');
      }

      // Populate Content
      if (contentContainer && Array.isArray(data.topContent)) {
        contentContainer.innerHTML = data.topContent.map(res => `
          <div class="content-resource-item">
            <div class="content-resource-meta">
              <span class="content-resource-title">${res.title}</span>
              <span class="content-resource-sub">${res.subject} • ${res.format}</span>
            </div>
            <div class="content-resource-stat">${res.views.toLocaleString()} views</div>
          </div>
        `).join('');
      }

      // Populate Live Activity Feed
      if (liveFeedContainer && Array.isArray(data.liveActivityStream)) {
        liveFeedContainer.innerHTML = data.liveActivityStream.map(evt => `
          <div class="live-activity-event">
            <span>${evt.icon}</span>
            <span style="flex: 1;">${evt.action}</span>
            <span class="live-activity-time">${evt.time}</span>
          </div>
        `).join('');
      }
    } catch (e) {
      console.warn('Analytics polling error:', e);
    }
  }

  await updateAnalytics();
  // Poll periodically every 12 seconds for dynamic live feeling
  setInterval(updateAnalytics, 12000);
}

// =========================================
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
        <span class="work-category-badge ${work.category === 'drawing' ? 'badge-drawing' : 'badge-craft'}">
          ${work.category === 'drawing' ? '✏️ Drawing' : '🛠️ Handmade Craft'}
        </span>
        <img src="${work.image}" alt="${work.title}" loading="lazy" />
      </div>

      <div class="work-card-content">
        <!-- Prominent Student Attribution Tag -->
        <div class="student-creator-tag">
          <span class="student-creator-avatar">${work.studentAvatar || '🎓'}</span>
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
  document.getElementById('sw-modal-avatar').textContent = work.studentAvatar || '🎨';
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
        <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">
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
