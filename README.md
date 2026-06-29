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
- **Skill assessments** — enter grades per developmental area, **publish to parents**
- **Daily task checklist** (teaching / care / admin / safety)
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
- **Leave approvals**
- **Classes** overview with occupancy & class‑teacher allocation
- **Finance** overview & class‑wise collection
- **Circulars** broadcaster (parents / staff / everyone, pinned)
- **Settings** — school profile, auth model, deployment status, demo controls

---

## 🔐 Authentication model

| Who      | Login               | Mechanism                                                             |
|----------|---------------------|----------------------------------------------------------------------|
| Parents  | 7‑digit admission # | Mapped internally to `<number>@parents.el-node.app` for Firebase Auth |
| Staff    | Work email          | Firebase email/password; role resolved from the staff directory      |

Roles (`parent`, `teacher`, `accountant`, `superadmin`) drive routing and the Firestore
security rules. Helpers use the teacher portal.

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
   - **Parents:** email `<admissionNo>@parents.el-node.app`, with an `appUsers/{uid}` doc
     `{ role: "parent", studentIds: [...] }`.
   - **Staff:** their work email, with `appUsers/{uid}` `{ role, staffId }`.

When the env vars are present El‑Node **automatically switches** from demo data to Firebase
Auth + Firestore — no code changes needed (`isDemoMode` in `src/lib/firebase.ts`).

---

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
    ├── store.tsx                # client data store (seed + mutators)
    ├── mockData.ts              # seeded demo dataset
    ├── analytics.ts             # derived dashboard analytics
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
