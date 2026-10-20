/**
 * AVIORA EDUCATION - TUTOR DIRECTORY & BOOKING LOGIC
 */

const Tutors = {
  allTutors: [],
  selectedTutor: null,
  activeSubjectFilter: 'all',

  async init() {
    this.setupEventListeners();
    await this.fetchTutors();
  },

  setupEventListeners() {
    // Search input with debounce
    const searchInput = document.getElementById('tutor-search-input');
    if (searchInput) {
      let timeout = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          this.applyFilters();
        }, 300);
      });
    }

    // Filter controls
    const gradeFilter = document.getElementById('tutor-grade-filter');
    if (gradeFilter) {
      gradeFilter.addEventListener('change', () => this.applyFilters());
    }

    const sortFilter = document.getElementById('tutor-sort-filter');
    if (sortFilter) {
      sortFilter.addEventListener('change', () => this.applyFilters());
    }

    const maxRateFilter = document.getElementById('tutor-rate-filter');
    if (maxRateFilter) {
      maxRateFilter.addEventListener('change', () => this.applyFilters());
    }

    // Subject Pills click
    document.querySelectorAll('.subject-pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.subject-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeSubjectFilter = btn.dataset.subject || 'all';
        this.applyFilters();
      });
    });

    // Close Modals
    const profileModalClose = document.getElementById('tutor-profile-modal-close');
    if (profileModalClose) {
      profileModalClose.addEventListener('click', () => this.closeProfileModal());
    }

    const profileOverlay = document.getElementById('tutor-profile-modal');
    if (profileOverlay) {
      profileOverlay.addEventListener('click', (e) => {
        if (e.target === profileOverlay) this.closeProfileModal();
      });
    }

    // Message Modal
    const messageModalClose = document.getElementById('tutor-message-modal-close');
    if (messageModalClose) {
      messageModalClose.addEventListener('click', () => this.closeMessageModal());
    }

    const cancelMessageBtn = document.getElementById('direct-message-cancel-btn');
    if (cancelMessageBtn) {
      cancelMessageBtn.addEventListener('click', () => this.closeMessageModal());
    }

    const messageOverlay = document.getElementById('tutor-message-modal');
    if (messageOverlay) {
      messageOverlay.addEventListener('click', (e) => {
        if (e.target === messageOverlay) this.closeMessageModal();
      });
    }

    // Direct Message Form Submit
    const messageForm = document.getElementById('tutor-direct-message-form');
    if (messageForm) {
      messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const tutorId = document.getElementById('direct-message-tutor-id')?.value;
        const name = document.getElementById('direct-message-name')?.value;
        const email = document.getElementById('direct-message-email')?.value;
        const subject = document.getElementById('direct-message-subject')?.value;
        const message = document.getElementById('direct-message-content')?.value;

        try {
          await API.sendMessageToTutor(tutorId, { name, email, subject, message });
          showToast('Your message has been sent directly to the educator! They will be notified immediately.', 'success');
          document.getElementById('direct-message-content').value = '';
          this.closeMessageModal();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    const requestModalClose = document.getElementById('booking-modal-close');
    if (requestModalClose) {
      requestModalClose.addEventListener('click', () => this.closeBookingModal());
    }

    const requestOverlay = document.getElementById('booking-modal');
    if (requestOverlay) {
      requestOverlay.addEventListener('click', (e) => {
        if (e.target === requestOverlay) this.closeBookingModal();
      });
    }

    // Booking form duration change (cost calculation)
    const durationSelect = document.getElementById('booking-duration');
    if (durationSelect) {
      durationSelect.addEventListener('change', () => this.updateBookingCost());
    }

    // Booking Form Submit
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
      bookingForm.addEventListener('submit', (e) => this.handleBookingSubmit(e));
    }
  },

  async fetchTutors() {
    try {
      const data = await API.getTutors();
      this.allTutors = data.tutors || [];
      this.renderFeaturedTutors();
      this.renderDirectoryTutors(this.allTutors);
    } catch (err) {
      console.error('Failed to load tutors:', err);
    }
  },

  async applyFilters() {
    const searchVal = document.getElementById('tutor-search-input')?.value.trim() || '';
    const gradeVal = document.getElementById('tutor-grade-filter')?.value || 'all';
    const sortVal = document.getElementById('tutor-sort-filter')?.value || 'featured';
    const rateVal = document.getElementById('tutor-rate-filter')?.value || '';

    let params = new URLSearchParams();
    if (searchVal) params.append('q', searchVal);
    if (this.activeSubjectFilter && this.activeSubjectFilter !== 'all') params.append('subject', this.activeSubjectFilter);
    if (gradeVal && gradeVal !== 'all') params.append('grade', gradeVal);
    if (rateVal) params.append('max_rate', rateVal);
    if (sortVal) params.append('sort', sortVal);

    try {
      const data = await API.getTutors(params.toString());
      this.renderDirectoryTutors(data.tutors || []);
    } catch (err) {
      console.error('Filter error:', err);
    }
  },

  renderFeaturedTutors() {
    const container = document.getElementById('featured-tutors-grid');
    if (!container) return;

    const featured = this.allTutors.filter(t => t.is_featured === 1).slice(0, 3);
    if (featured.length === 0) {
      container.innerHTML = `<p class="empty-desc">Top verified tutors are being curated.</p>`;
      return;
    }

    container.innerHTML = featured.map(t => this.createTutorCardHtml(t)).join('');
    this.attachCardEventListeners(container);
  },

  renderDirectoryTutors(tutors) {
    const container = document.getElementById('tutors-directory-grid');
    const countBadge = document.getElementById('tutor-count-badge');
    if (!container) return;

    if (countBadge) {
      countBadge.textContent = `${tutors.length} Verified Tutors Available`;
    }

    if (tutors.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">🔍</div>
          <h3 class="empty-title">No Tutors Match Your Filters</h3>
          <p class="empty-desc">Try clearing or adjusting your search terms, grade levels, or subject filters.</p>
          <button class="btn btn-outline-gold btn-sm" onclick="Tutors.resetFilters()">Reset All Filters</button>
        </div>
      `;
      return;
    }

    container.innerHTML = tutors.map(t => this.createTutorCardHtml(t)).join('');
    this.attachCardEventListeners(container);
  },

  resetFilters() {
    const searchInput = document.getElementById('tutor-search-input');
    const gradeFilter = document.getElementById('tutor-grade-filter');
    const sortFilter = document.getElementById('tutor-sort-filter');
    const rateFilter = document.getElementById('tutor-rate-filter');

    if (searchInput) searchInput.value = '';
    if (gradeFilter) gradeFilter.selectedIndex = 0;
    if (sortFilter) sortFilter.selectedIndex = 0;
    if (rateFilter) rateFilter.selectedIndex = 0;

    document.querySelectorAll('.subject-pill-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.subject-pill-btn[data-subject="all"]')?.classList.add('active');
    this.activeSubjectFilter = 'all';

    this.applyFilters();
  },

  createTutorCardHtml(t) {
    const subjectsHtml = (t.subjects || []).slice(0, 3).map(s => `
      <span class="subject-tag">${s}</span>
    `).join('');

    const moreSubjects = (t.subjects || []).length > 3 ? `<span class="subject-tag">+${t.subjects.length - 3} more</span>` : '';

    return `
      <div class="tutor-card" data-tutor-id="${t.id}">
        <div class="tutor-card-header">
          <div class="tutor-avatar-wrap">
            <img src="${t.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}" alt="${t.name}" class="tutor-avatar-img" />
            <div class="verified-badge-icon" title="Aviora Academic Board Verified">✓</div>
          </div>
          <div class="tutor-info-meta">
            <h3 class="tutor-name">${t.name}</h3>
            <p class="tutor-headline">${t.headline || t.institution || 'Verified Academic Specialist'}</p>
            <div class="tutor-ratings-line">
              <span class="star-gold">★</span>
              <span>${t.rating ? t.rating.toFixed(1) : '5.0'}</span>
              <span class="review-count">(${t.reviews_count || 0} reviews)</span>
            </div>
          </div>
        </div>

        <div class="tutor-card-body">
          <p class="tutor-bio-snippet">${t.bio || 'Expert educator dedicated to guiding students toward top academic scores.'}</p>
          <div class="tutor-tags-wrap">
            ${subjectsHtml}
            ${moreSubjects}
          </div>
        </div>

        <div class="tutor-card-footer">
          <div class="tutor-rate-box">
            <span class="rate-amount">$${t.hourly_rate}</span>
            <span class="rate-period">per hour</span>
          </div>
          <div class="tutor-card-actions" style="display: flex; align-items: center; gap: 0.45rem;">
            <button class="btn btn-icon message-tutor-btn" data-id="${t.id}" title="Send message to ${t.name}" style="background: rgba(198, 138, 40, 0.12); border: 1.5px solid rgba(198, 138, 40, 0.35); color: #7A4F05; width: 36px; height: 36px; min-width: 36px; min-height: 36px; padding: 0 !important; border-radius: var(--radius-sm); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all var(--transition-fast);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A4F05" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block; flex-shrink: 0;">
                <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
              </svg>
            </button>
            <button class="btn btn-secondary btn-sm view-profile-btn" data-id="${t.id}">Profile</button>
            <button class="btn btn-primary btn-sm book-tutor-btn" data-id="${t.id}">Book</button>
          </div>
        </div>
      </div>
    `;
  },

  attachCardEventListeners(container) {
    container.querySelectorAll('.message-tutor-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tutorId = btn.dataset.id;
        this.openMessageModal(tutorId);
      });
    });

    container.querySelectorAll('.view-profile-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tutorId = btn.dataset.id;
        this.navigateToProfile(tutorId);
      });
    });

    container.querySelectorAll('.book-tutor-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tutorId = btn.dataset.id;
        this.openBookingModal(tutorId);
      });
    });
  },

  navigateToProfile(tutorId) {
    window.location.hash = `#tutor-profile?id=${tutorId}`;
  },

  async loadFullProfilePage(tutorId) {
    const container = document.getElementById('tutor-full-profile-container');
    if (!container) return;

    try {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 0;">
          <p style="color: var(--text-secondary); font-size: 1.05rem;">Loading educator academic profile...</p>
        </div>
      `;

      const data = await API.getTutorById(tutorId);
      const tutor = data.tutor;
      this.selectedTutor = tutor;

      const subjectsTags = (tutor.subjects || []).map(s => `<span class="subject-tag">${s}</span>`).join(' ');
      const gradeLevelsTags = (tutor.grade_levels || []).map(g => `<span class="badge-gold">${g}</span>`).join(' ');

      // Format Schedule Table (Monday through Sunday)
      let scheduleRowsHtml = '';
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const sched = tutor.availability_schedule || {};

      daysOfWeek.forEach(day => {
        const slots = sched[day] || (day !== 'Sunday' ? ['10:00 - 12:00', '14:00 - 17:00'] : ['Flexible Consultation']);
        const slotsArray = Array.isArray(slots) ? slots : [slots];
        const badgesHtml = slotsArray.map(slot => `<span class="schedule-slot-badge">⏰ ${slot}</span>`).join(' ');

        scheduleRowsHtml += `
          <tr class="schedule-row">
            <td class="schedule-day-td">${day}</td>
            <td class="schedule-slots-td">${badgesHtml}</td>
          </tr>
        `;
      });

      // Reviews
      let reviewsHtml = '';
      if (tutor.reviews && tutor.reviews.length > 0) {
        reviewsHtml = tutor.reviews.map(r => `
          <div class="tutor-review-card">
            <div class="tutor-review-header">
              <div class="tutor-review-author">
                <div class="tutor-review-avatar">${(r.student_name || 'S').charAt(0)}</div>
                <div>
                  <div style="font-weight: 700; color: var(--charcoal-950); font-size: 0.925rem;">${r.student_name}</div>
                  <div style="font-size: 0.76rem; color: var(--text-muted);">${r.created_at ? new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Verified Student'}</div>
                </div>
              </div>
              <div style="color: #F59E0B; font-weight: 700; font-size: 0.9rem;">
                ${'★'.repeat(Math.round(r.rating || 5))} <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">(${r.rating}.0)</span>
              </div>
            </div>
            <p class="tutor-review-comment">"${r.comment}"</p>
          </div>
        `).join('');
      } else {
        reviewsHtml = `
          <div class="tutor-review-card" style="text-align: center; padding: 2rem;">
            <p style="color: var(--text-secondary); margin: 0; font-style: italic;">
              This educator recently completed credential verification with the Aviora Academic Board. No public student reviews posted yet.
            </p>
          </div>
        `;
      }

      container.innerHTML = `
        <!-- Top Breadcrumb & Back Action -->
        <div class="tutor-breadcrumb-bar">
          <button class="btn btn-outline-gold btn-sm" id="full-profile-back-btn" style="display: inline-flex; align-items: center; gap: 0.4rem;">
            <span>←</span>
            <span>Back to Tutors Directory</span>
          </button>
          <div class="tutor-breadcrumb-text">
            <a href="#tutors">Directory</a> / <span>${tutor.name}</span>
          </div>
        </div>

        <!-- Tutor Hero Header Card -->
        <div class="tutor-profile-hero-card">
          <div class="tutor-hero-top">
            <div class="tutor-hero-avatar-box">
              <img src="${tutor.avatar_url}" alt="${tutor.name}" class="tutor-hero-avatar-img" />
              <div class="tutor-hero-badge-verified" title="Aviora Board Verified">✓</div>
            </div>

            <div class="tutor-hero-info">
              <div class="tutor-hero-title-row">
                <h1 class="tutor-hero-name">${tutor.name}</h1>
                <span class="badge-gold">Verified Educator</span>
              </div>
              <div class="tutor-hero-headline">${tutor.headline || 'Distinguished Faculty Specialist'}</div>
              <div class="tutor-hero-credentials">
                <span>🎓 <strong>${tutor.highest_degree || 'Advanced Degree'}</strong></span>
                <span>•</span>
                <span>🏛️ <strong>${tutor.institution || 'Accredited University'}</strong></span>
                <span>•</span>
                <span>⏳ ${tutor.years_experience || 5} Years Teaching Experience</span>
              </div>

              <div class="tutor-hero-actions">
                <button class="btn btn-outline-gold btn-md" id="hero-message-tutor-btn" data-id="${tutor.id}" style="display: inline-flex; align-items: center; gap: 0.5rem;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                  </svg>
                  <span>Message Tutor</span>
                </button>
                <button class="btn btn-primary btn-md" id="hero-book-tutor-btn" data-id="${tutor.id}" style="display: inline-flex; align-items: center; gap: 0.5rem;">
                  <span>Book 1-on-1 Session</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 4 Core High-Impact Stat Strip -->
          <div class="tutor-stats-strip">
            <div class="tutor-stat-item">
              <div class="tutor-stat-icon">👥</div>
              <div class="tutor-stat-info-col">
                <span class="tutor-stat-num">${tutor.total_students || 18}</span>
                <span class="tutor-stat-label">Total Students Mentored</span>
              </div>
            </div>

            <div class="tutor-stat-item">
              <div class="tutor-stat-icon">📚</div>
              <div class="tutor-stat-info-col">
                <span class="tutor-stat-num">${tutor.total_sessions || 0}</span>
                <span class="tutor-stat-label">Sessions Completed</span>
              </div>
            </div>

            <div class="tutor-stat-item">
              <div class="tutor-stat-icon">⭐</div>
              <div class="tutor-stat-info-col">
                <span class="tutor-stat-num">${tutor.rating ? tutor.rating.toFixed(1) : '5.0'}</span>
                <span class="tutor-stat-label">Rating (${tutor.reviews_count || 0} Reviews)</span>
              </div>
            </div>

            <div class="tutor-stat-item">
              <div class="tutor-stat-icon">💎</div>
              <div class="tutor-stat-info-col">
                <span class="tutor-stat-num">$${tutor.hourly_rate}</span>
                <span class="tutor-stat-label">Standard Hourly Rate</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2-Column Content Grid -->
        <div class="tutor-profile-grid">
          <!-- Left Main Column -->
          <div class="tutor-profile-main-col">
            <!-- Biography Card -->
            <div class="tutor-profile-card">
              <h2 class="tutor-profile-card-title">
                <span>📖</span>
                <span>Biography &amp; Mentorship Philosophy</span>
              </h2>
              <p style="font-size: 0.95rem; line-height: 1.75; color: var(--charcoal-900); margin-bottom: 1.25rem;">
                ${tutor.bio || 'Expert educator committed to rigorous conceptual instruction and academic empowerment.'}
              </p>
              <div style="background: rgba(198, 138, 40, 0.08); border-left: 3px solid var(--gold-600); padding: 0.85rem 1.15rem; border-radius: 0 var(--radius-sm) var(--radius-sm) 0;">
                <p style="font-size: 0.85rem; color: var(--gold-900); font-weight: 600; margin: 0;">
                  ✦ First-Principles Instruction: Lessons prioritize deep analytical understanding over memorization shortcuts.
                </p>
              </div>
            </div>

            <!-- Academic Qualifications Card -->
            <div class="tutor-profile-card">
              <h2 class="tutor-profile-card-title">
                <span>🎓</span>
                <span>Academic Qualifications &amp; Pedagogy Vetting</span>
              </h2>
              <div style="display: flex; flex-direction: column; gap: 0.85rem;">
                <div style="display: flex; align-items: flex-start; gap: 0.85rem;">
                  <span style="font-size: 1.25rem;">🏛️</span>
                  <div>
                    <strong style="color: var(--charcoal-950); font-size: 0.95rem;">${tutor.institution || 'University Faculty'}</strong>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.2rem 0 0 0;">Highest Credential: ${tutor.highest_degree || 'Advanced Degree'}</p>
                  </div>
                </div>
                <div style="display: flex; align-items: flex-start; gap: 0.85rem;">
                  <span style="font-size: 1.25rem;">🛡️</span>
                  <div>
                    <strong style="color: var(--charcoal-950); font-size: 0.95rem;">Identity &amp; Degree Verified</strong>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.2rem 0 0 0;">Official transcripts, teaching pedigree, and identity authenticated by the Aviora Academic Board.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Subjects & Target Grades Card -->
            <div class="tutor-profile-card">
              <h2 class="tutor-profile-card-title">
                <span>🎯</span>
                <span>Subjects &amp; Target Grade Levels</span>
              </h2>
              <div style="margin-bottom: 1.25rem;">
                <h4 style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--gold-800); margin-bottom: 0.65rem;">Instructional Disciplines:</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                  ${subjectsTags}
                </div>
              </div>
              <div>
                <h4 style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--gold-800); margin-bottom: 0.65rem;">Target Grade Competencies:</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                  ${gradeLevelsTags}
                </div>
              </div>
            </div>

            <!-- Student Reviews Card -->
            <div class="tutor-profile-card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid rgba(0,0,0,0.06); padding-bottom: 0.75rem;">
                <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--charcoal-950); margin: 0; display: flex; align-items: center; gap: 0.6rem;">
                  <span>⭐</span>
                  <span>Previous Student Ratings &amp; Reviews</span>
                </h2>
                <span class="badge-gold">★ ${tutor.rating ? tutor.rating.toFixed(1) : '5.0'} (${tutor.reviews?.length || 0})</span>
              </div>
              <div class="tutor-reviews-list">
                ${reviewsHtml}
              </div>
            </div>
          </div>

          <!-- Right Sidebar (Schedule & Quick Message) -->
          <div class="tutor-profile-sidebar">
            <!-- Weekly Schedule Card -->
            <div class="tutor-profile-card" style="padding: 1.75rem;">
              <h2 class="tutor-profile-card-title" style="margin-bottom: 0.75rem;">
                <span>🗓️</span>
                <span>Weekly Availability Schedule</span>
              </h2>
              <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 1rem;">
                Standard weekly time slots open for 1-on-1 sessions:
              </p>
              <table class="tutor-schedule-table">
                <tbody>
                  ${scheduleRowsHtml}
                </tbody>
              </table>
              <button class="btn btn-primary btn-md" id="sidebar-book-btn" data-id="${tutor.id}" style="width: 100%; justify-content: center; margin-top: 1.25rem;">
                <span>Book a Session Slot</span>
                <span>→</span>
              </button>
            </div>

            <!-- Quick Direct Message to Tutor Card -->
            <div class="tutor-quick-message-card">
              <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem;">
                <span style="font-size: 1.3rem;">💬</span>
                <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--charcoal-950); margin: 0;">Send Direct Message</h3>
              </div>
              <p style="font-size: 0.825rem; color: var(--text-secondary); margin-bottom: 1rem;">
                Reach out to ${tutor.name} directly regarding learning goals or schedule inquiries.
              </p>
              <form id="sidebar-tutor-message-form">
                <input type="hidden" name="tutorId" value="${tutor.id}" />
                <div class="form-group" style="margin-bottom: 0.75rem;">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Your Name</label>
                  <input type="text" class="form-control" id="sidebar-msg-name" placeholder="Your full name" required />
                </div>
                <div class="form-group" style="margin-bottom: 0.75rem;">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Your Email</label>
                  <input type="email" class="form-control" id="sidebar-msg-email" placeholder="Your email address" required />
                </div>
                <div class="form-group" style="margin-bottom: 0.85rem;">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Message</label>
                  <textarea class="form-control" id="sidebar-msg-content" rows="3" placeholder="Hi ${tutor.name}, I am interested in your classes..." required></textarea>
                </div>
                <button type="submit" class="btn btn-outline-gold btn-md" style="width: 100%; justify-content: center; display: inline-flex; align-items: center; gap: 0.5rem;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                  </svg>
                  <span>Send Message to ${tutor.name.split(' ')[0]}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      `;

      // Pre-fill user details if logged in
      const currentUser = Auth.currentUser;
      if (currentUser) {
        const nameField = document.getElementById('sidebar-msg-name');
        const emailField = document.getElementById('sidebar-msg-email');
        if (nameField && !nameField.value) nameField.value = currentUser.name || '';
        if (emailField && !emailField.value) emailField.value = currentUser.email || '';
      }

      // Attach event listeners on the generated page
      document.getElementById('full-profile-back-btn')?.addEventListener('click', () => {
        window.location.hash = '#tutors';
      });

      document.getElementById('hero-message-tutor-btn')?.addEventListener('click', () => {
        this.openMessageModal(tutor.id);
      });

      document.getElementById('hero-book-tutor-btn')?.addEventListener('click', () => {
        this.openBookingModal(tutor.id);
      });

      document.getElementById('sidebar-book-btn')?.addEventListener('click', () => {
        this.openBookingModal(tutor.id);
      });

      const sidebarMsgForm = document.getElementById('sidebar-tutor-message-form');
      if (sidebarMsgForm) {
        sidebarMsgForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const name = document.getElementById('sidebar-msg-name')?.value;
          const email = document.getElementById('sidebar-msg-email')?.value;
          const message = document.getElementById('sidebar-msg-content')?.value;

          try {
            await API.sendMessageToTutor(tutor.id, { name, email, message });
            showToast(`Your message has been sent to ${tutor.name}! They will be notified immediately.`, 'success');
            document.getElementById('sidebar-msg-content').value = '';
          } catch (err) {
            showToast(err.message, 'error');
          }
        });
      }

    } catch (err) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 0;">
          <p style="color: #EF4444; font-size: 1.1rem; margin-bottom: 1rem;">Could not load tutor profile: ${err.message}</p>
          <button class="btn btn-primary btn-sm" onclick="window.location.hash = '#tutors'">Return to Tutors Directory</button>
        </div>
      `;
    }
  },

  async openMessageModal(tutorId) {
    let tutor = this.allTutors.find(t => t.id == tutorId);
    if (!tutor) {
      try {
        const res = await API.getTutorById(tutorId);
        tutor = res.tutor;
      } catch (e) {
        // Fallback
      }
    }

    const modal = document.getElementById('tutor-message-modal');
    const banner = document.getElementById('message-tutor-banner');
    const idInput = document.getElementById('direct-message-tutor-id');
    const nameInput = document.getElementById('direct-message-name');
    const emailInput = document.getElementById('direct-message-email');

    if (!modal) return;

    if (idInput) idInput.value = tutorId;

    const user = Auth.currentUser;
    if (user) {
      if (nameInput) nameInput.value = user.name || '';
      if (emailInput) emailInput.value = user.email || '';
    }

    if (banner && tutor) {
      banner.innerHTML = `
        <img src="${tutor.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}" style="width: 46px; height: 46px; border-radius: var(--radius-md); object-fit: cover; border: 1.5px solid var(--gold-500);" />
        <div>
          <strong style="color: var(--charcoal-950); font-size: 0.95rem;">${tutor.name}</strong>
          <p style="color: var(--gold-800); font-size: 0.8rem; margin: 0.15rem 0 0 0;">${tutor.headline || 'Verified Educator'}</p>
        </div>
      `;
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeMessageModal() {
    const modal = document.getElementById('tutor-message-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  async openProfileModal(tutorId) {
    // Navigate directly to the dedicated full profile page!
    this.navigateToProfile(tutorId);
  },

  closeProfileModal() {
    const modal = document.getElementById('tutor-profile-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  openBookingModal(tutorId) {
    const user = Auth.currentUser;

    if (!user) {
      showToast('Please sign in or register as a student to book a session.', 'info');
      Auth.openModal('login');
      return;
    }

    if (user.role !== 'student') {
      showToast('You are currently signed in as a ' + user.role + '. Please use a student account to book tutoring sessions.', 'warning');
      return;
    }

    const tutor = this.allTutors.find(t => t.id == tutorId);
    if (!tutor) {
      showToast('Tutor not found.', 'error');
      return;
    }

    this.selectedTutor = tutor;

    const modal = document.getElementById('booking-modal');
    const tutorHeader = document.getElementById('booking-tutor-header');
    const subjectSelect = document.getElementById('booking-subject-select');
    const dateInput = document.getElementById('booking-date');

    if (!modal) return;

    if (tutorHeader) {
      tutorHeader.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem;">
          <img src="${tutor.avatar_url}" style="width: 50px; height: 50px; border-radius: var(--radius-md); object-fit: cover; border: 1.5px solid var(--gold-500);" />
          <div>
            <h4 style="color: var(--white); font-size: 1.1rem;">${tutor.name}</h4>
            <p style="color: var(--gold-300); font-size: 0.85rem;">$${tutor.hourly_rate} / hour</p>
          </div>
        </div>
      `;
    }

    // Populate Subjects
    if (subjectSelect) {
      subjectSelect.innerHTML = (tutor.subjects || []).map(s => `
        <option value="${s}">${s}</option>
      `).join('');
    }

    // Set default date to tomorrow
    if (dateInput) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateInput.min = tomorrow.toISOString().split('T')[0];
      dateInput.value = tomorrow.toISOString().split('T')[0];
    }

    this.updateBookingCost();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeBookingModal() {
    const modal = document.getElementById('booking-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  updateBookingCost() {
    if (!this.selectedTutor) return;
    const duration = parseFloat(document.getElementById('booking-duration')?.value || '1.0');
    const total = duration * this.selectedTutor.hourly_rate;
    const costDisplay = document.getElementById('booking-total-cost');
    if (costDisplay) {
      costDisplay.textContent = `$${total.toFixed(2)}`;
    }
  },

  async handleBookingSubmit(e) {
    e.preventDefault();
    if (!this.selectedTutor) return;

    const subject = document.getElementById('booking-subject-select').value;
    const requested_date = document.getElementById('booking-date').value;
    const requested_time = document.getElementById('booking-time').value;
    const duration_hours = parseFloat(document.getElementById('booking-duration').value);
    const notes = document.getElementById('booking-notes').value.trim();
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!requested_date || !requested_time) {
      showToast('Please select a preferred date and time slot.', 'error');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting Request...';

      const payload = {
        tutor_user_id: this.selectedTutor.user_id,
        subject,
        requested_date,
        requested_time,
        duration_hours,
        notes
      };

      const res = await API.createRequest(payload);
      this.closeBookingModal();
      showToast(res.message, 'success');

      // Prompt navigation to Student Dashboard
      window.location.hash = '#student-portal';
      Router.handleRoute();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm Tutoring Request';
    }
  }
};
