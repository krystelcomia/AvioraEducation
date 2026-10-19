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
      role TEXT NOT NULL CHECK(role IN ('student', 'teacher', 'admin')),
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
  `);
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

module.exports = {
  db,
  initSchema
};
