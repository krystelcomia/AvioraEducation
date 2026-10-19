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
    if (gradeFilter) gradeFilter.value = 'all';
    if (sortFilter) sortFilter.value = 'featured';
    if (rateFilter) rateFilter.value = '';

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
          <div class="tutor-card-actions">
            <button class="btn btn-secondary btn-sm view-profile-btn" data-id="${t.id}">Profile</button>
            <button class="btn btn-primary btn-sm book-tutor-btn" data-id="${t.id}">Book</button>
          </div>
        </div>
      </div>
    `;
  },

  attachCardEventListeners(container) {
    container.querySelectorAll('.view-profile-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tutorId = btn.dataset.id;
        this.openProfileModal(tutorId);
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

  async openProfileModal(tutorId) {
    try {
      const data = await API.getTutorById(tutorId);
      const tutor = data.tutor;
      this.selectedTutor = tutor;

      const modal = document.getElementById('tutor-profile-modal');
      const content = document.getElementById('tutor-profile-content');
      if (!modal || !content) return;

      const subjectsTags = (tutor.subjects || []).map(s => `<span class="subject-tag">${s}</span>`).join(' ');
      const gradeLevelsTags = (tutor.grade_levels || []).map(g => `<span class="badge-gold">${g}</span>`).join(' ');

      // Format Schedule Table
      let scheduleHtml = '';
      if (tutor.availability_schedule && Object.keys(tutor.availability_schedule).length > 0) {
        scheduleHtml = Object.entries(tutor.availability_schedule).map(([day, slots]) => `
          <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem;">
            <strong style="color: var(--gold-300);">${day}</strong>
            <span style="color: var(--charcoal-300);">${Array.isArray(slots) ? slots.join(', ') : slots}</span>
          </div>
        `).join('');
      } else {
        scheduleHtml = '<p style="color: var(--charcoal-400); font-size: 0.85rem;">Flexible schedule available upon request.</p>';
      }

      // Reviews
      let reviewsHtml = '';
      if (tutor.reviews && tutor.reviews.length > 0) {
        reviewsHtml = tutor.reviews.map(r => `
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
              <strong style="color: var(--white); font-size: 0.9rem;">${r.student_name}</strong>
              <span style="color: #F59E0B; font-size: 0.85rem;">★ ${r.rating}.0</span>
            </div>
            <p style="color: var(--charcoal-300); font-size: 0.85rem; line-height: 1.5; font-style: italic;">"${r.comment}"</p>
          </div>
        `).join('');
      } else {
        reviewsHtml = '<p style="color: var(--charcoal-400); font-size: 0.85rem;">No reviews yet for this tutor.</p>';
      }

      content.innerHTML = `
        <div style="display: flex; gap: 1.5rem; align-items: center; margin-bottom: 1.75rem; flex-wrap: wrap;">
          <img src="${tutor.avatar_url}" style="width: 88px; height: 88px; border-radius: var(--radius-lg); object-fit: cover; border: 2.5px solid var(--gold-500);" />
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem;">
              <h2 style="font-size: 1.5rem; color: var(--white);">${tutor.name}</h2>
              <span class="badge-gold">Verified Educator</span>
            </div>
            <p style="color: var(--gold-300); font-size: 0.95rem; margin-bottom: 0.4rem;">${tutor.headline || ''}</p>
            <div style="display: flex; align-items: center; gap: 1rem; font-size: 0.875rem;">
              <span style="color: #F59E0B; font-weight: 700;">★ ${tutor.rating.toFixed(1)} (${tutor.reviews_count} reviews)</span>
              <span style="color: var(--charcoal-400);">•</span>
              <span style="color: var(--white); font-weight: 700;">$${tutor.hourly_rate} / hour</span>
              <span style="color: var(--charcoal-400);">•</span>
              <span style="color: var(--charcoal-300);">${tutor.total_sessions} sessions completed</span>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 1.5rem;">
          <h4 style="color: var(--white); margin-bottom: 0.5rem; font-size: 1.05rem;">Academic Qualifications</h4>
          <p style="color: var(--charcoal-200); font-size: 0.9rem;">
            🎓 <strong>${tutor.highest_degree || 'Advanced Degree'}</strong> from <strong>${tutor.institution || 'Accredited University'}</strong>
            (${tutor.years_experience} years of teaching experience)
          </p>
        </div>

        <div style="margin-bottom: 1.5rem;">
          <h4 style="color: var(--white); margin-bottom: 0.5rem; font-size: 1.05rem;">Subjects & Target Grade Levels</h4>
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.6rem;">
            ${subjectsTags}
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
            ${gradeLevelsTags}
          </div>
        </div>

        <div style="margin-bottom: 1.5rem;">
          <h4 style="color: var(--white); margin-bottom: 0.5rem; font-size: 1.05rem;">Biography & Mentorship Approach</h4>
          <p style="color: var(--charcoal-300); font-size: 0.925rem; line-height: 1.6;">${tutor.bio}</p>
        </div>

        <div style="margin-bottom: 1.75rem;">
          <h4 style="color: var(--white); margin-bottom: 0.75rem; font-size: 1.05rem;">Weekly Availability Schedule</h4>
          <div style="background: rgba(0,0,0,0.25); border-radius: var(--radius-md); padding: 1rem 1.25rem;">
            ${scheduleHtml}
          </div>
        </div>

        <div>
          <h4 style="color: var(--white); margin-bottom: 0.75rem; font-size: 1.05rem;">Verified Student Reviews (${tutor.reviews?.length || 0})</h4>
          ${reviewsHtml}
        </div>
      `;

      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    } catch (err) {
      showToast(err.message, 'error');
    }
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
