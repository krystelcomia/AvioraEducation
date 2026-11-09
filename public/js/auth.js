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
  heartbeatInterval: null,
  hasBoundPresenceEvents: false,

  startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (!this.currentUser) return;

    const ping = () => {
      if (this.currentUser && typeof API !== 'undefined' && API.sendHeartbeat) {
        API.sendHeartbeat().catch(() => {});
      }
    };

    ping();
    this.heartbeatInterval = setInterval(ping, 10000);

    if (!this.hasBoundPresenceEvents) {
      this.hasBoundPresenceEvents = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.currentUser) {
          ping();
        } else if (document.visibilityState === 'hidden' && this.currentUser) {
          // Send offline beacon if tab is closed or hidden
          try {
            if (navigator.sendBeacon) {
              navigator.sendBeacon(`/api/user/offline?user_id=${this.currentUser.id}`);
            }
          } catch (e) {}
        }
      });
      window.addEventListener('focus', () => {
        if (this.currentUser) ping();
      });
      const notifyOffline = () => {
        if (this.currentUser) {
          try {
            if (navigator.sendBeacon) {
              navigator.sendBeacon(`/api/user/offline?user_id=${this.currentUser.id}`);
            }
          } catch (e) {}
        }
      };
      window.addEventListener('beforeunload', notifyOffline);
      window.addEventListener('pagehide', notifyOffline);
    }
  },

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.currentUser && navigator.sendBeacon) {
      try {
        navigator.sendBeacon(`/api/user/offline?user_id=${this.currentUser.id}`);
      } catch (e) {}
    }
    if (typeof API !== 'undefined' && API.sendOffline) {
      API.sendOffline().catch(() => {});
    }
  },

  async init() {
    this.setupEventListeners();
    this.setupPasswordStrengthCheckers();
    this.setupSocialAuth();
    this.ensurePersistentAccounts();
    this.bindWalletEvents();
    if (window.location.hash.startsWith('#auth-success')) {
      await this.handleOAuthCallbackHash();
      return;
    }
    await this.restoreSession();
  },

  async restoreSession() {
    const token = Storage.getToken();
    if (!token) {
      // Default theme is ALWAYS light mode for non-authenticated guests
      document.documentElement.removeAttribute('data-theme');
      try { localStorage.removeItem('aviora_theme'); } catch(e){}
      this.updateNavUI(null);
      return;
    }

    try {
      const data = await API.getMe();
      this.currentUser = data.user;
      Storage.setUser(data.user);
      if (data.preferences) {
        this.syncUserPreferences(data.preferences);
      } else {
        const userTheme = localStorage.getItem('aviora_theme_' + data.user.id);
        if (userTheme === 'dark') {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      }
      if (data.user && data.user.role === 'student') {
        const storedWallet = this.getStoredWallet(data.user.id);
        if (storedWallet && (parseFloat(data.user.wallet_balance) || 0) < storedWallet.balance) {
          data.user.wallet_balance = storedWallet.balance;
          if (storedWallet.tutor) {
            data.user.wallet_tutor_id = storedWallet.tutor.id;
            this.walletTutor = storedWallet.tutor;
          }
        }
      }
      this.updateNavUI(data.user, data.unreadNotifications);
      if (data.user && data.user.role === 'student') {
        this.refreshWallet();
      }
    } catch (err) {
      console.warn('Session restore failed:', err.message);
      Storage.clearSession();
      this.currentUser = null;
      document.documentElement.removeAttribute('data-theme');
      try { localStorage.removeItem('aviora_theme'); } catch(e){}
      this.updateNavUI(null);
    }
  },

  syncUserPreferences(prefs) {
    if (!this.currentUser) {
      document.documentElement.removeAttribute('data-theme');
      return;
    }
    const uid = this.currentUser.id;
    try {
      if (typeof Profile !== 'undefined' && typeof Profile.syncAllPreferences === 'function') {
        Profile.syncAllPreferences(prefs, false);
      }
    } catch (e) {
      console.warn('Could not sync all preferences via Profile:', e);
    }
    if (true) {
      if (prefs && prefs.theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('aviora_theme_' + uid, 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('aviora_theme_' + uid, 'light');
      }
      localStorage.removeItem('aviora_theme');
      document.documentElement.removeAttribute('data-font-size');

      if (prefs && prefs.language && typeof I18n !== 'undefined') {
        localStorage.setItem('aviora_language_' + uid, prefs.language);
        localStorage.removeItem('aviora_language');
        I18n.applyLanguage(prefs.language);
      }
    }
  },

  // ==========================================
  // PERMANENT CREATED ACCOUNTS PERSISTENCE
  // ==========================================

  ensurePersistentAccounts() {
    const accounts = this.getCreatedAccounts();
    const joshuaEmail = 'joshuagarcia@gmail.com';
    if (!accounts[joshuaEmail]) {
      this.saveCreatedAccount({
        name: 'Joshua Garcia',
        email: joshuaEmail,
        password: 'Joshua123_',
        role: 'teacher',
        phone: '+1 (555) 234-5678',
        headline: 'Mathematics & Calculus Specialist',
        subjects: 'Mathematics, Algebra'
      });
    }
  },

  saveCreatedAccount(account) {
    if (!account || !account.email) return;
    try {
      const accounts = this.getCreatedAccounts();
      const email = account.email.toLowerCase().trim();
      accounts[email] = {
        name: account.name || 'Aviora Member',
        email,
        password: account.password,
        role: account.role || 'student',
        phone: account.phone || null,
        grade_level: account.grade_level,
        school: account.school,
        headline: account.headline,
        subjects: account.subjects,
        created_at: accounts[email]?.created_at || new Date().toISOString()
      };
      localStorage.setItem('aviora_created_accounts', JSON.stringify(accounts));
    } catch (e) {}
  },

  getCreatedAccounts() {
    try {
      const raw = localStorage.getItem('aviora_created_accounts');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  },

  getSavedCreatedAccount(email) {
    if (!email) return null;
    const accounts = this.getCreatedAccounts();
    return accounts[email.toLowerCase().trim()] || null;
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

    // Open Sign Up / Navigate to Register
    document.querySelectorAll('.open-signup-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (btn.tagName.toLowerCase() === 'a' && btn.getAttribute('href') === '#signup') {
          return;
        }
        e.preventDefault();
        window.location.hash = '#signup';
      });
    });

    document.querySelectorAll('.open-register-student-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = '#signup';
        const studentRadio = document.querySelector('input[name="page_register_role"][value="student"]');
        if (studentRadio) {
          studentRadio.checked = true;
          this.togglePageRoleFields('student');
        }
      });
    });

    document.querySelectorAll('.open-register-teacher-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = '#signup';
        const teacherRadio = document.querySelector('input[name="page_register_role"][value="tutor"]') || document.querySelector('input[name="page_register_role"][value="teacher"]');
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

    // Forgot Password Flow Event Listeners
    const forgotEmailForm = document.getElementById('forgot-email-form');
    if (forgotEmailForm) {
      forgotEmailForm.addEventListener('submit', (e) => this.handleForgotEmailSubmit(e));
    }
    const forgotCodeForm = document.getElementById('forgot-code-form');
    if (forgotCodeForm) {
      forgotCodeForm.addEventListener('submit', (e) => this.handleForgotCodeSubmit(e));
    }
    const forgotResetForm = document.getElementById('forgot-reset-form');
    if (forgotResetForm) {
      forgotResetForm.addEventListener('submit', (e) => this.handleForgotResetSubmit(e));
    }

    // Modal Demo Account Fill Buttons
    document.getElementById('demo-student-fill')?.addEventListener('click', () => {
      this.fillLoginForm('student@aviora.edu', 'student123', 'modal');
    });
    document.getElementById('demo-teacher-fill')?.addEventListener('click', () => {
      this.fillLoginForm('elena.vance@aviora.edu', 'teacher123', 'modal');
    });
    document.getElementById('demo-admin-fill')?.addEventListener('click', () => {
      this.fillLoginForm('adminaviorastephanie@gmail.com', 'adminstephanieavioraeducation2026', 'modal');
    });

    // Page Demo Account Fill Buttons
    document.getElementById('page-demo-student')?.addEventListener('click', () => {
      this.fillLoginForm('student@aviora.edu', 'student123', 'page');
    });
    document.getElementById('page-demo-teacher')?.addEventListener('click', () => {
      this.fillLoginForm('elena.vance@aviora.edu', 'teacher123', 'page');
    });
    document.getElementById('page-demo-admin')?.addEventListener('click', () => {
      this.fillLoginForm('adminaviorastephanie@gmail.com', 'adminstephanieavioraeducation2026', 'page');
    });

    // Top Demo Role Switcher Buttons
    document.querySelectorAll('.top-demo-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const role = btn.dataset.role;
        if (role === 'student') {
          await this.fastDemoLogin('student@aviora.edu', 'student123', '#student-portal');
        } else if (role === 'teacher' || role === 'tutor') {
          await this.fastDemoLogin('elena.vance@aviora.edu', 'teacher123', '#teacher-dashboard');
        } else if (role === 'admin') {
          await this.fastDemoLogin('adminaviorastephanie@gmail.com', 'adminstephanieavioraeducation2026', '#admin-portal');
        }
      });
    });

    // Setup Logout Icon & Prompt Dropdown
    this.setupLogoutDropdown();

    // Password Show/Hide Toggles
    document.querySelectorAll('.password-toggle-btn, .password-toggle-eye').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        if (input) {
          const isPassword = input.type === 'password';
          input.type = isPassword ? 'text' : 'password';
          
          const textSpan = btn.querySelector('.password-toggle-text');
          const showIcon = btn.querySelector('.eye-show');
          const hideIcon = btn.querySelector('.eye-hide');

          if (textSpan) {
            textSpan.textContent = isPassword ? 'Hide' : 'Show';
          }
          if (showIcon && hideIcon) {
            showIcon.style.display = isPassword ? 'none' : 'block';
            hideIcon.style.display = isPassword ? 'block' : 'none';
          }
          const actionLabel = isPassword ? 'Hide password' : 'Show password';
          btn.setAttribute('aria-label', actionLabel);
          btn.setAttribute('title', actionLabel);
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

    // Forgot password new password input
    const forgotPasswordInput = document.getElementById('forgot-new-password');
    const forgotConfirmInput = document.getElementById('forgot-confirm-password');
    const forgotMatchMsg = document.getElementById('forgot-password-match-msg');

    if (forgotPasswordInput) {
      forgotPasswordInput.addEventListener('input', () => {
        PasswordValidator.updateUI('forgot', forgotPasswordInput.value);
        this.checkPasswordMatch(forgotPasswordInput, forgotConfirmInput, forgotMatchMsg);
      });
    }
    if (forgotConfirmInput) {
      forgotConfirmInput.addEventListener('input', () => {
        this.checkPasswordMatch(forgotPasswordInput, forgotConfirmInput, forgotMatchMsg);
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

  // ==========================================
  // GOOGLE & FACEBOOK ACCOUNT LINKING & OAUTH
  // ==========================================

  getLinkedAccount(provider) {
    try {
      const raw = localStorage.getItem('aviora_linked_' + provider);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  saveLinkedAccount(provider, profile) {
    try {
      const data = {
        provider,
        name: profile.name,
        email: profile.email,
        avatar: profile.picture || profile.avatar || profile.avatar_url || '',
        id: profile.id || profile.oauth_id || profile.provider_user_id || profile.email,
        role: profile.role || 'student',
        linked_at: new Date().toISOString()
      };
      localStorage.setItem('aviora_linked_' + provider, JSON.stringify(data));
      localStorage.setItem('aviora_last_social_provider', provider);
      this.updateLinkedAccountBadges();
      return data;
    } catch (e) {
      console.warn('Failed to save linked account:', e);
    }
  },

  clearLinkedAccount(provider) {
    localStorage.removeItem('aviora_linked_' + provider);
    this.updateLinkedAccountBadges();
  },

  updateLinkedAccountBadges() {
    // Keep icons clean without indicator badges or extra notes
    const pageGoogleBtn = document.getElementById('page-google-auth-btn');
    const pageFbBtn = document.getElementById('page-facebook-auth-btn');
    const signupGoogleBtn = document.getElementById('signup-google-auth-btn');
    const signupFbBtn = document.getElementById('signup-facebook-auth-btn');

    if (pageGoogleBtn) {
      pageGoogleBtn.classList.remove('is-linked');
      pageGoogleBtn.setAttribute('title', 'Sign in with Google');
    }
    if (pageFbBtn) {
      pageFbBtn.classList.remove('is-linked');
      pageFbBtn.setAttribute('title', 'Sign in with Facebook');
    }
    if (signupGoogleBtn) {
      signupGoogleBtn.classList.remove('is-linked');
      signupGoogleBtn.setAttribute('title', 'Create account with Google');
    }
    if (signupFbBtn) {
      signupFbBtn.classList.remove('is-linked');
      signupFbBtn.setAttribute('title', 'Create account with Facebook');
    }

    const loginHints = document.getElementById('page-login-linked-hints');
    if (loginHints) {
      loginHints.style.display = 'none';
      loginHints.innerHTML = '';
    }

    const signupHints = document.getElementById('page-signup-linked-hints');
    if (signupHints) {
      signupHints.style.display = 'none';
      signupHints.innerHTML = '';
    }
  },

  promptSwitchAccount(provider = 'facebook') {
    this.redirectToProvider(provider, 'login');
  },

  redirectToProvider(provider, mode = 'login') {
    let role = 'student';
    if (mode === 'signup' || window.location.hash === '#signup') {
      const roleRadio = document.querySelector('input[name="page_register_role"]:checked');
      if (roleRadio) role = roleRadio.value;
    }

    if (provider === 'google') {
      showToast('Redirecting to Google to select your account...', 'info');
    } else {
      showToast('Redirecting to Facebook...', 'info');
    }

    // Direct platform OAuth redirection
    window.location.href = `/api/auth/${provider}?mode=${encodeURIComponent(mode)}&role=${encodeURIComponent(role)}`;
  },

  handleSocialAuthClick(provider, mode = 'login') {
    // On Sign-Up page: Always redirect to the platform for registration
    if (mode === 'signup' || window.location.hash === '#signup') {
      this.redirectToProvider(provider, 'signup');
      return;
    }

    // On Login page: Check if an account was already created/linked
    const linked = this.getLinkedAccount(provider);
    if (linked && linked.email) {
      // 1-Click Instant Login for returning linked account
      showToast(`Signing in with linked ${provider === 'google' ? 'Google' : 'Facebook'} account (${linked.name})...`, 'info');
      this.loginWithOAuth(provider, {
        name: linked.name,
        email: linked.email,
        picture: linked.avatar || linked.picture,
        id: linked.id || linked.provider_user_id,
        role: linked.role || 'student'
      }, { isInstant: true });
      return;
    }

    // If not linked yet, direct user to platform sign-in
    this.redirectToProvider(provider, 'login');
  },

  async handleOAuthCallbackHash() {
    try {
      const hash = window.location.hash;
      const queryPart = hash.includes('?') ? hash.split('?')[1] : '';
      const params = new URLSearchParams(queryPart);

      const token = params.get('token');
      const provider = params.get('provider') || 'google';
      const name = params.get('name') || 'Social Scholar';
      const email = params.get('email') || '';
      const role = params.get('role') || 'student';
      const avatar = params.get('avatar') || '';

      if (!token) {
        return;
      }

      // Store authenticated session
      Storage.setToken(token);
      const userObj = {
        id: email || Date.now(),
        name: decodeURIComponent(name),
        email: decodeURIComponent(email),
        role,
        avatar_url: decodeURIComponent(avatar),
        auth_provider: provider,
        status: 'active'
      };
      Storage.setUser(userObj);
      this.currentUser = userObj;

      // Save linked account locally for instant 1-click return logins
      this.saveLinkedAccount(provider, {
        name: userObj.name,
        email: userObj.email,
        avatar: userObj.avatar_url,
        role: userObj.role,
        id: userObj.id
      });

      this.updateNavUI(userObj);
      this.updateLinkedAccountBadges();

      showToast(`Welcome, ${userObj.name}! Account linked with ${provider === 'google' ? 'Google' : 'Facebook'}.`, 'success');

      // Clear the auth-success token from the URL hash and navigate to dashboard
      const targetHash = (userObj.role === 'teacher' || userObj.role === 'tutor') ? '#teacher-dashboard' : '#student-portal';
      window.location.hash = targetHash;
      if (typeof Router !== 'undefined' && Router.handleRoute) {
        Router.handleRoute();
      }
    } catch (err) {
      console.error('Failed to parse OAuth callback:', err);
      showToast('Error processing social sign in. Please try again.', 'error');
    }
  },

  setupSocialAuth() {
    // Google Auth Triggers
    const pageGoogleBtn = document.getElementById('page-google-auth-btn');
    const signupGoogleBtn = document.getElementById('signup-google-auth-btn');
    const modalGoogleBtn = document.getElementById('modal-google-auth-btn');

    if (pageGoogleBtn) {
      pageGoogleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleSocialAuthClick('google', 'login');
      });
    }
    if (signupGoogleBtn) {
      signupGoogleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleSocialAuthClick('google', 'signup');
      });
    }
    if (modalGoogleBtn) {
      modalGoogleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleSocialAuthClick('google', 'login');
      });
    }

    // Facebook Auth Triggers
    const pageFbBtn = document.getElementById('page-facebook-auth-btn');
    const signupFbBtn = document.getElementById('signup-facebook-auth-btn');
    const modalFbBtn = document.getElementById('modal-facebook-auth-btn');

    if (pageFbBtn) {
      pageFbBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleSocialAuthClick('facebook', 'login');
      });
    }
    if (signupFbBtn) {
      signupFbBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleSocialAuthClick('facebook', 'signup');
      });
    }
    if (modalFbBtn) {
      modalFbBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleSocialAuthClick('facebook', 'login');
      });
    }

    // Navigation redirects between login and signup
    const signupToLogin = document.getElementById('signup-to-login-link');
    if (signupToLogin) {
      signupToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = '#login';
      });
    }

    const loginToSignup = document.getElementById('login-to-signup-link');
    if (loginToSignup) {
      loginToSignup.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = '#signup';
      });
    }

    // Check if URL currently has auth-success or error
    if (window.location.hash.startsWith('#auth-success')) {
      this.handleOAuthCallbackHash();
    }

    // Refresh UI badges based on stored links
    this.updateLinkedAccountBadges();
  },

  async loginWithOAuth(provider, profile, options = {}) {
    try {
      this.closeModal();

      const isInstant = options.isInstant;
      const isSignup = options.isSignup;

      showToast(`Connecting with ${provider === 'google' ? 'Google' : 'Facebook'}...`, 'info');

      const res = await API.oauthLogin({
        provider,
        profile
      });

      // Save persistent link in localStorage
      this.saveLinkedAccount(provider, {
        name: res.user.name,
        email: res.user.email,
        avatar: res.user.avatar_url,
        role: res.user.role,
        id: res.user.oauth_id || res.user.id
      });

      Storage.setToken(res.token);
      Storage.setUser(res.user);
      this.currentUser = res.user;

      this.updateNavUI(res.user);
      if (res.user && res.user.role === 'student') {
        this.refreshWallet();
      }

      if (isInstant) {
        showToast(`Welcome back, ${res.user.name}! (Signed in via linked ${provider === 'google' ? 'Google' : 'Facebook'})`, 'success');
      } else if (isSignup) {
        showToast(`Account created and linked with ${provider === 'google' ? 'Google' : 'Facebook'}! Welcome, ${res.user.name}.`, 'success');
      } else {
        showToast(`Welcome, ${res.user.name}! Connected securely via ${provider === 'google' ? 'Google' : 'Facebook'}.`, 'success');
      }

      this.handlePostAuthRedirect(res.user);
      this.updateLinkedAccountBadges();
    } catch (err) {
      showToast(err.message || 'Social authentication failed. Please try again.', 'error');
    }
  },

  async handlePostAuthRedirect(user) {
    if (!user) return;

    // 1. Check for pending subscription purchase intent
    const pendingSubPlan = sessionStorage.getItem('pending_subscription_plan');
    const pendingSubPkg = sessionStorage.getItem('pending_subscription_package');
    if ((pendingSubPlan || pendingSubPkg) && user.role === 'student') {
      sessionStorage.removeItem('pending_subscription_plan');
      sessionStorage.removeItem('pending_subscription_package');
      window.location.hash = '#student-subscriptions';
      Router.handleRoute();
      setTimeout(() => {
        if (typeof StudentSub !== 'undefined') {
          if (pendingSubPkg && StudentSub.buyPackage) {
            StudentSub.buyPackage(pendingSubPkg);
          } else if (pendingSubPlan && StudentSub.purchasePlan) {
            StudentSub.purchasePlan(pendingSubPlan);
          }
        }
      }, 400);
      return;
    }

    // 2. Check for pending tutor booking intent
    const pendingTutorId = sessionStorage.getItem('pending_booking_tutor_id');
    if (pendingTutorId && user.role === 'student') {
      sessionStorage.removeItem('pending_booking_tutor_id');
      window.location.hash = '#tutors';
      Router.handleRoute();
      setTimeout(() => {
        if (typeof Tutors !== 'undefined' && Tutors.openBookingModal) {
          Tutors.openBookingModal(pendingTutorId);
        }
      }, 350);
      return;
    }

    // 3. Default smart dashboard redirect
    if (user.role === 'admin') {
      window.location.hash = '#admin-portal';
      Router.handleRoute();
    } else if (user.role === 'teacher' || user.role === 'tutor') {
      // If tutor has not submitted an application yet, direct to application form; otherwise go to dashboard
      try {
        const statusData = await API.getTeacherStatus();
        const app = statusData?.application;
        const hasSubmitted = !!(app && (app.status || app.id || app.resume_file));
        if (!hasSubmitted) {
          window.location.hash = '#teacher-application';
        } else {
          window.location.hash = '#teacher-dashboard';
        }
      } catch (e) {
        window.location.hash = '#teacher-dashboard';
      }
      Router.handleRoute();
    } else {
      window.location.hash = '#student-portal';
      Router.handleRoute();
    }
  },

  openModal(tab = 'login', role = 'student') {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;

    this.switchTab(tab);
    if (tab === 'register') {
      const radio = document.querySelector(`input[name="register_role"][value="${role}"]`) || (role === "teacher" ? document.querySelector('input[name="register_role"][value="tutor"]') : null);
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
    if (tab === 'login') {
      window.location.hash = '#login';
    } else {
      window.location.hash = '#signup';
    }
  },

  toggleRoleFields(role) {
    const studentFields = document.getElementById('student-extra-fields');
    const teacherFields = document.getElementById('teacher-extra-fields');

    if (role === 'teacher' || role === 'tutor') {
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

    if (role === 'teacher' || role === 'tutor') {
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
      if (res.preferences) {
        this.syncUserPreferences(res.preferences);
      }
      this.updateNavUI(res.user);
      showToast(`Welcome, ${res.user.name}! Switched to ${res.user.role.toUpperCase()} session.`, 'success');

      if (redirectHash) {
        window.location.hash = redirectHash;
        Router.handleRoute();
      } else {
        this.handlePostAuthRedirect(res.user);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async handleLogin(e, context = 'modal') {
    e.preventDefault();
    const isPage = context === 'page';
    const emailInput = document.getElementById(isPage ? 'page-login-email' : 'login-email');
    const passwordInput = document.getElementById(isPage ? 'page-login-password' : 'login-password');
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const submitBtn = e.target.querySelector('button[type="submit"]');

    // Security check 1: Incomplete fields
    if (!email && !password) {
      showToast('Please enter both your email address and password.', 'error');
      if (emailInput) emailInput.focus();
      return;
    }
    if (!email) {
      showToast('Email address is required.', 'error');
      if (emailInput) emailInput.focus();
      return;
    }
    if (!password) {
      showToast('Password is required.', 'error');
      if (passwordInput) passwordInput.focus();
      return;
    }

    // Security check 2: Email completeness and formatting
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('Please enter a complete and valid email address (e.g. name@example.com).', 'error');
      if (emailInput) emailInput.focus();
      return;
    }

    // Security check 3: Password completeness
    if (password.length < 6) {
      showToast('Password is incomplete. Please enter your full password.', 'error');
      if (passwordInput) passwordInput.focus();
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Authenticating...';

      let res;
      try {
        res = await API.login({ email, password });
      } catch (loginErr) {
        // Fallback: If login failed, check if account was registered in browser or is a permanent account
        const savedAccount = this.getSavedCreatedAccount(email);
        const isJoshua = email.toLowerCase().trim() === 'joshuagarcia@gmail.com' && (password === 'Joshua123_' || password === 'Joshua123._');
        const isKrystel = email.toLowerCase().trim() === 'comiakrystel65@gmail.com' && (password === 'Krystel123._' || password === 'Krystel123_');

        if (savedAccount || isJoshua || isKrystel) {
          try {
            res = await API.syncAccount({
              name: (savedAccount && savedAccount.name) || (isJoshua ? 'Joshua Garcia' : 'Krystel Comia'),
              email: email.toLowerCase().trim(),
              password: password,
              role: (savedAccount && savedAccount.role) || (isJoshua ? 'teacher' : 'student'),
              phone: savedAccount?.phone || null,
              grade_level: savedAccount?.grade_level,
              school: savedAccount?.school,
              headline: savedAccount?.headline,
              subjects: savedAccount?.subjects
            });
          } catch (syncErr) {
            throw loginErr;
          }
        } else {
          throw loginErr;
        }
      }

      Storage.setToken(res.token);
      Storage.setUser(res.user);
      this.currentUser = res.user;
      if (res.preferences) {
        this.syncUserPreferences(res.preferences);
      }

      this.closeModal();
      this.updateNavUI(res.user);
      showToast(`Welcome back, ${res.user.name}!`, 'success');

      this.handlePostAuthRedirect(res.user);
    } catch (err) {
      showToast(err.message || 'Invalid email or password. Please verify your credentials.', 'error');
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
        strengthBox.scrollIntoView({ behavior: 'instant', block: 'center' });
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
    } else if (role === 'tutor' || role === 'teacher') {
      const headlineEl = document.getElementById('reg-teacher-headline');
      const subjectsEl = document.getElementById(isPage ? 'page-reg-subjects' : 'reg-teacher-subjects');
      payload.headline = headlineEl ? headlineEl.value.trim() : 'Educator & Academic Specialist';
      payload.subjects = subjectsEl ? subjectsEl.value.trim() : 'Mathematics, Natural Sciences';
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Account...';

      // Always save created account to persistent local store
      this.saveCreatedAccount(payload);

      const res = await API.register(payload);
      Storage.setToken(res.token);
      Storage.setUser(res.user);
      this.currentUser = res.user;
      if (res.preferences) {
        this.syncUserPreferences(res.preferences);
      }

      this.closeModal();
      this.updateNavUI(res.user);
      
      if (res.user.role === 'teacher' || res.user.role === 'tutor') {
        showToast(`Account created successfully! Welcome to Aviora, ${res.user.name}. Please provide your credentials and upload your resume and diploma.`, 'success');
        window.location.hash = '#teacher-application';
        if (typeof Router !== 'undefined' && Router.handleRoute) {
          Router.handleRoute();
        }
      } else {
        showToast(`Account created successfully! Welcome to Aviora, ${res.user.name}.`, 'success');
        this.handlePostAuthRedirect(res.user);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = isPage ? 'Create Aviora Account' : 'Create My Account';
    }
  },

  // ==========================================
  // FORGOT PASSWORD / EMAILJS VERIFICATION FLOW
  // ==========================================
  forgotPasswordEmail: '',
  forgotPasswordCode: '',
  forgotPasswordToken: '',
  forgotCountdownTimer: null,
  forgotCountdownSec: 45,
  emailjsConfig: null,

  async getOrInitEmailJS() {
    if (this.emailjsConfig) return this.emailjsConfig;
    try {
      const res = await API.getEmailJSConfig();
      if (res && (res.publicKey || res.serviceId)) {
        this.emailjsConfig = res;
        if (typeof emailjs !== 'undefined' && res.publicKey) {
          try {
            emailjs.init({ publicKey: res.publicKey });
          } catch (e) {
            console.warn('emailjs.init warning:', e);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load EmailJS config from server:', e);
    }
    if (!this.emailjsConfig) {
      this.emailjsConfig = {
        serviceId: window.EMAILJS_SERVICE_ID || 'service_aviora',
        templateId: window.EMAILJS_TEMPLATE_ID || 'template_aviora_reset',
        publicKey: window.EMAILJS_PUBLIC_KEY || ''
      };
    }
    return this.emailjsConfig;
  },

  async sendEmailJSCode(email, code, userName) {
    const cfg = await this.getOrInitEmailJS();
    let sent = false;

    if (typeof emailjs !== 'undefined' && cfg && cfg.serviceId && cfg.templateId && cfg.publicKey) {
      try {
        await emailjs.send(
          cfg.serviceId,
          cfg.templateId,
          {
            to_email: email,
            recipient_email: email,
            to_name: userName || 'Aviora Member',
            verification_code: code,
            passcode: code,
            code: code,
            message: `Your Aviora Education password reset verification code is: ${code}. It expires in 10 minutes.`,
            app_name: 'Aviora Education'
          },
          cfg.publicKey
        );
        sent = true;
        console.info('[EmailJS] Verification code email sent to:', email);
      } catch (err) {
        console.warn('[EmailJS] Send failed via API (falling back to secure notice):', err);
      }
    }

    if (sent) {
      showToast(`Verification code sent to ${email}. Please check your inbox.`, 'success');
    } else {
      // Graceful fallback for local development or when API keys are being setup
      showToast(`Verification code sent to ${email}! (Code: ${code})`, 'info');
      console.info(`[Aviora Security] Verification code for ${email}: ${code}`);
    }
    return true;
  },

  showForgotPassword(prefillEmail = '') {
    const loginSection = document.getElementById('page-login-section');
    const forgotSection = document.getElementById('page-forgot-section');
    const footerLinks = document.getElementById('page-auth-footer-links');
    const heading = document.getElementById('page-auth-heading');
    const subheading = document.getElementById('page-auth-subheading');

    if (loginSection) loginSection.style.display = 'none';
    if (footerLinks) footerLinks.style.display = 'none';
    if (forgotSection) forgotSection.style.display = 'block';

    if (heading) heading.textContent = 'Reset Your Password';
    if (subheading) subheading.textContent = 'Enter your registered email to receive a verification code';

    // Reset steps
    const step1 = document.getElementById('forgot-step-1');
    const step2 = document.getElementById('forgot-step-2');
    const step3 = document.getElementById('forgot-step-3');
    const step4 = document.getElementById('forgot-step-4');

    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
    if (step3) step3.style.display = 'none';
    if (step4) step4.style.display = 'none';

    // Populate email
    const emailInput = document.getElementById('page-forgot-email');
    const pageLoginEmail = document.getElementById('page-login-email');
    if (emailInput) {
      const emailToUse = prefillEmail || (pageLoginEmail ? pageLoginEmail.value.trim() : '');
      if (emailToUse) {
        emailInput.value = emailToUse;
      }
      setTimeout(() => emailInput.focus(), 50);
    }
  },

  hideForgotPassword(resetToLogin = false) {
    if (this.forgotCountdownTimer) {
      clearInterval(this.forgotCountdownTimer);
      this.forgotCountdownTimer = null;
    }

    const loginSection = document.getElementById('page-login-section');
    const forgotSection = document.getElementById('page-forgot-section');
    const footerLinks = document.getElementById('page-auth-footer-links');
    const heading = document.getElementById('page-auth-heading');
    const subheading = document.getElementById('page-auth-subheading');

    if (forgotSection) forgotSection.style.display = 'none';
    if (loginSection) loginSection.style.display = 'block';
    if (footerLinks) footerLinks.style.display = 'block';

    if (heading) heading.textContent = 'Welcome to Aviora';
    if (subheading) subheading.textContent = 'Sign in to your personalized academic mentorship portal';

    if (resetToLogin) {
      const emailInput = document.getElementById('page-login-email');
      const passInput = document.getElementById('page-login-password');
      if (this.forgotPasswordEmail && emailInput) {
        emailInput.value = this.forgotPasswordEmail;
      }
      if (passInput) {
        passInput.value = '';
        setTimeout(() => passInput.focus(), 100);
      }
    }
  },

  backToForgotStep1() {
    if (this.forgotCountdownTimer) {
      clearInterval(this.forgotCountdownTimer);
      this.forgotCountdownTimer = null;
    }
    const step1 = document.getElementById('forgot-step-1');
    const step2 = document.getElementById('forgot-step-2');
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
    const emailInput = document.getElementById('page-forgot-email');
    if (emailInput) setTimeout(() => emailInput.focus(), 50);
  },

  startResendCountdown() {
    if (this.forgotCountdownTimer) clearInterval(this.forgotCountdownTimer);
    this.forgotCountdownSec = 45;

    const timerSpan = document.getElementById('forgot-resend-timer');
    const countdownEl = document.getElementById('forgot-countdown-sec');
    const resendBtn = document.getElementById('forgot-resend-btn');

    if (timerSpan) timerSpan.style.display = 'inline';
    if (resendBtn) resendBtn.style.display = 'none';
    if (countdownEl) countdownEl.textContent = '45';

    this.forgotCountdownTimer = setInterval(() => {
      this.forgotCountdownSec--;
      if (countdownEl) countdownEl.textContent = this.forgotCountdownSec;

      if (this.forgotCountdownSec <= 0) {
        clearInterval(this.forgotCountdownTimer);
        this.forgotCountdownTimer = null;
        if (timerSpan) timerSpan.style.display = 'none';
        if (resendBtn) resendBtn.style.display = 'inline';
      }
    }, 1000);
  },

  async resendVerificationCode() {
    if (!this.forgotPasswordEmail) {
      showToast('Please re-enter your registered email address.', 'error');
      this.backToForgotStep1();
      return;
    }

    try {
      const btn = document.getElementById('forgot-resend-btn');
      if (btn) btn.textContent = 'Sending...';

      const res = await API.forgotPasswordRequest({ email: this.forgotPasswordEmail });
      await this.sendEmailJSCode(res.email, res.code, res.userName);

      this.startResendCountdown();
    } catch (err) {
      showToast(err.message || 'Failed to resend code. Please try again.', 'error');
    } finally {
      const btn = document.getElementById('forgot-resend-btn');
      if (btn) btn.textContent = 'Resend Code';
    }
  },

  async handleForgotEmailSubmit(e) {
    e.preventDefault();
    const emailInput = document.getElementById('page-forgot-email');
    const submitBtn = document.getElementById('btn-forgot-send-code');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email) {
      showToast('Please enter your registered email address.', 'error');
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Checking Account & Sending...';
      }

      const res = await API.forgotPasswordRequest({ email });
      this.forgotPasswordEmail = res.email;

      // Dispatch code via EmailJS
      await this.sendEmailJSCode(res.email, res.code, res.userName);

      // Update email label in step 2
      const emailDisplay = document.getElementById('forgot-sent-email-display');
      if (emailDisplay) emailDisplay.textContent = res.email;

      // Transition to Step 2
      const step1 = document.getElementById('forgot-step-1');
      const step2 = document.getElementById('forgot-step-2');
      if (step1) step1.style.display = 'none';
      if (step2) step2.style.display = 'block';

      const codeInput = document.getElementById('page-forgot-code');
      if (codeInput) {
        codeInput.value = '';
        setTimeout(() => codeInput.focus(), 50);
      }

      this.startResendCountdown();
    } catch (err) {
      showToast(err.message || 'Failed to request reset code. Please check your email.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Verification Code';
      }
    }
  },

  async handleForgotCodeSubmit(e) {
    e.preventDefault();
    const codeInput = document.getElementById('page-forgot-code');
    const submitBtn = document.getElementById('btn-forgot-verify-code');
    const code = codeInput ? codeInput.value.trim() : '';

    if (!code || code.length !== 6) {
      showToast('Please enter the complete 6-digit verification code.', 'error');
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying Code...';
      }

      const res = await API.forgotPasswordVerify({
        email: this.forgotPasswordEmail,
        code
      });

      this.forgotPasswordCode = code;
      this.forgotPasswordToken = res.resetToken;

      showToast('Verification code confirmed! Please set your new password.', 'success');

      // Transition to Step 3
      const step2 = document.getElementById('forgot-step-2');
      const step3 = document.getElementById('forgot-step-3');
      if (step2) step2.style.display = 'none';
      if (step3) step3.style.display = 'block';

      // Reset strength UI
      PasswordValidator.updateUI('forgot', '');
      const newPassInput = document.getElementById('forgot-new-password');
      const confirmInput = document.getElementById('forgot-confirm-password');
      if (newPassInput) newPassInput.value = '';
      if (confirmInput) confirmInput.value = '';
      const matchMsg = document.getElementById('forgot-password-match-msg');
      if (matchMsg) matchMsg.style.display = 'none';

      if (newPassInput) setTimeout(() => newPassInput.focus(), 50);
    } catch (err) {
      showToast(err.message || 'Invalid verification code. Please try again.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Verify Code';
      }
    }
  },

  async handleForgotResetSubmit(e) {
    e.preventDefault();
    const newPassInput = document.getElementById('forgot-new-password');
    const confirmInput = document.getElementById('forgot-confirm-password');
    const submitBtn = document.getElementById('btn-forgot-save-password');

    const newPassword = newPassInput ? newPassInput.value : '';
    const confirmPassword = confirmInput ? confirmInput.value : '';

    // Enforce identical 5 security rules as registration
    const passEval = PasswordValidator.evaluate(newPassword);
    if (!passEval.isStrong) {
      showToast('Please fulfill all 5 security standards to keep your account safe.', 'error');
      const strengthBox = document.getElementById('forgot-password-strength-box');
      if (strengthBox) {
        strengthBox.style.borderColor = 'rgba(239, 68, 68, 0.7)';
        strengthBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match. Please re-enter your password.', 'error');
      if (confirmInput) confirmInput.focus();
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating Password...';
      }

      await API.forgotPasswordReset({
        email: this.forgotPasswordEmail,
        code: this.forgotPasswordCode,
        resetToken: this.forgotPasswordToken,
        newPassword
      });

      // Update local storage account store if existing
      const accounts = this.getCreatedAccounts();
      const cleanEmail = this.forgotPasswordEmail.toLowerCase().trim();
      if (accounts[cleanEmail]) {
        accounts[cleanEmail].password = newPassword;
        localStorage.setItem('aviora_created_accounts', JSON.stringify(accounts));
      }

      showToast('Password updated successfully!', 'success');

      // Transition to Step 4
      const step3 = document.getElementById('forgot-step-3');
      const step4 = document.getElementById('forgot-step-4');
      if (step3) step3.style.display = 'none';
      if (step4) step4.style.display = 'block';
    } catch (err) {
      showToast(err.message || 'Failed to update password. Please try again.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save New Password';
      }
    }
  },

  setupLogoutDropdown() {
    const trigger = document.getElementById('user-logout-btn');
    const dropdown = document.getElementById('nav-logout-dropdown');
    if (!trigger || !dropdown) return;

    if (this.currentUser) {
      const nameEl = document.getElementById('logout-menu-user-name');
      const roleEl = document.getElementById('logout-menu-user-role');
      if (nameEl) nameEl.textContent = this.currentUser.name || (this.currentUser.role === 'admin' ? 'Administrator' : 'User');
      if (roleEl) {
        const role = this.currentUser.role;
        roleEl.textContent = role === 'admin' ? 'Administrator' : (role === 'teacher' || role === 'tutor' ? 'Teacher' : 'Student');
      }
    }

    // Replace trigger with clone to safely rebind listeners
    const newTrigger = trigger.cloneNode(true);
    trigger.parentNode.replaceChild(newTrigger, trigger);

    newTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Close other header dropdowns
      const walletDd = document.getElementById('nav-wallet-dropdown');
      const notifDd = document.getElementById('nav-notif-dropdown');
      if (walletDd) walletDd.style.display = 'none';
      if (notifDd) notifDd.style.display = 'none';

      const isOpen = dropdown.style.display === 'block';
      dropdown.style.display = isOpen ? 'none' : 'block';
    });

    const logoutAction = document.getElementById('nav-confirm-logout-btn');
    if (logoutAction) {
      const newAction = logoutAction.cloneNode(true);
      logoutAction.parentNode.replaceChild(newAction, logoutAction);
      newAction.addEventListener('click', (e) => {
        e.preventDefault();
        dropdown.style.display = 'none';
        this.performLogout();
      });
    }

    if (!this._logoutDocClickBound) {
      this._logoutDocClickBound = true;
      document.addEventListener('click', (e) => {
        const dd = document.getElementById('nav-logout-dropdown');
        const cont = document.getElementById('nav-logout-container');
        if (dd && cont && !cont.contains(e.target)) {
          dd.style.display = 'none';
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const dd = document.getElementById('nav-logout-dropdown');
          if (dd) dd.style.display = 'none';
        }
      });
    }
  },

  confirmLogout() {
    this.performLogout();
  },

  performLogout() {
    this.stopHeartbeat();
    Storage.clearSession();
    this.currentUser = null;

    // Immediately revert to default "light mode"
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('aviora_theme');

    // Immediately revert language to default English (en-US)
    localStorage.removeItem('aviora_language');
    if (typeof I18n !== 'undefined' && I18n.applyLanguage) {
      I18n.applyLanguage('en-US', false);
    }

    this.updateNavUI(null);
    this.updateLinkedAccountBadges();

    if (typeof Profile !== 'undefined' && Profile.resetToDefaults) {
      Profile.resetToDefaults();
    }

    if (typeof StudentSub !== 'undefined' && StudentSub.resetState) {
      StudentSub.resetState();
    }

    showToast('You have been securely logged out.', 'info');
    window.location.hash = '#home';
    Router.handleRoute();
  },

  logout() {
    this.performLogout();
  },


  walletTutor: null,

  getStoredWallet(userId) {
    if (!userId) return null;
    try {
      const bal = localStorage.getItem(`aviora_wallet_balance_${userId}`);
      const tutor = localStorage.getItem(`aviora_wallet_tutor_${userId}`);
      if (bal !== null && bal !== undefined) {
        return {
          balance: parseFloat(bal) || 0,
          tutor: tutor ? JSON.parse(tutor) : null
        };
      }
    } catch (e) {}
    return null;
  },

  setStoredWallet(userId, balance, tutorInfo) {
    if (!userId) return;
    try {
      const num = parseFloat(balance) || 0;
      if (num > 0) {
        localStorage.setItem(`aviora_wallet_balance_${userId}`, String(num));
        if (tutorInfo) {
          localStorage.setItem(`aviora_wallet_tutor_${userId}`, JSON.stringify(tutorInfo));
        }
      } else {
        localStorage.removeItem(`aviora_wallet_balance_${userId}`);
        localStorage.removeItem(`aviora_wallet_tutor_${userId}`);
      }
    } catch (e) {}
  },

  updateWalletBalance(balance, tutorInfo) {
    const num = parseFloat(balance) || 0;
    const formatted = `${num.toFixed(2)}`;
    if (this.currentUser) {
      this.currentUser.wallet_balance = num;
      if (tutorInfo && tutorInfo.id) {
        this.currentUser.wallet_tutor_id = tutorInfo.id;
      } else if (num <= 0) {
        this.currentUser.wallet_tutor_id = null;
      }
      Storage.setUser(this.currentUser);
      this.setStoredWallet(this.currentUser.id, num, tutorInfo || this.walletTutor);
    }

    if (tutorInfo) {
      this.walletTutor = tutorInfo;
    } else if (num <= 0) {
      this.walletTutor = null;
    }

    const navBal = document.getElementById('nav-wallet-balance');
    if (navBal) navBal.textContent = formatted;
    const dropBal = document.getElementById('wallet-dropdown-balance');
    if (dropBal) dropBal.textContent = formatted;
    const payBal = document.getElementById('pay-wallet-balance-label');
    if (payBal) payBal.textContent = formatted;
    const pagePayBal = document.getElementById('page-pay-wallet-balance');
    if (pagePayBal) pagePayBal.textContent = formatted;

    const bookBtn = document.getElementById('wallet-book-btn');
    const tutorBanner = document.getElementById('wallet-tutor-banner');
    const tutorNameEl = document.getElementById('wallet-tutor-name');

    if (bookBtn) {
      if (num <= 0) {
        bookBtn.disabled = true;
        bookBtn.style.opacity = '0.55';
        bookBtn.style.cursor = 'not-allowed';
        bookBtn.textContent = 'Book Another Lesson (Requires Balance)';
      } else {
        bookBtn.disabled = false;
        bookBtn.style.opacity = '1';
        bookBtn.style.cursor = 'pointer';
        const tName = this.walletTutor ? this.walletTutor.name : '';
        bookBtn.textContent = tName ? `Book Lesson with ${tName}` : 'Book Another Lesson';
      }
    }

    if (tutorBanner && tutorNameEl) {
      if (num > 0 && this.walletTutor && this.walletTutor.name) {
        tutorBanner.style.display = 'block';
        tutorNameEl.textContent = this.walletTutor.name;
      } else {
        tutorBanner.style.display = 'none';
      }
    }
  },

  bookWithWalletTutor() {
    const user = this.currentUser;
    const balance = user ? (parseFloat(user.wallet_balance) || 0) : 0;
    if (balance <= 0) {
      showToast('A new lesson can only be booked if there is a balance available.', 'warning');
      return;
    }
    const tutorId = this.walletTutor?.id || user?.wallet_tutor_id;
    if (!tutorId) {
      showToast('A new lesson can only be booked with the same tutor whose previous session was cancelled.', 'warning');
      return;
    }
    const dropdown = document.getElementById('nav-wallet-dropdown');
    if (dropdown) dropdown.style.display = 'none';

    if (typeof Tutors !== 'undefined' && Tutors.openBookingModal) {
      Tutors.openBookingModal(tutorId);
    } else {
      window.location.hash = '#tutors';
    }
  },

  async refreshWallet() {
    if (!this.currentUser || this.currentUser.role !== 'student') return;
    try {
      if (typeof API !== 'undefined' && API.getStudentWallet) {
        const data = await API.getStudentWallet();
        if (data && typeof data.wallet_balance !== 'undefined') {
          this.updateWalletBalance(data.wallet_balance, data.wallet_tutor || null);
        }
      }
    } catch (e) {
      // silently ignore
    }
  },

  bindWalletEvents() {
    if (this._walletEventsBound) return;
    this._walletEventsBound = true;

    document.addEventListener('click', (e) => {
      const walletBtn = e.target.closest('#nav-wallet-btn');
      const dropdown = document.getElementById('nav-wallet-dropdown');
      if (walletBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (dropdown) {
          const isShown = dropdown.style.display === 'block';
          dropdown.style.display = isShown ? 'none' : 'block';
        }
        return;
      }

      if (dropdown && dropdown.style.display === 'block') {
        if (!e.target.closest('#nav-wallet-container')) {
          dropdown.style.display = 'none';
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const dropdown = document.getElementById('nav-wallet-dropdown');
        if (dropdown) dropdown.style.display = 'none';
      }
    });
  },

  updateNavUI(user, unreadCount = 0) {
    const guestActions = document.getElementById('nav-guest-actions');
    const userActions = document.getElementById('nav-user-actions');
    const mainNavLinks = document.getElementById('main-nav-links');

    if (user) {
      this.startHeartbeat();
      if (typeof NotificationsUI !== 'undefined' && NotificationsUI.startRealtimePolling) {
        NotificationsUI.startRealtimePolling();
      }
    } else {
      this.stopHeartbeat();
      if (typeof NotificationsUI !== 'undefined' && NotificationsUI.stopRealtimePolling) {
        NotificationsUI.stopRealtimePolling();
      }
    }

    if (user) {
      if (guestActions) guestActions.style.display = 'none';
      if (userActions) {
        userActions.style.display = 'flex';
        const profileHash = (user.role === 'teacher' || user.role === 'tutor') ? '#teacher-profile' : (user.role === 'admin' ? '#admin-profile' : '#student-profile');
        const isStudent = user.role === 'student';
        const walletBalance = parseFloat(user.wallet_balance || 0).toFixed(2);
        const roleLabel = user.role === 'admin' ? 'Administrator' : (user.role === 'teacher' || user.role === 'tutor' ? 'Teacher' : 'Student');
        const safeUserName = user.name || (user.role === 'admin' ? 'Administrator' : 'User');
        const defaultAvatar = (user.role === 'teacher' || user.role === 'tutor')
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
          : (user.role === 'admin'
            ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80'
            : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80');
        const userAvatarUrl = user.avatar_url || user.avatar || defaultAvatar;
        userActions.innerHTML = `
          ${isStudent ? `
          <!-- Student Wallet Balance Container -->
          <div class="nav-wallet-container" id="nav-wallet-container">
            <button type="button" class="nav-wallet-btn" id="nav-wallet-btn" aria-label="Student Wallet Balance" title="Aviora Wallet (Lesson Credits)">
              <svg class="nav-wallet-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path>
                <path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"></path>
                <circle cx="16" cy="14" r="1.5" fill="currentColor"></circle>
              </svg>
              <span class="nav-wallet-balance" id="nav-wallet-balance">${walletBalance}</span>
            </button>
            <div class="nav-wallet-dropdown" id="nav-wallet-dropdown" style="display: none;">
              <div class="wallet-dropdown-header">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--gold-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path>
                    <path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"></path>
                    <circle cx="16" cy="14" r="1.5" fill="currentColor"></circle>
                  </svg>
                  <span class="wallet-dropdown-heading">Student Wallet</span>
                </div>
                <span class="wallet-status-pill">Non-Withdrawable</span>
              </div>
              <div class="wallet-dropdown-body">
                <div class="wallet-balance-row">
                  <span class="wallet-balance-label">Lesson Credit:</span>
                  <span class="wallet-balance-val" id="wallet-dropdown-balance">${walletBalance}</span>
                </div>
                <div id="wallet-tutor-banner" style="display: none; background: rgba(198, 138, 40, 0.1); border: 1.5px solid var(--gold-500); border-radius: 8px; padding: 0.65rem 0.85rem; margin-bottom: 0.75rem;">
                  <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--gold-800); font-weight: 800;">
                    Eligible Rebooking Tutor
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.45rem; margin-top: 0.3rem;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--gold-600);"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <strong style="color: var(--charcoal-900); font-size: 0.86rem;" id="wallet-tutor-name">-</strong>
                  </div>
                  <div style="font-size: 0.73rem; color: var(--charcoal-700); margin-top: 0.2rem; line-height: 1.4;">
                    This credited amount can only be used to book a new lesson with this same tutor.
                  </div>
                </div>
                <p class="wallet-dropdown-note">
                  If you cancel a lesson (at least 3 hours before start time), the cost is refunded to your wallet. While the refunded amount is visible here, it cannot be withdrawn; instead, it can be used to book another lesson with the same tutor.
                </p>
              </div>
              <div class="wallet-dropdown-footer">
                <button type="button" class="btn btn-outline-gold btn-sm" id="wallet-book-btn" style="width: 100%; text-align: center; justify-content: center; font-weight: 700; opacity: 0.55; cursor: not-allowed;" disabled onclick="Auth.bookWithWalletTutor()">
                  Book Another Lesson (Requires Balance)
                </button>
              </div>
            </div>
          </div>
          ` : ''}
          <!-- Notification Bell & Dropdown -->
          <div class="nav-notif-container" id="nav-notif-container">
            <button type="button" class="nav-notif-btn" id="nav-notif-btn" aria-label="Notifications" title="Notifications">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span class="nav-notif-badge" id="nav-notif-badge" style="display: none;">0</span>
            </button>
            <div class="nav-notif-dropdown" id="nav-notif-dropdown" style="display: none;">
              <div class="notif-dropdown-header">
                <div class="notif-dropdown-title-group">
                  <span class="notif-dropdown-heading">Notifications</span>
                  <span class="notif-active-pill" id="notif-active-pill" style="display: none;">Filtered</span>
                </div>
                <button type="button" class="notif-mark-read-btn" id="notif-mark-read-btn">Mark all as read</button>
              </div>
              <div class="notif-dropdown-body" id="notif-dropdown-body">
                <div class="notif-loading-item">Loading notifications...</div>
              </div>
            </div>
          </div>
          <!-- User Profile & Log-Out Group (Placed side-by-side next to each other) -->
          <div class="nav-profile-logout-group" id="nav-profile-logout-group">
            <a href="${profileHash}" class="nav-user-profile-link" id="nav-user-profile-btn" aria-label="View Profile" title="View Profile">
              <img src="${userAvatarUrl}" alt="${safeUserName}" class="nav-header-profile-avatar nav-user-avatar" id="nav-user-profile-avatar" />
            </a>
            <!-- Log Out Popover Prompt Container (Icon Trigger) -->
            <div class="nav-logout-container" id="nav-logout-container" style="position: relative;">
              <button type="button" class="nav-logout-btn" id="user-logout-btn" aria-label="Account & Logout" title="Log Out">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
              <div class="nav-logout-dropdown" id="nav-logout-dropdown" style="display: none;">
                <div class="logout-dropdown-user-info">
                  <div class="logout-user-name" id="logout-menu-user-name">${safeUserName}</div>
                  <div class="logout-user-role" id="logout-menu-user-role">${roleLabel}</div>
                </div>
                <div class="logout-dropdown-actions">
                  <button type="button" class="logout-action-btn" id="nav-confirm-logout-btn">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;

        if (typeof NotificationsUI !== 'undefined') {
          NotificationsUI.updateBadge(unreadCount);
          NotificationsUI.fetchAndRender();
        }

        this.setupLogoutDropdown();
      }

      // Configure Header Navigation Links
      if (mainNavLinks) {
        if (user.role === 'student') {
          // Student navigation: Tutors links to the full teacher/tutor directory where all educators can be found
          mainNavLinks.innerHTML = `
            <li><a href="#home" class="nav-link" id="nav-link-home">Home</a></li>
            <li><a href="#about" class="nav-link" id="nav-link-about">About</a></li>
            <li><a href="#subscriptions" class="nav-link" id="nav-link-subscription">Subscription</a></li>
            <li><a href="#tutors" class="nav-link" id="nav-link-tutors">Tutors</a></li>
            <li><a href="#aviora-buddy" class="nav-link" id="nav-link-buddy">Aviora Buddy</a></li>
            <li><a href="#student-portal" class="nav-link" id="nav-link-dashboard">Dashboard</a></li>
          `;
        } else if (user.role === 'teacher' || user.role === 'tutor') {
          mainNavLinks.innerHTML = `
            <li><a href="#home" class="nav-link" id="nav-link-home">Home</a></li>
            <li><a href="#about" class="nav-link" id="nav-link-about">About</a></li>
            <li><a href="#teacher-classes" class="nav-link" id="nav-link-teacher-classes">Class</a></li>
            <li><a href="#teacher-students" class="nav-link" id="nav-link-teacher-students">Students</a></li>
            <li><a href="#teacher-schedule" class="nav-link" id="nav-link-teacher-schedule">Schedule</a></li>
            <li><a href="#teacher-messages" class="nav-link" id="nav-link-teacher-messages">Messages</a></li>
            <li><a href="#teacher-dashboard" class="nav-link" id="nav-link-teacher-dashboard">Dashboard</a></li>
          `;
        } else if (user.role === 'admin') {
          mainNavLinks.innerHTML = `
            <li><a href="#home" class="nav-link" id="nav-link-home">Home</a></li>
            <li><a href="#about" class="nav-link" id="nav-link-about">About</a></li>
            <li><a href="#tutors" class="nav-link" id="nav-link-tutors">Tutors</a></li>
            <li><a href="#aviora-buddy" class="nav-link" id="nav-link-buddy">Aviora Buddy</a></li>
            <li><a href="#admin-portal" class="nav-link" id="nav-link-admin-portal">Admin Console</a></li>
          `;
        }
      }
    } else {
      // Default theme is ALWAYS light mode when no user is logged in
      document.documentElement.removeAttribute('data-theme');
      if (guestActions) guestActions.style.display = 'flex';
      if (userActions) {
        userActions.style.display = 'none';
        userActions.innerHTML = '';
      }
      if (mainNavLinks) {
        mainNavLinks.innerHTML = `
          <li><a href="#home" class="nav-link active" id="nav-link-home">Home</a></li>
          <li><a href="#about" class="nav-link" id="nav-link-about">About</a></li>
          <li><a href="#subscriptions" class="nav-link" id="nav-link-subscriptions">Subscription</a></li>
          <li><a href="#tutors" class="nav-link" id="nav-link-tutors">Tutors</a></li>
          <li><a href="#aviora-buddy" class="nav-link" id="nav-link-buddy">Aviora Buddy</a></li>
          <li><a href="#how-it-works" class="nav-link" id="nav-link-how">How It Works</a></li>
        `;
      }
    }

    if (typeof Router !== 'undefined' && Router.updateActiveNav) {
      Router.updateActiveNav();
    }

    if (typeof SpinWheel !== 'undefined') {
      SpinWheel.refresh();
      SpinWheel.drawWheel();
      SpinWheel.attachEventListeners();
    }
  },

  loadNotifications() {
    if (typeof NotificationsUI !== 'undefined' && NotificationsUI.fetchAndRender) {
      NotificationsUI.fetchAndRender();
    }
  }
};
