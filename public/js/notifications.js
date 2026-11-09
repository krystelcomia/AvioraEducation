/**
 * AVIORA EDUCATION - NOTIFICATION CENTER & PREFERENCES SYNC
 * Manages in-app notifications, delivery filtering, real-time unread badges,
 * and immediate synchronization with user notification preferences.
 */

const NotificationsUI = {
  isOpen: false,
  notifications: [],
  unreadCount: 0,
  preferences: null,
  realtimeTimer: null,

  getStoredReadIds(userId) {
    if (!userId) return new Set();
    try {
      const raw = localStorage.getItem(`aviora_read_notifs_${userId}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) {
      return new Set();
    }
  },

  saveReadNotificationId(id) {
    const user = (typeof Auth !== 'undefined' && Auth.currentUser) || null;
    if (!user || !id) return;
    try {
      const set = this.getStoredReadIds(user.id);
      set.add(Number(id));
      localStorage.setItem(`aviora_read_notifs_${user.id}`, JSON.stringify(Array.from(set)));
    } catch (e) {}
  },

  startRealtimePolling() {
    if (this.realtimeTimer) return;
    this.realtimeTimer = setInterval(() => {
      if (typeof Auth !== 'undefined' && Auth.currentUser && document.visibilityState !== 'hidden') {
        this.fetchRealtimeUpdates();
      }
    }, 4000);
  },

  stopRealtimePolling() {
    if (this.realtimeTimer) {
      clearInterval(this.realtimeTimer);
      this.realtimeTimer = null;
    }
  },

  async fetchRealtimeUpdates() {
    if (typeof API === 'undefined' || !API.getNotifications) return;
    try {
      const res = await API.getNotifications();
      if (!res || !res.notifications) return;

      const user = (typeof Auth !== 'undefined' && Auth.currentUser) || null;
      const readSet = user ? this.getStoredReadIds(user.id) : new Set();

      const newNotifs = res.notifications.map(n => {
        if (readSet.has(Number(n.id))) n.is_read = 1;
        return n;
      });

      const unreadCount = newNotifs.filter(n => Number(n.is_read) === 0).length;
      const countChanged = unreadCount !== this.unreadCount;
      const prevIds = (this.notifications || []).map(n => n.id).join(',');
      const newIds = newNotifs.map(n => n.id).join(',');
      const listChanged = prevIds !== newIds;

      this.notifications = newNotifs;
      this.updateBadge(unreadCount);

      const dropdown = document.getElementById('nav-notif-dropdown');
      const isDropdownOpen = dropdown && dropdown.style.display !== 'none';
      if (isDropdownOpen && (listChanged || countChanged)) {
        this.renderList(this.notifications, res.preferences);
      }

      // If any notification is about a refund, refresh wallet in real time
      const hasRecentRefund = newNotifs.some(n => 
        (n.title && n.title.includes('Refunded')) || 
        (n.message && n.message.includes('credited to your Aviora wallet'))
      );
      if (hasRecentRefund && typeof Auth !== 'undefined' && Auth.refreshWallet) {
        Auth.refreshWallet();
      }
    } catch (e) {}
  },

  init() {
    this.bindEvents();
    // Fetch initial notifications if user is authenticated
    if (typeof Auth !== 'undefined' && Auth.currentUser) {
      this.fetchAndRender();
    }
  },

  bindEvents() {
    // Event delegation for bell button
    document.addEventListener('click', (e) => {
      const bellBtn = e.target.closest('#nav-notif-btn');
      if (bellBtn) {
        e.preventDefault();
        e.stopPropagation();
        this.toggleDropdown();
        return;
      }

      const markAllBtn = e.target.closest('#notif-mark-read-btn');
      if (markAllBtn) {
        e.preventDefault();
        e.stopPropagation();
        this.markAllRead();
        return;
      }

      // Close dropdown if clicked outside
      const dropdown = document.getElementById('nav-notif-dropdown');
      if (dropdown && this.isOpen) {
        if (!e.target.closest('#nav-notif-container')) {
          this.closeDropdown();
        }
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeDropdown();
      }
    });
  },

  toggleDropdown() {
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  },

  openDropdown() {
    const dropdown = document.getElementById('nav-notif-dropdown');
    if (!dropdown) return;
    dropdown.style.display = 'flex';
    this.isOpen = true;
    this.fetchAndRender();
    setTimeout(() => this.alignUnreadDots(), 60);
  },

  closeDropdown() {
    const dropdown = document.getElementById('nav-notif-dropdown');
    if (!dropdown) return;
    dropdown.style.display = 'none';
    this.isOpen = false;
  },

  updateBadge(count) {
    this.unreadCount = parseInt(count, 10) || 0;
    const badge = document.getElementById('nav-notif-badge');
    if (badge) {
      if (this.unreadCount > 0) {
        badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
        badge.textContent = '0';
      }
    }
  },

  async fetchAndRender() {
    if (typeof API === 'undefined' || !API.getNotifications) return;

    const listBody = document.getElementById('notif-dropdown-body');

    try {
      const res = await API.getNotifications();
      if (res && res.notifications) {
        const user = (typeof Auth !== 'undefined' && Auth.currentUser) || null;
        const readSet = user ? this.getStoredReadIds(user.id) : new Set();
        this.notifications = res.notifications.map(n => {
          if (readSet.has(Number(n.id))) n.is_read = 1;
          return n;
        });
        this.preferences = res.preferences || null;
        const unread = this.notifications.filter(n => Number(n.is_read) === 0).length;
        this.updateBadge(unread);
        this.renderList(this.notifications, res.preferences);
      }
    } catch (err) {
      console.warn('Notifications fetch notice:', err.message);
      if (listBody && (!this.notifications || this.notifications.length === 0)) {
        listBody.innerHTML = `
          <div class="notif-empty">
            <p>Unable to load notifications right now.</p>
          </div>
        `;
      }
    }
  },

  renderList(notifications, prefs) {
    const listBody = document.getElementById('notif-dropdown-body');
    if (!listBody) return;

    if (!notifications || notifications.length === 0) {
      listBody.innerHTML = `
        <div class="notif-empty">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <p>No notifications.</p>
        </div>
      `;
      return;
    }

    const html = notifications.map(notif => {
      const isUnread = Number(notif.is_read) === 0;
      const timeStr = this.formatRelativeTime(notif.created_at);
      const safeLink = notif.link ? notif.link : '#';

      return `
        <a href="${safeLink}" class="notif-item ${isUnread ? 'unread' : ''}" data-id="${notif.id}" onclick="NotificationsUI.handleItemClick(event, ${notif.id}, '${safeLink}')">
          ${isUnread ? '<span class="notif-unread-dot" aria-hidden="true"></span>' : ''}
          <div class="notif-item-details">
            <div class="notif-item-title">${this.escapeHtml(notif.title || 'Notification')}</div>
            <div class="notif-item-msg">${this.escapeHtml(notif.message || '')}</div>
            <span class="notif-item-time">${timeStr}</span>
          </div>
          ${isUnread ? `
            <button type="button" class="notif-item-read-btn" title="Mark as read" aria-label="Mark as read" onclick="event.preventDefault(); event.stopPropagation(); NotificationsUI.markSingleRead(${notif.id});">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </button>
          ` : ''}
        </a>
      `;
    }).join('');

    listBody.innerHTML = html;
    this.alignUnreadDots();
    requestAnimationFrame(() => this.alignUnreadDots());
    setTimeout(() => this.alignUnreadDots(), 60);
  },

  alignUnreadDots() {
    const items = document.querySelectorAll('.notif-item.unread');
    items.forEach(item => {
      const msg = item.querySelector('.notif-item-msg');
      const dot = item.querySelector('.notif-unread-dot');
      if (msg && dot) {
        const itemRect = item.getBoundingClientRect();
        const msgRect = msg.getBoundingClientRect();
        if (itemRect.height > 0 && msgRect.height > 0) {
          const msgCenterY = (msgRect.top + msgRect.bottom) / 2;
          const topOffset = Math.round(msgCenterY - itemRect.top);
          dot.style.top = `${topOffset}px`;
        }
      }
    });
  },

  getIconForType(type) {
    switch (type) {
      case 'reminder':
      case 'lesson_reminder':
      case 'lesson_alert':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;
      case 'calendar':
      case 'schedule':
      case 'booking':
      case 'booking_update':
      case 'status':
      case 'subscription':
      case 'request':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
      case 'message':
      case 'chat':
      case 'inquiry':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
      case 'report':
      case 'digest':
      case 'weekly_digest':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`;
      default:
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }
  },

  async markSingleRead(id) {
    const notif = (this.notifications || []).find(n => n.id == id);
    if (!notif || Number(notif.is_read) === 1) return;

    notif.is_read = 1;
    this.saveReadNotificationId(id);

    const item = document.querySelector(`.notif-item[data-id="${id}"]`);
    if (item) {
      item.classList.remove('unread');
      const dot = item.querySelector('.notif-unread-dot');
      if (dot) dot.remove();
      const readBtn = item.querySelector('.notif-item-read-btn');
      if (readBtn) readBtn.remove();
    }

    const unread = (this.notifications || []).filter(n => Number(n.is_read) === 0).length;
    this.updateBadge(unread);

    try {
      if (typeof API !== 'undefined' && API.markNotificationRead) {
        await API.markNotificationRead(id);
      } else if (typeof API !== 'undefined' && API.markNotificationsRead) {
        await API.markNotificationsRead(id);
      }
    } catch (err) {
      console.warn('Failed to mark notification read on server:', err);
    }
  },

  routeNotification(notif, rawLink) {
    const title = (notif?.title || '').toLowerCase();
    const msg = (notif?.message || '').toLowerCase();
    const link = rawLink || notif?.link || '';

    // 1. Refund / Wallet credit notification
    if (title.includes('refund') || title.includes('cancelled & credit') || msg.includes('credited to your aviora wallet') || msg.includes('wallet credit')) {
      const targetHash = '#student-portal?action=wallet';
      if (window.location.hash.startsWith('#student-portal')) {
        if (typeof Student !== 'undefined' && Student.handleNotificationNavigation) {
          Student.handleNotificationNavigation({ action: 'wallet', notifId: notif?.id });
        }
      } else {
        window.location.hash = targetHash;
      }
      return;
    }

    // 2. Live virtual classroom
    if (link.includes('virtual-room') || title.includes('virtual class launched') || title.includes('class is live')) {
      const match = link.match(/session=(\d+)/);
      const sessionId = match ? match[1] : null;
      if (sessionId && typeof VirtualRoom !== 'undefined') {
        const role = (typeof Auth !== 'undefined' && Auth.currentUser && (Auth.currentUser.role === 'teacher' || Auth.currentUser.role === 'tutor')) ? 'tutor' : 'student';
        VirtualRoom.joinRoom(sessionId, role);
        return;
      }
    }

    // 3. Lesson reminder or session booking
    if (link.includes('session=') || title.includes('reminder') || title.includes('session') || title.includes('booking')) {
      const match = link.match(/session=(\d+)/);
      const sessionId = match ? match[1] : null;
      if (typeof Auth !== 'undefined' && Auth.currentUser && (Auth.currentUser.role === 'teacher' || Auth.currentUser.role === 'tutor')) {
        const teacherTarget = sessionId ? `#teacher-classes?request=${sessionId}` : '#teacher-classes';
        if (window.location.hash.startsWith('#teacher-classes') && sessionId && typeof Teacher !== 'undefined' && Teacher.highlightRequest) {
          Teacher.highlightRequest(sessionId);
        } else {
          window.location.hash = teacherTarget;
        }
      } else {
        const studentTarget = sessionId ? `#student-portal?session=${sessionId}` : '#student-portal';
        if (window.location.hash.startsWith('#student-portal') && sessionId && typeof Student !== 'undefined' && Student.highlightSession) {
          Student.highlightSession(sessionId);
        } else {
          window.location.hash = studentTarget;
        }
      }
      return;
    }

    // 4. Academic task assigned / graded
    if (title.includes('task') || notif?.type === 'assignment') {
      const taskTarget = '#student-portal?action=tasks';
      if (window.location.hash.startsWith('#student-portal') && typeof Student !== 'undefined' && Student.handleNotificationNavigation) {
        Student.handleNotificationNavigation({ action: 'tasks' });
      } else {
        window.location.hash = taskTarget;
      }
      return;
    }

    // 5. Teacher application / interview
    if (title.includes('interview') || title.includes('application')) {
      window.location.hash = '#teacher-dashboard?action=interview';
      return;
    }

    // 6. Direct Message / Chat / Inquiry reply
    const isMessageNotif = (notif && notif.type === 'message') || 
                           title.includes('message from') || 
                           title.includes('reply from') || 
                           link.includes('tutor=') || 
                           link.includes('student-messages') ||
                           link.includes('messages');

    if (isMessageNotif) {
      if (typeof Auth !== 'undefined' && Auth.currentUser && Auth.currentUser.role === 'student') {
        let tutorParam = null;
        const match = link.match(/tutor=(\d+)/);
        if (match) {
          tutorParam = match[1];
        } else {
          // Extract educator name if present in notification title
          const nameMatch = (notif?.title || '').match(/(?:message|reply)\s+from\s+(.+)$/i);
          if (nameMatch) {
            tutorParam = nameMatch[1].trim();
          }
        }

        // Directly lead to the messages modal with this educator
        if (typeof Tutors !== 'undefined' && Tutors.openMessageModal) {
          Tutors.openMessageModal(tutorParam || 'latest');
        }
        return;
      } else if (typeof Auth !== 'undefined' && Auth.currentUser && (Auth.currentUser.role === 'teacher' || Auth.currentUser.role === 'tutor')) {
        window.location.hash = '#teacher-messages';
        return;
      }
    }

    // 7. Inquiry
    if (title.includes('inquiry')) {
      if (typeof Auth !== 'undefined' && Auth.currentUser && (Auth.currentUser.role === 'teacher' || Auth.currentUser.role === 'tutor')) {
        window.location.hash = '#teacher-messages';
      } else {
        window.location.hash = '#student-portal';
      }
      return;
    }

    // 8. Buddy
    if (title.includes('buddy')) {
      window.location.hash = '#aviora-buddy';
      return;
    }

    // Default: use link
    if (link && link !== '#' && link !== '') {
      window.location.hash = link.replace(/^\//, '');
    }
  },

  async handleItemClick(e, id, link) {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    this.closeDropdown();

    const notif = (this.notifications || []).find(n => n.id == id);
    const wasUnread = notif ? Number(notif.is_read) === 0 : true;

    if (notif) {
      notif.is_read = 1;
    }
    this.saveReadNotificationId(id);

    const item = document.querySelector(`.notif-item[data-id="${id}"]`);
    if (item) {
      item.classList.remove('unread');
      const dot = item.querySelector('.notif-unread-dot');
      if (dot) dot.remove();
      const readBtn = item.querySelector('.notif-item-read-btn');
      if (readBtn) readBtn.remove();
    }

    if (wasUnread) {
      const unread = (this.notifications || []).filter(n => Number(n.is_read) === 0).length;
      this.updateBadge(unread);

      try {
        if (typeof API !== 'undefined' && API.markNotificationRead) {
          await API.markNotificationRead(id);
        } else if (typeof API !== 'undefined' && API.markNotificationsRead) {
          await API.markNotificationsRead(id);
        }
      } catch (err) {
        console.warn('Failed to mark notification read on server:', err);
      }
    }

    this.routeNotification(notif, link);
  },

  async markAllRead() {
    try {
      if (typeof API !== 'undefined' && API.markNotificationsRead) {
        await API.markNotificationsRead();
      }
      (this.notifications || []).forEach(n => {
        n.is_read = 1;
        this.saveReadNotificationId(n.id);
      });
      this.updateBadge(0);
      document.querySelectorAll('.notif-item.unread').forEach(el => {
        el.classList.remove('unread');
        const dot = el.querySelector('.notif-unread-dot');
        if (dot) dot.remove();
        const readBtn = el.querySelector('.notif-item-read-btn');
        if (readBtn) readBtn.remove();
      });
      if (typeof showToast === 'function') {
        showToast('All notifications marked as read', 'info');
      }
    } catch (e) {
      console.warn('Mark all read notice:', e);
    }
  },

  formatRelativeTime(dateString) {
    if (!dateString) return 'Recent';
    try {
      const now = new Date();
      // SQLite TIMESTAMP is stored in UTC without timezone suffix
      let date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
      if (isNaN(date.getTime())) {
        date = new Date(dateString);
      }
      const diffSecs = Math.floor((now - date) / 1000);
      if (diffSecs < 60) return 'Just now';
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
      if (diffSecs < 604800) return `${Math.floor(diffSecs / 86400)}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return 'Recent';
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // Helper method to test delivery vs preferences
  async testDelivery(type = 'lesson_reminder', title = 'Test Alert', message = 'Testing notification preferences delivery.') {
    try {
      const res = await apiRequest('/notifications/test-delivery', {
        method: 'POST',
        body: JSON.stringify({ type, title, message })
      });
      if (res.blocked) {
        showToast(`Blocked by preferences: ${type} notifications are disabled.`, 'warning');
      } else {
        showToast(`Delivered successfully: ${title}`, 'success');
        this.fetchAndRender();
      }
      return res;
    } catch (err) {
      showToast('Test delivery failed: ' + err.message, 'error');
    }
  }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  NotificationsUI.init();
});
