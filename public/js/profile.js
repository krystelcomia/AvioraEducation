/**
 * AVIORA EDUCATION - DEDICATED STUDENT PROFILE & SETTINGS LOGIC
 */

const Profile = {
  currentUser: null,
  studentProfile: null,
  activeSubscription: null,

  init() {
    this.initTheme();
    this.setupEventListeners();
  },

  initTheme() {
    const savedTheme = localStorage.getItem('aviora_theme') || 'light';
    this.applyTheme(savedTheme, false);
  },

  applyTheme(theme, notify = true) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('aviora_theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('aviora_theme', 'light');
    }

    const lightCard = document.getElementById('theme-card-light');
    const darkCard = document.getElementById('theme-card-dark');
    if (lightCard) lightCard.classList.toggle('active', theme === 'light');
    if (darkCard) darkCard.classList.toggle('active', theme === 'dark');

    if (notify) {
      showToast(`${theme === 'dark' ? 'Dark' : 'Light'} theme activated`, 'info');
    }
  },

  setupEventListeners() {
    // Theme Cards
    const lightCard = document.getElementById('theme-card-light');
    if (lightCard) {
      lightCard.addEventListener('click', () => this.applyTheme('light'));
    }
    const darkCard = document.getElementById('theme-card-dark');
    if (darkCard) {
      darkCard.addEventListener('click', () => this.applyTheme('dark'));
    }

    // Language selector
    const langSelect = document.getElementById('profile-language-select');
    if (langSelect) {
      const savedLang = localStorage.getItem('aviora_language') || 'en-US';
      langSelect.value = savedLang;
      langSelect.addEventListener('change', (e) => {
        localStorage.setItem('aviora_language', e.target.value);
        showToast('Language preference saved', 'success');
      });
    }

    // Timezone selector
    const tzSelect = document.getElementById('profile-timezone-select');
    if (tzSelect) {
      const savedTz = localStorage.getItem('aviora_timezone') || 'America/New_York';
      tzSelect.value = savedTz;
      tzSelect.addEventListener('change', (e) => {
        localStorage.setItem('aviora_timezone', e.target.value);
        showToast('Timezone preference saved', 'success');
      });
    }

    // Notification toggles
    ['notif-lessons', 'notif-calendar', 'notif-messages', 'notif-reports'].forEach(id => {
      const toggle = document.getElementById(id);
      if (toggle) {
        const saved = localStorage.getItem(`aviora_${id}`);
        if (saved !== null) {
          toggle.checked = saved === 'true';
        }
        toggle.addEventListener('change', (e) => {
          localStorage.setItem(`aviora_${id}`, e.target.checked);
          showToast('Notification preference updated', 'info');
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

    // Avatar Presets
    document.querySelectorAll('.avatar-preset-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const url = thumb.dataset.avatarUrl;
        const mainAvatar = document.getElementById('profile-page-avatar-display');
        const headerAvatar = document.getElementById('profile-hero-avatar');
        const customUrlInput = document.getElementById('profile-avatar-url');

        if (mainAvatar) mainAvatar.src = url;
        if (headerAvatar) headerAvatar.src = url;
        if (customUrlInput) customUrlInput.value = url;

        document.querySelectorAll('.avatar-preset-thumb').forEach(t => t.classList.remove('selected'));
        thumb.classList.add('selected');
      });
    });

    // Custom avatar url input change
    const customUrlInput = document.getElementById('profile-avatar-url');
    if (customUrlInput) {
      customUrlInput.addEventListener('input', (e) => {
        const url = e.target.value.trim();
        if (url.startsWith('http')) {
          const mainAvatar = document.getElementById('profile-page-avatar-display');
          const headerAvatar = document.getElementById('profile-hero-avatar');
          if (mainAvatar) mainAvatar.src = url;
          if (headerAvatar) headerAvatar.src = url;
        }
      });
    }
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

    // Hero Section
    const heroName = document.getElementById('profile-hero-name');
    const heroEmail = document.getElementById('profile-hero-email');
    const heroAvatar = document.getElementById('profile-hero-avatar');
    const heroSubBadge = document.getElementById('profile-hero-sub-badge');
    const heroGradeBadge = document.getElementById('profile-hero-grade-badge');

    if (heroName) heroName.textContent = u.name || 'Student';
    if (heroEmail) heroEmail.textContent = u.email || '';
    if (heroAvatar) heroAvatar.src = u.avatar_url || '/assets/favicon.png';
    if (heroGradeBadge) heroGradeBadge.textContent = sp.grade_level || 'Grade 11 - High School';

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
    const avatarInput = document.getElementById('profile-avatar-url');
    const displayAvatar = document.getElementById('profile-page-avatar-display');

    if (nameInput) nameInput.value = u.name || '';
    if (emailInput) emailInput.value = u.email || '';
    if (phoneInput) phoneInput.value = u.phone || '';
    if (gradeSelect) gradeSelect.value = sp.grade_level || 'Grade 11 - High School';
    if (schoolInput) schoolInput.value = sp.school || '';
    if (goalsInput) goalsInput.value = sp.learning_goals || '';
    if (subjectsInput) subjectsInput.value = sp.target_subjects || '';
    if (avatarInput) avatarInput.value = u.avatar_url || '';
    if (displayAvatar) displayAvatar.src = u.avatar_url || '/assets/favicon.png';

    // Highlight current theme
    const currentTheme = localStorage.getItem('aviora_theme') || 'light';
    const lightCard = document.getElementById('theme-card-light');
    const darkCard = document.getElementById('theme-card-dark');
    if (lightCard) lightCard.classList.toggle('active', currentTheme === 'light');
    if (darkCard) darkCard.classList.toggle('active', currentTheme === 'dark');
  },

  async handleProfileSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('profile-name')?.value.trim();
    const phone = document.getElementById('profile-phone')?.value.trim();
    const avatar_url = document.getElementById('profile-avatar-url')?.value.trim();
    const grade_level = document.getElementById('profile-grade')?.value;
    const school = document.getElementById('profile-school')?.value.trim();
    const learning_goals = document.getElementById('profile-goals')?.value.trim();
    const target_subjects = document.getElementById('profile-subjects')?.value.trim();

    const submitBtn = document.getElementById('btn-save-profile');

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving Changes...';
      }

      await API.updateProfile({
        name,
        phone,
        avatar_url: avatar_url || null,
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
        submitBtn.textContent = 'Save Profile Changes';
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
        submitBtn.textContent = 'Updating Password...';
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
        submitBtn.textContent = 'Update Password';
      }
    }
  }
};

// Initialize theme immediately on script load
Profile.initTheme();

document.addEventListener('DOMContentLoaded', () => {
  Profile.init();
});
