# El‑Node — Pre‑Primary School ERP

A state‑of‑the‑art ERP built for pre‑primary schools (playgroup → UKG). El‑Node brings
**student safety profiles, daily parent updates, digital attendance, watertight fee
management, staff workflows, exams/report cards and live analytics** into one delightful
platform — with four dedicated, role‑based portals.

> **Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Firebase (Auth + Firestore) · Recharts · Deployed on Vercel.

---

## ✨ Portals & Features

### 👪 Parent Portal — _sign in with a 7‑digit admission number_
- **Daily dashboard** — today's attendance, mood, fee dues and upcoming events
- **Child safety profile** — photo, DOB, blood group, allergies, medical notes, emergency
  contacts, **authorised pickup persons**, sibling links, previous school, transport
- **Daily updates** — classroom photos, mood, meals, naps and notes, every day
- **Attendance** — full daily record with late/absent tracking
- **Examinations** — timetable with syllabus and instructions before the exam,
  then marks, grades and a downloadable report card once results are published
- **Homework & activities** with due dates
- **Circulars & event alerts** (pinned notices)
- **Fees** — invoices, dues, **online pay flow**, receipts
- **Report card** — skill‑based progress report, **print / download**
- Multi‑child support with a sibling switcher

### 👩‍🏫 Teacher Portal — _sign in with work email_
- Dashboard with class snapshot & quick actions
- **Mark attendance** — present / late / absent, mark‑all, instant absent alerts to parents
- **My students** — roster with one‑tap safety details (allergies, contacts, pickup)
- **Post daily updates** with mood/meal/nap + photos
- **Post homework**
- **Marks entry** — only the class-subject papers allocated to you; draft, submit
  and lock, with range and completeness validation
- **My classes** — the roster behind each allocated class, with attendance and
  examination status
- **Result analytics** — class average, high/low, pass rate and grade
  distribution for your own papers, once results are published
- **Skill assessments** — enter grades per developmental area, **publish to parents**
- **Daily task checklist** (teaching / care / admin / safety)
- **My attendance** — self **check-in / check-out**, month calendar of your own
  register, punctuality and average hours on site
- **Leave** — apply & track approvals

### 🧮 Accountant Portal — _sign in with work email_
- Collection dashboard — collected / outstanding / overdue, trends, method split
- **Invoices** — filter by status, search, **collect payment**
- **Payments** — record collections, receipt ledger
- **Fee structure** — tuition, transport, activity, meal, admission heads
- **Concessions** — sibling, scholarship, staff‑ward, financial aid
- **Pending fee report** — class‑wise collection + defaulter list (**printable**)

### 🛡️ Super Admin Portal — _sign in with work email_
- **State‑of‑the‑art analytics**: attendance trends (stacked), enrolment by level,
  gender split, collection trends, class health, seat occupancy
- **Students** directory (+ add student) and **Staff** directory (+ add staff)
- **Staff attendance** — a full register in three views: mark the day with punch
  times, a month-at-a-glance matrix you can correct cell by cell, and insights
  (trend, status split, punctuality board, watchlist, per-staff summary). CSV
  export throughout; approved leave is surfaced as you mark
- **ID cards** — student *and* **staff** cards, singly from the staff directory
  or in bulk, printed at CR80 size (see below)
- **Teachers** — class & subject allocation matrix, and the full login lifecycle
  (create, disable, reset, regenerate, account status, password-change state)
- **Examinations** — exam groups, subject papers, timetable, marks-entry
  progress, result verification and class-wise publishing (see below)
- **Grade scales** and **report card** generation
- **Audit log** of every examination and account action
- **Leave approvals**
- **Classes** overview with occupancy & class‑teacher allocation
- **Finance** overview & class‑wise collection
- **Circulars** broadcaster (parents / staff / everyone, pinned)
- **Settings** — school profile, auth model, deployment status, demo controls

---

## 🔐 Authentication model

| Who         | Login               | Mechanism                                                             |
|-------------|---------------------|----------------------------------------------------------------------|
| Parents     | 7‑digit admission # | Mapped internally to `<number>@parents.el-node.app` for Firebase Auth |
| Teacher/Acc | Work email          | Firebase email/password; role resolved from the staff directory      |
| Super Admin | **Google sign‑in**  | `signInWithPopup`, restricted to an allowlist (`NEXT_PUBLIC_SUPERADMIN_EMAILS`, default `dewesh@eldenheights.org`) |

Roles (`parent`, `teacher`, `accountant`, `superadmin`) drive routing and the Firestore
security rules. Helpers use the teacher portal.

### Super Admin & student onboarding

The **Super Admin signs in with Google** (allowlisted email only) and is the role that
onboards students. When a student is added from **Admin → Students → Add Student**:

1. The student record is created, and
2. the parent's **Firebase Auth login is auto‑provisioned** server‑side via the Firebase
   Admin SDK — email `<admissionNo>@parents.el-node.app`, with a generated 6‑digit PIN
   (shown once to the admin to share). A `role: "parent"` custom claim and the
   `students/` + `appUsers/` documents are written too.

This runs in `POST /api/students/create`, which **verifies the caller's ID token and the
super‑admin allowlist** before doing anything. It requires the Firebase Admin SDK env vars
(below). Without them, the student is still added locally and the UI explains that the
Auth account is created automatically once Firebase is connected.

---

## 🚀 Quick start

```bash
npm install
npm run dev
# open http://localhost:3000
```

The app boots in **Demo Mode** with a rich seeded dataset (8 students, 4 classes, 6 staff,
attendance, fees, updates, exams…) — **no backend required**. Use the one‑click demo logins
on the sign‑in screens, or these demo credentials:

| Role        | Login                                      |
|-------------|--------------------------------------------|
| Parent      | Admission **`2025001`** (Aarav) · any PIN  |
| Parent      | Admission **`2025006`** (Saanvi) · any PIN |
| Teacher     | `anita@elnode.school` · any password       |
| Accountant  | `accounts@elnode.school` · any password    |
| Super Admin | `admin@elnode.school` · any password       |

Demo changes (attendance, payments, posts) persist in `localStorage`; reset from
**Admin → Settings → Reset demo data**.

---

## ☁️ Going live with Firebase

1. Create a Firebase project; enable **Authentication → Email/Password** and **Firestore**.
2. Copy `.env.example` → `.env.local` and fill in the `NEXT_PUBLIC_FIREBASE_*` values.
   Optionally set `NEXT_PUBLIC_FIREBASE_DATABASE_ID` to target a **named** Firestore
   database; leave it blank to use the project's default database.
3. Deploy the security rules: `firebase deploy --only firestore:rules` (see `firestore.rules`).
4. Seed Firestore with the sample dataset by calling `seedFirestore()` from
   `src/lib/firestore.ts` (e.g. a one‑off protected admin action).
5. Create Auth users:
   - **Super Admin:** enable **Google** as a sign‑in provider; the allowlisted email
     (`NEXT_PUBLIC_SUPERADMIN_EMAILS`) is granted admin access on sign‑in.
   - **Parents:** created automatically when the admin adds a student (see above). For
     manual setup: email `<admissionNo>@parents.el-node.app` + an `appUsers/{uid}` doc
     `{ role: "parent", studentIds: [...] }`.
   - **Staff:** their work email, with `appUsers/{uid}` `{ role, staffId }`.
6. For student auto‑provisioning, add a **Service Account** key and set the Admin SDK env
   vars: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
   (server‑only — no `NEXT_PUBLIC_` prefix).

When the env vars are present El‑Node **automatically switches** from demo data to Firebase
Auth + Firestore — no code changes needed (`isDemoMode` in `src/lib/firebase.ts`).

---

## 🪪 ID cards

Students and staff share one card design (`src/components/id-card-parts.tsx`),
so a mixed print run comes out on identical stock.

| | Where | Notes |
|---|---|---|
| **Student card** | Admin → ID Cards → *Students* | Front: photo, name, admission no, class. Back: parents, contact, DOB, address, QR |
| **Staff card** | Admin → Staff → 🪪 (per person) or Admin → ID Cards → *Staff* | Front: photo, name, staff ID, designation pill, blood-group tag. Back: staff ID, blood group, DOB, joining date, phone, emergency contact, address, optional **valid till**, QR |

The staff card opens in a **generation modal** — pick front & back / front only /
back only, set the validity date (defaults to 31 March of the current session),
and print. Missing details (photo, blood group, emergency contact…) are called
out before you print; fill them in from **Edit staff → ID card details**.

Printing uses an isolated portal, so each face prints as its own **CR80 page
(54 × 85.6 mm)** with no app chrome. Staff portraits upload to
`staff-photos/` in Firebase Storage (see `storage.rules`).

## ⏱️ Staff attendance

`Admin → Staff Attendance` is the register; `Teacher → My Attendance` is the
self-service side. Records live in the `staffAttendance` collection, one
document per staff member per day (`sat-<staffId>-<date>`), so marking the same
day twice updates the row instead of duplicating it.

The working day drives punctuality and hours, and is configurable:

| Variable | Default | Meaning |
|---|---|---|
| `NEXT_PUBLIC_WORKDAY_START` | `09:00` | Scheduled start |
| `NEXT_PUBLIC_WORKDAY_END` | `16:00` | Scheduled end |
| `NEXT_PUBLIC_WORKDAY_GRACE` | `10` | Minutes after start still counted on time |

A check-in past start + grace files as **late** (with the minutes recorded);
hours on site are measured between the two punches. Weekends are excluded from
rates and trends, and staff on **approved leave** are flagged in the register.

## 📝 Examination management

A full marks-based examination system alongside the pre-primary skill
assessments, spanning the Super Admin, Teacher and Parent portals.

### The workflow

```
Teacher added → login provisioned → password changed on first sign-in
→ classes & subjects allocated → exam group created → grade scale chosen
→ subject papers created → timetable visible to parents
→ examination conducted → teachers enter & submit marks (sheet locks)
→ admin verifies → results published class-wise → parent portal updated
→ report cards generated → teachers see analytics
```

### Who owns what

| Module | Where | Notes |
|---|---|---|
| **Teacher allocation & logins** | Admin → Teachers | The (class × subject) matrix, plus create / disable / reset / regenerate on the Firebase account, last login and password status |
| **Grade scales** | Admin → Grade Scales | Percentage bands with grade, grade point and remark. Gaps and overlaps are flagged before saving; a CBSE eight-band scale ships as a one-click seed |
| **Examinations** | Admin → Examinations | Exam groups with a status workflow (draft → scheduled → ongoing → marks entry → verification → published → archived), class-wise subject papers, and the generated timetable |
| **Marks entry** | Teacher → Marks Entry | Only allocated papers appear. Draft / submit, with submitted sheets locked until an admin reopens them |
| **Verification & publishing** | Admin → Examinations → Results | Validation warnings per class, an explicit override, and class-wise publish / unpublish |
| **Report cards** | Admin → Report Cards | Individual, class or whole-examination PDFs, built from published snapshots only |
| **Parent view** | Parent → Examinations | Timetable with syllabus and instructions before; marks, grades and report card after publication |
| **Analytics** | Teacher → Result Analytics | Class average, high/low, pass rate and grade distribution — for that teacher's papers, after publication |
| **Audit log** | Admin → Audit Log | Every login, marks and result action with actor, timestamp and before/after |

### Rules the code enforces

- **A teacher can only mark what they are allocated.** `teacherAssignments` holds
  one document per (teacher, class, subject); `Staff.assignedClassIds × subjects`
  is a cross-product and cannot express "Maths in 8A but not in 9A". The Firestore
  rules check for the assignment document, so the UI is not the boundary.
- **Marks cannot exceed the maximum**, and submit is blocked while any value is
  out of range or any student is unmarked.
- **Submitted sheets lock.** Only an admin can reopen one, and the reason is
  recorded.
- **Draft marks never reach parents.** `examMarks` is skipped entirely for a
  parent session and denied by the rules.
- **Results are snapshots.** Publishing writes one `studentResults` document per
  student carrying the student details, subject lines, totals *and the grade
  bands in force at that moment*. Editing a grade scale, renaming a subject or
  changing a teacher afterwards cannot alter an issued report card.
- **Report cards come from published results only** — never from live marks.
- **Parents only see their own children.** The results listener is query-scoped
  to the linked student ids, matching the rule that enforces it.

### Mark statuses

| Status | Counts towards the total | Treated as a fail |
|---|---|---|
| Present | yes, at the mark entered | only below the passing mark |
| Absent / Not appeared | yes, as zero | yes |
| Medical leave / Exempted | no — left out entirely | no |

Leaving medical and exempted papers out of the total stops an excused absence
from dragging the percentage down.

### Firestore collections

`academicSessions`, `teacherAssignments`, `gradeScales`, `examGroups`,
`subjectExams`, `examMarks`, `studentResults`, `reportCards`, `auditLogs`,
`notifications`.

Two naming notes: the marks-based papers live in **`subjectExams`** and the
published results in **`studentResults`**, because `exams` and `examResults`
already hold the pre-primary skill assessments and reusing those names would
collide with live data. Marks are one document per paper (keyed by student
inside it), so a teacher's submit is a single atomic write rather than one per
child.

### Class levels

`CLASS_LEVELS` in `src/lib/types.ts` runs Playgroup → UKG → Class 1–12, so the
same install serves a pre-primary wing and a senior school. A `SchoolClass` is
a level *plus* a section, so "Class 8" + "A" is the class written 8A — there is
no separate section entity, and examinations scope by `classId` alone.

## 📱 Progressive Web App (PWA)

El-Node is an installable PWA — parents and staff can add it to their home screen and
it works offline for pages they've already opened.

- **Manifest:** `src/app/manifest.ts` → `/manifest.webmanifest` (name, theme, icons, shortcuts)
- **Icons:** `public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`
- **Service worker:** `public/sw.js` — network-first for navigations (with an `offline.html`
  fallback) and stale-while-revalidate for static assets. APIs and cross-origin requests
  (e.g. Razorpay) are never cached.
- **Registration + install prompt:** `src/components/PWARegister.tsx` (registers the SW in
  production and shows an "Install app" banner on `beforeinstallprompt`).

> The service worker only registers in a production build (`npm run build && npm run start`,
> or on Vercel) — not in `npm run dev`.

## 💳 Online payments (Razorpay)

Parent fee payments are processed through **Razorpay**. Set these env vars to go live;
leave them blank and the pay flow falls back to a simulated demo payment.

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Client + server | Public Key ID, opens Checkout |
| `RAZORPAY_KEY_SECRET` | **Server only** | Creates orders & verifies signatures — never expose |
| `RAZORPAY_WEBHOOK_SECRET` | Server only | Optional, only if you add webhooks |

Flow: the client calls `POST /api/razorpay/order` (server creates the order with the
secret), Razorpay Checkout opens in the browser, and on success the client calls
`POST /api/razorpay/verify` which validates the `order_id|payment_id` HMAC‑SHA256
signature before the payment is recorded. Amounts are sent to Razorpay in paise.

## ▲ Deploy to Vercel

1. Push this repo to GitHub and **Import** it in Vercel (framework auto‑detected as Next.js).
2. _(Optional)_ add the `NEXT_PUBLIC_FIREBASE_*` environment variables for live data.
3. Deploy. Without env vars the preview runs in fully‑functional demo mode.

```bash
npm run build   # production build
npm run start   # serve the build locally
npm run typecheck
```

---

## 🗂️ Project structure

```
src/
├── app/
│   ├── page.tsx                 # marketing landing
│   ├── login/                   # parent (7-digit) + staff (email) sign-in
│   ├── parent/                  # parent portal (dashboard, profile, attendance, fees…)
│   ├── teacher/                 # teacher portal (attendance, updates, exams, tasks…)
│   ├── accountant/              # accounts portal (invoices, payments, reports…)
│   └── admin/                   # super-admin portal (analytics, students, staff…)
├── components/                  # UI primitives, charts, PortalShell, ReportCard…
└── lib/
    ├── types.ts                 # domain model
    ├── firebase.ts              # Firebase init + demo-mode detection
    ├── auth.tsx                 # auth context (7-digit + email)
    ├── store.tsx                # client data store (collections + mutators)
    ├── mockData.ts              # seeded demo dataset
    ├── analytics.ts             # derived dashboard analytics
    ├── exams.ts                 # grading, result computation, validation, scoping
    ├── reportCardPdf.ts         # report card → PDF (jsPDF)
    ├── notifications.ts         # which notices reach which role
    └── firestore.ts             # production Firestore helpers + seeder
```

---

## 🛡️ Notes

- All money is shown in **INR (₹)**; assessments are **skill/grade based** (age‑appropriate
  for pre‑primary), not marks.
- `firestore.rules` ships sensible role‑based defaults — tighten (e.g. per‑class teacher
  scoping, per‑parent child scoping) before production.
- Classroom "photos" render as local gradient tiles in demo mode; wire them to Firebase
  Storage URLs in production.
