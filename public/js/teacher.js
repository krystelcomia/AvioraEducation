/**
 * AVIORA EDUCATION - TEACHER APPLICATION & PORTAL LOGIC
 */

const Teacher = {
  application: null,
  tutorProfile: null,
  requests: [],

  async init() {
    this.setupEventListeners();
    await this.loadTeacherView();
  },

  setupEventListeners() {
    // Teacher application form submission
    const appForm = document.getElementById('teacher-application-form');
    if (appForm) {
      appForm.addEventListener('submit', (e) => this.handleApplicationSubmit(e));
    }

    // Teacher file upload change
    const fileInput = document.getElementById('credential-file-input');
    const fileBadge = document.getElementById('selected-file-name');
    if (fileInput && fileBadge) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          fileBadge.style.display = 'inline-flex';
          fileBadge.textContent = `📎 ${e.target.files[0].name} (${(e.target.files[0].size / 1024 / 1024).toFixed(2)} MB)`;
        } else {
          fileBadge.style.display = 'none';
        }
      });
    }

    // Teacher profile settings form submit
    const profileForm = document.getElementById('teacher-profile-settings-form');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => this.handleProfileSettingsSubmit(e));
    }
  },

  async loadTeacherView() {
    const user = Auth.currentUser;
    if (!user || user.role !== 'teacher') return;

    try {
      const statusData = await API.getTeacherStatus();
      this.application = statusData.application;
      this.tutorProfile = statusData.tutorProfile;

      const appStatus = this.application ? this.application.status : 'pending';

      const bannerContainer = document.getElementById('teacher-status-banner-wrap');
      const appFormSection = document.getElementById('teacher-application-section');
      const portalDashboardSection = document.getElementById('teacher-dashboard-section');

      if (appStatus === 'approved') {
        // Render Approved Status & Tutor Dashboard
        if (bannerContainer) {
          bannerContainer.innerHTML = `
            <div class="app-status-banner approved">
              <div class="status-icon-circle">✓</div>
              <div class="status-banner-content">
                <h3>Approved Aviora Academic Tutor</h3>
                <p>Your academic credentials have been verified by the Aviora Academic Board. Your profile is live in the public tutor directory and students can now request sessions with you.</p>
                <div style="margin-top: 0.85rem; display: flex; gap: 0.75rem;">
                  <a href="#tutors" class="btn btn-secondary btn-sm">View in Directory</a>
                  <button class="btn btn-outline-gold btn-sm" onclick="Teacher.toggleEditApplication()">Update Credentials</button>
                </div>
              </div>
            </div>
          `;
        }

        if (appFormSection) appFormSection.style.display = 'none';
        if (portalDashboardSection) portalDashboardSection.style.display = 'block';

        await this.loadTeacherDashboard();
      } else if (appStatus === 'rejected') {
        // Render Rejected Status
        if (bannerContainer) {
          bannerContainer.innerHTML = `
            <div class="app-status-banner rejected">
              <div class="status-icon-circle">✕</div>
              <div class="status-banner-content">
                <h3>Application Requires Revisions</h3>
                <p>The Academic Board reviewed your application with the following feedback: <em>"${this.application.admin_notes || 'Please provide updated degree verification or teaching credentials.'}"</em></p>
                <p style="margin-top: 0.5rem; color: var(--gold-300);">You may update your details below and resubmit for reconsideration.</p>
              </div>
            </div>
          `;
        }

        if (appFormSection) appFormSection.style.display = 'block';
        if (portalDashboardSection) portalDashboardSection.style.display = 'none';
        this.populateApplicationForm();
      } else {
        // Pending Status
        if (bannerContainer) {
          bannerContainer.innerHTML = `
            <div class="app-status-banner pending">
              <div class="status-icon-circle"><span class="pulsing-dot"></span>⏳</div>
              <div class="status-banner-content">
                <h3>Application Under Review by Academic Board</h3>
                <p>Thank you for applying to Aviora Education! Our academic evaluation committee is actively verifying your academic credentials, teaching experience, and background. You will receive an email and in-app notification once approved.</p>
                <p style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--charcoal-400);">Status: <strong>PENDING REVIEW</strong> • Applied: ${new Date(this.application?.created_at || Date.now()).toLocaleDateString()}</p>
              </div>
            </div>
          `;
        }

        if (appFormSection) appFormSection.style.display = 'block';
        if (portalDashboardSection) portalDashboardSection.style.display = 'none';
        this.populateApplicationForm();
      }
    } catch (err) {
      console.error('Failed to load teacher view:', err);
    }
  },

  populateApplicationForm() {
    if (!this.application) return;

    const app = this.application;
    const headline = document.getElementById('app-headline');
    const degree = document.getElementById('app-degree');
    const institution = document.getElementById('app-institution');
    const gradYear = document.getElementById('app-grad-year');
    const exp = document.getElementById('app-years-exp');
    const rate = document.getElementById('app-hourly-rate');
    const bio = document.getElementById('app-bio');
    const phil = document.getElementById('app-philosophy');
    const subjects = document.getElementById('app-subjects');

    if (headline) headline.value = app.headline || '';
    if (degree) degree.value = app.highest_degree || '';
    if (institution) institution.value = app.institution || '';
    if (gradYear) gradYear.value = app.graduation_year || 2022;
    if (exp) exp.value = app.years_experience || 2;
    if (rate) rate.value = app.hourly_rate || 45;
    if (bio) bio.value = app.bio || '';
    if (phil) phil.value = app.teaching_philosophy || '';
    if (subjects) subjects.value = (app.subjects || []).join(', ');
  },

  toggleEditApplication() {
    const formSec = document.getElementById('teacher-application-section');
    if (formSec) {
      formSec.style.display = formSec.style.display === 'none' ? 'block' : 'none';
      if (formSec.style.display === 'block') {
        this.populateApplicationForm();
        formSec.scrollIntoView({ behavior: 'smooth' });
      }
    }
  },

  async loadTeacherDashboard() {
    try {
      const data = await API.getTeacherDashboard();
      this.requests = data.requests || [];
      const stats = data.stats || {};

      const earnElem = document.getElementById('teacher-stat-earnings');
      const reqElem = document.getElementById('teacher-stat-requests');
      const activeElem = document.getElementById('teacher-stat-active');
      const ratingElem = document.getElementById('teacher-stat-rating');

      if (earnElem) earnElem.textContent = `$${stats.total_earnings?.toFixed(2) || '0.00'}`;
      if (reqElem) reqElem.textContent = stats.pending_requests || 0;
      if (activeElem) activeElem.textContent = stats.active_sessions || 0;
      if (ratingElem) ratingElem.textContent = `${stats.rating?.toFixed(1) || '5.0'} (${stats.reviews_count || 0})`;

      this.renderTeacherRequests();
      this.populateProfileSettings(data.tutorProfile);
    } catch (err) {
      console.error('Failed to load teacher dashboard:', err);
    }
  },

  renderTeacherRequests() {
    const container = document.getElementById('teacher-requests-table-body');
    if (!container) return;

    if (this.requests.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 3rem;">
            <div class="empty-state">
              <div class="empty-icon">📬</div>
              <h4 class="empty-title">No Incoming Tutoring Requests Yet</h4>
              <p class="empty-desc">When students book a session with you, their requests will appear here for you to accept or manage.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    container.innerHTML = this.requests.map(r => `
      <tr>
        <td>
          <div class="user-cell">
            <img src="${r.student_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" class="user-cell-avatar" />
            <div>
              <div class="user-cell-name">${r.student_name}</div>
              <div class="user-cell-email">${r.student_email} • ${r.student_grade || 'Student'}</div>
            </div>
          </div>
        </td>
        <td>
          <strong style="color: var(--white);">${r.subject}</strong>
          ${r.notes ? `<div style="font-size: 0.775rem; color: var(--charcoal-400); max-width: 200px;">"${r.notes}"</div>` : ''}
        </td>
        <td>
          <div>🗓️ ${r.requested_date}</div>
          <div style="font-size: 0.775rem; color: var(--charcoal-400);">⏰ ${r.requested_time} (${r.duration_hours}h)</div>
        </td>
        <td>
          <span style="font-weight: 700; color: var(--white);">$${r.total_amount.toFixed(2)}</span>
        </td>
        <td>
          <span class="status-pill ${r.status}">${r.status}</span>
        </td>
        <td>
          <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
            ${r.status === 'pending' ? `
              <button class="btn btn-primary btn-sm" onclick="Teacher.updateStatus(${r.id}, 'accepted')">Accept</button>
              <button class="btn btn-secondary btn-sm" onclick="Teacher.updateStatus(${r.id}, 'declined')">Decline</button>
            ` : ''}
            ${r.status === 'accepted' ? `
              <button class="btn btn-outline-gold btn-sm" onclick="Teacher.updateStatus(${r.id}, 'completed')">Mark Completed</button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  },

  async updateStatus(requestId, status) {
    let note = '';
    if (status === 'declined') {
      note = prompt('Please specify a brief reason for declining (e.g. Schedule conflict):', 'Scheduling conflict on this date.');
      if (note === null) return; // User cancelled prompt
    }

    try {
      const res = await API.updateRequestStatus(requestId, { status, note });
      showToast(res.message, 'success');
      await this.loadTeacherDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  populateProfileSettings(tutor) {
    if (!tutor) return;
    const headline = document.getElementById('t-profile-headline');
    const rate = document.getElementById('t-profile-rate');
    const bio = document.getElementById('t-profile-bio');

    if (headline) headline.value = tutor.headline || '';
    if (rate) rate.value = tutor.hourly_rate || 45;
    if (bio) bio.value = tutor.bio || '';
  },

  async handleApplicationSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const formData = new FormData(form);

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Uploading & Submitting...';

      const res = await API.submitTeacherApplication(formData);
      showToast(res.message, 'success');
      await this.loadTeacherView();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Application for Academic Review';
    }
  },

  async handleProfileSettingsSubmit(e) {
    e.preventDefault();
    const headline = document.getElementById('t-profile-headline').value.trim();
    const hourly_rate = parseFloat(document.getElementById('t-profile-rate').value);
    const bio = document.getElementById('t-profile-bio').value.trim();
    const submitBtn = e.target.querySelector('button[type="submit"]');

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating...';

      await API.updateProfile({
        tutorData: { headline, hourly_rate, bio }
      });

      showToast('Tutor public profile updated successfully!', 'success');
      await this.loadTeacherDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Public Profile';
    }
  }
};
