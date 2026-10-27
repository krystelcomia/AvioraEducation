# Operational Guidelines & Role Governance

This repository enforces strict operational and role-boundary rules. All agents and contributors must strictly adhere to the following directives:

---

## 1. Explicit Scope & Zero Unsolicited Changes
- **No Unsolicited Modifications**: Only modify the exact files, sections, and features that the user explicitly requests.
- **Do Not Guess or Expand**: Never add extra features, refactor unrelated code, or alter visual layouts or behaviors unless explicitly instructed.
- **Maintain Architectural Integrity**: Keep the existing structure, comments, and non-target functionality intact.

---

## 2. Strict Role-Bounded Isolation
The platform has **three distinct user roles**, each with strictly partitioned functions and permissions:

### 🎓 Student (`student`)
- **Scope**:
  - Student portal: `#student-portal`, `#student-lessons`, `#student-schedule`, `#student-history`, `#student-tutors`.
  - Tutor search, filtering, and session booking modals.
  - Review and rating submissions for completed sessions.
  - Personal learning goals and profile settings.
  - Student-side Aviora Buddy interactions.
- **Rule**: Changes targeting students must not alter or leak into tutor or admin interfaces or workflows.

### 🧑‍🏫 Tutor (`tutor` / `teacher`)
- **Scope**:
  - Application onboarding and credentials submission (`#teacher-application`): resume and diploma upload.
  - Account status locking: operations remain locked while credentials are under admin review and virtual interview scheduling.
  - Tutor exploration and management pages: `#teacher-classes`, `#teacher-students`, `#teacher-schedule`, `#teacher-buddy`, `#teacher-dashboard`.
  - Session request handling (Accept, Decline, Complete) and hourly rate management.
- **Rule**: Changes targeting tutors must not modify student booking behavior or admin approval logic unless explicitly instructed.

### 👑 Admin (`admin`)
- **Scope**:
  - Administrator portal: `#admin-portal`.
  - Review, approval, or rejection of tutor credential applications (with feedback notes).
  - Platform metric tracking, student account management, and tutor visibility toggles.
- **Rule**: Changes targeting admin tools must not affect frontend student or tutor workflows directly.

---

## 3. Platform Defaults & Account Isolation
- **Theme**: Default is **Light Mode**. When an authenticated user switches to **Dark Mode**, it is saved strictly to their own user account (`aviora_theme_<userId>`) and must never affect other users or guest visitors.
- **Language**: Default is **English**. Language selection is disabled and hidden for visitors/unauthenticated users; language preferences appear strictly within account settings once logged in.
- **Authentication**:
  - Student / Parent registrations default to `student`.
  - Prospective tutor registrations default to `tutor` (redirecting to credential onboarding before full platform operation).
- **Account Persistence & Operational Locking**:
  - All created accounts must be permanently saved and remain accessible for login across sessions.
  - If a teacher's application is still under review, they can access their account (view dashboard, classes, students, schedule, buddy, application), but cannot perform any operational actions until approved by the administrator following their virtual interview.

---

## 4. Verification & Git Workflow
- Always verify all JavaScript files for syntax correctness (`node --check <file>`) before committing.
- Ensure the working tree is clean and tested.
- Commit descriptive messages and push changes to Git (`origin/main`).
