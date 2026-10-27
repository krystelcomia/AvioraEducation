/**
 * AVIORA EDUCATION - DEDICATED STUDENT PROFILE & SETTINGS LOGIC
 * Manages User Preferences (Color Mode, Font Size, Language, Timezone, Notifications)
 * with instant UI updates, persistent database storage, and account-level isolation.
 */

window.getTimezoneAbbr = function(tz) {
  const currentTz = tz || localStorage.getItem('aviora_timezone') || 'America/New_York';
  const abbrs = {
    'America/New_York': 'EST',
    'America/Chicago': 'CST',
    'America/Denver': 'MST',
    'America/Los_Angeles': 'PST',
    'Europe/London': 'GMT',
    'Europe/Paris': 'CET',
    'Asia/Manila': 'PHT',
    'Asia/Tokyo': 'JST',
    'UTC': 'UTC'
  };
  return abbrs[currentTz] || '';
};

const Profile = {
  currentUser: null,
  studentProfile: null,
  activeSubscription: null,
  userPreferences: null,
  saveStatusTimeout: null,

  init() {
    this.initPreferences();
    this.setupEventListeners();
  },

  getUserKey() {
    const u = (typeof Auth !== 'undefined' && Auth.currentUser) || (typeof Storage !== 'undefined' ? Storage.getUser() : null);
    return u && u.id ? `_${u.id}` : '';
  },

  initPreferences() {
    const key = this.getUserKey();
    const savedTheme = localStorage.getItem(`aviora_theme${key}`) || localStorage.getItem('aviora_theme') || 'light';
    this.applyTheme(savedTheme, false, false);
    document.documentElement.removeAttribute('data-font-size');

    const savedLang = localStorage.getItem(`aviora_language${key}`) || localStorage.getItem('aviora_language') || 'en-US';
    this.applyLanguage(savedLang, false, false);

    const savedTz = localStorage.getItem(`aviora_timezone${key}`) || localStorage.getItem('aviora_timezone') || 'America/New_York';
    this.applyTimezone(savedTz, false, false);
  },

  setSaveStatus(status, text) {
    const pill = document.getElementById('settings-status-pill');
    const textEl = document.getElementById('settings-status-text');
    const dotEl = document.getElementById('settings-status-dot');
    if (!pill || !textEl) return;

    if (this.saveStatusTimeout) clearTimeout(this.saveStatusTimeout);

    if (status === 'saving') {
      pill.style.display = 'inline-flex';
      pill.style.background = 'rgba(198, 138, 40, 0.18)';
      pill.style.borderColor = 'rgba(198, 138, 40, 0.4)';
      pill.style.color = 'var(--gold-700)';
      if (dotEl) dotEl.style.background = 'var(--gold-500)';
      textEl.textContent = text || (typeof I18n !== 'undefined' ? I18n.t('common.saving', 'Saving...') : 'Saving...');
    } else if (status === 'saved') {
      pill.style.display = 'inline-flex';
      pill.style.background = 'rgba(16, 185, 129, 0.12)';
      pill.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      pill.style.color = '#059669';
      if (dotEl) dotEl.style.background = '#10B981';
      textEl.textContent = text || (typeof I18n !== 'undefined' ? I18n.t('common.saved', 'Saved to Account') : 'Saved to Account');

      this.saveStatusTimeout = setTimeout(() => {
        pill.style.background = 'rgba(198, 138, 40, 0.12)';
        pill.style.borderColor = 'rgba(198, 138, 40, 0.25)';
        pill.style.color = 'var(--gold-600)';
        if (dotEl) dotEl.style.background = 'var(--gold-500)';
        textEl.textContent = 'Saved to Account';
      }, 4000);
    } else if (status === 'error') {
      pill.style.display = 'inline-flex';
      pill.style.background = 'rgba(239, 68, 68, 0.12)';
      pill.style.borderColor = 'rgba(239, 68, 68, 0.3)';
      pill.style.color = '#DC2626';
      if (dotEl) dotEl.style.background = '#EF4444';
      textEl.textContent = text || 'Sync Failed';
    }
  },

  applyTheme(theme, notify = true, persistToServer = true) {
    const isDark = (theme === 'dark');
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    const key = this.getUserKey();
    if (key) localStorage.setItem(`aviora_theme${key}`, isDark ? 'dark' : 'light');
    localStorage.setItem('aviora_theme', isDark ? 'dark' : 'light');

    const lightCard = document.getElementById('theme-card-light');
    const darkCard = document.getElementById('theme-card-dark');
    if (lightCard) lightCard.classList.toggle('active', !isDark);
    if (darkCard) darkCard.classList.toggle('active', isDark);

    if (persistToServer && typeof Auth !== 'undefined' && Auth.currentUser && typeof API !== 'undefined') {
      this.setSaveStatus('saving');
      API.updateUserPreferences({ theme: isDark ? 'dark' : 'light' })
        .then(res => {
          if (res && res.preferences) {
            this.userPreferences = res.preferences;
            Storage.setUserPreferences(Auth.currentUser.id, res.preferences);
          }
          this.setSaveStatus('saved');
        })
        .catch(e => {
          console.warn('Theme preference sync warning:', e);
          this.setSaveStatus('error', 'Saved Locally');
        });
    }

    if (notify) {
      const msg = typeof I18n !== 'undefined' ? I18n.t('toast.theme_saved') : `${isDark ? 'Dark' : 'Light'} theme activated across the website`;
      showToast(msg, 'info');
    }
  },

  applyFontSize(size) {
    document.documentElement.removeAttribute('data-font-size');
  },

  applyLanguage(lang, notify = true, persistToServer = true) {
    const activeLang = lang || 'en-US';
    const langSelect = document.getElementById('profile-language-select');
    if (langSelect) langSelect.value = activeLang;
    const headerLangSelect = document.getElementById('header-language-select');
    if (headerLangSelect) headerLangSelect.value = activeLang;

    const key = this.getUserKey();
    if (key) localStorage.setItem(`aviora_language${key}`, activeLang);
    localStorage.setItem('aviora_language', activeLang);

    if (typeof I18n !== 'undefined') {
      I18n.applyLanguage(activeLang);
    } else {
      document.documentElement.setAttribute('lang', activeLang);
    }

    if (persistToServer && typeof Auth !== 'undefined' && Auth.currentUser && typeof API !== 'undefined') {
      this.setSaveStatus('saving');
      API.updateUserPreferences({ language: activeLang })
        .then(res => {
          if (res && res.preferences) {
            this.userPreferences = res.preferences;
            Storage.setUserPreferences(Auth.currentUser.id, res.preferences);
          }
          this.setSaveStatus('saved');
        })
        .catch(e => {
          console.warn('Language preference sync warning:', e);
          this.setSaveStatus('error', 'Saved Locally');
        });
    }

    if (notify) {
      const msg = typeof I18n !== 'undefined' ? I18n.t('toast.lang_saved') : 'Language preference updated across the website';
      showToast(msg, 'success');
    }
  },

  applyTimezone(tz, notify = true, persistToServer = true) {
    const activeTz = tz || 'America/New_York';
    const tzSelect = document.getElementById('profile-timezone-select');
    if (tzSelect) tzSelect.value = activeTz;

    const key = this.getUserKey();
    if (key) localStorage.setItem(`aviora_timezone${key}`, activeTz);
    localStorage.setItem('aviora_timezone', activeTz);

    if (persistToServer && typeof Auth !== 'undefined' && Auth.currentUser && typeof API !== 'undefined') {
      this.setSaveStatus('saving');
      API.updateUserPreferences({ timezone: activeTz })
        .then(res => {
          if (res && res.preferences) {
            this.userPreferences = res.preferences;
            Storage.setUserPreferences(Auth.currentUser.id, res.preferences);
          }
          this.setSaveStatus('saved');
        })
        .catch(e => {
          console.warn('Timezone preference sync warning:', e);
          this.setSaveStatus('error', 'Saved Locally');
        });
    }

    if (notify) {
      const msg = typeof I18n !== 'undefined' ? I18n.t('toast.tz_saved') : `Preferred timezone updated to ${window.getTimezoneAbbr(activeTz)} (${activeTz})`;
      showToast(msg, 'success');
    }
  },

  applyNotification(prefKey, isChecked, notify = true, persistToServer = true) {
    const elementId = prefKey.replace('_', '-');
    const toggle = document.getElementById(elementId);
    if (toggle) toggle.checked = Boolean(isChecked);

    const key = this.getUserKey();
    if (key) localStorage.setItem(`aviora_${elementId}${key}`, isChecked);
    localStorage.setItem(`aviora_${elementId}`, isChecked);

    if (persistToServer && typeof Auth !== 'undefined' && Auth.currentUser && typeof API !== 'undefined') {
      this.setSaveStatus('saving');
      API.updateUserPreferences({ [prefKey]: Boolean(isChecked) })
        .then(res => {
          if (res && res.preferences) {
            this.userPreferences = res.preferences;
            Storage.setUserPreferences(Auth.currentUser.id, res.preferences);
          }
          if (typeof NotificationsUI !== 'undefined') {
            if (res && res.unreadNotifications !== undefined) {
              NotificationsUI.updateBadge(res.unreadNotifications);
            }
            NotificationsUI.fetchAndRender();
          }
          this.setSaveStatus('saved');
        })
        .catch(e => {
          console.warn('Notification preference sync warning:', e);
          this.setSaveStatus('error', 'Saved Locally');
        });
    }

    // Immediately trigger local notification filtering if open
    if (typeof NotificationsUI !== 'undefined') {
      NotificationsUI.fetchAndRender();
    }

    if (notify) {
      const msg = typeof I18n !== 'undefined' ? I18n.t('toast.notif_saved') : 'Notification preference updated and saved to your account';
      showToast(msg, 'info');
    }
  },

  syncAllPreferences(prefs, notify = false) {
    if (!prefs) return;
    this.userPreferences = prefs;

    const user = (typeof Auth !== 'undefined' && Auth.currentUser) || (typeof Storage !== 'undefined' ? Storage.getUser() : null);
    if (user && user.id && typeof Storage !== 'undefined') {
      Storage.setUserPreferences(user.id, prefs);
    }

    if (prefs.theme) {
      this.applyTheme(prefs.theme, notify, false);
    }
    if (prefs.font_size) {
      this.applyFontSize(prefs.font_size, notify, false);
    }
    if (prefs.language) {
      this.applyLanguage(prefs.language, notify, false);
    }
    if (prefs.timezone) {
      this.applyTimezone(prefs.timezone, notify, false);
    }

    const notifMap = {
      'notif_lessons': 'notif-lessons',
      'notif_calendar': 'notif-calendar',
      'notif_messages': 'notif-messages',
      'notif_reports': 'notif-reports'
    };

    Object.keys(notifMap).forEach(key => {
      if (prefs[key] !== undefined && prefs[key] !== null) {
        this.applyNotification(key, prefs[key], false, false);
      }
    });

    this.setSaveStatus('saved');
  },

  resetToDefaults() {
    // Reset DOM styling to clean default state upon logout
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-font-size');
    if (typeof I18n !== 'undefined') {
      I18n.applyLanguage('en-US', true);
    } else {
      document.documentElement.setAttribute('lang', 'en-US');
    }

    const lightCard = document.getElementById('theme-card-light');
    const darkCard = document.getElementById('theme-card-dark');
    if (lightCard) lightCard.classList.add('active');
    if (darkCard) darkCard.classList.remove('active');

    const langSelect = document.getElementById('profile-language-select');
    if (langSelect) langSelect.value = 'en-US';
  },

  setupEventListeners() {
    // Top Hero Avatar Click & File Upload
    const avatarWrap = document.getElementById('profile-hero-avatar-wrap');
    const fileInput = document.getElementById('profile-hero-file-input');
    if (avatarWrap && fileInput) {
      avatarWrap.addEventListener('click', () => {
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          this.handleAvatarUpload(file);
        }
      });
    }

    // Dashboard avatar shortcut to view profile
    const dashAvatar = document.getElementById('student-display-avatar');
    if (dashAvatar) {
      dashAvatar.style.cursor = 'pointer';
      dashAvatar.title = 'Click to view profile & change picture';
      dashAvatar.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = '#student-profile';
      });
    }

    // Theme Cards
    const lightCard = document.getElementById('theme-card-light');
    if (lightCard) {
      lightCard.addEventListener('click', () => this.applyTheme('light'));
    }
    const darkCard = document.getElementById('theme-card-dark');
    if (darkCard) {
      darkCard.addEventListener('click', () => this.applyTheme('dark'));
    }

    // Language selector (Profile and Header)
    const langSelect = document.getElementById('profile-language-select');
    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        this.applyLanguage(e.target.value);
      });
    }

    const headerLangSelect = document.getElementById('header-language-select');
    if (headerLangSelect) {
      headerLangSelect.addEventListener('change', (e) => {
        this.applyLanguage(e.target.value);
      });
    }

    // Timezone selector
    const tzSelect = document.getElementById('profile-timezone-select');
    if (tzSelect) {
      tzSelect.addEventListener('change', (e) => {
        this.applyTimezone(e.target.value);
        if (typeof Student !== 'undefined' && Student.loadDashboard) {
          Student.loadDashboard();
        }
      });
    }

    // Notification toggles
    const notifMap = {
      'notif-lessons': 'notif_lessons',
      'notif-calendar': 'notif_calendar',
      'notif-messages': 'notif_messages',
      'notif-reports': 'notif_reports'
    };

    Object.keys(notifMap).forEach(id => {
      const toggle = document.getElementById(id);
      if (toggle) {
        const prefKey = notifMap[id];
        toggle.addEventListener('change', (e) => {
          this.applyNotification(prefKey, e.target.checked);
        });
      }
    });

    // Profile Form
    const profileForm = document.getElementById('profile-page-form');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => this.handleProfileSubmit(e));
    }

    // Password Form
    const passForm = document.getElementById('profile-password-form');
    if (passForm) {
      passForm.addEventListener('submit', (e) => this.handlePasswordSubmit(e));
    }
  },

  async handleAvatarUpload(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WebP, etc.).', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image size should be less than 10MB.', 'error');
      return;
    }

    // Immediate preview
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      this.updateAllAvatars(dataUrl);

      try {
        showToast('Saving profile picture...', 'info');
        const formData = new FormData();
        formData.append('avatar', file);

        let finalUrl = dataUrl;
        try {
          const res = await API.uploadAvatar(formData);
          if (res && res.avatar_url) {
            finalUrl = res.avatar_url;
          }
        } catch (uploadErr) {
          console.warn('Multer upload failed, falling back to base64 save:', uploadErr);
          await API.updateProfile({ avatar_url: dataUrl });
        }

        if (typeof Auth !== 'undefined' && Auth.currentUser) {
          Auth.currentUser.avatar_url = finalUrl;
          Storage.setUser(Auth.currentUser);
        }
        this.updateAllAvatars(finalUrl);
        showToast('Profile picture saved! It will remain in place on your account.', 'success');
      } catch (err) {
        console.error('Error saving avatar:', err);
        showToast(err.message || 'Failed to save profile picture.', 'error');
      }
    };
    reader.readAsDataURL(file);
  },

  updateAllAvatars(url) {
    if (!url) return;
    const heroAvatar = document.getElementById('profile-hero-avatar');
    const studentAvatar = document.getElementById('student-display-avatar');
    const subAvatar = document.getElementById('student-sub-avatar');
    if (heroAvatar) heroAvatar.src = url;
    if (studentAvatar) studentAvatar.src = url;
    if (subAvatar) subAvatar.src = url;
    document.querySelectorAll('.user-avatar, .nav-user-avatar').forEach(img => {
      img.src = url;
    });
  },

  async loadProfilePage() {
    const user = Auth.currentUser;
    if (!user) {
      showToast('Please sign in to view your profile and settings.', 'info');
      window.location.hash = '#login';
      return;
    }

    try {
      const data = await API.getMe();
      this.currentUser = data.user || user;
      this.studentProfile = data.studentProfile || {};
      this.userPreferences = data.preferences || null;

      // Load subscription
      try {
        const subRes = await API.getStudentSubscription();
        this.activeSubscription = subRes.activeSubscription || null;
      } catch (e) {
        this.activeSubscription = null;
      }

      this.renderProfileData();
    } catch (e) {
      console.error('Error loading profile page:', e);
      showToast('Failed to load profile details.', 'error');
    }
  },

  renderProfileData() {
    const u = this.currentUser || {};
    const sp = this.studentProfile || {};
    const sub = this.activeSubscription;
    const prefs = this.userPreferences || u.preferences || {};

    // Hero Section
    const heroName = document.getElementById('profile-hero-name');
    const heroEmail = document.getElementById('profile-hero-email');
    const heroAvatar = document.getElementById('profile-hero-avatar');
    const heroSubBadge = document.getElementById('profile-hero-sub-badge');
    const heroGradeBadge = document.getElementById('profile-hero-grade-badge');

    if (heroName) heroName.textContent = u.name || 'Student';
    if (heroEmail) heroEmail.textContent = u.email || '';
    if (heroGradeBadge) heroGradeBadge.textContent = sp.grade_level || 'Grade 11 - High School';

    if (u.avatar_url) {
      this.updateAllAvatars(u.avatar_url);
    } else if (heroAvatar) {
      heroAvatar.src = '/assets/favicon.png';
    }

    if (heroSubBadge) {
      if (sub && sub.status === 'active') {
        heroSubBadge.innerHTML = `${Icons.gem(14)} Active Plan (${sub.lessons_remaining} credits remaining)`;
        heroSubBadge.className = 'badge-gold';
      } else {
        heroSubBadge.innerHTML = `${Icons.creditCard(14)} Standard Pay-per-session`;
        heroSubBadge.className = 'badge-secondary';
      }
    }

    // Form Fields
    const nameInput = document.getElementById('profile-name');
    const emailInput = document.getElementById('profile-email');
    const phoneInput = document.getElementById('profile-phone');
    const gradeSelect = document.getElementById('profile-grade');
    const schoolInput = document.getElementById('profile-school');
    const goalsInput = document.getElementById('profile-goals');
    const subjectsInput = document.getElementById('profile-subjects');

    if (nameInput) nameInput.value = u.name || '';
    if (emailInput) emailInput.value = u.email || '';
    if (phoneInput) phoneInput.value = u.phone || '';
    if (gradeSelect) gradeSelect.value = sp.grade_level || 'Grade 11 - High School';
    if (schoolInput) schoolInput.value = sp.school || '';
    if (goalsInput) goalsInput.value = sp.learning_goals || '';
    if (subjectsInput) subjectsInput.value = sp.target_subjects || '';

    // Synchronize All Saved Preferences from DB to UI controls
    this.syncAllPreferences(prefs, false);
  },

  async handleProfileSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('profile-name')?.value.trim();
    const phone = document.getElementById('profile-phone')?.value.trim();
    const grade_level = document.getElementById('profile-grade')?.value;
    const school = document.getElementById('profile-school')?.value.trim();
    const learning_goals = document.getElementById('profile-goals')?.value.trim();
    const target_subjects = document.getElementById('profile-subjects')?.value.trim();

    const submitBtn = document.getElementById('btn-save-profile');

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = typeof I18n !== 'undefined' ? I18n.t('settings.saving_profile') : 'Saving Changes...';
      }

      await API.updateProfile({
        name,
        phone,
        studentData: { grade_level, school, learning_goals, target_subjects }
      });

      showToast('Profile information and academic goals saved!', 'success');
      await Auth.restoreSession();
      await this.loadProfilePage();
    } catch (err) {
      showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = typeof I18n !== 'undefined' ? I18n.t('settings.save_profile') : 'Save Profile Changes';
      }
    }
  },

  async handlePasswordSubmit(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('profile-curr-password')?.value;
    const newPassword = document.getElementById('profile-new-password')?.value;
    const confirmPassword = document.getElementById('profile-confirm-password')?.value;
    const submitBtn = document.getElementById('btn-save-password');

    if (!currentPassword || !newPassword) {
      showToast('Please enter both your current and new password.', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters long.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match. Please re-enter.', 'error');
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = typeof I18n !== 'undefined' ? I18n.t('settings.updating_password') : 'Updating Password...';
      }

      const res = await API.changePassword({ currentPassword, newPassword });
      showToast(res.message || 'Password updated successfully!', 'success');

      // Clear password fields
      document.getElementById('profile-curr-password').value = '';
      document.getElementById('profile-new-password').value = '';
      document.getElementById('profile-confirm-password').value = '';
    } catch (err) {
      showToast(err.message || 'Failed to update password.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = typeof I18n !== 'undefined' ? I18n.t('settings.update_password') : 'Update Password';
      }
    }
  }
};

// Initialize immediately on script load
Profile.initPreferences();

document.addEventListener('DOMContentLoaded', () => {
  Profile.init();
});
