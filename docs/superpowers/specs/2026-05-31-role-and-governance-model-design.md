# Spec — Role + Governance Model (Sub-project A)

**Date:** 2026-05-31
**Status:** Approved (defaults locked)
**Sub-project:** A — foundational role/governance model

This is the first sub-project of a multi-spec initiative. Sub-projects B (college pages), C (inter-college competition), and D (admin placeholder pages) build on top of A.

---

## 1. Problem

The current role model has five flat values — `STUDENT | TEACHER | ADMIN | QUALITY | OWNER` — that don't reflect Zawia University's actual hierarchy:

- A real **Dean** or **Department Head** is a sitting professor with a leadership appointment, not a separate user type.
- "Admin" today is a single role with no notion of *scope* (university-wide vs college-scoped).
- "Quality" has the same scope ambiguity.
- Registration is one-size-fits-all and doesn't separate self-serve (student / professor) from invite-only (dean / dept head / admin / quality / owner).

The platform also can't answer "which faculty does this admin belong to?" — which blocks every downstream feature (per-college pages, leaderboards, scoped guards).

## 2. Goals

1. Represent academic leadership as **appointments layered on the Teacher role**, not new top-level roles.
2. Give ADMIN and QUALITY a **faculty scope** (university-wide when null, college-scoped when set).
3. Differentiate **registration flows**: self-serve for Student / Professor; invite-only for Dean / Dept Head / Admin / Quality / Owner.
4. Surface position + scope in the UI (sidebar role label, topbar scope badge).
5. Don't break existing data or routes. All new fields nullable; existing seed users still work.

Non-goals: dean/dept-head specific dashboards, scope-aware permission enforcement on every route, college pages. Those are sub-projects B/C.

## 3. Decisions (locked)

| # | Decision | Why |
|---|---|---|
| D1 | `Role` enum stays at 5 values | Leadership = layered appointment, per the user's choice |
| D2 | New `AcademicPosition` enum: `DEAN`, `ASSOCIATE_DEAN`, `DEPARTMENT_HEAD` | Three positions cover Zawia's structure |
| D3 | `TeacherProfile` gets `position`, `positionFacultyId`, `positionDepartmentId`, `appointedAt`, `termEndsAt` | Nullable; optional appointment metadata |
| D4 | `User` gets `scopeFacultyId` (nullable, FK to `Faculty`) | NULL = university-wide; set = scoped to that college (applies to ADMIN/QUALITY) |
| D5 | Self-serve registration: STUDENT, TEACHER (without position) | Reality: deans/admins are appointed, not self-registered |
| D6 | Invite-only flows: DEAN, DEPT_HEAD, ADMIN, QUALITY, OWNER | UI shows "by invitation only — contact administration" |
| D7 | `/auth/me` returns scope + position info inline | One round-trip; sidebar/topbar can render without extra fetch |
| D8 | No new `Capability` values in this sub-project | Default capability sets stay as-is; admin will grant overrides per-user |

## 4. Architecture

### 4.1 Data model

```
User
├── role: Role          (STUDENT | TEACHER | ADMIN | QUALITY | OWNER)
├── scopeFacultyId      (NEW, nullable; FK Faculty)  ← scope for ADMIN/QUALITY
└── teacherProfile
    ├── position             (NEW, nullable; AcademicPosition?)
    ├── positionFacultyId    (NEW, nullable; FK Faculty)
    ├── positionDepartmentId (NEW, nullable; FK Department)
    ├── appointedAt          (NEW, nullable)
    └── termEndsAt           (NEW, nullable)
```

Validation rules in `auth.service`:
- `DEAN` / `ASSOCIATE_DEAN` → `positionFacultyId` required
- `DEPARTMENT_HEAD` → `positionDepartmentId` required
- `position` is set only by admin endpoints, never via self-serve register

### 4.2 API contract

`POST /api/v1/auth/register` accepts:
- existing fields (role, email, password, etc.)
- the role enum is gated server-side: only `STUDENT` and `TEACHER` allowed via the public endpoint
- attempting `ADMIN` / `QUALITY` / `OWNER` returns 403 with a clear message ("by invitation only")

`GET /api/v1/auth/me` response shape grows to include:
```jsonc
{
  "id": "...",
  "role": "TEACHER",
  "scopeFacultyId": null,
  "studentProfile": null,
  "teacherProfile": {
    "departmentId": "...",
    "position": "DEAN",                 // nullable
    "positionFacultyId": "...",         // nullable
    "positionDepartmentId": null,       // nullable
    ...
  }
}
```

Admin position assignment (`PATCH /api/v1/admin/teachers/:id/position`) is **out of scope for this spec** — covered in B. For now, positions are settable only via DB / seed.

### 4.3 Frontend

- `AuthUser` extended with `scopeFacultyId?: string | null` and `position?: AcademicPosition | null`.
- `lib/nav.ts` adds `displayRoleLabel(user)` that returns e.g. `"أستاذ · عميد كلية الهندسة"`.
- `Topbar` shows a small scope badge for ADMIN/QUALITY when `scopeFacultyId` is set: `إداري كلية ·  ‹faculty name›`.
- New `RegisterPage` at `/auth/register`:
  - Step 1: role selector — two big cards (Student / Professor) + a muted "Other roles by invitation" footnote.
  - Step 2: identity (email / password / first name / last name).
  - Step 3: profile (Student → faculty + dept + univ id + year; Teacher → dept + specialty + optional position field, but the position field is *disabled with a tooltip* — set by admin only).
- `AuthPage` gets a "إنشاء حساب جديد" link below the demo buttons that routes to `/auth/register`.

## 5. Migration plan

Single Postgres migration:
1. `CREATE TYPE "AcademicPosition" AS ENUM ('DEAN', 'ASSOCIATE_DEAN', 'DEPARTMENT_HEAD');`
2. `ALTER TABLE "User" ADD COLUMN "scopeFacultyId" TEXT NULL;` + FK + index.
3. `ALTER TABLE "TeacherProfile" ADD COLUMN "position" "AcademicPosition" NULL, ADD COLUMN "positionFacultyId" TEXT NULL, ADD COLUMN "positionDepartmentId" TEXT NULL, ADD COLUMN "appointedAt" TIMESTAMP(3) NULL, ADD COLUMN "termEndsAt" TIMESTAMP(3) NULL;` + FKs + indexes.

All new columns nullable; existing rows unaffected; rollback = drop columns + enum.

## 6. Testing & verification

- TypeScript compiles cleanly: `cd frontend && npx tsc --noEmit`, `cd backend && npx tsc --noEmit`.
- Vite build succeeds: `cd frontend && npm run build`.
- Manual smoke: `/auth` still logs in demo users; `/auth/register` shows role selector and refuses `ADMIN`/`OWNER`.
- Existing e2e flows (student login → dashboard) unchanged.

## 7. Out of scope (deferred)

- Per-college routes / pages (sub-project B)
- Inter-college competition surface (sub-project C)
- Admin placeholder pages (sub-project D)
- Visual / motion polish (sub-project E)
- Position assignment admin UI (small follow-up to A; no schema change)
- Term renewal workflow (date-driven re-appointment)

## 8. Risks

- **Schema drift on Render**: the migration runs as part of the build. Verified by inspecting `render.yaml` + `migrate-deploy.mjs` — `prisma migrate deploy` is invoked on each deploy.
- **Breaking the `me` payload**: extending the response with optional fields is non-breaking. Existing frontend code that doesn't read the new fields is unaffected.
- **Seed users**: the seed predates this change; new fields default NULL → no seed changes required.
