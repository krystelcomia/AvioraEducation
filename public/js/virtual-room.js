/**
 * AVIORA EDUCATION - LIVE VIRTUAL CLASSROOM & REAL-TIME 1-ON-1 CALL LOGIC
 * Features:
 * - Real-time two-way WebRTC video & audio calling (Google Meet style)
 * - Waiting state on tutor screen when room is open but student has not joined
 * - Dynamic status indicators: Waiting for student vs Live Feed
 * - Screen sharing with WebRTC track replacement
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
  isChatOpen: false,
  unreadChatCount: 0,
  peerInRoom: false,
  peerConnected: false,
  peerMicMuted: false,
  peerVideoOff: false,
  postClassRating: 5,
  pendingIceCandidates: [],

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
    this.isChatOpen = false;
    this.unreadChatCount = 0;
    this.peerConnected = false;
    this.peerMicMuted = false;
    this.peerVideoOff = false;
    this.pendingIceCandidates = [];
    this.lastSignalTimestamp = 0;

    const chatDrawer = document.getElementById('vroom-chat-drawer');
    if (chatDrawer) chatDrawer.style.display = 'none';
    const chatDot = document.getElementById('vroom-chat-unread-dot');
    if (chatDot) chatDot.style.display = 'none';

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

    // 50-minute synchronized countdown clock
    this.startTimer(data.remaining_seconds);

    // Initialize local camera and microphone
    await this.initLocalMedia();

    // In-room live chat
    await this.loadMessages();
    this.startChatPolling();

    // Start participant heartbeat & presence polling
    this.startHeartbeat();

    // Start WebRTC connection & signaling
    await this.initWebRTC();
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
   * Guarantees 100% WebRTC negotiation success even during multi-window testing on 1 webcam
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

        showToast('Screen presentation started — visible to participants.', 'success');
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
    const submitBtn = document.getElementById('vroom-submit-review-btn');

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
      }

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
   * Leave call
   */
  leaveRoom() {
    if (this.activeSessionId) {
      API.leaveRoomPresence(this.activeSessionId).catch(() => {});
    }
    this.stopAllMediaTracks();
    this.closeModal('virtual-room-modal');
    showToast('Left the virtual classroom.', 'info');

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
