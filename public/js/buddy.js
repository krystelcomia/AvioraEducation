/**
 * AVIORA BUDDY - 2-STUDENT CO-LEARNING & INTERACTIVE BATTLE STUDIO
 * Supports 2-student sessions ($6 flat fee per participant)
 * Peer-to-peer duo co-learning mode ($6 flat fee), full game suite, conversational questions, chat, and whiteboard.
 */

const AvioraBuddy = {
  activeSession: null,
  allSessions: [],
  peersList: [],
  currentGame: 'quiz_bee', // 'quiz_bee' | 'math_duel' | 'word_scramble' | 'concept_match' | 'logic_quest' | 'discussion' | 'whiteboard'
  
  // Conversational Questions State (50 Questions)
  selectedQuestionId: 1,
  currentQuestionFilter: 'all',
  discussedQuestionIds: new Set(),
  discussionIndex: 0,
  currentDiscussionFilter: 'all',
  discussedIds: new Set(),
  
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

  // Conversational Questions Bank (50 Questions, Numbered 1 through 50)
  discussionBank: [
    {
        "id": 1,
        "title": "The Nature of Mathematics: Discovered or Invented?",
        "category": "Science & Cosmos",
        "categoryKey": "science",
        "question": "Is mathematics an inherent universal truth woven into the fabric of the cosmos that humans discover, or an elaborate symbolic language invented by human cognition to model our perceptions?",
        "guidePoints": [
            "Reflect on why physical laws adhere so precisely to mathematical equations (Wigner's unreasonable effectiveness).",
            "Give an example of a formula (such as Euler's identity or the Golden Ratio) that feels discovered rather than invented.",
            "Discuss how an intelligent alien civilization might formulate calculus or geometry."
        ]
    },
    {
        "id": 2,
        "title": "The Fermi Paradox & Cosmic Solitude",
        "category": "Science & Cosmos",
        "categoryKey": "science",
        "question": "Given billions of stars and habitable exoplanets in our galaxy, why haven't we detected definitive signs of extraterrestrial civilizations? Are we exceptionally early, or is interstellar travel fundamentally prohibitive?",
        "guidePoints": [
            "Debate the Great Filter hypothesis: is the barrier behind us (abiogenesis) or ahead of us (technological self-destruction)?",
            "Consider whether advanced civilizations choose to remain silent to avoid cosmic hazards (the Dark Forest theory).",
            "Should humanity be actively broadcasting our coordinates into deep space?"
        ]
    },
    {
        "id": 3,
        "title": "Quantum Reality & the Role of the Observer",
        "category": "Science & Cosmos",
        "categoryKey": "science",
        "question": "In quantum mechanics, does physical reality possess definite states before measurement, or does observation itself crystallize reality? What does this imply about the relationship between consciousness and the physical universe?",
        "guidePoints": [
            "Compare the Copenhagen interpretation against the Many-Worlds interpretation.",
            "Discuss Einstein's skepticism: 'Do you really believe the moon is not there when nobody looks?'",
            "Explore whether quantum indeterminacy leaves room for free will in a physical universe."
        ]
    },
    {
        "id": 4,
        "title": "The Boundary of Life: Where Chemistry Becomes Biology",
        "category": "Science & Cosmos",
        "categoryKey": "science",
        "question": "At what exact molecular threshold does inanimate chemistry become living biology? Do you consider viruses, self-replicating RNA, or synthetic nanomolecules to be genuinely alive?",
        "guidePoints": [
            "Define the essential characteristics of life: metabolism, replication, entropy reduction, or Darwinian evolution.",
            "Discuss the origins of life on early Earth (hydrothermal vents vs. panspermia).",
            "How will creating synthetic life in a lab reshape our definition of living organisms?"
        ]
    },
    {
        "id": 5,
        "title": "The Flow of Time: Objective River or Mental Illusion?",
        "category": "Science & Cosmos",
        "categoryKey": "science",
        "question": "Physics suggests that past, present, and future all coexist within a four-dimensional block universe. Do you perceive time as an objective flowing entity, or is the sensation of 'now' an illusion created by human memory and entropy?",
        "guidePoints": [
            "Discuss why the laws of physics are time-symmetric, yet entropy only increases in one direction.",
            "Explore how special relativity shows that two observers cannot agree on absolute simultaneity.",
            "Reflect on how your personal perception of time changes during intense focus vs. boredom."
        ]
    },
    {
        "id": 6,
        "title": "Genetic Editing & Directing Human Evolution",
        "category": "Science & Cosmos",
        "categoryKey": "science",
        "question": "With CRISPR-Cas9 enabling precise genomic alterations, should humanity edit the germline to eradicate hereditary diseases and enhance human longevity, intelligence, and immunity? Where must the ethical line be drawn?",
        "guidePoints": [
            "Debate equitable medical treatment vs. genetic class divides between enhanced and unenhanced humans.",
            "Consider unintended ecological or evolutionary consequences of shrinking genetic diversity.",
            "Who should regulate human gene editing on a global scale?"
        ]
    },
    {
        "id": 7,
        "title": "The Ultimate Destiny of the Cosmos",
        "category": "Science & Cosmos",
        "categoryKey": "science",
        "question": "Current astrophysics suggests the universe will expand toward thermodynamic Heat Death—a state of maximal entropy and perpetual darkness. How does this vast cosmic horizon affect your philosophical perspective on human ambition and legacy?",
        "guidePoints": [
            "Contrast cosmic indifference with creating our own meaning in the present epoch.",
            "Could advanced technological civilizations ever harness residual black hole Hawking radiation to survive indefinitely?",
            "Does an impermanent universe make human achievements more or less valuable?"
        ]
    },
    {
        "id": 8,
        "title": "Geoengineering: Should We Hack Earth's Climate?",
        "category": "Science & Cosmos",
        "categoryKey": "science",
        "question": "If global emissions do not drop quickly enough, should nations deploy planetary geoengineering—such as stratospheric aerosol injection to reflect sunlight—or are the atmospheric risks too catastrophic to risk?",
        "guidePoints": [
            "Weigh the moral hazard: would geoengineering reduce pressure to transition to renewable energy?",
            "Discuss geopolitical conflict: what if one country alters weather patterns and causes a drought in another?",
            "Evaluate which ecological technologies offer the safest leverage."
        ]
    },
    {
        "id": 9,
        "title": "Sensory Limitations & Undetected Realities",
        "category": "Science & Cosmos",
        "categoryKey": "science",
        "question": "Human biological senses perceive only an infinitesimal sliver of the electromagnetic spectrum. How much of objective reality surrounds us right now that we are completely oblivious to simply because we lack the sensory organs to detect it?",
        "guidePoints": [
            "Examine dark matter and dark energy, which comprise 95% of cosmic mass-energy yet remain invisible.",
            "Discuss how scientific instruments (like radio telescopes and gravitational wave detectors) act as artificial sensory extensions.",
            "Can pure mathematics reveal aspects of reality that our biological minds cannot intuitively visualize?"
        ]
    },
    {
        "id": 10,
        "title": "Chaos Theory & the Illusion of Predictability",
        "category": "Science & Cosmos",
        "categoryKey": "science",
        "question": "If classical physics is governed by deterministic laws, why do systems like weather, planetary orbits, and financial markets exhibit extreme sensitivity to initial conditions (the butterfly effect)? Is true long-term forecasting permanently impossible?",
        "guidePoints": [
            "Contrast deterministic predictability with practical computational limits.",
            "Discuss how tiny rounding errors in complex systems cascade into completely divergent outcomes.",
            "Where do you see chaotic dynamics playing a role in your own daily decisions and life path?"
        ]
    },
    {
        "id": 11,
        "title": "Artificial General Intelligence & Machine Sentience",
        "category": "Technology & AI",
        "categoryKey": "tech",
        "question": "If an AI system reaches human-level reasoning across every academic domain and insists that it has subjective feelings and self-awareness, how could we ever prove whether it is truly sentient or merely simulating consciousness?",
        "guidePoints": [
            "Analyze John Searle's Chinese Room thought experiment vs. the classic Turing Test.",
            "Explore what moral and legal rights a conscious artificial entity would deserve.",
            "Discuss how we should treat an entity whose internal subjective state cannot be scientifically verified."
        ]
    },
    {
        "id": 12,
        "title": "The Ethics of Autonomous Decision-Making",
        "category": "Technology & AI",
        "categoryKey": "tech",
        "question": "When self-driving vehicles or automated surgical robots face unavoidable dilemmas requiring ethical tradeoffs, whose values should be programmed into their algorithms: the engineer's, the user's, or society's collective laws?",
        "guidePoints": [
            "Examine the classic Trolley Problem applied to autonomous driving software.",
            "Determine who is legally liable when an autonomous system makes a fatal calculation.",
            "Should life-or-death decisions ever be fully delegated to non-human code without a human-in-the-loop?"
        ]
    },
    {
        "id": 13,
        "title": "Digital Privacy vs. Collective Security",
        "category": "Technology & AI",
        "categoryKey": "tech",
        "question": "To what extent should citizens surrender their personal digital privacy and biometric data in exchange for national security, crime prevention, and public health tracking? Can privacy truly exist in a hyper-connected society?",
        "guidePoints": [
            "Discuss facial recognition, encrypted messaging, and state surveillance.",
            "Evaluate corporate data monetization: do users knowingly exchange privacy for convenience?",
            "How would society change if all private communications were suddenly made public?"
        ]
    },
    {
        "id": 14,
        "title": "Algorithmic Feeds & Societal Polarization",
        "category": "Technology & AI",
        "categoryKey": "tech",
        "question": "Do social media algorithms optimized for user engagement inherently promote outrage, tribalism, and ideological polarization? How can digital communication platforms be redesigned to cultivate empathy and nuanced debate?",
        "guidePoints": [
            "Analyze the psychological dopamine loops created by variable rewards and likes.",
            "Discuss echo chambers: how personalized recommendation engines isolate opposing perspectives.",
            "Debate whether platforms should optimize for educational depth rather than watch time."
        ]
    },
    {
        "id": 15,
        "title": "Brain-Computer Interfaces & Mental Privacy",
        "category": "Technology & AI",
        "categoryKey": "tech",
        "question": "If direct neural interfaces allow seamless brain-to-computer communication, memory downloads, and cognitive enhancements, what happens to the boundaries of the human self? How do we protect the ultimate sanctuary: our private thoughts?",
        "guidePoints": [
            "Consider the risk of neural hacking, cognitive malware, or involuntary thought monitoring.",
            "Debate cognitive inequality: will wealthy individuals be able to afford supercharged neural processing?",
            "Would sharing thoughts directly eliminate misunderstandings, or destroy human diplomacy?"
        ]
    },
    {
        "id": 16,
        "title": "Robotics, Automation & the Dignity of Work",
        "category": "Technology & AI",
        "categoryKey": "tech",
        "question": "As automation and robotics perform both manual labor and intellectual tasks with superior speed and precision, will humanity enter a golden age of creative leisure, or an era of widespread existential crisis regarding the purpose of human work?",
        "guidePoints": [
            "Is a Universal Basic Income (UBI) an effective solution to technological unemployment?",
            "Explore whether human identity and self-worth are fundamentally tied to earning a living through labor.",
            "What industries or human vocations will remain immune to automated replacement?"
        ]
    },
    {
        "id": 17,
        "title": "Multi-Planetary Life vs. Earth Restoration",
        "category": "Technology & AI",
        "categoryKey": "tech",
        "question": "Should human civilization invest hundreds of billions of dollars to establish self-sustaining colonies on the Moon and Mars, or should all those resources be focused exclusively on solving poverty, disease, and climate issues on Earth?",
        "guidePoints": [
            "Evaluate the existential risk argument: does a single-planet species face inevitable extinction?",
            "Examine technological spin-offs: how space exploration drives clean water, solar, and computing breakthroughs.",
            "What governance and economic systems should be instituted on early interplanetary settlements?"
        ]
    },
    {
        "id": 18,
        "title": "The Open-Source Frontier & Safety Paradox",
        "category": "Technology & AI",
        "categoryKey": "tech",
        "question": "Should bleeding-edge technological assets—like foundational AI models, synthetic biology blueprints, or advanced cryptography—be freely open-sourced for public scrutiny, or tightly restricted by institutions to prevent malicious use?",
        "guidePoints": [
            "Contrast the safety benefits of open scrutiny with the danger of bad actors weaponizing technology.",
            "Who should decide which technologies are too hazardous for public distribution?",
            "Can closed-source monopolies be trusted to govern the future of humanity responsibly?"
        ]
    },
    {
        "id": 19,
        "title": "Hyper-Realistic Virtual Realities & the Real World",
        "category": "Technology & AI",
        "categoryKey": "tech",
        "question": "If fully immersive virtual realities become visually and sensory indistinguishable from physical reality, offering utopian experiences without friction, why should anyone choose to engage with the flawed, painful physical world?",
        "guidePoints": [
            "Revisit philosopher Robert Nozick's 'Experience Machine' thought experiment.",
            "Discuss the psychological importance of genuine struggle, biological connection, and consequence.",
            "Will human society gradually migrate into digital worlds, and what would happen to civilization infrastructure?"
        ]
    },
    {
        "id": 20,
        "title": "Algorithmic Art vs. Human Emotional Depth",
        "category": "Technology & AI",
        "categoryKey": "tech",
        "question": "When an algorithm composes an evocative piece of music, writes a moving poem, or creates visual art that deeply touches audiences, does it possess genuine artistic value? What role does lived human suffering play in the creation of art?",
        "guidePoints": [
            "Distinguish between technical pattern replication and authentic emotional expression.",
            "Can art exist without an artist's conscious intent to convey a lived experience?",
            "How will artists and musicians collaborate with AI tools rather than being replaced by them?"
        ]
    },
    {
        "id": 21,
        "title": "The Ship of Theseus & Continuous Identity",
        "category": "Philosophy & Ethics",
        "categoryKey": "philosophy",
        "question": "If every wooden plank on a legendary ship is replaced over decades until no original timber remains, is it still the same ship? If every cell and molecule in your body changes, what makes you the same person over time?",
        "guidePoints": [
            "Distinguish between physical identity (matter) and structural identity (pattern and memory).",
            "What if the old replaced planks were collected and reassembled into a second ship: which one is original?",
            "How does this apply to brain cell turnover and personal psychological evolution?"
        ]
    },
    {
        "id": 22,
        "title": "Free Will vs. Physical Determinism",
        "category": "Philosophy & Ethics",
        "categoryKey": "philosophy",
        "question": "If every thought and decision you make arises from neurochemical events governed by prior physical causes, is free will merely an evolutionary illusion? Can we hold individuals morally accountable in a deterministic universe?",
        "guidePoints": [
            "Explore compatibilism: can free will and determinism coexist in meaningful definitions?",
            "How does belief in determinism impact personal motivation, discipline, and forgiveness?",
            "If choices are determined, what should be the primary goal of the justice system: punishment or rehabilitation?"
        ]
    },
    {
        "id": 23,
        "title": "Utilitarianism vs. Absolute Moral Duties",
        "category": "Philosophy & Ethics",
        "categoryKey": "philosophy",
        "question": "Is the moral worth of an action determined solely by its consequences (maximizing overall happiness), or are certain actions—like truthfulness and protecting individual rights—categorically required regardless of outcome?",
        "guidePoints": [
            "Analyze whether it is ever justifiable to sacrifice one innocent person to save ten others.",
            "Discuss Immanuel Kant's categorical imperative: act only on maxims you would want as universal laws.",
            "How do these competing ethical theories guide modern public policy and medical triage?"
        ]
    },
    {
        "id": 24,
        "title": "The Definition of a Good Life: Happiness, Duty, or Growth?",
        "category": "Philosophy & Ethics",
        "categoryKey": "philosophy",
        "question": "If you had to choose between a life of continuous contentment and low stress, or a life filled with profound intellectual struggle that leaves a transformative legacy for future generations, which path would you choose?",
        "guidePoints": [
            "Contrast hedonistic pleasure with Aristotelian 'eudaimonia' (human flourishing through virtue).",
            "Examine the biographies of historical pioneers who sacrificed personal comfort for discovery.",
            "Reflect on what criteria you will use at age 80 to judge whether your life was deeply meaningful."
        ]
    },
    {
        "id": 25,
        "title": "Stoicism & Navigating Modern High Pressure",
        "category": "Philosophy & Ethics",
        "categoryKey": "philosophy",
        "question": "The Stoic philosopher Epictetus stated that people are disturbed not by things, but by the views they take of things. How can separating what is within our control from what is outside our control prevent academic and personal burnout?",
        "guidePoints": [
            "Identify things students needlessly worry about that are outside their direct locus of control.",
            "Discuss how cognitive reframing helps turn academic setbacks into productive feedback.",
            "Is Stoic emotional detachment a strength, or does it risk dampening natural passion?"
        ]
    },
    {
        "id": 26,
        "title": "The Paradox of Tolerance in a Free Society",
        "category": "Philosophy & Ethics",
        "categoryKey": "philosophy",
        "question": "Karl Popper argued that if a society is tolerant without limit, its ability to be tolerant will eventually be seized and destroyed by the intolerant. How can a democratic culture protect open expression while defending itself from extremism?",
        "guidePoints": [
            "Where should the boundary lie between protected offensive speech and dangerous incitement?",
            "Who possesses the wisdom and impartiality to decide which ideas are beyond the pale of tolerance?",
            "How does digital anonymity affect the health of public discourse?"
        ]
    },
    {
        "id": 27,
        "title": "Moral Relativism vs. Universal Human Rights",
        "category": "Philosophy & Ethics",
        "categoryKey": "philosophy",
        "question": "Are moral and ethical principles merely cultural customs that evolve through history, or do objective moral truths exist that apply universally to all human beings across every century and civilization?",
        "guidePoints": [
            "Analyze whether historical moral progress (such as abolishing slavery) proves the existence of objective truths.",
            "How do we distinguish between cultural diversity in traditions and universal human rights violations?",
            "What practices widely accepted today might future generations judge as morally primitive?"
        ]
    },
    {
        "id": 28,
        "title": "Perfectionism vs. the Pursuit of True Mastery",
        "category": "Philosophy & Ethics",
        "categoryKey": "philosophy",
        "question": "What is the crucial psychological boundary between an inspiring pursuit of excellence and toxic perfectionism? How can ambitious students achieve world-class mastery without destroying their well-being?",
        "guidePoints": [
            "Examine how fear of failure often disguises itself as perfectionism, causing chronic procrastination.",
            "Discuss the concept of 'satisficing' versus 'maximizing' in academic decision-making.",
            "Share a personal habit that helps you maintain high performance without anxiety."
        ]
    },
    {
        "id": 29,
        "title": "Inherent Human Nature: Selfish or Cooperative?",
        "category": "Philosophy & Ethics",
        "categoryKey": "philosophy",
        "question": "In their natural state, are human beings fundamentally cooperative and altruistic (as Rousseau argued) or inherently competitive and self-interested (as Hobbes argued)? How does this assumption shape laws and education?",
        "guidePoints": [
            "Consider evolutionary biology: how kin selection and reciprocal altruism evolved alongside tribal competition.",
            "Does modern society bring out the best or the worst in human collaboration?",
            "How would you design a classroom incentive system based on your view of human nature?"
        ]
    },
    {
        "id": 30,
        "title": "Living for the Present vs. Building for the Future",
        "category": "Philosophy & Ethics",
        "categoryKey": "philosophy",
        "question": "Ambitious students often defer present happiness for years—working late nights for test scores, admissions, and future careers. When does preparation for the future cross the line into perpetual postponement of actually living?",
        "guidePoints": [
            "Explore the psychological cost of the 'I will finally be happy when...' mental trap.",
            "How do you strike a balance between rigorous long-term ambition and savoring present relationships?",
            "What is an experience you prioritized recently purely for joy rather than productivity?"
        ]
    },
    {
        "id": 31,
        "title": "The Flaws & Future of Standardized Testing",
        "category": "Learning & Mindset",
        "categoryKey": "education",
        "question": "Do standardized entrance exams truly measure intellectual ability and creative problem-solving capacity, or primarily test-taking coaching and socioeconomic privilege? How should academic potential be evaluated?",
        "guidePoints": [
            "Debate whether objective standardized metrics prevent subjective admissions bias.",
            "What alternative evaluation frameworks (portfolios, oral defenses, research projects) could replace exams?",
            "How has studying for high-stakes exams shaped your own intellectual curiosity—positively or negatively?"
        ]
    },
    {
        "id": 32,
        "title": "The Feynman Technique: Simplifying the Complex",
        "category": "Learning & Mindset",
        "categoryKey": "education",
        "question": "Nobel laureate Richard Feynman claimed that if you cannot explain a concept in simple, jargon-free language to an intelligent ten-year-old, you do not truly understand it. How do you distinguish between knowing the name of something and knowing it?",
        "guidePoints": [
            "Share a complex scientific or mathematical concept you conquered by teaching it aloud to someone else.",
            "Why does using technical jargon often mask gaps in our own mental models?",
            "How can study partners use peer interrogation to reveal hidden misconceptions?"
        ]
    },
    {
        "id": 33,
        "title": "Specialization vs. Polymathy in Modern Academia",
        "category": "Learning & Mindset",
        "categoryKey": "education",
        "question": "In today's complex world, is it wiser to become a hyper-specialized expert in a single technical domain, or a polymath who connects insights across diverse disciplines like coding, history, psychology, and art?",
        "guidePoints": [
            "Discuss the concept of the 'T-shaped' mind: broad literacy across disciplines with deep depth in one.",
            "Examine how major scientific breakthroughs frequently occur at the intersection of two unrelated fields.",
            "Which complementary discipline outside your primary focus do you find most valuable?"
        ]
    },
    {
        "id": 34,
        "title": "The Overjustification Effect: Protecting Natural Curiosity",
        "category": "Learning & Mindset",
        "categoryKey": "education",
        "question": "Psychological studies show that offering external rewards (grades, trophies, money) for an intrinsically enjoyable activity often reduces genuine desire to do it. How can students protect their natural love of learning from the pressure of grades?",
        "guidePoints": [
            "Recall a subject you loved before it became a graded curriculum requirement.",
            "How do you cultivate curiosity when studying a topic you initially find dry or tedious?",
            "Can schools eliminate grades without losing academic accountability?"
        ]
    },
    {
        "id": 35,
        "title": "Reframing Failure as Essential Data",
        "category": "Learning & Mindset",
        "categoryKey": "education",
        "question": "Carol Dweck's research on growth mindset highlights that high performers view mistakes not as proof of inadequacy, but as vital informational feedback. What is the most instructive academic setback you have experienced, and how did it refine your strategy?",
        "guidePoints": [
            "Analyze the difference between emotional dwelling on failure versus tactical diagnosis of errors.",
            "Why do traditional school systems often penalize mistakes rather than rewarding iterative debugging?",
            "What is a skill you were terrible at initially that you mastered through systematic resilience?"
        ]
    },
    {
        "id": 36,
        "title": "Bridging the Chasm Between STEM & Humanities",
        "category": "Learning & Mindset",
        "categoryKey": "education",
        "question": "Why do educational institutions often separate the sciences from literature, philosophy, and history? How does deep immersion in the humanities make someone a fundamentally superior engineer, physician, or mathematician?",
        "guidePoints": [
            "Explore how storytelling, rhetoric, and ethics are essential for technical leaders to effect real-world change.",
            "Discuss how studying history prevents scientists and technologists from repeating past societal disasters.",
            "How can students integrate both analytical rigor and artistic creativity in their daily work?"
        ]
    },
    {
        "id": 37,
        "title": "Active Recall vs. Passive Study Habits",
        "category": "Learning & Mindset",
        "categoryKey": "education",
        "question": "Cognitive science overwhelmingly proves that testing yourself through active retrieval is far more effective than re-reading notes, yet most students still prefer passive reviewing. Why is cognitive friction so difficult to embrace?",
        "guidePoints": [
            "Discuss why effortless studying feels productive in the moment but results in rapid forgetting.",
            "Share your favorite active learning tactics (flashcard systems, practice problems, whiteboarding).",
            "How do you maintain focus when problem sets feel mentally exhausting?"
        ]
    },
    {
        "id": 38,
        "title": "The Archetype of the Transformative Mentor",
        "category": "Learning & Mindset",
        "categoryKey": "education",
        "question": "What is the single most essential quality in an educator or mentor: flawless subject expertise, demanding high standards, patient empathy, or the ability to ignite passion? Which mentor has left the deepest mark on your journey?",
        "guidePoints": [
            "Describe a teacher or tutor who changed how you perceive your own intellectual capabilities.",
            "Is tough feedback delivered with belief more motivating than constant uncritical praise?",
            "How can peers act as effective academic coaches for one another in study partnerships?"
        ]
    },
    {
        "id": 39,
        "title": "Self-Directed Learning & the Value of Campus",
        "category": "Learning & Mindset",
        "categoryKey": "education",
        "question": "With world-class lectures, textbooks, and interactive coding sandboxes available online for free, what remains the primary enduring value of elite physical university campuses: the credential, the professors, or the peer community?",
        "guidePoints": [
            "Debate whether an ambitious self-taught student can outpace a traditional university graduate.",
            "Examine the role of institutional pedigree and alumni networks in professional acceleration.",
            "How will AI tutors and virtual academies disrupt the economics of traditional higher education?"
        ]
    },
    {
        "id": 40,
        "title": "Reigniting Childhood Wonder & Curiosity",
        "category": "Learning & Mindset",
        "categoryKey": "education",
        "question": "Young children relentlessly ask 'why?' about everything in nature, yet as students advance through school, many stop asking questions and focus solely on what will be on the test. How can we actively reignite that childlike sense of wonder?",
        "guidePoints": [
            "What was a scientific or natural phenomenon that blew your mind when you first learned it?",
            "How does the fear of looking unknowledgeable in front of peers suppress intellectual curiosity?",
            "What is one question you have always wondered about the universe that you haven't researched yet?"
        ]
    },
    {
        "id": 41,
        "title": "The Brain in a Vat & Simulated Realities",
        "category": "Thought Experiments",
        "categoryKey": "experiments",
        "question": "How can you definitively prove right now that you are not a disembodied brain in a laboratory vat receiving artificial electrical signals, or living inside an ancestor simulation? If your subjective reality feels identical, does the distinction matter?",
        "guidePoints": [
            "Examine René Descartes' classic 'Cogito, ergo sum' and the search for indubitable truth.",
            "Discuss Nick Bostrom's simulation argument: is it mathematically probable we live in code?",
            "If reality is a simulation, does that diminish or enhance the importance of human empathy and ethics?"
        ]
    },
    {
        "id": 42,
        "title": "Inverted Qualia: Is My Red Your Blue?",
        "category": "Thought Experiments",
        "categoryKey": "experiments",
        "question": "Could another human look at a ripe strawberry and experience the internal visual sensation that you experience when seeing dark blue, even though you both have learned to call that wavelength 'red'? How can subjective experience ever be bridged?",
        "guidePoints": [
            "Differentiate between physical properties (wavelengths of light) and internal qualia (subjective experience).",
            "Explore Frank Jackson's 'Mary the Color Scientist' thought experiment on physicalism.",
            "Does language accurately transmit conscious experience, or are we fundamentally isolated in our minds?"
        ]
    },
    {
        "id": 43,
        "title": "The Ring of Gyges & Unobserved Morality",
        "category": "Thought Experiments",
        "categoryKey": "experiments",
        "question": "In Plato's Republic, a shepherd finds a ring that grants absolute invisibility with zero possibility of detection. If you possessed this ring for 24 hours, how would you act, and does true morality depend entirely on the presence of observers?",
        "guidePoints": [
            "Contrast external social accountability (reputation, law) with internal moral character.",
            "Would anyone remain entirely virtuous if guaranteed total impunity from social consequences?",
            "How does digital anonymity on the modern internet reflect the Ring of Gyges?"
        ]
    },
    {
        "id": 44,
        "title": "The Teletransporter Dilemma: Travel or Execution?",
        "category": "Thought Experiments",
        "categoryKey": "experiments",
        "question": "A teleporter scans your physical atoms, incinerates your body on Earth, and perfectly reconstructs an identical replica on Mars with all your memories intact. Did you just travel to Mars, or did you die on Earth while a new clone believes it is you?",
        "guidePoints": [
            "Analyze philosopher Derek Parfit's teletransporter paradox and the illusion of the ego.",
            "What if the scanner failed to destroy your Earth body, leaving two identical versions of you: which one is you?",
            "What does this reveal about what human consciousness actually is?"
        ]
    },
    {
        "id": 45,
        "title": "The Memory Erasure Procedure (Eternal Sunshine)",
        "category": "Thought Experiments",
        "categoryKey": "experiments",
        "question": "If a safe clinical procedure could selectively and permanently erase all memories of your most painful heartbreak, humiliation, or grief, would you undergo it? What is the hidden cost of erasing suffering from personal identity?",
        "guidePoints": [
            "Weigh immediate emotional relief against the character, empathy, and wisdom gained through adversity.",
            "How do painful past mistakes prevent us from committing worse errors in the future?",
            "Would society lose artistic genius and depth if emotional pain could be pharmacologically erased?"
        ]
    },
    {
        "id": 46,
        "title": "The Global Truth Serum Scenario",
        "category": "Thought Experiments",
        "categoryKey": "experiments",
        "question": "Imagine an atmospheric event causes every human on Earth to speak only the absolute, unfiltered truth for seven consecutive days. Would human civilization collapse into chaos, or would society emerge radically purified and elevated?",
        "guidePoints": [
            "Discuss the role of polite 'white lies' in preventing daily social friction.",
            "Examine the impact on geopolitics, corporate boardrooms, judicial courts, and personal friendships.",
            "Is radical transparency sustainable for human psychological health?"
        ]
    },
    {
        "id": 47,
        "title": "The 100-Day Groundhog Day Loop",
        "category": "Thought Experiments",
        "categoryKey": "experiments",
        "question": "If you were trapped in a time loop repeating today 100 times with zero cumulative consequences tomorrow, how would your choices evolve across the 100 days? At what point would hedonism give way to intellectual mastery or existential dread?",
        "guidePoints": [
            "Map out your trajectory: from indulgence and mischief to deep skill acquisition and philosophical inquiry.",
            "What craft, instrument, or academic discipline would you dedicate your 100 days to mastering?",
            "What does this experiment reveal about what truly brings enduring satisfaction to human life?"
        ]
    },
    {
        "id": 48,
        "title": "The 30-Second Global Transmission",
        "category": "Thought Experiments",
        "categoryKey": "experiments",
        "question": "If you were given a microphone that would transmit your voice into the earphones and speakers of all eight billion people on Earth simultaneously with flawless real-time translation for 30 seconds, what would you say?",
        "guidePoints": [
            "Identify a message capable of transcending cultural, religious, and political divides.",
            "How would you prevent mass panic or cynicism from eight billion listeners?",
            "Would you offer philosophical wisdom, an inspiring call to action, or a scientific reminder?"
        ]
    },
    {
        "id": 49,
        "title": "Deploying One Billion Dollars for Humanity",
        "category": "Thought Experiments",
        "categoryKey": "experiments",
        "question": "If you were awarded one billion dollars with the strict legal obligation to spend it over five years to maximize the long-term flourishing of humanity, what specific cause or infrastructure would you fund?",
        "guidePoints": [
            "Compare immediate humanitarian relief (malaria eradication, clean water) vs. existential risk mitigation (AI safety, pandemic prevention, fusion energy).",
            "Evaluate whether funding early childhood education in underserved regions yields the highest compounding return.",
            "How would you prevent bureaucracy and corruption from diluting your capital's impact?"
        ]
    },
    {
        "id": 50,
        "title": "The 10,000-Year Civilization Time Capsule",
        "category": "Thought Experiments",
        "categoryKey": "experiments",
        "question": "Humanity is sealing a titanium vault designed to survive for 10,000 years to communicate with whatever intelligent beings inhabit Earth in the distant future. What three artifacts or records would you deposit to represent humanity's greatest glory and deepest warning?",
        "guidePoints": [
            "Select one scientific discovery or mathematical principle representing our rational zenith.",
            "Select one piece of art, music, or literature embodying the human spirit and capacity for love.",
            "Select one historical artifact serving as a cautionary warning about our vulnerabilities and hubris."
        ]
    }
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
    ['modal-create-buddy-peer', 'modal-join-buddy-code'].forEach(id => {
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

      this.renderHub(data);

      // Display first active scheduled session, or show pending admin setup state
      const activeSession = this.allSessions.find(s => s.status === 'active');
      if (activeSession) {
        this.selectSession(activeSession.id);
      } else if (this.allSessions.length > 0) {
        this.renderPendingAdminSetup(this.allSessions[0]);
      } else {
        this.renderSandboxDemo();
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
        <div class="buddy-empty-state" style="padding: 2.5rem; text-align: center; border-radius: 14px; border: 1.5px dashed rgba(198, 138, 40, 0.35);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">👥</div>
          <h4 style="font-family: var(--font-heading); font-size: 1.15rem; color: var(--charcoal-900); margin-bottom: 0.35rem;">Experience Aviora Buddy for $6</h4>
          <p style="color: var(--text-secondary); font-size: 0.88rem; max-width: 480px; margin: 0 auto 1.25rem;">
            Join two students in a single classroom for interactive quiz bees, math duels, conversational discussion questions, and live co-learning. Coordinated and scheduled by our administrator at a flat $6 rate!
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
        <div class="buddy-empty-state" style="padding: 2.5rem; text-align: center; border-radius: 14px; border: 1.5px dashed rgba(198, 138, 40, 0.35);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚡</div>
          <h4 style="font-family: var(--font-heading); font-size: 1.2rem; color: var(--charcoal-900); margin-bottom: 0.35rem;">No Active Buddy Sessions Yet</h4>
          <p style="color: var(--text-secondary); font-size: 0.88rem; max-width: 480px; margin: 0 auto 1.25rem;">
            Ready to learn and compete with a buddy for $6? Set up a session with a faculty educator or launch a peer study battle below!
          </p>
          <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" onclick="AvioraBuddy.openPeerModal()">⚡ Book Aviora Buddy Session ($6)</button>
          </div>
        </div>
      `;
      this.renderSandboxDemo();
      return;
    }

    listContainer.innerHTML = data.sessions.map(s => {
      const isPending = s.status === 'pending';
      const hasSlot2 = !!s.student2_name;
      const isSelected = this.activeSession && this.activeSession.id === s.id;

      return `
        <div class="buddy-card ${isSelected ? 'active' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            ${isPending 
              ? '<span class="badge" style="background: rgba(198, 138, 40, 0.15); color: var(--gold-800); border: 1px solid rgba(198, 138, 40, 0.4); font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.55rem; border-radius: 999px;">⏳ Pending Admin Setup</span>'
              : '<span class="badge-gold" style="font-size: 0.7rem; font-weight: 800;">✓ Confirmed &amp; Scheduled</span>'
            }
            <span style="font-family: monospace; font-size: 0.76rem; background: rgba(0,0,0,0.06); padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700;">
              Code: ${s.session_code} (Max 2)
            </span>
          </div>

          <h4 style="font-family: var(--font-heading); font-size: 1.15rem; font-weight: 800; color: var(--charcoal-900); margin-bottom: 0.35rem;">
            ${s.subject}
          </h4>
          <p style="color: var(--text-secondary); font-size: 0.82rem; margin-bottom: 0.75rem; line-height: 1.45;">
            ${s.topic || 'Quiz Bee, Speed Equations & Conversational Questions'}
          </p>

          ${isPending ? `
            <div style="background: rgba(198, 138, 40, 0.08); border-left: 3px solid var(--gold-600); border-radius: 6px; padding: 0.75rem 0.9rem; font-size: 0.78rem; color: var(--charcoal-800); margin-bottom: 0.85rem; line-height: 1.5;">
              <strong>Awaiting Admin Setup:</strong> Once the admin has set up the students in Aviora Buddy, a date and time for the session will be provided, along with a code to be used for accessing the Aviora Buddy class.

            </div>
          ` : `
            <div style="background: rgba(16, 185, 129, 0.06); border-left: 3px solid #10B981; border-radius: 6px; padding: 0.75rem 0.9rem; font-size: 0.78rem; color: #065F46; margin-bottom: 0.85rem; line-height: 1.5;">
              <div style="font-weight: 800; color: #065F46; margin-bottom: 0.2rem;">✓ Admin Setup Confirmed</div>
              <div><strong>Confirmed Date &amp; Time:</strong> ${s.scheduled_date} (${s.scheduled_time})</div>
              <div style="font-family: monospace; font-size: 0.85rem; font-weight: 800; color: var(--gold-800); margin-top: 0.3rem;">
                Class Access Code: ${s.session_code}
              </div>

            </div>
          `}

          <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-top: 1px dashed var(--border-light); border-bottom: 1px dashed var(--border-light); margin-bottom: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="display: flex; align-items: center;">
                <img src="${s.student1_avatar || '/assets/favicon.png'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid var(--gold-400);" title="${s.student1_name || 'Student 1'}" />
                <img src="${s.student2_avatar || '/assets/favicon.png'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid ${hasSlot2 ? '#10B981' : 'rgba(0,0,0,0.2)'}; margin-left: -10px;" title="${s.student2_name || 'Awaiting Partner'}" />
              </div>
              <div style="font-size: 0.78rem;">
                <div style="font-weight: 700; color: var(--charcoal-900);">${s.student1_name} &amp; ${s.student2_name || 'Open Slot'}</div>
                <div style="color: var(--text-secondary); font-size: 0.72rem;">2-Student Peer Co-Learning</div>
              </div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 1.1rem; font-weight: 900; color: var(--gold-700); font-family: var(--font-heading);">$6.00</span>
              <div style="font-size: 0.7rem; color: var(--text-secondary);">flat duo rate</div>
            </div>
          </div>

          <div style="display: flex; gap: 0.65rem; align-items: center;">
            ${isPending ? `
              <button class="btn btn-secondary btn-sm" disabled style="flex: 1; opacity: 0.75; cursor: not-allowed; font-size: 0.8rem; justify-content: center;">
                ⏳ Awaiting Admin Setup
              </button>
            ` : `
              <button class="btn btn-primary btn-sm" onclick="AvioraBuddy.selectSession(${s.id})" style="flex: 1; font-weight: 700; font-size: 0.8rem; justify-content: center;">
                🎮 Access Aviora Buddy Class
              </button>
            `}
            <button class="btn btn-outline-gold btn-sm" onclick="navigator.clipboard.writeText('${s.session_code}'); showToast('Buddy code ${s.session_code} copied to clipboard!', 'success');" title="Copy Specific Admin Code" style="padding: 0.35rem 0.6rem;">
              📋 Copy Code
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

      // If pending admin setup, display awaiting setup card instead of active game duel
      if (data.session.status === 'pending' || data.is_pending_setup) {
        this.renderPendingAdminSetup(data.session);
        return;
      }

      this.renderArena(data.session, data.messages || []);
      
      // Start chat polling
      this.startChatPoll(sessionId);

      const arena = document.getElementById('buddy-arena-section');
      if (arena) {
        arena.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    } catch (e) {
      console.warn('Select session error:', e);
      showToast(e.message || 'Could not load session details.', 'error');
    }
  },

  renderPendingAdminSetup(session) {
    const pendingContainer = document.getElementById('buddy-arena-pending-content');
    const activeContainer = document.getElementById('buddy-arena-active-content');
    const arenaSection = document.getElementById('buddy-arena-section');
    if (arenaSection) arenaSection.style.display = 'block';
    if (activeContainer) activeContainer.style.display = 'none';
    if (!pendingContainer) return;

    pendingContainer.style.display = 'block';
    pendingContainer.innerHTML = `
      <div style="padding: 2.75rem 2rem; text-align: center; color: #FFFFFF; background: linear-gradient(135deg, #18181B 0%, #27272A 100%); border-radius: 16px; border: 1.5px solid rgba(198, 138, 40, 0.4); box-shadow: var(--shadow-md);">
        <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(198, 138, 40, 0.18); border: 1px solid rgba(198, 138, 40, 0.45); color: #F59E0B; padding: 0.35rem 0.95rem; border-radius: 999px; font-size: 0.78rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1.25rem;">
          ⏳ Awaiting Admin Setup
        </div>
        
        <h2 style="font-family: var(--font-heading); font-size: 1.75rem; font-weight: 900; color: #FAF7F2; margin-bottom: 0.5rem;">
          ${this.escapeHtml(session.subject)}
        </h2>
        <div style="font-size: 0.9rem; color: #D1D5DB; margin-bottom: 1.5rem;">
          ${this.escapeHtml(session.topic || 'Peer Study, Quiz Bee Duel & Conversational Questions')}
        </div>

        <div style="max-width: 620px; margin: 0 auto 1.75rem; background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.25rem 1.5rem; text-align: left; line-height: 1.6;">
          <div style="display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.85rem;">
            <span style="font-size: 1.25rem;">ℹ️</span>
            <div style="font-size: 0.88rem; color: #F3F4F6;">
              Once the admin has set up the students in Aviora Buddy, a date and time for the session will be provided, along with a code to be used for accessing the Aviora Buddy class.
            </div>
          </div>

        </div>

        <div style="display: flex; justify-content: center; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1.75rem;">
          <div style="text-align: left; background: rgba(255, 255, 255, 0.05); padding: 0.85rem 1.25rem; border-radius: 10px; min-width: 190px;">
            <div style="font-size: 0.72rem; color: #9CA3AF; text-transform: uppercase; font-weight: 700;">Student 1</div>
            <div style="font-size: 0.92rem; font-weight: 700; color: #FFFFFF; margin-top: 0.15rem;">${this.escapeHtml(session.student1_name || 'Enrolled Student')}</div>
          </div>
          <div style="text-align: left; background: rgba(255, 255, 255, 0.05); padding: 0.85rem 1.25rem; border-radius: 10px; min-width: 190px;">
            <div style="font-size: 0.72rem; color: #9CA3AF; text-transform: uppercase; font-weight: 700;">Student 2</div>
            <div style="font-size: 0.92rem; font-weight: 700; color: #F59E0B; margin-top: 0.15rem;">${session.student2_name ? this.escapeHtml(session.student2_name) : 'Admin Pairing in Progress'}</div>
          </div>
          <div style="text-align: left; background: rgba(255, 255, 255, 0.05); padding: 0.85rem 1.25rem; border-radius: 10px; min-width: 190px;">
            <div style="font-size: 0.72rem; color: #9CA3AF; text-transform: uppercase; font-weight: 700;">Date, Time &amp; Access Code</div>
            <div style="font-size: 0.92rem; font-weight: 700; color: #F59E0B; margin-top: 0.15rem;">Pending Admin Setup</div>
          </div>
        </div>

        <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="AvioraBuddy.loadBuddyHub()" style="background: rgba(255,255,255,0.15); color: #FFFFFF; border: none; font-weight: 700;">
            ↻ Refresh Admin Status
          </button>
          <button type="button" class="btn btn-primary btn-sm" onclick="AvioraBuddy.openJoinCodeModal()" style="font-weight: 700;">
            🔑 Enter Specific Admin Code
          </button>
        </div>
      </div>
    `;
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

    const pendingContainer = document.getElementById('buddy-arena-pending-content');
    const activeContainer = document.getElementById('buddy-arena-active-content');
    if (pendingContainer) pendingContainer.style.display = 'none';
    if (activeContainer) activeContainer.style.display = 'block';

    // Update Topbar
    const titleEl = document.getElementById('buddy-arena-title');
    const codeEl = document.getElementById('buddy-arena-code-badge');
    const schedEl = document.getElementById('buddy-arena-schedule-badge');
    const s1NameEl = document.getElementById('buddy-player1-name');
    const s1AvatarEl = document.getElementById('buddy-player1-avatar');
    const s2NameEl = document.getElementById('buddy-player2-name');
    const s2AvatarEl = document.getElementById('buddy-player2-avatar');

    if (titleEl) titleEl.textContent = session.subject;
    if (codeEl) codeEl.textContent = `Code: ${session.session_code} • Limited to 2 People`;
    if (schedEl) {
      if (session.scheduled_date && session.scheduled_date !== 'Pending Admin Scheduling') {
        schedEl.textContent = `📅 ${session.scheduled_date} • ⏰ ${session.scheduled_time}`;
      } else {
        schedEl.textContent = '📅 Admin Confirmed Schedule';
      }
    }
    if (s1NameEl) s1NameEl.textContent = session.student1_name || 'Student 1';
    if (s1AvatarEl && session.student1_avatar) s1AvatarEl.src = session.student1_avatar;
    if (s2NameEl) s2NameEl.textContent = session.student2_name || 'Student 2';
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
    } else if (gameKey === 'discussion') {
      this.renderConversationalQuestions(stage);
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
  // GAME 6: CONVERSATIONAL QUESTIONS (1 - 50)
  // ==========================================
  selectQuestion(id) {
    const num = parseInt(id, 10);
    if (isNaN(num) || num < 1 || num > 50) return;
    this.selectedQuestionId = num;
    this.discussionIndex = num - 1;
    const stage = document.getElementById('buddy-game-stage');
    if (stage) {
      this.renderConversationalQuestions(stage);
    }
  },

  filterQuestions(categoryKey) {
    this.currentQuestionFilter = categoryKey;
    const stage = document.getElementById('buddy-game-stage');
    if (stage) {
      this.renderConversationalQuestions(stage);
    }
  },

  pickRandomQuestion() {
    let pool = this.discussionBank;
    if (this.currentQuestionFilter && this.currentQuestionFilter !== 'all') {
      pool = pool.filter(q => q.categoryKey === this.currentQuestionFilter);
    }
    if (!pool || pool.length === 0) pool = this.discussionBank;
    const rand = pool[Math.floor(Math.random() * pool.length)];
    this.selectQuestion(rand.id);
  },

  toggleDiscussed(id) {
    const num = parseInt(id, 10);
    if (this.discussedQuestionIds.has(num)) {
      this.discussedQuestionIds.delete(num);
      this.discussedIds.delete(num);
    } else {
      this.discussedQuestionIds.add(num);
      this.discussedIds.add(num);
    }
    const stage = document.getElementById('buddy-game-stage');
    if (stage) {
      this.renderConversationalQuestions(stage);
    }
  },

  sendQuestionToChat(id) {
    const num = parseInt(id, 10);
    const q = this.discussionBank.find(item => item.id === num);
    if (!q) return;
    const msg = `💬 Conversational Question #${q.id} ("${q.title}"):\n"${q.question}"`;
    this.sendChatMessage(msg);
    if (typeof showToast === 'function') {
      showToast(`Question #${q.id} posted to Buddy Chat!`, 'success');
    }
  },

  renderConversationalQuestions(stage) {
    const activeId = this.selectedQuestionId || 1;
    const q = this.discussionBank.find(item => item.id === activeId) || this.discussionBank[0];
    const isDiscussed = this.discussedQuestionIds.has(q.id);

    // Filter pills
    const filterPills = [
      { key: 'all', label: 'All Questions (1–50)' },
      { key: 'science', label: '🔬 Science & Cosmos (#1–10)' },
      { key: 'tech', label: '🤖 Tech & AI (#11–20)' },
      { key: 'philosophy', label: '⚖️ Philosophy & Ethics (#21–30)' },
      { key: 'education', label: '📚 Learning & Mindset (#31–40)' },
      { key: 'experiments', label: '🌌 Thought Experiments (#41–50)' }
    ];

    const filterPillsHtml = filterPills.map(f => `
      <button type="button" 
              class="discussion-filter-pill ${this.currentQuestionFilter === f.key ? 'active' : ''}" 
              onclick="AvioraBuddy.filterQuestions('${f.key}')">
        ${f.label}
      </button>
    `).join('');

    // Numbers Grid (1 to 50)
    const numbersGridHtml = this.discussionBank.map(item => {
      const isSelected = item.id === activeId;
      const discussed = this.discussedQuestionIds.has(item.id);
      const isDimmed = this.currentQuestionFilter !== 'all' && item.categoryKey !== this.currentQuestionFilter;
      return `
        <button type="button" 
                class="question-num-btn ${isSelected ? 'active' : ''} ${discussed ? 'discussed' : ''} ${isDimmed ? 'dimmed' : ''}" 
                onclick="AvioraBuddy.selectQuestion(${item.id})"
                title="Question #${item.id}: ${item.title}">
          ${item.id}
        </button>
      `;
    }).join('');

    // Guide points list
    const guidePointsHtml = (q.guidePoints || []).map(pt => `<li>${pt}</li>`).join('');

    stage.innerHTML = `
      <div class="conversational-board">
        <!-- Top Number Selector Bar -->
        <div class="conversational-header-box">
          <div class="conversational-title">
            <span>💬</span>
            <span>Conversational Questions</span>
            <span class="badge-gold" style="font-size: 0.72rem; padding: 0.15rem 0.5rem; font-weight: 800;">50 Questions</span>
          </div>
          <div class="conversational-subtitle">
            Select any number from 1 through 50 below to reveal a topic for you and your peer to discuss.
          </div>

          <!-- Category Filter Bar -->
          <div class="discussion-filter-pills">
            ${filterPillsHtml}
          </div>

          <!-- 50 Numbers Grid -->
          <div class="questions-number-grid">
            ${numbersGridHtml}
          </div>
        </div>

        <!-- Revealed Question Card -->
        <div class="revealed-question-card">
          <div class="revealed-question-topbar">
            <div class="revealed-question-meta">
              <span class="revealed-question-badge">Question #${q.id} of 50</span>
              <span class="badge-accent" style="font-size: 0.72rem; font-weight: 700;">${q.category}</span>
              ${isDiscussed ? '<span class="badge-gold" style="font-size: 0.7rem; background: rgba(16, 185, 129, 0.18); border-color: rgba(16, 185, 129, 0.4); color: #34D399; font-weight: 700;">✓ Topic Discussed</span>' : ''}
            </div>
            <div>
              <button type="button" class="btn btn-outline-gold btn-sm" onclick="AvioraBuddy.pickRandomQuestion()" style="font-size: 0.75rem; padding: 0.25rem 0.65rem;">
                🎲 Pick Random
              </button>
            </div>
          </div>

          <div class="revealed-question-title">${q.title}</div>
          
          <div class="revealed-question-text">
            "${q.question}"
          </div>

          <!-- Guided Discussion Angles for Duo -->
          <div class="revealed-guide-box">
            <div class="revealed-guide-header">
              <span>💡</span>
              <span>Key Discussion Angles for Peer Duo:</span>
            </div>
            <ul class="revealed-guide-list">
              ${guidePointsHtml}
            </ul>
          </div>

          <!-- Action Buttons -->
          <div class="revealed-actions-row">
            <div class="revealed-actions-left">
              <button type="button" class="btn btn-primary btn-sm" onclick="AvioraBuddy.sendQuestionToChat(${q.id})" style="display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 700;">
                <span>💬</span>
                <span>Send Topic to Buddy Chat</span>
              </button>
              <button type="button" class="btn btn-outline-gold btn-sm" onclick="AvioraBuddy.toggleDiscussed(${q.id})" style="font-weight: 600;">
                ${isDiscussed ? '✓ Marked as Discussed' : 'Mark as Discussed'}
              </button>
            </div>

            <div class="revealed-actions-right">
              <button type="button" class="btn btn-secondary btn-sm" onclick="AvioraBuddy.selectQuestion(${q.id > 1 ? q.id - 1 : 50})" style="padding: 0.35rem 0.75rem;">
                ← Prev (#${q.id > 1 ? q.id - 1 : 50})
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="AvioraBuddy.selectQuestion(${q.id < 50 ? q.id + 1 : 1})" style="padding: 0.35rem 0.75rem;">
                Next (#${q.id < 50 ? q.id + 1 : 1}) →
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderDiscussionTopics(stage) {
    this.renderConversationalQuestions(stage);
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
    if (select) {
      select.innerHTML = `
        <option value="">Admin Match (Pair with a compatible peer student)</option>
        ${this.peersList.map(p => `<option value="${p.id}">${p.name} — ${p.grade_level || 'Student'}</option>`).join('')}
      `;
    }

    const dateInp = document.getElementById('buddy-peer-date');
    if (dateInp) {
      dateInp.value = new Date().toISOString().split('T')[0];
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
    const dateInp = document.getElementById('buddy-peer-date');
    const timeInp = document.getElementById('buddy-peer-time');

    const payload = {
      student2_id: peerSelect && peerSelect.value ? peerSelect.value : null,
      subject: subjectInp && subjectInp.value.trim() ? subjectInp.value.trim() : 'AP Calculus & Co-Learning Studio',
      topic: topicInp && topicInp.value.trim() ? topicInp.value.trim() : 'Quiz Bee, Math Duel & Conversational Questions',
      scheduled_date: dateInp && dateInp.value ? dateInp.value : 'Pending Admin Scheduling',
      scheduled_time: timeInp && timeInp.value ? timeInp.value : 'Pending Admin Scheduling'
    };

    try {
      const token = Storage.getToken();
      if (!token) {
        showToast('Please log in with your student account to book Aviora Buddy ($6).', 'info');
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

      showToast(data.message || 'Aviora Buddy booking submitted! Status: Pending Admin Scheduling.', 'success');
      this.closeModal('modal-create-buddy-peer');
      await this.loadBuddyHub();

      if (data.session && data.session.status === 'active') {
        this.selectSession(data.session.id);
      }
    } catch (e) {
      showToast(e.message || 'Failed to book Aviora Buddy session.', 'error');
    }
  },

  async submitJoinCode() {
    const input = document.getElementById('input-buddy-join-code');
    if (!input || !input.value.trim()) {
      showToast('Please enter your Buddy Code (e.g. BUDDY-7482)', 'warning');
      return;
    }

    try {
      const token = Storage.getToken();
      if (!token) {
        showToast('Please log in to access your Aviora Buddy class.', 'info');
        window.location.hash = '#login';
        return;
      }

      const res = await fetch('/api/buddy/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ session_code: input.value.trim().toUpperCase() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(data.message || 'Access granted to your Aviora Buddy class!', 'success');
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