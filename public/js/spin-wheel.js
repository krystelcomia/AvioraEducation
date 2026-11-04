/**
 * AVIORA EDUCATION - DAILY LUCKY SPIN WHEEL MODULE
 * 
 * Slices (7 total):
 *  - 4 "Try Again" slots
 *  - 1 "+Spin" slot
 *  - 1 "Free Trial Lesson" slot
 *  - 1 "Free 4-Lesson Subscription" slot
 * 
 * Strict Probability Engine:
 *  - 70% chance of landing on "Try Again"
 *  - 30% chance of landing on "+Spin"
 *  - 0% chance (unobtainable) for "Free Trial Lesson" and "Free 4-Lesson Subscription"
 * 
 * Limits:
 *  - 1 spin per day per user account (plus +1 extra spin unlocked if "+Spin" is won).
 *  - Midnight local-time reset with live countdown timer.
 */

const SpinWheel = {
  isSpinning: false,
  currentRotation: 0,
  countdownInterval: null,

  // 7 colorful alternating segments
  segments: [
    { id: 'try_again_1', label: 'Try Again', type: 'try_again', color: '#F59E0B', textColor: '#FFFFFF', icon: '🍀' },
    { id: 'free_trial',  label: 'Free Trial', type: 'trial',     color: '#10B981', textColor: '#FFFFFF', icon: '🎓' },
    { id: 'try_again_2', label: 'Try Again', type: 'try_again', color: '#3B82F6', textColor: '#FFFFFF', icon: '🍀' },
    { id: 'free_sub',    label: '4 Lessons Sub', type: 'sub',    color: '#EC4899', textColor: '#FFFFFF', icon: '🎁' },
    { id: 'try_again_3', label: 'Try Again', type: 'try_again', color: '#8B5CF6', textColor: '#FFFFFF', icon: '🍀' },
    { id: 'plus_spin',   label: '+1 Spin',   type: 'bonus',     color: '#06B6D4', textColor: '#FFFFFF', icon: '⚡' },
    { id: 'try_again_4', label: 'Try Again', type: 'try_again', color: '#EF4444', textColor: '#FFFFFF', icon: '🍀' }
  ],

  init() {
    this.drawWheel();
    this.attachEventListeners();
    this.refresh();

    if (!this.countdownInterval) {
      this.countdownInterval = setInterval(() => this.updateCountdown(), 1000);
    }
  },

  getStorageKey() {
    const u = (typeof Auth !== 'undefined' && Auth.currentUser) || (typeof Storage !== 'undefined' ? Storage.getUser() : null);
    const userId = u && u.id ? u.id : 'guest';
    return `aviora_daily_spin_${userId}`;
  },

  getTodayString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  getSpinState() {
    const key = this.getStorageKey();
    let state = null;
    try {
      state = JSON.parse(localStorage.getItem(key));
    } catch (e) {
      state = null;
    }

    const today = this.getTodayString();
    if (!state || state.date !== today) {
      state = {
        date: today,
        spinsAvailable: 1,
        spinsUsedToday: 0,
        lastResult: null,
        bonusAwarded: 0
      };
      localStorage.setItem(key, JSON.stringify(state));
    }
    return state;
  },

  saveSpinState(state) {
    const key = this.getStorageKey();
    localStorage.setItem(key, JSON.stringify(state));
  },

  drawWheel() {
    const canvas = document.getElementById('wheel-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const size = canvas.width; // 560
    const center = size / 2;
    const radius = center - 18; // Leave margin for outer rim
    const totalSegments = this.segments.length;
    const sliceAngle = (2 * Math.PI) / totalSegments;

    ctx.clearRect(0, 0, size, size);

    // 1. Draw outer gold decorative ring shadow & base
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius + 12, 0, 2 * Math.PI);
    ctx.fillStyle = '#C68A28';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.restore();

    // 2. Draw outer gold rim gradient
    ctx.save();
    const rimGrad = ctx.createRadialGradient(center, center, radius, center, center, radius + 12);
    rimGrad.addColorStop(0, '#E5A83B');
    rimGrad.addColorStop(0.5, '#FDE047');
    rimGrad.addColorStop(1, '#92400E');
    ctx.beginPath();
    ctx.arc(center, center, radius + 10, 0, 2 * Math.PI);
    ctx.fillStyle = rimGrad;
    ctx.fill();
    ctx.restore();

    // 3. Draw metallic outer studs / casino lights
    const totalStuds = 28;
    for (let s = 0; s < totalStuds; s++) {
      const studAngle = (s / totalStuds) * (2 * Math.PI);
      const sx = center + (radius + 5) * Math.cos(studAngle);
      const sy = center + (radius + 5) * Math.sin(studAngle);
      ctx.save();
      ctx.beginPath();
      ctx.arc(sx, sy, 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = (s % 2 === 0) ? '#FFFFFF' : '#FEF08A';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 3;
      ctx.fill();
      ctx.restore();
    }

    // 4. Draw slices with vibrant background & inner shadow
    for (let i = 0; i < totalSegments; i++) {
      const seg = this.segments[i];
      const startAngle = i * sliceAngle;
      const endAngle = (i + 1) * sliceAngle;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();

      // Subtle radial gradient on each slice for glossy luxury finish
      const sliceGrad = ctx.createRadialGradient(center, center, 40, center, center, radius);
      sliceGrad.addColorStop(0, seg.color);
      sliceGrad.addColorStop(1, this.adjustBrightness(seg.color, -18));
      ctx.fillStyle = sliceGrad;
      ctx.fill();

      // Slice divider border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();

      // Draw segment text & icon
      const midAngle = startAngle + sliceAngle / 2;
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(midAngle);

      // Icon near rim
      ctx.font = '24px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(seg.icon, radius - 28, 0);

      // Label text
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = seg.textColor || '#FFFFFF';
      ctx.font = 'bold 20px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;
      ctx.fillText(seg.label, radius - 54, 0);

      ctx.restore();
    }

    // 5. Draw inner hub cutout ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, 44, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(198, 138, 40, 0.4)';
    ctx.fill();
    ctx.restore();
  },

  adjustBrightness(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  },

  attachEventListeners() {
    const hubBtn = document.getElementById('wheel-hub-btn');
    const spinBtn = document.getElementById('btn-spin-now');

    if (hubBtn && !hubBtn.dataset.bound) {
      hubBtn.dataset.bound = 'true';
      hubBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.spin();
      });
    }

    if (spinBtn && !spinBtn.dataset.bound) {
      spinBtn.dataset.bound = 'true';
      spinBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.spin();
      });
    }
  },

  /**
   * RIGGED OUTCOME GENERATOR:
   *  - 70% chance of "Try Again" (indices 0, 2, 4, 6)
   *  - 30% chance of "+Spin" (index 5)
   *  - 0% chance for "Free Trial Lesson" (index 1) and "Free 4-Lesson Subscription" (index 3)
   */
  pickOutcome() {
    const rand = Math.random();
    if (rand < 0.70) {
      // 70% Chance: Land on one of the 4 "Try Again" slots
      const tryAgainIndices = [0, 2, 4, 6];
      const pickedIndex = tryAgainIndices[Math.floor(Math.random() * tryAgainIndices.length)];
      return {
        index: pickedIndex,
        segment: this.segments[pickedIndex],
        type: 'try_again'
      };
    } else {
      // 30% Chance: Land on "+1 Spin"
      const pickedIndex = 5;
      return {
        index: pickedIndex,
        segment: this.segments[pickedIndex],
        type: 'bonus'
      };
    }
  },

  spin() {
    if (this.isSpinning) return;

    const state = this.getSpinState();
    if (state.spinsAvailable <= 0) {
      if (typeof showToast === 'function') {
        showToast('Daily spin limit reached for today! Resets at midnight.', 'info');
      }
      this.refresh();
      return;
    }

    this.isSpinning = true;

    // Deduct 1 spin from available allotment
    state.spinsAvailable -= 1;
    state.spinsUsedToday += 1;
    this.saveSpinState(state);

    // Disable controls while in motion
    this.setControlsDisabled(true);

    // Hide any previous outcome banner
    const banner = document.getElementById('spin-result-banner');
    if (banner) banner.style.display = 'none';

    // Pick rigged outcome according to exact specification
    const outcome = this.pickOutcome();

    // Compute stopping angle so the chosen slice center stops squarely at the top pointer (12 o'clock / 270 deg)
    const totalSegments = this.segments.length;
    const sliceAngle = 360 / totalSegments; // ~51.42857 deg

    // Target rotation modulo 360 that places slice center at 270° (top)
    const targetNormalized = ((270 - (outcome.index + 0.5) * sliceAngle) % 360 + 360) % 360;
    const currentNormalized = ((this.currentRotation % 360) + 360) % 360;

    let forwardDiff = targetNormalized - currentNormalized;
    if (forwardDiff <= 0) {
      forwardDiff += 360;
    }

    // 5 to 7 full revolutions for dramatic suspense
    const fullTurns = 360 * (5 + Math.floor(Math.random() * 3));
    // Safe organic jitter within slice (±8 deg, well inside the ±25.7 deg slice half-width)
    const jitter = (Math.random() - 0.5) * 16;

    const targetRotation = this.currentRotation + fullTurns + forwardDiff + jitter;
    this.currentRotation = targetRotation;

    // Trigger visual rotation & ticker needle vibration
    const rotator = document.getElementById('wheel-rotator');
    const pointer = document.getElementById('wheel-pointer-pin');
    if (pointer) pointer.classList.add('ticking');

    if (rotator) {
      rotator.style.transition = 'transform 4.5s cubic-bezier(0.15, 0.9, 0.2, 1)';
      rotator.style.transform = `rotate(${targetRotation}deg)`;
    }

    // Wait for wheel to conclude rotation
    setTimeout(() => {
      this.isSpinning = false;
      if (pointer) pointer.classList.remove('ticking');

      this.handleSpinCompleted(outcome);
    }, 4600);
  },

  handleSpinCompleted(outcome) {
    const state = this.getSpinState();

    if (outcome.type === 'bonus') {
      // Award +1 spin immediately so user can spin again today!
      state.spinsAvailable += 1;
      state.bonusAwarded = (state.bonusAwarded || 0) + 1;
      state.lastResult = 'bonus';
      this.saveSpinState(state);

      this.showOutcomeBanner(
        'bonus',
        '⚡ You Won +1 Bonus Spin!',
        'Congratulations! An extra spin has been credited to your account. Spin again now!'
      );

      if (typeof showToast === 'function') {
        showToast('🎉 Awesome! You won +1 Bonus Spin!', 'success');
      }
    } else {
      // Try again outcome
      state.lastResult = 'try_again';
      this.saveSpinState(state);

      this.showOutcomeBanner(
        'try_again',
        '🍀 Try Again Next Time!',
        'Better luck on your next daily spin. Check back tomorrow for another chance!'
      );

      if (typeof showToast === 'function') {
        showToast('🍀 Better luck next time! Try again tomorrow.', 'info');
      }
    }

    this.refresh();
  },

  showOutcomeBanner(type, headline, subline) {
    const banner = document.getElementById('spin-result-banner');
    const emoji = document.getElementById('spin-result-emoji');
    const title = document.getElementById('spin-result-headline');
    const desc = document.getElementById('spin-result-subline');

    if (!banner || !title || !desc) return;

    if (type === 'bonus') {
      banner.className = 'spin-result-banner bonus-spin';
      if (emoji) emoji.textContent = '⚡';
    } else {
      banner.className = 'spin-result-banner try-again';
      if (emoji) emoji.textContent = '🍀';
    }

    title.textContent = headline;
    desc.textContent = subline;
    banner.style.display = 'flex';
  },

  setControlsDisabled(disabled) {
    const hubBtn = document.getElementById('wheel-hub-btn');
    const spinBtn = document.getElementById('btn-spin-now');
    if (hubBtn) hubBtn.disabled = disabled;
    if (spinBtn) spinBtn.disabled = disabled;
  },

  refresh() {
    const state = this.getSpinState();
    const hubBtn = document.getElementById('wheel-hub-btn');
    const spinBtn = document.getElementById('btn-spin-now');
    const spinBtnLabel = document.getElementById('btn-spin-now-label');
    const statusPill = document.getElementById('daily-spin-status-badge');
    const statusText = document.getElementById('daily-spin-status-text');

    if (this.isSpinning) {
      this.setControlsDisabled(true);
      return;
    }

    if (state.spinsAvailable > 0) {
      this.setControlsDisabled(false);

      if (state.bonusAwarded > 0 && state.spinsUsedToday > 0) {
        if (spinBtnLabel) spinBtnLabel.textContent = 'Spin Your Bonus Spin!';
        if (statusText) statusText.textContent = `${state.spinsAvailable} Bonus Spin Ready`;
        if (statusPill) statusPill.className = 'spin-status-pill bonus';
      } else {
        if (spinBtnLabel) spinBtnLabel.textContent = 'Spin Wheel Now';
        if (statusText) statusText.textContent = `${state.spinsAvailable} Free Spin Available`;
        if (statusPill) statusPill.className = 'spin-status-pill available';
      }
    } else {
      this.setControlsDisabled(true);
      if (spinBtnLabel) spinBtnLabel.textContent = 'Daily Spin Used Today';
      if (statusText) statusText.textContent = 'Daily Spin Used';
      if (statusPill) statusPill.className = 'spin-status-pill locked';
    }

    this.updateCountdown();
  },

  updateCountdown() {
    const state = this.getSpinState();
    const timerText = document.getElementById('daily-spin-timer-text');
    if (!timerText) return;

    if (state.spinsAvailable > 0) {
      timerText.textContent = 'Limited to 1 spin per day • Resets daily at midnight';
      return;
    }

    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const diffMs = Math.max(0, tomorrow - now);

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

    const pad = (n) => String(n).padStart(2, '0');
    timerText.textContent = `Next free spin in: ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;

    // Midnight rollover detection: if diffMs <= 1000, trigger refresh
    if (diffMs <= 1000) {
      setTimeout(() => this.refresh(), 1500);
    }
  }
};

// Global export & auto-initialization
window.SpinWheel = SpinWheel;

document.addEventListener('DOMContentLoaded', () => {
  SpinWheel.init();
});
