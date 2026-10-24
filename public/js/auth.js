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
    const fb = this.getLinkedAccount('facebook');
    const google = this.getLinkedAccount('google');

    // Page Login Google & Facebook Buttons
    const pageGoogleBtn = document.getElementById('page-google-auth-btn');
    const pageFbBtn = document.getElementById('page-facebook-auth-btn');
    const signupGoogleBtn = document.getElementById('signup-google-auth-btn');
    const signupFbBtn = document.getElementById('signup-facebook-auth-btn');

    if (pageGoogleBtn) {
      pageGoogleBtn.classList.toggle('is-linked', !!google);
      pageGoogleBtn.setAttribute('title', google
        ? `Linked Google Account: ${google.name} (${google.email}) - Click to sign in instantly`
        : 'Sign in with Google');
    }
    if (pageFbBtn) {
      pageFbBtn.classList.toggle('is-linked', !!fb);
      pageFbBtn.setAttribute('title', fb
        ? `Linked Facebook Account: ${fb.name} (${fb.email}) - Click to sign in instantly`
        : 'Sign in with Facebook');
    }

    if (signupGoogleBtn) {
      signupGoogleBtn.classList.toggle('is-linked', !!google);
      signupGoogleBtn.setAttribute('title', google
        ? `Linked with ${google.name}'s Google Account`
        : 'Create account with Google');
    }
    if (signupFbBtn) {
      signupFbBtn.classList.toggle('is-linked', !!fb);
      signupFbBtn.setAttribute('title', fb
        ? `Linked with ${fb.name}'s Facebook Account`
        : 'Create account with Facebook');
    }

    // Hint text on Login view
    const loginHints = document.getElementById('page-login-linked-hints');
    if (loginHints) {
      if (fb && google) {
        loginHints.style.display = 'block';
        loginHints.innerHTML = `
          <span>Linked: <strong style="color: #1877F2;">Facebook (${fb.name.split(' ')[0]})</strong> &amp; <strong style="color: #4285F4;">Google (${google.name.split(' ')[0]})</strong> (1-click ready)</span>
          <span style="margin: 0 4px; color: var(--text-muted);">•</span>
          <button type="button" class="btn-text" style="color: var(--gold-800); text-decoration: underline; font-size: 0.76rem; cursor: pointer; background: none; border: none; padding: 0;" onclick="Auth.promptSwitchAccount()">Switch account</button>
        `;
      } else if (fb) {
        loginHints.style.display = 'block';
        loginHints.innerHTML = `
          <span>Linked with Facebook: <strong>${fb.name}</strong> (Click Facebook icon for 1-click sign in)</span>
          <span style="margin: 0 4px; color: var(--text-muted);">•</span>
          <button type="button" class="btn-text" style="color: var(--gold-800); text-decoration: underline; font-size: 0.76rem; cursor: pointer; background: none; border: none; padding: 0;" onclick="Auth.openOAuthChoice('facebook', 'login', true)">Switch account</button>
        `;
      } else if (google) {
        loginHints.style.display = 'block';
        loginHints.innerHTML = `
          <span>Linked with Google: <strong>${google.name}</strong> (Click Google icon for 1-click sign in)</span>
          <span style="margin: 0 4px; color: var(--text-muted);">•</span>
          <button type="button" class="btn-text" style="color: var(--gold-800); text-decoration: underline; font-size: 0.76rem; cursor: pointer; background: none; border: none; padding: 0;" onclick="Auth.openOAuthChoice('google', 'login', true)">Switch account</button>
        `;
      } else {
        loginHints.style.display = 'none';
        loginHints.innerHTML = '';
      }
    }

    // Hint text on Sign Up view
    const signupHints = document.getElementById('page-signup-linked-hints');
    if (signupHints) {
      if (fb || google) {
        const active = fb || google;
        const provName = active.provider === 'facebook' ? 'Facebook' : 'Google';
        signupHints.style.display = 'block';
        signupHints.innerHTML = `
          <span>Account linking available: Click <strong>${provName}</strong> to register with ${active.name}'s profile</span>
        `;
      } else {
        signupHints.style.display = 'none';
        signupHints.innerHTML = '';
      }
    }
  },

  promptSwitchAccount() {
    showToast('Choose which provider account you would like to switch to:', 'info');
    this.openOAuthChoice('facebook', 'login', true);
  },

  handleSocialAuthClick(provider, mode = 'login') {
    // On Login Page: If account is linked, do INSTANT 1-CLICK LOGIN!
    if (mode === 'login') {
      const linked = this.getLinkedAccount(provider);
      if (linked && linked.email) {
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
    }

    // Otherwise (signup mode or unlinked account), direct user to the platform sign-in flow
    this.openOAuthChoice(provider, mode);
  },

  setupSocialAuth() {
    // Google Auth Triggers
    const pageGoogleBtn = document.getElementById('page-google-auth-btn');
    const signupGoogleBtn = document.getElementById('signup-google-auth-btn');
    const modalGoogleBtn = document.getElementById('modal-google-auth-btn');

    if (pageGoogleBtn) {
      pageGoogleBtn.addEventListener('click', () => this.handleSocialAuthClick('google', 'login'));
    }
    if (signupGoogleBtn) {
      signupGoogleBtn.addEventListener('click', () => this.handleSocialAuthClick('google', 'signup'));
    }
    if (modalGoogleBtn) {
      modalGoogleBtn.addEventListener('click', () => this.handleSocialAuthClick('google', 'login'));
    }

    // Facebook Auth Triggers
    const pageFbBtn = document.getElementById('page-facebook-auth-btn');
    const signupFbBtn = document.getElementById('signup-facebook-auth-btn');
    const modalFbBtn = document.getElementById('modal-facebook-auth-btn');

    if (pageFbBtn) {
      pageFbBtn.addEventListener('click', () => this.handleSocialAuthClick('facebook', 'login'));
    }
    if (signupFbBtn) {
      signupFbBtn.addEventListener('click', () => this.handleSocialAuthClick('facebook', 'signup'));
    }
    if (modalFbBtn) {
      modalFbBtn.addEventListener('click', () => this.handleSocialAuthClick('facebook', 'login'));
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

    // OAuth Modal Close Triggers
    const closeBtn = document.getElementById('oauth-modal-close');
    const oauthModal = document.getElementById('oauth-provider-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeOAuthChoice());
    if (oauthModal) {
      oauthModal.addEventListener('click', (e) => {
        if (e.target === oauthModal) this.closeOAuthChoice();
      });
    }

    // Refresh UI badges based on stored links
    this.updateLinkedAccountBadges();
  },

  openOAuthChoice(provider, mode = 'login', forcePrompt = false) {
    const modal = document.getElementById('oauth-provider-modal');
    if (!modal) return;

    modal.dataset.provider = provider;
    modal.dataset.mode = mode;

    const isGoogle = provider === 'google';
    const isSignup = mode === 'signup' || window.location.hash === '#signup';

    // Apply platform-specific styling classes
    modal.classList.toggle('oauth-modal-google', isGoogle);
    modal.classList.toggle('oauth-modal-facebook', !isGoogle);

    // Platform header elements
    const icon = document.getElementById('oauth-provider-icon');
    const heading = document.getElementById('oauth-modal-heading');
    const appTag = document.getElementById('oauth-modal-app-tag');
    const permText = document.getElementById('oauth-permission-text');
    const sub = document.getElementById('oauth-modal-sub');
    const directHeading = document.getElementById('oauth-direct-heading');
    const submitText = document.getElementById('oauth-submit-btn-text');
    const directNameWrap = document.getElementById('oauth-direct-name-wrap');
    const footerPrivacy = document.getElementById('oauth-footer-privacy');

    if (icon) {
      icon.innerHTML = isGoogle
        ? `<svg width="24" height="24" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`
        : `<svg width="26" height="26" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;
    }

    if (heading) {
      if (isSignup) {
        heading.textContent = isGoogle ? 'Create Account with Google' : 'Create Account with Facebook';
      } else {
        heading.textContent = isGoogle ? 'Sign In with Google' : 'Log in with Facebook';
      }
    }

    if (appTag) {
      appTag.textContent = isGoogle
        ? 'to continue to Aviora Education'
        : 'Aviora Education Account Linking';
    }

    if (permText) {
      permText.textContent = isGoogle
        ? 'Aviora Education will receive your name, email address, language preference, and profile picture from Google.'
        : 'Aviora Education will receive your name, profile picture, and email address from Facebook.';
    }

    if (sub) {
      sub.textContent = isSignup
        ? `Select your ${isGoogle ? 'Google' : 'Facebook'} profile to register:`
        : `Choose a ${isGoogle ? 'Google' : 'Facebook'} account:`;
    }

    if (directHeading) {
      directHeading.textContent = isSignup
        ? `Or register with ${isGoogle ? 'Google' : 'Facebook'} credentials:`
        : `Or sign in with another ${isGoogle ? 'Google' : 'Facebook'} account:`;
    }

    if (submitText) {
      submitText.textContent = isSignup
        ? `Create Account & Link with ${isGoogle ? 'Google' : 'Facebook'}`
        : `Sign In with ${isGoogle ? 'Google' : 'Facebook'}`;
    }

    if (directNameWrap) {
      directNameWrap.style.display = isSignup ? 'block' : 'none';
    }

    if (footerPrivacy) {
      footerPrivacy.textContent = isGoogle
        ? "To continue, Google will share your profile with Aviora Education under Google's Privacy Policy."
        : "By proceeding, Facebook will link your identity with Aviora Education. Facebook does not allow posting without permission.";
    }

    // Build accounts list
    const linked = this.getLinkedAccount(provider);
    const accounts = [];

    if (linked) {
      accounts.push({
        name: linked.name,
        email: linked.email,
        avatar: linked.avatar || (isGoogle
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
          : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80'),
        badge: 'Linked Account',
        isLinked: true
      });
    }

    if (isGoogle) {
      if (!linked || linked.email !== 'krystel.comia@gmail.com') {
        accounts.push({
          name: 'Krystel Comia',
          email: 'krystel.comia@gmail.com',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
          badge: 'Google Account'
        });
      }
      if (!linked || linked.email !== 'marcus.chen.mit@gmail.com') {
        accounts.push({
          name: 'Marcus Chen',
          email: 'marcus.chen.mit@gmail.com',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
          badge: 'Google Workspace'
        });
      }
    } else {
      if (!linked || linked.email !== 'krystel.comia.fb@facebook.com') {
        accounts.push({
          name: 'Krystel Comia',
          email: 'krystel.comia.fb@facebook.com',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
          badge: 'Facebook Profile'
        });
      }
      if (!linked || linked.email !== 'sophia.lin.arts@facebook.com') {
        accounts.push({
          name: 'Sophia Lin',
          email: 'sophia.lin.arts@facebook.com',
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=80',
          badge: 'Facebook Profile'
        });
      }
    }

    const list = document.getElementById('oauth-accounts-list');
    if (list) {
      list.innerHTML = '';
      accounts.forEach(acc => {
        const item = document.createElement('div');
        item.className = `oauth-account-item ${acc.isLinked ? 'is-active' : ''}`;
        if (acc.isLinked) {
          item.style.borderColor = '#10B981';
          item.style.background = 'rgba(16, 185, 129, 0.05)';
        }
        item.innerHTML = `
          <img src="${acc.avatar}" alt="${acc.name}" class="oauth-account-avatar" />
          <div style="flex: 1; text-align: left;">
            <div class="oauth-account-name">${acc.name}</div>
            <div class="oauth-account-email">${acc.email}</div>
          </div>
          <span style="font-size: 0.72rem; font-weight: 700; color: ${acc.isLinked ? '#10B981' : 'var(--gold-800)'};">${acc.badge}</span>
        `;
        item.addEventListener('click', () => {
          this.selectOAuthAccount(provider, acc.name, acc.email, acc.avatar);
        });
        list.appendChild(item);
      });
    }

    // Reset direct input values
    const emailInput = document.getElementById('oauth-direct-email');
    const passInput = document.getElementById('oauth-direct-password');
    const nameInput = document.getElementById('oauth-direct-name');
    if (emailInput) emailInput.value = '';
    if (passInput) passInput.value = '';
    if (nameInput) nameInput.value = '';

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  selectOAuthAccount(provider, name, email, avatar) {
    const isSignup = document.getElementById('oauth-provider-modal')?.dataset?.mode === 'signup' || window.location.hash === '#signup';
    let role = 'student';
    const roleRadio = document.querySelector('input[name="page_register_role"]:checked');
    if (roleRadio) role = roleRadio.value;

    this.loginWithOAuth(provider, {
      name,
      email,
      picture: avatar,
      role
    }, { isSignup });
  },

  submitOAuthDirectForm() {
    const modal = document.getElementById('oauth-provider-modal');
    const provider = modal?.dataset?.provider || 'facebook';
    const isSignup = modal?.dataset?.mode === 'signup' || window.location.hash === '#signup';

    const emailInput = document.getElementById('oauth-direct-email');
    const passInput = document.getElementById('oauth-direct-password');
    const nameInput = document.getElementById('oauth-direct-name');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passInput ? passInput.value : '';
    let name = nameInput ? nameInput.value.trim() : '';

    if (!email) {
      showToast('Please enter your email or phone number.', 'error');
      return;
    }
    if (!password || password.length < 4) {
      showToast(`Please enter your password to authenticate with ${provider === 'google' ? 'Google' : 'Facebook'}.`, 'error');
      return;
    }

    if (!name) {
      const localPart = email.split('@')[0];
      name = localPart.split(/[._-]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') || (provider === 'google' ? 'Google Scholar' : 'Facebook Scholar');
    }

    let role = 'student';
    const roleRadio = document.querySelector('input[name="page_register_role"]:checked');
    if (roleRadio) role = roleRadio.value;

    const avatar = provider === 'google'
      ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'
      : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80';

    this.loginWithOAuth(provider, {
      name,
      email,
      picture: avatar,
      role
    }, { isSignup });
  },

  closeOAuthChoice() {
    const modal = document.getElementById('oauth-provider-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  async loginWithOAuth(provider, profile, options = {}) {
    try {
      this.closeOAuthChoice();
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

  handlePostAuthRedirect(user) {
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
    } else if (user.role === 'teacher') {
      window.location.hash = '#teacher-portal';
    } else {
      window.location.hash = '#student-portal';
    }
    Router.handleRoute();
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
    if (tab === 'login') {
      window.location.hash = '#login';
    } else {
      window.location.hash = '#signup';
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

      const res = await API.login({ email, password });
      Storage.setToken(res.token);
      Storage.setUser(res.user);
      this.currentUser = res.user;

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

      this.handlePostAuthRedirect(res.user);
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
    this.updateLinkedAccountBadges();
    showToast('You have been securely logged out.', 'info');
    window.location.hash = '#home';
    Router.handleRoute();
  },

  updateNavUI(user, unreadCount = 0) {
    const guestActions = document.getElementById('nav-guest-actions');
    const userActions = document.getElementById('nav-user-actions');
    const mainNavLinks = document.getElementById('main-nav-links');

    if (user) {
      if (guestActions) guestActions.style.display = 'none';
      if (userActions) {
        userActions.style.display = 'flex';
        const profileHash = user.role === 'student' ? '#student-profile' : (user.role === 'teacher' ? '#teacher-portal' : '#admin-portal');
        userActions.innerHTML = `
          <a href="${profileHash}" class="nav-link header-text-action" id="nav-user-profile-btn">Profile</a>
          <button type="button" class="nav-link header-text-action" id="user-logout-btn">Log Out</button>
        `;
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
        } else if (user.role === 'teacher') {
          mainNavLinks.innerHTML = `
            <li><a href="#home" class="nav-link" id="nav-link-home">Home</a></li>
            <li><a href="#about" class="nav-link" id="nav-link-about">About</a></li>
            <li><a href="#tutors" class="nav-link" id="nav-link-tutors">Tutors</a></li>
            <li><a href="#aviora-buddy" class="nav-link" id="nav-link-buddy">Aviora Buddy</a></li>
            <li><a href="#how-it-works" class="nav-link" id="nav-link-how">How It Works</a></li>
            <li><a href="#teacher-portal" class="nav-link" id="nav-link-teacher-portal">Teacher Portal</a></li>
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
