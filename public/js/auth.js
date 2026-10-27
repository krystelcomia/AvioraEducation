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
    this.ensurePersistentAccounts();
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
      this.updateNavUI(data.user, data.unreadNotifications);
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
    if (typeof Profile !== 'undefined' && Profile.syncAllPreferences) {
      Profile.syncAllPreferences(prefs, false);
    } else {
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
    this.saveCreatedAccount({
      name: 'Joshua Garcia',
      email: 'joshuagarcia@gmail.com',
      password: 'Joshua123_',
      role: 'teacher',
      phone: '+1 (555) 234-5678',
      headline: 'Mathematics & Calculus Specialist',
      subjects: 'Mathematics, Algebra, Calculus'
    });
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
        } else if (role === 'teacher' || role === 'tutor') {
          await this.fastDemoLogin('elena.vance@aviora.edu', 'teacher123', '#teacher-dashboard');
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
      // If tutor has not submitted credentials and resume/diploma yet, direct to application form
      try {
        const statusData = await API.getTeacherStatus();
        const app = statusData?.application;
        const hasSubmitted = !!(app && app.resume_file && (app.diploma_file || app.credentials_file));
        if (!hasSubmitted) {
          window.location.hash = '#teacher-application';
        } else {
          window.location.hash = '#teacher-dashboard';
        }
      } catch (e) {
        window.location.hash = '#teacher-application';
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

  confirmLogout() {
    const title = (typeof I18n !== 'undefined' && I18n.t) 
      ? I18n.t('auth.confirm_logout_title', 'Confirm Log Out') 
      : 'Confirm Log Out';
    const message = (typeof I18n !== 'undefined' && I18n.t) 
      ? I18n.t('auth.confirm_logout_msg', 'Are you sure you want to log out of your Aviora Education account? This prevents accidental session loss.') 
      : 'Are you sure you want to log out of your Aviora Education account? This prevents accidental session loss.';
    const confirmText = (typeof I18n !== 'undefined' && I18n.t) 
      ? I18n.t('nav.logout', 'Log Out') 
      : 'Log Out';
    const cancelText = (typeof I18n !== 'undefined' && I18n.t) 
      ? I18n.t('common.cancel', 'Cancel') 
      : 'Cancel';

    if (typeof showConfirm === 'function') {
      showConfirm(title, message, () => {
        this.performLogout();
      }, {
        confirmText,
        cancelText
      });
    } else if (window.confirm(message)) {
      this.performLogout();
    }
  },

  performLogout() {
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

    showToast('You have been securely logged out.', 'info');
    window.location.hash = '#home';
    Router.handleRoute();
  },

  logout(skipConfirm = false) {
    if (skipConfirm) {
      this.performLogout();
      return;
    }
    this.confirmLogout();
  },

  updateNavUI(user, unreadCount = 0) {
    const guestActions = document.getElementById('nav-guest-actions');
    const userActions = document.getElementById('nav-user-actions');
    const mainNavLinks = document.getElementById('main-nav-links');

    if (user) {
      if (guestActions) guestActions.style.display = 'none';
      if (userActions) {
        userActions.style.display = 'flex';
        const profileHash = '#student-profile';
        userActions.innerHTML = `
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
                  <span class="notif-active-pill" id="notif-active-pill" title="Notifications are filtered according to your preferences">Filtered</span>
                </div>
                <button type="button" class="notif-mark-read-btn" id="notif-mark-read-btn">Mark all read</button>
              </div>
              <div class="notif-dropdown-body" id="notif-dropdown-body">
                <div class="notif-loading-item">Loading notifications...</div>
              </div>
              <div class="notif-dropdown-footer">
                <a href="${profileHash}" class="notif-manage-link" id="notif-manage-link">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                  Notification Preferences
                </a>
              </div>
            </div>
          </div>
          <a href="${profileHash}" class="nav-link header-text-action" id="nav-user-profile-btn">Profile</a>
          <button type="button" class="nav-link header-text-action" id="user-logout-btn">Log Out</button>
        `;

        if (typeof NotificationsUI !== 'undefined') {
          NotificationsUI.updateBadge(unreadCount);
          NotificationsUI.fetchAndRender();
        }

        const logoutBtn = document.getElementById('user-logout-btn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
          });
        }
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
            <li><a href="#teacher-buddy" class="nav-link" id="nav-link-teacher-buddy">Aviora Buddy</a></li>
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
  }
};
