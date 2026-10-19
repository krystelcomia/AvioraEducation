/**
 * AVIORA EDUCATION - AUTHENTICATION & SESSION MANAGEMENT
 * Includes Google / Facebook OAuth Integration & Strong Password Enforcement
 */

const PasswordValidator = {
  rules: [
    { id: 'length', text: '8+ characters', test: p => (p || '').length >= 8 },
    { id: 'uppercase', text: 'Uppercase letter (A-Z)', test: p => /[A-Z]/.test(p || '') },
    { id: 'lowercase', text: 'Lowercase letter (a-z)', test: p => /[a-z]/.test(p || '') },
    { id: 'number', text: 'Number (0-9)', test: p => /[0-9]/.test(p || '') },
    { id: 'special', text: 'Special symbol (!@#$%^&*)', test: p => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p || '') }
  ],

  evaluate(password) {
    const val = password || '';
    let score = 0;
    const results = {};

    this.rules.forEach(rule => {
      const passed = rule.test(val);
      results[rule.id] = passed;
      if (passed) score++;
    });

    let strength = 'none';
    let label = 'Enter password';
    let color = 'var(--charcoal-400)';
    let width = '0%';

    if (!val) {
      label = 'Enter a strong password';
    } else if (score <= 2) {
      strength = 'weak';
      label = 'Weak (Needs uppercase, numbers, symbols)';
      color = '#EF4444';
      width = '25%';
    } else if (score === 3 || score === 4) {
      strength = 'good';
      label = 'Moderate (Almost strong)';
      color = '#F59E0B';
      width = '70%';
    } else if (score === 5) {
      strength = 'strong';
      label = 'Strong (Excellent security!)';
      color = '#10B981';
      width = '100%';
    }

    return { score, results, strength, label, color, width, isStrong: score === 5 };
  },

  updateUI(prefix, password) {
    const evalResult = this.evaluate(password);

    const bar = document.getElementById(`${prefix}-password-meter-bar`);
    const label = document.getElementById(`${prefix}-password-meter-label`);

    if (bar) {
      bar.style.width = evalResult.width;
      bar.style.backgroundColor = evalResult.color;
    }

    if (label) {
      label.textContent = evalResult.label;
      label.style.color = evalResult.color;
    }

    // Update rule items
    this.rules.forEach(rule => {
      const item = document.getElementById(`${prefix}-rule-${rule.id}`);
      if (item) {
        const passed = evalResult.results[rule.id];
        item.classList.toggle('valid', passed);
        const icon = item.querySelector('.rule-icon');
        if (icon) {
          icon.textContent = passed ? '✓' : '○';
        }
      }
    });

    return evalResult;
  }
};

const Auth = {
  currentUser: null,

  async init() {
    this.setupEventListeners();
    this.setupPasswordStrengthCheckers();
    this.setupSocialAuth();
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
    // Open Auth Modal / Navigate to Login
    document.querySelectorAll('.open-login-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // If on page view or user prefers modal
        if (btn.tagName.toLowerCase() === 'a' && btn.getAttribute('href') === '#login') {
          // let normal router handle it
          return;
        }
        e.preventDefault();
        window.location.hash = '#login';
      });
    });

    document.querySelectorAll('.open-register-student-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = '#login';
        this.switchPageTab('register');
      });
    });

    document.querySelectorAll('.open-register-teacher-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = '#login';
        this.switchPageTab('register');
        const teacherRadio = document.querySelector('input[name="page_register_role"][value="teacher"]');
        if (teacherRadio) {
          teacherRadio.checked = true;
          this.togglePageRoleFields('teacher');
        }
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

    // Modal Tab Switching
    const tabLogin = document.getElementById('tab-btn-login');
    const tabRegister = document.getElementById('tab-btn-register');
    if (tabLogin && tabRegister) {
      tabLogin.addEventListener('click', () => this.switchTab('login'));
      tabRegister.addEventListener('click', () => this.switchTab('register'));
    }

    // Page Tab Switching
    const pageTabLogin = document.getElementById('page-tab-login');
    const pageTabRegister = document.getElementById('page-tab-register');
    if (pageTabLogin && pageTabRegister) {
      pageTabLogin.addEventListener('click', () => this.switchPageTab('login'));
      pageTabRegister.addEventListener('click', () => this.switchPageTab('register'));
    }

    // Role radio buttons in Modal registration
    document.querySelectorAll('input[name="register_role"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.toggleRoleFields(e.target.value);
      });
    });

    // Role radio buttons in Page registration
    document.querySelectorAll('input[name="page_register_role"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.togglePageRoleFields(e.target.value);
      });
    });

    // Modal Forms Submit
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e, 'modal'));
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e, 'modal'));
    }

    // Dedicated Page Forms Submit
    const pageLoginForm = document.getElementById('page-login-form');
    if (pageLoginForm) {
      pageLoginForm.addEventListener('submit', (e) => this.handleLogin(e, 'page'));
    }

    const pageRegisterForm = document.getElementById('page-register-form');
    if (pageRegisterForm) {
      pageRegisterForm.addEventListener('submit', (e) => this.handleRegister(e, 'page'));
    }

    // Modal Demo Account Fill Buttons
    document.getElementById('demo-student-fill')?.addEventListener('click', () => {
      this.fillLoginForm('student@aviora.edu', 'student123', 'modal');
    });
    document.getElementById('demo-teacher-fill')?.addEventListener('click', () => {
      this.fillLoginForm('elena.vance@aviora.edu', 'teacher123', 'modal');
    });
    document.getElementById('demo-admin-fill')?.addEventListener('click', () => {
      this.fillLoginForm('admin@aviora.edu', 'admin123', 'modal');
    });

    // Page Demo Account Fill Buttons
    document.getElementById('page-demo-student')?.addEventListener('click', () => {
      this.fillLoginForm('student@aviora.edu', 'student123', 'page');
    });
    document.getElementById('page-demo-teacher')?.addEventListener('click', () => {
      this.fillLoginForm('elena.vance@aviora.edu', 'teacher123', 'page');
    });
    document.getElementById('page-demo-admin')?.addEventListener('click', () => {
      this.fillLoginForm('admin@aviora.edu', 'admin123', 'page');
    });

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

    // Password Show/Hide Toggles
    document.querySelectorAll('.password-toggle-eye').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        if (input) {
          const isPassword = input.type === 'password';
          input.type = isPassword ? 'text' : 'password';
          btn.textContent = isPassword ? '🙈' : '👁️';
        }
      });
    });
  },

  setupPasswordStrengthCheckers() {
    // Page registration password input
    const pagePasswordInput = document.getElementById('page-reg-password');
    const pageConfirmInput = document.getElementById('page-reg-confirm');
    const pageMatchMsg = document.getElementById('page-password-match-msg');

    if (pagePasswordInput) {
      pagePasswordInput.addEventListener('input', () => {
        PasswordValidator.updateUI('page', pagePasswordInput.value);
        this.checkPasswordMatch(pagePasswordInput, pageConfirmInput, pageMatchMsg);
      });
    }
    if (pageConfirmInput) {
      pageConfirmInput.addEventListener('input', () => {
        this.checkPasswordMatch(pagePasswordInput, pageConfirmInput, pageMatchMsg);
      });
    }

    // Modal registration password input
    const modalPasswordInput = document.getElementById('reg-password');
    const modalConfirmInput = document.getElementById('reg-confirm');
    const modalMatchMsg = document.getElementById('modal-password-match-msg');

    if (modalPasswordInput) {
      modalPasswordInput.addEventListener('input', () => {
        PasswordValidator.updateUI('modal', modalPasswordInput.value);
        this.checkPasswordMatch(modalPasswordInput, modalConfirmInput, modalMatchMsg);
      });
    }
    if (modalConfirmInput) {
      modalConfirmInput.addEventListener('input', () => {
        this.checkPasswordMatch(modalPasswordInput, modalConfirmInput, modalMatchMsg);
      });
    }
  },

  checkPasswordMatch(passEl, confirmEl, msgEl) {
    if (!passEl || !confirmEl || !msgEl) return;
    const pass = passEl.value;
    const confirm = confirmEl.value;

    if (!confirm) {
      msgEl.style.display = 'none';
      return;
    }

    msgEl.style.display = 'block';
    if (pass === confirm) {
      msgEl.textContent = '✓ Passwords match';
      msgEl.style.color = '#10B981';
    } else {
      msgEl.textContent = '✗ Passwords do not match';
      msgEl.style.color = '#EF4444';
    }
  },

  setupSocialAuth() {
    // Google Auth Triggers
    const pageGoogleBtn = document.getElementById('page-google-auth-btn');
    const modalGoogleBtn = document.getElementById('modal-google-auth-btn');
    if (pageGoogleBtn) pageGoogleBtn.addEventListener('click', () => this.openOAuthChoice('google'));
    if (modalGoogleBtn) modalGoogleBtn.addEventListener('click', () => this.openOAuthChoice('google'));

    // Facebook Auth Triggers
    const pageFbBtn = document.getElementById('page-facebook-auth-btn');
    const modalFbBtn = document.getElementById('modal-facebook-auth-btn');
    if (pageFbBtn) pageFbBtn.addEventListener('click', () => this.openOAuthChoice('facebook'));
    if (modalFbBtn) modalFbBtn.addEventListener('click', () => this.openOAuthChoice('facebook'));

    // OAuth Modal Close
    const closeBtn = document.getElementById('oauth-modal-close');
    const oauthModal = document.getElementById('oauth-provider-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeOAuthChoice());
    if (oauthModal) {
      oauthModal.addEventListener('click', (e) => {
        if (e.target === oauthModal) this.closeOAuthChoice();
      });
    }

    // Custom OAuth account submit
    const customSubmit = document.getElementById('oauth-custom-submit');
    if (customSubmit) {
      customSubmit.addEventListener('click', () => {
        const name = document.getElementById('oauth-custom-name').value.trim();
        const email = document.getElementById('oauth-custom-email').value.trim();
        const provider = oauthModal?.dataset?.provider || 'google';

        if (!email) {
          showToast('Please enter a valid email address.', 'error');
          return;
        }

        this.loginWithOAuth(provider, {
          name: name || `${provider === 'google' ? 'Google' : 'Facebook'} Scholar`,
          email,
          role: 'student'
        });
      });
    }
  },

  openOAuthChoice(provider) {
    const modal = document.getElementById('oauth-provider-modal');
    const heading = document.getElementById('oauth-modal-heading');
    const sub = document.getElementById('oauth-modal-sub');
    const icon = document.getElementById('oauth-provider-icon');
    const list = document.getElementById('oauth-accounts-list');

    if (!modal) return;
    modal.dataset.provider = provider;

    const isGoogle = provider === 'google';

    if (heading) {
      heading.textContent = isGoogle ? 'Sign In with Google' : 'Sign In with Facebook';
    }
    if (sub) {
      sub.textContent = isGoogle
        ? 'Choose a Google account to continue to Aviora Education:'
        : 'Choose a Facebook account to continue to Aviora Education:';
    }
    if (icon) {
      icon.innerHTML = isGoogle
        ? `<svg width="22" height="22" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`
        : `<svg width="22" height="22" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;
    }

    const accounts = isGoogle ? [
      {
        name: 'Krystel Comia',
        email: 'krystel.comia@gmail.com',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
        badge: 'Google Account'
      },
      {
        name: 'Marcus Chen',
        email: 'marcus.chen.mit@gmail.com',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
        badge: 'Google Workspace'
      }
    ] : [
      {
        name: 'Krystel Comia',
        email: 'krystel.comia.fb@facebook.com',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
        badge: 'Facebook Profile'
      },
      {
        name: 'Sophia Lin',
        email: 'sophia.lin.arts@facebook.com',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=80',
        badge: 'Facebook Profile'
      }
    ];

    if (list) {
      list.innerHTML = accounts.map(acc => `
        <div class="oauth-account-item" onclick="Auth.loginWithOAuth('${provider}', { name: '${acc.name}', email: '${acc.email}', picture: '${acc.avatar}', role: 'student' })">
          <img src="${acc.avatar}" alt="${acc.name}" class="oauth-account-avatar" />
          <div style="flex: 1;">
            <div class="oauth-account-name">${acc.name}</div>
            <div class="oauth-account-email">${acc.email}</div>
          </div>
          <span style="font-size: 0.72rem; color: var(--gold-light);">${acc.badge}</span>
        </div>
      `).join('');
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeOAuthChoice() {
    const modal = document.getElementById('oauth-provider-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  async loginWithOAuth(provider, profile) {
    try {
      this.closeOAuthChoice();
      this.closeModal();
      showToast(`Connecting with ${provider === 'google' ? 'Google' : 'Facebook'}...`, 'info');

      const res = await API.oauthLogin({
        provider,
        profile
      });

      Storage.setToken(res.token);
      Storage.setUser(res.user);
      this.currentUser = res.user;

      this.updateNavUI(res.user);
      showToast(`Welcome, ${res.user.name}! Connected securely via ${provider === 'google' ? 'Google' : 'Facebook'}.`, 'success');

      if (res.user.role === 'teacher') {
        window.location.hash = '#teacher-portal';
      } else if (res.user.role === 'admin') {
        window.location.hash = '#admin-portal';
      } else {
        window.location.hash = '#student-portal';
      }
      Router.handleRoute();
    } catch (err) {
      showToast(err.message || 'Social authentication failed.', 'error');
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
      tabLogin?.classList.add('active');
      tabRegister?.classList.remove('active');
      if (loginSection) loginSection.style.display = 'block';
      if (registerSection) registerSection.style.display = 'none';
    } else {
      tabLogin?.classList.remove('active');
      tabRegister?.classList.add('active');
      if (loginSection) loginSection.style.display = 'none';
      if (registerSection) registerSection.style.display = 'block';
    }
  },

  switchPageTab(tab) {
    const tabLogin = document.getElementById('page-tab-login');
    const tabRegister = document.getElementById('page-tab-register');
    const loginSection = document.getElementById('page-login-section');
    const registerSection = document.getElementById('page-register-section');
    const heading = document.getElementById('page-auth-heading');
    const subheading = document.getElementById('page-auth-subheading');

    if (tab === 'login') {
      tabLogin?.classList.add('active');
      tabRegister?.classList.remove('active');
      if (loginSection) loginSection.style.display = 'block';
      if (registerSection) registerSection.style.display = 'none';
      if (heading) heading.textContent = 'Welcome to Aviora';
      if (subheading) subheading.textContent = 'Access your personalized academic mentorship portal';
    } else {
      tabLogin?.classList.remove('active');
      tabRegister?.classList.add('active');
      if (loginSection) loginSection.style.display = 'none';
      if (registerSection) registerSection.style.display = 'block';
      if (heading) heading.textContent = 'Join Aviora Education';
      if (subheading) subheading.textContent = 'Create your account to unlock world-class 1-on-1 instruction';
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

  togglePageRoleFields(role) {
    const studentFields = document.getElementById('page-student-extra-fields');
    const teacherFields = document.getElementById('page-teacher-extra-fields');

    if (role === 'teacher') {
      if (studentFields) studentFields.style.display = 'none';
      if (teacherFields) teacherFields.style.display = 'block';
    } else {
      if (studentFields) studentFields.style.display = 'block';
      if (teacherFields) teacherFields.style.display = 'none';
    }
  },

  fillLoginForm(email, password, context = 'modal') {
    if (context === 'page') {
      this.switchPageTab('login');
      const emailInput = document.getElementById('page-login-email');
      const passInput = document.getElementById('page-login-password');
      if (emailInput && passInput) {
        emailInput.value = email;
        passInput.value = password;
        showToast(`Demo credentials filled for ${email.split('@')[0]}!`, 'info');
      }
    } else {
      this.switchTab('login');
      const emailInput = document.getElementById('login-email');
      const passInput = document.getElementById('login-password');
      if (emailInput && passInput) {
        emailInput.value = email;
        passInput.value = password;
        showToast(`Demo credentials filled for ${email.split('@')[0]}!`, 'info');
      }
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

  async handleLogin(e, context = 'modal') {
    e.preventDefault();
    const isPage = context === 'page';
    const email = document.getElementById(isPage ? 'page-login-email' : 'login-email').value.trim();
    const password = document.getElementById(isPage ? 'page-login-password' : 'login-password').value;
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

  async handleRegister(e, context = 'modal') {
    e.preventDefault();
    const isPage = context === 'page';

    const name = document.getElementById(isPage ? 'page-reg-name' : 'reg-name').value.trim();
    const email = document.getElementById(isPage ? 'page-reg-email' : 'reg-email').value.trim();
    const password = document.getElementById(isPage ? 'page-reg-password' : 'reg-password').value;
    const confirmPassword = document.getElementById(isPage ? 'page-reg-confirm' : 'reg-confirm')?.value || '';

    const phoneEl = document.getElementById(isPage ? 'page-reg-phone' : 'reg-phone');
    const phone = phoneEl ? phoneEl.value.trim() : null;

    const roleRadio = document.querySelector(`input[name="${isPage ? 'page_register_role' : 'register_role'}"]:checked`);
    const role = roleRadio ? roleRadio.value : 'student';

    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!name || !email || !password) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    // MANDATORY STRONG PASSWORD VALIDATION
    const passEval = PasswordValidator.evaluate(password);
    if (!passEval.isStrong) {
      showToast('Please fulfill all 5 strong password requirements before creating your account.', 'error');
      const strengthBox = document.getElementById(isPage ? 'page-password-strength-box' : 'modal-password-strength-box');
      if (strengthBox) {
        strengthBox.style.borderColor = 'rgba(239, 68, 68, 0.7)';
        strengthBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Confirm Password Matching
    if (confirmPassword && password !== confirmPassword) {
      showToast('Passwords do not match. Please verify.', 'error');
      return;
    }

    const payload = { name, email, password, role, phone };

    if (role === 'student') {
      const gradeEl = document.getElementById(isPage ? 'page-reg-grade' : 'reg-student-grade');
      const schoolEl = document.getElementById('reg-student-school');
      payload.grade_level = gradeEl ? gradeEl.value : 'Grade 11 - High School';
      payload.school = schoolEl ? schoolEl.value.trim() : 'Aviora Student Academy';
    } else if (role === 'teacher') {
      const headlineEl = document.getElementById('reg-teacher-headline');
      const subjectsEl = document.getElementById(isPage ? 'page-reg-subjects' : 'reg-teacher-subjects');
      payload.headline = headlineEl ? headlineEl.value.trim() : 'Educator & Academic Specialist';
      payload.subjects = subjectsEl ? subjectsEl.value.trim() : 'Mathematics, Natural Sciences';
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
      submitBtn.textContent = isPage ? 'Create Aviora Account' : 'Create My Account';
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
          bellBadge.style.display = 'inline-block';
          bellBadge.textContent = unreadCount;
        } else {
          bellBadge.style.display = 'none';
        }
      }

      // Add Portal Link in Header
      if (portalNavLinks) {
        let portalHash = '#student-portal';
        let portalLabel = 'Student Portal';
        if (user.role === 'teacher') {
          portalHash = '#teacher-portal';
          portalLabel = 'Teacher Portal';
        } else if (user.role === 'admin') {
          portalHash = '#admin-portal';
          portalLabel = 'Admin Console';
        }

        portalNavLinks.innerHTML = `
          <a href="${portalHash}" class="nav-link" id="nav-active-portal-link" style="color: var(--gold-primary); font-weight: 700;">
            ${portalLabel} →
          </a>
        `;
      }
    } else {
      if (guestActions) guestActions.style.display = 'flex';
      if (userActions) userActions.style.display = 'none';
      if (portalNavLinks) portalNavLinks.innerHTML = '';
    }
  }
};
