/**
 * AVIORA EDUCATION - DEDICATED CLASS SETUP & LESSON BOOKING PAGE LOGIC
 */

const BookLesson = {
  allTutors: [],
  selectedTutor: null,
  selectedSubject: '',
  selectedDate: null,
  selectedTime: null,
  studentSubscription: null,
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  paymentMethod: 'subscription',

  async init() {
    this.setupEventListeners();
    await this.loadPage();
  },

  setupEventListeners() {
    // Calendar month nav
    const prevBtn = document.getElementById('page-cal-prev');
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

    const nextBtn = document.getElementById('page-cal-next');
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

    // Subject select change
    const subjSelect = document.getElementById('page-booking-subject-select');
    if (subjSelect) {
      subjSelect.addEventListener('change', (e) => {
        this.selectedSubject = e.target.value;
        const subjSummary = document.getElementById('page-pay-summary-subject');
        if (subjSummary) subjSummary.textContent = this.selectedSubject;
      });
    }

    // Payment method choices
    const paySubCard = document.getElementById('page-pay-method-sub');
    if (paySubCard) {
      paySubCard.addEventListener('click', () => {
        if (!this.studentSubscription || this.studentSubscription.lessons_remaining <= 0) return;
        const opt = document.getElementById('page-pay-opt-sub');
        if (opt) opt.checked = true;
        this.setPaymentMethod('subscription');
      });
    }

    const payCardCard = document.getElementById('page-pay-method-card');
    if (payCardCard) {
      payCardCard.addEventListener('click', () => {
        const opt = document.getElementById('page-pay-opt-card');
        if (opt) opt.checked = true;
        this.setPaymentMethod('card');
      });
    }

    // Confirm & Complete Payment button
    const confirmBtn = document.getElementById('btn-page-confirm-booking');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.handleBookingSubmit());
    }
  },

  async loadPage() {
    const user = Auth.currentUser;
    if (!user) {
      showToast('Please sign in to set up and book a lesson.', 'info');
      window.location.hash = '#login';
      return;
    }

    // 1. Fetch Subscription
    try {
      const subRes = await API.getStudentSubscription();
      this.studentSubscription = subRes.activeSubscription || null;
    } catch (e) {
      this.studentSubscription = null;
    }

    this.renderSubscriptionCard();

    // 2. Fetch Tutors
    try {
      const data = await API.getTutors();
      this.allTutors = data.tutors || [];
    } catch (e) {
      this.allTutors = [];
    }

    if (this.allTutors.length === 0) {
      const list = document.getElementById('page-tutor-selection-list');
      if (list) list.innerHTML = '<div style="color: var(--charcoal-500); padding: 1rem;">No tutors currently available.</div>';
      return;
    }

    // Check if a specific tutor was requested in query (e.g. #book-lesson?tutor_id=2)
    const hashParts = window.location.hash.split('?');
    let preselectedId = null;
    if (hashParts.length > 1) {
      const params = new URLSearchParams(hashParts[1]);
      preselectedId = params.get('tutor_id');
    }

    let defaultTutor = this.allTutors[0];
    if (preselectedId) {
      const found = this.allTutors.find(t => t.id == preselectedId || t.user_id == preselectedId);
      if (found) defaultTutor = found;
    }

    this.renderTutorPicker();
    this.selectTutor(defaultTutor);
  },

  renderSubscriptionCard() {
    const card = document.getElementById('page-booking-subscription-card');
    if (!card) return;

    if (this.studentSubscription && this.studentSubscription.status === 'active') {
      const remaining = this.studentSubscription.lessons_remaining;
      const total = this.studentSubscription.lessons_total;
      const hasCredits = remaining > 0;
      card.className = 'booking-sub-card';
      card.innerHTML = `
        <div class="booking-sub-meta">
          <div class="booking-sub-icon">${Icons.gem(20)}</div>
          <div>
            <div class="booking-sub-title">Your Subscription Status: Active • ${this.studentSubscription.plan_name}</div>
            <div class="booking-sub-desc">
              You have <strong>${remaining}</strong> of ${total} lessons remaining • Valid until ${this.studentSubscription.formatted_expires_at || 'cycle end'}.
              ${hasCredits ? ' You can book this session using 1 lesson credit ($0.00 charge today)!' : ' 0 credits remaining on this cycle.'}
            </div>
          </div>
        </div>
        <div class="booking-sub-badge ${hasCredits ? 'active' : 'empty'}">
          <span>${hasCredits ? '● Active' : '○ 0 Credits'}</span>
          <span>(${remaining} lesson${remaining === 1 ? '' : 's'} remaining)</span>
        </div>
      `;
    } else {
      card.className = 'booking-sub-card inactive';
      card.innerHTML = `
        <div class="booking-sub-meta">
          <div class="booking-sub-icon">${Icons.creditCard(20)}</div>
          <div>
            <div class="booking-sub-title">Your Subscription Status: No Active Plan</div>
            <div class="booking-sub-desc">
              0 lesson credits available. Lessons will be billed per session with Credit or Debit card upon checkout.
            </div>
          </div>
        </div>
        <div class="booking-sub-badge empty">
          <span>○ Standard Card Billing</span>
        </div>
      `;
    }
  },

  renderTutorPicker() {
    const container = document.getElementById('page-tutor-selection-list');
    if (!container) return;

    container.innerHTML = this.allTutors.map(t => `
      <div class="tutor-picker-item ${this.selectedTutor?.id === t.id ? 'selected' : ''}" data-tutor-id="${t.id}">
        <div class="tutor-picker-meta">
          <img src="${t.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}" alt="${t.name}" class="tutor-picker-avatar" />
          <div style="min-width: 0;">
            <div class="tutor-picker-name">${t.name}</div>
            <div class="tutor-picker-sub">${t.headline || t.institution || 'Verified Specialist'}</div>
            <div style="font-size: 0.72rem; color: var(--gold-800); font-weight: 600; margin-top: 0.15rem; display: flex; align-items: center; gap: 0.2rem;">${Icons.star(12)} ${t.rating ? t.rating.toFixed(1) : '5.0'} (${t.reviews_count || 0} reviews)</div>
          </div>
        </div>
        <div class="tutor-picker-rate">
          <div class="tutor-picker-price">$${t.hourly_rate}</div>
          <div class="tutor-picker-badge">per 50-min</div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.tutor-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.tutorId;
        const tutor = this.allTutors.find(t => t.id == id);
        if (tutor) this.selectTutor(tutor);
      });
    });
  },

  selectTutor(tutor) {
    this.selectedTutor = tutor;
    this.selectedDate = null;
    this.selectedTime = null;

    // Update active highlight in picker list
    document.querySelectorAll('.tutor-picker-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.tutorId == tutor.id);
    });

    const tutorBadge = document.getElementById('selected-tutor-badge');
    if (tutorBadge) tutorBadge.textContent = tutor.name;

    const calTutorLabel = document.getElementById('page-cal-tutor-label');
    if (calTutorLabel) calTutorLabel.textContent = `Showing live schedule for ${tutor.name} • $${tutor.hourly_rate}/hour`;

    // Populate Subjects
    const subjSelect = document.getElementById('page-booking-subject-select');
    if (subjSelect) {
      subjSelect.innerHTML = (tutor.subjects || []).map(s => `
        <option value="${s}">${s}</option>
      `).join('');
      this.selectedSubject = subjSelect.value;
    }

    // Reset calendar & slots
    const now = new Date();
    this.calYear = now.getFullYear();
    this.calMonth = now.getMonth();
    this.renderCalendar();

    const slotsContainer = document.getElementById('page-booking-slots-container');
    if (slotsContainer) {
      slotsContainer.innerHTML = '<div style="color: var(--charcoal-500); font-size: 0.85rem; grid-column: 1 / -1; padding: 0.5rem 0;">Please select an available date on the calendar above.</div>';
    }
    const dateLabel = document.getElementById('page-booking-date-label');
    if (dateLabel) dateLabel.textContent = 'Select a date above';

    // Update Order Summary
    const summaryTutor = document.getElementById('page-pay-summary-tutor');
    const summarySubj = document.getElementById('page-pay-summary-subject');
    const summaryAmount = document.getElementById('page-pay-summary-amount');
    const cardAmount = document.getElementById('page-pay-card-amount');

    if (summaryTutor) summaryTutor.textContent = `${tutor.name} (${tutor.highest_degree || 'Specialist'})`;
    if (summarySubj) summarySubj.textContent = this.selectedSubject || (tutor.subjects && tutor.subjects[0]) || 'Tutoring Session';
    if (summaryAmount) summaryAmount.textContent = `$${tutor.hourly_rate.toFixed(2)}`;
    if (cardAmount) cardAmount.textContent = `$${tutor.hourly_rate.toFixed(2)}`;

    // Configure payment radio availability
    this.configurePaymentOptions();

    // Reset button
    const confirmBtn = document.getElementById('btn-page-confirm-booking');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      const textElem = document.getElementById('page-btn-pay-text');
      if (textElem) textElem.textContent = 'Please Select a Date & Time Slot First';
    }
  },

  renderCalendar() {
    const grid = document.getElementById('page-cal-days-grid');
    const label = document.getElementById('page-cal-month-label');
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

    for (let i = 0; i < firstDayIndex; i++) {
      const blank = document.createElement('div');
      blank.className = 'cal-day-cell other-month';
      grid.appendChild(blank);
    }

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
          this.selectDate(dateStr);
        });
      }

      grid.appendChild(cell);
    }
  },

  selectDate(dateStr) {
    this.selectedDate = dateStr;
    this.selectedTime = null;

    this.renderCalendar();

    const parsedDate = new Date(dateStr + 'T00:00:00');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[parsedDate.getDay()];
    const dateFormatted = parsedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

    const label = document.getElementById('page-booking-date-label');
    if (label) label.textContent = dateFormatted;

    // Generate 50-minute slots
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
          slots.push({
            start: slotStart,
            end: slotEnd,
            key: `${slotStart} - ${slotEnd}`,
            hour: h
          });
        }
      }
    });

    const slotsContainer = document.getElementById('page-booking-slots-container');
    const confirmBtn = document.getElementById('btn-page-confirm-booking');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      const textElem = document.getElementById('page-btn-pay-text');
      if (textElem) textElem.textContent = 'Please Pick a 50-Minute Slot';
    }

    if (!slotsContainer) return;

    if (slots.length === 0) {
      slotsContainer.innerHTML = '<div style="color: var(--charcoal-500); font-size: 0.85rem; grid-column: 1 / -1;">No slots available on this day.</div>';
      return;
    }

    slotsContainer.innerHTML = '';
    const now = Date.now();

    slots.forEach(slot => {
      // 3-hour minimum notice
      const slotDateTime = new Date(`${dateStr}T${slot.start}:00`).getTime();
      const isUnder3Hours = (slotDateTime - now) < (3 * 60 * 60 * 1000);

      const h = slot.hour;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const displayLabel = `${String(h12).padStart(2, '0')}:00 - ${String(h12).padStart(2, '0')}:50 ${ampm}`;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot-pill-btn';
      if (isUnder3Hours) {
        btn.disabled = true;
        btn.innerHTML = `<span>${displayLabel}</span><span class="slot-sub" style="color: var(--danger); font-size: 0.65rem;">&lt; 3h notice</span>`;
      } else {
        btn.innerHTML = `<span>${displayLabel}</span><span class="slot-sub">50 min class</span>`;
        btn.addEventListener('click', () => {
          document.querySelectorAll('#page-booking-slots-container .slot-pill-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.selectSlot(slot.key, `${dateFormatted} at ${displayLabel}`);
        });
      }
      slotsContainer.appendChild(btn);
    });
  },

  selectSlot(slotKey, formattedDateTime) {
    this.selectedTime = slotKey;

    const summaryDT = document.getElementById('page-pay-summary-datetime');
    if (summaryDT) summaryDT.textContent = formattedDateTime;

    const confirmBtn = document.getElementById('btn-page-confirm-booking');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      this.updateButtonText();
    }
  },

  configurePaymentOptions() {
    const subOption = document.getElementById('page-pay-opt-sub');
    const cardOption = document.getElementById('page-pay-opt-card');
    const subCardBox = document.getElementById('page-pay-method-sub');
    const cardCardBox = document.getElementById('page-pay-method-card');
    const subDesc = document.getElementById('page-pay-sub-desc');
    const cardInputs = document.getElementById('page-payment-card-inputs');

    const hasActiveCredits = this.studentSubscription &&
                             this.studentSubscription.status === 'active' &&
                             this.studentSubscription.lessons_remaining > 0;

    if (hasActiveCredits) {
      const remaining = this.studentSubscription.lessons_remaining;
      if (subOption) {
        subOption.disabled = false;
        subOption.checked = true;
      }
      if (cardOption) cardOption.checked = false;
      this.paymentMethod = 'subscription';

      if (subCardBox) {
        subCardBox.classList.add('selected');
        subCardBox.classList.remove('disabled');
      }
      if (cardCardBox) cardCardBox.classList.remove('selected');

      if (subDesc) {
        subDesc.textContent = `Deduct 1 lesson from your active plan (${remaining} lessons remaining) — $0.00 due today`;
      }
      if (cardInputs) cardInputs.style.display = 'none';
    } else {
      if (subOption) {
        subOption.disabled = true;
        subOption.checked = false;
      }
      if (cardOption) cardOption.checked = true;
      this.paymentMethod = 'card';

      if (subCardBox) {
        subCardBox.classList.add('disabled');
        subCardBox.classList.remove('selected');
      }
      if (cardCardBox) cardCardBox.classList.add('selected');

      if (subDesc) subDesc.textContent = 'No subscription lesson credits remaining on your account.';
      if (cardInputs) cardInputs.style.display = 'block';
    }

    this.updateButtonText();
  },

  setPaymentMethod(method) {
    this.paymentMethod = method;
    const subCardBox = document.getElementById('page-pay-method-sub');
    const cardCardBox = document.getElementById('page-pay-method-card');
    const cardInputs = document.getElementById('page-payment-card-inputs');

    if (method === 'subscription') {
      if (subCardBox) subCardBox.classList.add('selected');
      if (cardCardBox) cardCardBox.classList.remove('selected');
      if (cardInputs) cardInputs.style.display = 'none';
    } else {
      if (subCardBox) subCardBox.classList.remove('selected');
      if (cardCardBox) cardCardBox.classList.add('selected');
      if (cardInputs) cardInputs.style.display = 'block';
    }

    this.updateButtonText();
  },

  updateButtonText() {
    const btnText = document.getElementById('page-btn-pay-text');
    if (!btnText) return;

    if (!this.selectedDate || !this.selectedTime) {
      btnText.textContent = 'Please Select a Date & Time Slot First';
      return;
    }

    if (this.paymentMethod === 'subscription') {
      btnText.textContent = 'Confirm Booking (Use 1 Lesson Credit — $0.00)';
    } else {
      const price = this.selectedTutor?.hourly_rate || 50;
      btnText.textContent = `Pay $${price.toFixed(2)} & Confirm Booking`;
    }
  },

  async handleBookingSubmit() {
    if (!this.selectedTutor || !this.selectedDate || !this.selectedTime) {
      showToast('Please select a tutor, date, and 50-minute time slot.', 'warning');
      return;
    }

    const subject = document.getElementById('page-booking-subject-select')?.value;
    if (!subject) {
      showToast('Please choose a subject for this session.', 'warning');
      return;
    }

    const notes = document.getElementById('page-booking-notes')?.value.trim() || '';
    const submitBtn = document.getElementById('btn-page-confirm-booking');

    if (this.paymentMethod === 'card') {
      const cardNum = document.getElementById('page-card-number')?.value.trim();
      const cardName = document.getElementById('page-card-name')?.value.trim();
      if (!cardNum || !cardName) {
        showToast('Please enter your cardholder name and card number.', 'warning');
        return;
      }
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Processing Payment &amp; Confirmation...</span>';
      }

      const payload = {
        tutor_user_id: this.selectedTutor.user_id,
        subject,
        requested_date: this.selectedDate,
        requested_time: this.selectedTime,
        duration_hours: 1.0,
        notes,
        payment_method: this.paymentMethod
      };

      const res = await API.createRequest(payload);
      showToast(res.message, 'success');

      // Refresh student dashboard data
      if (typeof Student !== 'undefined' && Student.loadDashboard) {
        await Student.loadDashboard();
      }

      // Navigate to student portal where new class will be visible on the schedule
      window.location.hash = '#student-portal';
      Router.handleRoute();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        this.updateButtonText();
      }
    }
  }
};
