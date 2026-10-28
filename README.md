# Aviora Education 🎓✨
> **Your Potential. Your Path. Your Future.**

Aviora Education is a modern, premium, and fully functional online tutoring platform that connects students with vetted, elite academic educators from leading institutions (Stanford, MIT, Harvard, Columbia, and UC Berkeley).

---

## 🌟 Key Features

### 1. 🎨 Creative Design & Visual Branding
- **Distinctive Color Palette**: Yellow gold (`#E5A93C`, `#FFE082`, `#B87E14`), deep charcoal, warm cream, and subtle gold gradients.
- **Custom Vector Emblem**: Crafted vector emblem featuring an open book, ascending beacon star, and gold tracking typography.
- **Modern Typography**: Outfit display paired with Plus Jakarta Sans body.
- **Responsive Layout**: Designed for seamless usability across desktop, tablet, and mobile devices.

### 2. 🏠 Engaging Homepage
- Dynamic Hero section with 3D edtech visual art, live counter statistics, and floating achievement badges.
- Subject categories (Calculus, Physics, Chemistry, Computer Science, Literature, Languages).
- Featured faculty showcase populated directly from the database.
- Interactive **"How Aviora Works"** tabbed layout (Student Journey vs. Tutor Journey).
- Side-by-side comparative benefits for students and educators.
- Verified student reviews and sample testimonials.
- Call-to-action banner for educators with earnings transparency.

### 3. 🔍 Public Tutor Directory
- Real-time search by educator name, university, degree, subject, and biography.
- Comprehensive filters: subject pills, grade levels, budget slider, and sorting (Featured, Highest Rated, Price, Experience).
- Detailed Tutor Profile Modal with qualifications, pedagogy, weekly schedule, and verified ratings.
- Booking Modal with live cost calculation (`duration × hourly rate`), date picker, and topic notes.

### 4. 🎓 Student Experience & Portal
- Secure registration and authentication.
- Student Dashboard tracking active, upcoming, and completed sessions.
- Cancel pending requests with instant tutor notification.
- Leave 1–5 star reviews with comments for completed sessions.
- Personal profile and learning goals manager.

### 5. 🧑‍🏫 Teacher Application & Portal
- Comprehensive accreditation application: degrees, alma mater, experience, subjects, rates, and philosophy.
- File upload handling for official diplomas, certificates, and credentials.
- Application status tracking: **Pending**, **Approved**, or **Rejected** (with Academic Board feedback).
- Educator Dashboard for approved tutors: incoming session requests management (Accept, Decline, Complete), earnings overview, and profile rate settings.
- *Only approved tutors appear in the public directory.*

### 6. 👑 Creative Administrator Console
- Dedicated, secure administrator portal with role-based server-side protection.
- Live platform summary metrics: Total Students, Total Teachers, Approved Tutors, Pending Applications, Tutoring Requests, and Gross Platform Volume.
- Interactive SVG/CSS charts for Subject Distribution and Application Status breakdown.
- Teacher Credential Audit & 1-click **Approve** or **Reject** with custom review notes.
- Instant public visibility toggle switches (Active / Inactive) for all tutors.
- Student account management (Active / Suspend).
- Full platform tutoring requests audit log.

---

## ⚡ Quick Demo Accounts

A **1-Click Persona Switcher** is built into the top navigation bar and authentication modal for instant evaluation:

| Persona | Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Stephanie** | `admin` | `adminaviorastephanie@gmail.com` | `adminstephanieavioraeducation2026` | Application approvals, tutor directory toggles, metrics & charts |
| **Lucas Taylor** | `student` | `student@aviora.edu` | `student123` | Session bookings, cancellations, review submissions, goals |
| **Dr. Elena Vance** | `teacher` | `elena.vance@aviora.edu` | `teacher123` | Session management (Accept/Decline/Complete), earnings, rates |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation & Launch
```bash
# Clone the repository
git clone https://github.com/krystelcomia/AvioraEducation.git
cd AvioraEducation

# Install dependencies
npm install

# Start the server
npm start
```

Open your browser at:
👉 **http://localhost:3000**

---

## 🌐 Vercel Deployment

Aviora Education is configured for zero-configuration continuous deployment on Vercel:
- **Live URL**: [https://avioraeducation.vercel.app/](https://avioraeducation.vercel.app/)
- **Configuration**: [vercel.json](file:///c:/Users/comia/AvioraEducation/vercel.json) routes static assets directly through Vercel's Edge Network while routing `/api/*` and dynamic routes through the serverless function in [api/index.js](file:///c:/Users/comia/AvioraEducation/api/index.js).
- **Automated CI/CD**: Pushing changes to the `main` branch automatically triggers a new deployment on Vercel.

---

## 📂 Architecture

```
AvioraEducation/
├── package.json               # Express, better-sqlite3, bcryptjs, jsonwebtoken, multer
├── server.js                  # Express API server with role-based auth & file uploads
├── database/
│   ├── db.js                  # SQLite schema definition, seed data & queries
│   └── aviora.db              # SQLite relational database
├── uploads/                   # Secure storage for educator credential documents
└── public/
    ├── index.html             # Semantic SPA with SEO tags and responsive layouts
    ├── assets/
    │   ├── logo.svg           # Custom vector Aviora Education brand emblem
    │   ├── favicon.svg        # Favicon icon
    │   └── images/            # Generated 3D visuals & teacher illustration
    ├── css/
    │   ├── variables.css      # Yellow-gold palette, shadows, transitions, tokens
    │   ├── style.css          # Layout, hero, categories, benefits, footer
    │   ├── components.css     # Tutor cards, filters, modals, toasts, badges
    │   ├── student.css        # Student portal dashboard & request cards
    │   ├── teacher.css        # Teacher application wizard & dashboard
    │   └── admin.css          # Admin sidebar, metric cards, charts & tables
    └── js/
        ├── api.js             # Fetch wrapper with JWT headers
        ├── auth.js            # Login, register, demo 1-click personas
        ├── tutors.js          # Search, filters, tutor profiles, booking modal
        ├── student.js         # Student dashboard, reviews, profile manager
        ├── teacher.js         # Teacher accreditation & session actions
        ├── admin.js           # Admin console, credential audits, toggles
        └── main.js            # SPA hash router, toasts, confirm dialogs
```

---

## 📄 License
ISC License © 2026 Aviora Education Inc. All rights reserved.
