/**
 * AVIORA EDUCATION - AUTHENTICATION & SESSION MANAGEMENT
 */

const Auth = {
  currentUser: null,

  async init() {
    this.setupEventListeners();
    await this.restoreSession();
  },

  async restoreSession() {
    const token = Storage.getToken();
    if (!token) {
      this.updateNavUI(null);
      return;
    }

    try {
      const data = await API.getMe();
      this.currentUser = data.user;
      Storage.setUser(data.user);
      this.updateNavUI(data.user, data.unreadNotifications);
    } catch (err) {
      console.warn('Session restore failed:', err.message);
      Storage.clearSession();
      this.currentUser = null;
      this.updateNavUI(null);
    }
  },

  setupEventListeners() {
    // Open Auth Modal
    document.querySelectorAll('.open-login-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal('login');
      });
    });

    document.querySelectorAll('.open-register-student-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal('register', 'student');
      });
    });

    document.querySelectorAll('.open-register-teacher-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal('register', 'teacher');
      });
    });

    // Close Auth Modal
    const closeBtn = document.getElementById('auth-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }

    const overlay = document.getElementById('auth-modal');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeModal();
      });
    }

    // Tab Switching in Modal
    const tabLogin = document.getElementById('tab-btn-login');
    const tabRegister = document.getElementById('tab-btn-register');

    if (tabLogin && tabRegister) {
      tabLogin.addEventListener('click', () => this.switchTab('login'));
      tabRegister.addEventListener('click', () => this.switchTab('register'));
    }

    // Role radio buttons in registration
    document.querySelectorAll('input[name="register_role"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.toggleRoleFields(e.target.value);
      });
    });

    // Login Form Submit
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Register Form Submit
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }

    // Demo Account Fill Buttons
    const demoStudentBtn = document.getElementById('demo-student-fill');
    if (demoStudentBtn) {
      demoStudentBtn.addEventListener('click', () => {
        this.fillLoginForm('student@aviora.edu', 'student123');
      });
    }

    const demoTeacherBtn = document.getElementById('demo-teacher-fill');
    if (demoTeacherBtn) {
      demoTeacherBtn.addEventListener('click', () => {
        this.fillLoginForm('elena.vance@aviora.edu', 'teacher123');
      });
    }

    const demoAdminBtn = document.getElementById('demo-admin-fill');
    if (demoAdminBtn) {
      demoAdminBtn.addEventListener('click', () => {
        this.fillLoginForm('admin@aviora.edu', 'admin123');
      });
    }

    // Top Demo Role Switcher Buttons
    document.querySelectorAll('.top-demo-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const role = btn.dataset.role;
        if (role === 'student') {
          await this.fastDemoLogin('student@aviora.edu', 'student123', '#student-portal');
        } else if (role === 'teacher') {
          await this.fastDemoLogin('elena.vance@aviora.edu', 'teacher123', '#teacher-portal');
        } else if (role === 'admin') {
          await this.fastDemoLogin('admin@aviora.edu', 'admin123', '#admin-portal');
        }
      });
    });

    // Logout
    const logoutBtn = document.getElementById('user-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
    }
  },

  openModal(tab = 'login', role = 'student') {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;

    this.switchTab(tab);
    if (tab === 'register') {
      const radio = document.querySelector(`input[name="register_role"][value="${role}"]`);
      if (radio) {
        radio.checked = true;
        this.toggleRoleFields(role);
      }
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  switchTab(tab) {
    const tabLogin = document.getElementById('tab-btn-login');
    const tabRegister = document.getElementById('tab-btn-register');
    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');

    if (tab === 'login') {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      loginSection.style.display = 'block';
      registerSection.style.display = 'none';
    } else {
      tabLogin.classList.remove('active');
      tabRegister.classList.add('active');
      loginSection.style.display = 'none';
      registerSection.style.display = 'block';
    }
  },

  toggleRoleFields(role) {
    const studentFields = document.getElementById('student-extra-fields');
    const teacherFields = document.getElementById('teacher-extra-fields');

    if (role === 'teacher') {
      if (studentFields) studentFields.style.display = 'none';
      if (teacherFields) teacherFields.style.display = 'block';
    } else {
      if (studentFields) studentFields.style.display = 'block';
      if (teacherFields) teacherFields.style.display = 'none';
    }
  },

  fillLoginForm(email, password) {
    this.switchTab('login');
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-password');
    if (emailInput && passInput) {
      emailInput.value = email;
      passInput.value = password;
      showToast(`Demo credentials applied for ${email.split('@')[0]}!`, 'info');
    }
  },

  async fastDemoLogin(email, password, redirectHash) {
    try {
      showToast('Logging in to demo account...', 'info');
      const res = await API.login({ email, password });
      Storage.setToken(res.token);
      Storage.setUser(res.user);
      this.currentUser = res.user;
      this.updateNavUI(res.user);
      showToast(`Welcome, ${res.user.name}! Switched to ${res.user.role.toUpperCase()} session.`, 'success');

      if (redirectHash) {
        window.location.hash = redirectHash;
        Router.handleRoute();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!email || !password) {
      showToast('Please enter both email and password.', 'error');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Authenticating...';

      const res = await API.login({ email, password });
      Storage.setToken(res.token);
      Storage.setUser(res.user);
      this.currentUser = res.user;

      this.closeModal();
      this.updateNavUI(res.user);
      showToast(`Welcome back, ${res.user.name}!`, 'success');

      // Smart redirect based on role
      if (res.user.role === 'admin') {
        window.location.hash = '#admin-portal';
      } else if (res.user.role === 'teacher') {
        window.location.hash = '#teacher-portal';
      } else {
        window.location.hash = '#student-portal';
      }
      Router.handleRoute();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In to Aviora';
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const phone = document.getElementById('reg-phone').value.trim();
    const roleRadio = document.querySelector('input[name="register_role"]:checked');
    const role = roleRadio ? roleRadio.value : 'student';

    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!name || !email || !password) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    const payload = { name, email, password, role, phone };

    if (role === 'student') {
      payload.grade_level = document.getElementById('reg-student-grade').value;
      payload.school = document.getElementById('reg-student-school').value.trim();
    } else if (role === 'teacher') {
      payload.headline = document.getElementById('reg-teacher-headline').value.trim();
      payload.subjects = document.getElementById('reg-teacher-subjects').value.trim();
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Account...';

      const res = await API.register(payload);
      Storage.setToken(res.token);
      Storage.setUser(res.user);
      this.currentUser = res.user;

      this.closeModal();
      this.updateNavUI(res.user);
      showToast(`Account created successfully! Welcome to Aviora, ${res.user.name}.`, 'success');

      if (role === 'teacher') {
        window.location.hash = '#teacher-portal';
      } else {
        window.location.hash = '#student-portal';
      }
      Router.handleRoute();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create My Account';
    }
  },

  logout() {
    Storage.clearSession();
    this.currentUser = null;
    this.updateNavUI(null);
    showToast('You have been securely logged out.', 'info');
    window.location.hash = '#home';
    Router.handleRoute();
  },

  updateNavUI(user, unreadCount = 0) {
    const guestActions = document.getElementById('nav-guest-actions');
    const userActions = document.getElementById('nav-user-actions');
    const portalNavLinks = document.getElementById('nav-portal-links');
    const userAvatar = document.getElementById('nav-user-avatar');
    const userName = document.getElementById('nav-user-name');
    const userRoleTag = document.getElementById('nav-user-role');
    const bellBadge = document.getElementById('nav-bell-badge');

    if (user) {
      if (guestActions) guestActions.style.display = 'none';
      if (userActions) userActions.style.display = 'flex';
      if (userAvatar) userAvatar.src = user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80';
      if (userName) userName.textContent = user.name;
      if (userRoleTag) userRoleTag.textContent = user.role.toUpperCase();

      if (bellBadge) {
        if (unreadCount > 0) {
          bellBadge.style.display = 'flex';
          bellBadge.textContent = unreadCount;
        } else {
          bellBadge.style.display = 'none';
        }
      }

      // Configure portal link in main navigation
      if (portalNavLinks) {
        let portalHtml = '';
        if (user.role === 'admin') {
          portalHtml = `
            <a href="#admin-portal" class="nav-link" id="nav-link-portal">
              <span class="badge-gold">Admin Console</span>
            </a>
          `;
        } else if (user.role === 'teacher') {
          portalHtml = `
            <a href="#teacher-portal" class="nav-link" id="nav-link-portal">
              <span class="badge-gold">Teacher Portal</span>
            </a>
          `;
        } else {
          portalHtml = `
            <a href="#student-portal" class="nav-link" id="nav-link-portal">
              <span class="badge-gold">My Dashboard</span>
            </a>
          `;
        }
        portalNavLinks.innerHTML = portalHtml;
      }
    } else {
      if (guestActions) guestActions.style.display = 'flex';
      if (userActions) userActions.style.display = 'none';
      if (portalNavLinks) portalNavLinks.innerHTML = '';
    }
  }
};
