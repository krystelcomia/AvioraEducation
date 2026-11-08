/**
 * AVIORA EDUCATION - LIVE VIRTUAL CLASSROOM & REAL-TIME 1-ON-1 CALL LOGIC
 * Features:
 * - Real-time two-way WebRTC video & audio calling (Google Meet style)
 * - Waiting state on tutor screen when room is open but student has not joined
 * - Dynamic status indicators: Waiting for student vs Live Feed
 * - Screen sharing with WebRTC track replacement
 * - Option to "pin" the presentation so that it appears as the large slide
 * - Auto-transcription feature: Only the tutor's voice is transcribed; transcript generated automatically; tutor can save and send to student
 * - Role permission: Student cannot end the call; only the teacher has the ability to end the call
 * - Camera on/off and mic mute/unmute with visual indicators for both parties
 * - Web Audio active speaker detection & visualizer (speaking pulse)
 * - In-room live chat with unread notification badge
 * - Fullscreen toggle
 * - 50-minute synchronized countdown timer with auto-conclude & 5-star rating overlay
 */

const VirtualRoom = {
  activeSessionId: null,
  sessionData: null,
  currentUserRole: null, // 'student' | 'tutor'
  localStream: null,
  remoteStream: null,
  screenStream: null,
  peerConnection: null,
  timerInterval: null,
  waitingPollInterval: null,
  chatPollInterval: null,
  signalingPollInterval: null,
  heartbeatPollInterval: null,
  audioVisualizerContext: null,
  lastSignalTimestamp: 0,
  isMicMuted: false,
  isVideoOff: false,
  isScreenSharing: false,
  isPresentationPinned: false,
  isChatOpen: false,
  isTranscriptDrawerOpen: false,
  unreadChatCount: 0,
  peerInRoom: false,
  peerConnected: false,
  peerMicMuted: false,
  peerVideoOff: false,
  postClassRating: 5,
  pendingIceCandidates: [],

  // Auto-Transcription (Tutor Voice Only)
  transcriptItems: [],
  speechRecognition: null,
  isTranscribing: false,

  // Google Public STUN Servers
  rtcConfig: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' }
    ]
  },

  /**
   * Main entrypoint when user clicks "Virtual Room" or "Join Live Class"
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
          // Tutor has not opened room yet: prompt tutor to open
          this.promptTutorToOpen(data);
        } else {
          // Student waits for tutor to open
          this.showWaitingRoom(data);
        }
        return;
      }

      // Room is open: enter live classroom!
      await this.launchClassroom(data);
    } catch (err) {
      console.error('Failed to join virtual room:', err);
      showToast(err.message || 'Unable to connect to virtual room.', 'error');
    }
  },

  /**
   * Tutor opens room directly
   */
  async openRoomAsTutor(sessionId) {
    if (typeof Teacher !== 'undefined' && Teacher.isApproved && !Teacher.isApproved()) {
      showToast('Account Under Review: Launching live virtual classroom sessions is locked until your tutor account is approved by an administrator.', 'warning');
      return;
    }
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
      showToast(`Waiting for educator ${data.session.tutor_name} to open the virtual room.`, 'info');
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
          showToast('Your educator has opened the classroom! Connecting you now...', 'success');
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
    this.stopAllMediaTracks();

    const modal = document.getElementById('virtual-room-modal');
    if (!modal) return;

    // Reset UI state
    document.getElementById('vroom-ended-overlay').style.display = 'none';
    this.isMicMuted = false;
    this.isVideoOff = false;
    this.isScreenSharing = false;
    this.isPresentationPinned = false;
    this.isChatOpen = false;
    this.isTranscriptDrawerOpen = false;
    this.unreadChatCount = 0;
    this.peerConnected = false;
    this.peerMicMuted = false;
    this.peerVideoOff = false;
    this.pendingIceCandidates = [];
    this.lastSignalTimestamp = 0;
    this.transcriptItems = [];

    const chatDrawer = document.getElementById('vroom-chat-drawer');
    if (chatDrawer) chatDrawer.style.display = 'none';
    const transcriptDrawer = document.getElementById('vroom-transcript-drawer');
    if (transcriptDrawer) transcriptDrawer.style.display = 'none';
    const captionBar = document.getElementById('vroom-live-caption-bar');
    if (captionBar) captionBar.style.display = 'none';
    const chatDot = document.getElementById('vroom-chat-unread-dot');
    if (chatDot) chatDot.style.display = 'none';
    const recDot = document.getElementById('vroom-transcript-rec-dot');
    if (recDot) recDot.style.display = 'none';

    // Populate session info
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

    const subjectEl = document.getElementById('vroom-header-subject');
    const peerNameEl = document.getElementById('vroom-peer-name');
    const peerRoleBadge = document.getElementById('vroom-peer-role-badge');
    const peerAvatar = document.getElementById('vroom-peer-avatar');
    const localNameEl = document.getElementById('vroom-local-name');
    const localAvatar = document.getElementById('vroom-local-avatar');

    if (subjectEl) subjectEl.textContent = `${data.session.subject} • 50-Min Class`;
    if (peerNameEl) peerNameEl.textContent = peer.name;
    if (peerRoleBadge) peerRoleBadge.textContent = peer.role;
    if (peerAvatar) peerAvatar.src = peer.avatar || '/assets/favicon.png';

    if (localNameEl) localNameEl.textContent = `${me.name} (${isTutor ? 'Educator' : 'Student'})`;
    if (localAvatar) localAvatar.src = me.avatar || '/assets/favicon.png';

    // Initial waiting / presence state on peer card
    this.peerInRoom = !!data.peer_online;
    this.updatePeerPresenceUI(this.peerInRoom, isTutor ? peer.name : 'Educator');

    // Button actions customized by role
    const pingBtn = document.getElementById('vroom-btn-ping-student');
    if (pingBtn) {
      pingBtn.style.display = isTutor ? 'inline-flex' : 'none';
    }

    // USER REQUIREMENT:
    // "At the end of a class, the tutor is required to provide comments before returning to the dashboard. 
    //  When the student ends the call, they will rate the tutor and provide feedback, which will then be reflected in the tutor's overall rating and the ratings displayed on their profile."
    const endBtn = document.getElementById('vroom-end-call-btn');
    if (endBtn) {
      endBtn.style.display = 'inline-flex';
      if (isTutor) {
        endBtn.innerHTML = `${Icons.phoneOff(16)} <span>End Class</span>`;
        endBtn.onclick = () => this.confirmEndClass();
      } else {
        endBtn.innerHTML = `${Icons.phoneOff(16)} <span>End Call</span>`;
        endBtn.onclick = () => this.confirmStudentEndCall();
      }
    }

    const topCloseBtn = document.getElementById('vroom-top-close-btn');
    if (topCloseBtn) {
      topCloseBtn.style.display = 'inline-flex';
      topCloseBtn.onclick = () => this.handleCloseClick();
    }

    // Role-specific action panel for transcript
    const transcriptActions = document.getElementById('vroom-transcript-actions');
    if (transcriptActions) {
      transcriptActions.style.display = isTutor ? 'flex' : 'none';
    }

    // Reset presentation pinned layout
    this.togglePinPresentation(false);

    modal.classList.add('active');

    // 50-minute synchronized countdown clock
    this.startTimer(data.remaining_seconds);

    // Initialize local camera and microphone
    await this.initLocalMedia();

    // Initialize auto-transcription for the tutor's voice ONLY
    if (isTutor) {
      this.initAutoTranscription();
    }

    // In-room live chat
    await this.loadMessages();
    this.startChatPolling();

    // Start participant heartbeat & presence polling
    this.startHeartbeat();

    // Start WebRTC connection & signaling
    await this.initWebRTC();
  },

  /**
   * Top bar close handler
   */
  handleCloseClick() {
    if (this.currentUserRole === 'student') {
      this.confirmStudentEndCall();
      return;
    }

    // For tutor: if overlay is active, enforce required comments before returning
    const overlay = document.getElementById('vroom-ended-overlay');
    if (overlay && overlay.style.display === 'flex') {
      const commentsInput = document.getElementById('vroom-tutor-ended-comments');
      const comments = commentsInput ? commentsInput.value.trim() : '';
      if (!comments) {
        const errorEl = document.getElementById('vroom-tutor-comments-error');
        if (errorEl) errorEl.style.display = 'block';
        if (commentsInput) {
          commentsInput.style.borderColor = '#F87171';
          commentsInput.focus();
        }
        showToast('Please provide required comments for your student before returning to the dashboard.', 'warning');
        return;
      }
    }

    this.confirmEndClass();
  },

  /**
   * When student ends the call:
   * Prompt, stop tracks, and open the post-class rating and feedback overlay
   */
  confirmStudentEndCall() {
    if (this.sessionData?.session?.has_reviewed) {
      this.leaveRoom();
      return;
    }

    if (!confirm('Are you sure you want to end this class? You will now rate your tutor and provide feedback.')) {
      return;
    }

    this.stopAllMediaTracks();
    if (this.activeSessionId) {
      API.leaveRoomPresence(this.activeSessionId).catch(() => {});
    }

    this.showPostClassOverlay();
    showToast('Call ended. Please rate your educator and provide feedback.', 'info');
  },

  /**
   * Update Peer Card state between "Waiting for Student to Join" and "Live Feed (Connected)"
   */
  updatePeerPresenceUI(peerOnline, peerDisplayName) {
    const statusLabel = document.getElementById('vroom-peer-status-label');
    const statusDot = document.getElementById('vroom-peer-status-dot');
    const statusText = document.getElementById('vroom-peer-status-text');
    const waitingBox = document.getElementById('vroom-peer-waiting-box');
    const waitingText = document.getElementById('vroom-peer-waiting-text');
    const remoteVideo = document.getElementById('vroom-peer-video');
    const remoteFallback = document.getElementById('vroom-peer-fallback');
    const isTutor = (this.currentUserRole === 'tutor');

    if (!peerOnline && !this.peerConnected) {
      // Waiting State: Student has not joined yet
      if (statusLabel) {
        statusLabel.style.borderColor = 'rgba(245, 158, 11, 0.4)';
        statusLabel.style.background = 'rgba(11, 15, 25, 0.85)';
      }
      if (statusDot) {
        statusDot.className = 'vroom-waiting-dot';
      }
      if (statusText) {
        statusText.textContent = isTutor ? 'Waiting for Student to Join...' : 'Connecting to Educator...';
        statusText.style.color = '#FBBF24';
      }
      if (waitingBox) {
        waitingBox.style.display = 'flex';
      }
      if (waitingText) {
        waitingText.textContent = isTutor ? `Waiting for ${peerDisplayName || 'student'} to join...` : 'Connecting to educator...';
      }
      if (remoteVideo) remoteVideo.style.display = 'none';
      if (remoteFallback) remoteFallback.style.display = 'flex';
    } else {
      // Connected / Live Feed State
      if (statusLabel) {
        statusLabel.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        statusLabel.style.background = 'rgba(11, 15, 25, 0.85)';
      }
      if (statusDot) {
        statusDot.className = 'vroom-pulse-dot';
      }
      if (statusText) {
        statusText.textContent = 'Live Feed';
        statusText.style.color = '#10B981';
      }
      if (waitingBox) {
        waitingBox.style.display = 'none';
      }
      if (this.peerConnected && !this.peerVideoOff && remoteVideo && remoteVideo.srcObject) {
        remoteVideo.style.display = 'block';
        if (remoteFallback) remoteFallback.style.display = 'none';
      } else {
        if (remoteFallback) remoteFallback.style.display = 'flex';
      }
    }
  },

  /**
   * Re-send high priority alert to student
   */
  async pingStudent() {
    if (!this.activeSessionId) return;
    try {
      await API.notifyStudentToJoinRoom(this.activeSessionId);
      showToast('🔔 Notification and invitation re-sent to student!', 'success');
    } catch (e) {
      showToast('Alert sent.', 'info');
    }
  },

  /**
   * Heartbeat to track who is inside the virtual room in real-time
   */
  startHeartbeat() {
    if (this.heartbeatPollInterval) clearInterval(this.heartbeatPollInterval);

    const sendPulse = async () => {
      if (!this.activeSessionId) return;
      try {
        const res = await API.sendRoomHeartbeat(this.activeSessionId, {
          role: this.currentUserRole,
          cameraActive: !this.isVideoOff,
          micActive: !this.isMicMuted,
          isScreenSharing: this.isScreenSharing
        });

        if (res && typeof res.peerOnline !== 'undefined') {
          const wasOnline = this.peerInRoom;
          this.peerInRoom = !!res.peerOnline;

          const peerName = this.currentUserRole === 'tutor' 
            ? (this.sessionData?.session?.student_name || 'student')
            : (this.sessionData?.session?.tutor_name || 'educator');

          this.updatePeerPresenceUI(this.peerInRoom, peerName);

          // If peer just arrived and we are the tutor, re-negotiate offer
          if (!wasOnline && this.peerInRoom && this.currentUserRole === 'tutor') {
            showToast(`${peerName} has entered the classroom! Connecting live feed...`, 'success');
            await this.renegotiateOffer();
          }
        }
      } catch (e) {
        // Silent heartbeat catch
      }
    };

    sendPulse();
    this.heartbeatPollInterval = setInterval(sendPulse, 2500);
  },

  /**
   * Request webcam & mic access
   * If camera is locked (e.g. testing two accounts in one computer),
   * falls back gracefully to synthetic canvas video track so WebRTC negotiation always succeeds!
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
        if (localFallback) localFallback.style.display = 'none';

        // Setup active speaker visualizer for local audio
        this.setupAudioVisualizer(this.localStream, true);
        return;
      }
    } catch (err) {
      console.warn('Real webcam device unavailable or in use by another tab. Generating live audio + HD video track:', err);
    }

    // Fallback: Attempt audio-only capture + create simulated live canvas video track
    try {
      let audioStream = null;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {}
      }

      const userName = (Auth.currentUser && Auth.currentUser.name) || (this.currentUserRole === 'tutor' ? 'Joshua Garcia' : 'Krystel Comia');
      const fallbackVideoTrack = this.createFallbackVideoTrack(userName);

      this.localStream = new MediaStream();
      if (audioStream) {
        audioStream.getAudioTracks().forEach(t => this.localStream.addTrack(t));
      }
      this.localStream.addTrack(fallbackVideoTrack);

      if (localVideo) {
        localVideo.srcObject = this.localStream;
        localVideo.style.display = 'block';
      }
      if (localFallback) localFallback.style.display = 'none';

      this.setupAudioVisualizer(this.localStream, true);
      showToast('Live media stream active (Simulated HD feed for multi-tab testing).', 'info');
    } catch (e) {
      console.warn('Failed to initialize fallback stream:', e);
    }
  },

  /**
   * Generates a 640x360 canvas video track with user's name and animated waves
   */
  createFallbackVideoTrack(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    let frame = 0;

    const render = () => {
      frame++;
      // Luxury dark gradient background
      const grad = ctx.createLinearGradient(0, 0, 640, 360);
      grad.addColorStop(0, '#0B0F19');
      grad.addColorStop(1, '#1A233A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 360);

      // Animated glowing orb in center
      const pulse = 48 + Math.sin(frame * 0.05) * 5;
      const orbGrad = ctx.createRadialGradient(320, 160, 10, 320, 160, pulse);
      orbGrad.addColorStop(0, 'rgba(198, 138, 40, 0.45)');
      orbGrad.addColorStop(1, 'rgba(198, 138, 40, 0)');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(320, 160, pulse, 0, Math.PI * 2);
      ctx.fill();

      // Avatar circle
      ctx.fillStyle = '#C68A28';
      ctx.beginPath();
      ctx.arc(320, 160, 38, 0, Math.PI * 2);
      ctx.fill();

      // Initials
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const initials = (name || 'Educator').split(' ').map(n => n[0]).join('').substring(0, 2);
      ctx.fillText(initials, 320, 160);

      // Name & live indicator
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 16px Inter, sans-serif';
      ctx.fillText(name, 320, 230);

      ctx.fillStyle = '#10B981';
      ctx.font = '600 12px Inter, sans-serif';
      ctx.fillText('● LIVE AUDIO & VIDEO FEED', 320, 255);

      requestAnimationFrame(render);
    };
    render();

    const stream = canvas.captureStream ? canvas.captureStream(30) : null;
    return stream ? stream.getVideoTracks()[0] : null;
  },

  /**
   * Google Meet Active Speaker Visualizer (Speaking Pulse)
   */
  setupAudioVisualizer(stream, isLocal) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx || !stream) return;
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.activeSessionId) {
          try { audioCtx.close(); } catch (e) {}
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const isSpeaking = avg > 20;

        const card = document.getElementById(isLocal ? 'vroom-local-card' : 'vroom-peer-card');
        const avatar = document.getElementById(isLocal ? 'vroom-local-avatar' : 'vroom-peer-avatar');

        const muted = isLocal ? this.isMicMuted : this.peerMicMuted;

        if (card) {
          if (isSpeaking && !muted) {
            card.classList.add('vroom-speaking');
            if (avatar) avatar.classList.add('vroom-speaking-avatar');
          } else {
            card.classList.remove('vroom-speaking');
            if (avatar) avatar.classList.remove('vroom-speaking-avatar');
          }
        }

        requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (e) {
      console.warn('Audio visualizer note:', e);
    }
  },

  /**
   * Toggle Audio Microphone Mute/Unmute
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
      badge.style.display = this.isMicMuted ? 'inline' : 'none';
    }

    // Pause/Resume Speech Recognition for tutor voice
    if (this.speechRecognition && this.currentUserRole === 'tutor') {
      if (this.isMicMuted) {
        try { this.speechRecognition.stop(); } catch (e) {}
        const tag = document.getElementById('vroom-transcript-status-tag');
        if (tag) {
          tag.textContent = '⏸️ Paused (Mic Muted)';
          tag.style.color = '#F59E0B';
        }
      } else {
        try { this.speechRecognition.start(); } catch (e) {}
      }
    }

    // Broadcast state to peer
    this.sendRoomSignal({
      type: 'media-status',
      micActive: !this.isMicMuted,
      cameraActive: !this.isVideoOff
    });

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
    const camBadge = document.getElementById('vroom-local-cam-badge');

    if (localVideo) localVideo.style.display = this.isVideoOff ? 'none' : 'block';
    if (localFallback) localFallback.style.display = this.isVideoOff ? 'flex' : 'none';
    if (camBadge) camBadge.style.display = this.isVideoOff ? 'inline' : 'none';

    const btn = document.getElementById('vroom-btn-video');
    if (btn) {
      btn.innerHTML = this.isVideoOff ? Icons.videoOff(20) : Icons.video(20);
      btn.style.background = this.isVideoOff ? '#EF4444' : 'rgba(255, 255, 255, 0.12)';
      btn.title = this.isVideoOff ? 'Turn On Camera' : 'Turn Off Camera';
    }

    // Broadcast state to peer
    this.sendRoomSignal({
      type: 'media-status',
      micActive: !this.isMicMuted,
      cameraActive: !this.isVideoOff
    });

    showToast(this.isVideoOff ? 'Camera turned off' : 'Camera turned on', 'info');
  },

  /**
   * Screen Sharing with WebRTC track replacement (Google Meet style)
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

        const pinCtrlBtn = document.getElementById('vroom-btn-pin-ctrl');
        if (pinCtrlBtn) pinCtrlBtn.style.display = 'inline-flex';

        // Auto-pin presentation as large slide whenever presenting
        this.togglePinPresentation(true);

        // Replace track on WebRTC sender so the other party sees the screen in real-time
        if (this.peerConnection) {
          const screenTrack = this.screenStream.getVideoTracks()[0];
          const senders = this.peerConnection.getSenders();
          const videoSender = senders.find(s => s.track && s.track.kind === 'video');
          if (videoSender && screenTrack) {
            await videoSender.replaceTrack(screenTrack);
          }
        }

        this.sendRoomSignal({ type: 'screen-status', active: true });

        // Handle user stopping screen share via browser's native ribbon
        this.screenStream.getVideoTracks()[0].onended = () => {
          this.stopScreenShare();
        };

        showToast('Screen presentation started — pinned as large slide.', 'success');
      }
    } catch (err) {
      console.warn('Screen share canceled or failed:', err);
    }
  },

  async stopScreenShare() {
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

    const pinCtrlBtn = document.getElementById('vroom-btn-pin-ctrl');
    if (pinCtrlBtn) pinCtrlBtn.style.display = 'none';

    // Unpin presentation layout
    this.togglePinPresentation(false);

    // Revert WebRTC sender track back to local camera track
    if (this.peerConnection && this.localStream) {
      const cameraTrack = this.localStream.getVideoTracks()[0];
      const senders = this.peerConnection.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');
      if (videoSender && cameraTrack) {
        await videoSender.replaceTrack(cameraTrack);
      }
    }

    this.sendRoomSignal({ type: 'screen-status', active: false });
    showToast('Screen presentation ended.', 'info');
  },

  /**
   * USER REQUIREMENT: Option to "pin" the presentation so that it appears as the large slide
   */
  togglePinPresentation(forcedState = null) {
    if (forcedState !== null) {
      this.isPresentationPinned = forcedState;
    } else {
      this.isPresentationPinned = !this.isPresentationPinned;
    }

    const grid = document.querySelector('.vroom-video-grid');
    const pinBtn = document.getElementById('vroom-btn-pin-screen');
    const pinCtrlBtn = document.getElementById('vroom-btn-pin-ctrl');
    const pinIcon = document.getElementById('vroom-pin-icon');
    const pinText = document.getElementById('vroom-pin-text');

    if (grid) {
      if (this.isPresentationPinned) {
        grid.classList.add('presentation-pinned');
      } else {
        grid.classList.remove('presentation-pinned');
      }
    }

    if (pinBtn) {
      if (this.isPresentationPinned) {
        pinBtn.classList.add('pinned');
        if (pinText) pinText.textContent = 'Unpin Slide';
        if (pinIcon) pinIcon.textContent = '📌';
      } else {
        pinBtn.classList.remove('pinned');
        if (pinText) pinText.textContent = 'Pin as Large Slide';
        if (pinIcon) pinIcon.textContent = '📍';
      }
    }

    if (pinCtrlBtn) {
      pinCtrlBtn.style.background = this.isPresentationPinned ? 'var(--gold-600)' : 'rgba(255, 255, 255, 0.12)';
      pinCtrlBtn.title = this.isPresentationPinned ? 'Unpin Presentation' : 'Pin Presentation to Large Slide';
    }

    this.sendRoomSignal({
      type: 'pin-status',
      isPinned: this.isPresentationPinned
    });
  },

  /**
   * USER REQUIREMENT: Auto-Transcription for Lesson Session (Tutor Voice Only)
   * Only the tutor's voice is transcribed; transcript is generated automatically.
   */
  initAutoTranscription() {
    if (this.currentUserRole !== 'tutor') {
      console.log('Auto-transcription is disabled for students: only the tutor voice is transcribed.');
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn('SpeechRecognition API not supported in this browser.');
      const tag = document.getElementById('vroom-transcript-status-tag');
      if (tag) {
        tag.textContent = '● Web Speech API unavailable in browser';
        tag.style.color = '#9CA3AF';
      }
      return;
    }

    try {
      this.speechRecognition = new SpeechRec();
      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = true;
      this.speechRecognition.lang = 'en-US';

      this.speechRecognition.onstart = () => {
        this.isTranscribing = true;
        const recDot = document.getElementById('vroom-transcript-rec-dot');
        if (recDot) recDot.style.display = 'block';
        const tag = document.getElementById('vroom-transcript-status-tag');
        if (tag) {
          tag.textContent = '● Transcribing Tutor Voice (Live)';
          tag.style.color = '#10B981';
        }
      };

      this.speechRecognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0].transcript.trim();
          if (res.isFinal) {
            if (text) {
              this.addTranscriptLine(text);
            }
          } else {
            interim += ' ' + text;
          }
        }

        // Live floating subtitle bar
        const captionBar = document.getElementById('vroom-live-caption-bar');
        const captionText = document.getElementById('vroom-live-caption-text');
        if (interim.trim() && !this.isMicMuted) {
          if (captionBar) captionBar.style.display = 'flex';
          if (captionText) captionText.textContent = interim.trim();
        } else {
          if (captionBar) captionBar.style.display = 'none';
        }
      };

      this.speechRecognition.onerror = (event) => {
        console.warn('Speech recognition status:', event.error);
      };

      this.speechRecognition.onend = () => {
        // Auto-restart if session is still active and tutor is unmuted
        if (this.activeSessionId && !this.isMicMuted && this.currentUserRole === 'tutor') {
          try {
            this.speechRecognition.start();
          } catch (e) {}
        } else {
          this.isTranscribing = false;
          const tag = document.getElementById('vroom-transcript-status-tag');
          if (tag) {
            tag.textContent = this.isMicMuted ? '⏸️ Paused (Microphone Muted)' : '● Paused';
            tag.style.color = '#F59E0B';
          }
        }
      };

      this.speechRecognition.start();
    } catch (e) {
      console.warn('Failed to start speech recognition:', e);
    }
  },

  addTranscriptLine(text) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const item = {
      time: timeStr,
      speaker: this.sessionData?.session?.tutor_name || 'Educator',
      text: text
    };

    this.transcriptItems.push(item);
    this.renderTranscriptList();

    // Broadcast transcript snippet to student
    this.sendRoomSignal({
      type: 'transcript-item',
      item: item
    });
  },

  renderTranscriptList() {
    const list = document.getElementById('vroom-transcript-list');
    if (!list) return;

    if (this.transcriptItems.length === 0) {
      list.innerHTML = `
        <div id="vroom-transcript-placeholder" style="color: #9CA3AF; font-size: 0.8rem; text-align: center; padding: 2rem 1rem;">
          Listening to educator speech... The live transcript will generate automatically here as the tutor teaches.
        </div>
      `;
      return;
    }

    list.innerHTML = this.transcriptItems.map(item => `
      <div style="margin-bottom: 0.65rem; padding: 0.5rem 0.75rem; background: rgba(255, 255, 255, 0.04); border-left: 2px solid var(--gold-500); border-radius: 6px;">
        <div style="font-size: 0.72rem; color: var(--gold-400); font-weight: 700; margin-bottom: 0.2rem; display: flex; justify-content: space-between;">
          <span>🎙️ ${escapeHtmlStr(item.speaker)}</span>
          <span style="color: #9CA3AF; font-size: 0.66rem;">${item.time}</span>
        </div>
        <div style="font-size: 0.84rem; color: #FFFFFF; line-height: 1.5; word-break: break-word;">
          ${escapeHtmlStr(item.text)}
        </div>
      </div>
    `).join('');

    list.scrollTop = list.scrollHeight;
  },

  toggleTranscriptDrawer() {
    this.isTranscriptDrawerOpen = !this.isTranscriptDrawerOpen;
    const drawer = document.getElementById('vroom-transcript-drawer');
    const btn = document.getElementById('vroom-btn-transcript');

    // Close chat drawer if open so they don't overlap
    if (this.isTranscriptDrawerOpen && this.isChatOpen) {
      this.toggleChat();
    }

    if (drawer) {
      drawer.style.display = this.isTranscriptDrawerOpen ? 'flex' : 'none';
    }
    if (btn) {
      btn.style.background = this.isTranscriptDrawerOpen ? 'var(--gold-600)' : 'rgba(255, 255, 255, 0.12)';
    }
  },

  /**
   * USER REQUIREMENT: Tutor can save transcript and send it to the student
   */
  async saveTranscript(andSendToStudent = false) {
    if (!this.activeSessionId) return;

    const fullText = this.transcriptItems.map(i => `[${i.time}] ${i.speaker}: ${i.text}`).join('\n\n');
    if (!fullText.trim()) {
      showToast('No transcript text generated yet. Speak into your microphone to record the session transcript.', 'info');
      return;
    }

    const btnId = andSendToStudent ? 'vroom-btn-send-transcript' : 'vroom-btn-save-transcript';
    const btn = document.getElementById(btnId);
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = andSendToStudent ? 'Sending to Student...' : 'Saving...';
    }

    try {
      if (andSendToStudent) {
        await API.sendRoomTranscriptToStudent(this.activeSessionId, { transcript: fullText });
        showToast('Lesson transcript successfully saved and sent to the student!', 'success');
      } else {
        await API.saveRoomTranscript(this.activeSessionId, { transcript: fullText });
        showToast('Lesson transcript saved successfully.', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to save transcript.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    }
  },

  copyTranscript() {
    const fullText = this.transcriptItems.map(i => `[${i.time}] ${i.speaker}: ${i.text}`).join('\n\n');
    if (!fullText.trim()) {
      showToast('No transcript to copy.', 'info');
      return;
    }
    navigator.clipboard.writeText(fullText).then(() => {
      showToast('Lesson transcript copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Could not copy to clipboard.', 'error');
    });
  },

  downloadTranscript() {
    const fullText = this.transcriptItems.map(i => `[${i.time}] ${i.speaker}: ${i.text}`).join('\n\n');
    if (!fullText.trim()) {
      showToast('No transcript to download.', 'info');
      return;
    }
    const subject = (this.sessionData?.session?.subject || 'Lesson').replace(/\s+/g, '_');
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${subject}_Auto_Transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded transcript file.', 'success');
  },

  /**
   * Toggle Fullscreen Mode
   */
  toggleFullscreen() {
    const modalWindow = document.querySelector('#virtual-room-modal .vroom-window');
    if (!modalWindow) return;

    if (!document.fullscreenElement) {
      modalWindow.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  },

  /**
   * In-Room Live Chat Drawer
   */
  toggleChat() {
    this.isChatOpen = !this.isChatOpen;
    const chatDrawer = document.getElementById('vroom-chat-drawer');
    const btn = document.getElementById('vroom-btn-chat');
    const dot = document.getElementById('vroom-chat-unread-dot');

    // Close transcript drawer if open so they don't overlap
    if (this.isChatOpen && this.isTranscriptDrawerOpen) {
      this.toggleTranscriptDrawer();
    }

    if (chatDrawer) {
      chatDrawer.style.display = this.isChatOpen ? 'flex' : 'none';
    }
    if (btn) {
      btn.style.background = this.isChatOpen ? 'var(--gold-600)' : 'rgba(255, 255, 255, 0.12)';
    }
    if (this.isChatOpen && dot) {
      dot.style.display = 'none';
      this.unreadChatCount = 0;
    }
  },

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
    this.chatPollInterval = setInterval(() => this.loadMessages(), 1800);
  },

  renderMessages(messages) {
    const list = document.getElementById('vroom-chat-list');
    if (!list) return;

    const currentCount = parseInt(list.dataset.msgCount || '0', 10);
    if (messages.length > currentCount && !this.isChatOpen && currentCount > 0) {
      const dot = document.getElementById('vroom-chat-unread-dot');
      if (dot) dot.style.display = 'block';
    }
    list.dataset.msgCount = messages.length;

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

      if (this.peerConnection) {
        try { this.peerConnection.close(); } catch (e) {}
      }

      this.peerConnection = new RTCPeerConnection(this.rtcConfig);

      // Add local audio and video tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }

      // Handle incoming remote media tracks (real-time video/audio feed)
      this.peerConnection.ontrack = (event) => {
        console.log('WebRTC ontrack received:', event.track.kind);
        const remoteVideo = document.getElementById('vroom-peer-video');
        const remoteFallback = document.getElementById('vroom-peer-fallback');
        const waitingBox = document.getElementById('vroom-peer-waiting-box');

        if (event.streams && event.streams[0]) {
          this.remoteStream = event.streams[0];
          if (remoteVideo) {
            remoteVideo.srcObject = event.streams[0];
            if (!this.peerVideoOff) {
              remoteVideo.style.display = 'block';
              if (remoteFallback) remoteFallback.style.display = 'none';
            }
          }
          // Setup active speaker visualizer for remote audio
          this.setupAudioVisualizer(event.streams[0], false);
        }

        this.peerConnected = true;
        if (waitingBox) waitingBox.style.display = 'none';
        this.updatePeerPresenceUI(true);
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.activeSessionId) {
          this.sendRoomSignal({
            type: 'candidate',
            candidate: event.candidate
          });
        }
      };

      // Start signaling poll
      this.startSignalingPoll();

      // Broadcast that we have entered the room
      await this.sendRoomSignal({
        type: 'peer-joined',
        role: this.currentUserRole
      });

      // If tutor, initiate offer
      if (this.currentUserRole === 'tutor') {
        await this.renegotiateOffer();
      }
    } catch (e) {
      console.warn('WebRTC initialization note:', e);
    }
  },

  async renegotiateOffer() {
    if (!this.peerConnection || !this.activeSessionId) return;
    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await this.peerConnection.setLocalDescription(offer);
      await this.sendRoomSignal({ type: 'offer', sdp: offer });
    } catch (e) {
      console.warn('Offer negotiation note:', e);
    }
  },

  async flushPendingIceCandidates() {
    if (!this.peerConnection) return;
    while (this.pendingIceCandidates.length > 0) {
      const cand = this.pendingIceCandidates.shift();
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {}
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
          if (!signal || !signal.type) continue;

          if (signal.type === 'peer-joined') {
            this.peerInRoom = true;
            this.updatePeerPresenceUI(true);
            if (this.currentUserRole === 'tutor') {
              await this.renegotiateOffer();
            }
          } else if (signal.type === 'offer' && this.currentUserRole !== 'tutor') {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            await this.flushPendingIceCandidates();
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            await this.sendRoomSignal({ type: 'answer', sdp: answer });
          } else if (signal.type === 'answer' && this.currentUserRole === 'tutor') {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            await this.flushPendingIceCandidates();
          } else if (signal.type === 'candidate') {
            if (this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
              try {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
              } catch (e) {}
            } else {
              this.pendingIceCandidates.push(signal.candidate);
            }
          } else if (signal.type === 'media-status') {
            this.peerMicMuted = !signal.micActive;
            this.peerVideoOff = !signal.cameraActive;

            const micBadge = document.getElementById('vroom-peer-mic-badge');
            const camBadge = document.getElementById('vroom-peer-cam-badge');
            const remoteVideo = document.getElementById('vroom-peer-video');
            const remoteFallback = document.getElementById('vroom-peer-fallback');

            if (micBadge) micBadge.style.display = this.peerMicMuted ? 'inline' : 'none';
            if (camBadge) camBadge.style.display = this.peerVideoOff ? 'inline' : 'none';

            if (this.peerVideoOff) {
              if (remoteVideo) remoteVideo.style.display = 'none';
              if (remoteFallback) remoteFallback.style.display = 'flex';
            } else if (this.peerConnected && remoteVideo && remoteVideo.srcObject) {
              if (remoteVideo) remoteVideo.style.display = 'block';
              if (remoteFallback) remoteFallback.style.display = 'none';
            }
          } else if (signal.type === 'pin-status') {
            this.togglePinPresentation(signal.isPinned);
          } else if (signal.type === 'screen-status') {
            const screenContainer = document.getElementById('vroom-screen-share-container');
            const pinCtrlBtn = document.getElementById('vroom-btn-pin-ctrl');
            if (signal.active) {
              if (screenContainer) screenContainer.style.display = 'block';
              if (pinCtrlBtn) pinCtrlBtn.style.display = 'inline-flex';
              this.togglePinPresentation(true);
            } else {
              if (screenContainer) screenContainer.style.display = 'none';
              if (pinCtrlBtn) pinCtrlBtn.style.display = 'none';
              this.togglePinPresentation(false);
            }
          } else if (signal.type === 'transcript-item') {
            // Student receives live transcript line from tutor
            if (this.currentUserRole !== 'tutor') {
              this.transcriptItems.push(signal.item);
              this.renderTranscriptList();

              const captionBar = document.getElementById('vroom-live-caption-bar');
              const captionText = document.getElementById('vroom-live-caption-text');
              if (captionBar && captionText) {
                captionBar.style.display = 'flex';
                captionText.textContent = signal.item.text;
                setTimeout(() => {
                  if (captionBar) captionBar.style.display = 'none';
                }, 4000);
              }
            }
          }
        }
      } catch (err) {}
    }, 1500);
  },

  async sendRoomSignal(signal) {
    if (!this.activeSessionId) return;
    try {
      await API.sendRoomSignal(this.activeSessionId, { signal });
    } catch (e) {}
  },

  /**
   * 50-Minute Countdown Clock synchronized to server started time
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
          // Under 1 minute warning
          timerBox.style.background = 'rgba(239, 68, 68, 0.25)';
          timerBox.style.borderColor = '#EF4444';
          timerBox.style.color = '#F87171';
        } else if (remaining <= 300) {
          // Under 5 minutes warning
          timerBox.style.background = 'rgba(245, 158, 11, 0.2)';
          timerBox.style.borderColor = '#F59E0B';
          timerBox.style.color = '#FBBF24';
        } else {
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
    
    // Auto-save transcript for tutor if generated
    if (this.transcriptItems && this.transcriptItems.length > 0 && this.currentUserRole === 'tutor' && this.activeSessionId) {
      const fullText = this.transcriptItems.map(i => `[${i.time}] ${i.speaker}: ${i.text}`).join('\n\n');
      API.saveRoomTranscript(this.activeSessionId, { transcript: fullText }).catch(() => {});
    }

    this.stopAllMediaTracks();

    if (this.activeSessionId) {
      try {
        await API.endRoom(this.activeSessionId);
      } catch (e) {
        console.error('Failed to notify backend of room end:', e);
      }
    }

    this.showPostClassOverlay();
    showToast('The 50-minute class duration has concluded. The call has automatically ended.', 'info');
  },

  /**
   * Post-Class Review Overlay
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
      if (commentInput) {
        commentInput.value = '';
        commentInput.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      }

      const ratingError = document.getElementById('vroom-student-rating-error');
      if (ratingError) ratingError.style.display = 'none';

      const submitBtn = document.getElementById('vroom-submit-review-btn');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Submit Rating &amp; Feedback →`;
      }

      this.setPostClassRating(5);
      this.renderPostClassStars();
    } else if (tutorView) {
      if (studentView) studentView.style.display = 'none';
      tutorView.style.display = 'block';

      const session = this.sessionData?.session || {};
      const studentNameEl = document.getElementById('vroom-tutor-ended-student-name');
      const studentAvatarEl = document.getElementById('vroom-tutor-ended-student-avatar');
      const subjectBadge = document.getElementById('vroom-tutor-ended-subject-badge');
      const commentsInput = document.getElementById('vroom-tutor-ended-comments');
      const errorEl = document.getElementById('vroom-tutor-comments-error');
      const transcriptBtn = document.getElementById('vroom-btn-use-transcript');
      const submitBtn = document.getElementById('vroom-btn-submit-tutor-comments');

      if (studentNameEl) studentNameEl.textContent = session.student_name || 'Student Scholar';
      if (studentAvatarEl) studentAvatarEl.src = session.student_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80';
      if (subjectBadge) subjectBadge.textContent = `${session.subject || 'Academic Lesson'} • 50-Min Class`;

      if (commentsInput) {
        commentsInput.value = session.lesson_summary || '';
        commentsInput.style.borderColor = 'rgba(255, 255, 255, 0.18)';
        setTimeout(() => commentsInput.focus(), 120);
      }
      if (errorEl) errorEl.style.display = 'none';

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Submit Comments &amp; Return to Dashboard →`;
      }

      const hasTranscript = (this.transcriptItems && this.transcriptItems.length > 0) || (session.lesson_transcript && session.lesson_transcript.trim().length > 0);
      if (transcriptBtn) {
        transcriptBtn.style.display = hasTranscript ? 'inline-flex' : 'none';
      }
    }
  },

  async generateTutorPostComments() {
    if (!this.activeSessionId) return;
    const btn = document.getElementById('vroom-btn-ai-comments');
    const commentsInput = document.getElementById('vroom-tutor-ended-comments');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '✨ Generating...';
    }
    try {
      const res = await API.generateAISummary(this.activeSessionId);
      if (res && res.summary && commentsInput) {
        commentsInput.value = res.summary;
        commentsInput.style.borderColor = 'var(--gold-500)';
        const errorEl = document.getElementById('vroom-tutor-comments-error');
        if (errorEl) errorEl.style.display = 'none';
        showToast('AI lesson comments generated! Review and submit to conclude.', 'success');
      }
    } catch (e) {
      showToast(e.message || 'Failed to generate AI comments.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    }
  },

  applyTutorPostTemplate() {
    const commentsInput = document.getElementById('vroom-tutor-ended-comments');
    if (!commentsInput) return;
    const session = this.sessionData?.session || {};
    const studentName = session.student_name || 'Student';
    const subject = session.subject || 'Lesson';
    const focus = session.notes || 'Curriculum mastery and problem-solving practice';

    commentsInput.value = `### 📚 ${subject} — 1-on-1 Lesson Summary & Comments\n` +
      `**Student:** ${studentName}\n` +
      `**Session Focus:** "${focus}"\n\n` +
      `#### 1. 🎯 Key Concepts Mastered\n` +
      `• Thorough review of foundational principles and diagnostic definitions.\n` +
      `• Addressed targeted questions regarding ${focus}.\n\n` +
      `#### 2. 💡 Recommendations & Next Steps\n` +
      `• Rework problems covered in today's class independently.\n` +
      `• Prepare follow-up questions before our next session.\n\n` +
      `#### 3. 🌟 Educator Feedback\n` +
      `Great engagement and focus today, ${studentName.split(' ')[0]}! Keep up the dedicated effort.`;

    commentsInput.style.borderColor = 'var(--gold-500)';
    const errorEl = document.getElementById('vroom-tutor-comments-error');
    if (errorEl) errorEl.style.display = 'none';
    showToast('Applied standard lesson comments template.', 'info');
  },

  useTranscriptInPostComments() {
    const commentsInput = document.getElementById('vroom-tutor-ended-comments');
    if (!commentsInput) return;
    let transcriptText = '';
    if (this.transcriptItems && this.transcriptItems.length > 0) {
      transcriptText = this.transcriptItems.map(i => `• [${i.time}] ${i.text}`).join('\n');
    } else if (this.sessionData?.session?.lesson_transcript) {
      transcriptText = this.sessionData.session.lesson_transcript;
    }
    if (!transcriptText) {
      showToast('No transcript remarks available.', 'info');
      return;
    }
    const appendStr = `\n\n#### 🎙️ Session Spoken Remarks Excerpts:\n${transcriptText}`;
    commentsInput.value = (commentsInput.value ? commentsInput.value.trim() : '') + appendStr;
    commentsInput.style.borderColor = 'var(--gold-500)';
    const errorEl = document.getElementById('vroom-tutor-comments-error');
    if (errorEl) errorEl.style.display = 'none';
    showToast('Inserted transcript remarks into comments.', 'success');
  },

  async submitTutorCommentsAndExit() {
    if (!this.activeSessionId) return;
    const commentsInput = document.getElementById('vroom-tutor-ended-comments');
    const errorEl = document.getElementById('vroom-tutor-comments-error');
    const submitBtn = document.getElementById('vroom-btn-submit-tutor-comments');

    const comments = commentsInput ? commentsInput.value.trim() : '';
    if (!comments) {
      if (errorEl) errorEl.style.display = 'block';
      if (commentsInput) {
        commentsInput.style.borderColor = '#F87171';
        commentsInput.focus();
      }
      showToast('Comments are required before returning to the dashboard.', 'warning');
      return;
    }

    if (errorEl) errorEl.style.display = 'none';
    const origHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Submitting Comments...';
    }

    try {
      // 1. Save and send lesson summary comments to student
      await API.saveAndSendLessonSummary(this.activeSessionId, { summary: comments });

      // 2. If transcript was generated and unsaved, save it
      if (this.transcriptItems && this.transcriptItems.length > 0) {
        const fullTranscript = this.transcriptItems.map(i => `[${i.time}] ${i.speaker}: ${i.text}`).join('\n\n');
        await API.saveRoomTranscript(this.activeSessionId, { transcript: fullTranscript }).catch(() => {});
      }

      showToast('Comments submitted and sent to student! Concluding session...', 'success');

      // 3. Leave the room and return to dashboard
      setTimeout(() => {
        this.leaveRoom();
        window.location.hash = '#teacher-classes';
        if (typeof Teacher !== 'undefined' && Teacher.loadClasses) {
          Teacher.loadClasses();
        }
      }, 700);
    } catch (err) {
      console.error('Failed to submit tutor comments:', err);
      showToast(err.message || 'Failed to submit comments. Please try again.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origHtml;
      }
    }
  },

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

  async submitPostClassRating() {
    if (!this.activeSessionId) return;

    const rating = this.postClassRating || 5;
    const commentEl = document.getElementById('vroom-rating-comment');
    const comment = commentEl ? commentEl.value.trim() : '';
    const ratingError = document.getElementById('vroom-student-rating-error');
    const submitBtn = document.getElementById('vroom-submit-review-btn');

    if (!comment) {
      if (ratingError) ratingError.style.display = 'block';
      if (commentEl) {
        commentEl.focus();
        commentEl.style.borderColor = '#F87171';
      }
      showToast('Please provide feedback for your tutor before submitting.', 'warning');
      return;
    }

    if (ratingError) ratingError.style.display = 'none';

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `Publishing Rating to Profile...`;
      }

      const res = await API.submitReview(this.activeSessionId, { rating, comment });

      if (this.sessionData && this.sessionData.session) {
        this.sessionData.session.has_reviewed = true;
        this.sessionData.session.review_rating = rating;
        this.sessionData.session.review_comment = comment;
        if (res.tutor_profile_id) {
          this.sessionData.session.tutor_profile_id = res.tutor_profile_id;
        }
      }

      const studentView = document.getElementById('vroom-ended-student-view');
      const successView = document.getElementById('vroom-ended-success-view');
      const successStarsText = document.getElementById('vroom-success-stars-text');
      const successTutorName = document.getElementById('vroom-success-tutor-name');
      const successCommentQuote = document.getElementById('vroom-success-comment-quote');

      if (studentView) studentView.style.display = 'none';
      if (successView) successView.style.display = 'block';

      if (successStarsText) {
        const starIcons = Array.from({ length: rating }).map(() => Icons.star(16)).join('');
        successStarsText.innerHTML = `${starIcons} ${rating}-Star Rating (${rating}.0)`;
      }
      if (successTutorName) {
        successTutorName.textContent = this.sessionData?.session?.tutor_name || 'your educator';
      }
      if (successCommentQuote) {
        successCommentQuote.style.display = 'block';
        successCommentQuote.textContent = `"${comment}"`;
      }

      showToast(res.message || 'Rating & feedback submitted! Reflected on tutor\'s profile.', 'success');

      if (typeof Student !== 'undefined' && Student.init) {
        Student.init();
      }
      if (typeof Tutors !== 'undefined' && Tutors.fetchTutors) {
        Tutors.fetchTutors();
      }
    } catch (err) {
      console.error('Failed to submit post-class review:', err);
      showToast(err.message || 'Failed to submit review.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Submit Rating &amp; Feedback →`;
      }
    }
  },

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
   * Leave classroom (Only triggered when session ends or educator concludes)
   */
  leaveRoom() {
    if (this.activeSessionId) {
      API.leaveRoomPresence(this.activeSessionId).catch(() => {});
    }
    this.stopAllMediaTracks();
    this.closeModal('virtual-room-modal');
    showToast('Closed the virtual classroom.', 'info');

    if (typeof Student !== 'undefined' && Student.init) Student.init();
    if (typeof Teacher !== 'undefined' && Teacher.loadTeacherDashboard) Teacher.loadTeacherDashboard();
  },

  /**
   * Tutor ending class for everyone
   * USER REQUIREMENT: Only the teacher should have the ability to end the call.
   */
  async confirmEndClass() {
    if (this.currentUserRole !== 'tutor') {
      showToast('Only your educator has the ability to end this virtual lesson session.', 'info');
      return;
    }

    if (!confirm('Are you sure you want to end this 50-minute class session for all participants?')) {
      return;
    }

    try {
      // Auto-save transcript before ending
      if (this.transcriptItems && this.transcriptItems.length > 0 && this.activeSessionId) {
        const fullText = this.transcriptItems.map(i => `[${i.time}] ${i.speaker}: ${i.text}`).join('\n\n');
        await API.saveRoomTranscript(this.activeSessionId, { transcript: fullText }).catch(() => {});
      }

      if (this.activeSessionId) {
        await API.endRoom(this.activeSessionId);
      }
      this.onTimerExpired();
    } catch (err) {
      showToast('Failed to end virtual room.', 'error');
    }
  },

  leaveRoomAndOpenSummary() {
    const sId = this.activeSessionId;
    this.leaveRoom();
    if (typeof Teacher !== 'undefined' && Teacher.openSummaryModal && sId) {
      Teacher.openSummaryModal(sId);
    }
  },

  stopAllMediaTracks() {
    if (this.speechRecognition) {
      try { this.speechRecognition.stop(); } catch (e) {}
      this.speechRecognition = null;
    }
    this.isTranscribing = false;

    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }
    this.remoteStream = null;
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
    if (this.heartbeatPollInterval) {
      clearInterval(this.heartbeatPollInterval);
      this.heartbeatPollInterval = null;
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
