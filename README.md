# Institute Learning Management Platform (LMS)

A secure, scalable web-based Learning Management System designed for educational institutions.

## Architecture Highlights
- **Backend**: Node.js, Express, TypeScript, REST APIs, Helmet, CORS, Rate Limiting, JWT + Refresh Token Rotation, RBAC.
- **Database**: PostgreSQL (native `gen_random_uuid()`, ACID transactions, relational integrity, migrations). Embedded persistent PostgreSQL for zero-friction local laptop development with seamless switch to dedicated PostgreSQL clusters via `DATABASE_URL`.
- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons, React Router.
- **Security**: Server-enforced student clearance gates (`PENDING_APPROVAL`, `ACTIVE`, `REJECTED`, `SUSPENDED`), session invalidation via `token_version`, password hashing with bcrypt (cost 12).

---

## Quick Start Guide

### 1. Installation
```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Database Migration & Seeding
```bash
# Run PostgreSQL migrations (creates all 25 tables, indexes, constraints)
npm --prefix backend run migrate

# Seed default administrator account and sample pending student
npm --prefix backend run seed
```

### 3. Launch Development Servers
```bash
# Terminal 1 - Start API Server (Runs on http://localhost:5001)
npm --prefix backend run dev

# Terminal 2 - Start Frontend App (Runs on http://localhost:5173)
npm --prefix frontend run dev
```

---

## Default Test Credentials

| Role | Identifier (Phone / Email) | Password | Status |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@institute.edu` (or `+919999999999`) | `Admin@123` | `ACTIVE` |
| **Sample Student** | `+919876543210` (or `rahul.sharma@example.com`) | `Student@123` | `PENDING_APPROVAL` |

---

## Phase 1 Workflow Verification

1. **Student Registration**:
   - Navigate to `http://localhost:5173/register`.
   - Enter full name, phone number, email, and password.
   - Upon submission, account is assigned `PENDING_APPROVAL` status and redirected to `/pending-approval`:
     > *"Your registration has been submitted. Please wait for administrator approval."*

2. **Login Gate Enforcement**:
   - Attempting to log in as a pending student is rejected with HTTP 403 Forbidden (`ACCOUNT_PENDING_APPROVAL`).
   - The user cannot access student features until administrative clearance is granted.

3. **Admin Review & Approval**:
   - Sign in as administrator (`admin@institute.edu` / `Admin@123`).
   - Open **Pending Approvals** (`/admin/pending-students`).
   - Click **[Approve]**: Status transitions `PENDING_APPROVAL → ACTIVE`, welcome notification is generated, and an immutable audit log entry is recorded.
   - Or click **[Reject]** / **[Suspend]**: Status transitions accordingly and existing JWT sessions are revoked immediately.

4. **Approved Student Access**:
   - Approved student can now sign in and access the student platform at `/student/dashboard`.

---

## Running Automated Tests
```bash
npx --prefix backend tsx backend/src/tests/phase1.test.ts
```
