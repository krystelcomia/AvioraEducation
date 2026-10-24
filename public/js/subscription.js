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
          <button class="btn btn-outline-gold btn-sm" onclick="Tutors.openBookingModal(${t.id})" style="padding: 0.35rem 0.75rem; font-size: 0.75rem;">Rebook →</button>
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

  // OPEN INTERACTIVE SUBSCRIPTION & TUTOR SCHEDULING STUDIO
  async openEnrollmentModal(packageKey) {
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

    // Strictly enforce 1-time trial limit
    if (packageKey === 'trial' && this.data?.trialUsed) {
      showToast('The free trial is a one-time offer ($0) and has already been availed by this student account.', 'warning');
      return;
    }

    this.activePackageKey = packageKey;
    this.selectedDate = null;
    this.selectedTime = null;

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

    const pkgDefs = {
      'trial': {
        name: 'One-Time Free Trial Lesson',
        totalLessons: 1,
        priceStr: '$0.00',
        meta: '1 Single Diagnostic Lesson • 30 Minutes • One-time offer ($0)',
        badge: 'Free (1-Time Offer)',
        durationLabel: '30-Min Diagnostic Lesson',
        durationMinutes: 30,
        isTrial: true
      },
      '4_lessons': {
        name: 'Starter Tier: 4 Lessons Package',
        totalLessons: 4,
        priceStr: '$220.00',
        meta: '4 Lessons • 50 Minutes each • Valid for 1 Month (30 Days)',
        badge: 'Starter Package',
        durationLabel: '50-Min Class',
        durationMinutes: 50,
        isTrial: false
      },
      '8_lessons': {
        name: 'Mastery Tier: 8 Lessons Package',
        totalLessons: 8,
        priceStr: '$399.00',
        meta: '8 Lessons • 50 Minutes each • Valid for 1 Month (30 Days)',
        badge: 'Most Popular',
        durationLabel: '50-Min Class',
        durationMinutes: 50,
        isTrial: false
      },
      '12_lessons': {
        name: 'Honors Tier: 12 Lessons Package',
        totalLessons: 12,
        priceStr: '$540.00',
        meta: '12 Lessons • 50 Minutes each • Valid for 1 Month (30 Days)',
        badge: 'Best Value',
        durationLabel: '50-Min Class',
        durationMinutes: 50,
        isTrial: false
      }
    };

    const pkg = pkgDefs[packageKey] || pkgDefs['4_lessons'];

    // Update banner UI
    document.getElementById('sub-enroll-plan-name').textContent = pkg.name;
    document.getElementById('sub-enroll-plan-meta').textContent = pkg.meta;
    document.getElementById('sub-enroll-plan-price').textContent = pkg.priceStr;
    document.getElementById('sub-enroll-badge').textContent = pkg.badge;
    document.getElementById('sub-enroll-slot-duration-badge').textContent = pkg.durationLabel;
    document.getElementById('sub-summary-duration-text').textContent = `${pkg.durationMinutes} Minutes`;
    document.getElementById('sub-summary-amount-text').textContent = pkg.priceStr;

    // Populate tutors dropdown
    const tutorSelect = document.getElementById('sub-enroll-tutor-select');
    if (tutorSelect && this.allTutors.length > 0) {
      tutorSelect.innerHTML = this.allTutors.map(t => `
        <option value="${t.id}">${t.name} — ${t.headline || t.subject || 'Faculty Specialist'} ($${t.hourly_rate}/hr)</option>
      `).join('');

      // Default select first tutor
      this.selectedTutor = this.allTutors[0];
      tutorSelect.value = this.selectedTutor.id;
    }

    // Populate lesson allocation dropdown based on package
    const allocSelect = document.getElementById('sub-enroll-lesson-count');
    const planTag = document.getElementById('sub-enroll-total-plan-tag');
    if (allocSelect) {
      if (pkg.isTrial) {
        allocSelect.innerHTML = `<option value="1">1 Lesson (Free Trial)</option>`;
        allocSelect.disabled = true;
        this.allocatedLessons = 1;
        if (planTag) planTag.textContent = 'One-time offer for $0 (single 30-min lesson)';
      } else {
        allocSelect.disabled = false;
        let optionsHtml = '';
        for (let i = 1; i <= pkg.totalLessons; i++) {
          const isSelected = i === pkg.totalLessons ? 'selected' : '';
          optionsHtml += `<option value="${i}" ${isSelected}>${i} Lesson${i > 1 ? 's' : ''}</option>`;
        }
        allocSelect.innerHTML = optionsHtml;
        this.allocatedLessons = pkg.totalLessons;
        if (planTag) planTag.textContent = `Plan includes ${pkg.totalLessons} lessons total`;
      }
    }

    // Update educator preview & availability
    if (this.selectedTutor) {
      this.onTutorSelected(this.selectedTutor.id);
    }

    // Disable submit until slot picked
    const submitBtn = document.getElementById('btn-sub-enroll-submit');
    if (submitBtn) {
      submitBtn.disabled = true;
      document.getElementById('sub-enroll-btn-label').textContent = pkg.isTrial 
        ? 'Book Free Trial Lesson ($0)' 
        : `Confirm Enrollment & Schedule Lesson`;
    }

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

  onTutorSelected(tutorId) {
    const tutor = this.allTutors.find(t => t.id == tutorId) || this.allTutors[0];
    if (!tutor) return;
    this.selectedTutor = tutor;

    // Update preview card
    const avatarEl = document.getElementById('sub-enroll-tutor-avatar');
    const nameEl = document.getElementById('sub-enroll-tutor-name');
    const headlineEl = document.getElementById('sub-enroll-tutor-headline');
    const ratingEl = document.getElementById('sub-enroll-tutor-rating');

    if (avatarEl) avatarEl.src = tutor.avatar_url || tutor.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';
    if (nameEl) nameEl.textContent = tutor.name;
    if (headlineEl) headlineEl.textContent = tutor.headline || tutor.subject || 'Verified Faculty Specialist';
    if (ratingEl) ratingEl.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 0.25rem;">${Icons.star(13)} ${tutor.rating ? Number(tutor.rating).toFixed(1) : '5.0'} (${tutor.reviews_count || 12})</span>`;

    // Populate subject select
    const subjectSelect = document.getElementById('sub-enroll-subject-select');
    if (subjectSelect) {
      const subjects = Array.isArray(tutor.subjects)
        ? tutor.subjects
        : (tutor.subjects ? tutor.subjects.split(',').map(s => s.trim()).filter(Boolean) : ['Mathematics', 'Science']);
      subjectSelect.innerHTML = subjects.map(s => `<option value="${s}">${s}</option>`).join('');
    }

    this.onAllocationChanged(this.allocatedLessons);
    this.renderCalendar();
    this.updateSummary();
  },

  onAllocationChanged(count) {
    this.allocatedLessons = parseInt(count, 10) || 1;
    const noteEl = document.getElementById('sub-enroll-allocation-note');
    const tutorName = this.selectedTutor ? this.selectedTutor.name : 'this educator';

    if (this.activePackageKey === 'trial') {
      if (noteEl) noteEl.textContent = `Single 30-minute introductory lesson with ${tutorName} at $0 cost.`;
    } else {
      const pkgTotals = { '4_lessons': 4, '8_lessons': 8, '12_lessons': 12 };
      const total = pkgTotals[this.activePackageKey] || 4;
      const remaining = total - this.allocatedLessons;
      if (noteEl) {
        if (remaining > 0) {
          noteEl.textContent = `Allocating ${this.allocatedLessons} of ${total} lessons with ${tutorName}. Your remaining ${remaining} lesson${remaining > 1 ? 's' : ''} can be booked with any tutor anytime!`;
        } else {
          noteEl.textContent = `Allocating all ${total} lessons from your plan with ${tutorName}.`;
        }
      }
    }

    this.updateSummary();
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
    this.selectedTime = null;
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
    const isTrial = this.activePackageKey === 'trial';

    blocks.forEach(b => {
      const parts = b.split('-').map(s => s.trim());
      if (parts.length === 2) {
        const startH = parseInt(parts[0].split(':')[0], 10);
        const endH = parseInt(parts[1].split(':')[0], 10);

        for (let h = startH; h < endH; h++) {
          if (isTrial) {
            // 30-minute slots for trial
            const slot1Start = `${String(h).padStart(2, '0')}:00`;
            const slot1End = `${String(h).padStart(2, '0')}:30`;
            const slot2Start = `${String(h).padStart(2, '0')}:30`;
            const slot2End = `${String(h + 1).padStart(2, '0')}:00`;

            slots.push({ start: slot1Start, end: slot1End, key: `${slot1Start} - ${slot1End}`, hour: h, minute: '00' });
            slots.push({ start: slot2Start, end: slot2End, key: `${slot2Start} - ${slot2End}`, hour: h, minute: '30' });
          } else {
            // 50-minute slots for regular subscription
            const slotStart = `${String(h).padStart(2, '0')}:00`;
            const slotEnd = `${String(h).padStart(2, '0')}:50`;
            slots.push({ start: slotStart, end: slotEnd, key: `${slotStart} - ${slotEnd}`, hour: h, minute: '00' });
          }
        }
      }
    });

    const slotsContainer = document.getElementById('sub-enroll-slots-container');
    const submitBtn = document.getElementById('btn-sub-enroll-submit');
    if (submitBtn) submitBtn.disabled = true;

    if (!slotsContainer) return;

    if (slots.length === 0) {
      slotsContainer.innerHTML = '<div style="color: var(--charcoal-500); font-size: 0.85rem; grid-column: 1 / -1;">No slots available on this day.</div>';
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
      const displayLabel = isTrial
        ? `${String(h12).padStart(2, '0')}:${slot.minute} ${ampm} (30 min)`
        : `${String(h12).padStart(2, '0')}:00 - ${String(h12).padStart(2, '0')}:50 ${ampm}`;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'booking-slot-btn';
      btn.innerHTML = `<span>${displayLabel}</span>`;

      if (isUnder3Hours) {
        btn.disabled = true;
        btn.classList.add('disabled');
        btn.title = 'Requires minimum 3 hours advance notice';
      } else {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#sub-enroll-slots-container .booking-slot-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          this.selectedTime = slot.key;
          if (submitBtn) submitBtn.disabled = false;
          this.updateSummary();
        });
      }

      slotsContainer.appendChild(btn);
    });

    this.updateSummary();
  },

  updateSummary() {
    const pkgLabels = {
      'trial': 'Free Trial Lesson ($0.00)',
      '4_lessons': 'Starter Tier: 4 Lessons Package ($220.00)',
      '8_lessons': 'Mastery Tier: 8 Lessons Package ($399.00)',
      '12_lessons': 'Honors Tier: 12 Lessons Package ($540.00)'
    };

    const isTrial = this.activePackageKey === 'trial';
    const planText = pkgLabels[this.activePackageKey] || this.activePackageKey;
    const tutorText = this.selectedTutor ? this.selectedTutor.name : 'None selected';
    const allocText = isTrial ? '1 Lesson (Complimentary Trial)' : `${this.allocatedLessons} Lesson${this.allocatedLessons > 1 ? 's' : ''} with this educator`;

    let schedText = 'Please pick date & time above';
    if (this.selectedDate && this.selectedTime) {
      schedText = `${this.selectedDate} at ${this.selectedTime}`;
    } else if (this.selectedDate) {
      schedText = `${this.selectedDate} (Select a time slot)`;
    }

    const planEl = document.getElementById('sub-summary-plan-text');
    const tutorEl = document.getElementById('sub-summary-tutor-text');
    const allocEl = document.getElementById('sub-summary-alloc-text');
    const schedEl = document.getElementById('sub-summary-schedule-text');
    const durEl = document.getElementById('sub-summary-duration-text');

    if (planEl) planEl.textContent = planText;
    if (tutorEl) tutorEl.textContent = tutorText;
    if (allocEl) allocEl.textContent = allocText;
    if (schedEl) schedEl.textContent = schedText;
    if (durEl) durEl.textContent = isTrial ? '30 Minutes' : '50 Minutes';
  },

  async confirmEnrollment() {
    if (!this.selectedTutor) {
      showToast('Please select an Aviora educator.', 'warning');
      return;
    }

    if (!this.selectedDate || !this.selectedTime) {
      showToast('Please select your preferred date and time slot from the educator’s calendar.', 'warning');
      return;
    }

    const subjectSelect = document.getElementById('sub-enroll-subject-select');
    const chosenSubject = subjectSelect ? subjectSelect.value : (this.selectedTutor.subject || 'General Tutoring');
    const notesInput = document.getElementById('sub-enroll-notes');
    const notes = notesInput ? notesInput.value.trim() : '';

    const submitBtn = document.getElementById('btn-sub-enroll-submit');
    const originalText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Confirming &amp; Reserving Slot...</span>`;
    }

    try {
      const payload = {
        package_key: this.activePackageKey,
        tutor_id: this.selectedTutor.id,
        lessons_with_tutor: this.allocatedLessons,
        subject: chosenSubject,
        scheduled_date: this.selectedDate,
        scheduled_time: this.selectedTime,
        notes: notes
      };

      const res = await API.purchaseSubscription(payload);
      showToast(res.message, 'success');

      this.closeEnrollmentModal();
      await this.loadSubscriptionHub();

      // Refresh student dashboard and schedule if on page
      if (typeof Student !== 'undefined' && Student.loadDashboard) {
        Student.loadDashboard();
      }

    } catch (err) {
      showToast(err.message || 'Failed to process subscription enrollment.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    }
  }
};
