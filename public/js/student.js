/**
 * AVIORA EDUCATION - STUDENT PORTAL LOGIC
 */

const Student = {
  requests: [],
  activeTab: 'all',
  currentReviewRequestId: null,

  async init() {
    this.setupEventListeners();
    await this.loadDashboard();
  },

  setupEventListeners() {
    // Student portal tabs
    document.querySelectorAll('.student-filter-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.student-filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeTab = tab.dataset.status || 'all';
        this.renderRequestsList();
      });
    });

    // Review Modal Close
    const reviewCloseBtn = document.getElementById('review-modal-close');
    if (reviewCloseBtn) {
      reviewCloseBtn.addEventListener('click', () => this.closeReviewModal());
    }

    const reviewOverlay = document.getElementById('review-modal');
    if (reviewOverlay) {
      reviewOverlay.addEventListener('click', (e) => {
        if (e.target === reviewOverlay) this.closeReviewModal();
      });
    }

    // Star rating picker
    document.querySelectorAll('.star-picker-icon').forEach(star => {
      star.addEventListener('click', (e) => {
        const rating = parseInt(star.dataset.rating);
        document.getElementById('review-rating-val').value = rating;
        document.querySelectorAll('.star-picker-icon').forEach((s, idx) => {
          if (idx < rating) {
            s.style.color = '#F59E0B';
          } else {
            s.style.color = 'var(--charcoal-600)';
          }
        });
      });
    });

    // Review Form Submit
    const reviewForm = document.getElementById('review-form');
    if (reviewForm) {
      reviewForm.addEventListener('submit', (e) => this.handleReviewSubmit(e));
    }

    // Student Profile Form Submit
    const profileForm = document.getElementById('student-profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));
    }
  },

  async loadDashboard() {
    const user = Auth.currentUser;
    if (!user || user.role !== 'student') return;

    try {
      const data = await API.getStudentDashboard();
      this.requests = data.requests || [];

      // Update Header info
      const studentNameElem = document.getElementById('student-display-name');
      const studentAvatarElem = document.getElementById('student-display-avatar');
      if (studentNameElem) studentNameElem.textContent = user.name;
      if (studentAvatarElem) studentAvatarElem.src = user.avatar_url;

      // Update stat widgets
      const statTotal = document.getElementById('student-stat-total');
      const statPending = document.getElementById('student-stat-pending');
      const statUpcoming = document.getElementById('student-stat-upcoming');
      const statCompleted = document.getElementById('student-stat-completed');

      if (statTotal) statTotal.textContent = data.stats.total_requests || 0;
      if (statPending) statPending.textContent = data.stats.pending || 0;
      if (statUpcoming) statUpcoming.textContent = data.stats.upcoming || 0;
      if (statCompleted) statCompleted.textContent = data.stats.completed || 0;

      this.renderRequestsList();
      this.renderConnectedTutors();
      this.loadProfileForm();
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
    }
  },

  renderConnectedTutors() {
    const tutorsGrid = document.getElementById('student-connected-tutors-grid');
    if (!tutorsGrid) return;

    const tutorsMap = new Map();
    this.requests.forEach(r => {
      if (!tutorsMap.has(r.tutor_id)) {
        tutorsMap.set(r.tutor_id, {
          id: r.tutor_id,
          name: r.tutor_name,
          avatar: r.tutor_avatar,
          subject: r.subject,
          hourly_rate: r.hourly_rate,
          sessionsCount: 0
        });
      }
      tutorsMap.get(r.tutor_id).sessionsCount++;
    });

    const uniqueTutors = Array.from(tutorsMap.values());
    if (uniqueTutors.length === 0) {
      tutorsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 2.5rem; text-align: center; background: var(--bg-surface-alt); border-radius: var(--radius-md); border: 1px dashed var(--border-light);">
          <div style="font-size: 2.2rem; margin-bottom: 0.6rem;">👨‍🏫</div>
          <h4 style="color: var(--charcoal-900); font-size: 1.1rem; margin-bottom: 0.4rem; font-weight: 700;">No Mentors Connected Yet</h4>
          <p style="color: var(--text-secondary); font-size: 0.88rem; max-width: 480px; margin: 0 auto 1.25rem auto;">Browse verified faculty across mathematics, natural sciences, coding, and humanities to book your first tailored 1-on-1 session.</p>
          <a href="#tutors" class="btn btn-primary btn-sm">Explore Verified Faculty →</a>
        </div>
      `;
    } else {
      tutorsGrid.innerHTML = uniqueTutors.map(t => `
        <div class="tutor-card" style="padding: 1.5rem; background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-md); box-shadow: var(--shadow-sm);">
          <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem;">
            <img src="${t.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}" style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid var(--gold-400);" />
            <div>
              <h4 style="color: var(--charcoal-900); font-size: 1rem; margin: 0 0 0.2rem 0; font-weight: 700;">${t.name}</h4>
              <span class="badge-gold" style="font-size: 0.7rem; padding: 0.15rem 0.45rem;">${t.subject}</span>
            </div>
          </div>
          <div style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 1rem; display: flex; justify-content: space-between;">
            <span>Total Sessions: <strong style="color: var(--charcoal-900);">${t.sessionsCount}</strong></span>
            <span>Rate: <strong style="color: var(--gold-600);">$${t.hourly_rate}/hr</strong></span>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-outline-gold btn-sm" style="flex: 1;" onclick="Tutors.openMessageModal(${t.id})">💬 Message</button>
            <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="Tutors.openBookingModal(${t.id})">Book Session →</button>
          </div>
        </div>
      `).join('');
    }
  },

  async loadProfileForm() {
    try {
      const data = await API.getMe();
      const sp = data.studentProfile || {};
      const u = data.user || {};

      const nameInput = document.getElementById('sp-name');
      const phoneInput = document.getElementById('sp-phone');
      const gradeInput = document.getElementById('sp-grade');
      const schoolInput = document.getElementById('sp-school');
      const goalsInput = document.getElementById('sp-goals');
      const subjectsInput = document.getElementById('sp-subjects');

      if (nameInput) nameInput.value = u.name || '';
      if (phoneInput) phoneInput.value = u.phone || '';
      if (gradeInput) gradeInput.value = sp.grade_level || 'Grade 11';
      if (schoolInput) schoolInput.value = sp.school || '';
      if (goalsInput) goalsInput.value = sp.learning_goals || '';
      if (subjectsInput) subjectsInput.value = sp.target_subjects || '';
    } catch (e) {
      console.warn('Could not load student profile form data:', e);
    }
  },

  renderRequestsList() {
    const container = document.getElementById('student-requests-container');
    if (!container) return;

    let filtered = this.requests;
    if (this.activeTab !== 'all') {
      filtered = this.requests.filter(r => r.status === this.activeTab);
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <h3 class="empty-title">No ${this.activeTab !== 'all' ? this.activeTab : ''} Tutoring Sessions</h3>
          <p class="empty-desc">Explore verified tutors in calculus, physics, chemistry, coding, and languages to book your first session.</p>
          <a href="#tutors" class="btn btn-primary btn-sm">Find a Tutor</a>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(r => `
      <div class="request-item-card">
        <a href="${r.tutor_profile_id ? `#tutor-profile?id=${r.tutor_profile_id}` : '#tutors'}" title="View Tutor Profile">
          <img src="${r.tutor_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}" class="request-tutor-avatar" />
        </a>
        
        <div class="request-subject-info">
          <h4>${r.subject}</h4>
          <p>Tutor: ${r.tutor_profile_id ? `<a href="#tutor-profile?id=${r.tutor_profile_id}" style="color: var(--gold-800); font-weight: 700; text-decoration: underline;">${r.tutor_name}</a>` : `<strong>${r.tutor_name}</strong>`}</p>
          ${r.notes ? `<p style="font-size: 0.8rem; color: var(--charcoal-400); margin-top: 0.2rem;">Topic: ${r.notes}</p>` : ''}
          ${r.tutor_response_note ? `<p style="font-size: 0.8rem; color: var(--gold-700); margin-top: 0.2rem;">Tutor note: "${r.tutor_response_note}"</p>` : ''}
        </div>

        <div class="request-datetime-info">
          <strong>🗓️ ${r.requested_date}</strong>
          <span>⏰ ${r.requested_time} (${r.duration_hours} hrs)</span>
        </div>

        <div class="request-pricing-info">
          $${r.total_amount.toFixed(2)}
          <span>Rate: $${r.hourly_rate}/hr</span>
        </div>

        <div class="request-actions-col">
          <span class="status-pill ${r.status}">${r.status}</span>
          ${r.status === 'pending' ? `
            <button class="btn btn-secondary btn-sm" onclick="Student.cancelRequest(${r.id})">Cancel</button>
          ` : ''}
          ${r.status === 'completed' ? `
            <button class="btn btn-outline-gold btn-sm" onclick="Student.openReviewModal(${r.id}, '${r.tutor_name}', '${r.subject}')">★ Review</button>
          ` : ''}
        </div>
      </div>
    `).join('');
  },

  async cancelRequest(requestId) {
    showConfirm(
      'Cancel Tutoring Request',
      'Are you sure you want to cancel this pending request? Your tutor will be notified.',
      async () => {
        try {
          const res = await API.cancelRequest(requestId);
          showToast(res.message, 'success');
          await this.loadDashboard();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    );
  },

  openReviewModal(requestId, tutorName, subject) {
    this.currentReviewRequestId = requestId;
    const modal = document.getElementById('review-modal');
    const title = document.getElementById('review-modal-title');
    const commentInput = document.getElementById('review-comment');

    if (title) title.textContent = `Review ${tutorName} (${subject})`;
    if (commentInput) commentInput.value = '';

    // Reset stars to 5
    document.getElementById('review-rating-val').value = 5;
    document.querySelectorAll('.star-picker-icon').forEach(s => s.style.color = '#F59E0B');

    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeReviewModal() {
    const modal = document.getElementById('review-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  async handleReviewSubmit(e) {
    e.preventDefault();
    if (!this.currentReviewRequestId) return;

    const rating = parseInt(document.getElementById('review-rating-val').value);
    const comment = document.getElementById('review-comment').value.trim();
    const submitBtn = e.target.querySelector('button[type="submit"]');

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting Feedback...';

      const res = await API.submitReview(this.currentReviewRequestId, { rating, comment });
      this.closeReviewModal();
      showToast(res.message, 'success');
      await this.loadDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Review';
    }
  },

  async handleProfileUpdate(e) {
    e.preventDefault();
    const name = document.getElementById('sp-name').value.trim();
    const phone = document.getElementById('sp-phone').value.trim();
    const grade_level = document.getElementById('sp-grade').value;
    const school = document.getElementById('sp-school').value.trim();
    const learning_goals = document.getElementById('sp-goals').value.trim();
    const target_subjects = document.getElementById('sp-subjects').value.trim();
    const submitBtn = e.target.querySelector('button[type="submit"]');

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving Changes...';

      await API.updateProfile({
        name,
        phone,
        studentData: { grade_level, school, learning_goals, target_subjects }
      });

      showToast('Student profile updated successfully!', 'success');
      await Auth.restoreSession();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Profile Changes';
    }
  }
};
