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
    if (section === 'profile') {
      window.location.hash = '#student-profile';
      return;
    }

    const map = {
      overview: 'student-overview-section',
      schedule: 'student-schedule-section',
      lessons: 'student-lessons-section',
      history: 'student-history-section',
      tutors: 'student-my-tutors-section'
    };

    const targetId = map[section];
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'start' });
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

      // Time-aware greeting & live clock
      this.updateTimeAwareGreeting();

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

      // Update micro-visuals and progress meters
      this.updateStatsVisuals(data.stats, this.subscription);

      // Render comprehensive sub-components
      this.renderSpotlightSession();
      this.renderWeeklyRhythm();
      this.renderMasteryTrackers();
      this.renderSchedule();
      this.renderRequestsList();
      this.renderHistory();
      this.renderConnectedTutors();
      this.loadProfileForm();
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
    }
  },

  updateTimeAwareGreeting() {
    const greetingElem = document.getElementById('student-greeting-prefix');
    const clockElem = document.getElementById('student-clock-display');

    const now = new Date();
    const hour = now.getHours();

    let greeting = 'Welcome back,';
    if (hour < 12) {
      greeting = 'Good morning,';
    } else if (hour < 18) {
      greeting = 'Good afternoon,';
    } else {
      greeting = 'Good evening,';
    }

    if (greetingElem) greetingElem.textContent = greeting;

    if (clockElem) {
      const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      try {
        clockElem.textContent = now.toLocaleDateString('en-US', options);
      } catch (e) {
        clockElem.textContent = now.toDateString();
      }
    }
  },

  updateStatsVisuals(stats, subscription) {
    // Hours progress bar (10 hours milestone)
    const hoursFill = document.getElementById('student-hours-progress-fill');
    if (hoursFill) {
      const hrs = stats.total_hours || 0;
      const pct = Math.min(100, Math.max(10, Math.round((hrs / 10) * 100)));
      hoursFill.style.width = `${pct}%`;
    }

    // Subscription progress fill
    const subFill = document.getElementById('student-sub-progress-fill');
    const subBadge = document.getElementById('student-sub-tier-badge');
    if (subscription) {
      if (subBadge) subBadge.textContent = 'Active Plan';
      if (subFill) {
        const total = subscription.total_lessons || 8;
        const rem = subscription.lessons_remaining !== undefined ? subscription.lessons_remaining : (subscription.hours_remaining || 0);
        const pct = Math.min(100, Math.max(15, Math.round((rem / total) * 100)));
        subFill.style.width = `${pct}%`;
      }
    } else {
      if (subBadge) subBadge.textContent = 'Standard';
      if (subFill) subFill.style.width = '0%';
    }

    // Micro note for upcoming
    const upcomingNote = document.getElementById('stat-note-upcoming');
    if (upcomingNote) {
      const confirmed = this.requests.filter(r => r.status === 'accepted');
      if (confirmed.length > 0) {
        const next = confirmed.sort((a, b) => (a.requested_date + ' ' + a.requested_time).localeCompare(b.requested_date + ' ' + b.requested_time))[0];
        upcomingNote.textContent = `Next: ${next.subject} (${next.requested_date})`;
      } else {
        upcomingNote.textContent = 'All booked classes on track';
      }
    }
  },

  renderSpotlightSession() {
    const container = document.getElementById('student-spotlight-container');
    if (!container) return;

    const upcomingSessions = this.requests
      .filter(r => r.status === 'accepted')
      .sort((a, b) => (a.requested_date + ' ' + a.requested_time).localeCompare(b.requested_date + ' ' + b.requested_time));

    if (upcomingSessions.length === 0) {
      const pendingReview = this.requests.find(r => (r.status === 'completed' || r.room_status === 'ended') && !r.review_rating);
      if (pendingReview) {
        container.innerHTML = `
          <div class="spotlight-mission-control" style="border: 1.5px solid var(--gold-500);">
            <div class="mission-control-header">
              <span class="mission-live-beacon" style="background: rgba(245, 158, 11, 0.15); color: #B45309; border-color: rgba(245, 158, 11, 0.3);">
                ★ RATE YOUR EDUCATOR
              </span>
              <span class="mission-type-pill" style="color: var(--gold-800);">
                Session Concluded Successfully
              </span>
            </div>
            <div class="spotlight-session-grid">
              <div class="mission-tutor-avatar-frame">
                <img src="${pendingReview.tutor_avatar || '/assets/favicon.png'}" class="mission-tutor-avatar" />
              </div>
              <div>
                <h3 style="font-size: 1.25rem; color: var(--charcoal-900); font-weight: 800; margin: 0 0 0.25rem 0;">${pendingReview.subject} Class Completed</h3>
                <p style="font-size: 0.9rem; color: var(--charcoal-700); margin: 0 0 0.35rem 0;">How was your class with <strong>${pendingReview.tutor_name}</strong>? Rate up to 5 stars to update their verified faculty profile.</p>
                <div style="font-size: 0.82rem; color: var(--text-muted);">${pendingReview.requested_date} • 50-minute virtual session</div>
              </div>
              <div class="mission-action-column">
                <button class="btn btn-primary btn-sm" onclick="Student.openReviewModal(${pendingReview.id}, '${escapeQuotes(pendingReview.tutor_name)}', '${escapeQuotes(pendingReview.subject)}')">${Icons.star(14)} Rate Tutor (★ 1-5)</button>
              </div>
            </div>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="spotlight-mission-control" style="border-style: dashed; background: #FFFFFF;">
          <div class="spotlight-session-grid">
            <div style="color: var(--gold-600); width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: rgba(198, 138, 40, 0.1); border-radius: 16px;">
              ${Icons.graduationCap(38)}
            </div>
            <div>
              <h4 style="font-size: 1.15rem; color: var(--charcoal-900); font-weight: 800; margin-bottom: 0.3rem;">No Upcoming Classes Scheduled Right Now</h4>
              <p style="color: var(--text-secondary); font-size: 0.88rem; margin: 0 0 0.65rem 0;">Ready for your next academic breakthrough? Explore faculty in Calculus, Physics, Coding, and Languages for tailored 50-minute instruction.</p>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <a href="#tutors" class="btn btn-primary btn-sm">Find a Tutor</a>
                <a href="#buddy" class="btn btn-outline-gold btn-sm">Explore Aviora Buddy ($6)</a>
              </div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const nextSession = upcomingSessions[0];
    const is30Min = nextSession.duration_hours === 0.5 || nextSession.payment_method === 'free_trial';

    // Calculate countdown
    const match = String(nextSession.requested_time).match(/(\d{1,2}):(\d{2})/);
    let countdownStr = 'Scheduled today at ' + nextSession.requested_time;
    if (match) {
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const sessionDate = new Date(`${nextSession.requested_date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
      const now = new Date();
      const diffMs = sessionDate.getTime() - now.getTime();
      if (diffMs > 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        if (diffHours === 0) {
          countdownStr = `Starts in ${diffMins}m`;
        } else {
          countdownStr = `Starts in ${diffHours}h ${diffMins}m`;
        }
      } else if (diffMs > - (50 * 60 * 1000)) {
        countdownStr = `Session Live Now`;
      }
    }

    container.innerHTML = `
      <div class="spotlight-mission-control">
        <div class="mission-control-header">
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <span class="mission-live-beacon">
              <span class="beacon-pulse"></span>
              <span>LIVE MISSION CONTROL</span>
            </span>
            <span class="mission-countdown-badge" title="Estimated countdown to session start">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>${nextSession.room_status === 'open' ? 'Room Open • Join Live' : countdownStr}</span>
            </span>
          </div>

          <span class="mission-type-pill">
            ${Icons.timer(15)} <span>${is30Min ? '30-Minute Trial Session' : '50-Minute Tailored Session'}</span>
          </span>
        </div>

        <div class="spotlight-session-grid">
          <a href="${nextSession.tutor_profile_id ? `#tutor-profile?id=${nextSession.tutor_profile_id}` : '#tutors'}" title="View Instructor Profile">
            <div class="mission-tutor-avatar-frame">
              <img src="${nextSession.tutor_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}" class="mission-tutor-avatar" />
            </div>
          </a>

          <div>
            <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.25rem; flex-wrap: wrap;">
              <h3 style="font-size: 1.35rem; color: var(--charcoal-900); font-weight: 800; margin: 0; letter-spacing: -0.01em;">${nextSession.subject}</h3>
              <span class="status-pill accepted" style="box-shadow: 0 2px 6px rgba(16, 185, 129, 0.2);">${Icons.check(13)} Confirmed</span>
            </div>

            <p style="font-size: 0.92rem; color: var(--charcoal-700); margin: 0 0 0.35rem 0;">
              Instructor: <strong>${nextSession.tutor_name}</strong>
              ${nextSession.tutor_headline ? ` • <span class="mission-pedigree-tag">${nextSession.tutor_headline}</span>` : ''}
            </p>

            <div style="font-size: 0.88rem; color: var(--gold-900); font-weight: 700; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span style="display: inline-flex; align-items: center; gap: 0.3rem;">${Icons.calendar(15)} ${nextSession.requested_date}</span>
              <span>&nbsp;•&nbsp;</span>
              <span style="display: inline-flex; align-items: center; gap: 0.3rem;">${Icons.clock(15)} ${nextSession.requested_time}${window.getTimezoneAbbr ? ' ' + window.getTimezoneAbbr() : ''} (${is30Min ? '30 mins' : '50 mins focused'})</span>
            </div>

            ${nextSession.notes ? `
              <div class="mission-topic-cardlet">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--gold-600); flex-shrink: 0; margin-top: 2px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                <div><strong>Topic Focus:</strong> ${escapeHtmlStr(nextSession.notes)}</div>
              </div>
            ` : ''}

            ${nextSession.tutor_response_note ? `
              <div class="mission-note-quote">
                <strong>Instructor Note:</strong> "${escapeHtmlStr(nextSession.tutor_response_note)}"
              </div>
            ` : ''}
          </div>

          <div class="mission-action-column">
            <button class="btn btn-primary btn-sm ${nextSession.room_status === 'open' ? 'btn-vroom-live' : ''}" onclick="VirtualRoom.joinRoom(${nextSession.id}, 'student')">
              ${Icons.video(14)} ${nextSession.room_status === 'open' ? 'Enter Virtual Room (Live Now)' : 'Virtual Room'}
            </button>
            <button class="btn btn-outline-gold btn-sm" onclick="Tutors.openMessageModal(${nextSession.tutor_id})">
              ${Icons.message(14)} Message Tutor
            </button>
            ${this.canCancelSession(nextSession) ? `
              <button class="btn btn-secondary btn-sm" style="font-size: 0.78rem;" onclick="Student.cancelRequest(${nextSession.id})" title="Cancel booking (Allowed up to 3 hours before class)">Cancel Booking</button>
            ` : `
              <button class="btn btn-secondary btn-sm" style="font-size: 0.78rem; opacity: 0.55; cursor: not-allowed;" onclick="showToast('Cancel booking is only applicable at least 3 hours before the class.', 'warning')" title="Cancel booking is only applicable at least 3 hours before class">Cancel Booking (&lt;3h)</button>
            `}
          </div>
        </div>
      </div>
    `;
  },

  renderWeeklyRhythm() {
    const container = document.getElementById('student-weekly-rhythm-container');
    if (!container) return;

    const now = new Date();
    const currentDay = now.getDay();
    const mondayOffset = (currentDay === 0 ? -6 : 1) - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);

    const weekDays = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dateNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dateNum}`;
      const isToday = (d.toDateString() === now.toDateString());

      const sessionsOnDay = this.requests.filter(r => r.requested_date === dateStr && (r.status === 'accepted' || r.status === 'pending' || r.status === 'completed'));

      weekDays.push({
        dateStr,
        dayName: dayNames[i],
        dayNum: d.getDate(),
        isToday,
        sessions: sessionsOnDay
      });
    }

    container.innerHTML = `
      <div class="weekly-rhythm-strip">
        <div class="weekly-rhythm-header">
          <h4>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            7-Day Learning Rhythm &amp; Agenda
          </h4>
          <div class="weekly-rhythm-legend">
            <span style="display: inline-flex; align-items: center; gap: 0.35rem;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span> Confirmed</span>
            <span style="display: inline-flex; align-items: center; gap: 0.35rem;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #F59E0B;"></span> Pending</span>
            <span style="display: inline-flex; align-items: center; gap: 0.35rem;"><span style="width: 8px; height: 8px; border-radius: 50%; background: var(--gold-500);"></span> Today</span>
          </div>
        </div>
        <div class="weekly-rhythm-grid">
          ${weekDays.map(day => `
            <div class="rhythm-day-card ${day.isToday ? 'today' : ''} ${day.sessions.length > 0 ? 'has-session' : ''}">
              <div class="rhythm-day-name">${day.dayName}</div>
              <div class="rhythm-day-num">${day.dayNum}</div>
              ${day.isToday ? '<span class="rhythm-today-tag">TODAY</span>' : ''}
              ${day.sessions.length > 0 ? `
                <div style="display: flex; flex-direction: column; gap: 0.2rem; width: 100%; margin-top: 0.3rem;">
                  ${day.sessions.map(s => `
                    <span class="rhythm-session-chip ${s.status}" title="${escapeQuotes(s.subject)} @ ${s.requested_time}">
                      ${s.subject.split(' ')[0]} ${s.requested_time}
                    </span>
                  `).join('')}
                </div>
              ` : `
                <span style="font-size: 0.68rem; color: var(--text-muted); opacity: 0.65;">Free</span>
              `}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  renderMasteryTrackers() {
    const container = document.getElementById('student-mastery-container');
    if (!container) return;

    container.innerHTML = `
      <div class="academic-mastery-box">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--charcoal-900); margin: 0 0 0.2rem 0; display: flex; align-items: center; gap: 0.5rem;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
              Academic Milestone &amp; Subject Mastery
            </h4>
            <p style="font-size: 0.84rem; color: var(--text-secondary); margin: 0;">Verified curriculum pacing tracking your conceptual mastery, problem-solving depth, and AP prep velocity.</p>
          </div>
          <span style="font-size: 0.78rem; font-weight: 700; color: var(--gold-800); background: rgba(198, 138, 40, 0.12); padding: 0.25rem 0.65rem; border-radius: 999px;">
            Target: AP 5.0 / Honor Roll
          </span>
        </div>

        <div class="mastery-cards-grid">
          <!-- Subject 1: Calculus BC -->
          <div class="mastery-card">
            <div class="mastery-card-header">
              <h5>Calculus BC</h5>
              <span class="mastery-tag gold">85% Mastery</span>
            </div>
            <div class="mastery-progress-track">
              <div class="mastery-progress-fill gold" style="width: 85%;"></div>
            </div>
            <div class="mastery-meta-row">
              <span>Unit 6: Integration by Parts</span>
              <strong style="color: var(--gold-800);">Active Focus</strong>
            </div>
          </div>

          <!-- Subject 2: AP Physics C Mechanics -->
          <div class="mastery-card">
            <div class="mastery-card-header">
              <h5>AP Physics C (Mechanics)</h5>
              <span class="mastery-tag emerald">74% Target</span>
            </div>
            <div class="mastery-progress-track">
              <div class="mastery-progress-fill emerald" style="width: 74%;"></div>
            </div>
            <div class="mastery-meta-row">
              <span>Rotational Dynamics &amp; Energy</span>
              <strong style="color: #059669;">2 Lessons Complete</strong>
            </div>
          </div>

          <!-- Subject 3: SAT & College Readiness -->
          <div class="mastery-card">
            <div class="mastery-card-header">
              <h5>SAT &amp; College Prep</h5>
              <span class="mastery-tag indigo">92% Ready</span>
            </div>
            <div class="mastery-progress-track">
              <div class="mastery-progress-fill indigo" style="width: 92%;"></div>
            </div>
            <div class="mastery-meta-row">
              <span>Math &amp; Verbal Modules</span>
              <strong style="color: #4F46E5;">Diagnostic Cleared</strong>
            </div>
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
          <div style="margin-bottom: 0.5rem; color: var(--gold-600);">${Icons.calendar(36)}</div>
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
            <div class="day-num">${dayStr || Icons.calendar(16)}</div>
            <div class="day-name">${monthStr}</div>
          </div>

          <div>
            <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.25rem;">
              <h4 style="font-size: 1.05rem; color: var(--charcoal-900); font-weight: 700; margin: 0;">${r.subject}</h4>
              <span class="status-pill ${r.status}">${r.status === 'accepted' ? Icons.check(13) + ' Confirmed' : Icons.hourglass(13) + ' Pending'}</span>
            </div>
            <p style="font-size: 0.85rem; color: var(--charcoal-700); margin: 0 0 0.2rem 0;">
              Instructor: <strong>${r.tutor_name}</strong>
            </p>
            ${r.notes ? `<p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">Topic: ${escapeHtmlStr(r.notes)}</p>` : ''}
          </div>

          <div style="font-size: 0.88rem; color: var(--charcoal-900);">
            <div style="font-weight: 700; display: flex; align-items: center; gap: 0.3rem;">${Icons.clock(14)} ${r.requested_time}${window.getTimezoneAbbr ? ' ' + window.getTimezoneAbbr() : ''}</div>
            <div style="font-size: 0.78rem; color: var(--gold-800); font-weight: 600;">${(r.duration_hours === 0.5 || r.payment_method === 'free_trial') ? '30-Minute Trial Class' : '50-Minute Class'}</div>
          </div>

          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            ${r.status === 'accepted' ? `
              <button class="btn btn-primary btn-sm" onclick="VirtualRoom.joinRoom(${r.id}, 'student')" style="${r.room_status === 'open' ? 'background: #10B981; border-color: #10B981;' : ''}">${Icons.video(14)} ${r.room_status === 'open' ? 'Enter Virtual Room (Live)' : 'Virtual Room'}</button>
            ` : ''}
            <button class="btn btn-outline-gold btn-sm" onclick="Tutors.openMessageModal(${r.tutor_id})">${Icons.message(14)} Message</button>
            ${r.status === 'pending' || r.status === 'accepted' ? `
              ${this.canCancelSession(r) ? `
                <button class="btn btn-secondary btn-sm" onclick="Student.cancelRequest(${r.id})" title="Cancel booking (Allowed up to 3 hours before class)">Cancel</button>
              ` : `
                <button class="btn btn-secondary btn-sm" style="opacity: 0.55; cursor: not-allowed;" onclick="showToast('Cancel booking is only applicable at least 3 hours before the class.', 'warning')" title="Cancel booking is only applicable at least 3 hours before class">Cancel (&lt;3h)</button>
              `}
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
          <div class="empty-icon" style="color: var(--gold-600);">${Icons.book(36)}</div>
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
          <strong style="display: flex; align-items: center; gap: 0.3rem;">${Icons.calendar(14)} ${r.requested_date}</strong>
          <span style="display: flex; align-items: center; gap: 0.3rem;">${Icons.clock(14)} ${r.requested_time}${window.getTimezoneAbbr ? ' ' + window.getTimezoneAbbr() : ''} (50 mins)</span>
        </div>

        <div class="request-pricing-info">
          $${r.total_amount ? r.total_amount.toFixed(2) : '0.00'}
          <span>Rate: $${r.hourly_rate}/hr</span>
        </div>

        <div class="request-actions-col">
          <span class="status-pill ${r.status}">${r.status}</span>
          ${(r.status === 'accepted' && r.room_status !== 'ended') ? `
            <button class="btn btn-primary btn-sm" onclick="VirtualRoom.joinRoom(${r.id}, 'student')" style="${r.room_status === 'open' ? 'background: #10B981; border-color: #10B981;' : ''}">${Icons.video(14)} ${r.room_status === 'open' ? 'Enter Virtual Room (Live)' : 'Virtual Room'}</button>
          ` : ''}
          ${(r.status === 'pending' || (r.status === 'accepted' && r.room_status !== 'ended')) ? `
            <button class="btn btn-outline-gold btn-sm" onclick="Tutors.openMessageModal(${r.tutor_id})">${Icons.message(14)} Message</button>
            ${this.canCancelSession(r) ? `
              <button class="btn btn-secondary btn-sm" onclick="Student.cancelRequest(${r.id})" title="Cancel booking (Allowed up to 3 hours before class)">Cancel</button>
            ` : `
              <button class="btn btn-secondary btn-sm" style="opacity: 0.55; cursor: not-allowed;" onclick="showToast('Cancel booking is only applicable at least 3 hours before the class.', 'warning')" title="Cancel booking is only applicable at least 3 hours before class">Cancel (&lt;3h)</button>
            `}
          ` : ''}
          ${(r.status === 'completed' || r.room_status === 'ended') ? `
            ${r.review_rating ? `
              <span style="font-size: 0.82rem; color: #F59E0B; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">${Icons.star(13)} ${r.review_rating}/5</span>
            ` : `
              <button class="btn btn-outline-gold btn-sm" onclick="Student.openReviewModal(${r.id}, '${escapeQuotes(r.tutor_name)}', '${escapeQuotes(r.subject)}')">${Icons.star(12)} Rate Tutor (★ 1-5)</button>
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
      .filter(r => r.status === 'completed' || r.room_status === 'ended')
      .sort((a, b) => (b.requested_date + ' ' + b.requested_time).localeCompare(a.requested_date + ' ' + a.requested_time));

    if (completedSessions.length === 0) {
      container.innerHTML = `
        <div style="padding: 2.5rem; text-align: center; background: var(--bg-surface-alt); border-radius: var(--radius-lg); border: 1px dashed var(--border-light);">
          <div style="margin-bottom: 0.5rem; color: var(--gold-600);">${Icons.fileText(36)}</div>
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
            <span class="status-pill completed">${Icons.check(13)} Completed</span>
          </div>
          <p style="font-size: 0.85rem; color: var(--charcoal-700); margin: 0 0 0.25rem 0;">
            Instructor: <strong>${r.tutor_name}</strong>
          </p>
          ${r.notes ? `<p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0 0 0.2rem 0;">Topic: ${escapeHtmlStr(r.notes)}</p>` : ''}
          ${r.tutor_response_note ? `<p style="font-size: 0.8rem; color: var(--gold-700); margin: 0; font-style: italic;">Instructor Feedback: "${escapeHtmlStr(r.tutor_response_note)}"</p>` : ''}
        </div>

        <div style="font-size: 0.88rem; color: var(--charcoal-900);">
          <div style="font-weight: 700; display: flex; align-items: center; gap: 0.3rem;">${Icons.calendar(14)} ${r.requested_date}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">50 min class completed</div>
        </div>

        <div>
          ${r.review_rating ? `
            <div style="text-align: right;">
              <div style="color: #F59E0B; display: inline-flex; align-items: center; gap: 2px;">
                ${Array.from({length: Math.min(5, Math.max(1, r.review_rating))}).map(() => Icons.star(14)).join('')}
              </div>
              <span style="font-size: 0.78rem; color: var(--text-muted); display: block;">Your Rating (${r.review_rating}/5)</span>
              ${r.review_comment ? `<p style="font-size: 0.78rem; color: var(--charcoal-700); margin-top: 0.2rem; font-style: italic;">"${escapeHtmlStr(r.review_comment)}"</p>` : ''}
            </div>
          ` : `
            <button class="btn btn-outline-gold btn-sm" onclick="Student.openReviewModal(${r.id}, '${escapeQuotes(r.tutor_name)}', '${escapeQuotes(r.subject)}')">${Icons.star(12)} Rate Tutor (★ 1-5)</button>
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
          <div style="margin-bottom: 0.6rem; color: var(--gold-600);">${Icons.users(36)}</div>
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
          <div>
            <button class="btn btn-outline-gold btn-sm" style="width: 100%; justify-content: center;" onclick="Tutors.openMessageModal(${t.id})">${Icons.message(14)} Message Tutor</button>
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

  getHoursUntilSession(requestedDate, requestedTime) {
    if (!requestedDate || !requestedTime) return Infinity;
    const match = String(requestedTime).match(/(\d{1,2}):(\d{2})/);
    if (!match) return Infinity;
    const hours = match[1].padStart(2, '0');
    const minutes = match[2];
    const sessionDateTime = new Date(`${requestedDate}T${hours}:${minutes}:00`);
    if (isNaN(sessionDateTime.getTime())) return Infinity;
    return (sessionDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
  },

  canCancelSession(session) {
    if (!session || session.status === 'completed' || session.status === 'cancelled') return false;
    return this.getHoursUntilSession(session.requested_date, session.requested_time) >= 3;
  },

  async cancelRequest(requestId) {
    const session = this.requests.find(r => r.id == requestId);
    if (session && !this.canCancelSession(session)) {
      showToast('Cancel booking is only applicable at least 3 hours before the class.', 'warning');
      return;
    }

    showConfirm(
      'Cancel Tutoring Booking',
      'Are you sure you want to cancel this booking? Notice: Cancel booking is only applicable at least 3 hours before the class.',
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

    if (title) title.textContent = `Rate & Review ${tutorName} (${subject})`;
    if (commentInput) commentInput.value = '';

    // Reset stars to 5
    const valInput = document.getElementById('review-rating-val');
    if (valInput) valInput.value = 5;
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

    const valEl = document.getElementById('review-rating-val');
    const rating = valEl ? (parseInt(valEl.value) || 5) : 5;
    const commentEl = document.getElementById('review-comment');
    const comment = commentEl ? commentEl.value.trim() : '';
    const submitBtn = e.target.querySelector('button[type="submit"]');

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Publishing Rating to Profile...';
      }

      const res = await API.submitReview(this.currentReviewRequestId, { rating, comment });
      this.closeReviewModal();
      showToast(res.message || 'Review submitted! Reflected on tutor\'s profile.', 'success');
      await this.loadDashboard();

      // Refresh tutor profile if viewed or in directory
      if (typeof Tutors !== 'undefined') {
        const tid = res.tutor_profile_id || res.tutor_id;
        if (tid && window.location.hash.includes('tutor-profile')) {
          await Tutors.loadFullProfilePage(tid);
        } else if (Tutors.fetchTutors) {
          Tutors.fetchTutors();
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit review.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Review';
      }
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
