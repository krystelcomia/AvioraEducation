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
    const u = (typeof Auth !== 'undefined' && Auth.currentUser) || (typeof Storage !== 'undefined' ? Storage.getUser() : null);
    if (!u || !u.id) {
      // Default theme is ALWAYS light mode for non-logged-in users
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem('aviora_theme');
      document.documentElement.removeAttribute('data-font-size');

      return;
    }

    const key = `_${u.id}`;
    const savedTheme = localStorage.getItem(`aviora_theme${key}`) || 'light';
    this.applyTheme(savedTheme, false, false);
    document.documentElement.removeAttribute('data-font-size');

    const savedLang = localStorage.getItem(`aviora_language${key}`) || 'en-US';
    this.applyLanguage(savedLang, false, false);

    const savedTz = localStorage.getItem(`aviora_timezone${key}`) || 'America/New_York';
    this.applyTimezone(savedTz, false, false);

    const savedCountry = localStorage.getItem(`aviora_country${key}`) || u.country || 'United States';
    this.applyCountry(savedCountry, false, false);
  },

  setSaveStatus(status, text) {
    const pills = [document.getElementById('settings-status-pill'), document.getElementById('teacher-settings-status-pill'), document.getElementById('admin-settings-status-pill')].filter(Boolean);
    const textEls = [document.getElementById('settings-status-text'), document.getElementById('teacher-settings-status-text'), document.getElementById('admin-settings-status-text')].filter(Boolean);
    const dotEls = [document.getElementById('settings-status-dot'), document.getElementById('teacher-settings-status-dot'), document.getElementById('admin-settings-status-dot')].filter(Boolean);
    if (!pills.length) return;

    if (this.saveStatusTimeout) clearTimeout(this.saveStatusTimeout);

    pills.forEach(pill => {
      pill.style.display = 'inline-flex';
      pill.classList.remove('status-saving', 'status-saved', 'status-error', 'status-default');
      pill.classList.add(`status-${status}`);
      pill.style.removeProperty('background');
      pill.style.removeProperty('border-color');
      pill.style.removeProperty('color');
    });

    dotEls.forEach(dot => {
      dot.style.removeProperty('background');
    });

    textEls.forEach(textEl => {
      if (status === 'saving') textEl.textContent = text || (typeof I18n !== 'undefined' ? I18n.t('common.saving', 'Saving...') : 'Saving...');
      else if (status === 'saved') textEl.textContent = text || (typeof I18n !== 'undefined' ? I18n.t('common.saved', 'Saved to Account') : 'Saved to Account');
      else if (status === 'error') textEl.textContent = text || 'Sync Failed';
    });

    if (status === 'saved') {
      this.saveStatusTimeout = setTimeout(() => {
        pills.forEach(pill => {
          pill.classList.remove('status-saving', 'status-saved', 'status-error');
          pill.classList.add('status-default');
          pill.style.removeProperty('background');
          pill.style.removeProperty('border-color');
          pill.style.removeProperty('color');
        });
        dotEls.forEach(dot => { dot.style.removeProperty('background'); });
        textEls.forEach(textEl => { textEl.textContent = 'Saved to Account'; });
      }, 4000);
    }
  },

  applyTheme(theme, notify = true, persistToServer = true) {
    const u = (typeof Auth !== 'undefined' && Auth.currentUser) || (typeof Storage !== 'undefined' ? Storage.getUser() : null);
    if (!u || !u.id) {
      // Not logged in: Default theme is strictly light mode
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem('aviora_theme');
      return;
    }

    const isDark = (theme === 'dark');
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    // Apply ONLY to this specific user's own account
    localStorage.setItem(`aviora_theme_${u.id}`, isDark ? 'dark' : 'light');
    localStorage.removeItem('aviora_theme');

    const lightCard = document.getElementById('theme-card-light');
    const darkCard = document.getElementById('theme-card-dark');
    if (lightCard) lightCard.classList.toggle('active', !isDark);
    if (darkCard) darkCard.classList.toggle('active', isDark);

    const tLightCard = document.getElementById('teacher-theme-card-light');
    const tDarkCard = document.getElementById('teacher-theme-card-dark');
    if (tLightCard) tLightCard.classList.toggle('active', !isDark);
    if (tDarkCard) tDarkCard.classList.toggle('active', isDark);

    const aLightCard = document.getElementById('admin-theme-card-light');
    const aDarkCard = document.getElementById('admin-theme-card-dark');
    if (aLightCard) aLightCard.classList.toggle('active', !isDark);
    if (aDarkCard) aDarkCard.classList.toggle('active', isDark);

    if (persistToServer && typeof API !== 'undefined') {
      this.setSaveStatus('saving');
      API.updateUserPreferences({ theme: isDark ? 'dark' : 'light' })
        .then(res => {
          if (res && res.preferences) {
            this.userPreferences = res.preferences;
            Storage.setUserPreferences(u.id, res.preferences);
          }
          this.setSaveStatus('saved');
        })
        .catch(e => {
          console.warn('Theme preference sync warning:', e);
          this.setSaveStatus('error', 'Saved Locally');
        });
    }

    if (notify) {
      const msg = typeof I18n !== 'undefined' ? I18n.t('toast.theme_saved') : `${isDark ? 'Dark' : 'Light'} theme saved to your account`;
      showToast(msg, 'info');
    }
  },

  applyFontSize(size) {
    document.documentElement.removeAttribute('data-font-size');
  },

  applyLanguage(lang, notify = true, persistToServer = true) {
    const u = (typeof Auth !== 'undefined' && Auth.currentUser) || (typeof Storage !== 'undefined' ? Storage.getUser() : null);
    if (!u || !u.id) {
      // Language switching option is disabled for users who are not logged in
      return;
    }

    const activeLang = lang || 'en-US';
    const langSelect = document.getElementById('profile-language-select');
    if (langSelect) langSelect.value = activeLang;
    const tLangSelect = document.getElementById('teacher-language-select');
    if (tLangSelect) tLangSelect.value = activeLang;
    const aLangSelect = document.getElementById('admin-language-select');
    if (aLangSelect) aLangSelect.value = activeLang;

    localStorage.setItem(`aviora_language_${u.id}`, activeLang);
    localStorage.removeItem('aviora_language');

    if (typeof I18n !== 'undefined') {
      I18n.applyLanguage(activeLang);
    } else {
      document.documentElement.setAttribute('lang', activeLang);
    }

    if (persistToServer && typeof API !== 'undefined') {
      this.setSaveStatus('saving');
      API.updateUserPreferences({ language: activeLang })
        .then(res => {
          if (res && res.preferences) {
            this.userPreferences = res.preferences;
            Storage.setUserPreferences(u.id, res.preferences);
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

  applyCountry(country, notify = true, persistToServer = true) {
    const activeCountry = country || 'United States';
    ['profile-country-select', 'teacher-country-select', 'teacher-profile-country', 'admin-country-select', 'app-country'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = activeCountry;
    });

    const flag = typeof AvioraGeo !== 'undefined' ? AvioraGeo.getCountryFlag(activeCountry) : '🌐';
    ['teacher-profile-country-flag', 'teacher-dashboard-country-flag'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = flag;
    });
    ['teacher-profile-country-name', 'teacher-dashboard-country-name'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = activeCountry;
    });

    const key = this.getUserKey();
    if (key) localStorage.setItem(`aviora_country${key}`, activeCountry);
    localStorage.setItem('aviora_country', activeCountry);

    // Auto-update timezone when country is selected if appropriate
    if (typeof AvioraGeo !== 'undefined') {
      const defTz = AvioraGeo.getDefaultTimezone(activeCountry);
      const currentTz = key ? localStorage.getItem(`aviora_timezone${key}`) : null;
      if (!currentTz || notify) {
        if (typeof this.applyTimezone === 'function') {
          this.applyTimezone(defTz, false, persistToServer);
        }
      }
    }

    if (persistToServer && typeof Auth !== 'undefined' && Auth.currentUser && typeof API !== 'undefined') {
      this.setSaveStatus('saving');
      API.updateUserPreferences({ country: activeCountry })
        .then(res => {
          if (res && res.preferences) {
            this.userPreferences = res.preferences;
            if (typeof Storage !== 'undefined' && Storage.setUserPreferences) {
              Storage.setUserPreferences(Auth.currentUser.id, res.preferences);
            }
          }
          this.setSaveStatus('saved');
        })
        .catch(e => {
          console.warn('Country preference sync warning:', e);
          this.setSaveStatus('error', 'Saved Locally');
        });
    }

    if (notify) {
      const flag = typeof AvioraGeo !== 'undefined' ? AvioraGeo.getCountryFlag(activeCountry) : '🌐';
      showToast(`Country set to ${flag} ${activeCountry}`, 'success');
    }
  },

  
  updateTimezoneClockDisplays(tz) {
    const activeTz = tz || (typeof localStorage !== 'undefined' ? (localStorage.getItem('aviora_timezone' + (this.getUserKey ? this.getUserKey() : '')) || localStorage.getItem('aviora_timezone')) : null) || 'America/New_York';
    let timeStr = '--:-- --';
    let abbr = 'EST';
    const geo = (typeof AvioraGeo !== 'undefined' ? AvioraGeo : (typeof window !== 'undefined' ? window.AvioraGeo : null));
    if (geo) {
      timeStr = geo.getCurrentTimeInZone(activeTz);
      abbr = geo.getTimezoneAbbr(activeTz);
    } else {
      try {
        timeStr = new Intl.DateTimeFormat('en-US', { timeZone: activeTz, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date());
        abbr = activeTz.split('/').pop().replace('_', ' ');
      } catch (e) {}
    }

    ['profile', 'teacher', 'admin'].forEach(prefix => {
      const textEl = document.getElementById(`${prefix}-timezone-time-text`);
      const abbrEl = document.getElementById(`${prefix}-timezone-time-abbr`);
      const boxEl = document.getElementById(`${prefix}-timezone-clock-display`);
      if (textEl) textEl.textContent = timeStr;
      if (abbrEl) abbrEl.textContent = abbr;
      if (boxEl) boxEl.setAttribute('data-tz', activeTz);
    });
  },

  applyTimezone(tz, notify = true, persistToServer = true) {
    const activeTz = tz || 'America/New_York';
    const tzSelect = document.getElementById('profile-timezone-select');
    if (tzSelect) tzSelect.value = activeTz;
    const tTzSelect = document.getElementById('teacher-timezone-select');
    if (tTzSelect) tTzSelect.value = activeTz;
    const tpTzSelect = document.getElementById('teacher-profile-timezone');
    if (tpTzSelect) tpTzSelect.value = activeTz;
    const aTzSelect = document.getElementById('admin-timezone-select');
    if (aTzSelect) aTzSelect.value = activeTz;

    this.updateTimezoneClockDisplays(activeTz);

    ['teacher-profile-live-clock', 'teacher-dashboard-live-clock'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.setAttribute('data-tz', activeTz);
        if (typeof AvioraGeo !== 'undefined') {
          el.textContent = `${AvioraGeo.getCurrentTimeInZone(activeTz)} (${AvioraGeo.getTimezoneAbbr(activeTz)})`;
        }
      }
    });

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
    const tToggle = document.getElementById('teacher-' + elementId);
    if (tToggle) tToggle.checked = Boolean(isChecked);
    const aToggle = document.getElementById('admin-' + elementId);
    if (aToggle) aToggle.checked = Boolean(isChecked);

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

    const activeTheme = prefs.theme || (user && user.id && localStorage.getItem(`aviora_theme_${user.id}`)) || (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    this.applyTheme(activeTheme, notify, false);
    if (prefs.font_size) {
      this.applyFontSize(prefs.font_size, notify, false);
    }
    if (prefs.language) {
      this.applyLanguage(prefs.language, notify, false);
    }
    if (prefs.country) {
      this.applyCountry(prefs.country, notify, false);
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

    ['theme-card-light', 'teacher-theme-card-light', 'admin-theme-card-light'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('active');
    });
    ['theme-card-dark', 'teacher-theme-card-dark', 'admin-theme-card-dark'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('active');
    });

    ['settings-status-pill', 'teacher-settings-status-pill', 'admin-settings-status-pill'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.className = 'settings-status-pill status-default';
        el.style.removeProperty('background');
        el.style.removeProperty('border-color');
        el.style.removeProperty('color');
      }
    });

    const langSelect = document.getElementById('profile-language-select');
    if (langSelect) langSelect.value = 'en-US';
    ['profile-country-select', 'teacher-country-select', 'admin-country-select'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = 'United States';
    });
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
      ['change', 'input'].forEach(evt => {
        langSelect.addEventListener(evt, (e) => {
          this.applyLanguage(e.target.value);
        });
      });
    }

    
    // Instant live clock updates on timezone select change/input
    ['profile-timezone-select', 'teacher-timezone-select', 'admin-timezone-select'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        ['change', 'input'].forEach(evt => {
          el.addEventListener(evt, (e) => {
            this.updateTimezoneClockDisplays(e.target.value);
            if (evt === 'change') {
              this.applyTimezone(e.target.value);
            }
          });
        });
      }
    });
    this.updateTimezoneClockDisplays();

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

    // Profile Form - Auto-save on entry & handle Enter key
    const profileForm = document.getElementById('profile-page-form');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.autoSaveProfile(true);
      });
    }

    // Auto-save on entry for all profile fields
    const autoSaveFieldIds = [
      'profile-phone',
      'profile-school',
      'profile-goals',
      'profile-subjects'
    ];

    autoSaveFieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'SELECT') {
        el.addEventListener('change', () => this.autoSaveProfile(true));
      } else {
        el.addEventListener('input', () => this.autoSaveProfile(false));
        el.addEventListener('change', () => this.autoSaveProfile(true));
        el.addEventListener('blur', () => this.autoSaveProfile(true));
      }
    });

    // Account Security: Gmail Account field auto-save
    const gmailAccountEl = document.getElementById('profile-gmail-account');
    if (gmailAccountEl) {
      gmailAccountEl.addEventListener('change', () => this.autoSaveGmail());
      gmailAccountEl.addEventListener('blur', () => this.autoSaveGmail());
    }

    // Password Form (Student)
    const passForm = document.getElementById('profile-password-form');
    if (passForm) {
      passForm.addEventListener('submit', (e) => this.handlePasswordSubmit(e, false));
    }

    // --- Teacher Profile Settings Listeners ---
    const tAvatarWrap = document.getElementById('teacher-profile-hero-avatar-wrap');
    const tFileInput = document.getElementById('teacher-profile-file-input');
    if (tAvatarWrap && tFileInput) {
      tAvatarWrap.addEventListener('click', () => {
        tFileInput.click();
      });

      tFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          this.handleAvatarUpload(file);
        }
      });
    }

    const tLightCard = document.getElementById('teacher-theme-card-light');
    if (tLightCard) {
      tLightCard.addEventListener('click', () => this.applyTheme('light'));
    }
    const tDarkCard = document.getElementById('teacher-theme-card-dark');
    if (tDarkCard) {
      tDarkCard.addEventListener('click', () => this.applyTheme('dark'));
    }

    const tLangSelect = document.getElementById('teacher-language-select');
    if (tLangSelect) {
      ['change', 'input'].forEach(evt => {
        tLangSelect.addEventListener(evt, (e) => {
          this.applyLanguage(e.target.value);
        });
      });
    }

    ['teacher-country-select', 'teacher-profile-country'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        ['change', 'input'].forEach(evt => {
          el.addEventListener(evt, (e) => {
            this.applyCountry(e.target.value);
          });
        });
      }
    });

    ['teacher-timezone-select', 'teacher-profile-timezone'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        ['change', 'input'].forEach(evt => {
          el.addEventListener(evt, (e) => {
            this.applyTimezone(e.target.value);
          });
        });
      }
    });

    ['teacher-notif-lessons', 'teacher-notif-calendar', 'teacher-notif-messages', 'teacher-notif-reports'].forEach(id => {
      const toggle = document.getElementById(id);
      if (toggle) {
        const prefKey = id.replace('teacher-', '').replace('-', '_');
        toggle.addEventListener('change', (e) => {
          this.applyNotification(prefKey, e.target.checked);
        });
      }
    });

    const tPassForm = document.getElementById('teacher-password-form');
    if (tPassForm) {
      tPassForm.addEventListener('submit', (e) => this.handlePasswordSubmit(e, 'teacher'));
    }

    // --- Admin Profile Settings Listeners ---
    const aAvatarWrap = document.getElementById('admin-profile-hero-avatar-wrap');
    const aFileInput = document.getElementById('admin-profile-file-input');
    if (aAvatarWrap && aFileInput) {
      aAvatarWrap.addEventListener('click', () => {
        aFileInput.click();
      });

      aFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          this.handleAvatarUpload(file);
        }
      });
    }

    const aLightCard = document.getElementById('admin-theme-card-light');
    if (aLightCard) {
      aLightCard.addEventListener('click', () => this.applyTheme('light'));
    }
    const aDarkCard = document.getElementById('admin-theme-card-dark');
    if (aDarkCard) {
      aDarkCard.addEventListener('click', () => this.applyTheme('dark'));
    }

    const aLangSelect = document.getElementById('admin-language-select');
    if (aLangSelect) {
      ['change', 'input'].forEach(evt => {
        aLangSelect.addEventListener(evt, (e) => {
          this.applyLanguage(e.target.value);
        });
      });
    }

    const aTzSelect = document.getElementById('admin-timezone-select');
    if (aTzSelect) {
      aTzSelect.addEventListener('change', (e) => {
        this.applyTimezone(e.target.value);
      });
    }

    ['admin-notif-lessons', 'admin-notif-calendar', 'admin-notif-messages', 'admin-notif-reports'].forEach(id => {
      const toggle = document.getElementById(id);
      if (toggle) {
        const prefKey = id.replace('admin-', '').replace('-', '_');
        toggle.addEventListener('change', (e) => {
          this.applyNotification(prefKey, e.target.checked);
        });
      }
    });

    const aPassForm = document.getElementById('admin-password-form');
    if (aPassForm) {
      aPassForm.addEventListener('submit', (e) => this.handlePasswordSubmit(e, 'admin'));
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
    const tHeroAvatar = document.getElementById('teacher-profile-hero-avatar');
    const tDashAvatar = document.getElementById('teacher-hero-avatar');
    const aHeroAvatar = document.getElementById('admin-profile-hero-avatar');
    const navAvatar = document.getElementById('nav-user-profile-avatar');
    if (heroAvatar) heroAvatar.src = url;
    if (studentAvatar) studentAvatar.src = url;
    if (subAvatar) subAvatar.src = url;
    if (tHeroAvatar) tHeroAvatar.src = url;
    if (tDashAvatar) tDashAvatar.src = url;
    if (aHeroAvatar) aHeroAvatar.src = url;
    if (navAvatar) navAvatar.src = url;
    document.querySelectorAll('.user-avatar, .nav-user-avatar, .teacher-hero-avatar').forEach(img => {
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

    const gmailAccountInput = document.getElementById('profile-gmail-account');
    if (gmailAccountInput) gmailAccountInput.value = u.email || '';

    // Synchronize All Saved Preferences from DB to UI controls
    this.syncAllPreferences(prefs, false);

    // Refresh Daily Lucky Spin Wheel
    if (typeof SpinWheel !== 'undefined' && SpinWheel.refresh) {
      SpinWheel.refresh();
      if (SpinWheel.drawWheel) SpinWheel.drawWheel();
    }
  },

  autoSaveDebounceTimer: null,

  autoSaveProfile(immediate = false) {
    if (this.autoSaveDebounceTimer) {
      clearTimeout(this.autoSaveDebounceTimer);
      this.autoSaveDebounceTimer = null;
    }

    if (immediate) {
      this.performAutoSaveProfile();
    } else {
      this.setSaveStatus('saving', typeof I18n !== 'undefined' ? I18n.t('common.saving', 'Saving...') : 'Saving...');
      this.autoSaveDebounceTimer = setTimeout(() => {
        this.performAutoSaveProfile();
      }, 600);
    }
  },

  async performAutoSaveProfile() {
    // Full name remains exactly as entered during registration and cannot be modified
    const name = this.currentUser?.name || (typeof Auth !== 'undefined' && Auth.currentUser?.name) || document.getElementById('profile-name')?.value?.trim();
    const phone = document.getElementById('profile-phone')?.value.trim();
    // Grade level remains exactly as entered during registration and cannot be modified in the profile
    const grade_level = this.studentProfile?.grade_level || document.getElementById('profile-grade')?.value || 'Grade 11 - High School';
    const school = document.getElementById('profile-school')?.value.trim();
    const learning_goals = document.getElementById('profile-goals')?.value.trim();
    const target_subjects = document.getElementById('profile-subjects')?.value.trim();

    try {
      this.setSaveStatus('saving', typeof I18n !== 'undefined' ? I18n.t('common.saving', 'Saving...') : 'Saving...');
      await API.updateProfile({
        phone,
        studentData: { grade_level, school, learning_goals, target_subjects }
      });

      if (typeof Auth !== 'undefined' && Auth.currentUser) {
        Auth.currentUser.name = name;
        Auth.currentUser.phone = phone;
        Storage.setUser(Auth.currentUser);
      }

      const heroName = document.getElementById('profile-hero-name');
      if (heroName && name) heroName.textContent = name;
      const heroGrade = document.getElementById('profile-hero-grade-badge');
      if (heroGrade && grade_level) heroGrade.textContent = grade_level;

      this.setSaveStatus('saved', typeof I18n !== 'undefined' ? I18n.t('common.saved', 'Saved to Account') : 'Saved to Account');
    } catch (err) {
      console.warn('Auto-save profile error:', err);
      this.setSaveStatus('error', 'Sync Failed');
    }
  },

  async autoSaveGmail() {
    const gmailInput = document.getElementById('profile-gmail-account');
    if (!gmailInput) return;
    const email = gmailInput.value.trim();
    if (!email || !email.includes('@')) return;

    try {
      this.setSaveStatus('saving', typeof I18n !== 'undefined' ? I18n.t('common.saving', 'Saving...') : 'Saving...');
      await API.updateProfile({ email });
      if (typeof Auth !== 'undefined' && Auth.currentUser) {
        Auth.currentUser.email = email;
        Storage.setUser(Auth.currentUser);
      }
      const pEmail = document.getElementById('profile-email');
      if (pEmail) pEmail.value = email;
      const heroEmail = document.getElementById('profile-hero-email');
      if (heroEmail) heroEmail.textContent = email;
      this.setSaveStatus('saved', typeof I18n !== 'undefined' ? I18n.t('common.saved', 'Saved to Account') : 'Saved to Account');
    } catch (e) {
      console.warn('Auto-save Gmail error:', e);
      this.setSaveStatus('error', 'Sync Failed');
    }
  },

  async handleProfileSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    await this.performAutoSaveProfile();
  },

  async handlePasswordSubmit(e, role = 'student') {
    e.preventDefault();
    const isTeacher = (role === 'teacher' || role === true);
    const isAdmin = (role === 'admin');
    const currId = isAdmin ? 'admin-curr-password' : (isTeacher ? 'teacher-curr-password' : 'profile-curr-password');
    const newId = isAdmin ? 'admin-new-password' : (isTeacher ? 'teacher-new-password' : 'profile-new-password');
    const confId = isAdmin ? 'admin-confirm-password' : (isTeacher ? 'teacher-confirm-password' : 'profile-confirm-password');
    const btnId = isAdmin ? 'btn-save-admin-password' : (isTeacher ? 'btn-save-teacher-password' : 'btn-save-password');

    const currentPassword = document.getElementById(currId)?.value;
    const newPassword = document.getElementById(newId)?.value;
    const confirmPassword = document.getElementById(confId)?.value;
    const submitBtn = document.getElementById(btnId);

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
      const currEl = document.getElementById(currId);
      const newEl = document.getElementById(newId);
      const confEl = document.getElementById(confId);
      if (currEl) currEl.value = '';
      if (newEl) newEl.value = '';
      if (confEl) confEl.value = '';
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

window.Profile = Profile;

// Initialize immediately on script load
Profile.initPreferences();

document.addEventListener('DOMContentLoaded', () => {
  Profile.init();
});
