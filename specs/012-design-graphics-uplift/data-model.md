# Phase 1 Data Model — Design, Theming & Graphics Uplift

**Branch**: `012-design-graphics-uplift` | **Date**: 2026-06-02

This feature adds three columns to one existing table (`User`). It introduces no new tables. It defines several frontend-only state shapes used by the theme hook, illustration component, onboarding flow and milestone scenes.

---

## Backend — Prisma schema additions

### `User` (extend existing model)

Three columns are added; nothing existing is changed.

```prisma
model User {
  // … existing columns …

  // 012-design-graphics-uplift additions
  themePreference          ThemePreference @default(SYSTEM)
  themePreferenceUpdatedAt DateTime        @default(now())
  onboardingCompletedAt    DateTime?
  firedMilestones          String[]        @default([])
}

enum ThemePreference {
  LIGHT
  DARK
  SYSTEM
}
```

#### Field reference

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `themePreference` | `ThemePreference` (enum) | `SYSTEM` | Authenticated-user theme choice. `SYSTEM` defers to OS / browser. |
| `themePreferenceUpdatedAt` | `DateTime` | `now()` | Last-write-wins tiebreak for the local↔profile sync. Updated atomically with `themePreference`. |
| `onboardingCompletedAt` | `DateTime?` | `null` | Set when the 4-frame onboarding flow completes or is skipped. `null` means it has not run for this user. |
| `firedMilestones` | `String[]` | `[]` | Append-only array of milestone IDs already fired for this user. Entries: `first-assignment-complete`, `first-course-complete`, or `exam-window-opens:<windowId>`. |

#### Validation rules

- `themePreference`: enum constraint enforced at DB level. The API also validates against `z.enum(['light','dark','system'])` at the boundary and case-converts to the DB enum.
- `firedMilestones`: write path uses `array_append` to avoid races. Duplicate IDs are silently ignored at the API layer (idempotent fire).
- `onboardingCompletedAt`: write-once semantics — set on first completion or skip; "replay from help" does NOT clear or update this column.

#### State transitions

```
themePreference     SYSTEM → LIGHT | DARK | SYSTEM (any → any, validated)
onboardingCompletedAt   null → DateTime (one-way; never returns to null)
firedMilestones[id]     absent → present (one-way per id)
```

#### Migration plan

A single Prisma migration `20260602xx_design_uplift_state` adds the four fields above. All existing rows receive `themePreference = SYSTEM`, `themePreferenceUpdatedAt = now()`, `onboardingCompletedAt = null`, `firedMilestones = []` — the defaults satisfy this automatically.

For pre-existing users, `onboardingCompletedAt = null` is the intended state per the Q3 clarification — the flow runs once on their next sign-in after release.

#### Index considerations

None required. None of the new columns are queried by anything except the owning user's session, which already loads by primary key.

---

## API surface — `/api/v1/me/*` extensions

The three columns are read via the existing `/api/v1/me` payload and written via three small endpoints under `/api/v1/me/*`. Full request/response shapes are in `contracts/onboarding-milestone.md` (for milestones + onboarding) and `contracts/theme-state.md` (for theme).

---

## Frontend — runtime state shapes

These shapes live entirely in the SPA and never round-trip to the backend.

### `Theme` (token consumer state)

```ts
type ThemeChoice = 'light' | 'dark' | 'system'   // user choice
type ThemeResolved = 'light' | 'dark'             // applied to <html data-theme>
type Direction = 'ltr' | 'rtl'                    // from i18n

interface ThemeState {
  choice: ThemeChoice                             // mirrors localStorage / profile
  resolved: ThemeResolved                         // computed from choice + OS pref
  prefersContrastMore: boolean                    // from media query
  contextRole?: Role                              // sets [data-role]
  contextCollegeAccent?: string                   // sets --college-accent (hex), already contrast-gated
}
```

State transitions:
- `choice` changes → `resolved` is recomputed → `<html data-theme>` is reassigned.
- `prefersContrastMore` changes → no token reassignment, the CSS `@media` block handles it.
- `contextRole` / `contextCollegeAccent` changes → the corresponding attribute / variable is reassigned on the relevant DOM scope (page-level), not the document root.

### `IllustrationProps`

```ts
type IllustrationName =
  | 'homepage-hero'
  | 'error-404'
  | 'empty-notifs'
  | 'empty-search'
  | 'milestone-section'
  // onboarding sequence — 4 frames; the role-intro frame swaps copy/illustration by role
  | 'onboarding-frame-1'
  | 'onboarding-frame-2'
  | 'onboarding-frame-3'
  | 'onboarding-role-intro'

interface IllustrationProps {
  name: IllustrationName
  role?: Role          // only meaningful for 'onboarding-role-intro'
  decorative?: boolean // when true, hidden from accessibility tree (default: false)
  altKey?: string      // i18n key for alt text (required when decorative !== true)
  className?: string
}
```

The component reads `[data-theme]` and `dir` from the document at render time. No props for theme — the SVG body uses CSS variables, so theme changes require no React re-render.

### `OnboardingState`

```ts
interface OnboardingState {
  // Source of truth: server (User.onboardingCompletedAt)
  isCompleted: boolean
  // UI-local
  currentFrame: 0 | 1 | 2 | 3   // 0..2 generic, 3 role-intro
  isReplay: boolean              // true when user opened from help
}
```

Lifecycle:
1. On first authenticated dashboard mount, if `!isCompleted`, the flow auto-starts at `currentFrame: 0`.
2. Skip OR finish (advance past frame 3) → `POST /me/onboarding/complete` → server sets `onboardingCompletedAt`. Local cache invalidates the `me` query.
3. Replay from help → `isReplay: true` and `currentFrame: 0`; on completion, no API call (column already set).

### `MilestoneEvent`

```ts
type MilestoneId =
  | 'first-assignment-complete'
  | 'first-course-complete'
  | `exam-window-opens:${string}`   // suffix is exam-window id

interface MilestoneEvent {
  id: MilestoneId
  firedAt: string                  // ISO (server-stamped)
  alreadyFired: boolean             // true if this id was a no-op (idempotent)
}
```

Lifecycle:
1. Backend service hook detects the trigger condition.
2. Backend calls its own internal helper `fireMilestone(userId, milestoneId)` which `array_append`s and returns whether the ID was newly added.
3. Frontend `useMilestone` polls `me.firedMilestones` after relevant mutations (assignment submit, enrollment update, exam page load) and presents `<MilestoneScene />` once for any newly-added ID.

---

## Relationships

```
User (1) ──< Submission (existing) ─→ trigger 'first-assignment-complete'
User (1) ──< Enrollment (existing) ─→ trigger 'first-course-complete'
User (1) ──< Enrollment (existing) ──< CourseOffering ──< ExamWindow (existing)
                                                       └→ trigger 'exam-window-opens:<id>'
```

No new relations are introduced. Existing FK constraints carry through.

---

## Data volume / scale assumptions

- `User`: same scale as today (~10k users target per Madrak constitution).
- `firedMilestones`: bounded at 2 + N where N is the count of exam windows a user has opened (typically ≤ 20 over a degree). Max array length expected ≤ 50; well under any Postgres array performance threshold.
- `themePreference` writes: rare (a user toggles theme infrequently). No write-amplification concern.
- `onboardingCompletedAt` writes: exactly once per user.

---

## Compliance notes (Constitution §VII)

- New columns store presentation preferences only — no PII, no academic record.
- API audit logging includes the actor (user id), action (`theme.update` / `onboarding.complete` / `milestone.fire`), resource (`me`), and timestamp — same standard as the existing `/me` mutations.
- All write endpoints validate input via `zod` at the API boundary; the DB enum constraint is the second layer of defence.

---

## Phase 1 status

Data model complete. Contracts referenced above are in `contracts/`. Phase 2 (`/speckit-tasks`) consumes this document plus the contracts.
