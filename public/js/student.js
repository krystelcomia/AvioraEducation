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
    } catch (e) {}
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
      <div class="spotlight-mission-control">
        <div class="mission-control-header">
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">

            <span class="mission-countdown-badge" title="Estimated countdown to session start" style="${nextSession.room_status === 'open' ? 'background: rgba(16, 185, 129, 0.12); color: #059669; border-color: rgba(16, 185, 129, 0.3);' : ''}">
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
                <strong>Instructor Update:</strong> "${escapeHtmlStr(nextSession.tutor_response_note)}"
              </div>
            ` : ''}

            ${nextSession.room_status !== 'open' ? `
              <div style="margin-top: 0.45rem; padding: 0.45rem 0.7rem; background: #F9FAFB; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 8px; font-size: 0.8rem; color: var(--charcoal-700); font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem;">
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

        <div style="display: flex; justify-content: flex-end; align-items: center; min-width: 0;">
          ${r.review_rating ? `
            <div style="text-align: right;">
              <div style="color: #F59E0B; display: inline-flex; align-items: center; gap: 2px;">
                ${Array.from({length: Math.min(5, Math.max(1, r.review_rating))}).map(() => Icons.star(13)).join('')}
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

  setupRealTimeRoomPolling() {
    if (this.roomStatusPollTimer) {
      clearInterval(this.roomStatusPollTimer);
      this.roomStatusPollTimer = null;
    }

    const nextAccepted = (this.requests || []).find(r => r.status === 'accepted' && r.room_status !== 'ended');
    if (!nextAccepted) return;

    this.roomStatusPollTimer = setInterval(async () => {
      const currentHash = window.location.hash || '';
      if (!currentHash.includes('student') && !currentHash.includes('dashboard') && currentHash !== '') {
        clearInterval(this.roomStatusPollTimer);
        this.roomStatusPollTimer = null;
        return;
      }

      try {
        const check = await API.getRoomDetails(nextAccepted.id);
        const isOpen = !!(check && (check.is_open || check.room_status === 'open'));
        if (isOpen && nextAccepted.room_status !== 'open') {
          nextAccepted.room_status = 'open';
          this.renderSpotlightSession();
          this.renderSchedule();
          this.renderRequestsList();
          showToast(`${nextAccepted.tutor_name} has opened the virtual classroom! Click "Join Class" to enter.`, 'success');
          if (typeof Auth !== 'undefined' && Auth.loadNotifications) {
            Auth.loadNotifications();
          }
        } else if (!isOpen && nextAccepted.room_status === 'open') {
          nextAccepted.room_status = 'closed';
          this.renderSpotlightSession();
          this.renderSchedule();
          this.renderRequestsList();
        }
      } catch (e) {
        // Silently catch background poll issues
      }
    }, 3000);
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
  }
};