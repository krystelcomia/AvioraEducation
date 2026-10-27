const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const sourceDbPath = path.join(__dirname, 'aviora.db');
const targetDbDir = isVercel ? '/tmp' : __dirname;
const dbPath = path.join(targetDbDir, 'aviora.db');

if (isVercel && !fs.existsSync(dbPath)) {
  if (fs.existsSync(sourceDbPath)) {
    try {
      fs.copyFileSync(sourceDbPath, dbPath);
    } catch (e) {
      console.warn('Could not copy initial aviora.db to /tmp, will initialize new DB:', e);
    }
  }
}

const db = new Database(dbPath);

// Enable foreign keys and WAL mode for fast concurrent operations
db.pragma('foreign_keys = ON');
if (!isVercel) {
  db.pragma('journal_mode = WAL');
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'teacher', 'tutor', 'admin')),
      phone TEXT,
      avatar_url TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      grade_level TEXT,
      school TEXT,
      learning_goals TEXT,
      target_subjects TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS teacher_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      headline TEXT,
      highest_degree TEXT,
      institution TEXT,
      graduation_year INTEGER,
      years_experience INTEGER,
      subjects TEXT,
      grade_levels TEXT,
      hourly_rate REAL NOT NULL DEFAULT 40.0,
      bio TEXT,
      teaching_philosophy TEXT,
      credentials_file TEXT,
      credentials_filename TEXT,
      availability_schedule TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      admin_notes TEXT,
      reviewed_by INTEGER REFERENCES users(id),
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tutor_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      application_id INTEGER REFERENCES teacher_applications(id),
      headline TEXT,
      bio TEXT,
      highest_degree TEXT,
      institution TEXT,
      years_experience INTEGER,
      subjects TEXT,
      grade_levels TEXT,
      hourly_rate REAL NOT NULL,
      rating REAL DEFAULT 5.0,
      reviews_count INTEGER DEFAULT 0,
      total_sessions INTEGER DEFAULT 0,
      availability_schedule TEXT,
      is_featured INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tutoring_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      grade_level TEXT,
      requested_date TEXT NOT NULL,
      requested_time TEXT NOT NULL,
      duration_hours REAL DEFAULT 1.0,
      hourly_rate REAL NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
      notes TEXT,
      tutor_response_note TEXT,
      room_status TEXT DEFAULT 'closed',
      room_started_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER REFERENCES tutoring_requests(id),
      student_id INTEGER NOT NULL REFERENCES users(id),
      tutor_id INTEGER NOT NULL REFERENCES users(id),
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      link TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      theme TEXT DEFAULT 'light',
      language TEXT DEFAULT 'en-US',
      font_size TEXT DEFAULT 'normal',
      timezone TEXT DEFAULT 'America/New_York',
      notif_lessons INTEGER DEFAULT 1,
      notif_calendar INTEGER DEFAULT 1,
      notif_messages INTEGER DEFAULT 1,
      notif_reports INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_name TEXT NOT NULL,
      lessons_total INTEGER NOT NULL,
      lessons_remaining INTEGER NOT NULL,
      price_paid REAL NOT NULL,
      purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'expired', 'exhausted')),
      is_trial INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender_name TEXT,
      sender_email TEXT,
      subject TEXT,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS virtual_room_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL REFERENCES tutoring_requests(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id),
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS buddy_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_code TEXT UNIQUE NOT NULL,
      session_type TEXT NOT NULL CHECK(session_type IN ('tutor_led', 'peer_study')),
      tutor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      student1_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      student2_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      subject TEXT NOT NULL,
      topic TEXT,
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      fee_per_student REAL DEFAULT 6.00,
      total_fee REAL DEFAULT 12.00,
      game_state TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('pending', 'active', 'completed', 'cancelled')),
      room_status TEXT DEFAULT 'open' CHECK(room_status IN ('closed', 'open', 'ended')),
      room_started_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS buddy_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES buddy_sessions(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT DEFAULT 'Student',
      subject TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'responded', 'archived')),
      admin_response TEXT,
      responded_at DATETIME,
      responded_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS oauth_linked_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL CHECK(provider IN ('google', 'facebook')),
      provider_user_id TEXT,
      email TEXT NOT NULL,
      name TEXT,
      avatar_url TEXT,
      linked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(provider, email)
    );

    CREATE TABLE IF NOT EXISTS tutor_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      status TEXT DEFAULT 'assigned' CHECK(status IN ('assigned', 'submitted', 'graded')),
      student_submission TEXT,
      submitted_at DATETIME,
      grade TEXT,
      feedback TEXT,
      graded_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tutor_occupied_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day_of_week TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      date TEXT,
      reason TEXT DEFAULT 'Occupied / Unavailable',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tutor_id, day_of_week, time_slot)
    );

    -- Enforce case-insensitive uniqueness and relational indexes across the entire system
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_nocase ON users(email COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_tutor_profiles_user_id ON tutor_profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_teacher_applications_user_id ON teacher_applications(user_id);
    CREATE INDEX IF NOT EXISTS idx_tutoring_requests_student ON tutoring_requests(student_id);
    CREATE INDEX IF NOT EXISTS idx_tutoring_requests_tutor ON tutoring_requests(tutor_id);
    CREATE INDEX IF NOT EXISTS idx_tutor_tasks_tutor ON tutor_tasks(tutor_id);
    CREATE INDEX IF NOT EXISTS idx_tutor_tasks_student ON tutor_tasks(student_id);
    CREATE INDEX IF NOT EXISTS idx_tutor_occupied_tutor ON tutor_occupied_slots(tutor_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_tutor ON reviews(tutor_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON student_subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_oauth_linked_user ON oauth_linked_accounts(user_id);
  `);

  try {
    db.prepare("ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local'").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE users ADD COLUMN oauth_id TEXT").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE tutoring_requests ADD COLUMN payment_method TEXT DEFAULT 'card'").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE tutoring_requests ADD COLUMN room_status TEXT DEFAULT 'closed'").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE tutoring_requests ADD COLUMN room_started_at DATETIME").run();
  } catch (e) {}
  try {
    const prefCols = db.prepare("PRAGMA table_info(user_preferences)").all();
    if (prefCols.length > 0 && !prefCols.some(c => c.name === 'font_size')) {
      db.prepare("ALTER TABLE user_preferences ADD COLUMN font_size TEXT DEFAULT 'normal'").run();
    }
  } catch (e) {}
}

function seedData() {
  const adminCheck = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@aviora.edu');
  if (adminCheck) {
    return; // Already seeded
  }

  console.log('Seeding initial Aviora Education database...');
  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHash = bcrypt.hashSync('admin123', salt);
  const teacherPasswordHash = bcrypt.hashSync('teacher123', salt);
  const studentPasswordHash = bcrypt.hashSync('student123', salt);

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, phone, avatar_url, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `);

  const insertTeacherApp = db.prepare(`
    INSERT INTO teacher_applications (
      user_id, headline, highest_degree, institution, graduation_year,
      years_experience, subjects, grade_levels, hourly_rate, bio,
      teaching_philosophy, credentials_file, credentials_filename,
      availability_schedule, status, admin_notes, reviewed_by, reviewed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTutorProfile = db.prepare(`
    INSERT INTO tutor_profiles (
      user_id, application_id, headline, bio, highest_degree,
      institution, years_experience, subjects, grade_levels,
      hourly_rate, rating, reviews_count, total_sessions,
      availability_schedule, is_featured, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const insertStudentProfile = db.prepare(`
    INSERT INTO student_profiles (user_id, grade_level, school, learning_goals, target_subjects)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertRequest = db.prepare(`
    INSERT INTO tutoring_requests (
      student_id, tutor_id, subject, grade_level, requested_date,
      requested_time, duration_hours, hourly_rate, total_amount, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertReview = db.prepare(`
    INSERT INTO reviews (request_id, student_id, tutor_id, rating, comment)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertNotification = db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, is_read, link)
    VALUES (?, ?, ?, ?, 0, ?)
  `);

  // 1. Admin
  const adminRes = insertUser.run(
    'Dr. Julian Rhodes',
    'admin@aviora.edu',
    adminPasswordHash,
    'admin',
    '+1 (555) 839-2041',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
  );
  const adminId = adminRes.lastInsertRowid;

  // 2. Tutors (Approved)
  const tutorsData = [
    {
      name: 'Dr. Elena Vance',
      email: 'elena.vance@aviora.edu',
      phone: '+1 (555) 234-8901',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      headline: 'Ph.D. in Applied Mathematics | Stanford University',
      degree: 'Ph.D. in Applied Mathematics',
      institution: 'Stanford University',
      gradYear: 2018,
      years: 7,
      subjects: ['Calculus AB/BC', 'Linear Algebra', 'AP Statistics', 'SAT Math'],
      gradeLevels: ['High School', 'College / Undergraduate', 'Advanced Placement'],
      rate: 65,
      rating: 4.95,
      reviewsCount: 38,
      sessions: 142,
      featured: 1,
      bio: 'Former university lecturer with a passion for demystifying abstract mathematics. I break down multivariable calculus and differential equations into clear, visual, intuitive mental models. Over 90% of my AP students achieve a 5.',
      philosophy: 'Mastery stems from intuition before formulas. When students see why a theorem works, memorization becomes effortless.'
    },
    {
      name: 'Prof. Marcus Sterling',
      email: 'marcus.sterling@aviora.edu',
      phone: '+1 (555) 345-6712',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
      headline: 'M.S. in Theoretical Physics | MIT',
      degree: 'M.S. in Physics & Quantum Systems',
      institution: 'Massachusetts Institute of Technology',
      gradYear: 2019,
      years: 6,
      subjects: ['Physics Mechanics', 'Electricity & Magnetism', 'AP Physics C', 'Calculus'],
      gradeLevels: ['High School', 'College / Undergraduate'],
      rate: 58,
      rating: 5.0,
      reviewsCount: 42,
      sessions: 168,
      featured: 1,
      bio: 'MIT graduate specializing in making complex physics tangible and thrilling. I focus on real-world mechanics, problem decomposition, and competitive Olympiad preparation.',
      philosophy: 'Physics is the language of reality. Once you learn to look at problems through fundamental principles, answers reveal themselves.'
    },
    {
      name: 'Sarah Lin, M.Ed.',
      email: 'sarah.lin@aviora.edu',
      phone: '+1 (555) 456-7823',
      avatar: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=400&q=80',
      headline: 'Master of Education | Columbia University',
      degree: 'M.Ed. in English Education',
      institution: 'Columbia University',
      gradYear: 2020,
      years: 5,
      subjects: ['AP English Literature', 'SAT/ACT Reading & Writing', 'College Admissions Essays', 'Creative Writing'],
      gradeLevels: ['Middle School', 'High School', 'College / Undergraduate'],
      rate: 48,
      rating: 4.9,
      reviewsCount: 29,
      sessions: 96,
      featured: 1,
      bio: 'Published essayist and seasoned admissions coach. I help students find their authentic voice, craft compelling narratives, and master critical analytical writing.',
      philosophy: 'Writing clearly is thinking clearly. I guide students to structure arguments that resonate with clarity and persuasive elegance.'
    },
    {
      name: 'Dr. Julian Morales',
      email: 'julian.morales@aviora.edu',
      phone: '+1 (555) 567-8934',
      avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80',
      headline: 'Ph.D. in Organic Chemistry | UC Berkeley',
      degree: 'Ph.D. in Organic Chemistry',
      institution: 'University of California, Berkeley',
      gradYear: 2017,
      years: 8,
      subjects: ['Organic Chemistry I & II', 'General Chemistry', 'MCAT Chemical Sciences', 'Biochemistry'],
      gradeLevels: ['College / Undergraduate', 'Pre-Med / Graduate'],
      rate: 62,
      rating: 4.88,
      reviewsCount: 26,
      sessions: 110,
      featured: 1,
      bio: 'Dedicated organic chemistry specialist with extensive MCAT prep experience. Known for reaction mechanism roadmaps that transform daunting courses into confident As.',
      philosophy: 'Organic chemistry is pattern recognition, not rote memorization. Understanding electron flow makes every mechanism predictable.'
    },
    {
      name: 'Aaliyah Chen',
      email: 'aaliyah.chen@aviora.edu',
      phone: '+1 (555) 678-9045',
      avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=400&q=80',
      headline: 'B.S. in Computer Science & AI | Carnegie Mellon',
      degree: 'B.S. in Computer Science',
      institution: 'Carnegie Mellon University',
      gradYear: 2021,
      years: 4,
      subjects: ['Python Programming', 'AP Computer Science A', 'Data Structures & Algorithms', 'Web Development'],
      gradeLevels: ['Middle School', 'High School', 'College / Undergraduate'],
      rate: 52,
      rating: 4.96,
      reviewsCount: 31,
      sessions: 115,
      featured: 1,
      bio: 'Senior Software Engineer and tutor passionate about inspiring young engineers. I teach hands-on algorithmic problem solving, clean code architecture, and modern full-stack development.',
      philosophy: 'Build from day one. Programming is best learned by crafting real projects and analyzing why things work under the hood.'
    },
    {
      name: 'David Rousseau',
      email: 'david.rousseau@aviora.edu',
      phone: '+1 (555) 789-0156',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      headline: 'M.A. in Linguistics & French Literature | Sorbonne & Oxford',
      degree: 'M.A. in French Literature',
      institution: 'Sorbonne University / Oxford',
      gradYear: 2016,
      years: 9,
      subjects: ['French (Beginner to Fluent)', 'AP French Language', 'Conversational French', 'DELF/DALF Prep'],
      gradeLevels: ['All Levels', 'High School', 'Adult Learners'],
      rate: 44,
      rating: 4.92,
      reviewsCount: 22,
      sessions: 88,
      featured: 0,
      bio: 'Native French speaker with dual degrees from Paris and Oxford. Immersive conversational approach blended with structured grammar mastery for rapid fluency.',
      philosophy: 'Language is culture and connection. Speaking with confidence begins in a supportive, pressure-free environment.'
    }
  ];

  const defaultSchedule = JSON.stringify({
    Monday: ['09:00 - 11:00', '14:00 - 17:00'],
    Tuesday: ['10:00 - 13:00', '15:00 - 18:00'],
    Wednesday: ['09:00 - 12:00', '14:00 - 17:00'],
    Thursday: ['13:00 - 18:00'],
    Friday: ['09:00 - 14:00'],
    Saturday: ['10:00 - 15:00']
  });

  const createdTutorUserIds = [];

  for (const t of tutorsData) {
    const userRes = insertUser.run(
      t.name,
      t.email,
      teacherPasswordHash,
      'teacher',
      t.phone,
      t.avatar
    );
    const userId = userRes.lastInsertRowid;
    createdTutorUserIds.push({ id: userId, name: t.name, rate: t.rate, subjects: t.subjects });

    const appRes = insertTeacherApp.run(
      userId,
      t.headline,
      t.degree,
      t.institution,
      t.gradYear,
      t.years,
      JSON.stringify(t.subjects),
      JSON.stringify(t.gradeLevels),
      t.rate,
      t.bio,
      t.philosophy,
      'credential_verified_sample.pdf',
      'Official_Degree_Verification.pdf',
      defaultSchedule,
      'approved',
      'Verified academic credentials, excellent portfolio and background check cleared.',
      adminId,
      new Date().toISOString()
    );

    insertTutorProfile.run(
      userId,
      appRes.lastInsertRowid,
      t.headline,
      t.bio,
      t.degree,
      t.institution,
      t.years,
      JSON.stringify(t.subjects),
      JSON.stringify(t.gradeLevels),
      t.rate,
      t.rating,
      t.reviewsCount,
      t.sessions,
      defaultSchedule,
      t.featured
    );
  }

  // 3. Pending Teacher Applicants (so the admin can test Review / Approve / Reject immediately!)
  const pendingApplicants = [
    {
      name: 'Robert Chen, M.S.',
      email: 'robert.chen.apply@gmail.com',
      phone: '+1 (555) 890-1234',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      headline: 'M.S. in Astrophysics | Caltech',
      degree: 'M.S. in Astrophysics',
      institution: 'California Institute of Technology',
      gradYear: 2022,
      years: 3,
      subjects: ['Physics Mechanics', 'AP Physics C', 'Astronomy', 'Algebra II'],
      gradeLevels: ['High School', 'College / Undergraduate'],
      rate: 55,
      bio: 'Research fellow at Caltech passionate about astrophysics, celestial mechanics, and high school physics coaching.',
      philosophy: 'Inspire curiosity first. When students connect with how the universe works, hard calculations become a fascinating puzzle.'
    },
    {
      name: 'Emily Watson, B.A.',
      email: 'emily.watson.apply@gmail.com',
      phone: '+1 (555) 901-2345',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
      headline: 'B.A. in History & Government | Harvard University',
      degree: 'B.A. in History and Government',
      institution: 'Harvard University',
      gradYear: 2023,
      years: 2,
      subjects: ['AP US History', 'AP European History', 'World History', 'Government & Politics'],
      gradeLevels: ['Middle School', 'High School'],
      rate: 45,
      bio: 'Harvard honors graduate with a focus on historical document analysis, DBQ essay mastery, and critical debate.',
      philosophy: 'History is not a list of dates; it is the study of human decisions, motivations, and patterns.'
    }
  ];

  for (const p of pendingApplicants) {
    const userRes = insertUser.run(
      p.name,
      p.email,
      teacherPasswordHash,
      'teacher',
      p.phone,
      p.avatar
    );
    const userId = userRes.lastInsertRowid;

    insertTeacherApp.run(
      userId,
      p.headline,
      p.degree,
      p.institution,
      p.gradYear,
      p.years,
      JSON.stringify(p.subjects),
      JSON.stringify(p.gradeLevels),
      p.rate,
      p.bio,
      p.philosophy,
      'applicant_diploma.pdf',
      `${p.name.replace(/[^a-zA-Z]/g, '_')}_Harvard_Caltech_Diploma.pdf`,
      defaultSchedule,
      'pending',
      null,
      null,
      null
    );

    insertNotification.run(
      adminId,
      'New Teacher Application Received',
      `${p.name} submitted an application to become an Aviora tutor in ${p.subjects.join(', ')}.`,
      'application',
      '/admin.html'
    );
  }

  // 4. Sample Students
  const studentsData = [
    {
      name: 'Lucas Taylor',
      email: 'student@aviora.edu', // Easy default demo student!
      phone: '+1 (555) 111-2233',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
      grade: 'Grade 11 - High School',
      school: 'Westlake Academic High',
      goals: 'Score 5 on AP Calculus BC and 1550+ on SAT Math for engineering college applications.',
      targetSubjects: 'Calculus AB/BC, SAT Math, Physics'
    },
    {
      name: 'Sophia Martinez',
      email: 'sophia.martinez@gmail.com',
      phone: '+1 (555) 222-3344',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
      grade: 'College Sophomore',
      school: 'Northwestern University',
      goals: 'Excel in Organic Chemistry II and prepare for MCAT Chemical Foundations section.',
      targetSubjects: 'Organic Chemistry I & II, Biochemistry'
    },
    {
      name: 'Maya Patel',
      email: 'maya.patel@gmail.com',
      phone: '+1 (555) 333-4455',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
      grade: 'Grade 10 - High School',
      school: 'St. Claire Academy',
      goals: 'Build strong fundamentals in Python and prepare for AP Computer Science A exam.',
      targetSubjects: 'Python Programming, AP Computer Science A'
    }
  ];

  const studentUserIds = [];
  for (const s of studentsData) {
    const userRes = insertUser.run(
      s.name,
      s.email,
      studentPasswordHash,
      'student',
      s.phone,
      s.avatar
    );
    const userId = userRes.lastInsertRowid;
    studentUserIds.push(userId);

    insertStudentProfile.run(userId, s.grade, s.school, s.goals, s.targetSubjects);
  }

  // 5. Tutoring Requests & Sessions
  // Lucas -> Elena Vance (Calculus)
  const req1 = insertRequest.run(
    studentUserIds[0],
    createdTutorUserIds[0].id,
    'Calculus AB/BC',
    'Grade 11 - High School',
    '2026-10-22',
    '15:00 - 16:30',
    1.5,
    65,
    97.5,
    'accepted',
    'Preparing for derivatives of inverse trigonometric functions and optimization problems.'
  );

  // Lucas -> Marcus Sterling (Physics)
  insertRequest.run(
    studentUserIds[0],
    createdTutorUserIds[1].id,
    'Physics Mechanics',
    'Grade 11 - High School',
    '2026-10-24',
    '16:00 - 17:00',
    1.0,
    58,
    58.0,
    'pending',
    'Would like guidance on rotational dynamics and angular momentum problem sets.'
  );

  // Sophia -> Julian Morales (Organic Chemistry) - Completed session
  const req3 = insertRequest.run(
    studentUserIds[1],
    createdTutorUserIds[3].id,
    'Organic Chemistry I & II',
    'College Sophomore',
    '2026-10-15',
    '14:00 - 16:00',
    2.0,
    62,
    124.0,
    'completed',
    'Need intensive review on electrophilic aromatic substitution mechanisms.'
  );

  // Maya -> Aaliyah Chen (Python) - Accepted session
  insertRequest.run(
    studentUserIds[2],
    createdTutorUserIds[4].id,
    'Python Programming',
    'Grade 10 - High School',
    '2026-10-23',
    '17:00 - 18:30',
    1.5,
    52,
    78.0,
    'accepted',
    'Working on recursive functions and binary search algorithms for my school project.'
  );

  // 6. Verified Student Reviews
  insertReview.run(
    req3.lastInsertRowid,
    studentUserIds[1],
    createdTutorUserIds[3].id,
    5,
    'Dr. Morales was phenomenal! In two hours, he made aromatic substitutions crystal clear after weeks of feeling lost in lecture. Highest recommendation!'
  );

  insertReview.run(
    null,
    studentUserIds[0],
    createdTutorUserIds[0].id,
    5,
    'Dr. Elena Vance is an exceptional tutor. Her step-by-step visual breakdowns helped me boost my test score from a 78% to a 96% in just one month.'
  );

  insertReview.run(
    null,
    studentUserIds[2],
    createdTutorUserIds[4].id,
    5,
    'Aaliyah makes coding so intuitive and fun. Her industry experience really shows through in how she explains data structures.'
  );

  insertReview.run(
    null,
    studentUserIds[0],
    createdTutorUserIds[1].id,
    5,
    'Prof. Sterling explained rotational inertia better than my school textbook ever could. Truly world-class instruction.'
  );

  // 7. Seed Notifications
  insertNotification.run(
    studentUserIds[0],
    'Session Confirmed with Dr. Elena Vance',
    'Your upcoming session on Calculus AB/BC is scheduled for Oct 22, 2026 at 15:00.',
    'session',
    '#student-requests'
  );

  insertNotification.run(
    createdTutorUserIds[1].id,
    'New Tutoring Request',
    'Lucas Taylor requested a Physics Mechanics session for Oct 24, 2026.',
    'request',
    '#teacher-requests'
  );

  console.log('Database seeded successfully with realistic data!');
}

initSchema();
seedData();

// Ensure demo student has an active subscription if none exists
try {
  const student = db.prepare("SELECT id FROM users WHERE email = 'student@aviora.edu'").get();
  if (student) {
    const existingSub = db.prepare("SELECT id FROM student_subscriptions WHERE user_id = ?").get(student.id);
    if (!existingSub) {
      db.prepare(`
        INSERT INTO student_subscriptions (
          user_id, plan_name, lessons_total, lessons_remaining, price_paid,
          purchase_date, expires_at, status, is_trial
        ) VALUES (
          ?, '8 Lessons Monthly', 8, 5, 399.00,
          datetime('now', '-2 days'), datetime('now', '+28 days'), 'active', 0
        )
      `).run(student.id);
    }
  }
} catch (e) {
  console.warn('Subscription seed note:', e.message);
}

// Ensure Krystel Comia account and all associated actions & data exist in database
function ensureKrystelAccount(customPassword) {
  try {
    const email = 'comiakrystel65@gmail.com';
    let user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);

    const passwordToHash = customPassword || 'Krystel123._';
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(passwordToHash, salt);

    if (!user) {
      const res = db.prepare(`
        INSERT INTO users (name, email, password_hash, role, phone, avatar_url, status)
        VALUES (?, ?, ?, 'student', ?, ?, 'active')
      `).run(
        'Krystel Comia',
        email,
        passwordHash,
        '+1 (555) 382-9014',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80'
      );
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(res.lastInsertRowid);
    } else {
      // Ensure existing account has active status and valid password hash for Krystel123._
      const matchesKrystel = bcrypt.compareSync('Krystel123._', user.password_hash) ||
                            bcrypt.compareSync('Krystel123_', user.password_hash);
      if (!matchesKrystel || customPassword) {
        db.prepare("UPDATE users SET password_hash = ?, status = 'active' WHERE id = ?").run(passwordHash, user.id);
        user.password_hash = passwordHash;
      }
    }

    const userId = user.id;

    // 1. Ensure student profile
    const profile = db.prepare('SELECT id FROM student_profiles WHERE user_id = ?').get(userId);
    if (!profile) {
      db.prepare(`
        INSERT INTO student_profiles (user_id, grade_level, school, learning_goals, target_subjects)
        VALUES (?, 'Grade 11 - High School', 'Westlake High School', 'Master AP Calculus BC & Advanced Physics Mechanics, achieve top percentiles in SAT/ACT.', 'Calculus BC, Physics Mechanics, Chemistry, Computer Science')
      `).run(userId);
    }

    // 2. Ensure active subscription
    const sub = db.prepare('SELECT id FROM student_subscriptions WHERE user_id = ?').get(userId);
    if (!sub) {
      db.prepare(`
        INSERT INTO student_subscriptions (
          user_id, plan_name, lessons_total, lessons_remaining, price_paid,
          purchase_date, expires_at, status, is_trial
        ) VALUES (
          ?, '8 Lessons Monthly', 8, 6, 399.00,
          datetime('now', '-3 days'), datetime('now', '+27 days'), 'active', 0
        )
      `).run(userId);
    }

    // 3. Ensure tutoring requests
    const elena = db.prepare("SELECT id FROM users WHERE email = 'elena.vance@aviora.edu'").get();
    const marcus = db.prepare("SELECT id FROM users WHERE email = 'marcus.sterling@aviora.edu'").get();

    const existingReq = db.prepare('SELECT id FROM tutoring_requests WHERE student_id = ?').all(userId);
    if (existingReq.length === 0 && elena && marcus) {
      // Upcoming confirmed session
      db.prepare(`
        INSERT INTO tutoring_requests (
          student_id, tutor_id, subject, grade_level, requested_date,
          requested_time, duration_hours, hourly_rate, total_amount, status, notes, tutor_response_note
        ) VALUES (
          ?, ?, 'Calculus BC', 'Grade 11 - High School', '2026-10-25',
          '14:00', 1.0, 65.0, 65.0, 'accepted',
          'Integration by parts and Taylor series expansions.',
          'I have prepared diagnostic worksheets and step-by-step problem sets for our session.'
        )
      `).run(userId, elena.id);

      // Pending session
      db.prepare(`
        INSERT INTO tutoring_requests (
          student_id, tutor_id, subject, grade_level, requested_date,
          requested_time, duration_hours, hourly_rate, total_amount, status, notes
        ) VALUES (
          ?, ?, 'Physics Mechanics', 'Grade 11 - High School', '2026-10-28',
          '16:00', 1.0, 75.0, 75.0, 'pending',
          'Rotational dynamics and angular momentum review.'
        )
      `).run(userId, marcus.id);

      // Completed session
      const compRes = db.prepare(`
        INSERT INTO tutoring_requests (
          student_id, tutor_id, subject, grade_level, requested_date,
          requested_time, duration_hours, hourly_rate, total_amount, status, notes, tutor_response_note
        ) VALUES (
          ?, ?, 'Calculus BC', 'Grade 11 - High School', '2026-10-18',
          '15:00', 1.0, 65.0, 65.0, 'completed',
          'Limits and continuity foundational review.',
          'Great session! Krystel demonstrated strong algebraic fundamentals.'
        )
      `).run(userId, elena.id);

      // Review for completed session
      db.prepare(`
        INSERT INTO reviews (request_id, student_id, tutor_id, rating, comment)
        VALUES (?, ?, ?, 5, 'Dr. Vance is phenomenal! She explained epsilon-delta proofs and Taylor series with absolute clarity.')
      `).run(compRes.lastInsertRowid, userId, elena.id);
    }

    // 4. Ensure conversation messages
    if (elena) {
      const msg = db.prepare('SELECT id FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)').get(elena.id, userId, userId, elena.id);
      if (!msg) {
        db.prepare(`
          INSERT INTO messages (sender_id, receiver_id, sender_name, sender_email, subject, content, is_read)
          VALUES (?, ?, 'Dr. Elena Vance', 'elena.vance@aviora.edu', 'Welcome to Calculus BC!', 'Hi Krystel, welcome to Aviora Education! I am looking forward to our Calculus BC session. Feel free to message me with any specific questions or textbooks you are using.', 1)
        `).run(elena.id, userId);

        db.prepare(`
          INSERT INTO messages (sender_id, receiver_id, sender_name, sender_email, subject, content, is_read)
          VALUES (?, ?, 'Krystel Comia', 'comiakrystel65@gmail.com', 'Re: Welcome to Calculus BC!', 'Thank you, Dr. Vance! I will have my questions ready on Taylor series and parametric curves.', 1)
        `).run(userId, elena.id);
      }
    }

    // 5. Ensure welcome notification
    const notif = db.prepare('SELECT id FROM notifications WHERE user_id = ?').get(userId);
    if (!notif) {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, is_read, link)
        VALUES (?, 'Welcome to Aviora Education', 'Your student account is active. Manage your tutoring schedule, review past classes, and track your learning milestones on your dashboard.', 'success', 0, '#student-portal')
      `).run(userId);
    }

    // 6. Ensure default preferences
    getUserPreferences(userId);

    return user;
  } catch (err) {
    console.error('Error ensuring Krystel account:', err);
  }
}

function getUserPreferences(userId) {
  try {
    let prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
    if (!prefs) {
      db.prepare(`
        INSERT OR IGNORE INTO user_preferences (user_id, theme, language, font_size, timezone, notif_lessons, notif_calendar, notif_messages, notif_reports)
        VALUES (?, 'light', 'en-US', 'normal', 'America/New_York', 1, 1, 1, 0)
      `).run(userId);
      prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
    }
    return prefs;
  } catch (err) {
    console.error('Error fetching user preferences:', err);
    return {
      user_id: userId,
      theme: 'light',
      language: 'en-US',
      font_size: 'normal',
      timezone: 'America/New_York',
      notif_lessons: 1,
      notif_calendar: 1,
      notif_messages: 1,
      notif_reports: 0
    };
  }
}

function ensureBuddySeedData() {
  try {
    const existing = db.prepare('SELECT id FROM buddy_sessions LIMIT 1').get();
    if (existing) return;

    const elena = db.prepare('SELECT id FROM users WHERE email = ?').get('elena.vance@aviora.edu');
    const lucas = db.prepare('SELECT id FROM users WHERE email = ?').get('student@aviora.edu');
    const sophia = db.prepare('SELECT id FROM users WHERE email = ?').get('sophia.martinez@gmail.com');
    const maya = db.prepare('SELECT id FROM users WHERE email = ?').get('maya.patel@gmail.com');

    if (lucas && sophia && elena) {
      // 1. Tutor-Led Aviora Buddy Session
      const sess1 = db.prepare(`
        INSERT INTO buddy_sessions (
          session_code, session_type, tutor_id, student1_id, student2_id,
          subject, topic, scheduled_date, scheduled_time, fee_per_student, total_fee,
          status, room_status, room_started_at
        ) VALUES (
          'BUDDY-7482', 'tutor_led', ?, ?, ?,
          'AP Calculus BC & Quiz Bee Duel', 'Derivatives, Limits & Math Speed Battle', '2026-10-26', '16:00 - 16:50',
          6.00, 12.00, 'active', 'open', CURRENT_TIMESTAMP
        )
      `).run(elena.id, lucas.id, sophia.id);

      db.prepare(`
        INSERT INTO buddy_messages (session_id, sender_id, sender_name, sender_role, message)
        VALUES (?, ?, 'Dr. Elena Vance', 'tutor', 'Welcome Lucas and Sophia to today’s Aviora Buddy session! We will do a 10-minute derivative review, followed by our Quiz Bee Championship and Equation Duel.')
      `).run(sess1.lastInsertRowid, elena.id);

      db.prepare(`
        INSERT INTO buddy_messages (session_id, sender_id, sender_name, sender_role, message)
        VALUES (?, ?, 'Lucas Taylor', 'student', 'Excited for the Quiz Bee! Ready when you are.')
      `).run(sess1.lastInsertRowid, lucas.id);

      db.prepare(`
        INSERT INTO buddy_messages (session_id, sender_id, sender_name, sender_role, message)
        VALUES (?, ?, 'Sophia Martinez', 'student', 'Let’s do this! Good luck Lucas 🚀')
      `).run(sess1.lastInsertRowid, sophia.id);
    }

    if (lucas && maya) {
      // 2. Peer Study Aviora Buddy Session
      const sess2 = db.prepare(`
        INSERT INTO buddy_sessions (
          session_code, session_type, tutor_id, student1_id, student2_id,
          subject, topic, scheduled_date, scheduled_time, fee_per_student, total_fee,
          status, room_status, room_started_at
        ) VALUES (
          'BUDDY-9134', 'peer_study', NULL, ?, ?,
          'Physics Mechanics & Vocab Sprint', 'Kinematics Equations & Concept Matching', '2026-10-27', '17:00 - 17:50',
          6.00, 12.00, 'active', 'open', CURRENT_TIMESTAMP
        )
      `).run(lucas.id, maya.id);

      db.prepare(`
        INSERT INTO buddy_messages (session_id, sender_id, sender_name, sender_role, message)
        VALUES (?, ?, 'Lucas Taylor', 'student', 'Hey Maya! Ready to tackle the physics kinematics problems together?')
      `).run(sess2.lastInsertRowid, lucas.id);

      db.prepare(`
        INSERT INTO buddy_messages (session_id, sender_id, sender_name, sender_role, message)
        VALUES (?, ?, 'Maya Patel', 'student', 'Hey Lucas! Yes, let’s do the Concept Match tiles first to warm up!')
      `).run(sess2.lastInsertRowid, maya.id);
    }
  } catch (err) {
    console.error('Error seeding buddy sessions:', err);
  }
}

function ensureInquirySeedData() {
  try {
    const existing = db.prepare('SELECT id FROM inquiries LIMIT 1').get();
    if (!existing) {
      const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
      const adminId = adminUser ? adminUser.id : 1;

      db.prepare(`
        INSERT INTO inquiries (name, email, role, subject, message, status, admin_response, responded_at, responded_by, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', NULL, NULL, NULL, datetime('now', '-2 hours'))
      `).run(
        'Maria Santos',
        'maria.santos@gmail.com',
        'Student',
        'AP Calculus BC Mentorship',
        'I am preparing for the AP Calculus BC exam this semester. Can I be paired with Dr. Elena Vance or another Stanford faculty member for twice-weekly 50-minute sessions?'
      );

      db.prepare(`
        INSERT INTO inquiries (name, email, role, subject, message, status, admin_response, responded_at, responded_by, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', NULL, NULL, NULL, datetime('now', '-5 hours'))
      `).run(
        'David Chen',
        'david.chen@outlook.com',
        'Parent / Guardian',
        'Physics Olympiad Diagnostic Prep',
        'My son is a sophomore interested in competitive Olympiad physics. Do you have specialized diagnostic assessment sessions to evaluate his conceptual baseline?'
      );

      db.prepare(`
        INSERT INTO inquiries (name, email, role, subject, message, status, admin_response, responded_at, responded_by, created_at)
        VALUES (?, ?, ?, ?, ?, 'responded', ?, datetime('now', '-1 day'), ?, datetime('now', '-2 days'))
      `).run(
        'Emily Watson',
        'emily.watson@mit.edu',
        'Prospective Tutor',
        'Computer Science Faculty Application',
        'I hold an M.S. in Computer Science from MIT and would like to mentor high school students in Algorithms and Python. How do I expedite transcript review?',
        'Hi Emily, thank you for reaching out to Aviora Education! You can submit your accreditation application directly through our "Become an Aviora Tutor" portal. Our Academic Governance Board audits verified university transcripts within 24-48 hours. We look forward to reviewing your credentials!',
        adminId
      );
    }
  } catch (err) {
    console.error('Error seeding initial inquiries:', err);
  }
}

function ensureTutorSeedData() {
  try {
    const elena = db.prepare("SELECT id FROM users WHERE email = 'elena.vance@aviora.edu'").get();
    const krystel = db.prepare("SELECT id FROM users WHERE email = 'comiakrystel65@gmail.com'").get();
    const lucas = db.prepare("SELECT id FROM users WHERE email = 'student@aviora.edu'").get();
    const sophia = db.prepare("SELECT id FROM users WHERE email = 'sophia.martinez@gmail.com'").get();

    if (!elena) return;

    // 1. Seed Occupied Slots
    const existingOccupied = db.prepare("SELECT id FROM tutor_occupied_slots WHERE tutor_id = ? LIMIT 1").get(elena.id);
    if (!existingOccupied) {
      const occupiedSlots = [
        { day: 'Wednesday', slot: '04:00 PM', reason: 'Department Research & Lab Seminar' },
        { day: 'Friday', slot: '07:00 PM', reason: 'Personal Time / Academic Colloquium' },
        { day: 'Sunday', slot: '09:00 AM', reason: 'Curriculum Planning & Rest' }
      ];
      for (const s of occupiedSlots) {
        db.prepare(`
          INSERT OR IGNORE INTO tutor_occupied_slots (tutor_id, day_of_week, time_slot, reason)
          VALUES (?, ?, ?, ?)
        `).run(elena.id, s.day, s.slot, s.reason);
      }
    }

    // 2. Seed Student Academic Tasks & Grading
    const existingTasks = db.prepare("SELECT id FROM tutor_tasks WHERE tutor_id = ? LIMIT 1").get(elena.id);
    if (!existingTasks && (krystel || lucas)) {
      if (krystel) {
        // Task 1: Graded
        db.prepare(`
          INSERT INTO tutor_tasks (
            tutor_id, student_id, subject, title, description, due_date, status,
            student_submission, submitted_at, grade, feedback, graded_at
          ) VALUES (
            ?, ?, 'Calculus BC', 'Taylor Polynomial Convergence & Error Bounds',
            'Work through Problems 1-8 on Maclaurin expansions for sin(x), e^x, and cos(x). Derive Lagrange error bounds up to n=5.',
            '2026-10-22', 'graded',
            'Completed all 8 problems with derivations. Derived Lagrange bound |R_n(x)| <= M|x|^(n+1)/(n+1)! with M=1 on [-pi, pi]. Scanned PDF attached.',
            datetime('now', '-4 days'), '98/100 (A+)',
            'Outstanding rigor and conceptual clarity! Your derivation of the error bound on Problem 5 was exemplary.',
            datetime('now', '-3 days')
          )
        `).run(elena.id, krystel.id);

        // Task 2: Submitted (Pending Grading)
        db.prepare(`
          INSERT INTO tutor_tasks (
            tutor_id, student_id, subject, title, description, due_date, status,
            student_submission, submitted_at
          ) VALUES (
            ?, ?, 'Calculus BC', 'Integration by Parts Diagnostic Problem Set',
            'Apply tabular integration by parts to evaluate definite integrals with oscillating factors. Show step-by-step reduction formulas.',
            '2026-10-26', 'submitted',
            'Finished all 5 definite integrals. Verified reduction formulas for int(x^n * e^(-x) dx) from 0 to inf. Solution sheet uploaded.',
            datetime('now', '-6 hours')
          )
        `).run(elena.id, krystel.id);

        // Task 3: Assigned (In Progress)
        db.prepare(`
          INSERT INTO tutor_tasks (
            tutor_id, student_id, subject, title, description, due_date, status
          ) VALUES (
            ?, ?, 'Calculus BC', 'Parametric Curves & Arc Length Formulations',
            'Analyze cycloid trajectories and calculate exact arc length between cusps using standard Riemann integration.',
            '2026-10-30', 'assigned'
          )
        `).run(elena.id, krystel.id);
      }

      if (lucas) {
        // Task for Lucas: Graded
        db.prepare(`
          INSERT INTO tutor_tasks (
            tutor_id, student_id, subject, title, description, due_date, status,
            student_submission, submitted_at, grade, feedback, graded_at
          ) VALUES (
            ?, ?, 'Calculus BC', 'Derivatives Optimization Practice Exam',
            'Complete the 6 free-response optimization problems focusing on profit maximization and minimal surface area cylinders.',
            '2026-10-20', 'graded',
            'All critical points derived with first and second derivative tests documented.',
            datetime('now', '-6 days'), '94/100 (A)',
            'Great job using the second derivative test to confirm relative extrema. Keep up the disciplined notation.',
            datetime('now', '-5 days')
          )
        `).run(elena.id, lucas.id);
      }
    }

    // 3. Ensure Historical Monthly Sessions for Rich Earnings Ledger
    if (lucas && sophia) {
      const historicalCheck = db.prepare("SELECT COUNT(*) as count FROM tutoring_requests WHERE tutor_id = ? AND status = 'completed'").get(elena.id);
      if (historicalCheck.count < 4) {
        // September 2026 completed session
        db.prepare(`
          INSERT INTO tutoring_requests (
            student_id, tutor_id, subject, grade_level, requested_date, requested_time,
            duration_hours, hourly_rate, total_amount, status, room_status, created_at
          ) VALUES (
            ?, ?, 'Calculus BC', 'Grade 11 - High School', '2026-09-24', '15:00',
            1.0, 65.0, 65.0, 'completed', 'ended', '2026-09-24 15:00:00'
          )
        `).run(lucas.id, elena.id);

        // September 2026 completed session 2
        db.prepare(`
          INSERT INTO tutoring_requests (
            student_id, tutor_id, subject, grade_level, requested_date, requested_time,
            duration_hours, hourly_rate, total_amount, status, room_status, created_at
          ) VALUES (
            ?, ?, 'Calculus BC', 'Grade 12 - High School', '2026-09-18', '16:30',
            1.5, 65.0, 97.50, 'completed', 'ended', '2026-09-18 16:30:00'
          )
        `).run(sophia.id, elena.id);

        // August 2026 completed session
        db.prepare(`
          INSERT INTO tutoring_requests (
            student_id, tutor_id, subject, grade_level, requested_date, requested_time,
            duration_hours, hourly_rate, total_amount, status, room_status, created_at
          ) VALUES (
            ?, ?, 'Calculus BC', 'Grade 11 - High School', '2026-08-28', '14:00',
            1.0, 65.0, 65.0, 'completed', 'ended', '2026-08-28 14:00:00'
          )
        `).run(lucas.id, elena.id);
      }
    }
  } catch (err) {
    console.error('Error seeding tutor data:', err);
  }
}

// Automatically ensure account and seed data on startup
ensureKrystelAccount();
ensureBuddySeedData();
ensureInquirySeedData();
ensureTutorSeedData();

try {
  db.pragma('wal_checkpoint(TRUNCATE)');
} catch (e) {}

module.exports = {
  db,
  initSchema,
  ensureKrystelAccount,
  ensureBuddySeedData,
  ensureInquirySeedData,
  ensureTutorSeedData,
  getUserPreferences
};

