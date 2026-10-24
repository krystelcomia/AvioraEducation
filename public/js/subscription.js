/**
 * AVIORA EDUCATION - STUDENT SUBSCRIPTION MODULE
 */
const StudentSub = {
  data: null,
  activePackageKey: 'trial',
  allTutors: [],
  selectedTutor: null,
  allocatedLessons: 1,
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  selectedDate: null,
  selectedTime: null,

  async init() {
    this.setupEventListeners();
  },

  setupEventListeners() {
    const overlay = document.getElementById('sub-enrollment-modal');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeEnrollmentModal();
      });
    }
  },

  async loadSubscriptionHub() {
    const user = Auth.currentUser;
    if (!user || user.role !== 'student') return;

    try {
      const res = await API.getStudentSubscription();
      this.data = res;
      this.renderHub(res);
    } catch (err) {
      console.error('Failed to load student subscription:', err);
      showToast('Could not load subscription details: ' + (err.message || 'Server error'), 'error');
    }
  },

  renderHub(data) {
    if (!data) return;

    // Update user meta in header
    const user = Auth.currentUser;
    const nameEl = document.getElementById('student-sub-name');
    const avatarEl = document.getElementById('student-sub-avatar');
    if (nameEl && user) nameEl.textContent = user.name;
    if (avatarEl && user && user.avatar_url) avatarEl.src = user.avatar_url;

    // Active subscription card
    const activeSub = data.activeSubscription;
    const activePlanEl = document.getElementById('sub-active-plan-name');
    const activeStatusEl = document.getElementById('sub-active-status');
    const lessonsRemEl = document.getElementById('sub-lessons-remaining');
    const lessonsTotEl = document.getElementById('sub-lessons-total');
    const progressFill = document.getElementById('sub-lessons-progress');
    const expiryDateEl = document.getElementById('sub-active-expiry-date');
    const daysLeftEl = document.getElementById('sub-active-days-left');

    if (activeSub) {
      if (activePlanEl) activePlanEl.textContent = activeSub.plan_name;
      if (activeStatusEl) activeStatusEl.textContent = 'Active • Upfront Paid';
      if (lessonsRemEl) lessonsRemEl.textContent = activeSub.lessons_remaining;
      if (lessonsTotEl) lessonsTotEl.textContent = activeSub.lessons_total;
      if (progressFill) {
        const pct = Math.min(100, Math.round((activeSub.lessons_remaining / activeSub.lessons_total) * 100));
        progressFill.style.width = `${pct}%`;
      }
      if (expiryDateEl) expiryDateEl.textContent = activeSub.formatted_expires_at;
      if (daysLeftEl) daysLeftEl.textContent = `${activeSub.days_remaining} Days Remaining`;
    } else {
      if (activePlanEl) activePlanEl.textContent = 'No Active Subscription';
      if (activeStatusEl) activeStatusEl.textContent = 'Inactive';
      if (lessonsRemEl) lessonsRemEl.textContent = '0';
      if (lessonsTotEl) lessonsTotEl.textContent = '0';
      if (progressFill) progressFill.style.width = '0%';
      if (expiryDateEl) expiryDateEl.textContent = 'N/A';
      if (daysLeftEl) daysLeftEl.textContent = '0 Days';
    }

    // Total Spending
    const spendingEl = document.getElementById('sub-total-spending');
    if (spendingEl) {
      const val = typeof data.totalSpending === 'number' ? data.totalSpending : 0.00;
      spendingEl.textContent = `$${val.toFixed(2)}`;
    }

    // Most-Studied Subjects
    const subjectsList = document.getElementById('sub-most-studied-list');
    if (subjectsList && Array.isArray(data.mostStudiedSubjects)) {
      subjectsList.innerHTML = data.mostStudiedSubjects.map(sub => `
        <div class="sub-subject-item" style="margin-bottom: 0.95rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; font-size: 0.88rem;">
            <strong style="color: var(--charcoal-900); font-weight: 700;">${sub.subject}</strong>
            <span style="color: var(--gold-600); font-weight: 600; font-size: 0.82rem;">${sub.session_count} lessons • ${sub.total_hours} hrs</span>
          </div>
          <div style="height: 7px; background: rgba(0,0,0,0.06); border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${sub.percentage}%; background: var(--gradient-gold); border-radius: 4px;"></div>
          </div>
        </div>
      `).join('');
    }

    // Preferred Tutors
    const tutorsList = document.getElementById('sub-preferred-tutors-list');
    if (tutorsList && Array.isArray(data.preferredTutors)) {
      tutorsList.innerHTML = data.preferredTutors.map(t => `
        <div class="sub-tutor-item" style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border-light);">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <img src="${t.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--gold-400);" />
            <div>
              <div style="font-weight: 700; color: var(--charcoal-900); font-size: 0.92rem;">${t.name}</div>
              <div style="font-size: 0.78rem; color: var(--text-secondary);">${t.subject || 'Faculty'} • $${t.hourly_rate}/hr</div>
            </div>
          </div>
          <button class="btn btn-outline-gold btn-sm" onclick="Tutors.openMessageModal(${t.id})" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.3rem;">${Icons.message(12)} Message</button>
        </div>
      `).join('');
    }

    // Trial button state & strictly 1-time limit enforcement ($0 free trial)
    const trialBtn = document.getElementById('btn-buy-trial');
    const trialBadge = document.getElementById('badge-trial-status');
    if (trialBtn) {
      if (data.trialUsed) {
        trialBtn.disabled = true;
        trialBtn.classList.remove('btn-outline-gold');
        trialBtn.classList.add('btn-secondary');
        trialBtn.style.opacity = '0.55';
        trialBtn.style.cursor = 'not-allowed';
        trialBtn.textContent = 'Trial Used (1-Time Limit)';
        if (trialBadge) {
          trialBadge.textContent = 'Used • 1-Time Limit';
          trialBadge.style.color = 'var(--text-secondary)';
          trialBadge.style.borderColor = 'rgba(0,0,0,0.15)';
        }
      } else {
        trialBtn.disabled = false;
        trialBtn.classList.remove('btn-secondary');
        trialBtn.classList.add('btn-outline-gold');
        trialBtn.style.opacity = '1';
        trialBtn.style.cursor = 'pointer';
        trialBtn.textContent = 'Book Free Trial ($0)';
        if (trialBadge) {
          trialBadge.textContent = 'Available (1-Time Use)';
          trialBadge.style.color = 'var(--gold-700)';
          trialBadge.style.borderColor = 'rgba(198, 138, 40, 0.4)';
        }
      }
    }
  },

  purchasePlan(planKey) {
    const user = typeof Auth !== 'undefined' ? Auth.currentUser : null;
    if (!user) {
      sessionStorage.setItem('pending_subscription_plan', planKey);
      showToast('Please log in to your account to purchase a subscription.', 'info');
      if (typeof Auth !== 'undefined' && Auth.closeModal) {
        Auth.closeModal();
      }
      window.location.hash = '#login';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (user.role !== 'student') {
      showToast('Please log in with a student account to purchase a subscription.', 'warning');
      return;
    }

    const packageMap = {
      'scholar': '4_lessons',
      'honors': '8_lessons'
    };
    const packageKey = packageMap[planKey] || '4_lessons';
    window.location.hash = '#student-subscriptions';
    setTimeout(() => {
      this.openEnrollmentModal(packageKey);
    }, 350);
  },

  buyPackage(packageKey) {
    this.openEnrollmentModal(packageKey);
  },

  // OPEN INTERACTIVE SUBSCRIPTION & 4 LESSONS SCHEDULING STUDIO
  async openEnrollmentModal(packageKey = '4_lessons') {
    const user = typeof Auth !== 'undefined' ? Auth.currentUser : null;
    if (!user) {
      sessionStorage.setItem('pending_subscription_package', packageKey);
      showToast('Please log in to your account to avail of a subscription.', 'info');
      if (typeof Auth !== 'undefined' && Auth.closeModal) {
        Auth.closeModal();
      }
      window.location.hash = '#login';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (user.role !== 'student') {
      showToast('Please log in with a student account to purchase a subscription.', 'warning');
      return;
    }

    this.activePackageKey = packageKey;

    const modal = document.getElementById('sub-enrollment-modal');
    if (!modal) return;

    // Load tutors list if needed
    if (this.allTutors.length === 0) {
      try {
        const res = await API.getTutors();
        this.allTutors = res.tutors || [];
      } catch (e) {
        console.warn('Could not fetch tutors list:', e);
        if (typeof Tutors !== 'undefined' && Tutors.allTutors && Tutors.allTutors.length > 0) {
          this.allTutors = Tutors.allTutors;
        }
      }
    }

    // Default educator
    if (!this.selectedTutor && this.allTutors.length > 0) {
      this.selectedTutor = this.allTutors[0];
    }

    // Populate tutors dropdown
    const tutorSelect = document.getElementById('sub-enroll-tutor-select');
    if (tutorSelect && this.allTutors.length > 0) {
      tutorSelect.innerHTML = this.allTutors.map(t => `
        <option value="${t.id}" ${this.selectedTutor && this.selectedTutor.id === t.id ? 'selected' : ''}>${t.name} — ${t.headline || t.subject || 'Faculty Specialist'} ($${t.hourly_rate}/hr)</option>
      `).join('');
      if (this.selectedTutor) {
        tutorSelect.value = this.selectedTutor.id;
      }
    }

    // Default subject
    const defaultSubject = this.selectedTutor 
      ? (Array.isArray(this.selectedTutor.subjects) ? this.selectedTutor.subjects[0] : (this.selectedTutor.subjects ? this.selectedTutor.subjects.split(',')[0].trim() : 'General Tutoring'))
      : 'General Tutoring';

    // Populate subject select
    const subjectSelect = document.getElementById('sub-enroll-subject-select');
    if (subjectSelect && this.selectedTutor) {
      const subjects = Array.isArray(this.selectedTutor.subjects)
        ? this.selectedTutor.subjects
        : (this.selectedTutor.subjects ? this.selectedTutor.subjects.split(',').map(s => s.trim()).filter(Boolean) : ['Mathematics', 'Science']);
      subjectSelect.innerHTML = subjects.map(s => `<option value="${s}">${s}</option>`).join('');
      subjectSelect.value = defaultSubject;
    }

    // Initialize 4 lessons setup
    const tutorRate = Number(this.selectedTutor?.hourly_rate || 58);
    this.selectedLessons = [0, 1, 2, 3].map(i => ({
      index: i,
      label: `Lesson ${i + 1}`,
      tutor_id: this.selectedTutor?.user_id || this.selectedTutor?.id || 1,
      tutor_name: this.selectedTutor?.name || 'Educator',
      tutor_avatar: this.selectedTutor?.avatar_url || this.selectedTutor?.avatar || '',
      subject: defaultSubject,
      hourly_rate: tutorRate,
      scheduled_date: null,
      scheduled_time: null
    }));

    this.activeLessonIndex = 0;
    this.selectedDate = null;
    this.selectedTime = null;

    // Update educator preview card
    this.updateTutorPreview(this.selectedTutor);

    // Render 4 lesson tabs
    this.renderLessonTabs();

    // Render calendar for active lesson
    this.syncActiveLessonCalendar();

    // Update dynamic calculations and summary
    this.updateSummary();

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeEnrollmentModal() {
    const modal = document.getElementById('sub-enrollment-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  updateTutorPreview(tutor) {
    if (!tutor) return;
    const avatarEl = document.getElementById('sub-enroll-tutor-avatar');
    const nameEl = document.getElementById('sub-enroll-tutor-name');
    const headlineEl = document.getElementById('sub-enroll-tutor-headline');
    const ratingEl = document.getElementById('sub-enroll-tutor-rating');
    const rateEl = document.getElementById('sub-enroll-tutor-rate-display');

    if (avatarEl) avatarEl.src = tutor.avatar_url || tutor.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';
    if (nameEl) nameEl.textContent = tutor.name;
    if (headlineEl) headlineEl.textContent = tutor.headline || tutor.subject || 'Verified Faculty Specialist';
    if (ratingEl) ratingEl.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 0.25rem;">${Icons.star(13)} ${tutor.rating ? Number(tutor.rating).toFixed(1) : '5.0'} (${tutor.reviews_count || 42})</span>`;
    if (rateEl) rateEl.textContent = `$${Number(tutor.hourly_rate || 58).toFixed(2)} / hr`;
  },

  onTutorSelected(tutorId) {
    const tutor = this.allTutors.find(t => t.id == tutorId) || this.allTutors[0];
    if (!tutor) return;
    this.selectedTutor = tutor;

    this.updateTutorPreview(tutor);

    // Update subjects dropdown
    const subjectSelect = document.getElementById('sub-enroll-subject-select');
    let chosenSubject = 'General Tutoring';
    if (subjectSelect) {
      const subjects = Array.isArray(tutor.subjects)
        ? tutor.subjects
        : (tutor.subjects ? tutor.subjects.split(',').map(s => s.trim()).filter(Boolean) : ['Mathematics', 'Science']);
      subjectSelect.innerHTML = subjects.map(s => `<option value="${s}">${s}</option>`).join('');
      chosenSubject = subjects[0] || 'General Tutoring';
      subjectSelect.value = chosenSubject;
    }

    // Apply this tutor & rate to all 4 lessons
    const rate = Number(tutor.hourly_rate || 58);
    const tutorIdToSet = tutor.user_id || tutor.id;
    this.selectedLessons.forEach(l => {
      l.tutor_id = tutorIdToSet;
      l.tutor_name = tutor.name;
      l.tutor_avatar = tutor.avatar_url || tutor.avatar;
      l.subject = chosenSubject;
      l.hourly_rate = rate;
      // Note: preserve scheduled_date/time if already set or allow re-verifying
    });

    this.renderLessonTabs();
    this.syncActiveLessonCalendar();
    this.updateSummary();
  },

  onSubjectSelected(subj) {
    if (!subj) return;
    // Apply subject to all 4 lessons
    this.selectedLessons.forEach(l => {
      l.subject = subj;
    });
    this.renderLessonTabs();
    this.syncActiveLessonCalendar();
    this.updateSummary();
  },

  renderLessonTabs() {
    const grid = document.getElementById('sub-lesson-tabs-grid');
    if (!grid) return;

    grid.innerHTML = this.selectedLessons.map((l, idx) => {
      const isActive = idx === this.activeLessonIndex;
      const isScheduled = !!(l.scheduled_date && l.scheduled_time);

      return `
        <div class="sub-lesson-card ${isActive ? 'active' : ''}" onclick="StudentSub.setActiveLesson(${idx})">
          <div class="lesson-card-header-row">
            <span class="lesson-card-num-badge">Lesson ${idx + 1}</span>
            <span class="lesson-card-status-badge ${isScheduled ? 'status-scheduled' : 'status-pending'}">
              ${isScheduled 
                ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Scheduled' 
                : 'Needs Schedule'}
            </span>
          </div>

          <div style="min-width: 0;">
            <div class="lesson-card-tutor-name" title="${l.tutor_name}">${l.tutor_name}</div>
            <div class="lesson-card-subject-tag" title="${l.subject}">${l.subject}</div>
            <div class="lesson-card-rate-pill">$${Number(l.hourly_rate).toFixed(2)} / 50 min</div>
          </div>

          <div class="lesson-card-datetime ${isScheduled ? 'is-scheduled' : ''}">
            ${isScheduled 
              ? `<div style="display: flex; align-items: center; gap: 0.25rem;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" x2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg> ${l.scheduled_date}</div><div style="font-size: 0.7rem; color: #047857; margin-top: 0.1rem; font-weight: 700;">${l.scheduled_time}</div>`
              : '👉 Click to schedule'}
          </div>
        </div>
      `;
    }).join('');
  },

  setActiveLesson(idx) {
    if (idx < 0 || idx >= this.selectedLessons.length) return;
    this.activeLessonIndex = idx;
    const lesson = this.selectedLessons[idx];

    // Update active banner
    const badgeEl = document.getElementById('sub-active-lesson-badge');
    const titleEl = document.getElementById('sub-active-lesson-title');
    const rateTagEl = document.getElementById('sub-active-lesson-rate-tag');

    if (badgeEl) badgeEl.textContent = `Lesson ${idx + 1} of 4`;
    if (titleEl) {
      if (lesson.scheduled_date && lesson.scheduled_time) {
        titleEl.textContent = `Scheduled: ${lesson.scheduled_date} at ${lesson.scheduled_time} (${lesson.tutor_name})`;
      } else {
        titleEl.textContent = `Select Date & Time with ${lesson.tutor_name} (${lesson.subject})`;
      }
    }
    if (rateTagEl) rateTagEl.textContent = `$${Number(lesson.hourly_rate).toFixed(2)} / session`;

    this.selectedDate = lesson.scheduled_date;
    this.selectedTime = lesson.scheduled_time;

    if (lesson.scheduled_date) {
      const parts = lesson.scheduled_date.split('-');
      if (parts.length === 3) {
        this.calYear = parseInt(parts[0], 10);
        this.calMonth = parseInt(parts[1], 10) - 1;
      }
    }

    this.renderLessonTabs();
    this.syncActiveLessonCalendar();
  },

  syncActiveLessonCalendar() {
    const lesson = this.selectedLessons[this.activeLessonIndex];
    if (!lesson) return;

    const tutor = this.allTutors.find(t => t.id == lesson.tutor_id) || this.selectedTutor;
    if (tutor) this.selectedTutor = tutor;

    this.renderCalendar();

    if (lesson.scheduled_date) {
      this.selectCalendarDate(lesson.scheduled_date);
    } else {
      const label = document.getElementById('sub-enroll-selected-date-label');
      if (label) label.textContent = 'Please click an available date on the calendar';
      const slotsContainer = document.getElementById('sub-enroll-slots-container');
      if (slotsContainer) {
        slotsContainer.innerHTML = '<div style="color: var(--charcoal-500); font-size: 0.85rem; grid-column: 1 / -1; padding: 0.5rem 0;">Click an available date marked above to view open 50-min class slots.</div>';
      }
    }
  },

  prevCalMonth() {
    this.calMonth--;
    if (this.calMonth < 0) {
      this.calMonth = 11;
      this.calYear--;
    }
    this.renderCalendar();
  },

  nextCalMonth() {
    this.calMonth++;
    if (this.calMonth > 11) {
      this.calMonth = 0;
      this.calYear++;
    }
    this.renderCalendar();
  },

  renderCalendar() {
    const grid = document.getElementById('sub-cal-days-grid');
    const label = document.getElementById('sub-cal-month-label');
    if (!grid) return;

    const monthDate = new Date(this.calYear, this.calMonth, 1);
    if (label) {
      label.textContent = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    grid.innerHTML = '';
    const firstDayIndex = monthDate.getDay();
    const daysInMonth = new Date(this.calYear, this.calMonth + 1, 0).getDate();

    const sched = this.selectedTutor?.availability_schedule || {
      Monday: ['09:00 - 12:00', '14:00 - 17:00'],
      Tuesday: ['10:00 - 13:00', '15:00 - 18:00'],
      Wednesday: ['09:00 - 12:00', '14:00 - 17:00'],
      Thursday: ['13:00 - 18:00'],
      Friday: ['09:00 - 15:00']
    };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Blank cells before month starts
    for (let i = 0; i < firstDayIndex; i++) {
      const blank = document.createElement('div');
      blank.className = 'cal-day-cell other-month';
      grid.appendChild(blank);
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(this.calYear, this.calMonth, day);
      const cellTime = cellDate.getTime();
      const dayOfWeekName = dayNames[cellDate.getDay()];
      const isPast = cellTime < todayMidnight;
      const isToday = cellTime === todayMidnight;

      const hasTutorSchedule = !!(sched[dayOfWeekName] && sched[dayOfWeekName].length > 0);
      const isAvailable = !isPast && hasTutorSchedule;

      const dateStr = `${this.calYear}-${String(this.calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = this.selectedDate === dateStr;

      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cal-day-cell';
      cell.textContent = day;

      if (isToday) cell.classList.add('is-today');

      if (!isAvailable) {
        cell.classList.add('disabled');
        cell.disabled = true;
      } else {
        cell.classList.add('available');
        if (isSelected) cell.classList.add('selected');

        cell.addEventListener('click', () => {
          this.selectCalendarDate(dateStr);
        });
      }

      grid.appendChild(cell);
    }
  },

  selectCalendarDate(dateStr) {
    this.selectedDate = dateStr;
    const currentLesson = this.selectedLessons[this.activeLessonIndex];
    this.selectedTime = (currentLesson && currentLesson.scheduled_date === dateStr) ? currentLesson.scheduled_time : null;

    this.renderCalendar();

    const parsedDate = new Date(dateStr + 'T00:00:00');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[parsedDate.getDay()];
    const dateFormatted = parsedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

    const label = document.getElementById('sub-enroll-selected-date-label');
    if (label) label.textContent = dateFormatted;

    const sched = this.selectedTutor?.availability_schedule || {};
    const blocks = sched[dayName] || ['09:00 - 12:00', '14:00 - 17:00'];
    const slots = [];

    blocks.forEach(b => {
      const parts = b.split('-').map(s => s.trim());
      if (parts.length === 2) {
        const startH = parseInt(parts[0].split(':')[0], 10);
        const endH = parseInt(parts[1].split(':')[0], 10);

        for (let h = startH; h < endH; h++) {
          const slotStart = `${String(h).padStart(2, '0')}:00`;
          const slotEnd = `${String(h).padStart(2, '0')}:50`;
          slots.push({ start: slotStart, end: slotEnd, key: `${slotStart} - ${slotEnd}`, hour: h, minute: '00' });
        }
      }
    });

    const slotsContainer = document.getElementById('sub-enroll-slots-container');
    if (!slotsContainer) return;

    if (slots.length === 0) {
      slotsContainer.innerHTML = '<div style="color: var(--charcoal-500); font-size: 0.85rem; grid-column: 1 / -1; padding: 0.5rem 0;">No slots available on this day.</div>';
      return;
    }

    slotsContainer.innerHTML = '';
    const now = Date.now();

    slots.forEach(slot => {
      const slotDateTime = new Date(`${dateStr}T${slot.start}:00`).getTime();
      const isUnder3Hours = (slotDateTime - now) < (3 * 60 * 60 * 1000);

      const h = slot.hour;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const displayLabel = `${String(h12).padStart(2, '0')}:00 - ${String(h12).padStart(2, '0')}:50 ${ampm}`;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'booking-slot-btn';
      btn.innerHTML = `<span>${displayLabel}</span>`;

      const isCurrentSelected = (this.selectedTime === slot.key);
      if (isCurrentSelected) {
        btn.classList.add('selected');
      }

      if (isUnder3Hours) {
        btn.disabled = true;
        btn.classList.add('disabled');
        btn.title = 'Requires minimum 3 hours advance notice';
      } else {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#sub-enroll-slots-container .booking-slot-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          this.selectedTime = slot.key;

          // Save date & time to active lesson
          this.selectedLessons[this.activeLessonIndex].scheduled_date = this.selectedDate;
          this.selectedLessons[this.activeLessonIndex].scheduled_time = slot.key;

          this.renderLessonTabs();
          this.updateSummary();

          // Check for next unscheduled lesson to auto advance
          const nextUnscheduled = this.selectedLessons.findIndex((l, i) => i > this.activeLessonIndex && (!l.scheduled_date || !l.scheduled_time));
          const anyUnscheduled = nextUnscheduled !== -1 
            ? nextUnscheduled 
            : this.selectedLessons.findIndex(l => !l.scheduled_date || !l.scheduled_time);

          if (anyUnscheduled !== -1) {
            showToast(`Lesson ${this.activeLessonIndex + 1} scheduled for ${dateStr} (${slot.key})! Next: pick Lesson ${anyUnscheduled + 1}.`, 'info');
            setTimeout(() => {
              this.setActiveLesson(anyUnscheduled);
            }, 300);
          } else {
            showToast(`All 4 lessons are scheduled! Ready to confirm enrollment.`, 'success');
            const titleEl = document.getElementById('sub-active-lesson-title');
            if (titleEl) {
              titleEl.textContent = `Scheduled: ${dateStr} at ${slot.key} (${this.selectedLessons[this.activeLessonIndex].tutor_name})`;
            }
          }
        });
      }

      slotsContainer.appendChild(btn);
    });
  },

  updateSummary() {
    const totalCost = this.selectedLessons.reduce((sum, l) => sum + (Number(l.hourly_rate) || 0), 0);
    const scheduledLessons = this.selectedLessons.filter(l => l.scheduled_date && l.scheduled_time);
    const scheduledCount = scheduledLessons.length;
    const isComplete = scheduledCount === 4;

    // Top banner price: visible ONLY once all 4 lessons are completely set up
    const planPriceEl = document.getElementById('sub-enroll-plan-price');
    const planPriceCalcEl = document.getElementById('sub-enroll-plan-price-calc');
    if (planPriceEl) {
      if (isComplete) {
        planPriceEl.textContent = `$${totalCost.toFixed(2)}`;
        planPriceEl.style.fontSize = '1.75rem';
        planPriceEl.style.color = 'var(--gold-700)';
      } else {
        planPriceEl.innerHTML = `<span style="font-size: 1.15rem; color: #D97706; font-weight: 700;">Pending Setup</span>`;
      }
    }
    if (planPriceCalcEl) {
      if (isComplete) {
        const rates = this.selectedLessons.map(l => `$${Number(l.hourly_rate).toFixed(0)}`);
        planPriceCalcEl.textContent = `4 Lessons: ${rates.join(' + ')}`;
      } else {
        planPriceCalcEl.textContent = `Visible once all 4 lessons are scheduled (${scheduledCount}/4 set)`;
      }
    }

    // Progress badge
    const progressTag = document.getElementById('sub-enroll-lessons-progress-tag');
    if (progressTag) {
      progressTag.textContent = `${scheduledCount} of 4 Scheduled`;
      if (isComplete) {
        progressTag.style.background = '#10B981';
        progressTag.style.color = '#FFFFFF';
      } else {
        progressTag.style.background = 'rgba(198, 138, 40, 0.15)';
        progressTag.style.color = 'var(--gold-800)';
      }
    }

    // Itemized 4-lesson breakdown list
    const breakdownList = document.getElementById('sub-lessons-breakdown-list');
    if (breakdownList) {
      breakdownList.innerHTML = this.selectedLessons.map((l, i) => {
        const isSet = !!(l.scheduled_date && l.scheduled_time);
        return `
          <div class="sub-lesson-breakdown-row">
            <div>
              <div style="font-weight: 700; color: var(--charcoal-950);">
                Lesson ${i + 1}: ${l.subject}
              </div>
              <div style="font-size: 0.76rem; color: var(--text-secondary); margin-top: 0.1rem;">
                Faculty: <strong>${l.tutor_name}</strong> • 
                ${isSet 
                  ? `<span style="color: #059669; font-weight: 600;">📅 ${l.scheduled_date} at ${l.scheduled_time}</span>` 
                  : `<span style="color: #D97706; font-weight: 600;">Not scheduled yet</span>`}
              </div>
            </div>
            <div style="text-align: right;">
              ${isSet 
                ? `<span style="font-size: 0.95rem; font-weight: 800; color: var(--gold-700); font-family: var(--font-heading);">$${Number(l.hourly_rate).toFixed(2)}</span>` 
                : `<span style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);">Rate: $${Number(l.hourly_rate).toFixed(0)}/hr</span>`}
            </div>
          </div>
        `;
      }).join('');
    }

    // Total text at bottom of summary: visible ONLY once all 4 lessons are completely set up
    const summaryAmountEl = document.getElementById('sub-summary-amount-text');
    if (summaryAmountEl) {
      if (isComplete) {
        summaryAmountEl.textContent = `$${totalCost.toFixed(2)}`;
        summaryAmountEl.style.fontSize = '1.4rem';
        summaryAmountEl.style.color = 'var(--gold-700)';
      } else {
        summaryAmountEl.innerHTML = `<span style="font-size: 0.98rem; color: #D97706; font-weight: 700;">Pending Setup (${scheduledCount}/4)</span>`;
      }
    }

    const calcFormulaEl = document.getElementById('sub-summary-calc-formula');
    if (calcFormulaEl) {
      if (isComplete) {
        calcFormulaEl.textContent = `Sum of 4 lessons: ${this.selectedLessons.map((l, idx) => `Lesson ${idx + 1} ($${Number(l.hourly_rate).toFixed(0)})`).join(' + ')}`;
      } else {
        calcFormulaEl.textContent = `The total amount to be paid will be visible once all 4 lessons are scheduled.`;
      }
    }

    // Submit button
    const submitBtn = document.getElementById('btn-sub-enroll-submit');
    const btnLabel = document.getElementById('sub-enroll-btn-label');
    if (submitBtn) {
      if (isComplete) {
        submitBtn.disabled = false;
        if (btnLabel) btnLabel.textContent = `Confirm 4 Lessons & Pay $${totalCost.toFixed(2)}`;
      } else {
        submitBtn.disabled = true;
        if (btnLabel) btnLabel.textContent = `Please Schedule All 4 Lessons to View Total (${scheduledCount}/4 Scheduled)`;
      }
    }
  },

  async confirmEnrollment() {
    const unscheduled = this.selectedLessons.filter(l => !l.scheduled_date || !l.scheduled_time);
    if (unscheduled.length > 0) {
      showToast(`Please select respective dates and times for all 4 lessons before proceeding.`, 'warning');
      const firstMissing = this.selectedLessons.findIndex(l => !l.scheduled_date || !l.scheduled_time);
      if (firstMissing !== -1) this.setActiveLesson(firstMissing);
      return;
    }

    const notesInput = document.getElementById('sub-enroll-notes');
    const notes = notesInput ? notesInput.value.trim() : '';
    const totalCost = this.selectedLessons.reduce((sum, l) => sum + (Number(l.hourly_rate) || 0), 0);

    const submitBtn = document.getElementById('btn-sub-enroll-submit');
    const originalText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Processing Enrollment &amp; Reserving 4 Lessons...</span>`;
    }

    try {
      const payload = {
        package_key: '4_lessons',
        total_amount: totalCost,
        lessons: this.selectedLessons.map(l => ({
          lesson_number: l.index + 1,
          tutor_id: l.tutor_id,
          tutor_name: l.tutor_name,
          subject: l.subject,
          scheduled_date: l.scheduled_date,
          scheduled_time: l.scheduled_time,
          hourly_rate: l.hourly_rate
        })),
        notes: notes
      };

      const res = await API.purchaseSubscription(payload);
      showToast(res.message, 'success');

      this.closeEnrollmentModal();
      await this.loadSubscriptionHub();

      // Refresh student dashboard and requests if loaded
      if (typeof Student !== 'undefined' && Student.loadDashboard) {
        Student.loadDashboard();
      }

    } catch (err) {
      showToast(err.message || 'Failed to process 4-lesson enrollment.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    }
  }
};
