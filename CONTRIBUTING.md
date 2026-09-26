# Team Contribution Guide — Apex Institute LMS

Welcome to the team! This document outlines how team members can set up their local environment, contribute improvements, run tests, and submit Pull Requests to the repository: **[https://github.com/SATHISH9042/ONLINE-COURSE](https://github.com/SATHISH9042/ONLINE-COURSE)**.

---

## 1. Quick Local Environment Setup

### Prerequisites
- **Node.js**: v18.x or v20.x
- **npm**: v9.x or higher
- **Git**

### Step-by-Step Setup
1. **Clone the repository**:
   ```bash
   git clone https://github.com/SATHISH9042/ONLINE-COURSE.git
   cd ONLINE-COURSE
   ```

2. **Install dependencies**:
   ```bash
   # Install backend dependencies
   cd backend && npm install

   # Install frontend dependencies
   cd ../frontend && npm install
   cd ..
   ```

3. **Initialize the Database**:
   The project includes an embedded PostgreSQL engine for zero-setup local development (no external DB installation required).
   ```bash
   # Run migrations (creates all 22 relational tables)
   npm --prefix backend run migrate

   # Seed default accounts (admin, sample student, initial courses)
   npm --prefix backend run seed
   ```

4. **Start Development Servers**:
   ```bash
   # Terminal 1: Backend API (runs on http://localhost:5001)
   npm --prefix backend run dev

   # Terminal 2: Frontend App (runs on http://localhost:5173)
   npm --prefix frontend run dev
   ```

---

## 2. Default Test Accounts

| Role | Email / Phone | Password | Status | Access |
| :--- | :--- | :--- | :---: | :--- |
| **Admin** | `admin@institute.edu` | `Admin@123` | `ACTIVE` | Full Admin Console (`/admin/dashboard`) |
| **Student** | `priya.patel@example.com` | `Student@123` | `ACTIVE` | Student Learning Portal (`/student/dashboard`) |
| **Pending** | `+919876543210` | `Student@123` | `PENDING_APPROVAL` | Demonstrates clearance lockout |

---

## 3. Recommended Git Workflow

### Branching Convention
Always create a dedicated branch from `main`:
- `feature/<feature-name>` — for new functionality (e.g., `feature/dark-mode-toggle`)
- `fix/<bug-name>` — for bug fixes (e.g., `fix/video-player-fullscreen`)
- `docs/<topic>` — for documentation updates

```bash
# 1. Fetch latest changes from main
git checkout main
git pull origin main

# 2. Create your feature branch
git checkout -b feature/your-feature-name
```

### Commit Message Format
Please use Conventional Commits:
- `feat: add certificate generator for completed courses`
- `fix: resolve mobile layout issue in live classes page`
- `docs: update API endpoints documentation`
- `test: add unit tests for code sandbox timeout`

---

## 4. Verification & Testing Before Submitting a PR

Before opening a Pull Request, verify that all builds and automated tests pass:

```bash
# 1. Run the full backend test suite (118 assertions across all 10 phases)
npm --prefix backend test

# 2. Verify frontend TypeScript build
npm --prefix frontend run build
```

---

## 5. Submitting Your Pull Request (PR)

1. Push your branch to GitHub:
   ```bash
   git push -u origin feature/your-feature-name
   ```
2. Navigate to **[https://github.com/SATHISH9042/ONLINE-COURSE/pulls](https://github.com/SATHISH9042/ONLINE-COURSE/pulls)**.
3. Click **New Pull Request** and select your branch.
4. Fill in the PR description:
   - What changes were made?
   - How did you verify the changes?
   - Any screenshots or recordings (if frontend UI changes were made).
5. Request a review from team members!

---

## 6. Coding Standards & Architectural Guidelines

- **Security First**:
  - Never trust client input — validate using Zod schemas on the backend.
  - Never concatenate user strings into raw SQL — always use parameterized queries (`$1, $2, ...`).
  - Keep sensitive secrets in `.env` files (never commit real credentials).
- **Frontend Architecture**:
  - Use React 18 functional components with TypeScript and Tailwind CSS.
  - Use icons from `lucide-react`.
  - Reusable components belong in `frontend/src/components/common/`.
- **Database Architecture**:
  - Relational schema changes must be documented in `backend/src/database/schema.sql` and run through migrations.

Happy coding!
