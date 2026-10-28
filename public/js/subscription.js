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

  getPlanConfig(packageKey) {
    const plans = {
      'trial': { key: 'trial', name: 'Free Trial Lesson', lessons: 1, duration: 30, durationLabel: '30-Min Free Trial', isTrial: true },
      'free_trial': { key: 'trial', name: 'Free Trial Lesson', lessons: 1, duration: 30, durationLabel: '30-Min Free Trial', isTrial: true },
      '4_lessons': { key: '4_lessons', name: '4 Lessons Package', lessons: 4, duration: 50, durationLabel: '50-Min Class', isTrial: false },
      'scholar': { key: '4_lessons', name: '4 Lessons Package', lessons: 4, duration: 50, durationLabel: '50-Min Class', isTrial: false },
      '8_lessons': { key: '8_lessons', name: '8 Lessons Package', lessons: 8, duration: 50, durationLabel: '50-Min Class', isTrial: false },
      'honors': { key: '8_lessons', name: '8 Lessons Package', lessons: 8, duration: 50, durationLabel: '50-Min Class', isTrial: false },
      'mastery': { key: '8_lessons', name: '8 Lessons Package', lessons: 8, duration: 50, durationLabel: '50-Min Class', isTrial: false },
      '12_lessons': { key: '12_lessons', name: '12 Lessons Package', lessons: 12, duration: 50, durationLabel: '50-Min Class', isTrial: false }
    };
    return plans[packageKey] || plans['4_lessons'];
  },

  purchasePlan(planKey) {
    const packageMap = {
      'trial': 'trial',
      'free_trial': 'trial',
      '4_lessons': '4_lessons',
      '8_lessons': '8_lessons',
      '12_lessons': '12_lessons',
      'scholar': '4_lessons',
      'honors': '8_lessons',
      'mastery': '8_lessons'
    };
    const packageKey = packageMap[planKey] || planKey || '4_lessons';
    const planConfig = this.getPlanConfig(packageKey);
    const planName = planConfig ? planConfig.name : 'Subscription Package';

    const user = typeof Auth !== 'undefined' ? Auth.currentUser : null;
    if (!user) {
      sessionStorage.setItem('pending_subscription_plan', packageKey);
      sessionStorage.setItem('pending_subscription_package', packageKey);
      showToast(`Please create an account or log in to enroll in the ${planName}.`, 'info');
      if (typeof Auth !== 'undefined' && Auth.closeModal) {
        Auth.closeModal();
      }
      window.location.hash = '#signup';
      window.scrollTo(0, 0);
      return;
    }

    if (user.role !== 'student') {
      showToast('Please log in with a student account to purchase a subscription.', 'warning');
      return;
    }

    window.location.hash = '#student-subscriptions';
    setTimeout(() => {
      this.openEnrollmentModal(packageKey);
    }, 350);
  },

  buyPackage(packageKey) {
    this.openEnrollmentModal(packageKey);
  },

  getTutorSubjects(tutor) {
    if (!tutor) return ['General Tutoring'];
    let subjs = tutor.subjects;
    if (typeof subjs === 'string') {
      try {
        const parsed = JSON.parse(subjs);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.filter(Boolean);
      } catch (e) {}
      const splitted = subjs.split(',').map(s => s.trim().replace(/^["'\[]+|["'\]]+$/g, '')).filter(Boolean);
      if (splitted.length > 0) return splitted;
    }
    if (Array.isArray(subjs) && subjs.length > 0) {
      return subjs.filter(Boolean);
    }
    return [tutor.subject || 'General Tutoring'];
  },

  distributeSubjectsForLessons(subjects, count = 4) {
    if (!subjects || subjects.length === 0) {
      return Array.from({ length: count }, () => 'General Tutoring');
    }
    const hasAlgebra = subjects.find(s => /algebra/i.test(s));
    const hasCalculus = subjects.find(s => /calculus/i.test(s));
    
    let list = [...subjects];
    if (hasAlgebra && hasCalculus) {
      list = [hasAlgebra, hasCalculus, ...subjects.filter(s => s !== hasAlgebra && s !== hasCalculus)];
    }
    
    return Array.from({ length: count }, (_, i) => list[i % list.length]);
  },

  getTutorSubjectRate(tutor, subjectName) {
    if (!tutor) return 58;
    const baseRate = Number(tutor.hourly_rate) || 58;
    const rates = tutor.subject_rates && typeof tutor.subject_rates === 'object' ? tutor.subject_rates : {};
    if (!subjectName) return baseRate;
    const target = String(subjectName).trim();
    if (rates[target] !== undefined) return Number(rates[target]) || baseRate;
    const lowerTarget = target.toLowerCase();
    for (const [k, v] of Object.entries(rates)) {
      if (k.toLowerCase() === lowerTarget) return Number(v) || baseRate;
    }
    return baseRate;
  },

  updateTutorDisciplines(tutor) {
    const container = document.getElementById('sub-enroll-tutor-disciplines-tags');
    if (!container || !tutor) return;
    const subjects = this.getTutorSubjects(tutor);
    container.innerHTML = subjects.map(s => {
      const sRate = this.getTutorSubjectRate(tutor, s);
      return `
      <span class="badge-gold" style="font-size: 0.72rem; padding: 0.2rem 0.5rem; background: rgba(198, 138, 40, 0.1); border: 1.5px solid rgba(198, 138, 40, 0.35); font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> ${s} ($${sRate}/hr)
      </span>
    `;
    }).join('');
  },

  // OPEN INTERACTIVE SUBSCRIPTION & LESSONS SCHEDULING STUDIO
  async openEnrollmentModal(packageKey = '4_lessons') {
    const user = typeof Auth !== 'undefined' ? Auth.currentUser : null;
    if (!user) {
      sessionStorage.setItem('pending_subscription_package', packageKey);
      sessionStorage.setItem('pending_subscription_plan', packageKey);
      const planConfig = this.getPlanConfig(packageKey);
      const planName = planConfig ? planConfig.name : 'Subscription Package';
      showToast(`Please create an account or log in to enroll in the ${planName}.`, 'info');
      if (typeof Auth !== 'undefined' && Auth.closeModal) {
        Auth.closeModal();
      }
      window.location.hash = '#signup';
      window.scrollTo(0, 0);
      return;
    }

    if (user.role !== 'student') {
      showToast('Please log in with a student account to purchase a subscription.', 'warning');
      return;
    }

    const planConfig = this.getPlanConfig(packageKey);
    this.activePackageKey = planConfig.key;
    const lessonCount = planConfig.lessons;
    this.allocatedLessons = lessonCount;

    const modal = document.getElementById('sub-enrollment-modal');
    if (!modal) return;

    // Always fetch latest tutors list so tutor calendar/time-slot changes are reflected live
    try {
      const res = await API.getTutors();
      if (res && Array.isArray(res.tutors) && res.tutors.length > 0) {
        this.allTutors = res.tutors;
      }
    } catch (e) {
      console.warn('Could not fetch tutors list:', e);
      if (typeof Tutors !== 'undefined' && Tutors.allTutors && Tutors.allTutors.length > 0) {
        this.allTutors = Tutors.allTutors;
      }
    }

    // Default educator (or sync selectedTutor with fresh tutor object)
    if (this.selectedTutor && this.allTutors.length > 0) {
      this.selectedTutor = this.allTutors.find(t => t.id == this.selectedTutor.id || t.user_id == this.selectedTutor.user_id) || this.allTutors[0];
    } else if (!this.selectedTutor && this.allTutors.length > 0) {
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

    // Tutor subjects
    const subjects = this.getTutorSubjects(this.selectedTutor);
    const distributedTopics = this.distributeSubjectsForLessons(subjects, lessonCount);

    // Render educator's accredited discipline badges
    this.updateTutorDisciplines(this.selectedTutor);

    // Adjust UI labels & titles based on plan
    const modalBadge = document.getElementById('sub-enroll-badge');
    const stepTag = document.getElementById('sub-enroll-step-tag');
    const modalTitle = document.getElementById('sub-enroll-modal-title');
    const step2Title = document.getElementById('sub-enroll-step2-title');
    const step2Subtitle = document.getElementById('sub-enroll-step2-subtitle');
    const notesLabel = document.getElementById('sub-enroll-notes-label');
    const durationText = document.getElementById('sub-summary-duration-text');
    const slotDurationBadge = document.getElementById('sub-enroll-slot-duration-badge');
    const tabsGrid = document.getElementById('sub-lesson-tabs-grid');

    if (modalBadge) modalBadge.textContent = planConfig.isTrial ? 'Free Trial' : 'Plan Enrollment';
    if (stepTag) stepTag.textContent = planConfig.isTrial ? 'Step 1: Trial Educator & Schedule' : `Step 1: Educator & Schedule (${lessonCount} Lessons)`;
    if (modalTitle) modalTitle.textContent = planConfig.isTrial ? 'Free Trial Lesson & Tutor Scheduling' : `${planConfig.name} & Tutor Scheduling`;
    
    if (step2Title) {
      step2Title.textContent = planConfig.isTrial 
        ? '2. Select 1 Free Trial Lesson: Choose Topic & Respective Date & Time' 
        : `2. Select ${lessonCount} Lessons: Choose Topics & Respective Dates & Times`;
    }
    if (step2Subtitle) {
      step2Subtitle.innerHTML = planConfig.isTrial
        ? 'Choose your complimentary trial topic using the dropdown below. Click on the lesson card marked <strong>"Needs Schedule"</strong> to open its 30-minute date &amp; time setup.'
        : `Choose a different topic for each lesson using the dropdown on each card (e.g., <strong>Algebra for Lesson 1</strong>, <strong>Calculus for Lesson 2</strong>). Click on any lesson marked <strong>"Needs Schedule"</strong> to open its date &amp; time setup.`;
    }
    if (notesLabel) {
      notesLabel.textContent = planConfig.isTrial
        ? 'Learning Objectives or Goals for Your Free Trial Lesson (Optional)'
        : `Learning Objectives or Specific Topics for the ${lessonCount} Lessons (Optional)`;
    }
    if (durationText) {
      durationText.textContent = planConfig.isTrial ? '30 Minutes (Complimentary Session)' : '50 Minutes per lesson';
    }
    if (slotDurationBadge) {
      slotDurationBadge.textContent = planConfig.isTrial ? '30-Min Trial' : '50-Min Class';
    }

    if (tabsGrid) {
      if (lessonCount === 1) {
        tabsGrid.classList.add('single-card');
      } else {
        tabsGrid.classList.remove('single-card');
      }
    }

    // Initialize lesson setup (using subject-specific rates)
    this.selectedLessons = Array.from({ length: lessonCount }, (_, i) => {
      const subj = distributedTopics[i] || subjects[0] || 'General Tutoring';
      const lessonRate = planConfig.isTrial ? 0.00 : this.getTutorSubjectRate(this.selectedTutor, subj);
      return {
        index: i,
        label: planConfig.isTrial ? 'Trial Lesson' : `Lesson ${i + 1}`,
        tutor_id: this.selectedTutor?.user_id || this.selectedTutor?.id || 1,
        tutor_name: this.selectedTutor?.name || 'Educator',
        tutor_avatar: this.selectedTutor?.avatar_url || this.selectedTutor?.avatar || '',
        subject: subj,
        hourly_rate: lessonRate,
        scheduled_date: null,
        scheduled_time: null
      };
    });

    this.isSchedulerOpen = false;
    this.activeLessonIndex = -1;
    this.selectedDate = null;
    this.selectedTime = null;

    // Keep date and time setup hidden by default so the interface stays clean and uncluttered
    const schedSection = document.getElementById('sub-scheduling-section');
    if (schedSection) {
      schedSection.style.display = 'none';
    }

    // Update educator preview card
    this.updateTutorPreview(this.selectedTutor);

    // Render lesson tabs
    this.renderLessonTabs();

    // Update dynamic calculations and summary
    this.updateSummary();

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeEnrollmentModal() {
    this.closeScheduler();
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
    this.updateTutorDisciplines(tutor);

    const planConfig = this.getPlanConfig(this.activePackageKey);
    const subjects = this.getTutorSubjects(tutor);
    const distributedTopics = this.distributeSubjectsForLessons(subjects, this.selectedLessons.length);

    // Apply this tutor & subject-specific rate to all lessons in the plan
    const tutorIdToSet = tutor.user_id || tutor.id;
    this.selectedLessons.forEach((l, idx) => {
      const subj = distributedTopics[idx] || subjects[0] || 'General Tutoring';
      l.tutor_id = tutorIdToSet;
      l.tutor_name = tutor.name;
      l.tutor_avatar = tutor.avatar_url || tutor.avatar;
      l.subject = subj;
      l.hourly_rate = planConfig.isTrial ? 0.00 : this.getTutorSubjectRate(tutor, subj);
    });

    if (this.isSchedulerOpen && this.activeLessonIndex >= 0) {
      this.updateActiveLessonBanner();
      this.syncActiveLessonCalendar();
    }
    this.renderLessonTabs();
    this.updateSummary();
  },

  onApplySubjectToAll(subj) {
    if (!subj) return;
    const planConfig = this.getPlanConfig(this.activePackageKey);
    const newRate = planConfig.isTrial ? 0.00 : this.getTutorSubjectRate(this.selectedTutor, subj);
    this.selectedLessons.forEach(l => {
      l.subject = subj;
      l.hourly_rate = newRate;
    });
    if (this.isSchedulerOpen && this.activeLessonIndex >= 0) {
      this.updateActiveLessonBanner();
    }
    this.renderLessonTabs();
    this.updateSummary();
  },

  onSubjectSelected(subj) {
    this.onApplySubjectToAll(subj);
  },

  setLessonSubject(lessonIdx, subject) {
    if (lessonIdx < 0 || lessonIdx >= this.selectedLessons.length) return;
    
    if (subject === '__custom__') {
      const current = this.selectedLessons[lessonIdx].subject;
      const customTopic = window.prompt(`Enter custom topic/subject for Lesson ${lessonIdx + 1}:`, current || '');
      if (!customTopic || !customTopic.trim()) {
        this.renderLessonTabs();
        return;
      }
      subject = customTopic.trim();
    }

    const planConfig = this.getPlanConfig(this.activePackageKey);
    this.selectedLessons[lessonIdx].subject = subject;
    this.selectedLessons[lessonIdx].hourly_rate = planConfig.isTrial ? 0.00 : this.getTutorSubjectRate(this.selectedTutor, subject);
    if (this.isSchedulerOpen && this.activeLessonIndex === lessonIdx) {
      this.updateActiveLessonBanner();
    }
    this.renderLessonTabs();
    this.updateSummary();
    showToast(`Lesson ${lessonIdx + 1} topic set to "${subject}" ($${this.selectedLessons[lessonIdx].hourly_rate.toFixed(2)}/hr)`, 'info');
  },

  onActiveLessonSubjectChanged(subject) {
    this.setLessonSubject(this.activeLessonIndex, subject);
  },

  updateActiveLessonBanner() {
    const lesson = this.selectedLessons[this.activeLessonIndex];
    if (!lesson) return;

    const planConfig = this.getPlanConfig(this.activePackageKey);
    const totalCount = this.selectedLessons.length;

    const badgeEl = document.getElementById('sub-active-lesson-badge');
    const titleEl = document.getElementById('sub-active-lesson-title');
    const rateTagEl = document.getElementById('sub-active-lesson-rate-tag');
    const subjectSelectEl = document.getElementById('sub-active-lesson-subject-select');
    const durationBadgeEl = document.getElementById('sub-enroll-slot-duration-badge');

    if (badgeEl) {
      badgeEl.textContent = totalCount === 1 ? 'Free Trial Lesson' : `Lesson ${this.activeLessonIndex + 1} of ${totalCount}`;
    }
    if (titleEl) {
      if (lesson.scheduled_date && lesson.scheduled_time) {
        titleEl.textContent = `Scheduled: ${lesson.scheduled_date} at ${lesson.scheduled_time} (${lesson.tutor_name} — ${lesson.subject})`;
      } else {
        titleEl.textContent = `Select Date & Time for ${lesson.subject} with ${lesson.tutor_name}`;
      }
    }
    if (rateTagEl) {
      rateTagEl.textContent = planConfig.isTrial ? 'Free Trial ($0.00)' : `$${Number(lesson.hourly_rate).toFixed(2)} / session`;
    }
    if (durationBadgeEl) {
      durationBadgeEl.textContent = planConfig.isTrial ? '30-Min Trial' : '50-Min Class';
    }

    if (subjectSelectEl) {
      const subjects = this.getTutorSubjects(this.selectedTutor);
      const allOptions = subjects.includes(lesson.subject) ? subjects : [lesson.subject, ...subjects];
      subjectSelectEl.innerHTML = `
        ${allOptions.map(s => `<option value="${s}" ${s === lesson.subject ? 'selected' : ''}>${s}</option>`).join('')}
        <option value="__custom__">✏️ Custom Topic...</option>
      `;
      subjectSelectEl.value = lesson.subject;
    }
  },

  renderLessonTabs() {
    const grid = document.getElementById('sub-lesson-tabs-grid');
    if (!grid) return;

    const planConfig = this.getPlanConfig(this.activePackageKey);
    const subjects = this.getTutorSubjects(this.selectedTutor);
    const totalCount = this.selectedLessons.length;

    grid.innerHTML = this.selectedLessons.map((l, idx) => {
      const isActive = this.isSchedulerOpen && idx === this.activeLessonIndex;
      const isScheduled = !!(l.scheduled_date && l.scheduled_time);
      const allOptions = subjects.includes(l.subject) ? subjects : [l.subject, ...subjects];
      const lessonLabel = totalCount === 1 ? 'Free Trial Lesson' : `Lesson ${idx + 1}`;

      return `
        <div class="sub-lesson-card ${isActive ? 'active' : ''}" onclick="StudentSub.openLessonScheduler(${idx})" title="${isScheduled ? 'Click to change schedule for ' + lessonLabel : 'Click to schedule ' + lessonLabel}">
          <div class="lesson-card-header-row">
            <span class="lesson-card-num-badge">${lessonLabel}</span>
            <span class="lesson-card-status-badge ${isScheduled ? 'status-scheduled' : 'status-pending'}">
              ${isScheduled 
                ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Scheduled' 
                : 'Needs Schedule'}
            </span>
          </div>

          <div style="min-width: 0;">
            <div class="lesson-card-tutor-name" title="${l.tutor_name}">${l.tutor_name}</div>
            
            <div class="lesson-card-subject-picker" onclick="event.stopPropagation()">
              <div class="lesson-card-subject-label">
                <span>Topic:</span>
                <span class="lesson-card-subject-hint">Choose subject</span>
              </div>
              <select class="lesson-card-subject-select" onchange="StudentSub.setLessonSubject(${idx}, this.value)" title="Choose topic for ${lessonLabel}">
                ${allOptions.map(s => `<option value="${s}" ${s === l.subject ? 'selected' : ''}>${s}</option>`).join('')}
                <option value="__custom__">✏️ Custom Topic...</option>
              </select>
            </div>

            ${planConfig.isTrial 
              ? `<div class="lesson-card-rate-pill" style="background: rgba(16, 185, 129, 0.12); color: #047857; border-color: rgba(16, 185, 129, 0.3); font-weight: 700;">$0.00 / 30 min (Free Trial)</div>`
              : `<div class="lesson-card-rate-pill">$${Number(l.hourly_rate).toFixed(2)} / 50 min</div>`}
          </div>

          <div class="lesson-card-datetime ${isScheduled ? 'is-scheduled' : ''}">
            ${isScheduled 
              ? `<div style="display: flex; align-items: center; gap: 0.25rem;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" x2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg> ${l.scheduled_date}</div><div style="font-size: 0.7rem; color: #047857; margin-top: 0.1rem; font-weight: 700;">${l.scheduled_time} (Click to change)</div>`
              : '👉 Click to schedule'}
          </div>
        </div>
      `;
    }).join('');
  },

  setActiveLesson(idx) {
    this.openLessonScheduler(idx);
  },

  openLessonScheduler(idx) {
    if (idx < 0 || idx >= this.selectedLessons.length) return;
    this.activeLessonIndex = idx;
    this.isSchedulerOpen = true;

    const schedSection = document.getElementById('sub-scheduling-section');
    if (schedSection) {
      schedSection.style.display = 'block';
    }

    const lesson = this.selectedLessons[idx];
    this.selectedDate = lesson.scheduled_date;
    this.selectedTime = lesson.scheduled_time;

    if (lesson.scheduled_date) {
      const parts = lesson.scheduled_date.split('-');
      if (parts.length === 3) {
        this.calYear = parseInt(parts[0], 10);
        this.calMonth = parseInt(parts[1], 10) - 1;
      }
    }

    this.updateActiveLessonBanner();
    this.renderLessonTabs();
    this.syncActiveLessonCalendar();

    if (schedSection) {
      schedSection.scrollIntoView({ behavior: 'instant', block: 'nearest' });
    }
  },

  closeScheduler() {
    this.isSchedulerOpen = false;
    this.activeLessonIndex = -1;
    const schedSection = document.getElementById('sub-scheduling-section');
    if (schedSection) {
      schedSection.style.display = 'none';
    }
    this.renderLessonTabs();
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

      const dateStr = `${this.calYear}-${String(this.calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = this.selectedDate === dateStr;
      const isDateOccupied = !isPast && typeof Tutors !== 'undefined' && Tutors.isTutorDateOccupied(this.selectedTutor, dateStr, dayOfWeekName);
      const blocks = typeof Tutors !== 'undefined'
        ? Tutors.getTutorDateBlocks(this.selectedTutor, dateStr, dayOfWeekName)
        : ((this.selectedTutor?.availability_schedule || {})[dayOfWeekName] || []);
      const hasTutorSchedule = !isDateOccupied && blocks.length > 0;
      const isAvailable = !isPast && hasTutorSchedule;

      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cal-day-cell';

      if (isToday) cell.classList.add('is-today');

      if (isDateOccupied) {
        cell.classList.add('date-occupied');
        if (isSelected) cell.classList.add('selected');
        cell.title = 'Not Available / Date Occupied — Tutor marked this date as unavailable';
        cell.innerHTML = `<span>${day}</span><span class="cal-occupied-tag">Unavail</span>`;
        cell.addEventListener('click', () => {
          this.selectCalendarDate(dateStr);
        });
      } else if (!isAvailable) {
        cell.textContent = day;
        cell.classList.add('disabled');
        cell.disabled = true;
      } else {
        cell.textContent = day;
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
    const slotsContainer = document.getElementById('sub-enroll-slots-container');

    const isDateOccupied = typeof Tutors !== 'undefined' && Tutors.isTutorDateOccupied(this.selectedTutor, dateStr, dayName);
    if (isDateOccupied) {
      if (label) label.innerHTML = `<span style="color: #DC2626; font-weight: 700;">🚫 ${dateFormatted} — Not Available / Date Occupied</span>`;
      if (slotsContainer) {
        slotsContainer.innerHTML = `
          <div class="student-date-occupied-notice" style="grid-column: 1 / -1; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-md); padding: 0.9rem 1rem; color: #B91C1C; font-size: 0.84rem; display: flex; align-items: center; gap: 0.6rem;">
            <span style="font-size: 1.15rem;">🚫</span>
            <div>
              <strong>Not Available / Date Occupied:</strong> ${this.selectedTutor?.name || 'This tutor'} has marked <strong>${dateFormatted}</strong> as unavailable. Please select another available date on the calendar.
            </div>
          </div>
        `;
      }
      return;
    }

    const planConfig = this.getPlanConfig(this.activePackageKey);
    const durationMins = planConfig.isTrial ? 30 : 50;
    const blocks = typeof Tutors !== 'undefined'
      ? Tutors.getTutorDateBlocks(this.selectedTutor, dateStr, dayName)
      : ((this.selectedTutor?.availability_schedule || {})[dayName] || ['09:00 - 12:00', '14:00 - 17:00']);
    const sched = this.selectedTutor?.availability_schedule || {};
    const dateMode = (sched.date_modes && sched.date_modes[dateStr]) || (sched.day_modes && sched.day_modes[dayName]) || null;
    const modeLabel = dateMode === 'all_day' ? ' • Available All Day' : (blocks.length > 0 ? ` • ${blocks.join(', ')}` : '');
    if (label) label.textContent = `${dateFormatted}${modeLabel}`;

    const slots = [];
    blocks.forEach(b => {
      const parts = String(b).split('-').map(s => s.trim());
      if (parts.length === 2) {
        const startH = parseInt(parts[0].split(':')[0], 10);
        const endH = parseInt(parts[1].split(':')[0], 10);

        for (let h = startH; h < endH; h++) {
          const slotStart = `${String(h).padStart(2, '0')}:00`;
          const slotEnd = `${String(h).padStart(2, '0')}:${durationMins}`;
          slots.push({ start: slotStart, end: slotEnd, key: `${slotStart} - ${slotEnd}`, hour: h, minute: '00' });
        }
      }
    });

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
      const occState = typeof Tutors !== 'undefined'
        ? Tutors.getTutorSlotOccupancyState(this.selectedTutor, dateStr, dayName, slot.hour)
        : { occupied: false };

      const h = slot.hour;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const displayLabel = `${String(h12).padStart(2, '0')}:00 - ${String(h12).padStart(2, '0')}:${durationMins} ${ampm}`;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'booking-slot-btn';

      const isCurrentSelected = (this.selectedTime === slot.key);
      if (isCurrentSelected && !occState.occupied) {
        btn.classList.add('selected');
      }

      if (occState.occupied) {
        btn.disabled = true;
        btn.classList.add('disabled', 'slot-occupied');
        btn.title = `${occState.reason || 'Unavailable'} — Tutor is unavailable at this time`;
        btn.innerHTML = `<span>${displayLabel}</span><span style="display:block;font-size:0.65rem;color:#EF4444;font-weight:700;">🚫 ${occState.reason || 'Unavailable'}</span>`;
      } else if (isUnder3Hours) {
        btn.disabled = true;
        btn.classList.add('disabled');
        btn.title = 'Requires minimum 3 hours advance notice';
        btn.innerHTML = `<span>${displayLabel}</span>`;
      } else {
        btn.innerHTML = `<span>${displayLabel}</span>`;
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
          const totalCount = this.selectedLessons.length;
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
            showToast(totalCount === 1 ? `Trial lesson scheduled for ${dateStr} (${slot.key})!` : `All ${totalCount} lessons scheduled!`, 'success');
            const titleEl = document.getElementById('sub-active-lesson-title');
            if (titleEl) {
              const currentLesson = this.selectedLessons[this.activeLessonIndex];
              titleEl.textContent = `Scheduled: ${dateStr} at ${slot.key} (${currentLesson.tutor_name} — ${currentLesson.subject})`;
            }
          }
        });
      }

      slotsContainer.appendChild(btn);
    });
  },

  updateSummary() {
    const planConfig = this.getPlanConfig(this.activePackageKey);
    const totalCount = this.selectedLessons.length;
    const totalCost = planConfig.isTrial ? 0.00 : this.selectedLessons.reduce((sum, l) => sum + (Number(l.hourly_rate) || 0), 0);
    const scheduledLessons = this.selectedLessons.filter(l => l.scheduled_date && l.scheduled_time);
    const scheduledCount = scheduledLessons.length;
    const isComplete = scheduledCount === totalCount;

    // Progress badge
    const progressTag = document.getElementById('sub-enroll-lessons-progress-tag');
    if (progressTag) {
      progressTag.textContent = `${scheduledCount} of ${totalCount} Scheduled`;
      if (isComplete) {
        progressTag.style.background = '#10B981';
        progressTag.style.color = '#FFFFFF';
      } else {
        progressTag.style.background = 'rgba(198, 138, 40, 0.15)';
        progressTag.style.color = 'var(--gold-800)';
      }
    }

    // Itemized lesson breakdown list
    const breakdownList = document.getElementById('sub-lessons-breakdown-list');
    if (breakdownList) {
      breakdownList.innerHTML = this.selectedLessons.map((l, i) => {
        const isSet = !!(l.scheduled_date && l.scheduled_time);
        const lessonTitle = totalCount === 1 ? `Trial Lesson: ${l.subject}` : `Lesson ${i + 1}: ${l.subject}`;
        return `
          <div class="sub-lesson-breakdown-row">
            <div>
              <div style="font-weight: 700; color: var(--charcoal-950);">
                ${lessonTitle}
              </div>
              <div style="font-size: 0.76rem; color: var(--text-secondary); margin-top: 0.1rem;">
                Faculty: <strong>${l.tutor_name}</strong> • 
                ${isSet 
                  ? `<span style="color: #059669; font-weight: 600;">📅 ${l.scheduled_date} at ${l.scheduled_time}</span>` 
                  : `<span style="color: #D97706; font-weight: 600;">Not scheduled yet</span>`}
              </div>
            </div>
            <div style="text-align: right;">
              ${planConfig.isTrial 
                ? `<span style="font-size: 0.95rem; font-weight: 800; color: #059669; font-family: var(--font-heading);">$0.00 (Trial)</span>`
                : (isSet 
                  ? `<span style="font-size: 0.95rem; font-weight: 800; color: var(--gold-700); font-family: var(--font-heading);">$${Number(l.hourly_rate).toFixed(2)}</span>` 
                  : `<span style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);">Rate: $${Number(l.hourly_rate).toFixed(0)}/hr</span>`)}
            </div>
          </div>
        `;
      }).join('');
    }

    // Total text at bottom of summary: visible ONLY once all lessons are completely set up
    const summaryAmountEl = document.getElementById('sub-summary-amount-text');
    if (summaryAmountEl) {
      if (isComplete) {
        summaryAmountEl.textContent = `$${totalCost.toFixed(2)}`;
        summaryAmountEl.style.fontSize = '1.4rem';
        summaryAmountEl.style.color = planConfig.isTrial ? '#059669' : 'var(--gold-700)';
      } else {
        summaryAmountEl.innerHTML = `<span style="font-size: 0.98rem; color: #D97706; font-weight: 700;">Pending Setup (${scheduledCount}/${totalCount})</span>`;
      }
    }

    const calcFormulaEl = document.getElementById('sub-summary-calc-formula');
    if (calcFormulaEl) {
      if (isComplete) {
        if (planConfig.isTrial) {
          calcFormulaEl.textContent = 'Complimentary 30-minute diagnostic session ($0.00 total)';
        } else {
          calcFormulaEl.textContent = `Sum of ${totalCount} lessons: ${this.selectedLessons.map((l, idx) => `Lesson ${idx + 1} ($${Number(l.hourly_rate).toFixed(0)})`).join(' + ')}`;
        }
      } else {
        calcFormulaEl.textContent = `The total amount to be paid will be visible once all ${totalCount} lesson${totalCount > 1 ? 's are' : ' is'} scheduled.`;
      }
    }

    // Submit button
    const submitBtn = document.getElementById('btn-sub-enroll-submit');
    const btnLabel = document.getElementById('sub-enroll-btn-label');
    if (submitBtn) {
      if (isComplete) {
        submitBtn.disabled = false;
        if (btnLabel) {
          btnLabel.textContent = planConfig.isTrial 
            ? 'Confirm 1-Lesson Free Trial ($0.00)' 
            : `Confirm ${totalCount} Lessons & Pay $${totalCost.toFixed(2)}`;
        }
      } else {
        submitBtn.disabled = true;
        if (btnLabel) {
          btnLabel.textContent = `Please Schedule All ${totalCount} Lesson${totalCount > 1 ? 's' : ''} to View Total (${scheduledCount}/${totalCount} Scheduled)`;
        }
      }
    }
  },

  async confirmEnrollment() {
    const totalCount = this.selectedLessons.length;
    const unscheduled = this.selectedLessons.filter(l => !l.scheduled_date || !l.scheduled_time);
    if (unscheduled.length > 0) {
      showToast(`Please select respective dates and times for all ${totalCount} lesson${totalCount > 1 ? 's' : ''} before proceeding.`, 'warning');
      const firstMissing = this.selectedLessons.findIndex(l => !l.scheduled_date || !l.scheduled_time);
      if (firstMissing !== -1) this.setActiveLesson(firstMissing);
      return;
    }

    const planConfig = this.getPlanConfig(this.activePackageKey);
    const notesInput = document.getElementById('sub-enroll-notes');
    const notes = notesInput ? notesInput.value.trim() : '';
    const totalCost = planConfig.isTrial ? 0.00 : this.selectedLessons.reduce((sum, l) => sum + (Number(l.hourly_rate) || 0), 0);

    const submitBtn = document.getElementById('btn-sub-enroll-submit');
    const originalText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Processing Enrollment &amp; Reserving ${totalCount} Lesson${totalCount > 1 ? 's' : ''}...</span>`;
    }

    try {
      const payload = {
        package_key: this.activePackageKey,
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
      showToast(err.message || 'Failed to process enrollment.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    }
  }
};
