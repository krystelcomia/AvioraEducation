/**
 * AVIORA EDUCATION - ADMINISTRATOR DASHBOARD LOGIC
 */

const Admin = {
  currentSection: 'overview',
  applications: [],
  tutors: [],
  students: [],
  requests: [],
  selectedApp: null,

  async init() {
    this.setupEventListeners();
    await this.loadDashboardMetrics();
  },

  setupEventListeners() {
    // Admin Sidebar Navigation
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const section = item.dataset.section;
        this.switchSection(section);
      });
    });

    // Application filter buttons
    document.querySelectorAll('.app-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.app-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const status = btn.dataset.status;
        this.loadApplications(status);
      });
    });

    // Close Review Modal
    const reviewCloseBtn = document.getElementById('admin-review-modal-close');
    if (reviewCloseBtn) {
      reviewCloseBtn.addEventListener('click', () => this.closeReviewModal());
    }

    const reviewOverlay = document.getElementById('admin-review-modal');
    if (reviewOverlay) {
      reviewOverlay.addEventListener('click', (e) => {
        if (e.target === reviewOverlay) this.closeReviewModal();
      });
    }

    // Modal Action Buttons
    const approveBtn = document.getElementById('admin-action-approve-btn');
    if (approveBtn) {
      approveBtn.addEventListener('click', () => this.handleReviewDecision('approved'));
    }

    const rejectBtn = document.getElementById('admin-action-reject-btn');
    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => this.handleReviewDecision('rejected'));
    }
  },

  switchSection(section) {
    this.currentSection = section;

    // Update Sidebar Active Class
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.section === section);
    });

    // Hide all admin views
    document.querySelectorAll('.admin-view-panel').forEach(panel => {
      panel.style.display = 'none';
    });

    const activePanel = document.getElementById(`admin-panel-${section}`);
    if (activePanel) {
      activePanel.style.display = 'block';
    }

    // Load section specific data
    if (section === 'overview') {
      this.loadDashboardMetrics();
    } else if (section === 'applications') {
      this.loadApplications('pending');
    } else if (section === 'tutors') {
      this.loadTutors();
    } else if (section === 'students') {
      this.loadStudents();
    } else if (section === 'requests') {
      this.loadRequests();
    }
  },

  async loadDashboardMetrics() {
    const user = Auth.currentUser;
    if (!user || user.role !== 'admin') return;

    try {
      const data = await API.getAdminDashboard();
      const m = data.metrics || {};

      // Fill Metric Cards
      document.getElementById('m-students').textContent = m.totalStudents || 0;
      document.getElementById('m-teachers').textContent = m.totalTeachers || 0;
      document.getElementById('m-approved-tutors').textContent = m.approvedTutors || 0;
      document.getElementById('m-pending-apps').textContent = m.pendingApps || 0;
      document.getElementById('m-requests').textContent = m.totalRequests || 0;
      document.getElementById('m-volume').textContent = `$${m.platformVolume?.toFixed(2) || '0.00'}`;

      // Update Pending Badge in sidebar
      const pendingBadge = document.getElementById('admin-pending-badge');
      if (pendingBadge) {
        if (m.pendingApps > 0) {
          pendingBadge.style.display = 'inline-block';
          pendingBadge.textContent = m.pendingApps;
        } else {
          pendingBadge.style.display = 'none';
        }
      }

      this.renderCharts(data.charts || {});
      this.renderRecentActivity(data.recentActivity || []);
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    }
  },

  renderCharts(charts) {
    const subjectsContainer = document.getElementById('chart-subjects-container');
    const appsContainer = document.getElementById('chart-apps-container');

    // 1. Subjects Chart (Horizontal CSS Bar Chart)
    if (subjectsContainer) {
      const subjects = charts.subjects || [];
      if (subjects.length === 0) {
        subjectsContainer.innerHTML = '<p class="empty-desc">No session request data yet.</p>';
      } else {
        const maxCount = Math.max(...subjects.map(s => s.count), 1);
        subjectsContainer.innerHTML = subjects.map(s => {
          const pct = Math.round((s.count / maxCount) * 100);
          return `
            <div style="margin-bottom: 0.85rem;">
              <div style="display: flex; justify-content: space-between; font-size: 0.825rem; margin-bottom: 0.25rem;">
                <span style="color: var(--white); font-weight: 600;">${s.subject}</span>
                <span style="color: var(--gold-300);">${s.count} requests</span>
              </div>
              <div style="height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${pct}%; background: var(--gradient-gold); border-radius: 4px;"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 2. Applications Status Breakdown (Donut/Pill Cards)
    if (appsContainer) {
      const apps = charts.applications || [];
      appsContainer.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; text-align: center;">
          ${['pending', 'approved', 'rejected'].map(st => {
            const item = apps.find(a => a.status === st);
            const count = item ? item.count : 0;
            const colors = {
              pending: '#F59E0B',
              approved: '#10B981',
              rejected: '#EF4444'
            };
            return `
              <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-md); padding: 1.25rem 0.75rem;">
                <div style="font-size: 1.75rem; font-weight: 800; color: ${colors[st]}; font-family: var(--font-heading);">${count}</div>
                <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--charcoal-400); margin-top: 0.25rem;">${st}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
  },

  renderRecentActivity(activity) {
    const container = document.getElementById('admin-recent-activity-list');
    if (!container) return;

    if (activity.length === 0) {
      container.innerHTML = '<p class="empty-desc">No platform activity recorded yet.</p>';
      return;
    }

    container.innerHTML = activity.map(a => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.875rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-size: 1.2rem;">${a.type === 'application' ? '📝' : '🎓'}</span>
          <div>
            <strong style="color: var(--white);">${a.user_name}</strong>
            <span style="color: var(--charcoal-400);"> — ${a.type === 'application' ? 'Teacher Application' : 'Tutoring Request for ' + a.info}</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span class="status-pill ${a.status}">${a.status}</span>
          <span style="font-size: 0.75rem; color: var(--charcoal-500);">${new Date(a.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    `).join('');
  },

  async loadApplications(status = 'all') {
    try {
      const data = await API.getAdminApplications(status);
      this.applications = data.applications || [];
      this.renderApplicationsTable();
    } catch (err) {
      console.error('Failed to load applications:', err);
    }
  },

  renderApplicationsTable() {
    const tbody = document.getElementById('admin-apps-table-body');
    if (!tbody) return;

    if (this.applications.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 3rem;">
            <div class="empty-state">
              <div class="empty-icon">✓</div>
              <h4 class="empty-title">No Teacher Applications Found</h4>
              <p class="empty-desc">All applications in this category have been processed.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.applications.map(app => `
      <tr>
        <td>
          <div class="user-cell">
            <img src="${app.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}" class="user-cell-avatar" />
            <div>
              <div class="user-cell-name">${app.name}</div>
              <div class="user-cell-email">${app.email}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight: 600; color: var(--white);">${app.highest_degree || 'Degree'}</div>
          <div style="font-size: 0.775rem; color: var(--gold-300);">${app.institution || 'University'} (${app.years_experience} yrs exp)</div>
        </td>
        <td>
          <div style="font-size: 0.8rem; color: var(--charcoal-200); max-width: 180px;">
            ${(app.subjects || []).slice(0, 2).join(', ')} ${(app.subjects || []).length > 2 ? `+${app.subjects.length - 2}` : ''}
          </div>
        </td>
        <td>
          <span style="font-weight: 700; color: var(--white);">$${app.hourly_rate}/hr</span>
        </td>
        <td>
          <span class="status-pill ${app.status}">${app.status}</span>
        </td>
        <td>
          <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
            <button class="btn btn-secondary btn-sm" onclick="Admin.inspectApplication(${app.id})">Review & Verify</button>
            ${app.status === 'pending' ? `
              <button class="btn btn-primary btn-sm" onclick="Admin.quickApprove(${app.id})">Approve</button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  },

  inspectApplication(appId) {
    const app = this.applications.find(a => a.id == appId);
    if (!app) return;

    this.selectedApp = app;

    const modal = document.getElementById('admin-review-modal');
    const content = document.getElementById('admin-review-details');
    const notesInput = document.getElementById('admin-review-notes');

    if (notesInput) notesInput.value = app.admin_notes || '';

    if (content) {
      content.innerHTML = `
        <div style="display: flex; gap: 1.25rem; align-items: center; margin-bottom: 1.5rem;">
          <img src="${app.avatar_url}" style="width: 70px; height: 70px; border-radius: var(--radius-md); object-fit: cover; border: 2px solid var(--gold-500);" />
          <div>
            <h3 style="color: var(--white); font-size: 1.3rem;">${app.name}</h3>
            <p style="color: var(--gold-300); font-size: 0.875rem;">${app.email} • ${app.phone || 'No phone provided'}</p>
            <span class="status-pill ${app.status}" style="margin-top: 0.4rem;">${app.status}</span>
          </div>
        </div>

        <div style="background: rgba(0,0,0,0.25); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem;">
          <h4 style="color: var(--white); margin-bottom: 0.5rem; font-size: 0.95rem;">Academic Qualifications</h4>
          <p style="font-size: 0.875rem; color: var(--charcoal-200); margin-bottom: 0.35rem;">
            🎓 <strong>Degree:</strong> ${app.highest_degree} (${app.graduation_year || 'N/A'})
          </p>
          <p style="font-size: 0.875rem; color: var(--charcoal-200); margin-bottom: 0.35rem;">
            🏛️ <strong>Institution:</strong> ${app.institution}
          </p>
          <p style="font-size: 0.875rem; color: var(--charcoal-200);">
            ⏱️ <strong>Experience:</strong> ${app.years_experience} years • <strong>Target Rate:</strong> $${app.hourly_rate}/hr
          </p>
        </div>

        <div style="margin-bottom: 1.25rem;">
          <h4 style="color: var(--white); margin-bottom: 0.35rem; font-size: 0.95rem;">Subjects & Grade Levels</h4>
          <p style="color: var(--gold-300); font-size: 0.85rem; margin-bottom: 0.25rem;">${(app.subjects || []).join(', ')}</p>
          <p style="color: var(--charcoal-400); font-size: 0.8rem;">Grade Levels: ${(app.grade_levels || []).join(', ')}</p>
        </div>

        <div style="margin-bottom: 1.25rem;">
          <h4 style="color: var(--white); margin-bottom: 0.35rem; font-size: 0.95rem;">Applicant Bio</h4>
          <p style="color: var(--charcoal-300); font-size: 0.875rem; line-height: 1.5;">${app.bio || 'None provided.'}</p>
        </div>

        <div style="margin-bottom: 1.25rem;">
          <h4 style="color: var(--white); margin-bottom: 0.35rem; font-size: 0.95rem;">Uploaded Credential Document</h4>
          ${app.credentials_file ? `
            <div style="display: flex; align-items: center; gap: 0.75rem; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 0.75rem 1rem; border-radius: var(--radius-md);">
              <span style="font-size: 1.25rem;">📄</span>
              <div style="flex: 1;">
                <div style="font-size: 0.85rem; font-weight: 600; color: #10B981;">${app.credentials_filename || 'Verified_Academic_Diploma.pdf'}</div>
                <div style="font-size: 0.75rem; color: var(--charcoal-400);">Official credential file submitted for verification</div>
              </div>
              <a href="${app.credentials_file}" target="_blank" class="btn btn-outline-gold btn-sm">Inspect File</a>
            </div>
          ` : `
            <p style="color: var(--charcoal-400); font-size: 0.85rem;">Standard verified document cleared via institutional portal.</p>
          `}
        </div>
      `;
    }

    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeReviewModal() {
    const modal = document.getElementById('admin-review-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  async quickApprove(appId) {
    showConfirm(
      'Approve Teacher Application',
      'Approve this educator and publish their profile to the public tutor directory?',
      async () => {
        try {
          const res = await API.reviewApplication(appId, {
            status: 'approved',
            admin_notes: 'Verified academic credentials and approved by Aviora Academic Director.'
          });
          showToast(res.message, 'success');
          await this.loadApplications(this.currentAppFilter || 'all');
          await this.loadDashboardMetrics();
          await Tutors.fetchTutors(); // Refresh public directory
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    );
  },

  async handleReviewDecision(status) {
    if (!this.selectedApp) return;

    const notes = document.getElementById('admin-review-notes')?.value.trim();

    try {
      const res = await API.reviewApplication(this.selectedApp.id, {
        status,
        admin_notes: notes || (status === 'approved' ? 'Approved by Academic Director.' : 'Credentials could not be verified.')
      });

      this.closeReviewModal();
      showToast(res.message, 'success');
      await this.loadApplications('all');
      await this.loadDashboardMetrics();
      await Tutors.fetchTutors();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async loadTutors() {
    try {
      const data = await API.getAdminTutors();
      this.tutors = data.tutors || [];
      this.renderTutorsTable();
    } catch (err) {
      console.error('Failed to load admin tutors:', err);
    }
  },

  renderTutorsTable() {
    const tbody = document.getElementById('admin-tutors-table-body');
    if (!tbody) return;

    tbody.innerHTML = this.tutors.map(t => `
      <tr>
        <td>
          <div class="user-cell">
            <img src="${t.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}" class="user-cell-avatar" />
            <div>
              <div class="user-cell-name">${t.name}</div>
              <div class="user-cell-email">${t.email}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-size: 0.85rem; color: var(--gold-300);">${t.headline || 'Tutor Specialist'}</div>
          <div style="font-size: 0.775rem; color: var(--charcoal-400);">${t.institution}</div>
        </td>
        <td>
          <div style="font-size: 0.85rem; color: #F59E0B; font-weight: 700;">★ ${t.rating.toFixed(1)} (${t.reviews_count})</div>
          <div style="font-size: 0.775rem; color: var(--charcoal-400);">${t.total_sessions} completed</div>
        </td>
        <td>
          <strong style="color: var(--white);">$${t.hourly_rate}/hr</strong>
        </td>
        <td>
          <span class="status-pill ${t.is_active === 1 ? 'active' : 'inactive'}">
            ${t.is_active === 1 ? 'Public' : 'Hidden'}
          </span>
        </td>
        <td>
          <label class="switch" title="Toggle public directory visibility">
            <input type="checkbox" ${t.is_active === 1 ? 'checked' : ''} onchange="Admin.toggleTutorVisibility(${t.id})">
            <span class="slider"></span>
          </label>
        </td>
      </tr>
    `).join('');
  },

  async toggleTutorVisibility(profileId) {
    try {
      const res = await API.toggleTutorStatus(profileId);
      showToast(res.message, 'success');
      await this.loadTutors();
      await Tutors.fetchTutors();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async loadStudents() {
    try {
      const data = await API.getAdminStudents();
      this.students = data.students || [];
      this.renderStudentsTable();
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  },

  renderStudentsTable() {
    const tbody = document.getElementById('admin-students-table-body');
    if (!tbody) return;

    tbody.innerHTML = this.students.map(s => `
      <tr>
        <td>
          <div class="user-cell">
            <img src="${s.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" class="user-cell-avatar" />
            <div>
              <div class="user-cell-name">${s.name}</div>
              <div class="user-cell-email">${s.email}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-size: 0.85rem; color: var(--white);">${s.grade_level || 'Grade 11'}</div>
          <div style="font-size: 0.775rem; color: var(--charcoal-400);">${s.school || 'High School'}</div>
        </td>
        <td>
          <div style="font-size: 0.85rem; color: var(--white); font-weight: 600;">${s.request_count} sessions</div>
          <div style="font-size: 0.75rem; color: var(--gold-300);">${s.completed_count} completed</div>
        </td>
        <td>
          <span class="status-pill ${s.status}">${s.status}</span>
        </td>
        <td>
          <button class="btn ${s.status === 'active' ? 'btn-secondary' : 'btn-outline-gold'} btn-sm" onclick="Admin.toggleUserStatus(${s.id}, '${s.status === 'active' ? 'suspended' : 'active'}')">
            ${s.status === 'active' ? 'Suspend' : 'Activate'}
          </button>
        </td>
      </tr>
    `).join('');
  },

  async toggleUserStatus(userId, newStatus) {
    showConfirm(
      'Update Account Status',
      `Are you sure you want to change this user status to ${newStatus}?`,
      async () => {
        try {
          const res = await API.updateUserStatus(userId, { status: newStatus });
          showToast(res.message, 'success');
          await this.loadStudents();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    );
  },

  async loadRequests() {
    try {
      const data = await API.getAdminRequests();
      this.requests = data.requests || [];
      this.renderRequestsTable();
    } catch (err) {
      console.error('Failed to load platform requests:', err);
    }
  },

  renderRequestsTable() {
    const tbody = document.getElementById('admin-requests-table-body');
    if (!tbody) return;

    tbody.innerHTML = this.requests.map(r => `
      <tr>
        <td>
          <strong style="color: var(--white);">${r.student_name}</strong>
          <div style="font-size: 0.75rem; color: var(--charcoal-400);">${r.student_email}</div>
        </td>
        <td>
          <strong style="color: var(--gold-300);">${r.tutor_name}</strong>
          <div style="font-size: 0.75rem; color: var(--charcoal-400);">${r.tutor_email}</div>
        </td>
        <td>
          <strong style="color: var(--white);">${r.subject}</strong>
        </td>
        <td>
          <div>🗓️ ${r.requested_date}</div>
          <div style="font-size: 0.75rem; color: var(--charcoal-400);">⏰ ${r.requested_time} (${r.duration_hours}h)</div>
        </td>
        <td>
          <span style="font-weight: 700; color: var(--white);">$${r.total_amount.toFixed(2)}</span>
        </td>
        <td>
          <span class="status-pill ${r.status}">${r.status}</span>
        </td>
      </tr>
    `).join('');
  }
};
