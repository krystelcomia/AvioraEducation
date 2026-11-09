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
  scheduleData: { appointments: [], occupiedSlots: [], availabilitySchedule: {}, unavailableDates: [] },
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  selectedDate: null,
  editingDateNote: null,
  hasBoundCalendarNav: false,

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

  getStoredCancelledRequests(userId) {
    if (!userId) return new Set();
    try {
      const raw = localStorage.getItem(`aviora_cancelled_requests_${userId}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) {
      return new Set();
    }
  },

  saveCancelledRequest(requestId) {
    const user = (typeof Auth !== 'undefined' && Auth.currentUser) || null;
    if (!user || !requestId) return;
    try {
      const set = this.getStoredCancelledRequests(user.id);
      set.add(Number(requestId));
      localStorage.setItem(`aviora_cancelled_requests_${user.id}`, JSON.stringify(Array.from(set)));
    } catch (e) { }
  },

  handleNotificationNavigation(params) {
    if (!params) return;
    const action = params.get ? params.get('action') : params.action;
    const sessionId = params.get ? params.get('session') : params.sessionId;

    if (action === 'wallet') {
      const dropdown = document.getElementById('nav-wallet-dropdown');
      if (dropdown) dropdown.style.display = 'block';
      this.scrollToSection('lessons');
      setTimeout(() => {
        const cancelledCard = document.querySelector('.request-item-card .status-pill.cancelled')?.closest('.request-item-card');
        if (cancelledCard) {
          cancelledCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          cancelledCard.classList.add('highlight-pulse');
          setTimeout(() => cancelledCard.classList.remove('highlight-pulse'), 3000);
        }
      }, 250);
    } else if (sessionId) {
      this.highlightSession(sessionId);
    } else if (action === 'tasks') {
      const taskSec = document.getElementById('student-tasks-section');
      if (taskSec) {
        taskSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        taskSec.classList.add('highlight-pulse');
        setTimeout(() => taskSec.classList.remove('highlight-pulse'), 3000);
      }
    }
  },

  highlightSession(sessionId) {
    if (!sessionId) return;
    setTimeout(() => {
      let target = document.getElementById('schedule-item-' + sessionId) ||
        document.getElementById('request-item-' + sessionId) ||
        document.querySelector(`.request-item-card[data-id="${sessionId}"]`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('highlight-pulse');
        setTimeout(() => target.classList.remove('highlight-pulse'), 3000);
      }
    }, 250);
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
      const cancelledSet = user ? this.getStoredCancelledRequests(user.id) : new Set();
      this.requests.forEach(r => {
        if (cancelledSet.has(Number(r.id))) {
          r.status = 'cancelled';
          r.room_status = 'ended';
        }
      });
      this.subscription = data.subscription || null;
      if (typeof data.wallet_balance !== 'undefined' && typeof Auth !== 'undefined' && Auth.updateWalletBalance) {
        Auth.updateWalletBalance(data.wallet_balance, data.wallet_tutor || null);
      }

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
      this.setupRealTimeRoomPolling();
      if (typeof Auth !== 'undefined' && Auth.loadNotifications) {
        Auth.loadNotifications();
      }

      // Check if hash has session or action query params to focus immediately
      const rawHash = window.location.hash || '';
      if (rawHash.includes('?')) {
        const query = rawHash.split('?')[1];
        const params = new URLSearchParams(query);
        this.handleNotificationNavigation(params);
      }
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
          <div class="spotlight-mission-control">
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
        <div class="spotlight-mission-control" style="border-style: dashed;">
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
    this.checkClassStartingSoonReminder(nextSession);

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
      <div class="spotlight-mission-control ${nextSession.room_status === 'open' ? 'room-is-live' : ''}">
        <div class="mission-control-header">
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            ${nextSession.room_status === 'open' ? `
              <span class="live-pulse-badge" style="background: rgba(16, 185, 129, 0.15); border-color: #10B981; color: #059669;">
                <span class="live-pulse-dot-red" style="background: #10B981;"></span>
                <span>CLASS IS LIVE NOW • TUTOR WAITING</span>
              </span>
            ` : `
              <span class="mission-countdown-badge" title="Estimated countdown to session start">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span>${countdownStr}</span>
              </span>
            `}
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
              <div class="mission-topic-cardlet" style="color: #14171E;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--gold-600); flex-shrink: 0; margin-top: 2px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                <div style="color: #14171E;"><strong style="color: #14171E;">Topic Focus:</strong> ${escapeHtmlStr(nextSession.notes)}</div>
              </div>
            ` : ''}

            ${nextSession.tutor_response_note ? `
              <div class="mission-note-quote">
                <strong>Instructor Update:</strong> "${escapeHtmlStr(nextSession.tutor_response_note)}"
              </div>
            ` : ''}

            ${nextSession.room_status !== 'open' ? `
              <div class="mission-room-status-pill closed mission-room-closed-badge" style="margin-top: 0.45rem; padding: 0.45rem 0.7rem; background: #F9FAFB; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 8px; font-size: 0.8rem; color: #1F2937; font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem;">
                ${Icons.clock(13)} Classroom is closed until your educator opens the virtual room (${nextSession.requested_date} at ${nextSession.requested_time}).
              </div>
            ` : `
              <div style="margin-top: 0.45rem; padding: 0.45rem 0.7rem; background: rgba(16, 185, 129, 0.09); border: 1px solid rgba(16, 185, 129, 0.28); border-radius: 8px; font-size: 0.8rem; color: #059669; font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem;">
                ${Icons.checkCircle(13)} Virtual classroom is live! Click "Join Class" to enter now.
              </div>
            `}
          </div>

          <div class="mission-action-column">
            ${nextSession.room_status === 'open' ? `
              <button class="btn btn-primary btn-sm btn-vroom-live" onclick="VirtualRoom.joinRoom(${nextSession.id}, 'student')">
                ${Icons.video(14)} Join Class
              </button>
            ` : `
              <button class="btn btn-secondary btn-sm" style="opacity: 0.7; cursor: not-allowed; display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem;" onclick="showToast('Class is currently closed. Your tutor will open the virtual classroom from their account when the session begins.', 'info')">
                ${Icons.lock(14)} Closed
              </button>
            `}
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

  setupScheduleCalendarListeners() {
    if (this.hasBoundCalendarNav) return;
    this.hasBoundCalendarNav = true;

    const prevBtn = document.getElementById('student-cal-prev-btn');
    const nextBtn = document.getElementById('student-cal-next-btn');
    const todayBtn = document.getElementById('student-cal-today-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.calMonth--;
        if (this.calMonth < 0) {
          this.calMonth = 11;
          this.calYear--;
        }
        this.renderCalendar();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.calMonth++;
        if (this.calMonth > 11) {
          this.calMonth = 0;
          this.calYear++;
        }
        this.renderCalendar();
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        const now = new Date();
        this.calYear = now.getFullYear();
        this.calMonth = now.getMonth();
        const dateStr = `${this.calYear}-${String(this.calMonth + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        this.selectedDate = dateStr;
        this.renderCalendar();
        this.renderDateSchedulePanel();
      });
    }
  },

  async renderSchedule() {
    this.setupScheduleCalendarListeners();

    // Fetch latest student calendar availability schedule
    try {
      if (typeof API !== 'undefined' && API.getStudentScheduleCalendar) {
        const res = await API.getStudentScheduleCalendar();
        if (res) {
          this.scheduleData = res;
        }
      }
    } catch (e) {
      console.warn('Could not fetch student calendar schedule:', e);
    }

    this.renderCalendar();
    this.renderDateSchedulePanel();
    this.renderScheduleList();
  },

  renderCalendar() {
    const grid = document.getElementById('student-calendar-grid');
    const monthTitle = document.getElementById('student-cal-month-title');
    if (!grid) return;

    const monthDate = new Date(this.calYear, this.calMonth, 1);
    if (monthTitle) {
      monthTitle.textContent = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    grid.innerHTML = '';
    const firstDayIndex = monthDate.getDay();
    const daysInMonth = new Date(this.calYear, this.calMonth + 1, 0).getDate();

    const appointments = (this.scheduleData?.appointments && this.scheduleData.appointments.length > 0)
      ? this.scheduleData.appointments
      : (this.requests || []).filter(r => r.status === 'accepted' || r.status === 'pending');
    const occupiedSlots = this.scheduleData?.occupiedSlots || [];
    const availSched = this.scheduleData?.availabilitySchedule || {};
    const unavailDates = this.scheduleData?.unavailableDates || [];

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Blank cells before month starts
    const prevMonthDays = new Date(this.calYear, this.calMonth, 0).getDate();
    for (let i = 0; i < firstDayIndex; i++) {
      const pDay = prevMonthDays - firstDayIndex + i + 1;
      const blank = document.createElement('div');
      blank.className = 'student-cal-day-cell is-other-month';
      blank.innerHTML = `<span class="student-cal-day-num" style="opacity: 0.4;">${pDay}</span>`;
      grid.appendChild(blank);
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${this.calYear}-${String(this.calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const cellDate = new Date(this.calYear, this.calMonth, day);
      const dayName = dayNames[cellDate.getDay()];

      const isToday = (dateStr === todayStr);
      const isSelected = (this.selectedDate === dateStr);

      // Check if student marked date as unavailable
      const isDateOccupied = unavailDates.includes(dateStr) || (availSched.date_modes && availSched.date_modes[dateStr] === 'unavailable');
      const dayApts = appointments.filter(a => a.date === dateStr || a.requested_date === dateStr);
      const dayNotes = (availSched.date_notes && availSched.date_notes[dateStr]) || null;

      const cell = document.createElement('div');
      cell.className = 'student-cal-day-cell';
      if (isToday) cell.classList.add('is-today');
      if (isSelected) cell.classList.add('selected');
      if (isDateOccupied) cell.classList.add('is-occupied');

      let badgesHtml = '';
      if (dayApts.length > 0) {
        dayApts.forEach(apt => {
          let tutorName = apt.tutor_name;
          if (!tutorName && this.requests) {
            const req = this.requests.find(r => r.id === apt.id);
            if (req) tutorName = req.tutor_name;
          }
          if (!tutorName) tutorName = 'Assigned Tutor';

          let subject = apt.subject;
          if (!subject && this.requests) {
            const req = this.requests.find(r => r.id === apt.id);
            if (req) subject = req.subject;
          }
          if (!subject) subject = 'Lesson';

          let timeStr = apt.time || apt.requested_time;
          if (!timeStr && this.requests) {
            const req = this.requests.find(r => r.id === apt.id);
            if (req) timeStr = req.requested_time;
          }
          timeStr = timeStr ? String(timeStr).trim() : '';

          const isPending = (apt.status === 'pending');
          badgesHtml += `
            <div class="student-cal-class-chip ${isPending ? 'pending' : 'accepted'}" title="${escapeHtmlStr(subject)} with ${escapeHtmlStr(tutorName)}${timeStr ? ' at ' + escapeHtmlStr(timeStr) : ''}">
              <div class="cal-class-lesson" title="${escapeHtmlStr(subject)}">${Icons.book(11)} <span>${escapeHtmlStr(subject)}</span></div>
              <div class="cal-class-tutor" title="${escapeHtmlStr(tutorName)}">${Icons.user(11)} <span>${escapeHtmlStr(tutorName)}</span></div>
              ${timeStr ? `<div class="cal-class-time" title="${escapeHtmlStr(timeStr)}">${Icons.clock(11)} <span>${escapeHtmlStr(timeStr)}</span></div>` : ''}
            </div>
          `;
        });
      }
      if (isDateOccupied) {
        badgesHtml += `<span class="student-cal-badge badge-occupied">${Icons.ban(8)} Unavailable</span>`;
      }
      if (dayNotes) {
        badgesHtml += `
          <div class="student-cal-note-chip" title="Note: ${escapeHtmlStr(dayNotes)}">
            <span class="cal-note-icon">📝</span>
            <span class="cal-note-text">${escapeHtmlStr(dayNotes)}</span>
          </div>
        `;
      }

      cell.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span class="student-cal-day-num">${day}</span>
          ${isToday ? '<span style="font-size: 0.65rem; color: var(--gold-700); font-weight: 800;">Today</span>' : ''}
        </div>
        <div class="student-cal-badges-wrap">${badgesHtml}</div>
      `;

      cell.addEventListener('click', () => {
        this.selectCalendarDate(dateStr);
      });

      grid.appendChild(cell);
    }
  },

  selectCalendarDate(dateStr) {
    if (this.selectedDate !== dateStr) {
      this.editingDateNote = null;
    }
    this.selectedDate = dateStr;
    this.renderCalendar();
    this.renderDateSchedulePanel();

    const panel = document.getElementById('student-date-schedule-panel');
    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  renderDateSchedulePanel() {
    const panel = document.getElementById('student-date-schedule-panel');
    if (!panel) return;

    if (!this.selectedDate) {
      panel.innerHTML = `
        <div style="padding: 2.25rem 1.5rem; text-align: center; background: rgba(198, 138, 40, 0.03); border: 1px dashed rgba(198, 138, 40, 0.35); border-radius: var(--radius-lg);">
          <div style="margin-bottom: 0.5rem; color: var(--gold-600);">${Icons.calendar(32)}</div>
          <h4 style="margin: 0 0 0.35rem 0; font-size: 1.05rem; font-weight: 800; color: var(--charcoal-900);">No Date Selected</h4>
          <p style="margin: 0 auto; color: var(--text-secondary); font-size: 0.85rem; max-width: 480px;">
            Click any date on the calendar above to view your booked classes, set your unavailable hours, or add personal schedule reminders to prevent conflicts.
          </p>
        </div>
      `;
      return;
    }

    const dateStr = this.selectedDate;
    const parts = dateStr.split('-');
    const dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeekName = dayNames[dObj.getDay()];
    const formattedDate = dObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    const appointments = this.scheduleData?.appointments || [];
    const occupiedSlots = this.scheduleData?.occupiedSlots || [];
    const availSched = this.scheduleData?.availabilitySchedule || {};
    const unavailDates = this.scheduleData?.unavailableDates || [];

    const isDateOccupied = unavailDates.includes(dateStr) || (availSched.date_modes && availSched.date_modes[dateStr] === 'unavailable');
    const dayApts = appointments.filter(a => a.date === dateStr || a.requested_date === dateStr);
    const dayNote = (availSched.date_notes && availSched.date_notes[dateStr]) || '';

    // Standard hourly blocks 08:00 AM - 08:00 PM
    const hours = [];
    for (let h = 8; h <= 20; h++) {
      const hStr = String(h).padStart(2, '0') + ':00';
      const endHStr = String(h + 1).padStart(2, '0') + ':00';
      const slotKey = `${hStr} - ${endHStr}`;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const label = `${String(h12).padStart(2, '0')}:00 ${ampm}`;
      hours.push({ hour: h, key: slotKey, label, start: hStr });
    }

    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-light, rgba(0,0,0,0.08));">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem;">
            <span class="badge-gold" style="font-size: 0.72rem;">Student Calendar Manager</span>
            ${isDateOccupied ? '<span class="status-pill declined" style="font-size: 0.72rem;">Marked Unavailable</span>' : '<span class="status-pill accepted" style="font-size: 0.72rem;">Available</span>'}
          </div>
          <h3 style="font-family: var(--font-heading); font-size: 1.3rem; font-weight: 800; color: var(--charcoal-900); margin: 0;">
            ${Icons.calendar(18)} ${formattedDate}
          </h3>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          ${isDateOccupied ? `
            <button type="button" class="btn btn-outline-gold btn-sm" onclick="Student.setDayAvailability('normal')">
              ${Icons.check(14)} Mark Date as Available
            </button>
          ` : `
            <button type="button" class="btn btn-secondary btn-sm" onclick="Student.setDayAvailability('date_occupied')" style="color: #DC2626; border-color: rgba(239, 68, 68, 0.4);">
              ${Icons.ban(14)} Mark Date as Unavailable / Occupied
            </button>
          `}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1.1fr 1fr; gap: 1.5rem;">
        <!-- Left: Hourly Slots Availability -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.6rem;">
            <strong style="font-size: 0.9rem; color: var(--charcoal-900);">Hourly Time Slots for this Date:</strong>
            <span style="font-size: 0.72rem; color: var(--text-secondary);">Click slot to toggle Unavailable / Available</span>
          </div>

          <div style="max-height: 280px; overflow-y: auto; padding-right: 0.35rem;">
            ${hours.map(slot => {
      const bookedClass = dayApts.find(a => {
        const t = a.time || a.requested_time || '';
        return t.includes(slot.start) || t.startsWith(String(slot.hour).padStart(2, '0'));
      });

      const isSlotOccupied = occupiedSlots.some(o => {
        if (o.time_slot === 'ALL_DAY' && (o.date === dateStr || (!o.date && o.day_of_week === dayOfWeekName))) return true;
        const matchesDate = o.date === dateStr || (!o.date && o.day_of_week === dayOfWeekName);
        if (!matchesDate) return false;
        const occH = parseInt(o.time_slot.split(':')[0], 10);
        return occH === slot.hour;
      });

      if (bookedClass) {
        return `
                  <button type="button" class="student-slot-btn is-booked" disabled title="Scheduled Class: ${bookedClass.subject} with ${bookedClass.tutor_name}">
                    <span>${slot.label} (50 min)</span>
                    <span style="font-size: 0.72rem; font-weight: 700;">${Icons.calendar(11)} ${bookedClass.subject} (${bookedClass.tutor_name || 'Tutor'})</span>
                  </button>
                `;
      } else if (isSlotOccupied || isDateOccupied) {
        return `
                  <button type="button" class="student-slot-btn is-occupied" onclick="Student.toggleSlot('${dateStr}', '${slot.key}')" title="Click to mark this slot as Available">
                    <span>${slot.label}</span>
                    <span style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.72rem; font-weight: 700;">${Icons.ban(11)} Unavailable / Occupied</span>
                  </button>
                `;
      } else {
        return `
                  <button type="button" class="student-slot-btn" onclick="Student.toggleSlot('${dateStr}', '${slot.key}')" title="Click to mark this slot as Unavailable / Occupied">
                    <span>${slot.label}</span>
                    <span style="font-size: 0.72rem; color: #047857; font-weight: 700;">${Icons.check(11)} Available</span>
                  </button>
                `;
      }
    }).join('')}
          </div>
        </div>

        <!-- Right: Schedule Note & Booked Sessions for this Date -->
        <div>
          <!-- Personal Schedule Note Manager with Dedicated Save, Edit, and Delete -->
          ${(() => {
        const isEditing = this.editingDateNote === dateStr;
        if (isEditing) {
          return `
                <div class="student-note-box is-editing" style="background: rgba(198, 138, 40, 0.05); border: 1.5px solid var(--gold-500, #C68A28); border-radius: var(--radius-md); padding: 1.1rem; margin-bottom: 1.25rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.45rem;">
                    <label style="font-size: 0.86rem; font-weight: 700; color: var(--charcoal-900); display: flex; align-items: center; gap: 0.4rem; margin: 0;">
                      <span>✏️</span> <span>Edit Personal Date Note</span>
                    </label>
                    <span style="font-size: 0.72rem; color: var(--gold-700); font-weight: 700;">Editing Mode</span>
                  </div>
                  <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 0.55rem 0;">
                    Modify your private reminder. Changes will be saved directly to your account database.
                  </p>
                  <div style="margin-bottom: 0.65rem;">
                    <input type="text" id="student-date-note-input" class="form-control" style="font-size: 0.86rem; padding: 0.5rem 0.7rem; border-color: var(--gold-500); width: 100%; box-sizing: border-box;" placeholder="e.g., High school midterm exam, family dinner..." value="${escapeHtmlStr(dayNote)}" onkeydown="if(event.key==='Enter'){event.preventDefault();Student.saveDateNote('${dateStr}');}else if(event.key==='Escape'){event.preventDefault();Student.cancelEditDateNote();}" />
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                    <div style="display: flex; gap: 0.45rem;">
                      <button type="button" class="btn btn-outline-gold btn-sm" id="student-date-note-save-btn" onclick="Student.saveDateNote('${dateStr}')" style="font-weight: 700; padding: 0.38rem 0.8rem; display: inline-flex; align-items: center; gap: 0.35rem; white-space: nowrap;">
                        <span>💾</span> <span>Save Changes</span>
                      </button>
                      <button type="button" class="btn btn-secondary btn-sm" onclick="Student.cancelEditDateNote()" style="font-weight: 600; padding: 0.38rem 0.8rem; white-space: nowrap;">
                        Cancel
                      </button>
                    </div>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="Student.deleteDateNote('${dateStr}')" title="Delete this note" style="font-weight: 700; font-size: 0.78rem; padding: 0.38rem 0.8rem; color: #DC2626; border-color: rgba(220, 38, 38, 0.4); display: inline-flex; align-items: center; gap: 0.3rem;">
                      <span>🗑️</span> <span>Delete Note</span>
                    </button>
                  </div>
                </div>
              `;
        } else if (dayNote) {
          return `
                <div class="student-note-box is-saved" style="background: rgba(198, 138, 40, 0.04); border: 1.5px solid rgba(198, 138, 40, 0.32); border-radius: var(--radius-md); padding: 1.1rem; margin-bottom: 1.25rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.45rem;">
                      <span style="font-size: 1rem;">📝</span>
                      <strong style="font-size: 0.88rem; color: var(--charcoal-900);">Personal Date Note</strong>
                      <span class="badge-gold" style="font-size: 0.68rem; padding: 0.15rem 0.5rem; background: rgba(16, 185, 129, 0.12); color: #047857; border: 1px solid rgba(16, 185, 129, 0.3); font-weight: 700;">✓ Saved in Account</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.45rem;">
                      <button type="button" class="btn btn-outline-gold btn-sm" onclick="Student.startEditDateNote('${dateStr}')" title="Edit this saved note" style="font-weight: 700; padding: 0.32rem 0.72rem; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 0.3rem;">
                        <span>✏️</span> <span>Edit</span>
                      </button>
                      <button type="button" class="btn btn-secondary btn-sm" onclick="Student.deleteDateNote('${dateStr}')" title="Delete note from database" style="font-weight: 700; font-size: 0.78rem; padding: 0.32rem 0.72rem; color: #DC2626; border-color: rgba(220, 38, 38, 0.4); display: inline-flex; align-items: center; gap: 0.3rem;">
                        <span>🗑️</span> <span>Delete</span>
                      </button>
                    </div>
                  </div>
                  <div class="student-note-content-card" style="background: #FFFFFF; border: 1px solid rgba(198, 138, 40, 0.22); border-radius: 6px; padding: 0.7rem 0.85rem; font-size: 0.9rem; color: var(--charcoal-900); font-weight: 600; line-height: 1.45; word-break: break-word;">
                    ${escapeHtmlStr(dayNote)}
                  </div>
                  <div style="margin-top: 0.45rem; font-size: 0.72rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.35rem;">
                    <span>💾 Permanently saved in database and active on your calendar.</span>
                  </div>
                </div>
              `;
        } else {
          return `
                <div class="student-note-box is-empty" style="background: rgba(198, 138, 40, 0.04); border: 1px solid rgba(198, 138, 40, 0.25); border-radius: var(--radius-md); padding: 1.1rem; margin-bottom: 1.25rem;">
                  <label style="font-size: 0.86rem; font-weight: 700; color: var(--charcoal-900); display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.35rem;">
                    <span>📝 Personal Date Note / Unavailability Reason:</span>
                  </label>
                  <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 0.55rem 0;">
                    Add private reminders (e.g. school exams, family event, work shift). Notes will save directly to your account.
                  </p>
                  <div style="display: flex; gap: 0.5rem;">
                    <input type="text" id="student-date-note-input" class="form-control" style="font-size: 0.85rem; padding: 0.48rem 0.7rem;" placeholder="e.g., High school midterm exam, family dinner..." value="" onkeydown="if(event.key==='Enter'){event.preventDefault();Student.saveDateNote('${dateStr}');}" />
                    <button type="button" class="btn btn-outline-gold btn-sm" id="student-date-note-save-btn" onclick="Student.saveDateNote('${dateStr}')" style="white-space: nowrap; font-weight: 700; padding: 0.48rem 0.9rem; display: inline-flex; align-items: center; gap: 0.35rem;">
                      <span>💾</span> <span>Save Note</span>
                    </button>
                  </div>
                </div>
              `;
        }
      })()}

          <!-- Booked Classes on this date -->
          <div>
            <strong style="font-size: 0.9rem; color: var(--charcoal-900); display: block; margin-bottom: 0.5rem;">
              Scheduled Classes on ${dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}:
            </strong>
            ${dayApts.length === 0 ? `
              <div style="font-size: 0.82rem; color: var(--text-secondary); padding: 0.75rem; background: var(--bg-surface-alt, #FAF7F2); border-radius: var(--radius-sm); text-align: center;">
                No classes scheduled on this day.
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                ${dayApts.map(a => `
                  <div style="background: #FFFFFF; border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 0.65rem 0.85rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <strong style="font-size: 0.86rem; color: var(--charcoal-900);">${a.subject}</strong>
                      <div style="font-size: 0.76rem; color: var(--text-secondary);">with ${a.tutor_name || 'Educator'}</div>
                    </div>
                    <span class="badge-gold" style="font-size: 0.75rem;">${a.time || a.requested_time}</span>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  },

  async setDayAvailability(mode) {
    if (!this.selectedDate) return;
    const noteInput = document.getElementById('student-date-note-input');
    const noteVal = noteInput ? noteInput.value : undefined;
    try {
      const payload = {
        date: this.selectedDate,
        mode: mode
      };
      if (noteVal !== undefined && noteVal !== '') {
        payload.note = noteVal;
      }
      const res = await API.setStudentDayAvailability(payload);
      if (res && res.availabilitySchedule) {
        if (!this.scheduleData) this.scheduleData = {};
        this.scheduleData.availabilitySchedule = res.availabilitySchedule;
      }
      showToast(res.message, 'success');
      await this.renderSchedule();
    } catch (err) {
      showToast(err.message || 'Failed to update date availability.', 'error');
    }
  },

  async toggleSlot(date, time_slot) {
    try {
      const res = await API.toggleStudentSlot({
        date: date,
        time_slot: time_slot
      });
      showToast(res.message, 'success');
      await this.renderSchedule();
    } catch (err) {
      showToast(err.message || 'Failed to toggle time slot.', 'error');
    }
  },

  startEditDateNote(date) {
    this.editingDateNote = date;
    this.renderDateSchedulePanel();
    setTimeout(() => {
      const input = document.getElementById('student-date-note-input');
      if (input) {
        input.focus();
        input.select();
      }
    }, 50);
  },

  cancelEditDateNote() {
    this.editingDateNote = null;
    this.renderDateSchedulePanel();
  },

  async saveDateNote(date) {
    const input = document.getElementById('student-date-note-input');
    const saveBtn = document.getElementById('student-date-note-save-btn');
    const note = input ? input.value.trim() : '';

    if (!note) {
      return this.deleteDateNote(date);
    }

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span>💾 Saving...</span>';
    }
    try {
      const res = await API.setStudentDayAvailability({
        date: date,
        note: note
      });
      if (!this.scheduleData) this.scheduleData = {};
      if (res && res.availabilitySchedule) {
        this.scheduleData.availabilitySchedule = res.availabilitySchedule;
        if (res.unavailableDates) this.scheduleData.unavailableDates = res.unavailableDates;
        if (res.occupiedSlots) this.scheduleData.occupiedSlots = res.occupiedSlots;
      } else {
        if (!this.scheduleData.availabilitySchedule) this.scheduleData.availabilitySchedule = {};
        if (!this.scheduleData.availabilitySchedule.date_notes) this.scheduleData.availabilitySchedule.date_notes = {};
        this.scheduleData.availabilitySchedule.date_notes[date] = note;
      }
      this.editingDateNote = null;
      showToast('Date note saved to your account and database.', 'success');
      await this.renderSchedule();
    } catch (err) {
      showToast(err.message || 'Failed to save date note.', 'error');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<span>💾 Save Changes</span>';
      }
    }
  },

  async deleteDateNote(date) {
    try {
      const res = await API.setStudentDayAvailability({
        date: date,
        note: ''
      });
      if (!this.scheduleData) this.scheduleData = {};
      if (res && res.availabilitySchedule) {
        this.scheduleData.availabilitySchedule = res.availabilitySchedule;
        if (res.unavailableDates) this.scheduleData.unavailableDates = res.unavailableDates;
        if (res.occupiedSlots) this.scheduleData.occupiedSlots = res.occupiedSlots;
      } else {
        if (this.scheduleData.availabilitySchedule && this.scheduleData.availabilitySchedule.date_notes) {
          delete this.scheduleData.availabilitySchedule.date_notes[date];
        }
      }
      this.editingDateNote = null;
      showToast('Date note deleted from your account and database.', 'info');
      await this.renderSchedule();
    } catch (err) {
      showToast(err.message || 'Failed to delete date note.', 'error');
    }
  },

  async clearDateNote(date) {
    return this.deleteDateNote(date);
  },

  renderScheduleList() {
    const container = document.getElementById('student-schedule-container');
    const badge = document.getElementById('student-schedule-count-badge');
    if (!container) return;

    // Filter confirmed and pending upcoming appointments
    const scheduled = this.requests
      .filter(r => r.status === 'accepted' || r.status === 'pending')
      .sort((a, b) => (a.requested_date + ' ' + a.requested_time).localeCompare(b.requested_date + ' ' + b.requested_time));

    if (badge) {
      badge.textContent = `${scheduled.length} ${scheduled.length === 1 ? 'Class' : 'Classes'}`;
    }

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
        <div class="schedule-card" id="schedule-item-${r.id}" data-id="${r.id}">
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

          <div style="font-size: 0.88rem; color: var(--charcoal-900); width: 180px; min-width: 180px;">
            <div style="font-weight: 700; display: flex; align-items: center; gap: 0.3rem;">${Icons.clock(14)} ${r.requested_time}${(window.getTimezoneAbbr && !r.requested_time.includes('EST') && !r.requested_time.includes('CST') && !r.requested_time.includes('PST') && !r.requested_time.includes('MST')) ? ' ' + window.getTimezoneAbbr() : ''}</div>
            <div style="font-size: 0.78rem; color: var(--gold-800); font-weight: 600;">${(r.duration_hours === 0.5 || r.payment_method === 'free_trial') ? '30-Minute Trial Class' : '50-Minute Class'}</div>
          </div>

          <div class="schedule-actions-col">
            ${r.status === 'accepted' ? (r.room_status === 'open' ? `
              <button class="btn btn-primary btn-sm btn-vroom-live" onclick="VirtualRoom.joinRoom(${r.id}, 'student')" style="background: #10B981; border-color: #10B981;">${Icons.video(14)} Join Class</button>
            ` : `
              <button class="btn btn-secondary btn-sm" style="opacity: 0.7; cursor: not-allowed;" onclick="showToast('Class is currently closed. Your tutor will open the virtual classroom from their account when the session begins.', 'info')">${Icons.lock(14)} Closed</button>
            `) : ''}
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

    container.innerHTML = filtered.map(r => {
      const lessonRate = r.hourly_rate || 50;
      const lessonDuration = r.duration_hours || 1;
      const isFreeTrial = (r.payment_method === 'free_trial' || (r.duration_hours === 0.5 && (!r.total_amount || r.total_amount === 0)));
      // Total amount paid based on the tutor's rate per lesson (even when booked via subscription)
      const totalPaid = isFreeTrial ? 0 : (r.total_amount && r.total_amount > 0 ? r.total_amount : (lessonRate * lessonDuration));

      return `
        <div class="request-item-card" id="request-item-${r.id}" data-id="${r.id}">
          <a href="${r.tutor_profile_id ? `#tutor-profile?id=${r.tutor_profile_id}` : '#tutors'}" title="View Tutor Profile">
            <img src="${r.tutor_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}" class="request-tutor-avatar" />
          </a>
          
          <div class="request-subject-info">
            <h4>${escapeHtmlStr(r.subject)}</h4>
            <p>Tutor: ${r.tutor_profile_id ? `<a href="#tutor-profile?id=${r.tutor_profile_id}" style="color: var(--gold-800); font-weight: 700; text-decoration: underline;">${escapeHtmlStr(r.tutor_name)}</a>` : `<strong>${escapeHtmlStr(r.tutor_name)}</strong>`}</p>
            ${r.notes ? `<p style="font-size: 0.8rem; color: var(--charcoal-400); margin-top: 0.2rem;">Topic: ${escapeHtmlStr(r.notes)}</p>` : ''}
            ${r.tutor_response_note ? `<p style="font-size: 0.8rem; color: var(--gold-700); margin-top: 0.2rem;">Tutor note: "${escapeHtmlStr(r.tutor_response_note)}"</p>` : ''}
          </div>

          <div class="request-datetime-info">
            <strong style="display: flex; align-items: center; gap: 0.3rem;">${Icons.calendar(14)} ${r.requested_date}</strong>
            <span style="display: flex; align-items: center; gap: 0.3rem;">${Icons.clock(14)} ${r.requested_time}${(window.getTimezoneAbbr && !r.requested_time.includes('EST') && !r.requested_time.includes('CST') && !r.requested_time.includes('PST') && !r.requested_time.includes('MST')) ? ' ' + window.getTimezoneAbbr() : ''} (${isFreeTrial ? '30 mins' : '50 mins'})</span>
          </div>

          <div class="request-pricing-info">
            <div class="pricing-total-label">Total Paid</div>
            <div class="pricing-total-amount">${totalPaid.toFixed(2)}</div>
            <div class="pricing-rate-sub">${isFreeTrial ? 'Free Trial' : `Rate: ${lessonRate}/hr`}</div>
          </div>

          <div class="request-status-col">
            <span class="status-pill ${r.status}">${r.status === 'completed' ? 'done' : r.status.toUpperCase()}</span>
          </div>

          <div class="request-actions-col">
            ${(r.status === 'accepted' && r.room_status !== 'ended') ? (r.room_status === 'open' ? `
              <button class="btn btn-primary btn-sm btn-vroom-live" onclick="VirtualRoom.joinRoom(${r.id}, 'student')" style="background: #10B981; border-color: #10B981;">${Icons.video(14)} Join Class</button>
            ` : `
              <button class="btn btn-secondary btn-sm" style="opacity: 0.7; cursor: not-allowed;" onclick="showToast('Class is currently closed. Your tutor will open the virtual classroom from their account when the session begins.', 'info')">${Icons.lock(14)} Closed</button>
            `) : ''}
            ${(r.status === 'pending' || (r.status === 'accepted' && r.room_status !== 'ended')) ? `
              <button class="btn btn-outline-gold btn-sm" onclick="Tutors.openMessageModal(${r.tutor_id})">${Icons.message(14)} Message</button>
              ${this.canCancelSession(r) ? `
                <button class="btn btn-secondary btn-sm" onclick="Student.cancelRequest(${r.id})" title="Cancel booking (Allowed up to 3 hours before class)">Cancel</button>
              ` : `
                <button class="btn btn-secondary btn-sm" style="opacity: 0.55; cursor: not-allowed;" onclick="showToast('Cancel booking is only applicable at least 3 hours before the class.', 'warning')" title="Cancel booking is only applicable at least 3 hours before class">Cancel (&lt;3h)</button>
              `}
            ` : ''}
            ${(r.status === 'completed' || r.room_status === 'ended') ? `
              ${(r.lesson_summary || r.lesson_transcript) ? `
                <button type="button" class="btn btn-outline-gold btn-sm" onclick="Student.viewLessonSummary(${r.id})" style="font-size: 0.74rem; padding: 0.22rem 0.55rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                  ${Icons.fileText(12)} Lesson Notes
                </button>
              ` : ''}
              ${r.review_rating ? `
                <span style="font-size: 0.82rem; color: #F59E0B; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">${Icons.star(13)} ${r.review_rating}/5</span>
              ` : `
                <button class="btn btn-outline-gold btn-sm" onclick="Student.openReviewModal(${r.id}, '${escapeQuotes(r.tutor_name)}', '${escapeQuotes(r.subject)}')">${Icons.star(12)} Rate Tutor (★ 1-5)</button>
              `}
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
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
        <img src="${r.tutor_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}" style="width: 44px; height: 44px; border-radius: var(--radius-md); object-fit: cover; border: 1.5px solid var(--gold-500);" />

        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.15rem;">
            <h4 style="font-size: 0.98rem; color: var(--charcoal-900); font-weight: 700; margin: 0;">${r.subject}</h4>
            <span class="status-pill completed" style="font-size: 0.7rem; padding: 0.15rem 0.5rem;">${Icons.check(11)} Completed</span>
          </div>
          <p style="font-size: 0.82rem; color: var(--charcoal-700); margin: 0 0 0.15rem 0;">
            Instructor: <strong>${r.tutor_name}</strong>
          </p>
          ${r.notes ? `<p style="font-size: 0.78rem; color: var(--text-secondary); margin: 0 0 0.15rem 0;">Topic: ${escapeHtmlStr(r.notes)}</p>` : ''}
          ${r.tutor_response_note ? `<p style="font-size: 0.78rem; color: var(--gold-700); margin: 0; font-style: italic;">Instructor Feedback: "${escapeHtmlStr(r.tutor_response_note)}"</p>` : ''}
        </div>

        <div style="font-size: 0.82rem; color: var(--charcoal-900); width: 180px; min-width: 180px;">
          <div style="font-weight: 700; display: flex; align-items: center; gap: 0.3rem;">${Icons.calendar(13)} ${r.requested_date}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">50 min class completed</div>
        </div>

        <div style="display: flex; flex-direction: column; justify-content: center; align-items: flex-end; min-width: 0; gap: 0.35rem;">
          ${(r.lesson_summary || r.lesson_transcript) ? `
            <button type="button" class="btn btn-outline-gold btn-sm" onclick="Student.viewLessonSummary(${r.id})" style="font-size: 0.74rem; padding: 0.22rem 0.55rem; display: inline-flex; align-items: center; gap: 0.25rem;">
              ${Icons.fileText(12)} Lesson Notes &amp; Transcript
            </button>
          ` : ''}
          ${r.review_rating ? `
            <div style="text-align: right;">
              <div style="color: #F59E0B; display: inline-flex; align-items: center; gap: 2px;">
                ${Array.from({ length: Math.min(5, Math.max(1, r.review_rating)) }).map(() => Icons.star(13)).join('')}
              </div>
              <span style="font-size: 0.74rem; color: var(--text-muted); display: block;">Your Rating (${r.review_rating}/5)</span>
              ${r.review_comment ? `<p style="font-size: 0.75rem; color: var(--charcoal-700); margin-top: 0.15rem; font-style: italic; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtmlStr(r.review_comment)}">"${escapeHtmlStr(r.review_comment)}"</p>` : ''}
            </div>
          ` : `
            <button class="btn btn-outline-gold btn-sm" onclick="Student.openReviewModal(${r.id}, '${escapeQuotes(r.tutor_name)}', '${escapeQuotes(r.subject)}')" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">${Icons.star(12)} Rate Tutor (★ 1-5)</button>
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

      const nameInput = document.getElementById('sp-name') || document.getElementById('profile-name');
      const phoneInput = document.getElementById('sp-phone') || document.getElementById('profile-phone');
      const gradeInput = document.getElementById('sp-grade') || document.getElementById('profile-grade');
      const schoolInput = document.getElementById('sp-school') || document.getElementById('profile-school');
      const goalsInput = document.getElementById('sp-goals') || document.getElementById('profile-goals');
      const subjectsInput = document.getElementById('sp-subjects') || document.getElementById('profile-subjects');

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

    const sessionCost = session ? (parseFloat(session.total_amount) || (parseFloat(session.hourly_rate) * (parseFloat(session.duration_hours) || 1.0))) : 0;
    const tutorName = session ? (session.tutor_name || 'this tutor') : 'this tutor';
    const refundNote = sessionCost > 0
      ? ` The session fee of ${sessionCost.toFixed(2)} will be credited back to your Aviora wallet to rebook a new lesson with ${tutorName}.`
      : '';

    showConfirm(
      'Cancel Tutoring Booking',
      `Are you sure you want to cancel this booking?${refundNote} Notice: Cancel booking is only applicable at least 3 hours before the class.`,
      async () => {
        try {
          const res = await API.cancelRequest(requestId);
          showToast(res.message, 'success');
          this.saveCancelledRequest(requestId);
          const walletTutor = res.wallet_tutor || (session ? { id: session.tutor_id, name: session.tutor_name } : null);
          if (typeof res.new_wallet_balance !== 'undefined' && typeof Auth !== 'undefined' && Auth.updateWalletBalance) {
            Auth.updateWalletBalance(res.new_wallet_balance, walletTutor);
          } else if (typeof Auth !== 'undefined' && Auth.refreshWallet) {
            await Auth.refreshWallet();
          }
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

    if (!comment) {
      showToast('Please provide feedback for your tutor before submitting.', 'warning');
      if (commentEl) commentEl.focus();
      return;
    }

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
    const name = (document.getElementById('sp-name') || document.getElementById('profile-name'))?.value.trim() || '';
    const phone = (document.getElementById('sp-phone') || document.getElementById('profile-phone'))?.value.trim() || '';
    const grade_level = (document.getElementById('sp-grade') || document.getElementById('profile-grade'))?.value || '';
    const school = (document.getElementById('sp-school') || document.getElementById('profile-school'))?.value.trim() || '';
    const learning_goals = (document.getElementById('sp-goals') || document.getElementById('profile-goals'))?.value.trim() || '';
    const target_subjects = (document.getElementById('sp-subjects') || document.getElementById('profile-subjects'))?.value.trim() || '';
    const submitBtn = e.target.querySelector('button[type="submit"]') || document.getElementById('btn-save-profile');

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving Changes...';
      }

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
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Profile Changes';
      }
    }
  },

  activeLiveSessionId: null,

  setupRealTimeRoomPolling() {
    if (this.roomStatusPollTimer) {
      clearInterval(this.roomStatusPollTimer);
      this.roomStatusPollTimer = null;
    }

    const checkLiveClass = async () => {
      const user = (typeof Auth !== 'undefined' && Auth.currentUser) || null;
      if (!user || user.role !== 'student') {
        const bar = document.getElementById('student-global-live-bar');
        if (bar) bar.style.display = 'none';
        return;
      }

      try {
        const res = await API.getStudentLiveClass();
        const live = res ? res.liveSession : null;
        const bar = document.getElementById('student-global-live-bar');
        const subjEl = document.getElementById('student-live-subject');
        const tutorEl = document.getElementById('student-live-tutor');

        if (live) {
          this.activeLiveSessionId = live.id;
          if (subjEl) subjEl.textContent = `${live.subject} Virtual Classroom is Live!`;
          if (tutorEl) tutorEl.textContent = `Educator ${live.tutor_name} is in the classroom waiting for you. (50-Min Session)`;
          if (bar) bar.style.display = 'flex';

          // Trigger high-priority alert on first detection
          const alertKey = `live_alerted_session_${live.id}`;
          if (!sessionStorage.getItem(alertKey)) {
            sessionStorage.setItem(alertKey, 'true');
            showToast(`🔴 Virtual Classroom Open! ${live.tutor_name} is waiting for you in ${live.subject}. Click "Join Live Call Now" to enter.`, 'success');
            if (typeof Auth !== 'undefined' && Auth.loadNotifications) {
              Auth.loadNotifications();
            }
          }

          // Update requests list if cached
          if (this.requests) {
            let changed = false;
            this.requests.forEach(r => {
              if (r.id === live.id && r.room_status !== 'open') {
                r.room_status = 'open';
                changed = true;
              }
            });
            if (changed) {
              this.renderSpotlightSession();
              this.renderSchedule();
              this.renderRequestsList();
            }
          }
        } else {
          this.activeLiveSessionId = null;
          if (bar) bar.style.display = 'none';
        }
      } catch (e) {
        // Silently catch background poll issues
      }
    };

    // Immediate check + recurring poll every 2.5s
    checkLiveClass();
    this.roomStatusPollTimer = setInterval(checkLiveClass, 2500);
  },

  joinCurrentLiveClass() {
    if (this.activeLiveSessionId && typeof VirtualRoom !== 'undefined') {
      VirtualRoom.joinRoom(this.activeLiveSessionId, 'student');
    } else {
      const nextAccepted = (this.requests || []).find(r => r.room_status === 'open');
      if (nextAccepted && typeof VirtualRoom !== 'undefined') {
        VirtualRoom.joinRoom(nextAccepted.id, 'student');
      } else {
        showToast('Checking for active virtual classroom session...', 'info');
        API.getStudentLiveClass().then(res => {
          if (res && res.liveSession) {
            VirtualRoom.joinRoom(res.liveSession.id, 'student');
          } else {
            showToast('No active class session is currently open.', 'info');
          }
        }).catch(() => { });
      }
    }
  },

  checkClassStartingSoonReminder(nextSession) {
    if (!nextSession || nextSession.status !== 'accepted' || nextSession.room_status === 'ended') return;

    const match = String(nextSession.requested_time).match(/(\d{1,2}):(\d{2})/);
    if (!match) return;

    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const sessionDate = new Date(`${nextSession.requested_date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
    const now = new Date();
    const diffMs = sessionDate.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / (60 * 1000));

    // If within 30 minutes of start time and room is not yet open
    if (diffMins <= 30 && diffMins >= -15 && nextSession.room_status !== 'open') {
      const storageKey = `notif_reminded_${nextSession.id}_${nextSession.requested_date}`;
      if (!sessionStorage.getItem(storageKey)) {
        sessionStorage.setItem(storageKey, 'true');
        showToast(`Reminder: Your ${nextSession.subject} class with ${nextSession.tutor_name} is scheduled for ${nextSession.requested_time} and is about to begin. Your tutor will open the virtual room shortly.`, 'info');
      }
    }
  },

  async viewLessonSummary(requestId) {
    const modal = document.getElementById('modal-student-lesson-summary');
    const metaBox = document.getElementById('student-summary-meta-box');
    const contentBox = document.getElementById('student-summary-content');
    const titleEl = document.getElementById('student-summary-title');
    if (!modal) return;

    this.openModal('modal-student-lesson-summary');
    if (contentBox) contentBox.innerHTML = '<div style="text-align: center; padding: 1.5rem; color: var(--text-secondary);">Loading lesson record...</div>';

    try {
      const res = await API.getStudentLessonSummary(requestId);
      const record = res.record;
      if (!record || (!record.lesson_summary && !record.lesson_transcript)) {
        if (contentBox) contentBox.innerHTML = '<em>Your instructor has not submitted a detailed lesson summary or transcript for this session yet.</em>';
        return;
      }

      if (titleEl) {
        titleEl.textContent = `${record.subject} — Lesson Summary & Notes`;
      }

      if (metaBox) {
        const sentDateStr = record.summary_sent_at ? new Date(record.summary_sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
        metaBox.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color);">
            <div>
              <span class="badge-gold">${record.subject}</span>
              <span style="font-size: 0.82rem; color: var(--text-secondary); margin-left: 0.4rem;">${record.requested_date} (${record.requested_time})</span>
            </div>
            <div style="font-size: 0.82rem; color: var(--gold-800); font-weight: 600;">
              Instructor: ${record.tutor_name} ${sentDateStr ? `• Sent ${sentDateStr}` : ''}
            </div>
          </div>
        `;
      }

      if (contentBox) {
        let html = '';
        if (record.lesson_summary) {
          html += `
            <div style="margin-bottom: 1.25rem;">
              <h5 style="font-size: 0.9rem; font-weight: 700; color: var(--gold-700); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.35rem;">
                📝 Educator Lesson Summary
              </h5>
              <div style="white-space: pre-wrap; line-height: 1.6; color: var(--text-primary); font-size: 0.88rem;">${escapeHtmlStr(record.lesson_summary)}</div>
            </div>
          `;
        }

        if (record.lesson_transcript) {
          html += `
            <div style="${record.lesson_summary ? 'border-top: 1px dashed var(--border-color); padding-top: 1.1rem; margin-top: 1.1rem;' : ''}">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <h5 style="font-size: 0.9rem; font-weight: 700; color: var(--gold-700); margin: 0; display: flex; align-items: center; gap: 0.35rem;">
                  🎙️ Auto-Transcribed Lesson Voice Record
                </h5>
                <button type="button" class="btn btn-secondary btn-sm" onclick="Student.copyTranscriptText()" style="font-size: 0.72rem; padding: 0.2rem 0.5rem;">
                  Copy Transcript
                </button>
              </div>
              <div id="student-rendered-transcript-text" style="font-family: monospace, sans-serif; font-size: 0.82rem; background: rgba(0,0,0,0.03); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.85rem; line-height: 1.55; max-height: 240px; overflow-y: auto; white-space: pre-wrap; color: var(--text-primary);">${escapeHtmlStr(record.lesson_transcript)}</div>
            </div>
          `;
        }
        contentBox.innerHTML = html;
      }
    } catch (err) {
      if (contentBox) contentBox.innerHTML = `<span style="color: #EF4444;">Failed to load lesson summary: ${err.message}</span>`;
    }
  },

  async copyTranscriptText() {
    const el = document.getElementById('student-rendered-transcript-text');
    if (!el || !el.textContent.trim()) return;
    try {
      await navigator.clipboard.writeText(el.textContent.trim());
      showToast('Lesson transcript copied to clipboard!', 'success');
    } catch (e) {
      showToast('Could not copy transcript.', 'error');
    }
  },

  // 1-on-1 Messages & Tutor Chats Page (Messenger Interface)
  studentMessages: [],
  studentMessagesPollInterval: null,
  studentMessageFilter: 'all',
  studentChatTypeFilter: 'all',
  studentTimeRangeFilter: 'all',
  studentMessageSearchQuery: '',
  activeTutorId: null,
  archivedConversations: new Set(),
  pendingMessageAttachment: null,

  filterMessages(filterType, btnEl) {
    this.studentMessageFilter = filterType;
    document.querySelectorAll('.student-msg-filter-btn').forEach(b => {
      b.classList.toggle('active', b === btnEl || b.dataset.filter === filterType);
    });
    this.renderStudentMessages();
  },

  toggleFilterUnread(btnEl) {
    if (this.studentMessageFilter === 'unread') {
      this.studentMessageFilter = 'all';
      if (btnEl) btnEl.classList.remove('active');
    } else {
      this.studentMessageFilter = 'unread';
      if (btnEl) btnEl.classList.add('active');
    }
    this.renderStudentMessages();
  },

  filterChatType(type) {
    this.studentChatTypeFilter = type || 'all';
    this.renderStudentMessages();
  },

  filterTimeRange(range) {
    this.studentTimeRangeFilter = range || 'all';
    this.renderStudentMessages();
  },

  toggleSidebarSearch() {
    const wrap = document.getElementById('student-messenger-search-wrap');
    const input = document.getElementById('student-messages-search-input');
    if (wrap) {
      const isHidden = window.getComputedStyle(wrap).display === 'none' || wrap.style.display === 'none';
      wrap.style.display = isHidden ? 'block' : 'none';
      if (isHidden && input) input.focus();
    }
  },

  searchMessages(query) {
    this.studentMessageSearchQuery = (query || '').toLowerCase().trim();
    this.renderStudentMessages();
  },

  copyContactIdentifier(text) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard: ' + text, 'info');
      }).catch(() => {
        showToast('Copied: ' + text, 'info');
      });
    } else {
      showToast('Contact: ' + text, 'info');
    }
  },

  archiveConversation(convKey) {
    if (!convKey) return;
    if (this.archivedConversations.has(convKey)) {
      this.archivedConversations.delete(convKey);
      showToast('Conversation unarchived.', 'info');
    } else {
      this.archivedConversations.add(convKey);
      showToast('Conversation moved to archive.', 'info');
    }
    this.renderStudentMessages();
  },

  clearConversation(convKey) {
    showToast('Official conversation messages are permanently preserved.', 'info');
  },

  toggleTemplatesMenu() {
    const el = document.getElementById('student-templates-dropdown');
    if (!el) return;
    const isShown = el.style.display !== 'none';
    if (isShown) {
      el.style.display = 'none';
    } else {
      const templates = [
        "Hello! I have a question regarding our recent lesson material.",
        "Could you please explain the homework problem when you have time?",
        "Thank you so much for the detailed explanation! That really helped.",
        "Could we schedule a review session for the upcoming exam?",
        "I've attached my working steps for the problem set."
      ];
      el.innerHTML = `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.5rem; box-shadow: 0 8px 24px rgba(0,0,0,0.12); margin-bottom: 0.5rem; display: flex; flex-direction: column; gap: 0.35rem; max-height: 180px; overflow-y: auto;">
          <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; padding: 0.2rem 0.4rem;">Select Quick Template</div>
          ${templates.map(t => `
            <button type="button" style="text-align: left; background: transparent; border: none; padding: 0.35rem 0.5rem; font-size: 0.8rem; color: var(--text-primary); border-radius: 6px; cursor: pointer; transition: background 0.15s;" onmouseover="this.style.background='rgba(37,99,235,0.08)'" onmouseout="this.style.background='transparent'" onclick="Student.insertTemplate('${this.escapeHtml(t).replace(/'/g, "\\'")}')">
              ${this.escapeHtml(t)}
            </button>
          `).join('')}
        </div>
      `;
      el.style.display = 'block';
    }
  },

  insertTemplate(text) {
    const input = document.getElementById('student-composer-input');
    if (input) {
      input.value = text;
      input.focus();
    }
    const el = document.getElementById('student-templates-dropdown');
    if (el) el.style.display = 'none';
  },

  toggleEmojiMenu() {
    const el = document.getElementById('student-emoji-dropdown');
    if (!el) return;
    const isShown = el.style.display !== 'none';
    if (isShown) {
      el.style.display = 'none';
    } else {
      const emojis = ['👍', '😊', '📚', '💡', '🎯', '👏', '💯', '🎓', '✨', '📝', '🙌', '⭐'];
      el.innerHTML = `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.4rem; box-shadow: 0 8px 24px rgba(0,0,0,0.12); margin-bottom: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.35rem;">
          ${emojis.map(e => `
            <button type="button" style="background: transparent; border: none; font-size: 1.15rem; cursor: pointer; padding: 0.2rem 0.35rem; border-radius: 6px;" onmouseover="this.style.background='rgba(0,0,0,0.08)'" onmouseout="this.style.background='transparent'" onclick="Student.insertEmoji('${e}')">
              ${e}
            </button>
          `).join('')}
        </div>
      `;
      el.style.display = 'block';
    }
  },

  insertEmoji(char) {
    const input = document.getElementById('student-composer-input');
    if (input) {
      input.value += char;
      input.focus();
    }
    const el = document.getElementById('student-emoji-dropdown');
    if (el) el.style.display = 'none';
  },

  openCalendarShortcut() {
    window.location.hash = '#student-schedule';
  },

  triggerAttachmentChooser() {
    const choice = confirm('Click OK to attach a Photo/Image, or Cancel to attach a Document/File.');
    if (choice) {
      this.triggerPictureUpload();
    } else {
      this.triggerFileUpload();
    }
  },

  async loadMessagesPage() {
    const hub = document.getElementById('student-messenger-hub');
    if (!hub) return;

    if (!this.requests || this.requests.length === 0) {
      await this.loadDashboard().catch(() => {});
    }

    try {
      const res = await API.getStudentMessages();
      this.studentMessages = res.messages || [];
    } catch (e) {
      console.warn('Could not load student messages:', e);
    }

    this.renderStudentMessages();

    if (!this.studentMessagesPollInterval) {
      this.studentMessagesPollInterval = setInterval(async () => {
        const view = document.getElementById('view-student-messages');
        if (view && view.style.display !== 'none') {
          try {
            const res = await API.getStudentMessages();
            const incoming = res.messages || [];

            const incomingIds = new Set(incoming.map(m => String(m.id)));
            const merged = [...incoming];
            for (const localMsg of (this.studentMessages || [])) {
              const isTemp = String(localMsg.id).startsWith('temp-');
              if (isTemp) {
                const alreadySynced = incoming.some(m => 
                  m.sender_role === localMsg.sender_role &&
                  (m.content || m.text || '') === (localMsg.content || localMsg.text || '') &&
                  (m.attachment_url || null) === (localMsg.attachment_url || null)
                );
                if (!alreadySynced) {
                  merged.push(localMsg);
                }
              } else if (!incomingIds.has(String(localMsg.id))) {
                merged.push(localMsg);
              }
            }
            this.studentMessages = merged;

            this.updateSidebarConversations();
            const convs = this.getTutorConversations();
            const activeConv = convs.find(c => String(c.tutor_id) === this.activeTutorId);
            if (activeConv) {
              this.updateActiveHeaderPresence(activeConv);
              this.syncActiveThreadMessages(activeConv);
            }
          } catch (e) {}
        }
      }, 1500);
    }
  },

  getTutorConversations() {
    const tutorMap = new Map();
    const currentStudentId = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser.id : null;

    (this.requests || []).forEach(req => {
      const tId = String(req.tutor_id);
      if (!tutorMap.has(tId)) {
        tutorMap.set(tId, {
          tutor_id: req.tutor_id,
          tutor_name: req.tutor_name || 'Academic Educator',
          tutor_avatar: req.tutor_avatar || null,
          tutor_headline: req.tutor_headline || '',
          tutor_institution: 'Stanford University',
          tutor_subjects: req.subject || 'Mathematics',
          tutor_rate: req.hourly_rate || 45,
          tutor_phone: '+1 254-125-4446',
          tutor_country: 'United States',
          subject: req.subject || 'Calculus BC',
          messages: [],
          isOnline: false,
          unreadCount: 0,
          lastMessage: null
        });
      }
    });

    (this.studentMessages || []).forEach(msg => {
      const isFromStudent = msg.sender_role === 'student' || (currentStudentId && Number(msg.sender_id) === Number(currentStudentId));
      const tutorId = isFromStudent ? (msg.tutor_user_id || msg.receiver_id) : (msg.tutor_user_id || msg.sender_id);
      const tId = String(tutorId || msg.tutor_email || msg.sender_email || 'tutor');

      if (!tutorMap.has(tId)) {
        tutorMap.set(tId, {
          tutor_id: tutorId || (!isNaN(tId) ? Number(tId) : tId),
          tutor_name: msg.tutor_name || (!isFromStudent && msg.sender_name) || 'Academic Educator',
          tutor_avatar: msg.tutor_avatar || null,
          tutor_headline: msg.tutor_headline || '',
          tutor_institution: msg.tutor_institution || 'Stanford University',
          tutor_subjects: msg.tutor_subjects || msg.subject || 'Calculus BC',
          tutor_rate: msg.tutor_rate || 45,
          tutor_phone: msg.tutor_phone || '+1 254-125-4446',
          tutor_country: msg.tutor_country || 'United States',
          subject: msg.subject || 'Calculus BC',
          messages: [],
          isOnline: Boolean(msg.tutor_is_online),
          unreadCount: 0,
          lastMessage: null
        });
      }
      const t = tutorMap.get(tId);
      if (!t.tutor_id && tutorId) t.tutor_id = tutorId;
      if (!t.tutor_name || t.tutor_name === 'Academic Educator') {
        if (msg.tutor_name) t.tutor_name = msg.tutor_name;
        else if (!isFromStudent && msg.sender_name) t.tutor_name = msg.sender_name;
      }
      if (typeof msg.tutor_is_online !== 'undefined') {
        t.isOnline = Boolean(msg.tutor_is_online);
      }
      if (msg.tutor_institution && (!t.tutor_institution || t.tutor_institution === 'Stanford University')) t.tutor_institution = msg.tutor_institution;
      if (msg.tutor_subjects && (!t.tutor_subjects || t.tutor_subjects === 'Calculus BC')) t.tutor_subjects = msg.tutor_subjects;
      if (msg.tutor_phone && (!t.tutor_phone || t.tutor_phone === '+1 254-125-4446')) t.tutor_phone = msg.tutor_phone;
      if (msg.tutor_country && (!t.tutor_country || t.tutor_country === 'United States')) t.tutor_country = msg.tutor_country;
      if (msg.subject && !t.subject) t.subject = msg.subject;

      t.messages.push(msg);
      if (msg.sender_role === 'tutor' && Number(msg.is_read) === 0) {
        t.unreadCount++;
      }
    });

    const convs = Array.from(tutorMap.values());
    convs.forEach(c => {
      c.messages.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
      c.lastMessage = c.messages[c.messages.length - 1];
    });

    convs.sort((a, b) => new Date(b.lastMessage?.created_at || 0) - new Date(a.lastMessage?.created_at || 0));
    return convs;
  },

  updateActiveHeaderPresence(activeConv) {
    if (!activeConv) return;
    const dot = document.getElementById('student-active-header-dot');
    const indicator = document.getElementById('student-active-header-status-text');
    const dotBg = activeConv.isOnline ? '#10B981' : '#9CA3AF';
    const dotShadow = activeConv.isOnline ? '0 0 0 2px var(--bg-card), 0 0 8px rgba(16, 185, 129, 0.6)' : '0 0 0 2px var(--bg-card)';
    const statusText = activeConv.isOnline ? '● Active now' : '○ Offline';
    const statusColor = activeConv.isOnline ? '#059669' : '#6B7280';

    if (dot) {
      dot.style.backgroundColor = dotBg;
      dot.style.boxShadow = dotShadow;
      dot.title = activeConv.isOnline ? 'Active now' : 'Offline';
    }
    if (indicator) {
      indicator.textContent = statusText;
      indicator.style.color = statusColor;
    }
  },

  syncActiveThreadMessages(activeConv) {
    if (!activeConv) return;
    const threadEl = document.getElementById('student-messages-thread-container');
    if (!threadEl) return;

    const renderedCount = threadEl.children.length;
    const lastRenderedEl = threadEl.lastElementChild;
    const lastMsg = activeConv.messages[activeConv.messages.length - 1];
    const lastIdMatches = lastRenderedEl && lastMsg && lastRenderedEl.id === `student-msg-row-${lastMsg.id}`;

    if (renderedCount !== activeConv.messages.length || !lastIdMatches) {
      this.renderThreadMessagesOnly(activeConv);
    } else {
      activeConv.messages.forEach(m => {
        if (m.sender_role === 'student') {
          const row = document.getElementById(`student-msg-row-${m.id}`);
          if (row) {
            const footerSpan = row.querySelector('.messenger-msg-status');
            if (footerSpan) {
              const statusHtml = m.status === 'seen' || m.is_read === 1 ? '• Seen' : '• Delivered';
              footerSpan.textContent = statusHtml;
            }
          }
        }
      });
    }
  },

  updateSidebarConversations() {
    const convListEl = document.getElementById('student-messenger-conv-list');
    if (!convListEl) return;
    let convs = this.getTutorConversations();

    // Filtering
    if (this.studentChatTypeFilter === 'active') {
      convs = convs.filter(c => !this.archivedConversations.has(String(c.tutor_id)));
    } else if (this.studentChatTypeFilter === 'archived') {
      convs = convs.filter(c => this.archivedConversations.has(String(c.tutor_id)));
    }

    if (this.studentTimeRangeFilter && this.studentTimeRangeFilter !== 'all') {
      const now = Date.now();
      convs = convs.filter(c => {
        const msgTime = new Date(c.lastMessage?.created_at || 0).getTime();
        const diffHours = (now - msgTime) / (1000 * 60 * 60);
        if (this.studentTimeRangeFilter === 'today') return diffHours <= 24;
        if (this.studentTimeRangeFilter === '7days') return diffHours <= 24 * 7;
        if (this.studentTimeRangeFilter === '30days') return diffHours <= 24 * 30;
        return true;
      });
    }

    if (this.studentMessageFilter === 'unread') {
      convs = convs.filter(c => c.unreadCount > 0);
    }

    const q = this.studentMessageSearchQuery;
    if (q) {
      convs = convs.filter(c => {
        const tName = String(c.tutor_name || '').toLowerCase();
        const tSubj = String(c.subject || '').toLowerCase();
        const tPhone = String(c.tutor_phone || '').toLowerCase();
        const hasMatchingMsg = c.messages.some(m => String(m.content || m.text || '').toLowerCase().includes(q));
        return tName.includes(q) || tSubj.includes(q) || tPhone.includes(q) || hasMatchingMsg;
      });
    }

    if (convs.length === 0) {
      convListEl.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-secondary);">
          <div style="font-size: 1.5rem; margin-bottom: 0.4rem;">💬</div>
          <div style="font-size: 0.85rem; font-weight: 600;">No chats found</div>
        </div>
      `;
      return;
    }

    convListEl.innerHTML = convs.map(c => {
      const tId = String(c.tutor_id);
      const isActive = tId === this.activeTutorId;
      const isUnread = c.unreadCount > 0;
      const lastText = c.lastMessage ? (c.lastMessage.sender_role === 'student' ? 'You: ' + (c.lastMessage.content || c.lastMessage.text) : (c.lastMessage.content || c.lastMessage.text)) : 'Started a conversation';
      const timeStr = c.lastMessage?.created_at ? new Date(c.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const dotBg = c.isOnline ? '#10B981' : '#9CA3AF';
      const dotShadow = c.isOnline ? '0 0 0 2px var(--bg-card), 0 0 8px rgba(16, 185, 129, 0.6)' : '0 0 0 2px var(--bg-card)';
      const dotTitle = c.isOnline ? 'Active now' : 'Offline';

      return `
        <div class="messenger-conv-item ${isActive ? 'active' : ''} ${isUnread ? 'unread' : ''}" onclick="Student.selectTutorConversation('${tId}')">
          <div class="messenger-conv-avatar-wrap">
            ${c.tutor_avatar ? `
              <img src="${c.tutor_avatar}" alt="${this.escapeHtml(c.tutor_name)}" class="messenger-conv-avatar" />
            ` : `
              <div class="messenger-conv-avatar">
                ${this.escapeHtml(c.tutor_name.charAt(0).toUpperCase())}
              </div>
            `}
            <span class="messenger-status-dot ${c.isOnline ? 'online' : 'offline'}" style="background-color: ${dotBg}; box-shadow: ${dotShadow};" title="${dotTitle}"></span>
          </div>

          <div class="messenger-conv-details">
            <div class="messenger-conv-name-row">
              <span class="messenger-conv-name">${this.escapeHtml(c.tutor_name)}</span>
              <span class="messenger-conv-time">${timeStr}</span>
            </div>
            <div class="messenger-conv-snippet-row">
              <span class="messenger-conv-snippet">${this.escapeHtml(lastText)}</span>
              ${isUnread ? `<span class="messenger-conv-badge-pill">${c.unreadCount}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  selectTutorConversation(tutorId) {
    this.activeTutorId = String(tutorId);
    API.markConversationRead(tutorId).catch(() => {});
    (this.studentMessages || []).forEach(m => {
      const id = String(m.tutor_user_id || (m.sender_role === 'student' ? m.receiver_id : m.sender_id));
      if (id === this.activeTutorId) {
        m.is_read = 1;
        m.status = 'seen';
      }
    });

    this.renderStudentMessages();
    setTimeout(() => {
      this.scrollStudentMessengerToBottom();
      const input = document.getElementById('student-composer-input');
      if (input) input.focus();
    }, 100);
  },

  scrollStudentMessengerToBottom() {
    const stream = document.getElementById('student-messages-stream');
    if (stream) {
      stream.scrollTop = stream.scrollHeight;
    }
  },

  renderStudentMessages() {
    const convListEl = document.getElementById('student-messenger-conv-list');
    const mainEl = document.getElementById('student-messenger-main-pane');
    const contactPaneEl = document.getElementById('student-messenger-contact-pane');

    let convs = this.getTutorConversations();

    if (!this.activeTutorId && convs.length > 0) {
      this.activeTutorId = String(convs[0].tutor_id);
    } else if (this.activeTutorId && !convs.some(c => String(c.tutor_id) === this.activeTutorId) && convs.length > 0) {
      this.activeTutorId = String(convs[0].tutor_id);
    }

    // 1. Render Left Sidebar
    this.updateSidebarConversations();

    // 2. Render Middle Active Conversation Pane
    this.renderStudentActiveConversation(mainEl);

    // 3. Render Right Column Contact Info Pane
    this.renderStudentContactInfo(contactPaneEl);
  },

  renderStudentActiveConversation(container) {
    if (!container) container = document.getElementById('student-messenger-main-pane');
    if (!container) return;

    const convs = this.getTutorConversations();
    const activeConv = convs.find(c => String(c.tutor_id) === this.activeTutorId);

    if (!activeConv) {
      container.innerHTML = `
        <div class="messenger-empty-state">
          <div style="color: var(--gold-600); margin-bottom: 0.75rem;">${Icons.message(44)}</div>
          <h4 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.4rem;">Select an Educator</h4>
          <p style="font-size: 0.88rem; color: var(--text-secondary); max-width: 340px; margin: 0;">
            Choose a tutor from the sidebar to view your conversation history or ask questions.
          </p>
        </div>
      `;
      return;
    }

    const dotBg = activeConv.isOnline ? '#10B981' : '#9CA3AF';
    const dotShadow = activeConv.isOnline ? '0 0 0 2px var(--bg-card), 0 0 8px rgba(16, 185, 129, 0.6)' : '0 0 0 2px var(--bg-card)';
    const statusText = activeConv.isOnline ? '● Active now' : '○ Offline';
    const statusColor = activeConv.isOnline ? '#059669' : '#6B7280';

    container.innerHTML = `
      <!-- Active Conversation Header Matching Reference -->
      <div class="messenger-active-header">
        <div class="messenger-active-contact">
          <div class="messenger-conv-avatar-wrap">
            ${activeConv.tutor_avatar ? `
              <img src="${activeConv.tutor_avatar}" alt="${this.escapeHtml(activeConv.tutor_name)}" class="messenger-header-avatar" />
            ` : `
              <div class="messenger-header-avatar" style="display: flex; align-items: center; justify-content: center; background: rgba(198, 138, 40, 0.15); font-weight: 700; color: var(--gold-700);">
                ${this.escapeHtml(activeConv.tutor_name.charAt(0).toUpperCase())}
              </div>
            `}
            <span class="messenger-status-dot ${activeConv.isOnline ? 'online' : 'offline'}" id="student-active-header-dot" style="background-color: ${dotBg}; box-shadow: ${dotShadow};" title="${activeConv.isOnline ? 'Active now' : 'Offline'}"></span>
          </div>
          <div>
            <h4 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary); line-height: 1.2;">${this.escapeHtml(activeConv.tutor_name)}</h4>
            <div style="display: flex; align-items: center; gap: 0.35rem; margin-top: 2px;">
              <span style="font-size: 0.8rem; color: var(--text-secondary);">${this.escapeHtml(activeConv.tutor_phone || activeConv.tutor_headline || 'Educator')}</span>
              <button type="button" class="messenger-header-copy-btn" onclick="Student.copyContactIdentifier('${this.escapeHtml(activeConv.tutor_phone || activeConv.tutor_name)}')" title="Copy identifier">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
              <span style="font-size: 0.74rem; color: ${statusColor}; font-weight: 600;" id="student-active-header-status-text">${statusText}</span>
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 0.45rem;">
          <button type="button" class="messenger-header-action-btn" title="Archive Chat" onclick="Student.archiveConversation('${activeConv.tutor_id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
          </button>
        </div>
      </div>

      <!-- Messages Stream (Matching Reference Image) -->
      <div class="messenger-body" id="student-messages-stream" style="flex: 1; overflow-y: auto; padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 0.85rem;">
        <div style="text-align: center; margin: 0.5rem 0 1rem;">
          <span style="background: var(--bg-secondary, #F3F4F6); color: var(--text-secondary); font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.85rem; border-radius: 999px;">Today</span>
        </div>

        <div class="messenger-thread" id="student-messages-thread-container" style="display: flex; flex-direction: column; gap: 0.85rem;">
          <!-- Dynamically populated -->
        </div>
      </div>

      <!-- Composer Toolbar & Input Matching Reference Image -->
      <div class="messenger-footer" style="padding: 0.65rem 1.25rem 1rem; border-top: 1px solid var(--border-color); background: var(--bg-card); display: flex; flex-direction: column; gap: 0.45rem;">
        <!-- Hidden file inputs -->
        <input type="file" id="student-messenger-pic-input" accept="image/*" style="display:none;" onchange="Student.handleAttachmentUpload(this, true)" />
        <input type="file" id="student-messenger-doc-input" accept="*/*" style="display:none;" onchange="Student.handleAttachmentUpload(this, false)" />

        <!-- Attachment Preview Pill -->
        <div id="student-composer-attachment-preview" style="display:none;"></div>

        <!-- Quick Template Dropdown & Emoji Picker Container -->
        <div id="student-templates-dropdown" style="display: none;"></div>
        <div id="student-emoji-dropdown" style="display: none;"></div>

        <!-- Action Toolbar Matching Reference Image -->
        <div class="messenger-composer-toolbar" style="display: flex; align-items: center; gap: 0.85rem; padding: 0; margin-bottom: 0.15rem;">
          <button type="button" class="messenger-tool-btn" onclick="Student.triggerAttachmentChooser()" title="Attach file, photo or link">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
            <span>Attach</span>
          </button>
          <button type="button" class="messenger-tool-btn" onclick="Student.toggleEmojiMenu()" title="Add emoji">
            😊
          </button>
          <button type="button" class="messenger-tool-btn" onclick="Student.toggleTemplatesMenu()" title="Quick message templates">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span>Template</span>
          </button>
          <button type="button" class="messenger-tool-btn" onclick="Student.openCalendarShortcut()" title="Add event to calendar / Schedule">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>Add to calendar</span>
          </button>
        </div>

        <form class="messenger-composer-form" onsubmit="event.preventDefault(); Student.sendStudentMessage();">
          <div class="messenger-input-wrap" style="display: flex; align-items: center; gap: 0.65rem; background: var(--bg-secondary, #FAF8F5); border: 1px solid var(--border-color); border-radius: 24px; padding: 0.35rem 0.65rem 0.35rem 1.15rem;">
            <textarea 
              id="student-composer-input" 
              class="messenger-textarea" 
              placeholder="Type a message or share photos, files, links with ${this.escapeHtml(activeConv.tutor_name)}..." 
              rows="1"
              onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault(); Student.sendStudentMessage();}"
            ></textarea>
            <button type="submit" class="messenger-send-btn" id="student-send-msg-btn" title="Send (Enter)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </form>
      </div>
    `;

    this.renderThreadMessagesOnly(activeConv);

    setTimeout(() => {
      this.scrollStudentMessengerToBottom();
      this.renderAttachmentPreview();
    }, 50);
  },

  renderThreadMessagesOnly(activeConv) {
    const threadEl = document.getElementById('student-messages-thread-container');
    if (!threadEl) return;

    threadEl.innerHTML = activeConv.messages.map(m => {
      const isMe = m.sender_role === 'student';
      const timeStr = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const statusHtml = isMe ? (m.status === 'seen' || m.is_read === 1 ? '• Seen' : '• Delivered') : '';

      if (!isMe) {
        return `
          <div class="messenger-message incoming" id="student-msg-row-${m.id}" style="display: flex; align-items: flex-end; gap: 0.65rem; align-self: flex-start; max-width: 75%;">
            ${activeConv.tutor_avatar ? `
              <img src="${activeConv.tutor_avatar}" alt="${this.escapeHtml(activeConv.tutor_name)}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />
            ` : `
              <div style="width: 30px; height: 30px; border-radius: 50%; background: rgba(198, 138, 40, 0.15); color: var(--gold-700); font-weight: 700; font-size: 0.78rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                ${this.escapeHtml(activeConv.tutor_name.charAt(0).toUpperCase())}
              </div>
            `}
            <div>
              <div class="messenger-bubble" style="background: #F3F4F6; color: #1F2937; border-radius: 18px 18px 18px 4px; padding: 0.85rem 1.15rem; font-size: 0.92rem; line-height: 1.5; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);">
                <div id="student-msg-content-${m.id}">${this.formatMessageBody(m)}</div>
              </div>
              <div style="margin-top: 0.25rem; font-size: 0.72rem; color: #9CA3AF; padding-left: 0.25rem;">
                <span>${timeStr}</span>
                ${m.is_edited ? '<span class="messenger-edited-tag">(edited)</span>' : ''}
              </div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="messenger-message outgoing" id="student-msg-row-${m.id}" style="display: flex; flex-direction: column; align-items: flex-end; align-self: flex-end; max-width: 75%;">
            <div class="messenger-bubble" style="background: #1D64F2; color: #FFFFFF; border-radius: 18px 18px 4px 18px; padding: 0.85rem 1.15rem; font-size: 0.92rem; line-height: 1.5; box-shadow: 0 4px 14px rgba(29, 100, 242, 0.22);">
              <div id="student-msg-content-${m.id}" style="color: #FFFFFF;">${this.formatMessageBody(m)}</div>
            </div>
            <div style="margin-top: 0.25rem; font-size: 0.72rem; color: #9CA3AF; padding-right: 0.25rem; display: flex; align-items: center; gap: 0.35rem;">
              <span>${timeStr}</span>
              ${statusHtml ? `<span class="messenger-msg-status">${statusHtml}</span>` : ''}
              ${m.is_edited ? '<span class="messenger-edited-tag">(edited)</span>' : ''}
            </div>
          </div>
        `;
      }
    }).join('');

    this.scrollStudentMessengerToBottom();
  },

  renderStudentContactInfo(container) {
    if (!container) container = document.getElementById('student-messenger-contact-pane');
    if (!container) return;

    const convs = this.getTutorConversations();
    const activeConv = convs.find(c => String(c.tutor_id) === this.activeTutorId);

    if (!activeConv) {
      container.innerHTML = `
        <div style="padding: 2.5rem 1.5rem; text-align: center; color: var(--text-secondary);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">👤</div>
          <h5>No Educator Selected</h5>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="contact-info-header">
        <h4 class="contact-info-title">Contact Info</h4>
      </div>

      <div class="contact-info-hero">
        ${activeConv.tutor_avatar ? `
          <img src="${activeConv.tutor_avatar}" alt="${this.escapeHtml(activeConv.tutor_name)}" class="contact-info-avatar" />
        ` : `
          <div class="contact-info-avatar">
            ${this.escapeHtml(activeConv.tutor_name.charAt(0).toUpperCase())}
          </div>
        `}
        <h3 class="contact-info-name">${this.escapeHtml(activeConv.tutor_name)}</h3>
        <button type="button" class="contact-info-action-btn" title="View Tutor Profile" onclick="window.location.hash='#tutors'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </button>
      </div>

      <div class="contact-info-section">
        <div class="contact-info-section-header">
          <h5 class="contact-info-section-title">About</h5>
        </div>

        <div class="contact-info-list" id="student-contact-info-fields">
          <div class="contact-info-item">
            <span class="contact-info-item-icon">👤</span>
            <div class="contact-info-item-content">
              <div class="contact-info-item-label">Name</div>
              <div class="contact-info-item-val">${this.escapeHtml(activeConv.tutor_name)}</div>
            </div>
          </div>

          <div class="contact-info-item">
            <span class="contact-info-item-icon">🏢</span>
            <div class="contact-info-item-content">
              <div class="contact-info-item-label">Company / Institution</div>
              <div class="contact-info-item-val">${this.escapeHtml(activeConv.tutor_institution || 'Stanford University')}</div>
            </div>
          </div>

          <div class="contact-info-item">
            <span class="contact-info-item-icon">📇</span>
            <div class="contact-info-item-content">
              <div class="contact-info-item-label">Contact list / Specialty</div>
              <div class="contact-info-item-val">${this.escapeHtml(activeConv.tutor_subjects || activeConv.subject || 'Calculus BC')}</div>
            </div>
          </div>

          <div class="contact-info-item">
            <span class="contact-info-item-icon">📞</span>
            <div class="contact-info-item-content">
              <div class="contact-info-item-label">Phone</div>
              <div class="contact-info-item-val">${this.escapeHtml(activeConv.tutor_phone || '+1 254-125-4446')}</div>
            </div>
          </div>

          <div class="contact-info-item">
            <span class="contact-info-item-icon">✉️</span>
            <div class="contact-info-item-content">
              <div class="contact-info-item-label">Rate & Verification</div>
              <div class="contact-info-item-val">$${activeConv.tutor_rate || 45}/hr • Verified Educator</div>
            </div>
          </div>

          <div class="contact-info-item">
            <span class="contact-info-item-icon">📍</span>
            <div class="contact-info-item-content">
              <div class="contact-info-item-label">Country</div>
              <div class="contact-info-item-val">${this.escapeHtml(activeConv.tutor_country || 'United States')}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="contact-info-section" style="border-bottom: none;">
        <div class="contact-info-section-header">
          <h5 class="contact-info-section-title">Notes</h5>
        </div>

        <div class="contact-notes-card">
          <textarea id="student-contact-note-input" class="contact-notes-textarea" placeholder="Write a note..."></textarea>
          <div class="contact-notes-toolbar">
            <div class="contact-notes-tools">
              <button type="button" class="contact-notes-tool-btn" onclick="Student.insertNoteSnippet('@')" title="Mention">@</button>
              <button type="button" class="contact-notes-tool-btn" onclick="Student.insertNoteSnippet('📎 ')" title="Attach file note">📎</button>
              <button type="button" class="contact-notes-tool-btn" onclick="Student.insertNoteSnippet('😊 ')" title="Emoji">😊</button>
            </div>
            <button type="button" class="contact-notes-save-btn" onclick="Student.saveContactNote('${activeConv.tutor_id}')" title="Save Note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
            </button>
          </div>
        </div>

        <div class="contact-notes-list" id="student-contact-notes-list">
          <div style="font-size: 0.78rem; color: var(--text-secondary); text-align: center; padding: 0.75rem 0;">Loading notes...</div>
        </div>
      </div>
    `;

    this.loadContactNotes(activeConv.tutor_id);
  },

  insertNoteSnippet(snippet) {
    const input = document.getElementById('student-contact-note-input');
    if (input) {
      input.value += snippet;
      input.focus();
    }
  },

  async loadContactNotes(contactId) {
    const listEl = document.getElementById('student-contact-notes-list');
    if (!listEl) return;
    try {
      const res = await API.getContactNotes(contactId);
      const notes = res.notes || [];
      if (notes.length === 0) {
        listEl.innerHTML = `
          <div style="font-size: 0.76rem; color: var(--text-secondary); text-align: center; padding: 0.5rem 0;">No notes added yet.</div>
        `;
        return;
      }
      listEl.innerHTML = notes.map(n => {
        const timeStr = n.created_at ? new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        return `
          <div class="contact-note-item" id="student-note-item-${n.id}">
            <div class="contact-note-text">${this.escapeHtml(n.note)}</div>
            <div class="contact-note-meta-row">
              <span>${timeStr}</span>
              <button type="button" class="contact-note-del-btn" onclick="Student.deleteContactNote(${n.id}, '${contactId}')" title="Delete note">×</button>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      listEl.innerHTML = `<div style="font-size: 0.76rem; color: var(--text-secondary); text-align: center; padding: 0.5rem 0;">No notes available.</div>`;
    }
  },

  async saveContactNote(contactId) {
    const input = document.getElementById('student-contact-note-input');
    const text = (input?.value || '').trim();
    if (!text) {
      showToast('Please type a note first.', 'warning');
      return;
    }
    try {
      await API.addContactNote(contactId, text);
      input.value = '';
      showToast('Note saved permanently.', 'success');
      this.loadContactNotes(contactId);
    } catch (err) {
      showToast('Failed to save note.', 'error');
    }
  },

  async deleteContactNote(noteId, contactId) {
    try {
      await API.deleteContactNote(noteId);
      showToast('Note deleted.', 'info');
      this.loadContactNotes(contactId);
    } catch (err) {
      showToast('Failed to delete note.', 'error');
    }
  },

  appendMessageToActiveThread(m) {
    const threadEl = document.getElementById('student-messages-thread-container');
    if (!threadEl) {
      this.renderStudentMessages();
      return;
    }

    const isMe = m.sender_role === 'student';
    const timeStr = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const statusHtml = isMe ? (m.status === 'seen' || m.is_read === 1 ? '• Seen' : '• Delivered') : '';

    const div = document.createElement('div');
    div.className = `messenger-message ${isMe ? 'outgoing' : 'incoming'}`;
    div.id = `student-msg-row-${m.id}`;

    if (isMe) {
      div.style.cssText = 'display: flex; flex-direction: column; align-items: flex-end; align-self: flex-end; max-width: 75%;';
      div.innerHTML = `
        <div class="messenger-bubble" style="background: #1D64F2; color: #FFFFFF; border-radius: 18px 18px 4px 18px; padding: 0.85rem 1.15rem; font-size: 0.92rem; line-height: 1.5; box-shadow: 0 4px 14px rgba(29, 100, 242, 0.22);">
          <div id="student-msg-content-${m.id}" style="color: #FFFFFF;">${this.formatMessageBody(m)}</div>
        </div>
        <div style="margin-top: 0.25rem; font-size: 0.72rem; color: #9CA3AF; padding-right: 0.25rem; display: flex; align-items: center; gap: 0.35rem;">
          <span>${timeStr}</span>
          ${statusHtml ? `<span class="messenger-msg-status">${statusHtml}</span>` : ''}
        </div>
      `;
    } else {
      div.style.cssText = 'display: flex; align-items: flex-end; gap: 0.65rem; align-self: flex-start; max-width: 75%;';
      div.innerHTML = `
        <div style="width: 30px; height: 30px; border-radius: 50%; background: rgba(198, 138, 40, 0.15); color: var(--gold-700); font-weight: 700; font-size: 0.78rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          T
        </div>
        <div>
          <div class="messenger-bubble" style="background: #F3F4F6; color: #1F2937; border-radius: 18px 18px 18px 4px; padding: 0.85rem 1.15rem; font-size: 0.92rem; line-height: 1.5; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);">
            <div id="student-msg-content-${m.id}">${this.formatMessageBody(m)}</div>
          </div>
          <div style="margin-top: 0.25rem; font-size: 0.72rem; color: #9CA3AF; padding-left: 0.25rem;">
            <span>${timeStr}</span>
          </div>
        </div>
      `;
    }

    threadEl.appendChild(div);
    this.scrollStudentMessengerToBottom();
  },

  formatFileSize(bytes) {
    if (!bytes || isNaN(bytes)) return '';
    const b = Number(bytes);
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(1) + ' MB';
  },

  formatMessageBody(m) {
    let html = '';
    const text = (m.content || m.text || '').trim();
    if (text) {
      let escaped = this.escapeHtml(text);
      const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
      escaped = escaped.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="messenger-bubble-link">${url}</a>`;
      });
      escaped = escaped.replace(/\n/g, '<br>');
      html += `<div class="messenger-bubble-text">${escaped}</div>`;
    }

    if (m.attachment_url) {
      const isImg = (m.attachment_type && m.attachment_type.startsWith('image/')) ||
                    /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(m.attachment_url) ||
                    /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(m.attachment_name || '');
      if (isImg) {
        html += `
          <div class="messenger-bubble-img-wrap">
            <img src="${m.attachment_url}" alt="${this.escapeHtml(m.attachment_name || 'Photo')}" class="messenger-bubble-img" onclick="window.open('${m.attachment_url}', '_blank')" />
          </div>
        `;
      } else {
        html += `
          <a href="${m.attachment_url}" target="_blank" download="${this.escapeHtml(m.attachment_name || 'attachment')}" class="messenger-file-attachment">
            <span class="messenger-file-icon">📄</span>
            <div class="messenger-file-details">
              <span class="messenger-file-name">${this.escapeHtml(m.attachment_name || 'Download Attachment')}</span>
              <span class="messenger-file-size">${this.formatFileSize(m.attachment_size)}</span>
            </div>
            <span class="messenger-file-download-icon">⬇</span>
          </a>
        `;
      }
    }
    return html;
  },

  renderAttachmentPreview() {
    const previewEl = document.getElementById('student-composer-attachment-preview');
    if (!previewEl) return;
    const att = this.pendingMessageAttachment;
    if (!att) {
      previewEl.style.display = 'none';
      previewEl.innerHTML = '';
      return;
    }

    const isImg = att.type && att.type.startsWith('image/');
    previewEl.style.display = 'flex';
    previewEl.innerHTML = `
      <div class="messenger-attachment-preview">
        ${isImg ? `
          <img src="${att.url}" alt="${this.escapeHtml(att.name)}" class="messenger-attachment-thumb" />
        ` : `
          <span class="messenger-attachment-icon-chip">📎</span>
        `}
        <div class="messenger-attachment-info">
          <span class="messenger-attachment-name">${this.escapeHtml(att.name)}</span>
          <span class="messenger-attachment-meta">${this.formatFileSize(att.size)}</span>
        </div>
        <button type="button" class="messenger-attachment-remove" onclick="Student.removePendingAttachment()" title="Remove attachment">×</button>
      </div>
    `;
  },

  removePendingAttachment() {
    this.pendingMessageAttachment = null;
    this.renderAttachmentPreview();
  },

  triggerPictureUpload() {
    const inp = document.getElementById('student-messenger-pic-input');
    if (inp) {
      inp.value = '';
      inp.click();
    }
  },

  triggerFileUpload() {
    const inp = document.getElementById('student-messenger-doc-input');
    if (inp) {
      inp.value = '';
      inp.click();
    }
  },

  async handleAttachmentUpload(inputEl, isPic) {
    if (!inputEl || !inputEl.files || inputEl.files.length === 0) return;
    const file = inputEl.files[0];

    if (file.size > 15 * 1024 * 1024) {
      showToast('File exceeds 15MB size limit.', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      showToast('Uploading attachment...', 'info');
      const res = await API.uploadMessageAttachment(formData);
      if (res && res.url) {
        this.pendingMessageAttachment = {
          url: res.url,
          name: res.name || file.name,
          type: res.type || file.type,
          size: res.size || file.size
        };
        this.renderAttachmentPreview();
        showToast('Attachment ready to send.', 'success');
      } else {
        showToast('Upload did not return URL.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to upload attachment.', 'error');
    }
  },

  insertLinkPrompt() {
    const url = prompt('Enter the link / URL to share with your tutor (e.g. https://...):');
    if (!url) return;
    const cleanUrl = url.trim();
    if (!cleanUrl) return;
    const validUrl = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(cleanUrl) ? cleanUrl : 'https://' + cleanUrl;

    const textarea = document.getElementById('student-composer-input');
    if (textarea) {
      const space = textarea.value.length > 0 && !textarea.value.endsWith(' ') ? ' ' : '';
      textarea.value = textarea.value + space + validUrl + ' ';
      textarea.focus();
    }
  },

  async sendStudentMessage() {
    const input = document.getElementById('student-composer-input');
    const text = input ? input.value.trim() : '';
    const attachment = this.pendingMessageAttachment;

    if (!text && !attachment) return;

    const convs = this.getTutorConversations();
    const activeConv = convs.find(c => String(c.tutor_id) === this.activeTutorId);
    if (!activeConv) return;

    const targetTutorId = activeConv.tutor_id;
    if (!targetTutorId) {
      showToast('Could not identify educator recipient.', 'error');
      return;
    }

    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }
    this.pendingMessageAttachment = null;
    this.renderAttachmentPreview();

    const currentStudentId = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser.id : null;
    const clientTempId = 'temp-' + Date.now();
    const tempMsg = {
      id: clientTempId,
      sender_role: 'student',
      sender_id: currentStudentId,
      receiver_id: targetTutorId,
      tutor_user_id: targetTutorId,
      subject: activeConv.subject || 'Student Inquiry',
      content: text,
      text: text,
      attachment_url: attachment ? attachment.url : null,
      attachment_name: attachment ? attachment.name : null,
      attachment_type: attachment ? attachment.type : null,
      attachment_size: attachment ? attachment.size : null,
      status: 'delivered',
      is_read: 0,
      is_edited: 0,
      created_at: new Date().toISOString()
    };

    this.studentMessages.push(tempMsg);
    this.appendMessageToActiveThread(tempMsg);
    this.updateSidebarConversations();

    try {
      const user = Auth.currentUser;
      let res;
      if (API.sendStudentMessage) {
        try {
          res = await API.sendStudentMessage({
            tutor_id: targetTutorId,
            tutor_user_id: targetTutorId,
            subject: activeConv.subject || 'Student Inquiry',
            message: text,
            attachment_url: attachment ? attachment.url : null,
            attachment_name: attachment ? attachment.name : null,
            attachment_type: attachment ? attachment.type : null,
            attachment_size: attachment ? attachment.size : null
          });
        } catch (e) {}
      }
      if (!res) {
        res = await API.sendMessageToTutor(targetTutorId, {
          name: user?.name || 'Student',
          email: user?.email || '',
          subject: activeConv.subject || `Student Inquiry`,
          message: text,
          attachment_url: attachment ? attachment.url : null,
          attachment_name: attachment ? attachment.name : null,
          attachment_type: attachment ? attachment.type : null,
          attachment_size: attachment ? attachment.size : null
        });
      }

      if (res && (res.message || res.data)) {
        const payload = res.message || res.data;
        tempMsg.id = payload.id;
        tempMsg.sender_role = 'student';
        tempMsg.sender_id = currentStudentId;
        tempMsg.receiver_id = targetTutorId;
        tempMsg.tutor_user_id = targetTutorId;
        tempMsg.created_at = payload.created_at || tempMsg.created_at;
        tempMsg.status = payload.status || tempMsg.status;
        const row = document.getElementById(`student-msg-row-${clientTempId}`);
        if (row) row.id = `student-msg-row-${payload.id}`;
      }
    } catch (err) {
      console.warn('Student send message warning:', err);
    }
  }
};

window.Student = Student;
