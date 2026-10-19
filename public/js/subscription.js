/**
 * AVIORA EDUCATION - STUDENT SUBSCRIPTION MODULE
 */
const StudentSub = {
  data: null,

  async init() {
    this.setupEventListeners();
  },

  setupEventListeners() {
    // Event listeners if any
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
      const val = typeof data.totalSpending === 'number' ? data.totalSpending : 399.00;
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

    // Trial button state & 1-time limit enforcement
    const trialBtn = document.getElementById('btn-buy-trial');
    const trialBadge = document.getElementById('badge-trial-status');
    if (trialBtn) {
      if (data.trialUsed) {
        trialBtn.disabled = true;
        trialBtn.classList.remove('btn-outline-gold');
        trialBtn.classList.add('btn-secondary');
        trialBtn.style.opacity = '0.55';
        trialBtn.style.cursor = 'not-allowed';
        trialBtn.textContent = 'Paid Trial Used (1-Time Limit)';
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
        trialBtn.textContent = 'Book Paid Trial ($39)';
        if (trialBadge) {
          trialBadge.textContent = 'Available (1-Time Use)';
          trialBadge.style.color = 'var(--gold-700)';
          trialBadge.style.borderColor = 'rgba(198, 138, 40, 0.4)';
        }
      }
    }
  },

  async buyPackage(packageKey) {
    const pkgLabels = {
      'trial': 'Single Paid Trial Lesson ($39.00)',
      '4_lessons': 'Starter Package: 4 Lessons Monthly ($220.00)',
      '8_lessons': 'Mastery Package: 8 Lessons Monthly ($399.00)',
      '12_lessons': 'Honors Intensive: 12 Lessons Monthly ($540.00)'
    };

    const label = pkgLabels[packageKey] || packageKey;

    showConfirm(
      'Confirm Subscription Purchase',
      `You are enrolling in ${label}. All packages require upfront payment, are valid for 1 month, and are non-refundable once activated. Dates and times are freely determined by you. Proceed to enroll?`,
      async () => {
        try {
          const res = await API.purchaseSubscription(packageKey);
          showToast(res.message, 'success');
          await this.loadSubscriptionHub();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    );
  }
};
