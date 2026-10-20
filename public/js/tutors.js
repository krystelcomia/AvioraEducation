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

    // Tutor Messenger Event Listeners
    this.setupMessengerListeners();

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

            <!-- Direct Messenger to Tutor Card -->
            <div class="tutor-quick-message-card" style="background: linear-gradient(180deg, #FFFFFF, #FAF7F2); border: 1.5px solid rgba(198, 138, 40, 0.35); border-radius: var(--radius-lg); padding: 1.5rem; box-shadow: var(--shadow-sm);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                <div style="display: flex; align-items: center; gap: 0.55rem;">
                  <span style="font-size: 1.35rem;">💬</span>
                  <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--charcoal-950); margin: 0;">Direct Messenger</h3>
                </div>
                <span style="font-size: 0.72rem; color: #10B981; font-weight: 600; display: inline-flex; align-items: center; gap: 0.3rem;">● Active now</span>
              </div>
              <p style="font-size: 0.825rem; color: var(--text-secondary); margin-bottom: 1.15rem; line-height: 1.45;">
                Chat 1-on-1 with ${tutor.name}. Real-time responses are stored directly in your private conversation thread.
              </p>
              <button type="button" class="btn btn-primary btn-md" id="sidebar-open-messenger-btn" style="width: 100%; justify-content: center; display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 600;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>Message ${tutor.name.split(' ')[0]} in Messenger</span>
              </button>
            </div>
          </div>
        </div>
      `;

      // Attach event listeners on the generated page
      document.getElementById('full-profile-back-btn')?.addEventListener('click', () => {
        window.location.hash = '#tutors';
      });

      document.getElementById('hero-message-tutor-btn')?.addEventListener('click', () => {
        this.openMessageModal(tutor.id);
      });

      document.getElementById('sidebar-open-messenger-btn')?.addEventListener('click', () => {
        this.openMessageModal(tutor.id);
      });

      document.getElementById('hero-book-tutor-btn')?.addEventListener('click', () => {
        this.openBookingModal(tutor.id);
      });

      document.getElementById('sidebar-book-btn')?.addEventListener('click', () => {
        this.openBookingModal(tutor.id);
      });

    } catch (err) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 0;">
          <p style="color: #EF4444; font-size: 1.1rem; margin-bottom: 1rem;">Could not load tutor profile: ${err.message}</p>
          <button class="btn btn-primary btn-sm" onclick="window.location.hash = '#tutors'">Return to Tutors Directory</button>
        </div>
      `;
    }
  },

  setupMessengerListeners() {
    const messageModalClose = document.getElementById('tutor-message-modal-close');
    if (messageModalClose) {
      messageModalClose.addEventListener('click', () => this.closeMessageModal());
    }

    const messageOverlay = document.getElementById('tutor-message-modal');
    if (messageOverlay) {
      messageOverlay.addEventListener('click', (e) => {
        if (e.target === messageOverlay) this.closeMessageModal();
      });
    }

    const bookSessionBtn = document.getElementById('messenger-book-session-btn');
    if (bookSessionBtn) {
      bookSessionBtn.addEventListener('click', () => {
        if (this.currentChatTutor) {
          const tutorId = this.currentChatTutor.id;
          this.closeMessageModal();
          this.openBookingModal(tutorId);
        }
      });
    }

    // Quick Prompt Chips
    document.querySelectorAll('.quick-prompt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const input = document.getElementById('messenger-chat-input');
        if (input) {
          input.value = chip.dataset.prompt || '';
          input.focus();
          input.dispatchEvent(new Event('input'));
        }
      });
    });

    // Auto-resizing textarea and Enter-to-send
    const input = document.getElementById('messenger-chat-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const form = document.getElementById('messenger-composer-form');
          if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
      });
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 100) + 'px';
      });
    }

    // Messenger Form Submit
    const composerForm = document.getElementById('messenger-composer-form');
    if (composerForm) {
      composerForm.addEventListener('submit', (e) => this.handleMessengerSend(e));
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
    if (!tutor) return;
    this.currentChatTutor = tutor;

    const modal = document.getElementById('tutor-message-modal');
    if (!modal) return;

    // Update Header Profile
    const avatarEl = document.getElementById('messenger-tutor-avatar');
    const nameEl = document.getElementById('messenger-tutor-name');
    const headlineEl = document.getElementById('messenger-tutor-headline');
    const idInput = document.getElementById('direct-message-tutor-id');
    const typingAvatar = document.getElementById('messenger-typing-avatar');
    const typingText = document.getElementById('messenger-typing-text');
    const chatInput = document.getElementById('messenger-chat-input');
    const activeSenderEl = document.getElementById('messenger-active-sender');

    const avatarUrl = tutor.avatar_url || tutor.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';
    if (avatarEl) avatarEl.src = avatarUrl;
    if (nameEl) nameEl.textContent = tutor.name;
    if (headlineEl) headlineEl.textContent = tutor.headline || tutor.subject || 'Verified Faculty Specialist';
    if (idInput) idInput.value = tutor.id;
    if (typingAvatar) typingAvatar.src = avatarUrl;
    if (typingText) typingText.textContent = `${tutor.name} is typing...`;
    if (chatInput) {
      chatInput.placeholder = `Type a message to ${tutor.name.split(' ')[0]}...`;
      chatInput.value = '';
      chatInput.style.height = 'auto';
    }

    const user = Auth.currentUser;
    if (activeSenderEl) {
      activeSenderEl.textContent = user ? `Chatting as: ${user.name}` : `Direct 1-on-1 Line`;
    }

    // Load or initialize conversation thread for this specific tutor
    const threadKey = `aviora_tutor_chat_${tutor.id}`;
    let thread = [];
    try {
      const saved = localStorage.getItem(threadKey);
      if (saved) thread = JSON.parse(saved);
    } catch (e) {
      thread = [];
    }

    // If first time messaging this tutor, initialize with authentic welcoming greeting from this educator
    if (!thread || thread.length === 0) {
      const initialGreeting = {
        id: 'msg-' + Date.now(),
        sender: 'tutor',
        senderName: tutor.name,
        text: `Hello! I'm ${tutor.name}. Welcome to Aviora Education! Whether you need support with ${tutor.subject || 'your coursework'}, structured exam prep, or personalized problem sets, I'm here to help you excel. Feel free to ask any questions or share your schedule preferences!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      thread = [initialGreeting];
      try {
        localStorage.setItem(threadKey, JSON.stringify(thread));
      } catch (e) {}
    }

    // Render messages in thread
    this.renderMessengerThread(thread, tutor);

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      this.scrollMessengerToBottom();
      if (chatInput) chatInput.focus();
    }, 120);
  },

  closeMessageModal() {
    const modal = document.getElementById('tutor-message-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  renderMessengerThread(thread, tutor) {
    const threadContainer = document.getElementById('messenger-messages-thread');
    if (!threadContainer || !tutor) return;

    const tutorAvatar = tutor.avatar_url || tutor.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';

    threadContainer.innerHTML = thread.map(m => {
      if (m.sender === 'tutor') {
        return `
          <div class="messenger-message incoming">
            <img src="${tutorAvatar}" alt="${tutor.name}" class="messenger-avatar-small" />
            <div class="messenger-bubble-wrap">
              <div class="messenger-bubble">
                <div class="messenger-bubble-sender">${this.escapeHtml(tutor.name)}</div>
                <div class="messenger-bubble-text">${this.formatMessageText(m.text)}</div>
                <div class="messenger-bubble-time">${m.time}</div>
              </div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="messenger-message outgoing">
            <div class="messenger-bubble-wrap">
              <div class="messenger-bubble">
                <div class="messenger-bubble-text">${this.formatMessageText(m.text)}</div>
                <div class="messenger-bubble-time">${m.time} • Delivered ✓✓</div>
              </div>
            </div>
          </div>
        `;
      }
    }).join('');

    this.scrollMessengerToBottom();
  },

  async handleMessengerSend(e) {
    if (e) e.preventDefault();
    if (!this.currentChatTutor) return;

    const input = document.getElementById('messenger-chat-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    const tutor = this.currentChatTutor;
    const user = Auth.currentUser;
    const senderName = user?.name || 'Student';
    const senderEmail = user?.email || 'student@aviora.edu';
    const threadKey = `aviora_tutor_chat_${tutor.id}`;

    // Add student message immediately
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const studentMsg = {
      id: 'msg-' + Date.now(),
      sender: 'student',
      senderName: senderName,
      text: text,
      time: timeStr
    };

    let thread = [];
    try {
      thread = JSON.parse(localStorage.getItem(threadKey) || '[]');
    } catch (e) {
      thread = [];
    }
    thread.push(studentMsg);
    try {
      localStorage.setItem(threadKey, JSON.stringify(thread));
    } catch (e) {}

    // Re-render student bubble
    this.renderMessengerThread(thread, tutor);

    // Reset input
    input.value = '';
    input.style.height = 'auto';

    // Async sync with database
    API.sendMessageToTutor(tutor.id, {
      name: senderName,
      email: senderEmail,
      subject: `Direct Chat with ${tutor.name}`,
      message: text
    }).catch(err => console.warn('Direct message sync warning:', err));

    // Show realistic Messenger typing indicator
    const typingIndicator = document.getElementById('messenger-typing-indicator');
    setTimeout(() => {
      if (typingIndicator) {
        typingIndicator.style.display = 'flex';
        this.scrollMessengerToBottom();
      }
    }, 320);

    // Dynamic tutor response delivery after 1.5 - 2.1 seconds
    const replyDelay = Math.floor(Math.random() * 600) + 1500;
    setTimeout(() => {
      if (typingIndicator) {
        typingIndicator.style.display = 'none';
      }

      const replyContent = this.getDynamicTutorReply(tutor, text);
      const tutorReply = {
        id: 'msg-' + Date.now(),
        sender: 'tutor',
        senderName: tutor.name,
        text: replyContent,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      let updatedThread = [];
      try {
        updatedThread = JSON.parse(localStorage.getItem(threadKey) || '[]');
      } catch (e) {
        updatedThread = thread;
      }
      updatedThread.push(tutorReply);
      try {
        localStorage.setItem(threadKey, JSON.stringify(updatedThread));
      } catch (e) {}

      this.renderMessengerThread(updatedThread, tutor);
    }, replyDelay);
  },

  getDynamicTutorReply(tutor, studentMessage) {
    const msg = (studentMessage || '').toLowerCase();
    const subject = tutor.subject || 'coursework';

    if (msg.includes('schedule') || msg.includes('available') || msg.includes('time') || msg.includes('day') || msg.includes('when')) {
      return `I typically hold 1-on-1 sessions on weekday afternoons and Saturday mornings! You can click "Book Session" at the top of our chat to inspect my available time slots and reserve your spot directly. Let me know if you need any specific time adjustment!`;
    }

    if (msg.includes('rate') || msg.includes('price') || msg.includes('cost') || msg.includes('fee') || msg.includes('dollar') || msg.includes('hour')) {
      return `My tutoring rate is $${tutor.hourly_rate || 75}/hour through Aviora Education. This covers full 1-on-1 instruction, curated diagnostic exercises, and ongoing progress assessments.`;
    }

    if (msg.includes('exam') || msg.includes('ap') || msg.includes('sat') || msg.includes('act') || msg.includes('test') || msg.includes('calculus') || msg.includes('physics') || msg.includes('grade')) {
      return `Exam preparation in ${subject} is one of my core focus areas! We will start with a diagnostic review of past exam questions, identify high-yield topics, and build confidence through active practice. When is your next target exam date?`;
    }

    if (msg.includes('intro') || msg.includes('first session') || msg.includes('trial') || msg.includes('start') || msg.includes('begin')) {
      return `I'd love to work with you! In our first session, we will outline your academic timeline, review any tricky chapters you've faced recently, and establish a clear learning pathway. You can use the "Book Session" button above whenever you're ready!`;
    }

    if (msg.includes('homework') || msg.includes('problem') || msg.includes('assignment') || msg.includes('help')) {
      return `Feel free to bring any questions, assignments, or problem sets to our session! We can step through each solution method together so you grasp the fundamental principles without getting stuck.`;
    }

    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg.includes('good morning') || msg.includes('good afternoon')) {
      return `Hi there! Great to connect with you. How is your semester going so far, and what specific topics in ${subject} would you like us to focus on?`;
    }

    return `Thank you for sharing that! As an Aviora educator specializing in ${subject}, I'm dedicated to helping you achieve mastery. We can dive right into this during our upcoming session—feel free to click "Book Session" above or let me know what questions you have!`;
  },

  scrollMessengerToBottom() {
    const chatBody = document.getElementById('messenger-chat-body');
    if (chatBody) {
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  formatMessageText(text) {
    if (!text) return '';
    return this.escapeHtml(text).replace(/\n/g, '<br>');
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
