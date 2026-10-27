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
        this.notifications = res.notifications;
        this.preferences = res.preferences || null;
        const unread = res.unreadCount !== undefined ? res.unreadCount : (this.notifications.filter(n => !n.is_read).length);
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
          <p>No new notifications based on your current preferences.</p>
        </div>
      `;
      return;
    }

    const html = notifications.map(notif => {
      const iconSvg = this.getIconForType(notif.type);
      const isUnread = !notif.is_read;
      const timeStr = this.formatRelativeTime(notif.created_at);
      const safeLink = notif.link ? notif.link : '#';

      return `
        <a href="${safeLink}" class="notif-item ${isUnread ? 'unread' : ''}" data-id="${notif.id}" onclick="NotificationsUI.handleItemClick(event, ${notif.id}, '${safeLink}')">
          <div class="notif-item-icon">${iconSvg}</div>
          <div class="notif-item-details">
            <div class="notif-item-title">${this.escapeHtml(notif.title || 'Notification')}</div>
            <div class="notif-item-msg">${this.escapeHtml(notif.message || '')}</div>
            <span class="notif-item-time">${timeStr}</span>
          </div>
        </a>
      `;
    }).join('');

    listBody.innerHTML = html;
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

  handleItemClick(e, id, link) {
    this.closeDropdown();
    // Optimistically mark this item as read
    const item = document.querySelector(`.notif-item[data-id="${id}"]`);
    if (item && item.classList.contains('unread')) {
      item.classList.remove('unread');
      this.updateBadge(Math.max(0, this.unreadCount - 1));
    }
    if (link && link !== '#') {
      window.location.hash = link.replace(/^\//, '');
    }
  },

  async markAllRead() {
    try {
      if (typeof API !== 'undefined' && API.markNotificationsRead) {
        await API.markNotificationsRead();
      }
      this.updateBadge(0);
      document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
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
