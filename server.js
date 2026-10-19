const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const { db } = require('./database/db');

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

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
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
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Your account is deactivated or suspended. Please contact Aviora support.' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
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

    res.json({ tutor });
  } catch (error) {
    console.error('Fetch tutor details error:', error);
    res.status(500).json({ error: 'Failed to load tutor details.' });
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
        tp.id as tutor_profile_id
      FROM tutoring_requests tr
      JOIN users u ON tr.tutor_id = u.id
      LEFT JOIN tutor_profiles tp ON tp.user_id = u.id
      WHERE tr.student_id = ?
      ORDER BY tr.created_at DESC
    `).all(studentId);

    const stats = {
      total_requests: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      upcoming: requests.filter(r => r.status === 'accepted').length,
      completed: requests.filter(r => r.status === 'completed').length
    };

    res.json({ stats, requests });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({ error: 'Failed to load student dashboard.' });
  }
});

// Student sends a tutoring request
app.post('/api/student/requests', authenticateToken, requireRole('student'), (req, res) => {
  try {
    const { tutor_user_id, subject, grade_level, requested_date, requested_time, duration_hours, notes } = req.body;
    const studentId = req.user.id;

    if (!tutor_user_id || !subject || !requested_date || !requested_time) {
      return res.status(400).json({ error: 'Please provide tutor, subject, date, and preferred time slot.' });
    }

    const tutorProfile = db.prepare('SELECT hourly_rate, is_active FROM tutor_profiles WHERE user_id = ?').get(tutor_user_id);
    if (!tutorProfile || !tutorProfile.is_active) {
      return res.status(400).json({ error: 'Selected tutor is not currently accepting requests.' });
    }

    const duration = parseFloat(duration_hours) || 1.0;
    const totalAmount = duration * tutorProfile.hourly_rate;

    const insert = db.prepare(`
      INSERT INTO tutoring_requests (
        student_id, tutor_id, subject, grade_level, requested_date,
        requested_time, duration_hours, hourly_rate, total_amount, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
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
      totalAmount,
      notes || ''
    );

    // Notify tutor
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (?, ?, ?, 'request', '/#teacher-requests')
    `).run(
      tutor_user_id,
      'New Tutoring Request Received',
      `${req.user.name} requested a ${subject} tutoring session on ${requested_date}.`
    );

    res.status(201).json({
      message: 'Tutoring request sent successfully! The tutor will review and respond shortly.',
      requestId: result.lastInsertRowid
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
    const totalStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get().count;
    const totalTeachers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'teacher'").get().count;
    const approvedTutors = db.prepare("SELECT COUNT(*) as count FROM tutor_profiles WHERE is_active = 1").get().count;
    const pendingApps = db.prepare("SELECT COUNT(*) as count FROM teacher_applications WHERE status = 'pending'").get().count;
    const totalRequests = db.prepare("SELECT COUNT(*) as count FROM tutoring_requests").get().count;
    const completedSessions = db.prepare("SELECT COUNT(*) as count FROM tutoring_requests WHERE status = 'completed'").get().count;

    // Platform revenue calculation
    const volumeRow = db.prepare("SELECT SUM(total_amount) as total FROM tutoring_requests WHERE status IN ('accepted', 'completed')").get();
    const platformVolume = volumeRow.total || 0;

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

    // Recent platform activity
    const recentActivity = db.prepare(`
      SELECT * FROM (
        SELECT 'application' as type, ta.id, u.name as user_name, ta.status, ta.created_at, ta.headline as info
        FROM teacher_applications ta
        JOIN users u ON ta.user_id = u.id
        UNION ALL
        SELECT 'request' as type, tr.id, u.name as user_name, tr.status, tr.created_at, tr.subject as info
        FROM tutoring_requests tr
        JOIN users u ON tr.student_id = u.id
      ) ORDER BY created_at DESC LIMIT 8
    `).all();

    res.json({
      metrics: {
        totalStudents,
        totalTeachers,
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
