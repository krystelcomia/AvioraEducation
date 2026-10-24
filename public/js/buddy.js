/**
 * AVIORA BUDDY - 2-STUDENT CO-LEARNING & INTERACTIVE BATTLE STUDIO
 * Supports 2-student sessions ($6 flat fee per participant)
 * Both Tutor-Led and Peer-to-Peer modes, full game suite, quiz bee, chat, and whiteboard.
 */

const AvioraBuddy = {
  activeSession: null,
  allSessions: [],
  peersList: [],
  tutorsList: [],
  currentGame: 'quiz_bee', // 'quiz_bee' | 'math_duel' | 'word_scramble' | 'concept_match' | 'logic_quest' | 'whiteboard'
  
  // Game States
  quizIndex: 0,
  quizScores: { student1: 0, student2: 0, streak: 0 },
  mathCurrentIndex: 0,
  mathScores: { student1: 0, student2: 0 },
  scrambleIndex: 0,
  conceptFlipped: [],
  conceptMatched: [],
  whiteboardCtx: null,
  isDrawing: false,
  whiteboardColor: '#C68A28',
  whiteboardSize: 3,

  // Poll intervals
  chatPollTimer: null,
  classTimerInterval: null,
  classSecondsLeft: 50 * 60,

  // Question Banks
  quizBank: [
    {
      question: "What is the derivative of f(x) = 3x³ - 5x² + 7x - 9?",
      options: ["9x² - 10x + 7", "9x³ - 10x² + 7", "6x² - 10x + 7", "3x² - 5x + 7"],
      correct: 0,
      subject: "Calculus",
      explanation: "Using the power rule: d/dx(3x³) = 9x², d/dx(-5x²) = -10x, d/dx(7x) = 7, d/dx(-9) = 0."
    },
    {
      question: "According to Newton's Second Law, if net force on a 4 kg mass is 20 N, what is its acceleration?",
      options: ["2.0 m/s²", "5.0 m/s²", "80 m/s²", "0.2 m/s²"],
      correct: 1,
      subject: "Physics Mechanics",
      explanation: "a = F / m = 20 N / 4 kg = 5.0 m/s²."
    },
    {
      question: "Which organelle is responsible for cellular ATP synthesis via oxidative phosphorylation?",
      options: ["Golgi apparatus", "Ribosome", "Mitochondria", "Endoplasmic reticulum"],
      correct: 2,
      subject: "Biology / Biochemistry",
      explanation: "The mitochondria is the cellular energy powerhouse generating ATP."
    },
    {
      question: "What is the worst-case time complexity of searching in a balanced Binary Search Tree (AVL / Red-Black)?",
      options: ["O(1)", "O(n)", "O(log n)", "O(n log n)"],
      correct: 2,
      subject: "Computer Science",
      explanation: "Because the tree is balanced, tree height is log₂(n), yielding O(log n) operations."
    },
    {
      question: "In economics and statistics, what represents the proportion of variance explained by a regression model?",
      options: ["P-value", "R-squared (R²)", "Standard Deviation", "T-statistic"],
      correct: 1,
      subject: "Statistics",
      explanation: "R² (Coefficient of Determination) measures the proportion of variance in the dependent variable explained by independent variables."
    },
    {
      question: "Which literary device involves attributing human traits or emotions to inanimate objects or nature?",
      options: ["Synecdoche", "Personification", "Metonymy", "Hyperbole"],
      correct: 1,
      subject: "Literature",
      explanation: "Personification endows non-human entities with human attributes."
    }
  ],

  mathDuelBank: [
    { equation: "Solve for x:  3x + 14 = 41", answer: "9", hint: "Subtract 14 then divide by 3" },
    { equation: "Calculate:  16 × 15", answer: "240", hint: "16 × 10 + 16 × 5" },
    { equation: "What is:  √324 + 12", answer: "30", hint: "18 + 12" },
    { equation: "Solve:  2x² = 72  (Positive x)", answer: "6", hint: "x² = 36" },
    { equation: "Evaluate:  log₁₀(10,000)", answer: "4", hint: "10⁴ = 10,000" },
    { equation: "Compute:  45% of 200", answer: "90", hint: "0.45 × 200" }
  ],

  scrambleBank: [
    { scrambled: "H E O T Y P S I H S", answer: "HYPOTHESIS", clue: "A testable scientific explanation or proposition." },
    { scrambled: "E T N M M U M O", answer: "MOMENTUM", clue: "Quantity of motion of a moving body (mass × velocity)." },
    { scrambled: "M H T I R O G L A", answer: "ALGORITHM", clue: "A step-by-step procedure for solving a problem in computing." },
    { scrambled: "V I T A V L E A N C E", answer: "EQUIVALENCE", clue: "The condition of being equal in value, function, or meaning." },
    { scrambled: "S T I O S I M", answer: "MITOSIS", clue: "A type of cell division resulting in two daughter cells." }
  ],

  conceptPairs: [
    { id: 1, text: "F = m · a", matchKey: "newton2" },
    { id: 2, text: "Newton's 2nd Law", matchKey: "newton2" },
    { id: 3, text: "E = m · c²", matchKey: "relativity" },
    { id: 4, text: "Mass-Energy Equivalence", matchKey: "relativity" },
    { id: 5, text: "O(log n)", matchKey: "binarysearch" },
    { id: 6, text: "Binary Search Complexity", matchKey: "binarysearch" },
    { id: 7, text: "Mitochondria", matchKey: "powerhouse" },
    { id: 8, text: "Cell Powerhouse (ATP)", matchKey: "powerhouse" },
    { id: 9, text: "pH < 7", matchKey: "acidic" },
    { id: 10, text: "Acidic Solution", matchKey: "acidic" },
    { id: 11, text: "∫ eˣ dx", matchKey: "expintegral" },
    { id: 12, text: "eˣ + C", matchKey: "expintegral" }
  ],

  async init() {
    this.setupEventListeners();
    await this.loadBuddyHub();
  },

  setupEventListeners() {
    // Whiteboard canvas setup
    const canvas = document.getElementById('buddy-whiteboard-canvas');
    if (canvas) {
      this.whiteboardCtx = canvas.getContext('2d');
      this.initWhiteboard(canvas);
    }

    // Modal click outside
    ['modal-create-buddy-tutor', 'modal-create-buddy-peer', 'modal-join-buddy-code'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', (e) => {
          if (e.target === el) el.classList.remove('active');
        });
      }
    });
  },

  async loadBuddyHub() {
    try {
      const token = Storage.getToken();
      if (!token) {
        this.renderGuestHub();
        return;
      }

      const res = await fetch('/api/buddy/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load buddy hub');
      }

      this.allSessions = data.sessions || [];
      this.peersList = data.peers || [];
      this.tutorsList = data.tutors || [];

      this.renderHub(data);

      // If there is an active session, set as active
      if (this.allSessions.length > 0 && !this.activeSession) {
        this.selectSession(this.allSessions[0].id);
      }
    } catch (err) {
      console.warn('Aviora Buddy load error:', err);
      this.renderGuestHub();
    }
  },

  renderGuestHub() {
    const listContainer = document.getElementById('buddy-my-sessions-list');
    if (listContainer) {
      listContainer.innerHTML = `
        <div style="padding: 2.5rem; text-align: center; background: #FFFFFF; border-radius: 14px; border: 1.5px dashed rgba(198, 138, 40, 0.35);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">👥</div>
          <h4 style="font-family: var(--font-heading); font-size: 1.15rem; color: var(--charcoal-900); margin-bottom: 0.35rem;">Experience Aviora Buddy for $6</h4>
          <p style="color: var(--text-secondary); font-size: 0.88rem; max-width: 480px; margin: 0 auto 1.25rem;">
            Join two students in a single class for interactive quiz bees, math duels, and live co-learning. Set up with an accredited faculty tutor or study peer-to-peer!
          </p>
          <a href="#login" class="btn btn-primary btn-sm" style="font-weight: 700;">Sign In to Aviora Buddy ($6)</a>
        </div>
      `;
    }
    // Render interactive demo sandbox so guests can test the games right away
    this.renderSandboxDemo();
  },

  renderHub(data) {
    const listContainer = document.getElementById('buddy-my-sessions-list');
    if (!listContainer) return;

    if (!data.sessions || data.sessions.length === 0) {
      listContainer.innerHTML = `
        <div style="padding: 2.5rem; text-align: center; background: #FFFFFF; border-radius: 14px; border: 1.5px dashed rgba(198, 138, 40, 0.35);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚡</div>
          <h4 style="font-family: var(--font-heading); font-size: 1.2rem; color: var(--charcoal-900); margin-bottom: 0.35rem;">No Active Buddy Sessions Yet</h4>
          <p style="color: var(--text-secondary); font-size: 0.88rem; max-width: 480px; margin: 0 auto 1.25rem;">
            Ready to learn and compete with a buddy for $6? Set up a session with a faculty educator or launch a peer study battle below!
          </p>
          <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" onclick="AvioraBuddy.openPeerModal()">⚡ Start Peer Buddy ($6)</button>
            <button class="btn btn-outline-gold btn-sm" onclick="AvioraBuddy.openTutorModal()">🎓 Set Up with Tutor ($6/student)</button>
          </div>
        </div>
      `;
      this.renderSandboxDemo();
      return;
    }

    listContainer.innerHTML = data.sessions.map(s => {
      const isTutorLed = s.session_type === 'tutor_led';
      const hasSlot2 = !!s.student2_name;
      const isSelected = this.activeSession && this.activeSession.id === s.id;

      return `
        <div class="buddy-card ${isSelected ? 'active' : ''}" style="${isSelected ? 'border-color: var(--gold-500); background: linear-gradient(135deg, #FAF7F2 0%, #FFFFFF 100%);' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <span class="badge-gold" style="font-size: 0.7rem; font-weight: 800;">
              ${isTutorLed ? '🎓 Tutor-Led Class ($6/student)' : '⚡ Peer Buddy Session ($6)'}
            </span>
            <span style="font-family: monospace; font-size: 0.76rem; background: rgba(0,0,0,0.06); padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700;">
              Code: ${s.session_code}
            </span>
          </div>

          <h4 style="font-family: var(--font-heading); font-size: 1.15rem; font-weight: 800; color: var(--charcoal-900); margin-bottom: 0.35rem;">
            ${s.subject}
          </h4>
          <p style="color: var(--text-secondary); font-size: 0.82rem; margin-bottom: 1rem; line-height: 1.45;">
            ${s.topic || 'Quiz Bee, Speed Equations & Real-time Co-Learning'}
          </p>

          <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-top: 1px dashed var(--border-light); border-bottom: 1px dashed var(--border-light); margin-bottom: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="display: flex; align-items: center;">
                <img src="${s.student1_avatar || '/assets/favicon.png'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid var(--gold-400);" title="${s.student1_name || 'Student 1'}" />
                <img src="${s.student2_avatar || '/assets/favicon.png'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid #10B981; margin-left: -10px; background: #fff;" title="${s.student2_name || 'Awaiting Buddy'}" />
              </div>
              <div style="font-size: 0.78rem;">
                <div style="font-weight: 700; color: var(--charcoal-900);">${s.student1_name} &amp; ${s.student2_name || 'Open Slot'}</div>
                <div style="color: var(--text-secondary); font-size: 0.72rem;">${isTutorLed && s.tutor_name ? 'Tutor: ' + s.tutor_name : '2 Students Peer Battle'}</div>
              </div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 1.1rem; font-weight: 900; color: var(--gold-700); font-family: var(--font-heading);">$6.00</span>
              <div style="font-size: 0.7rem; color: var(--text-secondary);">per student</div>
            </div>
          </div>

          <div style="display: flex; gap: 0.65rem; align-items: center;">
            <button class="btn btn-primary btn-sm" onclick="AvioraBuddy.selectSession(${s.id})" style="flex: 1; font-weight: 700; font-size: 0.8rem; justify-content: center;">
              🎮 Enter Battle Arena
            </button>
            <button class="btn btn-outline-gold btn-sm" onclick="navigator.clipboard.writeText('${s.session_code}'); showToast('Buddy code ${s.session_code} copied to clipboard!', 'success');" title="Copy Session Code" style="padding: 0.35rem 0.6rem;">
              📋 Code
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  async selectSession(sessionId) {
    try {
      const token = Storage.getToken();
      const res = await fetch(`/api/buddy/session/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.activeSession = data.session;
      this.renderArena(data.session, data.messages || []);
      
      // Start chat polling
      this.startChatPoll(sessionId);

      const arena = document.getElementById('buddy-arena-section');
      if (arena) {
        arena.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    } catch (e) {
      console.warn('Select session error:', e);
      showToast('Could not load session details: ' + e.message, 'error');
    }
  },

  renderSandboxDemo() {
    const defaultSession = {
      id: 9999,
      session_code: 'DEMO-PLAY',
      session_type: 'peer_study',
      subject: 'AP Calculus & Physics Battle Arena ($6)',
      topic: 'Live Quiz Bee, Equation Duel & Collaborative Whiteboard',
      student1_name: (Auth.currentUser ? Auth.currentUser.name : 'Student 1'),
      student1_avatar: (Auth.currentUser ? Auth.currentUser.avatar_url : '/assets/favicon.png'),
      student2_name: 'Buddy Peer (Sophia)',
      student2_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      tutor_name: null,
      room_status: 'open'
    };
    this.activeSession = defaultSession;
    this.renderArena(defaultSession, [
      { sender_name: 'Aviora AI Buddy Bot', message: 'Welcome to Aviora Buddy ($6)! Switch tabs above to challenge your buddy in Quiz Bees, Math Duels, Word Scrambles, or draw on the Whiteboard!' }
    ]);
  },

  renderArena(session, messages) {
    const arenaContainer = document.getElementById('buddy-arena-section');
    if (!arenaContainer) return;
    arenaContainer.style.display = 'block';

    // Update Topbar
    const titleEl = document.getElementById('buddy-arena-title');
    const codeEl = document.getElementById('buddy-arena-code-badge');
    const s1NameEl = document.getElementById('buddy-player1-name');
    const s1AvatarEl = document.getElementById('buddy-player1-avatar');
    const s2NameEl = document.getElementById('buddy-player2-name');
    const s2AvatarEl = document.getElementById('buddy-player2-avatar');

    if (titleEl) titleEl.textContent = session.subject;
    if (codeEl) codeEl.textContent = `Code: ${session.session_code} • $6 Service`;
    if (s1NameEl) s1NameEl.textContent = session.student1_name || 'Student 1';
    if (s1AvatarEl && session.student1_avatar) s1AvatarEl.src = session.student1_avatar;
    if (s2NameEl) s2NameEl.textContent = session.student2_name || 'Awaiting Student 2';
    if (s2AvatarEl && session.student2_avatar) s2AvatarEl.src = session.student2_avatar;

    // Render Chat
    this.renderChatMessages(messages);

    // Render Current Game Tab
    this.switchGameTab(this.currentGame);
  },

  switchGameTab(gameKey) {
    this.currentGame = gameKey;

    document.querySelectorAll('.buddy-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.game === gameKey);
    });

    const stage = document.getElementById('buddy-game-stage');
    if (!stage) return;

    if (gameKey === 'quiz_bee') {
      this.renderQuizBee(stage);
    } else if (gameKey === 'math_duel') {
      this.renderMathDuel(stage);
    } else if (gameKey === 'word_scramble') {
      this.renderWordScramble(stage);
    } else if (gameKey === 'concept_match') {
      this.renderConceptMatch(stage);
    } else if (gameKey === 'logic_quest') {
      this.renderLogicQuest(stage);
    } else if (gameKey === 'whiteboard') {
      this.renderWhiteboard(stage);
    } else if (gameKey === 'video_call') {
      this.renderVideoCall(stage);
    }
  },

  // ==========================================
  // GAME 1: QUIZ BEE CHAMPIONSHIP
  // ==========================================
  renderQuizBee(stage) {
    const q = this.quizBank[this.quizIndex % this.quizBank.length];
    stage.innerHTML = `
      <div style="width: 100%; max-width: 680px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; color: rgba(255,255,255,0.7); font-size: 0.84rem;">
          <span class="badge-gold" style="font-size: 0.72rem; font-weight: 800;">🐝 Academic Quiz Bee • Question ${(this.quizIndex % this.quizBank.length) + 1} of ${this.quizBank.length}</span>
          <span>Category: <strong style="color: var(--gold-300);">${q.subject}</strong></span>
        </div>

        <div class="quiz-question-box">
          <h3 style="font-size: 1.25rem; font-weight: 800; color: #FFFFFF; line-height: 1.5; margin: 0;">
            ${q.question}
          </h3>
        </div>

        <div class="quiz-options-grid" id="quiz-options-container">
          ${q.options.map((opt, idx) => `
            <button type="button" class="quiz-option-btn" onclick="AvioraBuddy.handleQuizAnswer(${idx})">
              <span style="width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.78rem;">
                ${['A', 'B', 'C', 'D'][idx]}
              </span>
              <span>${opt}</span>
            </button>
          `).join('')}
        </div>

        <div id="quiz-feedback-box" style="margin-top: 1.25rem; min-height: 48px; text-align: center;"></div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.08);">
          <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6);">
            Streak Bonus: <strong style="color: var(--gold-400);">+${this.quizScores.streak * 20} pts</strong>
          </div>
          <button type="button" class="btn btn-outline-gold btn-sm" onclick="AvioraBuddy.nextQuizQuestion()" style="font-weight: 700;">
            Next Question →
          </button>
        </div>
      </div>
    `;
  },

  handleQuizAnswer(selectedIndex) {
    const q = this.quizBank[this.quizIndex % this.quizBank.length];
    const isCorrect = selectedIndex === q.correct;
    const buttons = document.querySelectorAll('#quiz-options-container .quiz-option-btn');
    const feedbackBox = document.getElementById('quiz-feedback-box');

    buttons.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === q.correct) {
        btn.classList.add('correct');
      } else if (idx === selectedIndex) {
        btn.classList.add('wrong');
      }
    });

    if (isCorrect) {
      this.quizScores.student1 += 100 + (this.quizScores.streak * 20);
      this.quizScores.streak++;
      if (feedbackBox) {
        feedbackBox.innerHTML = `
          <div style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10B981; color: #34D399; padding: 0.65rem 1rem; border-radius: 8px; font-size: 0.84rem; font-weight: 700;">
            ✓ Correct! +${100 + (this.quizScores.streak * 20)} pts awarded! ${q.explanation}
          </div>
        `;
      }
      showToast('Correct! Great job on ' + q.subject, 'success');
    } else {
      this.quizScores.streak = 0;
      if (feedbackBox) {
        feedbackBox.innerHTML = `
          <div style="background: rgba(239, 68, 68, 0.2); border: 1px solid #EF4444; color: #F87171; padding: 0.65rem 1rem; border-radius: 8px; font-size: 0.84rem; font-weight: 600;">
            ✕ Incorrect. Correct answer was ${['A', 'B', 'C', 'D'][q.correct]}. ${q.explanation}
          </div>
        `;
      }
    }

    this.updateScoreboardDisplay();
  },

  nextQuizQuestion() {
    this.quizIndex++;
    const stage = document.getElementById('buddy-game-stage');
    if (stage) this.renderQuizBee(stage);
  },

  // ==========================================
  // GAME 2: MATH DUEL (EQUATION SPRINT)
  // ==========================================
  renderMathDuel(stage) {
    const item = this.mathDuelBank[this.mathCurrentIndex % this.mathDuelBank.length];
    stage.innerHTML = `
      <div class="math-duel-board">
        <span class="badge-gold" style="font-size: 0.72rem; font-weight: 800;">🔢 Math Duel • Round ${(this.mathCurrentIndex % this.mathDuelBank.length) + 1} of ${this.mathDuelBank.length}</span>
        
        <div class="math-equation-display">${item.equation}</div>

        <p style="color: rgba(255,255,255,0.7); font-size: 0.84rem; margin-bottom: 1.5rem;">
          Hint: <em>${item.hint}</em>. Type the exact solution and hit Submit!
        </p>

        <form onsubmit="event.preventDefault(); AvioraBuddy.submitMathAnswer();" class="math-duel-input-wrap">
          <input type="text" id="math-duel-input" class="form-control" placeholder="Type solution..." autocomplete="off" style="background: rgba(0,0,0,0.4); border: 1.5px solid rgba(198, 138, 40, 0.4); color: #fff; font-weight: 800; font-size: 1.15rem; text-align: center;" autofocus />
          <button type="submit" class="btn btn-primary" style="font-weight: 800; padding: 0 1.25rem;">Submit</button>
        </form>

        <div id="math-feedback-box" style="margin-top: 1.25rem; min-height: 40px;"></div>

        <div style="margin-top: 1.5rem; display: flex; justify-content: center;">
          <button type="button" class="btn btn-outline-gold btn-sm" onclick="AvioraBuddy.nextMathRound()">Skip / Next Equation →</button>
        </div>
      </div>
    `;
    setTimeout(() => {
      const inp = document.getElementById('math-duel-input');
      if (inp) inp.focus();
    }, 100);
  },

  submitMathAnswer() {
    const input = document.getElementById('math-duel-input');
    if (!input) return;
    const userVal = input.value.trim().toLowerCase();
    const item = this.mathDuelBank[this.mathCurrentIndex % this.mathDuelBank.length];
    const feedback = document.getElementById('math-feedback-box');

    if (userVal === item.answer.toLowerCase()) {
      this.quizScores.student1 += 150;
      if (feedback) {
        feedback.innerHTML = `<span style="color: #34D399; font-weight: 800; font-size: 0.95rem;">🎉 Spot on! +150 Points!</span>`;
      }
      showToast('Math Duel Winner! +150 Points!', 'success');
      this.updateScoreboardDisplay();
      setTimeout(() => this.nextMathRound(), 1200);
    } else {
      if (feedback) {
        feedback.innerHTML = `<span style="color: #F87171; font-weight: 700; font-size: 0.88rem;">Not quite. Try again or check the hint!</span>`;
      }
    }
  },

  nextMathRound() {
    this.mathCurrentIndex++;
    const stage = document.getElementById('buddy-game-stage');
    if (stage) this.renderMathDuel(stage);
  },

  // ==========================================
  // GAME 3: WORD SCRAMBLE (VOCAB MASTER)
  // ==========================================
  renderWordScramble(stage) {
    const item = this.scrambleBank[this.scrambleIndex % this.scrambleBank.length];
    const letters = item.scrambled.split(' ');

    stage.innerHTML = `
      <div style="width: 100%; max-width: 600px; text-align: center; background: rgba(255,255,255,0.04); border: 1px solid rgba(198, 138, 40, 0.25); border-radius: 16px; padding: 2.25rem;">
        <span class="badge-gold" style="font-size: 0.72rem; font-weight: 800;">🔤 Vocabulary Scramble • Word ${(this.scrambleIndex % this.scrambleBank.length) + 1}</span>
        
        <p style="color: var(--gold-300); font-size: 0.92rem; margin: 1rem 0 0.5rem 0; font-weight: 600;">
          "${item.clue}"
        </p>

        <div class="scramble-tiles-container">
          ${letters.map(l => `<div class="scramble-letter-tile">${l}</div>`).join('')}
        </div>

        <form onsubmit="event.preventDefault(); AvioraBuddy.submitScramble();" style="display: flex; gap: 0.75rem; max-width: 360px; margin: 1rem auto 0;">
          <input type="text" id="scramble-input" class="form-control" placeholder="Type unscrambled word..." style="background: rgba(0,0,0,0.4); border: 1.5px solid rgba(198, 138, 40, 0.4); color: #fff; font-weight: 800; text-transform: uppercase; text-align: center;" />
          <button type="submit" class="btn btn-primary" style="font-weight: 800;">Solve</button>
        </form>

        <div id="scramble-feedback" style="min-height: 38px; margin-top: 1rem;"></div>

        <button type="button" class="btn btn-outline-gold btn-sm" onclick="AvioraBuddy.nextScramble()" style="margin-top: 0.5rem;">Next Word →</button>
      </div>
    `;
  },

  submitScramble() {
    const input = document.getElementById('scramble-input');
    if (!input) return;
    const val = input.value.trim().toUpperCase();
    const item = this.scrambleBank[this.scrambleIndex % this.scrambleBank.length];
    const fb = document.getElementById('scramble-feedback');

    if (val === item.answer) {
      this.quizScores.student1 += 120;
      if (fb) fb.innerHTML = `<span style="color: #34D399; font-weight: 800;">✓ Correct! Word: ${item.answer} (+120 pts)</span>`;
      showToast('Unscrambled correctly! +120 pts', 'success');
      this.updateScoreboardDisplay();
      setTimeout(() => this.nextScramble(), 1200);
    } else {
      if (fb) fb.innerHTML = `<span style="color: #F87171; font-weight: 600;">Incorrect unscramble. Keep trying!</span>`;
    }
  },

  nextScramble() {
    this.scrambleIndex++;
    const stage = document.getElementById('buddy-game-stage');
    if (stage) this.renderWordScramble(stage);
  },

  // ==========================================
  // GAME 4: CONCEPT MATCH (MEMORY TILES)
  // ==========================================
  renderConceptMatch(stage) {
    this.conceptFlipped = [];
    this.conceptMatched = [];

    // Shuffle tiles
    const shuffled = [...this.conceptPairs].sort(() => Math.random() - 0.5);

    stage.innerHTML = `
      <div style="width: 100%; max-width: 680px; text-align: center;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <span class="badge-gold" style="font-size: 0.72rem; font-weight: 800;">🃏 Concept Match • Pair Scientific Laws &amp; Formulas</span>
          <span style="font-size: 0.8rem; color: rgba(255,255,255,0.7);" id="concept-match-counter">Pairs Matched: 0 / 6</span>
        </div>

        <div class="concept-match-grid" id="concept-match-grid">
          ${shuffled.map(t => `
            <div class="concept-tile" id="tile-${t.id}" data-id="${t.id}" data-key="${t.matchKey}" onclick="AvioraBuddy.handleTileClick(${t.id}, '${t.matchKey}')">
              <span class="tile-hidden-content" style="display: none;">${t.text}</span>
              <span class="tile-back">✦</span>
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 1.5rem;">
          <button type="button" class="btn btn-outline-gold btn-sm" onclick="AvioraBuddy.switchGameTab('concept_match')">🔄 Reset Board</button>
        </div>
      </div>
    `;
  },

  handleTileClick(tileId, matchKey) {
    if (this.conceptMatched.includes(tileId)) return;
    if (this.conceptFlipped.length >= 2) return;
    if (this.conceptFlipped.find(t => t.id === tileId)) return;

    const tileEl = document.getElementById(`tile-${tileId}`);
    if (!tileEl) return;

    tileEl.classList.add('flipped');
    const content = tileEl.querySelector('.tile-hidden-content');
    const back = tileEl.querySelector('.tile-back');
    if (content) content.style.display = 'block';
    if (back) back.style.display = 'none';

    this.conceptFlipped.push({ id: tileId, key: matchKey });

    if (this.conceptFlipped.length === 2) {
      const [first, second] = this.conceptFlipped;
      if (first.key === second.key) {
        // Matched!
        setTimeout(() => {
          document.getElementById(`tile-${first.id}`)?.classList.add('matched');
          document.getElementById(`tile-${second.id}`)?.classList.add('matched');
          this.conceptMatched.push(first.id, second.id);
          this.quizScores.student1 += 150;
          this.conceptFlipped = [];
          this.updateScoreboardDisplay();

          const counter = document.getElementById('concept-match-counter');
          if (counter) counter.textContent = `Pairs Matched: ${this.conceptMatched.length / 2} / 6`;

          if (this.conceptMatched.length === this.conceptPairs.length) {
            showToast('All 6 Concept Pairs Matched! Outstanding memory & physics fluency!', 'success');
          }
        }, 350);
      } else {
        // Not a match: flip back
        setTimeout(() => {
          [first, second].forEach(item => {
            const el = document.getElementById(`tile-${item.id}`);
            if (el) {
              el.classList.remove('flipped');
              const c = el.querySelector('.tile-hidden-content');
              const b = el.querySelector('.tile-back');
              if (c) c.style.display = 'none';
              if (b) b.style.display = 'block';
            }
          });
          this.conceptFlipped = [];
        }, 900);
      }
    }
  },

  // ==========================================
  // GAME 5: LOGIC & CODE RIDDLE QUEST
  // ==========================================
  renderLogicQuest(stage) {
    stage.innerHTML = `
      <div style="width: 100%; max-width: 640px; background: rgba(255,255,255,0.04); border: 1px solid rgba(198, 138, 40, 0.25); border-radius: 16px; padding: 2.25rem; text-align: center;">
        <span class="badge-gold" style="font-size: 0.72rem; font-weight: 800;">🧩 Logic &amp; Code Riddle Quest</span>
        
        <h3 style="color: #FFFFFF; font-size: 1.25rem; margin: 1.25rem 0 0.75rem 0; line-height: 1.5;">
          "I am a function that calls myself to solve smaller sub-problems until a base condition is met. What programming paradigm am I?"
        </h3>

        <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; margin: 1.5rem 0;">
          <button type="button" class="btn btn-outline-gold btn-sm" onclick="AvioraBuddy.answerLogic(true)">Recursion</button>
          <button type="button" class="btn btn-outline-gold btn-sm" onclick="AvioraBuddy.answerLogic(false)">Iteration</button>
          <button type="button" class="btn btn-outline-gold btn-sm" onclick="AvioraBuddy.answerLogic(false)">Polymorphism</button>
          <button type="button" class="btn btn-outline-gold btn-sm" onclick="AvioraBuddy.answerLogic(false)">Encapsulation</button>
        </div>

        <div id="logic-feedback" style="min-height: 40px;"></div>
      </div>
    `;
  },

  answerLogic(isCorrect) {
    const fb = document.getElementById('logic-feedback');
    if (isCorrect) {
      this.quizScores.student1 += 100;
      if (fb) fb.innerHTML = `<span style="color: #34D399; font-weight: 800;">✓ Correct! Recursion solves problems through self-reference and base cases. (+100 pts)</span>`;
      showToast('Correct logic answer! +100 pts', 'success');
      this.updateScoreboardDisplay();
    } else {
      if (fb) fb.innerHTML = `<span style="color: #F87171; font-weight: 600;">Not quite. Hint: A function calling itself!</span>`;
    }
  },

  // ==========================================
  // SHARED WHITEBOARD
  // ==========================================
  renderWhiteboard(stage) {
    stage.innerHTML = `
      <div class="whiteboard-wrapper">
        <div class="whiteboard-toolbar">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 0.75rem; font-weight: 700; color: #4B5563;">Ink Color:</span>
            <input type="color" value="${this.whiteboardColor}" onchange="AvioraBuddy.whiteboardColor = this.value" style="width: 28px; height: 28px; border: none; border-radius: 4px; cursor: pointer;" />
            <button type="button" class="btn btn-secondary btn-sm" onclick="AvioraBuddy.whiteboardColor = '#C68A28'" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;">Gold</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="AvioraBuddy.whiteboardColor = '#1F2937'" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;">Charcoal</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="AvioraBuddy.whiteboardColor = '#10B981'" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;">Emerald</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="AvioraBuddy.whiteboardColor = '#FFFFFF'" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;">Eraser</button>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="AvioraBuddy.clearWhiteboard()" style="padding: 0.2rem 0.65rem; font-size: 0.74rem;">Clear Canvas</button>
          </div>
        </div>
        <canvas id="buddy-whiteboard-canvas"></canvas>
      </div>
    `;

    setTimeout(() => {
      const c = document.getElementById('buddy-whiteboard-canvas');
      if (c) {
        c.width = c.offsetWidth || 680;
        c.height = 360;
        this.whiteboardCtx = c.getContext('2d');
        this.initWhiteboard(c);
      }
    }, 60);
  },

  initWhiteboard(canvas) {
    let lastX = 0;
    let lastY = 0;

    const startDraw = (e) => {
      this.isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      lastX = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
      lastY = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    };

    const draw = (e) => {
      if (!this.isDrawing || !this.whiteboardCtx) return;
      const rect = canvas.getBoundingClientRect();
      const curX = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
      const curY = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

      this.whiteboardCtx.beginPath();
      this.whiteboardCtx.moveTo(lastX, lastY);
      this.whiteboardCtx.lineTo(curX, curY);
      this.whiteboardCtx.strokeStyle = this.whiteboardColor;
      this.whiteboardCtx.lineWidth = this.whiteboardColor === '#FFFFFF' ? 16 : this.whiteboardSize;
      this.whiteboardCtx.lineCap = 'round';
      this.whiteboardCtx.stroke();

      lastX = curX;
      lastY = curY;
    };

    const stopDraw = () => {
      this.isDrawing = false;
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);

    canvas.addEventListener('touchstart', startDraw, { passive: true });
    canvas.addEventListener('touchmove', draw, { passive: true });
    canvas.addEventListener('touchend', stopDraw);
  },

  clearWhiteboard() {
    const canvas = document.getElementById('buddy-whiteboard-canvas');
    if (canvas && this.whiteboardCtx) {
      this.whiteboardCtx.clearRect(0, 0, canvas.width, canvas.height);
    }
  },

  // ==========================================
  // VIDEO / AUDIO CALL INTERFACE
  // ==========================================
  renderVideoCall(stage) {
    stage.innerHTML = `
      <div style="width: 100%; max-width: 680px; text-align: center;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
          <div style="background: #1A1F26; border: 2px solid var(--gold-400); border-radius: 14px; padding: 2rem 1rem; position: relative;">
            <img src="${this.activeSession?.student1_avatar || '/assets/favicon.png'}" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; margin-bottom: 0.75rem; border: 2px solid var(--gold-400);" />
            <div style="font-weight: 800; color: #fff;">${this.activeSession?.student1_name || 'Student 1'}</div>
            <div style="font-size: 0.74rem; color: #10B981; margin-top: 0.25rem;">● Audio/Video Active</div>
          </div>

          <div style="background: #1A1F26; border: 2px solid #10B981; border-radius: 14px; padding: 2rem 1rem; position: relative;">
            <img src="${this.activeSession?.student2_avatar || '/assets/favicon.png'}" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; margin-bottom: 0.75rem; border: 2px solid #10B981;" />
            <div style="font-weight: 800; color: #fff;">${this.activeSession?.student2_name || 'Buddy Peer'}</div>
            <div style="font-size: 0.74rem; color: #10B981; margin-top: 0.25rem;">● Audio/Video Active</div>
          </div>
        </div>

        <div style="display: flex; gap: 0.75rem; justify-content: center; align-items: center;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="showToast('Microphone toggled', 'info')">🎙️ Mute / Unmute</button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="showToast('Camera toggled', 'info')">📹 Camera</button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="showToast('Screen sharing initialized', 'info')">🖥️ Share Screen</button>
          <button type="button" class="btn btn-outline-gold btn-sm" onclick="AvioraBuddy.switchGameTab('quiz_bee')">Return to Games</button>
        </div>
      </div>
    `;
  },

  updateScoreboardDisplay() {
    const s1El = document.getElementById('buddy-player1-score');
    const s2El = document.getElementById('buddy-player2-score');
    if (s1El) s1El.textContent = this.quizScores.student1;
    if (s2El) s2El.textContent = this.quizScores.student2;
  },

  // ==========================================
  // IN-SESSION CHAT SYSTEM
  // ==========================================
  renderChatMessages(messages) {
    const container = document.getElementById('buddy-chat-messages-container');
    if (!container) return;

    const currentUserName = Auth.currentUser ? Auth.currentUser.name : '';

    container.innerHTML = (messages || []).map(m => {
      const isOwn = currentUserName && m.sender_name === currentUserName;
      return `
        <div class="buddy-chat-bubble ${isOwn ? 'own' : ''}">
          <div class="buddy-chat-bubble-author">${m.sender_name}</div>
          <div>${escapeHtmlStr(m.message)}</div>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  },

  async sendChatMessage(msgText = null) {
    const input = document.getElementById('buddy-chat-input');
    const text = msgText || (input ? input.value.trim() : '');
    if (!text) return;

    if (input) input.value = '';

    if (!this.activeSession || this.activeSession.id === 9999) {
      // Demo session local append
      const container = document.getElementById('buddy-chat-messages-container');
      if (container) {
        const bubble = document.createElement('div');
        bubble.className = 'buddy-chat-bubble own';
        bubble.innerHTML = `<div class="buddy-chat-bubble-author">${Auth.currentUser ? Auth.currentUser.name : 'You'}</div><div>${escapeHtmlStr(text)}</div>`;
        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
      }
      return;
    }

    try {
      const token = Storage.getToken();
      const res = await fetch(`/api/buddy/session/${this.activeSession.id}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      if (res.ok && data.messages) {
        this.renderChatMessages(data.messages);
      }
    } catch (e) {
      console.warn('Send chat message error:', e);
    }
  },

  sendReaction(reaction) {
    this.sendChatMessage(reaction);
  },

  startChatPoll(sessionId) {
    if (this.chatPollTimer) clearInterval(this.chatPollTimer);
    if (!sessionId || sessionId === 9999) return;

    this.chatPollTimer = setInterval(async () => {
      try {
        const token = Storage.getToken();
        if (!token) return;
        const res = await fetch(`/api/buddy/session/${sessionId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.messages) {
          this.renderChatMessages(data.messages);
        }
      } catch (e) {}
    }, 4000);
  },

  // ==========================================
  // MODAL CREATION WORKFLOWS ($6)
  // ==========================================
  openPeerModal() {
    const modal = document.getElementById('modal-create-buddy-peer');
    if (!modal) return;

    // Populate peers dropdown
    const select = document.getElementById('buddy-peer-select');
    if (select && this.peersList.length > 0) {
      select.innerHTML = `
        <option value="">Open Invite (Generate Buddy Code for Any Student)</option>
        ${this.peersList.map(p => `<option value="${p.id}">${p.name} — ${p.grade_level || 'Student'}</option>`).join('')}
      `;
    }

    modal.classList.add('active');
  },

  openTutorModal() {
    const modal = document.getElementById('modal-create-buddy-tutor');
    if (!modal) return;

    // Populate tutors dropdown
    const tSelect = document.getElementById('buddy-tutor-select');
    if (tSelect && this.tutorsList.length > 0) {
      tSelect.innerHTML = this.tutorsList.map(t => `
        <option value="${t.id}">${t.name} — ${t.headline || 'Faculty'}</option>
      `).join('');
    }

    // Populate students dropdown
    const s1Select = document.getElementById('buddy-tutor-student1-select');
    const s2Select = document.getElementById('buddy-tutor-student2-select');
    const allStudents = (Auth.currentUser ? [Auth.currentUser, ...this.peersList] : this.peersList);

    if (s1Select) {
      s1Select.innerHTML = allStudents.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }
    if (s2Select) {
      s2Select.innerHTML = `
        <option value="">Open Slot (Share Buddy Code with Student 2)</option>
        ${this.peersList.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
      `;
    }

    modal.classList.add('active');
  },

  openJoinCodeModal() {
    const modal = document.getElementById('modal-join-buddy-code');
    if (modal) modal.classList.add('active');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  },

  async submitPeerSession() {
    const peerSelect = document.getElementById('buddy-peer-select');
    const subjectInp = document.getElementById('buddy-peer-subject');
    const topicInp = document.getElementById('buddy-peer-topic');

    const payload = {
      session_type: 'peer_study',
      student2_id: peerSelect ? peerSelect.value : null,
      subject: subjectInp ? subjectInp.value : 'Peer Battle & Quiz Bee',
      topic: topicInp ? topicInp.value : 'Equation Duel & Concept Matching'
    };

    try {
      const token = Storage.getToken();
      if (!token) {
        showToast('Please log in with your student account to launch Aviora Buddy ($6).', 'info');
        window.location.hash = '#login';
        return;
      }

      const res = await fetch('/api/buddy/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(data.message, 'success');
      this.closeModal('modal-create-buddy-peer');
      await this.loadBuddyHub();

      if (data.session) {
        this.selectSession(data.session.id);
      }
    } catch (e) {
      showToast(e.message || 'Failed to create peer session.', 'error');
    }
  },

  async submitTutorSession() {
    const tutorSelect = document.getElementById('buddy-tutor-select');
    const s1Select = document.getElementById('buddy-tutor-student1-select');
    const s2Select = document.getElementById('buddy-tutor-student2-select');
    const subjectInp = document.getElementById('buddy-tutor-subject');

    const payload = {
      session_type: 'tutor_led',
      tutor_id: tutorSelect ? tutorSelect.value : null,
      student1_id: s1Select ? s1Select.value : null,
      student2_id: s2Select ? s2Select.value : null,
      subject: subjectInp ? subjectInp.value : 'Faculty Academic Battle & Quiz Bee ($6/student)'
    };

    try {
      const token = Storage.getToken();
      if (!token) {
        showToast('Please log in to set up an Aviora Buddy session.', 'info');
        window.location.hash = '#login';
        return;
      }

      const res = await fetch('/api/buddy/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(data.message, 'success');
      this.closeModal('modal-create-buddy-tutor');
      await this.loadBuddyHub();

      if (data.session) {
        this.selectSession(data.session.id);
      }
    } catch (e) {
      showToast(e.message || 'Failed to create tutor-led session.', 'error');
    }
  },

  async submitJoinCode() {
    const input = document.getElementById('input-buddy-join-code');
    if (!input || !input.value.trim()) {
      showToast('Please enter your 10-character Buddy Code (e.g. BUDDY-7482)', 'warning');
      return;
    }

    try {
      const token = Storage.getToken();
      if (!token) {
        showToast('Please log in to join an Aviora Buddy session.', 'info');
        window.location.hash = '#login';
        return;
      }

      const res = await fetch('/api/buddy/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ session_code: input.value.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(data.message, 'success');
      this.closeModal('modal-join-buddy-code');
      await this.loadBuddyHub();

      if (data.session_id) {
        this.selectSession(data.session_id);
      }
    } catch (e) {
      showToast(e.message || 'Failed to join buddy session.', 'error');
    }
  }
};
