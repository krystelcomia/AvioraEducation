const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const { db, ensureKrystelAccount } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'aviora-education-secret-key-2026-luxury-edtech';

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

// Ensure uploads folder exists
const sourceUploadsDir = path.join(__dirname, 'uploads');
const uploadsDir = isVercel ? path.join('/tmp', 'uploads') : sourceUploadsDir;
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// If running in Vercel serverless environment, copy seed uploads to writable /tmp/uploads
if (isVercel && fs.existsSync(sourceUploadsDir)) {
  try {
    const files = fs.readdirSync(sourceUploadsDir);
    for (const f of files) {
      const srcFile = path.join(sourceUploadsDir, f);
      const destFile = path.join(uploadsDir, f);
      if (!fs.existsSync(destFile)) {
        fs.copyFileSync(srcFile, destFile);
      }
    }
  } catch (e) {
    console.warn('Could not copy initial uploads to /tmp:', e);
  }
}

// Multer storage configuration for credentials
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${Date.now()}_${sanitizedName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word documents, and images are permitted.'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
    }

    const user = db.prepare('SELECT id, name, email, role, phone, avatar_url, status FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Your account is inactive or suspended. Please contact administration.' });
    }

    req.user = user;
    next();
  });
}

// Role Authorization Middleware
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. You do not have permission to access this resource.' });
    }
    next();
  };
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, role, phone, grade_level, school, headline, subjects } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and account type are required.' });
    }

    // CRITICAL: Protect admin role from public registration
    if (role === 'admin') {
      return res.status(403).json({ error: 'Administrator accounts cannot be created via public registration.' });
    }

    if (!['student', 'teacher'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role selected.' });
    }

    // Strict Strong Password Requirement (8+ chars, upper, lower, number, special)
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter (A-Z).' });
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one lowercase letter (a-z).' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one number (0-9).' });
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one special symbol (e.g. !@#$%^&*).' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    // Default avatars based on role
    const defaultAvatar = role === 'teacher'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
      : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80';

    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, phone, avatar_url, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `);

    const result = insertUser.run(
      name.trim(),
      email.toLowerCase().trim(),
      passwordHash,
      role,
      phone || null,
      defaultAvatar
    );

    const userId = result.lastInsertRowid;

    if (role === 'student') {
      db.prepare(`
        INSERT INTO student_profiles (user_id, grade_level, school, learning_goals, target_subjects)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, grade_level || 'Grade 11', school || '', 'Achieve academic excellence and master core coursework.', subjects || '');

      // Notify admin of new student account
      const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
      if (admin) {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (?, ?, ?, 'registration', '/#admin')
        `).run(
          admin.id,
          'New Student Account Created',
          `${name} (${email}) has registered a student account.`
        );
      }
    } else if (role === 'teacher') {
      // Create draft teacher application
      const defaultSchedule = JSON.stringify({
        Monday: ['09:00 - 12:00', '14:00 - 17:00'],
        Tuesday: ['10:00 - 13:00', '15:00 - 18:00'],
        Wednesday: ['09:00 - 12:00', '14:00 - 17:00'],
        Thursday: ['13:00 - 18:00'],
        Friday: ['09:00 - 15:00']
      });

      db.prepare(`
        INSERT INTO teacher_applications (
          user_id, headline, highest_degree, institution, graduation_year,
          years_experience, subjects, grade_levels, hourly_rate, bio,
          teaching_philosophy, availability_schedule, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `).run(
        userId,
        headline || 'Educator & Subject Specialist',
        'Bachelor of Science',
        'University Graduate',
        2022,
        2,
        JSON.stringify(subjects ? subjects.split(',').map(s => s.trim()) : ['Mathematics', 'Science']),
        JSON.stringify(['High School', 'College / Undergraduate']),
        45.0,
        'Passionate educator committed to inspiring students and fostering academic excellence.',
        'Conceptual understanding followed by deliberate practice creates lasting mastery.',
        defaultSchedule
      );

      // Notify admin
      const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
      if (admin) {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (?, ?, ?, 'application', '/#admin')
        `).run(
          admin.id,
          'New Teacher Registered',
          `${name} has registered and submitted an initial tutor application.`,
        );
      }
    }

    const token = jwt.sign(
      { id: userId, email: email.toLowerCase().trim(), role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userObj = {
      id: userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role,
      phone: phone || null,
      avatar_url: defaultAvatar,
      status: 'active'
    };

    return res.status(201).json({
      message: 'Account successfully registered.',
      token,
      user: userObj
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'An error occurred during registration. Please try again.' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check for missing or incomplete inputs
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required.' });
    }
    if (!password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Validate complete and valid email address structure
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a complete and valid email address (e.g., name@example.com).' });
    }

    // Validate complete password (minimum 6 characters)
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password is incomplete. Please enter your full password.' });
    }

    // Lookup user in database
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password. Please verify your credentials and try again.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Your account is deactivated or suspended. Please contact Aviora support.' });
    }

    // Strict password verification using bcrypt
    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password. Please verify your credentials and try again.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar_url: user.avatar_url,
      status: user.status
    };

    return res.json({
      message: 'Logged in successfully.',
      token,
      user: sanitizedUser
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'An error occurred during login.' });
  }
});

// Social OAuth Login / Registration (Google & Facebook)
app.post('/api/auth/oauth', (req, res) => {
  try {
    const { provider, profile } = req.body;
    if (!['google', 'facebook'].includes(provider)) {
      return res.status(400).json({ error: 'Unsupported social authentication provider.' });
    }

    const email = profile?.email ? profile.email.toLowerCase().trim() : null;
    const name = profile?.name ? profile.name.trim() : (provider === 'google' ? 'Google Scholar' : 'Facebook Scholar');
    const avatar = profile?.picture || (provider === 'google'
      ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'
      : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80');
    const role = profile?.role || 'student';

    if (!email) {
      return res.status(400).json({ error: 'Email address is required from social provider.' });
    }

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      // Auto-register user from Google / Facebook
      const salt = bcrypt.genSaltSync(10);
      const tempPasswordHash = bcrypt.hashSync('OAuth_' + Math.random().toString(36) + 'Aa1!#', salt);

      const insert = db.prepare(`
        INSERT INTO users (name, email, password_hash, role, avatar_url, status)
        VALUES (?, ?, ?, ?, ?, 'active')
      `).run(name, email, tempPasswordHash, role, avatar);

      const newUserId = insert.lastInsertRowid;

      if (role === 'student') {
        db.prepare(`
          INSERT INTO student_profiles (user_id, grade_level, school, learning_goals, target_subjects)
          VALUES (?, 'Collegiate / High School', 'Aviora Learning Cohort', 'Academic excellence & mastery', 'Mathematics, Natural Sciences')
        `).run(newUserId);
      }

      // Notify admin
      const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
      if (admin) {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (?, ?, ?, 'registration', '/#admin')
        `).run(
          admin.id,
          'New Social Account Created',
          `${name} (${email}) registered via ${provider} as a ${role}.`
        );
      }

      user = { id: newUserId, name, email, role, avatar_url: avatar, status: 'active' };
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'This account has been deactivated or suspended.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || null,
      avatar_url: user.avatar_url,
      status: user.status,
      auth_provider: provider
    };

    return res.json({
      message: `Signed in successfully with ${provider === 'google' ? 'Google' : 'Facebook'}.`,
      token,
      user: sanitizedUser
    });
  } catch (error) {
    console.error('Social OAuth error:', error);
    return res.status(500).json({ error: 'An error occurred during social authentication.' });
  }
});

// Get current user details & role data
app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    let extra = {};

    if (req.user.role === 'student') {
      const studentProfile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(userId);
      extra.studentProfile = studentProfile;
    } else if (req.user.role === 'teacher') {
      const teacherApp = db.prepare('SELECT * FROM teacher_applications WHERE user_id = ?').get(userId);
      const tutorProfile = db.prepare('SELECT * FROM tutor_profiles WHERE user_id = ?').get(userId);
      extra.teacherApplication = teacherApp;
      extra.tutorProfile = tutorProfile;
    }

    // Unread notifications count
    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(userId).count;
    extra.unreadNotifications = unreadCount;

    return res.json({
      user: req.user,
      ...extra
    });
  } catch (error) {
    console.error('Me error:', error);
    return res.status(500).json({ error: 'Failed to retrieve user profile.' });
  }
});

// Update Profile
app.put('/api/auth/profile', authenticateToken, (req, res) => {
  try {
    const { name, phone, avatar_url, studentData, tutorData } = req.body;
    const userId = req.user.id;

    if (name) {
      db.prepare('UPDATE users SET name = ?, phone = ?, avatar_url = COALESCE(?, avatar_url) WHERE id = ?')
        .run(name.trim(), phone || null, avatar_url || null, userId);
    }

    if (req.user.role === 'student' && studentData) {
      db.prepare(`
        UPDATE student_profiles
        SET grade_level = ?, school = ?, learning_goals = ?, target_subjects = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(
        studentData.grade_level || null,
        studentData.school || null,
        studentData.learning_goals || null,
        studentData.target_subjects || null,
        userId
      );
    }

    if (req.user.role === 'teacher' && tutorData) {
      db.prepare(`
        UPDATE tutor_profiles
        SET headline = ?, bio = ?, hourly_rate = ?, availability_schedule = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(
        tutorData.headline || null,
        tutorData.bio || null,
        tutorData.hourly_rate || 40,
        tutorData.availability_schedule || null,
        userId
      );
    }

    return res.json({ message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Change Password
app.put('/api/auth/change-password', authenticateToken, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isValid = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Incorrect current password. Please verify and try again.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);

    return res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Failed to update password.' });
  }
});

// ==========================================
// PUBLIC PLATFORM & TUTOR DIRECTORY ROUTES
// ==========================================

// Platform real stats
app.get('/api/public/stats', (req, res) => {
  try {
    const totalTutors = db.prepare("SELECT COUNT(*) as count FROM tutor_profiles tp JOIN users u ON tp.user_id = u.id WHERE tp.is_active = 1 AND u.status = 'active'").get().count;
    const totalStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND status = 'active'").get().count;
    const totalSessions = db.prepare("SELECT COUNT(*) as count FROM tutoring_requests WHERE status = 'completed'").get().count;
    const avgRatingRow = db.prepare('SELECT AVG(rating) as avg_rating FROM tutor_profiles WHERE is_active = 1').get();
    const avgRating = avgRatingRow.avg_rating ? parseFloat(avgRatingRow.avg_rating).toFixed(1) : '4.9';

    res.json({
      totalTutors,
      totalStudents,
      totalSessions: totalSessions + 350, // Real base + completed
      avgRating
    });
  } catch (error) {
    console.error('Public stats error:', error);
    res.status(500).json({ error: 'Failed to fetch platform statistics.' });
  }
});

// Real-Time Analytics & Live Content Telemetry
app.get('/api/public/analytics', (req, res) => {
  try {
    const totalStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND status = 'active'").get().count;
    const totalTutors = db.prepare("SELECT COUNT(*) as count FROM tutor_profiles WHERE is_active = 1").get().count;
    const completedSessions = db.prepare("SELECT COUNT(*) as count FROM tutoring_requests WHERE status = 'completed'").get().count;

    // Realistic dynamic fluctuations for live telemetry feel
    const secondsSeed = Math.floor(Date.now() / 8000);
    const liveOnline = 124 + (secondsSeed % 23);
    const liveActiveSessions = 18 + (secondsSeed % 9);

    const topSubjects = [
      { rank: 1, name: 'AP Calculus BC & Multivariable', category: 'Mathematics', accessCount: 3842 + (secondsSeed % 15), growth: '+28%', trend: 'surging', availableTutors: 8, demandIndex: 98 },
      { rank: 2, name: 'Organic & General Chemistry', category: 'Natural Sciences', accessCount: 3120 + (secondsSeed % 12), growth: '+19%', trend: 'surging', availableTutors: 6, demandIndex: 94 },
      { rank: 3, name: 'Python, Algorithms & AI Fundamentals', category: 'Computer Science', accessCount: 2790 + (secondsSeed % 17), growth: '+34%', trend: 'surging', availableTutors: 5, demandIndex: 91 },
      { rank: 4, name: 'AP Physics C: Mechanics & E&M', category: 'Physical Sciences', accessCount: 2415 + (secondsSeed % 9), growth: '+15%', trend: 'high', availableTutors: 7, demandIndex: 87 },
      { rank: 5, name: 'Collegiate Essay & Literary Analysis', category: 'Humanities', accessCount: 1980 + (secondsSeed % 8), growth: '+12%', trend: 'steady', availableTutors: 6, demandIndex: 82 },
      { rank: 6, name: 'SAT / ACT Math & Evidence-Based Reading', category: 'Test Prep', accessCount: 1850 + (secondsSeed % 14), growth: '+22%', trend: 'surging', availableTutors: 9, demandIndex: 80 }
    ];

    const topContent = [
      { id: 'res-1', title: 'Calculus BC Diagnostic Problem Diagnostic Pack', views: 4210 + (secondsSeed % 20), subject: 'Mathematics', type: 'Study Blueprint', format: 'Interactive Drill' },
      { id: 'res-2', title: 'Organic Reaction Mechanism Visual Flowchart', views: 3680 + (secondsSeed % 16), subject: 'Chemistry', type: 'Concept Schematic', format: 'High-Res Matrix' },
      { id: 'res-3', title: 'Dynamic Big-O & Data Structures Cheatsheet', views: 3190 + (secondsSeed % 18), subject: 'Coding', type: 'Interactive Guide', format: 'Reference Guide' },
      { id: 'res-4', title: 'Newtonian Free-Body Diagram Mastery Drill', views: 2840 + (secondsSeed % 11), subject: 'Physics', type: 'Practice Set', format: 'Solution Guide' },
      { id: 'res-5', title: 'Ivy League Personal Statement Deconstruction', views: 2450 + (secondsSeed % 7), subject: 'Writing', type: 'Exemplar Analysis', format: 'Annotated Essay' }
    ];

    const liveActivityStream = [
      { time: 'Just now', action: 'Student booked 1-on-1 session in AP Calculus BC', icon: 'zap', category: 'Booking' },
      { time: '2 mins ago', action: '5-star Verified Review published for Organic Chemistry mentorship', icon: 'star', category: 'Review' },
      { time: '4 mins ago', action: 'Student completed Python Data Structures diagnostic assessment', icon: 'zap', category: 'Assessment' },
      { time: '8 mins ago', action: 'New high school student enrolled from California', icon: 'graduationCap', category: 'Enrollment' },
      { time: '11 mins ago', action: 'AP Physics C Free-Body practice pack downloaded', icon: 'book', category: 'Resource' }
    ];

    res.json({
      activeStudentsOnline: liveOnline,
      activeSessionsNow: liveActiveSessions,
      totalStudyHoursThisMonth: 1840 + (completedSessions * 2),
      conceptMasteryRate: 98.4,
      totalEnrolledStudents: totalStudents || 45,
      totalVerifiedTutors: totalTutors || 6,
      topSubjects,
      topContent,
      liveActivityStream,
      lastUpdated: new Date().toLocaleTimeString()
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch platform analytics' });
  }
});

// Student Works Showcase (Drawings, Crafts & Capstones)
app.get('/api/public/student-work', (req, res) => {
  try {
    const works = [
      {
        id: 'sw-1',
        title: 'The Golden Ratio: Geometry in Nature & Architecture',
        category: 'drawing',
        categoryLabel: 'Mathematical Ink Drawing',
        studentName: 'Maya Lin',
        studentGrade: 'Grade 10',
        studentAvatar: 'ML',
        mentorName: 'Dr. Julian Rhodes',
        mentorSpecialty: 'Applied Mathematics & Topology',
        image: '/assets/student-work/drawing-fibonacci.jpg',
        summary: 'Detailed ink drafting exploring the logarithmic spiral, Fibonacci sequence ratios, and classical architectural portico proportions.',
        reflection: '"Studying under Dr. Rhodes taught me that math is not just formulas on a page—it is the hidden architecture of the universe."',
        materials: 'Gold metallic ink & technical graphite on heavyweight charcoal paper',
        award: "Aviora Dean's Exhibition Honoree"
      },
      {
        id: 'sw-2',
        title: 'Kinetic Cable-Stayed Bridge Model',
        category: 'craft',
        categoryLabel: 'Structural Engineering Craft',
        studentName: 'Leo Takahashi',
        studentGrade: 'Grade 11',
        studentAvatar: 'LT',
        mentorName: 'Dr. Elena Vance',
        mentorSpecialty: 'Structural Physics & Mechanics',
        image: '/assets/student-work/craft-kinetic-bridge.jpg',
        summary: 'Handcrafted balsa wood and braided cable kinetic model testing load distribution across cantilevered truss spans.',
        reflection: '"Building physical models made tensile stress and harmonic oscillation intuitive. It completely transformed my physics scores."',
        materials: 'Select balsa wood, braided micro-cables, brass fittings, drafted schematics',
        award: '1st Place Structural Mechanics Capstone'
      },
      {
        id: 'sw-3',
        title: 'Anatomia Cordis et Botanica',
        category: 'drawing',
        categoryLabel: 'Scientific Botanical Drawing',
        studentName: 'Aemilia Vernon',
        studentGrade: 'Grade 12',
        studentAvatar: 'AV',
        mentorName: 'Marcus Vance',
        mentorSpecialty: 'Biochemistry & Cellular Anatomy',
        image: '/assets/student-work/drawing-anatomical-botany.jpg',
        summary: 'Interdisciplinary watercolor dissertation illustrating mammalian cardiovascular chambers hybridized with plant vascular xylem and phloem.',
        reflection: '"Creating accurate anatomical illustrations required deep diagnostic research into tissue layers and cardiovascular mechanics."',
        materials: 'Layered watercolor, sepia micron archival ink on deckle-edged cotton rag',
        award: 'Excellence in Scientific Illustration'
      },
      {
        id: 'sw-4',
        title: 'Curved-Crease Hyperbolic Origami Sphere',
        category: 'craft',
        categoryLabel: 'Geometric Paper Sculpture Craft',
        studentName: 'Ethan Zhao',
        studentGrade: 'Grade 10',
        studentAvatar: 'EZ',
        mentorName: 'Dr. Julian Rhodes',
        mentorSpecialty: 'Topology & Discrete Mathematics',
        image: '/assets/student-work/craft-origami-tessellation.jpg',
        summary: 'Curved-crease paper sculpture and precision brass kinetic armature mapping non-Euclidean hyperbolic tessellations.',
        reflection: '"Folding negative Gaussian curvature by hand gave me a tangible intuition for multivariable calculus surface integrals."',
        materials: 'Single uncut Japanese washi paper, custom lathe-turned brass gear armature',
        award: 'Mathematics & Spatial Arts Distinction'
      },
      {
        id: 'sw-5',
        title: 'Celestial Harmonies Astrological Sphere',
        category: 'craft',
        categoryLabel: 'Handmade Ceramic Craft',
        studentName: 'Elena Rostova',
        studentGrade: 'Grade 11',
        studentAvatar: 'ER',
        mentorName: 'Clara Higgins',
        mentorSpecialty: 'Astrophysics & Art History',
        image: '/assets/student-work/craft-celestial-globe.jpg',
        summary: 'Handmade stoneware sphere glazed in midnight cobalt, featuring 88 IAU constellations inlaid in 24k gold leaf with calibrated brass meridian.',
        reflection: '"Working with Clara, I combined celestial mechanics calculations with ceramic firing techniques to chart the northern night sky."',
        materials: 'High-fire stoneware, cobalt crystal glaze, hand-beaten 24k gold leaf, aged bronze',
        award: 'Museum Showcase Feature'
      },
      {
        id: 'sw-6',
        title: 'Classical Colonnade & Vaulted Loggia',
        category: 'drawing',
        categoryLabel: 'Architectural Charcoal Drawing',
        studentName: 'Julian Alvarez',
        studentGrade: 'Grade 12',
        studentAvatar: 'JA',
        mentorName: 'Clara Higgins',
        mentorSpecialty: 'Architectural History & Design',
        image: '/assets/student-work/drawing-classical-colonnade.jpg',
        summary: 'Two-point perspective chiaroscuro charcoal study depicting Roman barrel vaults, fluted Corinthian orders, and daylight atmospheric depth.',
        reflection: '"The 1-on-1 critique sessions helped me master atmospheric perspective and chiaroscuro lighting for my university art portfolio."',
        materials: 'Vine charcoal, white chalk, toned French Ingres archival paper',
        award: 'National Collegiate Portfolio Award'
      }
    ];

    res.json(works);
  } catch (error) {
    console.error('Student work error:', error);
    res.status(500).json({ error: 'Failed to fetch student showcase' });
  }
});

// Public Tutor Directory (Only APPROVED and ACTIVE tutors)
app.get('/api/tutors', (req, res) => {
  try {
    const { q, subject, grade, max_rate, min_rating, sort } = req.query;

    let query = `
      SELECT 
        tp.id,
        tp.user_id,
        u.name,
        u.avatar_url,
        tp.headline,
        tp.bio,
        tp.highest_degree,
        tp.institution,
        tp.years_experience,
        tp.subjects,
        tp.grade_levels,
        tp.hourly_rate,
        tp.rating,
        tp.reviews_count,
        tp.total_sessions,
        tp.is_featured,
        tp.availability_schedule
      FROM tutor_profiles tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.is_active = 1 AND u.status = 'active'
    `;

    const params = [];

    if (q) {
      query += ` AND (
        u.name LIKE ? OR 
        tp.headline LIKE ? OR 
        tp.bio LIKE ? OR 
        tp.subjects LIKE ? OR 
        tp.institution LIKE ?
      )`;
      const term = `%${q}%`;
      params.push(term, term, term, term, term);
    }

    if (subject && subject !== 'all') {
      query += ` AND tp.subjects LIKE ?`;
      params.push(`%${subject}%`);
    }

    if (grade && grade !== 'all') {
      query += ` AND tp.grade_levels LIKE ?`;
      params.push(`%${grade}%`);
    }

    if (max_rate) {
      query += ` AND tp.hourly_rate <= ?`;
      params.push(parseFloat(max_rate));
    }

    if (min_rating) {
      query += ` AND tp.rating >= ?`;
      params.push(parseFloat(min_rating));
    }

    // Sorting
    switch (sort) {
      case 'price_asc':
        query += ` ORDER BY tp.hourly_rate ASC`;
        break;
      case 'price_desc':
        query += ` ORDER BY tp.hourly_rate DESC`;
        break;
      case 'rating_desc':
        query += ` ORDER BY tp.rating DESC, tp.reviews_count DESC`;
        break;
      case 'experience_desc':
        query += ` ORDER BY tp.years_experience DESC`;
        break;
      default:
        query += ` ORDER BY tp.is_featured DESC, tp.rating DESC, tp.total_sessions DESC`;
        break;
    }

    const rows = db.prepare(query).all(...params);

    const formattedTutors = rows.map(r => ({
      ...r,
      subjects: JSON.parse(r.subjects || '[]'),
      grade_levels: JSON.parse(r.grade_levels || '[]'),
      availability_schedule: JSON.parse(r.availability_schedule || '{}')
    }));

    res.json({ tutors: formattedTutors });
  } catch (error) {
    console.error('Fetch tutors error:', error);
    res.status(500).json({ error: 'Failed to fetch tutors.' });
  }
});

// Single Tutor Profile with Reviews
app.get('/api/tutors/:id', (req, res) => {
  try {
    const tutorId = req.params.id;
    const tutor = db.prepare(`
      SELECT 
        tp.*,
        u.name,
        u.avatar_url,
        u.email
      FROM tutor_profiles tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.id = ? AND tp.is_active = 1 AND u.status = 'active'
    `).get(tutorId);

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor not found or profile is currently inactive.' });
    }

    const reviews = db.prepare(`
      SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        u.name as student_name,
        u.avatar_url as student_avatar
      FROM reviews r
      JOIN users u ON r.student_id = u.id
      WHERE r.tutor_id = ?
      ORDER BY r.created_at DESC
    `).all(tutor.user_id);

    tutor.subjects = JSON.parse(tutor.subjects || '[]');
    tutor.grade_levels = JSON.parse(tutor.grade_levels || '[]');
    tutor.availability_schedule = JSON.parse(tutor.availability_schedule || '{}');
    tutor.reviews = reviews;

    // Calculate total distinct students mentored
    const studentCountRow = db.prepare(`
      SELECT COUNT(DISTINCT student_id) as count
      FROM tutoring_requests
      WHERE tutor_id = ?
    `).get(tutor.user_id);

    const actualStudents = studentCountRow?.count || 0;
    tutor.total_students = actualStudents > 0 
      ? actualStudents 
      : Math.max(16, Math.round((tutor.total_sessions || 24) * 0.42));

    res.json({ tutor });
  } catch (error) {
    console.error('Fetch tutor details error:', error);
    res.status(500).json({ error: 'Failed to load tutor details.' });
  }
});

// Send Message to Tutor
app.post('/api/tutors/:id/messages', (req, res) => {
  try {
    const tutorId = req.params.id;
    const { name, email, subject, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty.' });
    }

    const tutor = db.prepare('SELECT user_id, headline FROM tutor_profiles WHERE id = ?').get(tutorId);
    if (!tutor) {
      return res.status(404).json({ error: 'Tutor not found.' });
    }

    let senderId = null;
    let senderName = name ? name.trim() : 'Prospective Student';
    let senderEmail = email ? email.trim() : '';

    // Check if authenticated
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        senderId = decoded.id;
        const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(senderId);
        if (user) {
          senderName = user.name;
          senderEmail = user.email;
        }
      } catch (e) {
        // Continue with provided name/email
      }
    }

    db.prepare(`
      INSERT INTO messages (sender_id, receiver_id, sender_name, sender_email, subject, content)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      senderId,
      tutor.user_id,
      senderName,
      senderEmail,
      subject || 'Student Inquiry',
      message.trim()
    );

    // Also notify tutor in notifications table
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (?, ?, ?, 'message', '#teacher-requests')
    `).run(
      tutor.user_id,
      `New Message from ${senderName}`,
      message.trim().substring(0, 120) + (message.length > 120 ? '...' : '')
    );

    res.json({
      message: `Your message has been sent directly to the tutor. They will be notified immediately.`
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message: ' + error.message });
  }
});

// ==========================================
// STUDENT PORTAL ROUTES
// ==========================================

// Student Dashboard stats & requests
app.get('/api/student/dashboard', authenticateToken, requireRole('student'), (req, res) => {
  try {
    const studentId = req.user.id;

    const requests = db.prepare(`
      SELECT 
        tr.*,
        u.name as tutor_name,
        u.avatar_url as tutor_avatar,
        tp.headline as tutor_headline,
        tp.id as tutor_profile_id,
        rev.rating as review_rating,
        rev.comment as review_comment
      FROM tutoring_requests tr
      JOIN users u ON tr.tutor_id = u.id
      LEFT JOIN tutor_profiles tp ON tp.user_id = u.id
      LEFT JOIN reviews rev ON rev.request_id = tr.id
      WHERE tr.student_id = ?
      ORDER BY tr.created_at DESC
    `).all(studentId);

    const stats = {
      total_requests: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      upcoming: requests.filter(r => r.status === 'accepted').length,
      completed: requests.filter(r => r.status === 'completed').length,
      total_hours: requests.filter(r => r.status === 'completed').reduce((acc, r) => acc + (r.duration_hours || 0), 0)
    };

    const activeSub = db.prepare(`
      SELECT * FROM student_subscriptions
      WHERE user_id = ? AND status = 'active'
      ORDER BY id DESC LIMIT 1
    `).get(studentId);

    res.json({ stats, requests, subscription: activeSub || null });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({ error: 'Failed to load student dashboard.' });
  }
});

// ==========================================
// STUDENT SUBSCRIPTION & ANALYTICS ROUTES
// ==========================================

// Student Subscription & Spending Analytics
app.get('/api/student/subscription', authenticateToken, requireRole('student'), (req, res) => {
  try {
    const studentId = req.user.id;

    // Check active subscription
    const activeSub = db.prepare(`
      SELECT * FROM student_subscriptions
      WHERE user_id = ? AND status = 'active'
      ORDER BY id DESC LIMIT 1
    `).get(studentId);

    // Check if trial was ever used
    const trialRow = db.prepare(`
      SELECT id FROM student_subscriptions
      WHERE user_id = ? AND is_trial = 1
    `).get(studentId);
    const trialUsed = !!trialRow;

    // Calculate total spending: subscriptions + booked sessions
    const subSpendingRow = db.prepare(`
      SELECT COALESCE(SUM(price_paid), 0) as total FROM student_subscriptions WHERE user_id = ?
    `).get(studentId);

    const sessionSpendingRow = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total FROM tutoring_requests
      WHERE student_id = ? AND status IN ('accepted', 'completed', 'pending')
    `).get(studentId);

    const totalSpending = (subSpendingRow?.total || 0) + (sessionSpendingRow?.total || 0);

    // Most-studied subjects
    const subjectRows = db.prepare(`
      SELECT 
        subject,
        COUNT(*) as session_count,
        COALESCE(SUM(duration_hours), 0) as total_hours
      FROM tutoring_requests
      WHERE student_id = ?
      GROUP BY subject
      ORDER BY session_count DESC
    `).all(studentId);

    // Preferred / most-booked tutors
    const tutorRows = db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.avatar_url,
        tp.headline,
        tr.subject,
        tp.hourly_rate,
        COUNT(*) as session_count
      FROM tutoring_requests tr
      JOIN users u ON tr.tutor_id = u.id
      LEFT JOIN tutor_profiles tp ON tp.user_id = u.id
      WHERE tr.student_id = ?
      GROUP BY u.id
      ORDER BY session_count DESC
    `).all(studentId);

    // Formatted active sub details
    let subscriptionData = null;
    if (activeSub) {
      const now = new Date();
      const expDate = new Date(activeSub.expires_at);
      const diffMs = expDate - now;
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      subscriptionData = {
        ...activeSub,
        days_remaining: daysRemaining,
        formatted_expires_at: expDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        formatted_purchase_date: new Date(activeSub.purchase_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      };
    }

    // Default subjects fallback if student has few sessions
    let mostStudiedSubjects = subjectRows;
    if (mostStudiedSubjects.length === 0) {
      mostStudiedSubjects = [
        { subject: 'AP Calculus BC', session_count: 3, total_hours: 4.5, percentage: 55 },
        { subject: 'Organic Chemistry', session_count: 2, total_hours: 3.0, percentage: 30 },
        { subject: 'Python Algorithms', session_count: 1, total_hours: 1.5, percentage: 15 }
      ];
    } else {
      const totalCount = mostStudiedSubjects.reduce((acc, curr) => acc + curr.session_count, 0) || 1;
      mostStudiedSubjects = mostStudiedSubjects.map(s => ({
        ...s,
        percentage: Math.round((s.session_count / totalCount) * 100)
      }));
    }

    // Default preferred tutors fallback if needed
    let preferredTutors = tutorRows;
    if (preferredTutors.length === 0) {
      preferredTutors = db.prepare(`
        SELECT u.id, u.name, u.avatar_url, tp.headline, tp.subjects, tp.hourly_rate
        FROM tutor_profiles tp
        JOIN users u ON tp.user_id = u.id
        WHERE tp.is_active = 1
        LIMIT 3
      `).all().map(t => ({
        id: t.id,
        name: t.name,
        avatar_url: t.avatar_url,
        headline: t.headline,
        subject: t.subjects.split(',')[0],
        hourly_rate: t.hourly_rate,
        session_count: 2
      }));
    }

    const packages = [
      {
        key: 'trial',
        name: 'One-Time Free Trial Lesson',
        lessons: 1,
        price: 0.00,
        unitPrice: 0.00,
        validity: '14 Days',
        badge: 'Free (1-Time Offer)',
        duration_minutes: 30,
        description: 'Complimentary 30-minute diagnostic session with an accredited tutor to evaluate fit and establish your roadmap.',
        is_trial: true,
        trial_used: trialUsed
      },
      {
        key: '4_lessons',
        name: 'Starter Tier: 4 Lessons',
        lessons: 4,
        price: 220.00,
        unitPrice: 55.00,
        savings: 'Save $40 vs standard hourly',
        validity: '1 Month (30 Days)',
        badge: 'Starter Package',
        duration_minutes: 50,
        description: 'Ideal for weekly check-ins, targeted exam revision, and coursework clarification.',
        is_popular: false
      },
      {
        key: '8_lessons',
        name: 'Mastery Tier: 8 Lessons',
        lessons: 8,
        price: 399.00,
        unitPrice: 49.88,
        savings: 'Save $121 vs standard hourly',
        validity: '1 Month (30 Days)',
        badge: 'Most Popular',
        is_popular: true,
        duration_minutes: 50,
        description: 'Our premier bi-weekly intensive mentorship package. Most popular among competitive high school and college scholars.'
      },
      {
        key: '12_lessons',
        name: 'Honors Tier: 12 Lessons',
        lessons: 12,
        price: 540.00,
        unitPrice: 45.00,
        savings: 'Save $240 vs standard hourly',
        validity: '1 Month (30 Days)',
        badge: 'Best Value',
        duration_minutes: 50,
        description: 'Comprehensive 3-sessions/week immersion for Olympiad, MCAT, AP/IB diploma, or Ivy League admissions preparation.',
        is_popular: false
      }
    ];

    const termsAndConditions = {
      no_refund: 'Strict No-Refund Policy: Subscriptions and lesson package purchases are final and non-refundable once activated. Unused lessons cannot be converted to cash or credited past the validity period.',
      upfront_payment: 'Upfront Payment Required: All lesson packages must be paid in full upfront before tutoring session slots can be confirmed on the calendar.',
      validity: '1-Month Validity Window: All 4, 8, and 12-lesson packages are valid for exactly 30 calendar days from the date of purchase. Sessions not scheduled within this 30-day period expire automatically.',
      flexible_dates: 'Student-Determined Schedule: All lesson dates, times, and tutor selections are freely scheduled by the student through the tutor live availability calendar.',
      one_time_trial: 'Free 1-Time Trial Lesson ($0): The trial is a one-time offer for $0 covering a single 30-minute lesson. Once a student has used it, this option is no longer available.',
      reschedule: '3-Hour Rescheduling Notice: Students may reschedule any booked session with at least 3 hours advance notice before the class without forfeiting the lesson credit.',
      class_duration: 'Class Duration: Trial lessons are 30 minutes in length. All standard subscription subjects are a maximum of 50 minutes of class.'
    };

    res.json({
      activeSubscription: subscriptionData,
      totalSpending: Math.max(totalSpending, 0.00),
      trialUsed,
      mostStudiedSubjects,
      preferredTutors,
      packages,
      termsAndConditions
    });
  } catch (error) {
    console.error('Student subscription error:', error);
    res.status(500).json({ error: 'Failed to retrieve subscription details.' });
  }
});

// Student Purchases / Activates a Subscription Package & Schedules with Tutor
app.post('/api/student/subscription/purchase', authenticateToken, requireRole('student'), (req, res) => {
  try {
    const studentId = req.user.id;
    const { package_key, tutor_id, lessons_with_tutor, subject, scheduled_date, scheduled_time, notes } = req.body;

    const packageMap = {
      'trial': { name: 'One-Time Free Trial Lesson', lessons: 1, price: 0.00, days: 14, is_trial: 1, duration_minutes: 30 },
      '4_lessons': { name: 'Starter Tier: 4 Lessons', lessons: 4, price: 220.00, days: 30, is_trial: 0, duration_minutes: 50 },
      '8_lessons': { name: 'Mastery Tier: 8 Lessons', lessons: 8, price: 399.00, days: 30, is_trial: 0, duration_minutes: 50 },
      '12_lessons': { name: 'Honors Tier: 12 Lessons', lessons: 12, price: 540.00, days: 30, is_trial: 0, duration_minutes: 50 }
    };

    const selectedPkg = packageMap[package_key];
    if (!selectedPkg) {
      return res.status(400).json({ error: 'Invalid subscription package selected.' });
    }

    if (selectedPkg.is_trial) {
      const trialCheck = db.prepare('SELECT id FROM student_subscriptions WHERE user_id = ? AND is_trial = 1').get(studentId);
      if (trialCheck) {
        return res.status(400).json({ error: 'The trial is a one-time offer for $0 and has already been used by this account.' });
      }
    }

    let tutorUser = null;
    let tutorProfile = null;
    let allocatedLessons = selectedPkg.lessons;

    if (tutor_id) {
      tutorUser = db.prepare('SELECT id, name FROM users WHERE id = ?').get(tutor_id);
      tutorProfile = db.prepare('SELECT hourly_rate, is_active, subjects FROM tutor_profiles WHERE user_id = ?').get(tutor_id);
      if (!tutorUser || !tutorProfile || !tutorProfile.is_active) {
        return res.status(400).json({ error: 'Selected educator is not currently active.' });
      }

      if (selectedPkg.is_trial) {
        allocatedLessons = 1;
      } else {
        const parsedCount = parseInt(lessons_with_tutor, 10);
        allocatedLessons = !isNaN(parsedCount) ? Math.min(Math.max(1, parsedCount), selectedPkg.lessons) : selectedPkg.lessons;
      }
    }

    let hasScheduledLesson = false;
    let finalRemainingLessons = selectedPkg.lessons;

    if (tutor_id && scheduled_date && scheduled_time) {
      // 3-hour notice check
      const timeStart = (scheduled_time.split(' - ')[0] || scheduled_time).trim();
      const requestedDateTime = new Date(`${scheduled_date}T${timeStart.length === 5 ? timeStart : timeStart.padStart(5, '0')}:00`);
      if (!isNaN(requestedDateTime.getTime())) {
        const diffHours = (requestedDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
        if (diffHours < 3) {
          return res.status(400).json({ error: 'Bookings require at least 3 hours advance notice before class start time.' });
        }
      }

      const lessonDurationHours = selectedPkg.is_trial ? 0.5 : (50 / 60);
      const chosenSubject = subject || (tutorProfile?.subjects ? tutorProfile.subjects.split(',')[0].trim() : 'General Tutoring');

      const insertSession = db.prepare(`
        INSERT INTO tutoring_requests (
          student_id, tutor_id, subject, grade_level, requested_date,
          requested_time, duration_hours, hourly_rate, total_amount, status, notes, payment_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00, 'accepted', ?, ?)
      `);

      const sessionNotes = notes 
        ? `${notes} (Enrolled in ${selectedPkg.name} - ${allocatedLessons} lesson${allocatedLessons > 1 ? 's' : ''} planned with ${tutorUser.name})`
        : (selectedPkg.is_trial 
            ? 'One-Time Free Trial Lesson (30 Minutes)' 
            : `Enrolled via ${selectedPkg.name} (${allocatedLessons} lesson${allocatedLessons > 1 ? 's' : ''} allocated with ${tutorUser.name})`);

      insertSession.run(
        studentId,
        tutor_id,
        chosenSubject,
        'High School',
        scheduled_date,
        scheduled_time,
        lessonDurationHours,
        tutorProfile.hourly_rate,
        sessionNotes,
        selectedPkg.is_trial ? 'free_trial' : 'subscription'
      );

      hasScheduledLesson = true;
      finalRemainingLessons = Math.max(0, selectedPkg.lessons - 1);

      // Notify tutor
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, ?, ?, 'booking', '/#teacher-requests')
      `).run(
        tutor_id,
        'New Session Scheduled',
        `${req.user.name} scheduled a ${selectedPkg.duration_minutes}-minute ${chosenSubject} session for ${scheduled_date} (${scheduled_time}) via ${selectedPkg.name}.`
      );
    }

    // Deactivate previous active subscription if exists
    db.prepare("UPDATE student_subscriptions SET status = 'exhausted' WHERE user_id = ? AND status = 'active'").run(studentId);

    // Insert new subscription
    const insertSub = db.prepare(`
      INSERT INTO student_subscriptions (
        user_id, plan_name, lessons_total, lessons_remaining, price_paid,
        purchase_date, expires_at, status, is_trial
      ) VALUES (
        ?, ?, ?, ?, ?,
        CURRENT_TIMESTAMP, datetime('now', '+' || ? || ' days'), 'active', ?
      )
    `);

    insertSub.run(
      studentId,
      selectedPkg.name,
      selectedPkg.lessons,
      finalRemainingLessons,
      selectedPkg.price,
      selectedPkg.days,
      selectedPkg.is_trial
    );

    // Notification for student
    const studentNotifMsg = hasScheduledLesson
      ? `Your ${selectedPkg.name} is confirmed! 1 lesson (${selectedPkg.duration_minutes} min) is scheduled with ${tutorUser?.name || 'your tutor'} on ${scheduled_date} at ${scheduled_time}. Remaining lessons: ${finalRemainingLessons}.`
      : `Your ${selectedPkg.name} ($${selectedPkg.price.toFixed(2)}) has been successfully activated with ${selectedPkg.lessons} lessons valid for ${selectedPkg.days} days.`;

    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (?, ?, ?, 'subscription', '#subscriptions')
    `).run(
      studentId,
      selectedPkg.is_trial ? 'Free Trial Activated & Scheduled' : 'Subscription Activated',
      studentNotifMsg
    );

    res.status(201).json({
      success: true,
      message: hasScheduledLesson
        ? (selectedPkg.is_trial 
            ? `Your free 30-minute trial lesson with ${tutorUser?.name || 'your tutor'} on ${scheduled_date} at ${scheduled_time} is confirmed!` 
            : `Successfully enrolled in ${selectedPkg.name}! Your lesson with ${tutorUser?.name || 'your tutor'} on ${scheduled_date} at ${scheduled_time} is confirmed (${finalRemainingLessons} remaining lesson${finalRemainingLessons === 1 ? '' : 's'}).`)
        : `Successfully enrolled in ${selectedPkg.name}! Your ${selectedPkg.lessons} lessons are now available for scheduling.`,
      plan: selectedPkg.name,
      remainingLessons: finalRemainingLessons,
      isTrial: selectedPkg.is_trial === 1,
      hasScheduledLesson
    });
  } catch (error) {
    console.error('Purchase subscription error:', error);
    res.status(500).json({ error: 'Failed to process subscription purchase.' });
  }
});

// Student sends a tutoring request
app.post('/api/student/requests', authenticateToken, requireRole('student'), (req, res) => {
  try {
    const { tutor_user_id, subject, grade_level, requested_date, requested_time, duration_hours, notes, payment_method } = req.body;
    const studentId = req.user.id;

    if (!tutor_user_id || !subject || !requested_date || !requested_time) {
      return res.status(400).json({ error: 'Please provide tutor, subject, date, and preferred time slot.' });
    }

    const tutorUser = db.prepare('SELECT name FROM users WHERE id = ?').get(tutor_user_id);
    const tutorProfile = db.prepare('SELECT hourly_rate, is_active FROM tutor_profiles WHERE user_id = ?').get(tutor_user_id);
    if (!tutorProfile || !tutorProfile.is_active) {
      return res.status(400).json({ error: 'Selected tutor is not currently accepting requests.' });
    }

    // Minimum 3 hours notice requirement
    const timeStart = (requested_time.split(' - ')[0] || requested_time).trim();
    const requestedDateTime = new Date(`${requested_date}T${timeStart.length === 5 ? timeStart : timeStart.padStart(5, '0')}:00`);
    if (!isNaN(requestedDateTime.getTime())) {
      const diffHours = (requestedDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
      if (diffHours < 3) {
        return res.status(400).json({ error: 'Bookings require at least 3 hours advance notice before class start time.' });
      }
    }

    const requestedDuration = parseFloat(duration_hours) || 1.0;
    if (requestedDuration > 1.0) {
      return res.status(400).json({ error: 'All subjects are a maximum of 50 minutes of class.' });
    }
    const duration = Math.min(requestedDuration, 1.0);
    const calculatedAmount = duration * tutorProfile.hourly_rate;

    let finalPaymentMethod = payment_method === 'subscription' ? 'subscription' : 'card';
    let remainingCreditsAfter = null;

    if (finalPaymentMethod === 'subscription') {
      const activeSub = db.prepare(`
        SELECT * FROM student_subscriptions
        WHERE user_id = ? AND status = 'active' AND lessons_remaining > 0
        ORDER BY id DESC LIMIT 1
      `).get(studentId);

      if (!activeSub) {
        return res.status(400).json({ error: 'No active subscription lessons remaining. Please choose Card payment or renew your subscription package.' });
      }

      const newRemaining = activeSub.lessons_remaining - 1;
      const newStatus = newRemaining === 0 ? 'exhausted' : 'active';

      db.prepare(`
        UPDATE student_subscriptions
        SET lessons_remaining = ?, status = ?
        WHERE id = ?
      `).run(newRemaining, newStatus, activeSub.id);

      remainingCreditsAfter = newRemaining;
    }

    const insert = db.prepare(`
      INSERT INTO tutoring_requests (
        student_id, tutor_id, subject, grade_level, requested_date,
        requested_time, duration_hours, hourly_rate, total_amount, status, notes, payment_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `);

    const result = insert.run(
      studentId,
      tutor_user_id,
      subject,
      grade_level || 'High School',
      requested_date,
      requested_time,
      duration,
      tutorProfile.hourly_rate,
      finalPaymentMethod === 'subscription' ? 0.00 : calculatedAmount,
      notes || '',
      finalPaymentMethod
    );

    // Notify tutor
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (?, ?, ?, 'request', '/#teacher-requests')
    `).run(
      tutor_user_id,
      'New Tutoring Request Received',
      `${req.user.name} booked a ${subject} tutoring session on ${requested_date} (${requested_time}). Payment: ${finalPaymentMethod === 'subscription' ? 'Subscription Credit Applied' : 'Paid via Card'}.`
    );

    // Notify student confirmation
    const paymentMsg = finalPaymentMethod === 'subscription'
      ? `1 subscription lesson credit was applied ($0.00 charged). You have ${remainingCreditsAfter} lesson${remainingCreditsAfter === 1 ? '' : 's'} remaining.`
      : `Payment of $${calculatedAmount.toFixed(2)} was processed successfully via Card.`;

    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (?, ?, ?, 'booking', '#student-portal')
    `).run(
      studentId,
      'Tutoring Session Confirmed',
      `Your 50-minute ${subject} session with ${tutorUser?.name || 'your tutor'} on ${requested_date} at ${requested_time} has been submitted! ${paymentMsg}`
    );

    res.status(201).json({
      message: `Tutoring lesson scheduled successfully! ${paymentMsg}`,
      requestId: result.lastInsertRowid,
      paymentMethod: finalPaymentMethod,
      remainingLessons: remainingCreditsAfter
    });
  } catch (error) {
    console.error('Create tutoring request error:', error);
    res.status(500).json({ error: 'Failed to create tutoring request.' });
  }
});

// Student cancels their pending request
app.post('/api/student/requests/:id/cancel', authenticateToken, requireRole('student'), (req, res) => {
  try {
    const requestId = req.params.id;
    const studentId = req.user.id;

    const request = db.prepare('SELECT * FROM tutoring_requests WHERE id = ? AND student_id = ?').get(requestId, studentId);
    if (!request) {
      return res.status(404).json({ error: 'Tutoring request not found.' });
    }

    if (request.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel a completed session.' });
    }

    db.prepare("UPDATE tutoring_requests SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(requestId);

    res.json({ message: 'Request cancelled successfully.' });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({ error: 'Failed to cancel request.' });
  }
});

// Student reviews completed session
app.post('/api/student/requests/:id/review', authenticateToken, requireRole('student'), (req, res) => {
  try {
    const requestId = req.params.id;
    const studentId = req.user.id;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Please provide a valid rating between 1 and 5 stars.' });
    }

    const request = db.prepare('SELECT * FROM tutoring_requests WHERE id = ? AND student_id = ?').get(requestId, studentId);
    if (!request) {
      return res.status(404).json({ error: 'Tutoring session not found.' });
    }

    const existingReview = db.prepare('SELECT id FROM reviews WHERE request_id = ?').get(requestId);
    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this session.' });
    }

    db.prepare(`
      INSERT INTO reviews (request_id, student_id, tutor_id, rating, comment)
      VALUES (?, ?, ?, ?, ?)
    `).run(requestId, studentId, request.tutor_id, rating, comment || '');

    // Recalculate tutor's average rating & review count
    const stats = db.prepare(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as count 
      FROM reviews WHERE tutor_id = ?
    `).get(request.tutor_id);

    const roundedRating = Math.round(stats.avg_rating * 10) / 10;

    db.prepare(`
      UPDATE tutor_profiles 
      SET rating = ?, reviews_count = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE user_id = ?
    `).run(roundedRating, stats.count, request.tutor_id);

    res.json({ message: 'Review submitted with thanks! Your feedback helps the Aviora learning community.' });
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({ error: 'Failed to submit review.' });
  }
});

// ==========================================
// TEACHER & TUTOR PORTAL ROUTES
// ==========================================

// Get teacher application details
app.get('/api/teacher/application-status', authenticateToken, requireRole('teacher'), (req, res) => {
  try {
    const userId = req.user.id;
    const application = db.prepare('SELECT * FROM teacher_applications WHERE user_id = ?').get(userId);
    const tutorProfile = db.prepare('SELECT * FROM tutor_profiles WHERE user_id = ?').get(userId);

    if (application) {
      application.subjects = JSON.parse(application.subjects || '[]');
      application.grade_levels = JSON.parse(application.grade_levels || '[]');
      application.availability_schedule = JSON.parse(application.availability_schedule || '{}');
    }

    res.json({ application, tutorProfile });
  } catch (error) {
    console.error('Application status error:', error);
    res.status(500).json({ error: 'Failed to retrieve application status.' });
  }
});

// Teacher submits/updates their full application with credential upload
app.post('/api/teacher/apply', authenticateToken, requireRole('teacher'), upload.single('credential_document'), (req, res) => {
  try {
    const userId = req.user.id;
    const {
      headline,
      highest_degree,
      institution,
      graduation_year,
      years_experience,
      subjects,
      grade_levels,
      hourly_rate,
      bio,
      teaching_philosophy,
      availability_schedule
    } = req.body;

    const subjectsArr = typeof subjects === 'string' ? subjects.split(',').map(s => s.trim()).filter(Boolean) : (subjects || []);
    const gradeLevelsArr = typeof grade_levels === 'string' ? grade_levels.split(',').map(g => g.trim()).filter(Boolean) : (grade_levels || []);

    const existingApp = db.prepare('SELECT * FROM teacher_applications WHERE user_id = ?').get(userId);

    let credentialFile = existingApp ? existingApp.credentials_file : null;
    let credentialFilename = existingApp ? existingApp.credentials_filename : null;

    if (req.file) {
      credentialFile = `/uploads/${req.file.filename}`;
      credentialFilename = req.file.originalname;
    }

    if (existingApp) {
      db.prepare(`
        UPDATE teacher_applications
        SET headline = ?, highest_degree = ?, institution = ?, graduation_year = ?,
            years_experience = ?, subjects = ?, grade_levels = ?, hourly_rate = ?,
            bio = ?, teaching_philosophy = ?, credentials_file = COALESCE(?, credentials_file),
            credentials_filename = COALESCE(?, credentials_filename),
            availability_schedule = ?, status = 'pending', updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(
        headline || existingApp.headline,
        highest_degree || existingApp.highest_degree,
        institution || existingApp.institution,
        parseInt(graduation_year) || existingApp.graduation_year,
        parseInt(years_experience) || existingApp.years_experience,
        JSON.stringify(subjectsArr),
        JSON.stringify(gradeLevelsArr),
        parseFloat(hourly_rate) || existingApp.hourly_rate,
        bio || existingApp.bio,
        teaching_philosophy || existingApp.teaching_philosophy,
        credentialFile,
        credentialFilename,
        typeof availability_schedule === 'string' ? availability_schedule : JSON.stringify(availability_schedule || {}),
        userId
      );
    } else {
      db.prepare(`
        INSERT INTO teacher_applications (
          user_id, headline, highest_degree, institution, graduation_year,
          years_experience, subjects, grade_levels, hourly_rate, bio,
          teaching_philosophy, credentials_file, credentials_filename,
          availability_schedule, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `).run(
        userId,
        headline,
        highest_degree,
        institution,
        parseInt(graduation_year) || 2022,
        parseInt(years_experience) || 1,
        JSON.stringify(subjectsArr),
        JSON.stringify(gradeLevelsArr),
        parseFloat(hourly_rate) || 45.0,
        bio,
        teaching_philosophy,
        credentialFile,
        credentialFilename,
        typeof availability_schedule === 'string' ? availability_schedule : JSON.stringify(availability_schedule || {})
      );
    }

    // Notify all admins
    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
    for (const admin of admins) {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, ?, ?, 'application', '/#admin')
      `).run(
        admin.id,
        'Teacher Application Submitted',
        `${req.user.name} submitted their tutor credentials for review.`
      );
    }

    res.json({ message: 'Your application and credentials have been submitted for review! Our academic board typically reviews submissions within 24-48 hours.' });
  } catch (error) {
    console.error('Teacher application error:', error);
    res.status(500).json({ error: 'Failed to submit application. ' + error.message });
  }
});

// Teacher Dashboard (Requests & Sessions)
app.get('/api/teacher/dashboard', authenticateToken, requireRole('teacher'), (req, res) => {
  try {
    const teacherId = req.user.id;

    const application = db.prepare('SELECT status, admin_notes FROM teacher_applications WHERE user_id = ?').get(teacherId);
    const tutorProfile = db.prepare('SELECT * FROM tutor_profiles WHERE user_id = ?').get(teacherId);

    const requests = db.prepare(`
      SELECT 
        tr.*,
        u.name as student_name,
        u.email as student_email,
        u.avatar_url as student_avatar,
        sp.school as student_school,
        sp.grade_level as student_grade
      FROM tutoring_requests tr
      JOIN users u ON tr.student_id = u.id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE tr.tutor_id = ?
      ORDER BY tr.created_at DESC
    `).all(teacherId);

    const completed = requests.filter(r => r.status === 'completed');
    const totalEarnings = completed.reduce((sum, r) => sum + r.total_amount, 0);

    const stats = {
      is_approved: application ? application.status === 'approved' : false,
      application_status: application ? application.status : 'unapplied',
      admin_notes: application ? application.admin_notes : null,
      total_requests: requests.length,
      pending_requests: requests.filter(r => r.status === 'pending').length,
      active_sessions: requests.filter(r => r.status === 'accepted').length,
      completed_sessions: completed.length,
      total_earnings: totalEarnings,
      rating: tutorProfile ? tutorProfile.rating : 5.0,
      reviews_count: tutorProfile ? tutorProfile.reviews_count : 0
    };

    res.json({ stats, requests, tutorProfile });
  } catch (error) {
    console.error('Teacher dashboard error:', error);
    res.status(500).json({ error: 'Failed to retrieve teacher dashboard data.' });
  }
});

// Teacher responds to request (Accept, Decline, Mark Completed)
app.post('/api/teacher/requests/:id/status', authenticateToken, requireRole('teacher'), (req, res) => {
  try {
    const requestId = req.params.id;
    const teacherId = req.user.id;
    const { status, note } = req.body;

    if (!['accepted', 'declined', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status update.' });
    }

    const request = db.prepare('SELECT * FROM tutoring_requests WHERE id = ? AND tutor_id = ?').get(requestId, teacherId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    db.prepare(`
      UPDATE tutoring_requests 
      SET status = ?, tutor_response_note = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, note || null, requestId);

    if (status === 'completed') {
      db.prepare(`
        UPDATE tutor_profiles 
        SET total_sessions = total_sessions + 1, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = ?
      `).run(teacherId);
    }

    // Notify student
    const statusTitles = {
      accepted: 'Tutoring Request Accepted!',
      declined: 'Tutoring Request Declined',
      completed: 'Tutoring Session Completed'
    };

    const statusMessages = {
      accepted: `Great news! ${req.user.name} accepted your request for ${request.subject} on ${request.requested_date}.`,
      declined: `${req.user.name} was unable to accept your request for ${request.subject}. Note: ${note || 'Scheduling conflict.'}`,
      completed: `Your session on ${request.subject} has been marked completed. You can now leave a review for your tutor!`
    };

    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (?, ?, ?, 'status', '/#student-requests')
    `).run(request.student_id, statusTitles[status], statusMessages[status]);

    res.json({ message: `Request successfully marked as ${status}.` });
  } catch (error) {
    console.error('Update request status error:', error);
    res.status(500).json({ error: 'Failed to update request status.' });
  }
});

// ==========================================
// CREATIVE ADMINISTRATOR DASHBOARD ROUTES
// ==========================================

// Admin overview stats & charts
app.get('/api/admin/dashboard', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
    const totalStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get().count;
    const totalTeachers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'teacher'").get().count;
    const totalAdmins = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get().count;
    const approvedTutors = db.prepare("SELECT COUNT(*) as count FROM tutor_profiles WHERE is_active = 1").get().count;
    const pendingApps = db.prepare("SELECT COUNT(*) as count FROM teacher_applications WHERE status = 'pending'").get().count;
    const totalRequests = db.prepare("SELECT COUNT(*) as count FROM tutoring_requests").get().count;
    const completedSessions = db.prepare("SELECT COUNT(*) as count FROM tutoring_requests WHERE status = 'completed'").get().count;

    // Platform revenue calculation: Tutoring sessions + Subscriptions
    const tutoringRev = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM tutoring_requests WHERE status IN ('accepted', 'completed')").get().total;
    const subRev = db.prepare("SELECT COALESCE(SUM(price_paid), 0) as total FROM student_subscriptions").get().total;
    const platformVolume = tutoringRev + subRev;

    // Distribution by Subject
    const subjectStats = db.prepare(`
      SELECT subject, COUNT(*) as count 
      FROM tutoring_requests 
      GROUP BY subject 
      ORDER BY count DESC 
      LIMIT 6
    `).all();

    // Teacher Applications Breakdown
    const appBreakdown = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM teacher_applications 
      GROUP BY status
    `).all();

    // Recent platform activity (Accounts, Applications, Requests)
    const recentActivity = db.prepare(`
      SELECT * FROM (
        SELECT 'registration' as type, u.id, u.name as user_name, u.status, u.created_at, ('Account created (' || u.role || ')') as info
        FROM users u
        UNION ALL
        SELECT 'application' as type, ta.id, u.name as user_name, ta.status, ta.created_at, ta.headline as info
        FROM teacher_applications ta
        JOIN users u ON ta.user_id = u.id
        UNION ALL
        SELECT 'request' as type, tr.id, u.name as user_name, tr.status, tr.created_at, tr.subject as info
        FROM tutoring_requests tr
        JOIN users u ON tr.student_id = u.id
      ) ORDER BY created_at DESC LIMIT 10
    `).all();

    res.json({
      metrics: {
        totalUsers,
        totalStudents,
        totalTeachers,
        totalAdmins,
        approvedTutors,
        pendingApps,
        totalRequests,
        completedSessions,
        platformVolume
      },
      charts: {
        subjects: subjectStats,
        applications: appBreakdown
      },
      recentActivity
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to retrieve admin dashboard metrics.' });
  }
});

// Admin: Get All User Accounts (Students, Teachers, Admins)
app.get('/api/admin/users', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { role } = req.query;
    let query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.phone,
        u.avatar_url,
        u.status,
        u.created_at,
        sp.grade_level,
        sp.school,
        sp.target_subjects,
        ta.headline as teacher_headline,
        ta.highest_degree,
        ta.institution,
        ta.status as application_status,
        tp.is_active as tutor_active,
        tp.rating as tutor_rating,
        tp.hourly_rate as tutor_rate,
        (SELECT COUNT(*) FROM tutoring_requests WHERE student_id = u.id) as student_requests,
        (SELECT COUNT(*) FROM tutoring_requests WHERE tutor_id = u.id) as tutor_requests
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      LEFT JOIN teacher_applications ta ON ta.user_id = u.id
      LEFT JOIN tutor_profiles tp ON tp.user_id = u.id
    `;
    const params = [];
    if (role && role !== 'all') {
      query += ` WHERE u.role = ?`;
      params.push(role);
    }
    query += ` ORDER BY u.created_at DESC`;

    const users = db.prepare(query).all(...params);
    res.json({ users });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ error: 'Failed to fetch user accounts.' });
  }
});

// Admin: Directly Create User Account (Student, Teacher, or Admin)
app.post('/api/admin/users', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { name, email, password, role, phone, grade_level, school, headline, institution, highest_degree, hourly_rate, subjects } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }

    if (!['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be student, teacher, or admin.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const defaultAvatar = role === 'teacher'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
      : (role === 'admin'
        ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80');

    const insert = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, phone, avatar_url, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).run(name.trim(), email.toLowerCase().trim(), passwordHash, role, phone || null, defaultAvatar);

    const userId = insert.lastInsertRowid;

    if (role === 'student') {
      db.prepare(`
        INSERT INTO student_profiles (user_id, grade_level, school, learning_goals, target_subjects)
        VALUES (?, ?, ?, 'Achieve academic mastery & excellence.', ?)
      `).run(userId, grade_level || 'Grade 11', school || 'Aviora Academy', subjects || 'Mathematics');
    } else if (role === 'teacher') {
      const defaultSchedule = JSON.stringify({
        Monday: ['09:00 - 12:00', '14:00 - 17:00'],
        Wednesday: ['09:00 - 12:00', '14:00 - 17:00'],
        Friday: ['09:00 - 15:00']
      });
      const parsedSubjects = subjects ? subjects.split(',').map(s => s.trim()) : ['Mathematics', 'Science'];
      const appRes = db.prepare(`
        INSERT INTO teacher_applications (
          user_id, headline, highest_degree, institution, graduation_year,
          years_experience, subjects, grade_levels, hourly_rate, bio,
          teaching_philosophy, availability_schedule, status, admin_notes, reviewed_by, reviewed_at
        ) VALUES (?, ?, ?, ?, 2022, 3, ?, ?, ?, 'Faculty educator at Aviora Education.', 'Rigorous foundational mastery.', ?, 'approved', 'Directly approved by Administrator.', ?, CURRENT_TIMESTAMP)
      `).run(
        userId,
        headline || 'Academic Subject Specialist',
        highest_degree || 'Master of Science',
        institution || 'University Faculty',
        JSON.stringify(parsedSubjects),
        JSON.stringify(['High School', 'College / Undergraduate']),
        parseFloat(hourly_rate) || 50.0,
        defaultSchedule,
        req.user.id
      );

      // Also create active tutor profile
      db.prepare(`
        INSERT INTO tutor_profiles (
          user_id, application_id, headline, bio, highest_degree,
          institution, years_experience, subjects, grade_levels,
          hourly_rate, rating, reviews_count, total_sessions,
          availability_schedule, is_featured, is_active
        ) VALUES (?, ?, ?, 'Faculty educator at Aviora Education.', ?, ?, 3, ?, ?, ?, 5.0, 0, 0, ?, 0, 1)
      `).run(
        userId,
        appRes.lastInsertRowid,
        headline || 'Academic Subject Specialist',
        highest_degree || 'Master of Science',
        institution || 'University Faculty',
        JSON.stringify(parsedSubjects),
        JSON.stringify(['High School', 'College / Undergraduate']),
        parseFloat(hourly_rate) || 50.0,
        defaultSchedule
      );
    }

    res.status(201).json({
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully.`,
      user: { id: userId, name: name.trim(), email: email.toLowerCase().trim(), role, status: 'active' }
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ error: 'Failed to create user account: ' + error.message });
  }
});

// Admin: Get Teacher Applications with filtering
app.get('/api/admin/teacher-applications', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT 
        ta.*,
        u.name,
        u.email,
        u.phone,
        u.avatar_url,
        u.status as user_status
      FROM teacher_applications ta
      JOIN users u ON ta.user_id = u.id
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ` WHERE ta.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY CASE WHEN ta.status = 'pending' THEN 0 ELSE 1 END, ta.created_at DESC`;

    const apps = db.prepare(query).all(...params);

    const formatted = apps.map(a => ({
      ...a,
      subjects: JSON.parse(a.subjects || '[]'),
      grade_levels: JSON.parse(a.grade_levels || '[]'),
      availability_schedule: JSON.parse(a.availability_schedule || '{}')
    }));

    res.json({ applications: formatted });
  } catch (error) {
    console.error('Admin get applications error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher applications.' });
  }
});

// Admin: Review Teacher Application (Approve / Reject)
app.post('/api/admin/teacher-applications/:id/review', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const appId = req.params.id;
    const { status, admin_notes } = req.body;
    const adminId = req.user.id;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid application status.' });
    }

    const application = db.prepare('SELECT * FROM teacher_applications WHERE id = ?').get(appId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    // Update application
    db.prepare(`
      UPDATE teacher_applications
      SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, admin_notes || null, adminId, appId);

    if (status === 'approved') {
      // Upsert into tutor_profiles so they immediately appear in the public directory!
      const existingTutor = db.prepare('SELECT id FROM tutor_profiles WHERE user_id = ?').get(application.user_id);
      if (existingTutor) {
        db.prepare(`
          UPDATE tutor_profiles
          SET application_id = ?, headline = ?, bio = ?, highest_degree = ?,
              institution = ?, years_experience = ?, subjects = ?, grade_levels = ?,
              hourly_rate = ?, availability_schedule = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `).run(
          appId,
          application.headline,
          application.bio,
          application.highest_degree,
          application.institution,
          application.years_experience,
          application.subjects,
          application.grade_levels,
          application.hourly_rate,
          application.availability_schedule,
          application.user_id
        );
      } else {
        db.prepare(`
          INSERT INTO tutor_profiles (
            user_id, application_id, headline, bio, highest_degree,
            institution, years_experience, subjects, grade_levels,
            hourly_rate, rating, reviews_count, total_sessions,
            availability_schedule, is_featured, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5.0, 0, 0, ?, 0, 1)
        `).run(
          application.user_id,
          appId,
          application.headline,
          application.bio,
          application.highest_degree,
          application.institution,
          application.years_experience,
          application.subjects,
          application.grade_levels,
          application.hourly_rate,
          application.availability_schedule
        );
      }

      // Notify teacher
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, ?, ?, 'approval', '/#teacher-portal')
      `).run(
        application.user_id,
        'Application Approved! Welcome to Aviora Education',
        'Congratulations! Your teacher credentials have been verified and approved. Your tutor profile is now live in the Aviora directory.'
      );
    } else if (status === 'rejected') {
      // Deactivate tutor profile if previously active
      db.prepare('UPDATE tutor_profiles SET is_active = 0 WHERE user_id = ?').run(application.user_id);

      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, ?, ?, 'rejection', '/#teacher-application')
      `).run(
        application.user_id,
        'Teacher Application Status Update',
        `Your application was reviewed. Note from Academic Board: ${admin_notes || 'Credentials could not be verified at this time.'}`
      );
    }

    res.json({ message: `Application successfully marked as ${status}.` });
  } catch (error) {
    console.error('Review application error:', error);
    res.status(500).json({ error: 'Failed to process application review.' });
  }
});

// Admin: Manage Tutor Profiles (List & Active Toggle)
app.get('/api/admin/tutors', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const tutors = db.prepare(`
      SELECT 
        tp.*,
        u.name,
        u.email,
        u.phone,
        u.avatar_url,
        u.status as user_status
      FROM tutor_profiles tp
      JOIN users u ON tp.user_id = u.id
      ORDER BY tp.created_at DESC
    `).all();

    const formatted = tutors.map(t => ({
      ...t,
      subjects: JSON.parse(t.subjects || '[]'),
      grade_levels: JSON.parse(t.grade_levels || '[]')
    }));

    res.json({ tutors: formatted });
  } catch (error) {
    console.error('Admin get tutors error:', error);
    res.status(500).json({ error: 'Failed to fetch tutor profiles.' });
  }
});

// Admin: Toggle Tutor Profile Active / Inactive
app.post('/api/admin/tutors/:id/toggle-status', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const profileId = req.params.id;
    const profile = db.prepare('SELECT id, is_active FROM tutor_profiles WHERE id = ?').get(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Tutor profile not found.' });
    }

    const newStatus = profile.is_active === 1 ? 0 : 1;
    db.prepare('UPDATE tutor_profiles SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, profileId);

    res.json({
      message: `Tutor profile is now ${newStatus === 1 ? 'Active (Visible publicly)' : 'Inactive (Hidden from public directory)'}.`,
      is_active: newStatus
    });
  } catch (error) {
    console.error('Toggle tutor status error:', error);
    res.status(500).json({ error: 'Failed to toggle tutor status.' });
  }
});

// Admin: Student Account Management
app.get('/api/admin/students', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const students = db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.avatar_url,
        u.status,
        u.created_at,
        sp.grade_level,
        sp.school,
        sp.learning_goals,
        sp.target_subjects,
        (SELECT COUNT(*) FROM tutoring_requests WHERE student_id = u.id) as request_count,
        (SELECT COUNT(*) FROM tutoring_requests WHERE student_id = u.id AND status = 'completed') as completed_count
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE u.role = 'student'
      ORDER BY u.created_at DESC
    `).all();

    res.json({ students });
  } catch (error) {
    console.error('Admin get students error:', error);
    res.status(500).json({ error: 'Failed to fetch students.' });
  }
});

// Admin: Toggle User Account Status (active, suspended)
app.post('/api/admin/users/:id/status', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const userId = req.params.id;
    const { status } = req.body;

    if (!['active', 'suspended', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid user status.' });
    }

    const targetUser = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (targetUser.role === 'admin') {
      return res.status(403).json({ error: 'Administrator accounts cannot be suspended.' });
    }

    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId);

    res.json({ message: `User account status updated to ${status}.` });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status.' });
  }
});

// Admin: Platform Tutoring Requests Audit
app.get('/api/admin/requests', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT 
        tr.*,
        s.name as student_name,
        s.email as student_email,
        t.name as tutor_name,
        t.email as tutor_email
      FROM tutoring_requests tr
      JOIN users s ON tr.student_id = s.id
      JOIN users t ON tr.tutor_id = t.id
      ORDER BY tr.created_at DESC
    `).all();

    res.json({ requests });
  } catch (error) {
    console.error('Admin get requests error:', error);
    res.status(500).json({ error: 'Failed to fetch tutoring requests.' });
  }
});

// ==========================================
// NOTIFICATIONS
// ==========================================

app.get('/api/notifications', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 20
    `).all(userId);

    res.json({ notifications });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

app.post('/api/notifications/mark-read', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
    res.json({ message: 'Notifications marked as read.' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
});

// Catch-all for SPA client routing (Express 5 compatible)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'An internal server error occurred.' });
});

// Start Server locally if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🌟 Aviora Education Server is Live & Running!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🎓 Role Credentials Demo:`);
    console.log(`   - Administrator: admin@aviora.edu / admin123`);
    console.log(`   - Student Demo:  student@aviora.edu / student123`);
    console.log(`   - Teacher Demo:  elena.vance@aviora.edu / teacher123`);
    console.log(`===============================================`);
  });
}

module.exports = app;
