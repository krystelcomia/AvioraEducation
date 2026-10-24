/**
 * AVIORA EDUCATION - VIRTUAL CLASSROOM & CALL LOGIC
 * Supports 1-on-1 calls with real media streams (camera, mic, screen share),
 * access control (tutor opens room to begin class),
 * and an automatic 50-minute session duration countdown.
 */

const VirtualRoom = {
  activeSessionId: null,
  sessionData: null,
  currentUserRole: null, // 'student' | 'tutor'
  localStream: null,
  screenStream: null,
  peerConnection: null,
  timerInterval: null,
  waitingPollInterval: null,
  chatPollInterval: null,
  signalingPollInterval: null,
  lastSignalTimestamp: 0,
  isMicMuted: false,
  isVideoOff: false,
  isScreenSharing: false,
  isChatOpen: false,
  postClassRating: 5,

  // ICE Servers for WebRTC peer connection
  rtcConfig: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  },

  /**
   * Main entrypoint when user clicks "Virtual Room"
   */
  async joinRoom(sessionId, preferredRole = null) {
    this.activeSessionId = sessionId;

    try {
      const data = await API.getRoomDetails(sessionId);
      this.sessionData = data;
      this.currentUserRole = preferredRole || data.current_user_role;

      // Access control:
      // "It will only become accessible once the tutor opens the virtual room to begin the class."
      if (!data.is_open) {
        if (this.currentUserRole === 'tutor') {
          // Tutor has not opened the room yet: prompt tutor to open
          this.promptTutorToOpen(data);
        } else {
          // Student cannot access until tutor opens: show waiting room modal
          this.showWaitingRoom(data);
        }
        return;
      }

      // Room is open: enter live classroom!
      this.launchClassroom(data);
    } catch (err) {
      console.error('Failed to join virtual room:', err);
      showToast(err.message || 'Unable to connect to virtual room.', 'error');
    }
  },

  /**
   * Tutor opens room directly
   */
  async openRoomAsTutor(sessionId) {
    try {
      const res = await API.openRoom(sessionId);
      showToast(res.message || 'Virtual room opened! Class is now live.', 'success');
      await this.joinRoom(sessionId, 'tutor');
    } catch (err) {
      console.error('Failed to open virtual room:', err);
      showToast(err.message || 'Failed to open virtual room.', 'error');
    }
  },

  /**
   * Prompt tutor before opening class
   */
  promptTutorToOpen(data) {
    const modal = document.getElementById('virtual-room-tutor-prompt-modal');
    if (!modal) {
      if (confirm(`Open the virtual classroom for ${data.session.subject} with ${data.session.student_name}? This will start the 50-minute class session.`)) {
        this.openRoomAsTutor(data.session.id);
      }
      return;
    }

    const titleEl = document.getElementById('vroom-tutor-prompt-title');
    const descEl = document.getElementById('vroom-tutor-prompt-desc');
    if (titleEl) titleEl.textContent = `Open Virtual Room: ${data.session.subject}`;
    if (descEl) {
      descEl.innerHTML = `Student: <strong>${data.session.student_name}</strong><br>Scheduled: <strong>${data.session.requested_date} at ${data.session.requested_time}</strong><br><br>Opening the virtual room will begin the <strong>50-minute tailored class</strong> and notify the student that the room is accessible.`;
    }

    const openBtn = document.getElementById('vroom-tutor-prompt-open-btn');
    if (openBtn) {
      openBtn.onclick = () => {
        this.closeModal('virtual-room-tutor-prompt-modal');
        this.openRoomAsTutor(data.session.id);
      };
    }

    modal.classList.add('active');
  },

  /**
   * Student Waiting Room - polls until tutor opens the room
   */
  showWaitingRoom(data) {
    this.closeModal('virtual-room-modal');
    const modal = document.getElementById('virtual-room-waiting-modal');
    if (!modal) {
      showToast(`Waiting for instructor ${data.session.tutor_name} to open the virtual room.`, 'info');
      return;
    }

    const tutorAvatar = document.getElementById('vroom-wait-tutor-avatar');
    const tutorName = document.getElementById('vroom-wait-tutor-name');
    const subject = document.getElementById('vroom-wait-subject');
    const sched = document.getElementById('vroom-wait-schedule');

    if (tutorAvatar) tutorAvatar.src = data.session.tutor_avatar || '/assets/favicon.png';
    if (tutorName) tutorName.textContent = data.session.tutor_name;
    if (subject) subject.textContent = data.session.subject;
    if (sched) sched.textContent = `${data.session.requested_date} • ${data.session.requested_time} (50 Mins)`;

    modal.classList.add('active');

    // Poll every 2.5 seconds to check if tutor opens the room
    if (this.waitingPollInterval) clearInterval(this.waitingPollInterval);
    this.waitingPollInterval = setInterval(async () => {
      try {
        const check = await API.getRoomDetails(this.activeSessionId);
        if (check.is_open) {
          clearInterval(this.waitingPollInterval);
          this.waitingPollInterval = null;
          this.closeModal('virtual-room-waiting-modal');
          showToast('Your instructor has opened the classroom! Connecting you now...', 'success');
          this.launchClassroom(check);
        }
      } catch (e) {
        // Silent polling error catch
      }
    }, 2500);
  },

  closeWaitingModal() {
    if (this.waitingPollInterval) {
      clearInterval(this.waitingPollInterval);
      this.waitingPollInterval = null;
    }
    this.closeModal('virtual-room-waiting-modal');
  },

  /**
   * Launch Live Classroom
   */
  async launchClassroom(data) {
    this.sessionData = data;
    this.closeWaitingModal();

    const modal = document.getElementById('virtual-room-modal');
    if (!modal) return;

    // Reset UI state
    document.getElementById('vroom-ended-overlay').style.display = 'none';
    this.isMicMuted = false;
    this.isVideoOff = false;
    this.isScreenSharing = false;

    // Populate session info
    const subjectEl = document.getElementById('vroom-header-subject');
    const peerNameEl = document.getElementById('vroom-peer-name');
    const peerRoleBadge = document.getElementById('vroom-peer-role-badge');
    const peerAvatar = document.getElementById('vroom-peer-avatar');
    const localNameEl = document.getElementById('vroom-local-name');
    const localAvatar = document.getElementById('vroom-local-avatar');

    const isTutor = (this.currentUserRole === 'tutor');
    const peer = isTutor ? {
      name: data.session.student_name,
      role: 'Student',
      avatar: data.session.student_avatar
    } : {
      name: data.session.tutor_name,
      role: 'Faculty Educator',
      avatar: data.session.tutor_avatar
    };

    const me = isTutor ? {
      name: data.session.tutor_name,
      role: 'Instructor (You)',
      avatar: data.session.tutor_avatar
    } : {
      name: data.session.student_name,
      role: 'Student (You)',
      avatar: data.session.student_avatar
    };

    if (subjectEl) subjectEl.textContent = `${data.session.subject} • 50-Min Class`;
    if (peerNameEl) peerNameEl.textContent = peer.name;
    if (peerRoleBadge) peerRoleBadge.textContent = peer.role;
    if (peerAvatar) peerAvatar.src = peer.avatar || '/assets/favicon.png';

    if (localNameEl) localNameEl.textContent = `${me.name} (${isTutor ? 'Educator' : 'Student'})`;
    if (localAvatar) localAvatar.src = me.avatar || '/assets/favicon.png';

    // Show End / Leave Call button customized by role
    const endBtn = document.getElementById('vroom-end-call-btn');
    if (endBtn) {
      if (isTutor) {
        endBtn.innerHTML = `${Icons.phoneOff(16)} <span>End Class</span>`;
        endBtn.onclick = () => this.confirmEndClass();
      } else {
        endBtn.innerHTML = `${Icons.phoneOff(16)} <span>Leave Call</span>`;
        endBtn.onclick = () => this.leaveRoom();
      }
    }

    modal.classList.add('active');

    // Start 50-minute countdown timer synced to server
    this.startTimer(data.remaining_seconds);

    // Initialize local webcam / mic
    await this.initLocalMedia();

    // Initialize chat & messages polling
    await this.loadMessages();
    this.startChatPolling();

    // Start WebRTC signaling
    this.initWebRTC();
  },

  /**
   * 50-Minute Countdown Timer
   * Each virtual room is set for a 50-minute duration; the call automatically ends once this time has elapsed.
   */
  startTimer(initialRemainingSeconds) {
    if (this.timerInterval) clearInterval(this.timerInterval);

    let remaining = Math.max(0, initialRemainingSeconds);
    const timerDisplay = document.getElementById('vroom-timer-display');
    const timerBox = document.getElementById('vroom-timer-box');

    const updateDisplay = () => {
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      if (timerDisplay) {
        timerDisplay.textContent = formatted;
      }

      if (timerBox) {
        if (remaining <= 60) {
          // Under 1 minute: Red warning pulse
          timerBox.style.background = 'rgba(239, 68, 68, 0.25)';
          timerBox.style.borderColor = '#EF4444';
          timerBox.style.color = '#F87171';
        } else if (remaining <= 300) {
          // Under 5 minutes: Amber warning
          timerBox.style.background = 'rgba(245, 158, 11, 0.2)';
          timerBox.style.borderColor = '#F59E0B';
          timerBox.style.color = '#FBBF24';
        } else {
          // Normal 50-min class duration
          timerBox.style.background = 'rgba(198, 138, 40, 0.15)';
          timerBox.style.borderColor = 'rgba(198, 138, 40, 0.4)';
          timerBox.style.color = 'var(--gold-400)';
        }
      }
    };

    updateDisplay();

    this.timerInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        updateDisplay();
        this.onTimerExpired();
      } else {
        updateDisplay();
      }
    }, 1000);
  },

  /**
   * Automatic call end when 50 minutes elapse or class is concluded
   */
  async onTimerExpired() {
    console.log('50-minute class duration has elapsed. Concluding virtual room.');
    
    // Stop local camera and microphone immediately
    this.stopAllMediaTracks();

    // Mark room ended on backend
    if (this.activeSessionId) {
      try {
        await API.endRoom(this.activeSessionId);
      } catch (e) {
        console.error('Failed to notify backend of room end:', e);
      }
    }

    // Display conclusion & post-class rating overlay
    this.showPostClassOverlay();

    showToast('The 50-minute class duration has concluded. The call has automatically ended.', 'info');
  },

  /**
   * Display post-class rating overlay: allows students to rate tutor up to 5 stars
   */
  showPostClassOverlay() {
    const overlay = document.getElementById('vroom-ended-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';

    const studentView = document.getElementById('vroom-ended-student-view');
    const tutorView = document.getElementById('vroom-ended-tutor-view');
    const successView = document.getElementById('vroom-ended-success-view');

    if (successView) successView.style.display = 'none';

    const isStudent = (this.currentUserRole === 'student');

    if (isStudent && studentView) {
      if (tutorView) tutorView.style.display = 'none';
      studentView.style.display = 'block';

      const session = this.sessionData?.session || {};
      const tutorNameEl = document.getElementById('vroom-rate-tutor-name');
      const tutorNameEl2 = document.getElementById('vroom-rate-tutor-name-2');
      const tutorAvatarEl = document.getElementById('vroom-rate-tutor-avatar');
      const tutorHeadlineEl = document.getElementById('vroom-rate-tutor-headline');
      const subjectBadge = document.getElementById('vroom-rate-subject-badge');

      if (tutorNameEl) tutorNameEl.textContent = session.tutor_name || 'Educator';
      if (tutorNameEl2) tutorNameEl2.textContent = session.tutor_name || 'Educator';
      if (tutorAvatarEl) tutorAvatarEl.src = session.tutor_avatar || '/assets/favicon.png';
      if (tutorHeadlineEl) tutorHeadlineEl.textContent = session.tutor_headline || 'Aviora Faculty Specialist';
      if (subjectBadge) subjectBadge.textContent = `${session.subject || 'Academic Mentorship'} • 50-Min Class`;

      const commentInput = document.getElementById('vroom-rating-comment');
      if (commentInput) commentInput.value = '';

      const submitBtn = document.getElementById('vroom-submit-review-btn');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Submit Rating &amp; Reflect on Profile →`;
      }

      this.setPostClassRating(5);
      this.renderPostClassStars();
    } else if (tutorView) {
      if (studentView) studentView.style.display = 'none';
      tutorView.style.display = 'block';
    }
  },

  /**
   * Render interactive 5-star rating selector
   */
  renderPostClassStars() {
    const row = document.getElementById('vroom-star-row');
    if (!row) return;

    row.innerHTML = [1, 2, 3, 4, 5].map(starNum => `
      <button type="button" 
        class="vroom-star-btn ${starNum <= this.postClassRating ? '' : 'inactive'}" 
        data-star="${starNum}" 
        onclick="VirtualRoom.setPostClassRating(${starNum})" 
        onmouseenter="VirtualRoom.previewPostClassRating(${starNum})" 
        onmouseleave="VirtualRoom.restorePostClassRating()" 
        title="${starNum} Star${starNum > 1 ? 's' : ''}">
        ${Icons.star(30)}
      </button>
    `).join('');
  },

  /**
   * Set selected rating (1-5 stars)
   */
  setPostClassRating(rating) {
    this.postClassRating = Math.max(1, Math.min(5, parseInt(rating) || 5));

    const captions = {
      1: '1.0 — Needs Improvement',
      2: '2.0 — Fair Mentorship',
      3: '3.0 — Good Experience',
      4: '4.0 — Very Good Session',
      5: '5.0 — Outstanding Mentorship'
    };

    const captionEl = document.getElementById('vroom-rating-caption');
    if (captionEl) {
      captionEl.textContent = captions[this.postClassRating] || `${this.postClassRating}.0 Stars`;
    }

    const starBtns = document.querySelectorAll('#vroom-star-row .vroom-star-btn');
    starBtns.forEach((btn, idx) => {
      if (idx < this.postClassRating) {
        btn.classList.remove('inactive');
      } else {
        btn.classList.add('inactive');
      }
    });
  },

  previewPostClassRating(rating) {
    const starBtns = document.querySelectorAll('#vroom-star-row .vroom-star-btn');
    starBtns.forEach((btn, idx) => {
      if (idx < rating) {
        btn.classList.remove('inactive');
      } else {
        btn.classList.add('inactive');
      }
    });

    const captions = {
      1: '1.0 — Needs Improvement',
      2: '2.0 — Fair Mentorship',
      3: '3.0 — Good Experience',
      4: '4.0 — Very Good Session',
      5: '5.0 — Outstanding Mentorship'
    };
    const captionEl = document.getElementById('vroom-rating-caption');
    if (captionEl) {
      captionEl.textContent = captions[rating] || `${rating}.0 Stars`;
    }
  },

  restorePostClassRating() {
    this.setPostClassRating(this.postClassRating);
  },

  /**
   * Submit post-class rating and update tutor's profile
   */
  async submitPostClassRating() {
    if (!this.activeSessionId) return;

    const rating = this.postClassRating || 5;
    const commentEl = document.getElementById('vroom-rating-comment');
    const comment = commentEl ? commentEl.value.trim() : '';
    const submitBtn = document.getElementById('vroom-submit-review-btn');

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `Publishing Rating to Profile...`;
      }

      const res = await API.submitReview(this.activeSessionId, { rating, comment });

      // Update session data to reflect review
      if (this.sessionData && this.sessionData.session) {
        this.sessionData.session.has_reviewed = true;
        this.sessionData.session.review_rating = rating;
        this.sessionData.session.review_comment = comment;
      }

      // Switch to success view
      const studentView = document.getElementById('vroom-ended-student-view');
      const successView = document.getElementById('vroom-ended-success-view');
      const successStarsText = document.getElementById('vroom-success-stars-text');
      const successTutorName = document.getElementById('vroom-success-tutor-name');

      if (studentView) studentView.style.display = 'none';
      if (successView) successView.style.display = 'block';

      if (successStarsText) {
        successStarsText.innerHTML = `${Icons.star(16)} ${rating}-Star Rating (${rating}.0)`;
      }
      if (successTutorName) {
        successTutorName.textContent = this.sessionData?.session?.tutor_name || 'your educator';
      }

      showToast(res.message || 'Rating submitted! Reflected on tutor\'s profile.', 'success');

      // Refresh student dashboard and tutor profile cache in background
      if (typeof Student !== 'undefined' && Student.init) {
        Student.init();
      }
    } catch (err) {
      console.error('Failed to submit post-class review:', err);
      showToast(err.message || 'Failed to submit review.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Submit Rating &amp; Reflect on Profile →`;
      }
    }
  },

  /**
   * Navigate directly to tutor's profile to view the reflected rating and reviews
   */
  async goToTutorProfile() {
    const tutorProfileId = this.sessionData?.session?.tutor_profile_id || this.sessionData?.session?.tutor_id;
    this.stopAllMediaTracks();
    this.closeModal('virtual-room-modal');

    if (tutorProfileId) {
      window.location.hash = `#tutor-profile?id=${tutorProfileId}`;
      if (typeof Tutors !== 'undefined' && Tutors.loadFullProfilePage) {
        await Tutors.loadFullProfilePage(tutorProfileId);
      }
    } else {
      window.location.hash = '#tutors';
    }
  },

  /**
   * Request webcam & mic access
   */
  async initLocalMedia() {
    const localVideo = document.getElementById('vroom-local-video');
    const localFallback = document.getElementById('vroom-local-fallback');

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true
        });

        if (localVideo) {
          localVideo.srcObject = this.localStream;
          localVideo.style.display = 'block';
        }
        if (localFallback) {
          localFallback.style.display = 'none';
        }
      }
    } catch (err) {
      console.warn('Camera/Mic permission not granted or device unavailable:', err);
      // Fallback to avatar tile
      if (localVideo) localVideo.style.display = 'none';
      if (localFallback) localFallback.style.display = 'flex';
      showToast('Camera/Mic not detected or access not permitted. Running in audio/avatar mode.', 'info');
    }
  },

  /**
   * Toggle Audio Mute
   */
  toggleMic() {
    this.isMicMuted = !this.isMicMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMicMuted;
      });
    }

    const btn = document.getElementById('vroom-btn-mic');
    if (btn) {
      btn.innerHTML = this.isMicMuted ? Icons.micOff(20) : Icons.mic(20);
      btn.style.background = this.isMicMuted ? '#EF4444' : 'rgba(255, 255, 255, 0.12)';
      btn.title = this.isMicMuted ? 'Unmute Microphone' : 'Mute Microphone';
    }

    const badge = document.getElementById('vroom-local-mic-badge');
    if (badge) {
      badge.style.display = this.isMicMuted ? 'inline-flex' : 'none';
    }

    showToast(this.isMicMuted ? 'Microphone muted' : 'Microphone unmuted', 'info');
  },

  /**
   * Toggle Video Camera On/Off
   */
  toggleVideo() {
    this.isVideoOff = !this.isVideoOff;
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = !this.isVideoOff;
      });
    }

    const localVideo = document.getElementById('vroom-local-video');
    const localFallback = document.getElementById('vroom-local-fallback');

    if (localVideo) localVideo.style.display = this.isVideoOff ? 'none' : 'block';
    if (localFallback) localFallback.style.display = this.isVideoOff ? 'flex' : 'none';

    const btn = document.getElementById('vroom-btn-video');
    if (btn) {
      btn.innerHTML = this.isVideoOff ? Icons.videoOff(20) : Icons.video(20);
      btn.style.background = this.isVideoOff ? '#EF4444' : 'rgba(255, 255, 255, 0.12)';
      btn.title = this.isVideoOff ? 'Start Camera' : 'Stop Camera';
    }

    showToast(this.isVideoOff ? 'Camera turned off' : 'Camera turned on', 'info');
  },

  /**
   * Toggle Screen Share
   */
  async toggleScreenShare() {
    if (this.isScreenSharing) {
      this.stopScreenShare();
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        this.isScreenSharing = true;

        const screenContainer = document.getElementById('vroom-screen-share-container');
        const screenVideo = document.getElementById('vroom-screen-video');

        if (screenVideo) screenVideo.srcObject = this.screenStream;
        if (screenContainer) screenContainer.style.display = 'block';

        const btn = document.getElementById('vroom-btn-screen');
        if (btn) {
          btn.style.background = 'var(--gold-600)';
          btn.title = 'Stop Sharing Screen';
        }

        this.screenStream.getVideoTracks()[0].onended = () => {
          this.stopScreenShare();
        };

        showToast('Screen sharing started', 'success');
      }
    } catch (err) {
      console.warn('Screen share canceled or failed:', err);
    }
  },

  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }
    this.isScreenSharing = false;

    const screenContainer = document.getElementById('vroom-screen-share-container');
    if (screenContainer) screenContainer.style.display = 'none';

    const btn = document.getElementById('vroom-btn-screen');
    if (btn) {
      btn.style.background = 'rgba(255, 255, 255, 0.12)';
      btn.title = 'Share Screen';
    }

    showToast('Screen sharing ended', 'info');
  },

  /**
   * Toggle In-Room Chat Drawer
   */
  toggleChat() {
    this.isChatOpen = !this.isChatOpen;
    const chatDrawer = document.getElementById('vroom-chat-drawer');
    const btn = document.getElementById('vroom-btn-chat');
    if (chatDrawer) {
      chatDrawer.style.display = this.isChatOpen ? 'flex' : 'none';
    }
    if (btn) {
      btn.style.background = this.isChatOpen ? 'var(--gold-600)' : 'rgba(255, 255, 255, 0.12)';
    }
  },

  /**
   * In-Room Messages (Chat)
   */
  async loadMessages() {
    if (!this.activeSessionId) return;
    try {
      const res = await API.getRoomMessages(this.activeSessionId);
      this.renderMessages(res.messages || []);
    } catch (e) {
      console.error('Failed to load room messages:', e);
    }
  },

  startChatPolling() {
    if (this.chatPollInterval) clearInterval(this.chatPollInterval);
    this.chatPollInterval = setInterval(() => this.loadMessages(), 2500);
  },

  renderMessages(messages) {
    const list = document.getElementById('vroom-chat-list');
    if (!list) return;

    if (messages.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; color: var(--charcoal-400); font-size: 0.8rem; padding: 2rem 1rem;">
          No in-call messages yet. Exchange notes, formulas, or links here during the 50-minute class.
        </div>
      `;
      return;
    }

    const currentUserId = Auth.currentUser?.id;

    list.innerHTML = messages.map(m => {
      const isMe = (m.sender_id === currentUserId);
      const timeStr = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      return `
        <div style="margin-bottom: 0.75rem; display: flex; flex-direction: column; align-items: ${isMe ? 'flex-end' : 'flex-start'};">
          <div style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; color: var(--gold-400); margin-bottom: 0.15rem;">
            <strong>${escapeHtmlStr(m.sender_name)}</strong>
            <span style="font-size: 0.65rem; color: var(--charcoal-400);">${m.sender_role === 'tutor' ? '• Educator' : '• Student'}</span>
            <span style="font-size: 0.65rem; color: var(--charcoal-500);">${timeStr}</span>
          </div>
          <div style="max-width: 82%; padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.82rem; line-height: 1.4; background: ${isMe ? 'var(--gold-600)' : '#1F2937'}; color: #FFFFFF; word-break: break-word;">
            ${escapeHtmlStr(m.message)}
          </div>
        </div>
      `;
    }).join('');

    list.scrollTop = list.scrollHeight;
  },

  async handleSendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('vroom-chat-input');
    if (!input || !input.value.trim() || !this.activeSessionId) return;

    const text = input.value.trim();
    input.value = '';

    try {
      await API.sendRoomMessage(this.activeSessionId, { message: text });
      await this.loadMessages();
    } catch (err) {
      showToast('Could not send message.', 'error');
    }
  },

  /**
   * WebRTC Peer Connection & Signaling
   */
  async initWebRTC() {
    try {
      if (typeof RTCPeerConnection === 'undefined') return;

      this.peerConnection = new RTCPeerConnection(this.rtcConfig);

      // Add local audio/video tracks if available
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }

      // Handle remote incoming stream
      this.peerConnection.ontrack = (event) => {
        const remoteVideo = document.getElementById('vroom-peer-video');
        const remoteFallback = document.getElementById('vroom-peer-fallback');
        if (remoteVideo && event.streams && event.streams[0]) {
          remoteVideo.srcObject = event.streams[0];
          remoteVideo.style.display = 'block';
          if (remoteFallback) remoteFallback.style.display = 'none';
        }
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.activeSessionId) {
          API.sendRoomSignal(this.activeSessionId, {
            signal: { type: 'candidate', candidate: event.candidate }
          }).catch(() => {});
        }
      };

      // If tutor, create Offer; if student, wait for offer
      if (this.currentUserRole === 'tutor') {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        await API.sendRoomSignal(this.activeSessionId, {
          signal: { type: 'offer', sdp: offer }
        });
      }

      // Start signaling poll
      this.startSignalingPoll();
    } catch (e) {
      console.warn('WebRTC initialization note:', e);
    }
  },

  startSignalingPoll() {
    if (this.signalingPollInterval) clearInterval(this.signalingPollInterval);
    this.signalingPollInterval = setInterval(async () => {
      if (!this.activeSessionId || !this.peerConnection) return;
      try {
        const res = await API.getRoomSignals(this.activeSessionId, this.lastSignalTimestamp);
        const signals = res.signals || [];
        for (const item of signals) {
          if (item.timestamp > this.lastSignalTimestamp) {
            this.lastSignalTimestamp = item.timestamp;
          }
          const { signal } = item;
          if (signal.type === 'offer' && this.currentUserRole !== 'tutor') {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            await API.sendRoomSignal(this.activeSessionId, {
              signal: { type: 'answer', sdp: answer }
            });
          } else if (signal.type === 'answer' && this.currentUserRole === 'tutor') {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          } else if (signal.type === 'candidate') {
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch (err) {}
          }
        }
      } catch (err) {}
    }, 2000);
  },

  /**
   * Leave call (student or tutor closing window)
   */
  leaveRoom() {
    this.stopAllMediaTracks();
    this.closeModal('virtual-room-modal');
    showToast('Left the virtual classroom.', 'info');
    
    // Refresh student dashboard or teacher dashboard if open
    if (typeof Student !== 'undefined' && Student.init) Student.init();
    if (typeof Teacher !== 'undefined' && Teacher.loadTeacherDashboard) Teacher.loadTeacherDashboard();
  },

  /**
   * Tutor ending class for everyone
   */
  async confirmEndClass() {
    if (!confirm('Are you sure you want to end this 50-minute class session for all participants?')) {
      return;
    }

    try {
      if (this.activeSessionId) {
        await API.endRoom(this.activeSessionId);
      }
      this.onTimerExpired();
    } catch (err) {
      showToast('Failed to end virtual room.', 'error');
    }
  },

  stopAllMediaTracks() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.chatPollInterval) {
      clearInterval(this.chatPollInterval);
      this.chatPollInterval = null;
    }
    if (this.signalingPollInterval) {
      clearInterval(this.signalingPollInterval);
      this.signalingPollInterval = null;
    }
    if (this.peerConnection) {
      try { this.peerConnection.close(); } catch (e) {}
      this.peerConnection = null;
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }
};

window.VirtualRoom = VirtualRoom;
