/**
 * AVIORA EDUCATION - COMPREHENSIVE STUDENT PORTAL & DASHBOARD LOGIC
 */

function escapeQuotes(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function escapeHtmlStr(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const Student = {
  requests: [],
  subscription: null,
  activeTab: 'all',
  currentReviewRequestId: null,

  async init() {
    this.setupEventListeners();
    await this.loadDashboard();
  },

  setupEventListeners() {
    // Student portal filter tabs
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

  scrollToSection(section, e) {
    if (e && e.preventDefault) e.preventDefault();

    const map = {
      overview: 'student-overview-section',
      schedule: 'student-schedule-section',
      lessons: 'student-lessons-section',
      history: 'student-history-section',
      tutors: 'student-my-tutors-section',
      profile: 'student-profile-section'
    };

    const targetId = map[section];
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  },

  async loadDashboard() {
    const user = Auth.currentUser;
    if (!user || user.role !== 'student') return;

    try {
      const data = await API.getStudentDashboard();
      this.requests = data.requests || [];
      this.subscription = data.subscription || null;

      // Update Header info
      const studentNameElem = document.getElementById('student-display-name');
      const studentAvatarElem = document.getElementById('student-display-avatar');
      if (studentNameElem) studentNameElem.textContent = user.name;
      if (studentAvatarElem) studentAvatarElem.src = user.avatar_url || '/assets/favicon.png';

      // Update stat widgets
      const statUpcoming = document.getElementById('student-stat-upcoming');
      const statPending = document.getElementById('student-stat-pending');
      const statCompleted = document.getElementById('student-stat-completed');
      const statHours = document.getElementById('student-stat-hours');
      const statSubHours = document.getElementById('student-stat-sub-hours');
      const statSubLabel = document.getElementById('student-stat-sub-label');

      if (statUpcoming) statUpcoming.textContent = data.stats.upcoming || 0;
      if (statPending) statPending.textContent = data.stats.pending || 0;
      if (statCompleted) statCompleted.textContent = data.stats.completed || 0;
      if (statHours) statHours.textContent = `${data.stats.total_hours || 0} hrs`;

      if (this.subscription) {
        const remaining = (this.subscription.lessons_remaining !== undefined ? this.subscription.lessons_remaining : this.subscription.hours_remaining) || 0;
        if (statSubHours) statSubHours.textContent = `${remaining} lesson${remaining === 1 ? '' : 's'}`;
        if (statSubLabel) statSubLabel.textContent = `${this.subscription.plan_name} (Active)`;
      } else {
        if (statSubHours) statSubHours.textContent = '0 lessons';
        if (statSubLabel) statSubLabel.textContent = 'No Active Plan';
      }

      // Render comprehensive sub-components
      this.renderSpotlightSession();
      this.renderSchedule();
      this.renderRequestsList();
      this.renderHistory();
      this.renderConnectedTutors();
      this.loadProfileForm();
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
    }
  },

  renderSpotlightSession() {
    const container = document.getElementById('student-spotlight-container');
    if (!container) return;

    const upcomingSessions = this.requests
      .filter(r => r.status === 'accepted')
      .sort((a, b) => (a.requested_date + ' ' + a.requested_time).localeCompare(b.requested_date + ' ' + b.requested_time));

    if (upcomingSessions.length === 0) {
      container.innerHTML = `
        <div class="spotlight-session-card" style="border-style: dashed; background: #FFFFFF;">
          <div class="spotlight-session-grid">
            <div style="font-size: 2.4rem;">🎓</div>
            <div>
              <h4 style="font-size: 1.15rem; color: var(--charcoal-900); font-weight: 800; margin-bottom: 0.3rem;">No Upcoming Classes Scheduled</h4>
              <p style="color: var(--text-secondary); font-size: 0.88rem; margin: 0;">Your next scheduled 1-on-1 class will be highlighted here once booked. All sessions are 50 minutes of focused instruction.</p>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const nextSession = upcomingSessions[0];
    container.innerHTML = `
      <div class="spotlight-session-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.5rem;">
          <span style="font-size: 0.78rem; font-weight: 800; color: #FFFFFF; background: var(--gold-600); padding: 0.25rem 0.75rem; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.05em;">
            Next Scheduled Class
          </span>
          <span style="font-size: 0.82rem; color: var(--gold-800); font-weight: 700;">
            ⏱️ 50-Minute Tailored Session
          </span>
        </div>

        <div class="spotlight-session-grid">
          <a href="${nextSession.tutor_profile_id ? `#tutor-profile?id=${nextSession.tutor_profile_id}` : '#tutors'}">
            <img src="${nextSession.tutor_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}" style="width: 68px; height: 68px; border-radius: 50%; object-fit: cover; border: 2.5px solid var(--gold-500);" />
          </a>

          <div>
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.3rem; flex-wrap: wrap;">
              <h3 style="font-size: 1.25rem; color: var(--charcoal-900); font-weight: 800; margin: 0;">${nextSession.subject}</h3>
              <span class="status-pill accepted">✓ Confirmed</span>
            </div>
            <p style="font-size: 0.9rem; color: var(--charcoal-700); margin: 0 0 0.4rem 0;">
              Instructor: <strong>${nextSession.tutor_name}</strong>
              ${nextSession.tutor_headline ? ` • <span style="color: var(--text-muted); font-size: 0.82rem;">${nextSession.tutor_headline}</span>` : ''}
            </p>
            <div style="font-size: 0.88rem; color: var(--gold-900); font-weight: 700;">
              🗓️ ${nextSession.requested_date} &nbsp;•&nbsp; ⏰ ${nextSession.requested_time} (50 mins)
            </div>
            ${nextSession.notes ? `<p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.4rem;"><strong>Topic Focus:</strong> ${escapeHtmlStr(nextSession.notes)}</p>` : ''}
            ${nextSession.tutor_response_note ? `<p style="font-size: 0.82rem; color: var(--gold-700); margin-top: 0.2rem; font-style: italic;"><strong>Instructor Note:</strong> "${escapeHtmlStr(nextSession.tutor_response_note)}"</p>` : ''}
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.6rem; min-width: 170px;">
            <button class="btn btn-outline-gold btn-sm" onclick="Tutors.openMessageModal(${nextSession.tutor_id})">💬 Message Tutor</button>
            <button class="btn btn-primary btn-sm" onclick="showToast('Classroom link is active 10 minutes prior to session start.', 'info')">📹 Virtual Room</button>
            <button class="btn btn-secondary btn-sm" style="font-size: 0.78rem;" onclick="Student.cancelRequest(${nextSession.id})">Cancel Booking</button>
          </div>
        </div>
      </div>
    `;
  },

  renderSchedule() {
    const container = document.getElementById('student-schedule-container');
    if (!container) return;

    // Filter confirmed and pending upcoming appointments
    const scheduled = this.requests
      .filter(r => r.status === 'accepted' || r.status === 'pending')
      .sort((a, b) => (a.requested_date + ' ' + a.requested_time).localeCompare(b.requested_date + ' ' + b.requested_time));

    if (scheduled.length === 0) {
      container.innerHTML = `
        <div style="padding: 2.5rem; text-align: center; background: var(--bg-surface-alt); border-radius: var(--radius-lg); border: 1px dashed var(--border-light);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🗓️</div>
          <h4 style="color: var(--charcoal-900); font-weight: 700; margin-bottom: 0.3rem;">No Scheduled Classes on Your Calendar</h4>
          <p style="color: var(--text-secondary); font-size: 0.88rem; max-width: 440px; margin: 0 auto;">
            Your schedule is based on your booked lessons. Confirmed and pending sessions will appear here automatically.
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = scheduled.map(r => {
      const dateParts = r.requested_date.split('-');
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      let monthStr = r.requested_date;
      let dayStr = '';
      if (dateParts.length === 3) {
        const mIdx = parseInt(dateParts[1], 10) - 1;
        monthStr = monthNames[mIdx] || dateParts[1];
        dayStr = dateParts[2];
      }

      return `
        <div class="schedule-card">
          <div class="schedule-date-badge">
            <div class="day-num">${dayStr || '📅'}</div>
            <div class="day-name">${monthStr}</div>
          </div>

          <div>
            <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.25rem;">
              <h4 style="font-size: 1.05rem; color: var(--charcoal-900); font-weight: 700; margin: 0;">${r.subject}</h4>
              <span class="status-pill ${r.status}">${r.status === 'accepted' ? '✓ Confirmed' : '⏳ Pending'}</span>
            </div>
            <p style="font-size: 0.85rem; color: var(--charcoal-700); margin: 0 0 0.2rem 0;">
              Instructor: <strong>${r.tutor_name}</strong>
            </p>
            ${r.notes ? `<p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">Topic: ${escapeHtmlStr(r.notes)}</p>` : ''}
          </div>

          <div style="font-size: 0.88rem; color: var(--charcoal-900);">
            <div style="font-weight: 700;">⏰ ${r.requested_time}</div>
            <div style="font-size: 0.78rem; color: var(--gold-800); font-weight: 600;">50-Minute Class</div>
          </div>

          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn btn-outline-gold btn-sm" onclick="Tutors.openMessageModal(${r.tutor_id})">💬 Message</button>
            ${r.status === 'pending' ? `
              <button class="btn btn-secondary btn-sm" onclick="Student.cancelRequest(${r.id})">Cancel</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
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
          <div class="empty-icon">📚</div>
          <h3 class="empty-title">No ${this.activeTab !== 'all' ? this.activeTab : ''} Tutoring Sessions</h3>
          <p class="empty-desc">Explore verified tutors in calculus, physics, chemistry, coding, and languages to book your first 50-minute session.</p>
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
          ${r.notes ? `<p style="font-size: 0.8rem; color: var(--charcoal-400); margin-top: 0.2rem;">Topic: ${escapeHtmlStr(r.notes)}</p>` : ''}
          ${r.tutor_response_note ? `<p style="font-size: 0.8rem; color: var(--gold-700); margin-top: 0.2rem;">Tutor note: "${escapeHtmlStr(r.tutor_response_note)}"</p>` : ''}
        </div>

        <div class="request-datetime-info">
          <strong>🗓️ ${r.requested_date}</strong>
          <span>⏰ ${r.requested_time} (50 mins)</span>
        </div>

        <div class="request-pricing-info">
          $${r.total_amount ? r.total_amount.toFixed(2) : '0.00'}
          <span>Rate: $${r.hourly_rate}/hr</span>
        </div>

        <div class="request-actions-col">
          <span class="status-pill ${r.status}">${r.status}</span>
          ${r.status === 'pending' ? `
            <button class="btn btn-secondary btn-sm" onclick="Student.cancelRequest(${r.id})">Cancel</button>
          ` : ''}
          ${r.status === 'accepted' ? `
            <button class="btn btn-outline-gold btn-sm" onclick="Tutors.openMessageModal(${r.tutor_id})">💬 Message</button>
          ` : ''}
          ${r.status === 'completed' ? `
            ${r.review_rating ? `
              <span style="font-size: 0.82rem; color: #F59E0B; font-weight: 700;">★ ${r.review_rating}/5</span>
            ` : `
              <button class="btn btn-outline-gold btn-sm" onclick="Student.openReviewModal(${r.id}, '${escapeQuotes(r.tutor_name)}', '${escapeQuotes(r.subject)}')">★ Review</button>
            `}
          ` : ''}
        </div>
      </div>
    `).join('');
  },

  renderHistory() {
    const container = document.getElementById('student-history-container');
    if (!container) return;

    const completedSessions = this.requests
      .filter(r => r.status === 'completed')
      .sort((a, b) => (b.requested_date + ' ' + b.requested_time).localeCompare(a.requested_date + ' ' + a.requested_time));

    if (completedSessions.length === 0) {
      container.innerHTML = `
        <div style="padding: 2.5rem; text-align: center; background: var(--bg-surface-alt); border-radius: var(--radius-lg); border: 1px dashed var(--border-light);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">📜</div>
          <h4 style="color: var(--charcoal-900); font-weight: 700; margin-bottom: 0.3rem;">No Completed Lesson Records Yet</h4>
          <p style="color: var(--text-secondary); font-size: 0.88rem; max-width: 440px; margin: 0 auto 1.25rem auto;">
            When you complete tutoring sessions with your instructors, your session history, study notes, and instructor feedback will be archived here.
          </p>
          <a href="#tutors" class="btn btn-primary btn-sm">Browse Tutors →</a>
        </div>
      `;
      return;
    }

    container.innerHTML = completedSessions.map(r => `
      <div class="history-card">
        <img src="${r.tutor_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}" style="width: 54px; height: 54px; border-radius: 50%; object-fit: cover; border: 2px solid var(--gold-400);" />

        <div>
          <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.25rem;">
            <h4 style="font-size: 1.05rem; color: var(--charcoal-900); font-weight: 700; margin: 0;">${r.subject}</h4>
            <span class="status-pill completed">✓ Completed</span>
          </div>
          <p style="font-size: 0.85rem; color: var(--charcoal-700); margin: 0 0 0.25rem 0;">
            Instructor: <strong>${r.tutor_name}</strong>
          </p>
          ${r.notes ? `<p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0 0 0.2rem 0;">Topic: ${escapeHtmlStr(r.notes)}</p>` : ''}
          ${r.tutor_response_note ? `<p style="font-size: 0.8rem; color: var(--gold-700); margin: 0; font-style: italic;">Instructor Feedback: "${escapeHtmlStr(r.tutor_response_note)}"</p>` : ''}
        </div>

        <div style="font-size: 0.88rem; color: var(--charcoal-900);">
          <div style="font-weight: 700;">🗓️ ${r.requested_date}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">50 min class completed</div>
        </div>

        <div>
          ${r.review_rating ? `
            <div style="text-align: right;">
              <div style="color: #F59E0B; font-size: 1rem; font-weight: 700;">
                ${'★'.repeat(r.review_rating)}${'☆'.repeat(5 - r.review_rating)}
              </div>
              <span style="font-size: 0.78rem; color: var(--text-muted);">Your Rating (${r.review_rating}/5)</span>
              ${r.review_comment ? `<p style="font-size: 0.78rem; color: var(--charcoal-700); margin-top: 0.2rem; font-style: italic;">"${escapeHtmlStr(r.review_comment)}"</p>` : ''}
            </div>
          ` : `
            <button class="btn btn-outline-gold btn-sm" onclick="Student.openReviewModal(${r.id}, '${escapeQuotes(r.tutor_name)}', '${escapeQuotes(r.subject)}')">★ Write Review</button>
          `}
        </div>
      </div>
    `).join('');
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
          headline: r.tutor_headline,
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
          <p style="color: var(--text-secondary); font-size: 0.88rem; max-width: 480px; margin: 0 auto 1.25rem auto;">Browse verified faculty across mathematics, natural sciences, coding, and humanities to book your first tailored 50-minute session.</p>
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
            <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="Tutors.openBookingModal(${t.id})">Book Again →</button>
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
      if (gradeInput) gradeInput.value = sp.grade_level || 'Grade 11 - High School';
      if (schoolInput) schoolInput.value = sp.school || '';
      if (goalsInput) goalsInput.value = sp.learning_goals || '';
      if (subjectsInput) subjectsInput.value = sp.target_subjects || '';

      const gradeBadge = document.getElementById('student-grade-badge');
      if (gradeBadge) {
        gradeBadge.textContent = sp.grade_level || 'Active Student';
      }
    } catch (e) {
      console.warn('Could not load student profile form data:', e);
    }
  },

  async cancelRequest(requestId) {
    showConfirm(
      'Cancel Tutoring Request',
      'Are you sure you want to cancel this request? Your tutor will be notified.',
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
      await this.loadDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Profile Changes';
    }
  }
};
