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
    const hasTyped = (password || '').length > 0;

    const strengthBox = document.getElementById(`${prefix}-password-strength-box`);
    if (strengthBox) {
      strengthBox.style.display = hasTyped ? 'block' : 'none';
      if (!hasTyped || evalResult.isStrong) {
        strengthBox.style.borderColor = '';
      }
    }

    const confirmInputMap = {
      page: 'page-reg-confirm',
      modal: 'reg-confirm',
      forgot: 'forgot-confirm-password'
    };
    const confirmGroup = document.getElementById(`${prefix}-password-confirm-group`);
    const confirmInput = document.getElementById(confirmInputMap[prefix]);
    const matchMsg = document.getElementById(`${prefix}-password-match-msg`);

    if (confirmGroup) {
      confirmGroup.style.display = evalResult.isStrong ? 'block' : 'none';
    }
    if (confirmInput) {
      confirmInput.required = evalResult.isStrong;
    }
    if (prefix === 'modal') {
      const modalGrid = document.getElementById('modal-confirm-phone-grid');
      if (modalGrid) {
        modalGrid.style.gridTemplateColumns = evalResult.isStrong ? '1fr 1fr' : '1fr';
      }
    }
    if (matchMsg && !evalResult.isStrong) {
      matchMsg.style.display = 'none';
    }

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
        if (data.wallet_details) {
          this.walletDetails = data.wallet_details;
        }
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
      const synced = await this.tryAutoSyncCurrentUser();
      if (synced && this.currentUser) {
        this.updateNavUI(this.currentUser);
        if (this.currentUser.role === 'student') {
          this.refreshWallet();
        }
        return;
      }
      Storage.clearSession();
      this.currentUser = null;
      document.documentElement.removeAttribute('data-theme');
      try { localStorage.removeItem('aviora_theme'); } catch(e){}
      this.updateNavUI(null);
    }
  },

  async tryAutoSyncCurrentUser() {
    if (this._autoSyncPromise) return this._autoSyncPromise;
    this._autoSyncPromise = (async () => {
      try {
        const storedUser = Storage.getUser();
        if (!storedUser || !storedUser.email) return false;
        const savedAccount = this.getSavedCreatedAccount(storedUser.email);
        if (!savedAccount || !savedAccount.password) return false;

        const savedPrefs = Storage.getUserPreferences(storedUser.id) || {};
        const res = await fetch('/api/auth/sync-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: savedAccount.name || storedUser.name,
            email: storedUser.email.toLowerCase().trim(),
            password: savedAccount.password,
            role: savedAccount.role || storedUser.role || 'student',
            phone: savedAccount.phone || storedUser.phone || null,
            country: savedAccount.country || savedPrefs.country || storedUser.country || 'United States',
            timezone: savedAccount.timezone || savedPrefs.timezone || storedUser.timezone,
            language: savedAccount.language || savedPrefs.language || storedUser.language,
            grade_level: savedAccount.grade_level,
            school: savedAccount.school,
            learning_goals: savedAccount.learning_goals,
            target_subjects: savedAccount.target_subjects,
            headline: savedAccount.headline,
            subjects: savedAccount.subjects,
            institution: savedAccount.institution,
            highest_degree: savedAccount.highest_degree,
            years_experience: savedAccount.years_experience,
            bio: savedAccount.bio
          })
        });
        if (!res.ok) return false;
        const data = await res.json();
        if (!data || !data.token || !data.user) return false;

        Storage.setToken(data.token);
        Storage.setUser(data.user);
        this.currentUser = data.user;
        if (data.preferences) {
          Storage.setUserPreferences(data.user.id, data.preferences);
          this.syncUserPreferences(data.preferences);
        }
        return true;
      } catch (e) {
        return false;
      } finally {
        this._autoSyncPromise = null;
      }
    })();
    return this._autoSyncPromise;
  },

  syncUserPreferences(prefs) {
    if (!this.currentUser) {
      document.documentElement.removeAttribute('data-theme');
      return;
    }
    const uid = this.currentUser.id;
    try {
      if (uid && prefs) {
        Storage.setUserPreferences(uid, prefs);
        if (prefs.language) localStorage.setItem(`aviora_language_${uid}`, prefs.language);
        if (prefs.country) localStorage.setItem(`aviora_country_${uid}`, prefs.country);
        if (prefs.timezone) localStorage.setItem(`aviora_timezone_${uid}`, prefs.timezone);
        this.currentUser.country = prefs.country || this.currentUser.country;
        this.currentUser.timezone = prefs.timezone || this.currentUser.timezone;
        this.currentUser.language = prefs.language || this.currentUser.language;
        Storage.setUser(this.currentUser);
      }
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
    const existing = accounts[joshuaEmail];
    if (!existing || existing.avatar_url === 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80') {
      this.saveCreatedAccount({
        name: existing?.name || 'Joshua Garcia',
        email: joshuaEmail,
        password: existing?.password || 'Joshua123_',
        role: 'teacher',
        phone: existing?.phone || '+1 (555) 234-5678',
        headline: existing?.headline || 'Mathematics & Calculus Specialist',
        subjects: existing?.subjects || 'Mathematics, Algebra',
        country: existing?.country || 'Philippines',
        timezone: existing?.timezone || 'Asia/Manila',
        institution: existing?.institution || 'University of California, Berkeley',
        highest_degree: existing?.highest_degree || 'Bachelor of Science in Education',
        hourly_rate: existing?.hourly_rate || 45,
        bio: existing?.bio || 'Dedicated mathematics educator passionate about guiding students through algebra, geometry, and calculus with interactive problem solving.',
        avatar_url: existing?.avatar_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80'
      });
    }
  },

  saveCreatedAccount(account) {
    if (!account || !account.email) return;
    try {
      const accounts = this.getCreatedAccounts();
      const email = account.email.toLowerCase().trim();
      accounts[email] = {
        name: account.name || accounts[email]?.name || 'Aviora Member',
        email,
        password: account.password || accounts[email]?.password,
        role: account.role || accounts[email]?.role || 'student',
        phone: account.phone !== undefined ? account.phone : (accounts[email]?.phone || null),
        grade_level: account.grade_level || accounts[email]?.grade_level,
        school: account.school || accounts[email]?.school,
        learning_goals: account.learning_goals || accounts[email]?.learning_goals,
        target_subjects: account.target_subjects || accounts[email]?.target_subjects,
        headline: account.headline || accounts[email]?.headline,
        subjects: account.subjects || accounts[email]?.subjects,
        country: account.country || accounts[email]?.country,
        timezone: account.timezone || accounts[email]?.timezone,
        language: account.language || accounts[email]?.language,
        institution: account.institution || accounts[email]?.institution,
        highest_degree: account.highest_degree || accounts[email]?.highest_degree,
        years_experience: account.years_experience || accounts[email]?.years_experience,
        hourly_rate: account.hourly_rate || accounts[email]?.hourly_rate,
        bio: account.bio || accounts[email]?.bio,
        avatar_url: account.avatar_url || account.avatar || accounts[email]?.avatar_url,
        created_at: accounts[email]?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
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
      pageRegisterForm.addEventListener('submit', (e) => {
        const step2 = document.getElementById('page-register-step-2');
        if (step2 && step2.style.display === 'none') {
          e.preventDefault();
          this.goToSignupStep2();
          return;
        }
        this.handleRegister(e, 'page');
      });
    }

    const nextStepBtn = document.getElementById('page-reg-next-btn');
    if (nextStepBtn) {
      nextStepBtn.addEventListener('click', () => this.goToSignupStep2());
    }
    const backStepBtn = document.getElementById('page-reg-back-btn');
    if (backStepBtn) {
      backStepBtn.addEventListener('click', () => this.backToSignupStep1());
    }
    const editStep1Btn = document.getElementById('page-reg-edit-step1-btn');
    if (editStep1Btn) {
      editStep1Btn.addEventListener('click', () => this.backToSignupStep1());
    }

    const regCountrySelect = document.getElementById('page-reg-country');
    if (regCountrySelect) {
      regCountrySelect.addEventListener('change', () => this.onSignupLocationChanged(true));
    }
    const regTzSelect = document.getElementById('page-reg-timezone');
    if (regTzSelect) {
      regTzSelect.addEventListener('change', () => this.onSignupLocationChanged(false));
    }
    const regLangSelect = document.getElementById('page-reg-language');
    if (regLangSelect) {
      regLangSelect.addEventListener('change', () => this.onSignupLocationChanged(false));
    }

    window.addEventListener('hashchange', () => {
      if (window.location.hash !== '#signup') {
        this.resetSignupFlow();
      }
    });

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
      PasswordValidator.updateUI('page', pagePasswordInput.value);
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
      PasswordValidator.updateUI('modal', modalPasswordInput.value);
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
      PasswordValidator.updateUI('forgot', forgotPasswordInput.value);
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

    if (!confirm || !PasswordValidator.evaluate(pass).isStrong) {
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

  getKnownGoogleAccounts() {
    try {
      const raw = localStorage.getItem('aviora_known_google_accounts');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(a => a && a.email) : [];
    } catch (e) {
      return [];
    }
  },

  rememberGoogleAccount(profile) {
    if (!profile || !profile.email) return;
    try {
      const cleanEmail = String(profile.email).toLowerCase().trim();
      const list = this.getKnownGoogleAccounts().filter(a => String(a.email).toLowerCase().trim() !== cleanEmail);
      list.unshift({
        name: profile.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        avatar: profile.avatar || profile.picture || ''
      });
      localStorage.setItem('aviora_known_google_accounts', JSON.stringify(list.slice(0, 6)));
    } catch (e) {}
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
      if (provider === 'google') {
        this.rememberGoogleAccount(data);
      }
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

    let extraParams = '';
    if (provider === 'google') {
      const known = this.getKnownGoogleAccounts();
      if (known.length > 0) {
        try {
          const encodedKnown = btoa(unescape(encodeURIComponent(JSON.stringify(known))))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          extraParams = `&known=${encodeURIComponent(encodedKnown)}`;
        } catch (e) {}
      }
    }

    // Direct platform OAuth redirection
    window.location.href = `/api/auth/${provider}?mode=${encodeURIComponent(mode)}&role=${encodeURIComponent(role)}${extraParams}`;
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
      const userIdParam = params.get('userId');
      const provider = params.get('provider') || 'google';
      const name = params.get('name') || 'Social Scholar';
      const email = params.get('email') || '';
      const linkedGmailParam = params.get('linkedGmail') || email;
      const role = params.get('role') || 'student';
      const avatar = params.get('avatar') || '';

      if (!token) {
        return;
      }

      // Store authenticated session token
      Storage.setToken(token);

      const decodedEmail = decodeURIComponent(email);
      const decodedLinkedGmail = decodeURIComponent(linkedGmailParam);
      let userObj = {
        id: userIdParam ? (Number(decodeURIComponent(userIdParam)) || decodeURIComponent(userIdParam)) : decodedEmail,
        name: decodeURIComponent(name),
        email: decodedEmail,
        linked_google_email: decodedLinkedGmail,
        role,
        avatar_url: decodeURIComponent(avatar),
        auth_provider: provider,
        status: 'active'
      };
      let unreadCount = 0;

      // Hydrate full numeric user profile, linked accounts & Gmail preferences from server
      try {
        const meData = await API.getMe();
        if (meData && meData.user) {
          userObj = meData.user;
          unreadCount = meData.unreadNotifications || 0;
          if (meData.preferences) {
            this.syncUserPreferences(meData.preferences);
          }
        }
      } catch (meErr) {
        console.warn('Post-OAuth getMe hydration fallback:', meErr.message);
      }

      Storage.setUser(userObj);
      this.currentUser = userObj;

      // Save linked account locally for 1-click return logins & chooser memory
      this.saveLinkedAccount(provider, {
        name: userObj.name,
        email: decodedLinkedGmail || userObj.email,
        avatar: userObj.avatar_url,
        role: userObj.role,
        id: userObj.id
      });

      this.updateNavUI(userObj, unreadCount);
      this.updateLinkedAccountBadges();
      this.startHeartbeat();

      if (typeof NotificationsUI !== 'undefined' && NotificationsUI.updateGmailBanner) {
        NotificationsUI.updateGmailBanner(userObj.linked_google_email || decodedLinkedGmail || userObj.email);
      }
      if (userObj.role === 'student') {
        this.refreshWallet();
      }

      showToast(
        provider === 'google'
          ? `Welcome, ${userObj.name}! Google account (${decodedLinkedGmail || userObj.email}) linked for notifications & recovery.`
          : `Welcome, ${userObj.name}! Account linked with Facebook.`,
        'success'
      );

      await this.handlePostAuthRedirect(userObj);
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

  resetSignupFlow() {
    const step1 = document.getElementById('page-register-step-1');
    const step2 = document.getElementById('page-register-step-2');
    const subtitle = document.getElementById('page-signup-subtitle');
    const pill1 = document.getElementById('page-signup-pill-1');
    const pill2 = document.getElementById('page-signup-pill-2');

    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
    if (subtitle) subtitle.textContent = 'Step 1 of 2: Enter your account credentials';
    if (pill1) {
      pill1.style.background = 'var(--gold-500, #C59D28)';
      pill1.style.color = '#111827';
      pill1.style.fontWeight = '700';
    }
    if (pill2) {
      pill2.style.background = 'rgba(0, 0, 0, 0.06)';
      pill2.style.color = 'var(--text-secondary)';
      pill2.style.fontWeight = '600';
    }
  },

  onSignupLocationChanged(autoSyncFromCountry = true) {
    const countryEl = document.getElementById('page-reg-country');
    const tzEl = document.getElementById('page-reg-timezone');
    const langEl = document.getElementById('page-reg-language');
    const previewTime = document.getElementById('page-reg-preview-time');
    const previewCurr = document.getElementById('page-reg-preview-currency');
    const previewLang = document.getElementById('page-reg-preview-language');

    const country = countryEl ? countryEl.value : 'United States';
    if (autoSyncFromCountry && typeof AvioraGeo !== 'undefined') {
      const defTz = AvioraGeo.getDefaultTimezone(country);
      const defLang = typeof AvioraGeo.getDefaultLanguage === 'function' ? AvioraGeo.getDefaultLanguage(country) : 'en-US';
      if (tzEl && defTz) {
        if (!Array.from(tzEl.options).some(o => o.value === defTz)) {
          const opt = document.createElement('option');
          opt.value = defTz;
          opt.textContent = `${defTz} (${AvioraGeo.getTimezoneAbbr(defTz)})`;
          tzEl.appendChild(opt);
        }
        tzEl.value = defTz;
      }
      if (langEl && defLang) {
        langEl.value = defLang;
      }
    }

    const activeTz = tzEl ? tzEl.value : (typeof AvioraGeo !== 'undefined' ? AvioraGeo.getDefaultTimezone(country) : 'America/New_York');
    if (previewTime && typeof AvioraGeo !== 'undefined') {
      const nowStr = AvioraGeo.getCurrentTimeInZone(activeTz);
      const abbr = AvioraGeo.getTimezoneAbbr(activeTz);
      previewTime.textContent = `${nowStr} (${abbr})`;
    }
    if (previewCurr && typeof AvioraGeo !== 'undefined') {
      const cObj = AvioraGeo.getCountry(country);
      previewCurr.textContent = cObj ? `${cObj.symbol} ${cObj.currency}` : '$ USD';
    }
    if (previewLang && langEl) {
      const selectedOpt = langEl.options[langEl.selectedIndex];
      previewLang.textContent = selectedOpt ? selectedOpt.textContent.split(' (')[0] : 'English';
    }
  },

  async goToSignupStep2() {
    const nameEl = document.getElementById('page-reg-name');
    const emailEl = document.getElementById('page-reg-email');
    const passEl = document.getElementById('page-reg-password');
    const confirmEl = document.getElementById('page-reg-confirm');
    const nextBtn = document.getElementById('page-reg-next-btn');

    const name = nameEl ? nameEl.value.trim() : '';
    const email = emailEl ? emailEl.value.trim() : '';
    const password = passEl ? passEl.value : '';
    const confirmPassword = confirmEl ? confirmEl.value : '';

    if (!name) {
      showToast('Please enter your full name.', 'error');
      if (nameEl) nameEl.focus();
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      showToast('Please enter a valid email address.', 'error');
      if (emailEl) emailEl.focus();
      return;
    }
    const passEval = PasswordValidator.evaluate(password);
    if (!passEval.isStrong) {
      showToast('Please fulfill all 5 strong password requirements before continuing.', 'error');
      const strengthBox = document.getElementById('page-password-strength-box');
      if (strengthBox) {
        strengthBox.style.display = 'block';
        strengthBox.style.borderColor = 'rgba(239, 68, 68, 0.7)';
      }
      if (passEl) passEl.focus();
      return;
    }
    if (!confirmPassword || password !== confirmPassword) {
      showToast(!confirmPassword ? 'Please confirm your password.' : 'Passwords do not match. Please verify.', 'error');
      if (confirmEl) confirmEl.focus();
      return;
    }

    // Verify full name and email/Gmail have not already been used on Aviora before advancing to Step 2
    if (typeof API !== 'undefined' && typeof API.checkAvailability === 'function') {
      const origHtml = nextBtn ? nextBtn.innerHTML : 'Next →';
      try {
        if (nextBtn) {
          nextBtn.disabled = true;
          nextBtn.textContent = 'Checking availability...';
        }
        await API.checkAvailability({ name, email });
      } catch (availErr) {
        showToast(availErr.message || 'This name or email address is already in use.', 'error');
        if (availErr.field === 'name' && nameEl) {
          nameEl.focus();
        } else if (availErr.field === 'email' && emailEl) {
          emailEl.focus();
        }
        return;
      } finally {
        if (nextBtn) {
          nextBtn.disabled = false;
          nextBtn.innerHTML = origHtml;
        }
      }
    }

    const roleRadio = document.querySelector('input[name="page_register_role"]:checked');
    const role = roleRadio ? roleRadio.value : 'student';
    this.togglePageRoleFields(role);

    const step1 = document.getElementById('page-register-step-1');
    const step2 = document.getElementById('page-register-step-2');
    const subtitle = document.getElementById('page-signup-subtitle');
    const pill1 = document.getElementById('page-signup-pill-1');
    const pill2 = document.getElementById('page-signup-pill-2');
    const summaryText = document.getElementById('page-reg-summary-text');

    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'block';
    if (subtitle) subtitle.textContent = 'Step 2 of 2: Complete your profile & regional setup';
    if (pill1) {
      pill1.style.background = 'rgba(16, 185, 129, 0.14)';
      pill1.style.color = '#047857';
      pill1.style.fontWeight = '700';
    }
    if (pill2) {
      pill2.style.background = 'var(--gold-500, #C59D28)';
      pill2.style.color = '#111827';
      pill2.style.fontWeight = '700';
    }
    if (summaryText) {
      const roleLabel = (role === 'tutor' || role === 'teacher') ? 'Prospective Tutor' : 'Student / Parent';
      summaryText.textContent = `${name} • ${email} • ${roleLabel}`;
    }

    const countryEl = document.getElementById('page-reg-country');
    const tzEl = document.getElementById('page-reg-timezone');
    const langEl = document.getElementById('page-reg-language');
    const countryChanged = !countryEl || !countryEl.dataset.userTouched;
    this.onSignupLocationChanged(countryChanged);
    if (countryEl && !countryEl._touchBound) {
      countryEl._touchBound = true;
      countryEl.addEventListener('change', () => { countryEl.dataset.userTouched = '1'; });
    }
    if (tzEl && !tzEl._touchBound) { tzEl._touchBound = true; }
    if (langEl && !langEl._touchBound) { langEl._touchBound = true; }
  },

  backToSignupStep1() {
    this.resetSignupFlow();
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
        strengthBox.style.display = 'block';
        strengthBox.style.borderColor = 'rgba(239, 68, 68, 0.7)';
        strengthBox.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
      return;
    }

    // Confirm Password Matching
    if (!confirmPassword || password !== confirmPassword) {
      showToast(!confirmPassword ? 'Please confirm your password.' : 'Passwords do not match. Please verify.', 'error');
      return;
    }

    const payload = { name, email, password, role, phone };

    if (isPage) {
      const countryEl = document.getElementById('page-reg-country');
      const tzEl = document.getElementById('page-reg-timezone');
      const langEl = document.getElementById('page-reg-language');
      const country = countryEl ? countryEl.value : 'United States';
      const timezone = tzEl ? tzEl.value : (typeof AvioraGeo !== 'undefined' ? AvioraGeo.getDefaultTimezone(country) : 'America/New_York');
      const language = langEl ? langEl.value : (typeof AvioraGeo !== 'undefined' && typeof AvioraGeo.getDefaultLanguage === 'function' ? AvioraGeo.getDefaultLanguage(country) : 'en-US');
      payload.country = country;
      payload.timezone = timezone;
      payload.language = language;
    }

    if (role === 'student') {
      const gradeEl = document.getElementById(isPage ? 'page-reg-grade' : 'reg-student-grade');
      const schoolEl = document.getElementById(isPage ? 'page-reg-school' : 'reg-student-school');
      const goalsEl = document.getElementById('page-reg-goals');
      const targetSubjEl = document.getElementById('page-reg-target-subjects');
      payload.grade_level = gradeEl ? gradeEl.value : 'Grade 11 - High School';
      payload.school = schoolEl ? schoolEl.value.trim() : '';
      if (goalsEl && goalsEl.value.trim()) payload.learning_goals = goalsEl.value.trim();
      if (targetSubjEl && targetSubjEl.value.trim()) payload.target_subjects = targetSubjEl.value.trim();
    } else if (role === 'tutor' || role === 'teacher') {
      const headlineEl = document.getElementById(isPage ? 'page-reg-headline' : 'reg-teacher-headline');
      const subjectsEl = document.getElementById(isPage ? 'page-reg-subjects' : 'reg-teacher-subjects');
      const instEl = document.getElementById('page-reg-institution');
      const expEl = document.getElementById('page-reg-experience');
      const bioEl = document.getElementById('page-reg-bio');
      payload.headline = headlineEl && headlineEl.value.trim() ? headlineEl.value.trim() : 'Educator & Academic Specialist';
      payload.subjects = subjectsEl && subjectsEl.value.trim() ? subjectsEl.value.trim() : 'Mathematics, Natural Sciences';
      if (instEl && instEl.value.trim()) payload.institution = instEl.value.trim();
      if (expEl && expEl.value) payload.years_experience = parseInt(expEl.value, 10) || 2;
      if (bioEl && bioEl.value.trim()) payload.bio = bioEl.value.trim();
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Account...';

      const res = await API.register(payload);

      // Save created account to persistent local store ONLY after server accepts registration
      this.saveCreatedAccount({
        ...payload,
        id: res.user?.id,
        avatar_url: res.user?.avatar_url
      });

      Storage.setToken(res.token);
      Storage.setUser(res.user);
      this.currentUser = res.user;
      if (res.tutorDraftProfile && typeof Teacher !== 'undefined') {
        Teacher.tutorDraftProfile = res.tutorDraftProfile;
      }
      if (typeof Profile !== 'undefined') {
        Profile.currentUser = res.user;
        if (res.studentProfile) Profile.studentProfile = res.studentProfile;
        if (res.preferences) Profile.userPreferences = res.preferences;
      }
      if (res.preferences) {
        this.syncUserPreferences(res.preferences);
      }

      if (isPage) {
        this.resetSignupFlow();
      }
      this.closeModal();
      this.updateNavUI(res.user);
      if (typeof AvioraGeo !== 'undefined' && typeof AvioraGeo.updateLiveClocks === 'function') {
        AvioraGeo.updateLiveClocks();
      }
      if (typeof AvioraCurrency !== 'undefined' && typeof AvioraCurrency.updateDOM === 'function') {
        AvioraCurrency.updateDOM();
      }
      const registeredLang = res.preferences?.language || res.user?.language || payload.language;
      if (registeredLang && typeof I18n !== 'undefined' && typeof I18n.applyLanguage === 'function') {
        I18n.applyLanguage(registeredLang, false);
      }
      
      if (res.user.role === 'teacher' || res.user.role === 'tutor') {
        showToast(`Account created successfully! Welcome to Aviora, ${res.user.name}. Your Tutor Dashboard is ready—please complete your credential application to unlock live tutoring operations.`, 'success');
        if (window.location.hash === '#teacher-dashboard') {
          if (typeof Router !== 'undefined' && Router.handleRoute) Router.handleRoute();
        } else {
          window.location.hash = '#teacher-dashboard';
        }
      } else {
        showToast(`Account created successfully! Welcome to Aviora, ${res.user.name}.`, 'success');
        if (window.location.hash === '#student-portal') {
          if (typeof Router !== 'undefined' && Router.handleRoute) Router.handleRoute();
        } else {
          window.location.hash = '#student-portal';
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
      if (isPage && (err.field === 'name' || err.field === 'email')) {
        this.backToSignupStep1();
        const conflictEl = document.getElementById(err.field === 'name' ? 'page-reg-name' : 'page-reg-email');
        if (conflictEl) conflictEl.focus();
      }
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

  async sendEmailJSNotification(notif, recipientEmail) {
    const email = recipientEmail || (this.currentUser && this.currentUser.email) || '';
    if (!email || !email.includes('@') || !notif) return false;

    const userName = (this.currentUser && this.currentUser.name) || 'Aviora Member';
    const title = notif.title || 'Aviora Notification';
    const message = notif.message || '';
    const cfg = await this.getOrInitEmailJS();
    let providerUsed = 'gmail_free_api';

    if (typeof emailjs !== 'undefined' && cfg && cfg.serviceId && cfg.templateId && cfg.publicKey) {
      try {
        await emailjs.send(
          cfg.serviceId,
          cfg.templateId,
          {
            to_email: email,
            recipient_email: email,
            email: email,
            to_name: userName,
            subject: `[Aviora Education] ${title}`,
            title: title,
            message: message,
            notification_type: notif.type || 'info',
            action_url: notif.link || '#student-portal',
            app_name: 'Aviora Education'
          },
          cfg.publicKey
        );
        providerUsed = 'emailjs_free_api';
      } catch (err) {
        // Fallback handled gracefully
      }
    }

    if (typeof API !== 'undefined' && API.syncGmailNotification && notif.id) {
      try {
        await API.syncGmailNotification({
          notificationId: notif.id,
          provider: providerUsed
        });
      } catch (e) {}
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
      const deliveryEmail = res.recoveryEmail || res.email;
      await this.sendEmailJSCode(deliveryEmail, res.code, res.userName);

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
      const deliveryEmail = res.recoveryEmail || res.email;
      this.forgotPasswordEmail = res.email;

      // Dispatch code to linked Google / recovery email via EmailJS
      await this.sendEmailJSCode(deliveryEmail, res.code, res.userName);

      // Update email label in step 2
      const emailDisplay = document.getElementById('forgot-sent-email-display');
      if (emailDisplay) emailDisplay.textContent = deliveryEmail;

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
        strengthBox.style.display = 'block';
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
  walletDetails: null,
  selectedWalletCategory: 'all',
  selectedWalletEntity: 'all',
  walletChatPollTimer: null,
  walletChatMessages: [],
  walletChatAwaitingAdmin: false,
  walletChatUnreadCount: 0,

  getStoredWallet(userId) {
    if (!userId) return null;
    try {
      const bal = localStorage.getItem(`aviora_wallet_balance_${userId}`);
      const tutor = localStorage.getItem(`aviora_wallet_tutor_${userId}`);
      const details = localStorage.getItem(`aviora_wallet_details_${userId}`);
      if (bal !== null && bal !== undefined) {
        return {
          balance: parseFloat(bal) || 0,
          tutor: tutor ? JSON.parse(tutor) : null,
          details: details ? JSON.parse(details) : null
        };
      }
    } catch (e) {}
    return null;
  },

  setStoredWallet(userId, balance, tutorInfo, walletDetails = null) {
    if (!userId) return;
    try {
      const num = parseFloat(balance) || 0;
      if (num > 0 || (walletDetails && (walletDetails.cancellations || []).length > 0)) {
        localStorage.setItem(`aviora_wallet_balance_${userId}`, String(num));
        if (tutorInfo) {
          localStorage.setItem(`aviora_wallet_tutor_${userId}`, JSON.stringify(tutorInfo));
        }
        if (walletDetails) {
          localStorage.setItem(`aviora_wallet_details_${userId}`, JSON.stringify(walletDetails));
        }
      } else {
        localStorage.removeItem(`aviora_wallet_balance_${userId}`);
        localStorage.removeItem(`aviora_wallet_tutor_${userId}`);
        localStorage.removeItem(`aviora_wallet_details_${userId}`);
      }
    } catch (e) {}
  },

  getTutorWalletBalance(tutorIdOrProfileId, tutorObj = null) {
    if (!tutorIdOrProfileId && !tutorObj) return 0;
    const d = this.walletDetails;
    if (d && Array.isArray(d.tutor_credits)) {
      const match = d.tutor_credits.find(tc =>
        tc.tutor_id == tutorIdOrProfileId ||
        tc.tutor_profile_id == tutorIdOrProfileId ||
        (tutorObj && (tc.tutor_id == tutorObj.user_id || tc.tutor_id == tutorObj.id || tc.tutor_profile_id == tutorObj.id))
      );
      if (match) return parseFloat(match.balance) || 0;
      return 0;
    }
    const eligibleTutorId = (this.currentUser && this.currentUser.wallet_tutor_id) || (this.walletTutor && this.walletTutor.id);
    if (eligibleTutorId && (eligibleTutorId == tutorIdOrProfileId || (tutorObj && (eligibleTutorId == tutorObj.user_id || eligibleTutorId == tutorObj.id)))) {
      return (this.currentUser && parseFloat(this.currentUser.wallet_balance)) || 0;
    }
    return 0;
  },

  getBuddyWalletBalance(sessionId = null) {
    const d = this.walletDetails;
    if (!d) return 0;
    if (sessionId && Array.isArray(d.buddy_credits)) {
      const m = d.buddy_credits.find(bc => bc.session_id == sessionId || bc.key === `buddy_${sessionId}`);
      if (m) return parseFloat(m.balance) || 0;
      return 0;
    }
    return parseFloat(d.buddy_balance) || 0;
  },

  isTutorBookedInWallet(tutorIdOrProfileId) {
    if (!tutorIdOrProfileId) return false;
    const d = this.walletDetails;
    if (!d) return false;
    const booked = Array.isArray(d.booked_tutors) ? d.booked_tutors : [];
    const credits = Array.isArray(d.tutor_credits) ? d.tutor_credits : [];
    return booked.some(t => t.tutor_id == tutorIdOrProfileId || t.tutor_profile_id == tutorIdOrProfileId) ||
           credits.some(tc => tc.tutor_id == tutorIdOrProfileId || tc.tutor_profile_id == tutorIdOrProfileId);
  },

  setWalletCategoryFilter(cat) {
    this.selectedWalletCategory = cat || 'all';
    if (cat === 'tutor') {
      const firstTutorCredit = (this.walletDetails?.tutor_credits || []).find(t => t.balance > 0)
        || (this.walletDetails?.booked_tutors || [])[0]
        || (this.walletDetails?.tutor_credits || [])[0];
      this.selectedWalletEntity = firstTutorCredit ? firstTutorCredit.key : 'category_tutor';
    } else if (cat === 'buddy') {
      this.selectedWalletEntity = 'buddy_all';
    } else {
      this.selectedWalletEntity = 'all';
    }
    this.renderCategorizedWalletUI();
  },

  selectWalletEntity(entityKey) {
    this.selectedWalletEntity = entityKey || 'all';
    if (String(entityKey).startsWith('tutor_')) {
      const tid = Number(String(entityKey).replace('tutor_', ''));
      if (!this.isTutorBookedInWallet(tid)) {
        this.selectedWalletEntity = 'all';
        this.selectedWalletCategory = 'all';
      } else {
        this.selectedWalletCategory = 'tutor';
      }
    } else if (String(entityKey).startsWith('buddy')) {
      this.selectedWalletCategory = 'buddy';
    } else if (entityKey === 'category_tutor') {
      this.selectedWalletCategory = 'tutor';
    } else {
      this.selectedWalletCategory = 'all';
    }
    this.renderCategorizedWalletUI();
  },

  updateWalletBalance(balance, tutorInfo, walletDetails = null) {
    const num = parseFloat(balance) || 0;
    const fmt = (v) => (typeof AvioraCurrency !== 'undefined') ? AvioraCurrency.format(v) : `$${(parseFloat(v) || 0).toFixed(2)}`;
    const formatted = fmt(num);

    if (walletDetails) {
      this.walletDetails = walletDetails;
    } else if (!this.walletDetails && this.currentUser) {
      const stored = this.getStoredWallet(this.currentUser.id);
      if (stored && stored.details) this.walletDetails = stored.details;
    }

    if (this.currentUser) {
      this.currentUser.wallet_balance = num;
      if (tutorInfo && tutorInfo.id) {
        this.currentUser.wallet_tutor_id = tutorInfo.id;
      } else if (num <= 0) {
        this.currentUser.wallet_tutor_id = null;
      }
      Storage.setUser(this.currentUser);
      this.setStoredWallet(this.currentUser.id, num, tutorInfo || this.walletTutor, this.walletDetails);
    }

    if (tutorInfo) {
      this.walletTutor = tutorInfo;
    } else if (num <= 0) {
      this.walletTutor = null;
    }

    const navBal = document.getElementById('nav-wallet-balance');
    if (navBal) navBal.textContent = formatted;

    this.renderCategorizedWalletUI();
  },

  renderCategorizedWalletUI() {
    const fmt = (v) => (typeof AvioraCurrency !== 'undefined') ? AvioraCurrency.format(v) : `$${(parseFloat(v) || 0).toFixed(2)}`;
    const d = this.walletDetails || {};
    const totalBal = parseFloat(d.wallet_balance ?? d.balance ?? this.currentUser?.wallet_balance ?? 0) || 0;
    const tutorCredits = Array.isArray(d.tutor_credits) ? d.tutor_credits : (this.walletTutor && totalBal > 0 ? [{
      key: `tutor_${this.walletTutor.id}`,
      tutor_id: this.walletTutor.id,
      tutor_profile_id: this.walletTutor.id,
      name: this.walletTutor.name,
      balance: totalBal,
      cancellations_count: 1,
      cancellations: [{
        id: 'default_cancel',
        category: 'tutor',
        category_label: 'Tutor Lesson Credit',
        entity_key: `tutor_${this.walletTutor.id}`,
        tutor_id: this.walletTutor.id,
        tutor_name: this.walletTutor.name,
        title: `Cancelled Lesson Credit — ${this.walletTutor.name}`,
        subtitle: 'Refunded lesson credit (Available for rebooking)',
        date: 'Credited',
        amount: totalBal,
        reason: 'Cancelled Lesson (≥3h Notice) • Non-Withdrawable',
        withdrawable: false
      }]
    }] : []);
    const buddyCredits = Array.isArray(d.buddy_credits) ? d.buddy_credits : [];
    const tutorTotalBal = typeof d.tutor_balance === 'number'
      ? d.tutor_balance
      : tutorCredits.reduce((s, tc) => s + (parseFloat(tc.balance) || 0), 0);
    const buddyTotalBal = typeof d.buddy_balance === 'number'
      ? d.buddy_balance
      : buddyCredits.reduce((s, bc) => s + (parseFloat(bc.balance) || 0), 0);
    const allCancellations = Array.isArray(d.cancellations) && d.cancellations.length > 0
      ? d.cancellations
      : tutorCredits.flatMap(tc => tc.cancellations || []);

    // Update top nav badge to show total wallet credit
    const navBal = document.getElementById('nav-wallet-balance');
    if (navBal) navBal.textContent = fmt(totalBal);

    // Update unread admin reply badge inside wallet chat button
    if (typeof d.unreadWalletChatCount === 'number') {
      this.walletChatUnreadCount = d.unreadWalletChatCount;
    }
    this.updateWalletChatBadge(this.walletChatUnreadCount);

    // Build Entity Selector options (Only Booked Tutors & Aviora Buddy)
    const selector = document.getElementById('wallet-entity-selector');
    const bookedTutorsMap = new Map();
    tutorCredits.forEach(tc => {
      bookedTutorsMap.set(Number(tc.tutor_id), {
        key: `tutor_${tc.tutor_id}`,
        tutor_id: Number(tc.tutor_id),
        tutor_profile_id: tc.tutor_profile_id || tc.tutor_id,
        name: tc.name,
        balance: parseFloat(tc.balance) || 0
      });
    });
    if (Array.isArray(d.booked_tutors)) {
      d.booked_tutors.forEach(t => {
        const uid = Number(t.tutor_id || t.user_id || t.id);
        if (!bookedTutorsMap.has(uid)) {
          bookedTutorsMap.set(uid, {
            key: `tutor_${uid}`,
            tutor_id: uid,
            tutor_profile_id: t.tutor_profile_id || t.profile_id || uid,
            name: t.name,
            balance: parseFloat(t.balance) || 0
          });
        }
      });
    }

    const tutorOptionsList = Array.from(bookedTutorsMap.values()).sort((a, b) => (b.balance - a.balance) || a.name.localeCompare(b.name));
    const buddySessionsList = Array.isArray(d.all_buddy_sessions) ? d.all_buddy_sessions : [];

    // Ensure selectedWalletEntity remains valid (revert unbooked tutor selection to 'all')
    if (String(this.selectedWalletEntity).startsWith('tutor_')) {
      const selTid = Number(String(this.selectedWalletEntity).replace('tutor_', ''));
      if (!bookedTutorsMap.has(selTid)) {
        this.selectedWalletEntity = 'all';
        if (this.selectedWalletCategory === 'tutor') this.selectedWalletCategory = 'all';
      }
    }

    if (selector) {
      selector.innerHTML = `
        <option value="all" ${this.selectedWalletEntity === 'all' ? 'selected' : ''}>All Credits — ${fmt(totalBal)}</option>
        <optgroup label="Tutor Lesson Credits (${fmt(tutorTotalBal)})">
          <option value="category_tutor" ${this.selectedWalletEntity === 'category_tutor' ? 'selected' : ''}>All Tutor Lesson Credits — ${fmt(tutorTotalBal)}</option>
          ${tutorOptionsList.map(t => `
            <option value="${t.key}" ${this.selectedWalletEntity === t.key ? 'selected' : ''}>Tutor: ${t.name} — ${fmt(t.balance)}</option>
          `).join('')}
        </optgroup>
        <optgroup label="Aviora Buddy Credits (${fmt(buddyTotalBal)})">
          <option value="buddy_all" ${this.selectedWalletEntity === 'buddy_all' ? 'selected' : ''}>Aviora Buddy (All Buddy Credits) — ${fmt(buddyTotalBal)}</option>
          ${buddyCredits.map(b => `
            <option value="${b.key}" ${this.selectedWalletEntity === b.key ? 'selected' : ''}>Aviora Buddy (${b.session_code} • ${b.partner_name}) — ${fmt(b.balance)}</option>
          `).join('')}
          ${buddySessionsList.filter(bs => !buddyCredits.some(bc => bc.session_id === bs.session_id)).map(bs => `
            <option value="${bs.key}" ${this.selectedWalletEntity === bs.key ? 'selected' : ''}>Aviora Buddy (${bs.session_code} • ${bs.subject}) — ${fmt(bs.balance || 0)}</option>
          `).join('')}
        </optgroup>
      `;
      selector.value = this.selectedWalletEntity;
    }

    // Determine active balance & banner based on selection
    const rowLabel = document.getElementById('wallet-balance-row-label');
    const dropBal = document.getElementById('wallet-dropdown-balance');
    const tutorBanner = document.getElementById('wallet-tutor-banner');
    const bannerTypeTag = document.getElementById('wallet-banner-type-tag');
    const tutorNameEl = document.getElementById('wallet-tutor-name');
    const bannerAmountEl = document.getElementById('wallet-banner-amount');
    const bannerSubtextEl = document.getElementById('wallet-banner-subtext');
    const bookBtn = document.getElementById('wallet-book-btn');

    let displayedBalance = totalBal;
    let activeTargetType = 'all'; // 'all' | 'tutor' | 'buddy'
    let activeTutorObj = null;
    let activeBuddyObj = null;

    if (String(this.selectedWalletEntity).startsWith('tutor_')) {
      activeTargetType = 'tutor';
      const tid = Number(String(this.selectedWalletEntity).replace('tutor_', ''));
      activeTutorObj = bookedTutorsMap.get(tid) || tutorCredits.find(tc => tc.tutor_id == tid) || { tutor_id: tid, name: 'Selected Tutor', balance: 0 };
      displayedBalance = parseFloat(activeTutorObj.balance) || 0;
      if (rowLabel) rowLabel.textContent = `Tutor Credit (${activeTutorObj.name}):`;
    } else if (this.selectedWalletEntity === 'category_tutor') {
      activeTargetType = 'tutor';
      activeTutorObj = tutorCredits.find(tc => tc.balance > 0) || tutorCredits[0] || tutorOptionsList[0] || null;
      displayedBalance = tutorTotalBal;
      if (rowLabel) rowLabel.textContent = 'Tutor Lesson Credits:';
    } else if (String(this.selectedWalletEntity).startsWith('buddy')) {
      activeTargetType = 'buddy';
      if (this.selectedWalletEntity !== 'buddy_all') {
        const bid = Number(String(this.selectedWalletEntity).replace('buddy_', ''));
        activeBuddyObj = buddyCredits.find(bc => bc.session_id == bid) || buddySessionsList.find(bs => bs.session_id == bid) || null;
        displayedBalance = activeBuddyObj ? (parseFloat(activeBuddyObj.balance) || 0) : buddyTotalBal;
        if (rowLabel) rowLabel.textContent = activeBuddyObj ? `Aviora Buddy (${activeBuddyObj.session_code}):` : 'Aviora Buddy Credit:';
      } else {
        displayedBalance = buddyTotalBal;
        if (rowLabel) rowLabel.textContent = 'Aviora Buddy Credit:';
      }
    } else {
      activeTargetType = 'all';
      activeTutorObj = tutorCredits.find(tc => tc.balance > 0) || (this.walletTutor ? { tutor_id: this.walletTutor.id, name: this.walletTutor.name, balance: tutorTotalBal } : null);
      displayedBalance = totalBal;
      if (rowLabel) rowLabel.textContent = 'Total Wallet Credit:';
    }

    if (dropBal) dropBal.textContent = fmt(displayedBalance);

    const formatValidityHtml = (daysRem, expLabel, isSoon) => {
      if (!daysRem || !expLabel) return '';
      if (isSoon) {
        return `<span style="display: block; margin-top: 0.3rem; color: #B45309; font-weight: 800;">Expiring in ${daysRem} day${daysRem === 1 ? '' : 's'} (${expLabel}) — Rebook now before unused balance is forfeited to the company.</span>`;
      }
      return `<span style="display: block; margin-top: 0.25rem; color: var(--charcoal-600); font-weight: 600;">Valid for ${daysRem} day${daysRem === 1 ? '' : 's'} (expires ${expLabel}). Unused balance is forfeited after 60 days.</span>`;
    };

    // Update Banner
    if (tutorBanner && tutorNameEl) {
      if (activeTargetType === 'tutor' && activeTutorObj) {
        tutorBanner.style.display = 'block';
        if (bannerTypeTag) bannerTypeTag.textContent = 'Selected Tutor Balance (Non-Withdrawable)';
        tutorNameEl.textContent = activeTutorObj.name;
        if (bannerAmountEl) bannerAmountEl.textContent = fmt(activeTutorObj.balance);
        if (bannerSubtextEl) {
          bannerSubtextEl.innerHTML = activeTutorObj.balance > 0
            ? `You have ${fmt(activeTutorObj.balance)} in lesson credit associated with ${activeTutorObj.name}. This credit can only be used to book with this tutor.${formatValidityHtml(activeTutorObj.days_remaining || d.soonest_days_remaining, activeTutorObj.expires_label || d.soonest_expires_label, activeTutorObj.expiring_soon)}`
            : `You currently have ${fmt(0)} in lesson credit associated with ${activeTutorObj.name}.`;
        }
      } else if (activeTargetType === 'buddy') {
        tutorBanner.style.display = 'block';
        if (bannerTypeTag) bannerTypeTag.textContent = 'Selected Aviora Buddy Balance (Non-Withdrawable)';
        tutorNameEl.textContent = activeBuddyObj ? `Aviora Buddy (${activeBuddyObj.session_code})` : 'Aviora Buddy Co-Learning';
        if (bannerAmountEl) bannerAmountEl.textContent = fmt(displayedBalance);
        if (bannerSubtextEl) {
          const bDays = activeBuddyObj?.days_remaining || (displayedBalance > 0 ? d.soonest_days_remaining : null);
          const bExp = activeBuddyObj?.expires_label || (displayedBalance > 0 ? d.soonest_expires_label : null);
          const bSoon = activeBuddyObj ? activeBuddyObj.expiring_soon : (d.expiring_soon_amount > 0);
          bannerSubtextEl.innerHTML = displayedBalance > 0
            ? `You have ${fmt(displayedBalance)} in Aviora Buddy credit from a cancelled session or partner no-show. Use it to book an Aviora Buddy duo session.${formatValidityHtml(bDays, bExp, bSoon)}`
            : `You currently have ${fmt(0)} in Aviora Buddy credit.`;
        }
      } else if (activeTutorObj && activeTutorObj.balance > 0) {
        tutorBanner.style.display = 'block';
        if (bannerTypeTag) bannerTypeTag.textContent = 'Eligible Rebooking Tutor';
        tutorNameEl.textContent = activeTutorObj.name;
        if (bannerAmountEl) bannerAmountEl.textContent = fmt(activeTutorObj.balance);
        if (bannerSubtextEl) {
          bannerSubtextEl.innerHTML = `This credited amount can only be used to book a new lesson with this same tutor.${formatValidityHtml(activeTutorObj.days_remaining || d.soonest_days_remaining, activeTutorObj.expires_label || d.soonest_expires_label, activeTutorObj.expiring_soon || (d.expiring_soon_amount > 0))}`;
        }
      } else if (buddyTotalBal > 0) {
        tutorBanner.style.display = 'block';
        if (bannerTypeTag) bannerTypeTag.textContent = 'Eligible Aviora Buddy Credit';
        tutorNameEl.textContent = 'Aviora Buddy Duo Session';
        if (bannerAmountEl) bannerAmountEl.textContent = fmt(buddyTotalBal);
        if (bannerSubtextEl) {
          bannerSubtextEl.innerHTML = `This credited amount can be used to book a new 30-minute Aviora Buddy session.${formatValidityHtml(d.soonest_days_remaining, d.soonest_expires_label, d.expiring_soon_amount > 0)}`;
        }
      } else {
        tutorBanner.style.display = 'none';
      }
    }

    // Render Categorized Credits List (Booked Tutor Lesson Credits & Aviora Buddy Credits)
    const catContainer = document.getElementById('wallet-categorized-credits-container');
    if (catContainer) {
      const showTutorSection = this.selectedWalletCategory === 'all' || this.selectedWalletCategory === 'tutor';
      const showBuddySection = this.selectedWalletCategory === 'all' || this.selectedWalletCategory === 'buddy';

      const tutorItemsToRender = (String(this.selectedWalletEntity).startsWith('tutor_') && activeTutorObj)
        ? [activeTutorObj]
        : tutorOptionsList;

      const buddyItemsToRender = buddyCredits.length > 0
        ? buddyCredits
        : [{
            key: 'buddy_all',
            session_code: 'Aviora Buddy',
            subject: '30-Min Peer Co-Learning',
            partner_name: 'Duo Session',
            balance: buddyTotalBal
          }];

      catContainer.innerHTML = `
        <div style="border: 1px solid rgba(198, 138, 40, 0.22); border-radius: 8px; padding: 0.55rem 0.65rem; background: rgba(250, 247, 242, 0.6);">
          <div style="font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--charcoal-700); margin-bottom: 0.4rem; display: flex; justify-content: space-between;">
            <span>Credits by Category</span>
            <span style="color: var(--gold-700);">Click to Inspect</span>
          </div>
          ${showTutorSection ? `
            <div style="margin-bottom: ${showBuddySection ? '0.45rem' : '0'};">
              <div style="font-size: 0.7rem; font-weight: 700; color: var(--gold-800); margin-bottom: 0.25rem;">Tutor Lesson Credits (${fmt(tutorTotalBal)})</div>
              ${tutorItemsToRender.length > 0 ? `
                <div style="max-height: 115px; overflow-y: auto;">
                  ${tutorItemsToRender.map(tc => {
                    const isSel = this.selectedWalletEntity === tc.key;
                    const validityNote = (tc.balance > 0 && tc.days_remaining > 0)
                      ? `<div style="font-size: 0.65rem; font-weight: 700; color: ${tc.expiring_soon ? '#B45309' : 'var(--charcoal-500)'};">${tc.expiring_soon ? `Expiring in ${tc.days_remaining}d` : `Expires in ${tc.days_remaining}d`} • ${tc.expires_label || ''}</div>`
                      : '';
                    return `
                      <div onclick="Auth.selectWalletEntity('${tc.key}')" style="display: flex; justify-content: space-between; align-items: center; padding: 0.35rem 0.5rem; border-radius: 6px; margin-bottom: 0.2rem; cursor: pointer; background: ${isSel ? 'rgba(198, 138, 40, 0.16)' : '#FFFFFF'}; border: 1px solid ${isSel ? 'var(--gold-500)' : 'rgba(0,0,0,0.07)'};">
                        <div>
                          <div style="font-size: 0.76rem; font-weight: 700; color: var(--charcoal-900);">${tc.name}</div>
                          ${validityNote}
                        </div>
                        <strong style="font-size: 0.78rem; color: ${(tc.balance || 0) > 0 ? 'var(--gold-700)' : 'var(--charcoal-500)'};">${fmt(tc.balance || 0)}</strong>
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : `
                <div style="font-size: 0.73rem; color: var(--charcoal-500); padding: 0.35rem 0.5rem; background: #FFFFFF; border-radius: 6px; border: 1px dashed rgba(0,0,0,0.1);">
                  No booked tutors yet.
                </div>
              `}
            </div>
          ` : ''}
          ${showBuddySection ? `
            <div>
              <div style="font-size: 0.7rem; font-weight: 700; color: #065F46; margin-bottom: 0.25rem;">Aviora Buddy Credits (${fmt(buddyTotalBal)})</div>
              ${buddyItemsToRender.map(bc => {
                const isSel = this.selectedWalletEntity === bc.key || (this.selectedWalletEntity === 'buddy_all' && bc.key === 'buddy_all');
                const buddyValidityNote = (bc.balance > 0 && bc.days_remaining > 0)
                  ? `<div style="font-size: 0.65rem; font-weight: 700; color: ${bc.expiring_soon ? '#B45309' : 'var(--charcoal-500)'};">${bc.expiring_soon ? `Expiring in ${bc.days_remaining}d` : `Expires in ${bc.days_remaining}d`} • ${bc.expires_label || ''}</div>`
                  : '';
                return `
                  <div onclick="Auth.selectWalletEntity('${bc.key}')" style="display: flex; justify-content: space-between; align-items: center; padding: 0.35rem 0.5rem; border-radius: 6px; margin-bottom: 0.2rem; cursor: pointer; background: ${isSel ? 'rgba(16, 185, 129, 0.14)' : '#FFFFFF'}; border: 1px solid ${isSel ? '#10B981' : 'rgba(0,0,0,0.07)'};">
                    <div>
                      <div style="font-size: 0.76rem; font-weight: 700; color: var(--charcoal-900);">${bc.session_code} (${bc.partner_name || bc.subject})</div>
                      ${buddyValidityNote}
                    </div>
                    <strong style="font-size: 0.78rem; color: ${(bc.balance || 0) > 0 ? '#059669' : 'var(--charcoal-500)'};">${fmt(bc.balance || 0)}</strong>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }

    // Render Cancellations & Non-Withdrawable Refund History
    const cancelContainer = document.getElementById('wallet-cancellations-container');
    if (cancelContainer) {
      let filteredCancels = allCancellations;
      if (String(this.selectedWalletEntity).startsWith('tutor_')) {
        filteredCancels = allCancellations.filter(c => c.entity_key === this.selectedWalletEntity);
      } else if (this.selectedWalletEntity === 'category_tutor') {
        filteredCancels = allCancellations.filter(c => c.category === 'tutor');
      } else if (String(this.selectedWalletEntity).startsWith('buddy')) {
        filteredCancels = this.selectedWalletEntity === 'buddy_all'
          ? allCancellations.filter(c => c.category === 'buddy')
          : allCancellations.filter(c => c.entity_key === this.selectedWalletEntity);
      }

      if (filteredCancels.length > 0) {
        cancelContainer.innerHTML = `
          <div style="border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; padding: 0.55rem 0.65rem; background: #FFFFFF;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.4rem; margin-bottom: 0.35rem;">
              <span style="font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--charcoal-700);">Cancellations &amp; Refund Ledger</span>
              <span style="font-size: 0.64rem; font-weight: 800; color: #B45309; background: rgba(245, 158, 11, 0.14); padding: 0.15rem 0.45rem; border-radius: 999px; white-space: nowrap; flex-shrink: 0;">Cannot Be Withdrawn</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.35rem; max-height: 120px; overflow-y: auto;">
              ${filteredCancels.map(c => {
                const isForfeited = Boolean(c.is_forfeited);
                const amountText = isForfeited ? `-${fmt(c.forfeited_amount || c.amount)}` : `+${fmt(c.amount)}`;
                const amountColor = isForfeited ? '#DC2626' : (c.category === 'buddy' ? '#059669' : 'var(--gold-700)');
                const borderColor = isForfeited ? '#DC2626' : (c.category === 'buddy' ? '#10B981' : 'var(--gold-500)');
                const statusBadge = isForfeited
                  ? `<span style="font-size: 0.62rem; font-weight: 800; color: #991B1B; background: rgba(220, 38, 38, 0.12); padding: 0.08rem 0.38rem; border-radius: 999px; margin-left: 0.35rem;">Forfeited</span>`
                  : (c.is_expiring_soon ? `<span style="font-size: 0.62rem; font-weight: 800; color: #92400E; background: rgba(245, 158, 11, 0.18); padding: 0.08rem 0.38rem; border-radius: 999px; margin-left: 0.35rem;">Expiring in ${c.days_remaining}d</span>` : '');
                return `
                  <div style="padding: 0.35rem 0.45rem; border-radius: 6px; background: ${isForfeited ? 'rgba(254, 242, 242, 0.7)' : 'rgba(250, 247, 242, 0.7)'}; border-left: 3px solid ${borderColor}; font-size: 0.72rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 700; color: var(--charcoal-900);">
                      <span>${c.title}${statusBadge}</span>
                      <span style="color: ${amountColor}; font-weight: 800; white-space: nowrap; flex-shrink: 0; margin-left: 0.35rem;">${amountText}</span>
                    </div>
                    <div style="font-size: 0.67rem; color: var(--charcoal-600); margin-top: 0.1rem;">${c.reason}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      } else {
        cancelContainer.innerHTML = `
          <div style="border: 1px dashed rgba(0,0,0,0.12); border-radius: 8px; padding: 0.45rem 0.65rem; font-size: 0.72rem; color: var(--charcoal-500); text-align: center;">
            No cancelled sessions recorded for this selection.
          </div>
        `;
      }
    }

    // Update Action Button
    if (bookBtn) {
      if (activeTargetType === 'buddy') {
        if (displayedBalance <= 0) {
          bookBtn.disabled = true;
          bookBtn.style.opacity = '0.55';
          bookBtn.style.cursor = 'not-allowed';
          bookBtn.textContent = 'Book Aviora Buddy (Requires Buddy Credit)';
        } else {
          bookBtn.disabled = false;
          bookBtn.style.opacity = '1';
          bookBtn.style.cursor = 'pointer';
          bookBtn.textContent = `Book Aviora Buddy (${fmt(displayedBalance)} Credit)`;
        }
      } else if (activeTargetType === 'tutor' && activeTutorObj) {
        if ((activeTutorObj.balance || 0) <= 0) {
          bookBtn.disabled = true;
          bookBtn.style.opacity = '0.55';
          bookBtn.style.cursor = 'not-allowed';
          bookBtn.textContent = `No Credit Available for ${activeTutorObj.name}`;
        } else {
          bookBtn.disabled = false;
          bookBtn.style.opacity = '1';
          bookBtn.style.cursor = 'pointer';
          bookBtn.textContent = `Book Lesson with ${activeTutorObj.name} (${fmt(activeTutorObj.balance)})`;
        }
      } else {
        if (totalBal <= 0) {
          bookBtn.disabled = true;
          bookBtn.style.opacity = '0.55';
          bookBtn.style.cursor = 'not-allowed';
          bookBtn.textContent = 'Book Another Lesson (Requires Balance)';
        } else {
          bookBtn.disabled = false;
          bookBtn.style.opacity = '1';
          bookBtn.style.cursor = 'pointer';
          if (activeTutorObj && activeTutorObj.balance > 0) {
            bookBtn.textContent = `Book Lesson with ${activeTutorObj.name}`;
          } else if (buddyTotalBal > 0) {
            bookBtn.textContent = `Book Aviora Buddy (${fmt(buddyTotalBal)} Credit)`;
          } else {
            bookBtn.textContent = 'Book Another Lesson';
          }
        }
      }
    }
  },

  bookWithWalletTutor() {
    const dropdown = document.getElementById('nav-wallet-dropdown');
    if (dropdown) dropdown.style.display = 'none';

    if (String(this.selectedWalletEntity).startsWith('buddy') || (this.selectedWalletCategory === 'buddy')) {
      window.location.hash = '#student-buddy';
      setTimeout(() => {
        if (typeof AvioraBuddy !== 'undefined' && AvioraBuddy.openPeerModal) {
          AvioraBuddy.openPeerModal();
        }
      }, 250);
      return;
    }

    let tutorId = null;
    if (String(this.selectedWalletEntity).startsWith('tutor_')) {
      tutorId = Number(String(this.selectedWalletEntity).replace('tutor_', ''));
    } else {
      const firstCreditTutor = (this.walletDetails?.tutor_credits || []).find(tc => tc.balance > 0);
      tutorId = firstCreditTutor?.tutor_id || this.walletTutor?.id || this.currentUser?.wallet_tutor_id;
    }

    const tutorBal = tutorId ? this.getTutorWalletBalance(tutorId) : 0;
    if (tutorBal <= 0) {
      if ((this.walletDetails?.buddy_balance || 0) > 0) {
        window.location.hash = '#student-buddy';
        setTimeout(() => {
          if (typeof AvioraBuddy !== 'undefined' && AvioraBuddy.openPeerModal) {
            AvioraBuddy.openPeerModal();
          }
        }, 250);
        return;
      }
      showToast('A new lesson can only be booked if there is a balance available for that tutor.', 'warning');
      return;
    }

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
          this.updateWalletBalance(data.wallet_balance, data.wallet_tutor || null, data);
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
          if (!isShown) {
            this.refreshWallet();
          }
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
        this.closeWalletChatModal();
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
        const walletBalance = (typeof AvioraCurrency !== 'undefined') ? AvioraCurrency.format(user.wallet_balance || 0) : `$${parseFloat(user.wallet_balance || 0).toFixed(2)}`;
        const roleLabel = user.role === 'admin' ? 'Administrator' : (user.role === 'teacher' || user.role === 'tutor' ? 'Teacher' : 'Student');
        const safeUserName = user.name || (user.role === 'admin' ? 'Administrator' : 'User');
        const defaultAvatar = (user.role === 'teacher' || user.role === 'tutor')
          ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80'
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
            <div class="nav-wallet-dropdown" id="nav-wallet-dropdown" style="display: none; width: 380px; max-width: 94vw;">
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
              <div class="wallet-dropdown-body" style="max-height: 440px; overflow-y: auto;">
                <!-- Select Tutor or Aviora Buddy Filter -->
                <div style="margin-bottom: 0.65rem;">
                  <label for="wallet-entity-selector" style="display: block; font-size: 0.69rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--charcoal-600); margin-bottom: 0.25rem;">
                    View Balance by Tutor or Aviora Buddy:
                  </label>
                  <select id="wallet-entity-selector" class="form-control" style="font-size: 0.78rem; font-weight: 700; padding: 0.4rem 0.6rem; height: auto; border: 1.5px solid rgba(198, 138, 40, 0.35); border-radius: 7px;" onchange="Auth.selectWalletEntity(this.value)">
                    <option value="all">All Credits (Combined Balance)</option>
                  </select>
                </div>

                <!-- Active Balance Row -->
                <div class="wallet-balance-row" style="margin-bottom: 0.65rem;">
                  <span class="wallet-balance-label" id="wallet-balance-row-label">Total Wallet Credit:</span>
                  <span class="wallet-balance-val" id="wallet-dropdown-balance">${walletBalance}</span>
                </div>

                <!-- Selected Tutor / Selected Aviora Buddy Banner -->
                <div id="wallet-tutor-banner" style="display: none; background: rgba(198, 138, 40, 0.1); border: 1.5px solid var(--gold-500); border-radius: 8px; padding: 0.65rem 0.85rem; margin-bottom: 0.75rem;">
                  <div id="wallet-banner-type-tag" style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--gold-800); font-weight: 800;">
                    Eligible Rebooking Tutor
                  </div>
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.45rem; margin-top: 0.3rem;">
                    <div style="display: flex; align-items: center; gap: 0.4rem;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--gold-600);"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      <strong style="color: var(--charcoal-900); font-size: 0.86rem;" id="wallet-tutor-name">-</strong>
                    </div>
                    <strong style="color: var(--gold-700); font-size: 0.88rem; font-family: var(--font-heading);" id="wallet-banner-amount">$0.00</strong>
                  </div>
                  <div id="wallet-banner-subtext" style="font-size: 0.73rem; color: var(--charcoal-700); margin-top: 0.2rem; line-height: 1.4;">
                    This credited amount can only be used to book a new lesson with this same tutor.
                  </div>
                </div>

                <!-- Categorized Credits Breakdown -->
                <div id="wallet-categorized-credits-container" style="margin-bottom: 0.65rem;"></div>

                <!-- Cancellations & Non-Withdrawable Refund History -->
                <div id="wallet-cancellations-container" style="margin-bottom: 0.25rem;"></div>
              </div>
              <div class="wallet-dropdown-footer" style="display: flex; flex-direction: column; gap: 0.45rem;">
                <button type="button" class="btn btn-outline-gold btn-sm" id="wallet-book-btn" style="width: 100%; text-align: center; justify-content: center; font-weight: 700; opacity: 0.55; cursor: not-allowed;" disabled onclick="Auth.bookWithWalletTutor()">
                  Book Another Lesson (Requires Balance)
                </button>
                <button type="button" class="btn btn-secondary btn-sm" id="wallet-chat-admin-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.45rem; font-weight: 700; font-size: 0.78rem; padding: 0.45rem 0.75rem; border: 1px solid rgba(198, 138, 40, 0.35); background: rgba(250, 247, 242, 0.9); color: var(--charcoal-900);" onclick="Auth.openWalletChatModal()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--gold-600); flex-shrink: 0;">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                  </svg>
                  <span>Chat with Admin (Wallet Help)</span>
                  <span id="wallet-chat-unread-badge" style="display: none; background: #DC2626; color: #FFFFFF; font-size: 0.65rem; font-weight: 800; padding: 0.08rem 0.42rem; border-radius: 999px; line-height: 1.3;">0</span>
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
          ${isStudent ? `
          <!-- Settings Icon Link (Student Settings Page) -->
          <a href="#student-settings" class="nav-settings-btn" id="nav-settings-btn" aria-label="Settings" title="Settings &amp; Preferences">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </a>
          ` : ''}
          <!-- User Profile & Log-Out Group (Placed side-by-side next to each other) -->
          <div class="nav-profile-logout-group" id="nav-profile-logout-group">
            <a href="${profileHash}" class="nav-user-profile-link" id="nav-user-profile-btn" aria-label="View Profile" title="View Profile">
              <img src="${userAvatarUrl}" alt="${safeUserName}" class="nav-header-profile-avatar nav-user-avatar" id="nav-user-profile-avatar" onerror="this.onerror=null; this.src='${defaultAvatar}';" />
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
        if (isStudent) {
          this.renderCategorizedWalletUI();
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
            <li><a href="#teacher-ratings" class="nav-link" id="nav-link-teacher-ratings">Ratings</a></li>
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
      // Default theme is ALWAYS light mode, default currency is USD, and default language is English when no user is logged in
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem('aviora_country');
      localStorage.removeItem('aviora_language');
      if (typeof I18n !== 'undefined' && typeof I18n.applyLanguage === 'function') {
        I18n.applyLanguage('en-US');
      }
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

    if (typeof AvioraCurrency !== 'undefined' && typeof AvioraCurrency.updateDOM === 'function') {
      AvioraCurrency.updateDOM();
    }

    if (user && user.id && typeof I18n !== 'undefined' && typeof I18n.applyLanguage === 'function') {
      const userLang = localStorage.getItem(`aviora_language_${user.id}`)
        || user.language
        || (typeof Profile !== 'undefined' && Profile.userPreferences?.language)
        || I18n.currentLanguage
        || 'en-US';
      I18n.applyLanguage(userLang, false);
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

  updateWalletChatBadge(count) {
    const badge = document.getElementById('wallet-chat-unread-badge');
    if (!badge) return;
    const n = Number(count) || 0;
    if (n > 0) {
      badge.textContent = n;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  },

  async openWalletChatModal() {
    if (!this.currentUser || this.currentUser.role !== 'student') return;

    const dropdown = document.getElementById('nav-wallet-dropdown');
    if (dropdown) dropdown.style.display = 'none';

    const modal = document.getElementById('wallet-admin-chat-modal');
    if (!modal) return;

    if (!this._walletChatOverlayBound) {
      this._walletChatOverlayBound = true;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeWalletChatModal();
      });
    }

    this.updateWalletChatSummaryBar(this.walletDetails);
    modal.classList.add('active');

    await this.loadWalletChat(true);
    this.startWalletChatPolling();
  },

  closeWalletChatModal() {
    const modal = document.getElementById('wallet-admin-chat-modal');
    if (modal) modal.classList.remove('active');
    this.stopWalletChatPolling();
  },

  startWalletChatPolling() {
    this.stopWalletChatPolling();
    this.walletChatPollTimer = setInterval(() => {
      const modal = document.getElementById('wallet-admin-chat-modal');
      if (modal && modal.classList.contains('active') && this.currentUser?.role === 'student') {
        this.loadWalletChat(true, true);
      } else {
        this.stopWalletChatPolling();
      }
    }, 2500);
  },

  stopWalletChatPolling() {
    if (this.walletChatPollTimer) {
      clearInterval(this.walletChatPollTimer);
      this.walletChatPollTimer = null;
    }
  },

  updateWalletChatSummaryBar(walletData) {
    const fmt = (v) => (typeof AvioraCurrency !== 'undefined') ? AvioraCurrency.format(v) : `$${(parseFloat(v) || 0).toFixed(2)}`;
    const d = walletData || this.walletDetails || {};
    const totalEl = document.getElementById('wallet-chat-sum-total');
    const tutorEl = document.getElementById('wallet-chat-sum-tutor');
    const buddyEl = document.getElementById('wallet-chat-sum-buddy');
    if (totalEl) totalEl.textContent = fmt(d.balance ?? d.wallet_balance ?? this.currentUser?.wallet_balance ?? 0);
    if (tutorEl) tutorEl.textContent = fmt(d.tutor_balance ?? 0);
    if (buddyEl) buddyEl.textContent = fmt(d.buddy_balance ?? 0);
  },

  async loadWalletChat(markRead = true, isBackgroundPoll = false) {
    if (!this.currentUser || this.currentUser.role !== 'student') return;
    try {
      const res = await API.getStudentWalletChat(markRead);
      if (res.wallet) {
        this.updateWalletChatSummaryBar(res.wallet);
        this.updateWalletBalance(res.wallet.balance, res.wallet.tutorInfo || null, {
          ...res.wallet,
          unreadWalletChatCount: res.unreadCount || 0
        });
      }

      const prevLen = (this.walletChatMessages || []).length;
      const newMsgs = Array.isArray(res.messages) ? res.messages : [];
      this.walletChatMessages = newMsgs;
      this.walletChatAwaitingAdmin = Boolean(res.awaitingAdminReply);

      if (!isBackgroundPoll || newMsgs.length !== prevLen) {
        this.renderWalletChatMessages();
      } else {
        const waitBanner = document.getElementById('wallet-chat-waiting-banner');
        if (waitBanner) {
          waitBanner.style.display = this.walletChatAwaitingAdmin ? 'block' : 'none';
        }
      }
    } catch (err) {
      if (!isBackgroundPoll) {
        console.warn('Failed to load wallet support chat:', err);
      }
    }
  },

  renderWalletChatMessages() {
    const listEl = document.getElementById('wallet-chat-messages-list');
    const waitBanner = document.getElementById('wallet-chat-waiting-banner');
    if (!listEl) return;

    const escape = (str) => {
      const div = document.createElement('div');
      div.textContent = str == null ? '' : String(str);
      return div.innerHTML;
    };

    const msgs = Array.isArray(this.walletChatMessages) ? this.walletChatMessages : [];
    if (waitBanner) {
      waitBanner.style.display = this.walletChatAwaitingAdmin ? 'block' : 'none';
    }

    if (msgs.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 1.5rem 0.75rem; font-size: 0.83rem; color: var(--charcoal-500);">
          Select a reason above and send your wallet question directly to an Aviora Administrator.
        </div>
      `;
      return;
    }

    listEl.innerHTML = msgs.map(m => {
      const isStudent = m.sender_role === 'student';
      const ts = m.created_at ? new Date(m.created_at + (m.created_at.includes('Z') ? '' : 'Z')).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
      return `
        <div style="display: flex; flex-direction: column; align-items: ${isStudent ? 'flex-end' : 'flex-start'};">
          <div style="max-width: 86%; padding: 0.65rem 0.85rem; border-radius: 10px; background: ${isStudent ? 'rgba(198, 138, 40, 0.14)' : '#FFFFFF'}; border: 1px solid ${isStudent ? 'rgba(198, 138, 40, 0.35)' : 'rgba(16, 185, 129, 0.35)'}; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; margin-bottom: 0.28rem;">
              <span style="font-size: 0.72rem; font-weight: 800; color: ${isStudent ? 'var(--gold-800)' : '#065F46'};">
                ${isStudent ? 'You' : `${escape(m.sender_name || 'Administrator')} (Admin)`}
              </span>
              <span style="font-size: 0.66rem; color: var(--charcoal-500);">${escape(ts)}</span>
            </div>
            ${m.reason ? `
              <div style="margin-bottom: 0.3rem;">
                <span style="display: inline-block; font-size: 0.67rem; font-weight: 700; padding: 0.12rem 0.45rem; border-radius: 999px; background: ${isStudent ? 'rgba(198, 138, 40, 0.2)' : 'rgba(16, 185, 129, 0.14)'}; color: ${isStudent ? 'var(--gold-900)' : '#065F46'};">
                  Reason: ${escape(m.reason)}
                </span>
              </div>
            ` : ''}
            <div style="font-size: 0.85rem; color: var(--charcoal-900); line-height: 1.45; white-space: pre-wrap;">${escape(m.message)}</div>
          </div>
        </div>
      `;
    }).join('');

    listEl.scrollTop = listEl.scrollHeight;
  },

  async submitWalletChatMessage() {
    const reasonEl = document.getElementById('wallet-chat-reason');
    const msgEl = document.getElementById('wallet-chat-message-input');
    const submitBtn = document.getElementById('wallet-chat-submit-btn');

    const reason = reasonEl ? reasonEl.value.trim() : '';
    const message = msgEl ? msgEl.value.trim() : '';

    if (!reason) {
      showToast('Please select a reason for your wallet inquiry.', 'warning');
      if (reasonEl) reasonEl.focus();
      return;
    }
    if (!message) {
      showToast('Please type your message for the administrator.', 'warning');
      if (msgEl) msgEl.focus();
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
      }

      const res = await API.sendStudentWalletChat({ reason, message });
      if (msgEl) msgEl.value = '';
      if (res && res.message) {
        this.walletChatMessages = [...(this.walletChatMessages || []), res.message];
        this.walletChatAwaitingAdmin = true;
        if (res.wallet) this.updateWalletChatSummaryBar(res.wallet);
        this.renderWalletChatMessages();
      } else {
        await this.loadWalletChat(true);
      }
      showToast('Sent to Administrator. Please wait for their real-time response.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to send wallet inquiry.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
      }
    }
  },

  loadNotifications() {
    if (typeof NotificationsUI !== 'undefined' && NotificationsUI.fetchAndRender) {
      NotificationsUI.fetchAndRender();
    }
  }
};
