# Data Model — Platform Completeness Uplift

**Branch**: `011-platform-completeness-uplift` | **Date**: 2026-06-02 | **Plan**: [`plan.md`](./plan.md)

This file documents only the **deltas** to the existing Prisma schema (`backend/prisma/schema.prisma`) introduced by spec 011. The base schema (60+ models, see `DATA-MODEL.md` at repo root) is preserved unchanged. Decisions in this file flow from Phase 0 research (R-001..R-008) and the spec's clarifications.

---

## Additions

### `NotificationPreference` (new model)

Per-user, per-category notification channel preferences. Backs FR-024.

```prisma
model NotificationPreference {
  id        String  @id @default(cuid())
  userId    String
  category  NotificationCategory
  inApp     Boolean @default(true)   // active in v1
  email     EmailDigestCadence @default(OFF)  // UI-visible, channel deferred
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, category])
  @@index([userId])
}

enum NotificationCategory {
  LECTURE_UPLOAD
  ASSIGNMENT_DUE_SOON
  GRADE_POSTED
  ANNOUNCEMENT
  EXAM_SCHEDULED
  RESEARCH_REVIEWED
  MENTION
}

enum EmailDigestCadence {
  DAILY
  WEEKLY
  OFF
}
```

**Validation rules**:

1. A user may have at most one row per `(userId, category)` pair (enforced by `@@unique`).
2. Missing rows default to `inApp = true`, `email = OFF` at read time — clients never see "null preferences."
3. Mutating `email` is allowed and persisted, but the v1 backend ignores the value at delivery time and only emits in-app notifications. Per Clarification 2, the channel is deferred but the preference UI is functional.

**Lifecycle**:

1. Created on first explicit user toggle of any category.
2. Updated on each toggle.
3. Cascaded delete on user deletion.

**Indexing**:

1. Primary key `id`.
2. `@@unique([userId, category])` — supports the upsert path used by the preferences API.
3. `@@index([userId])` — supports loading the full preference set for a user in one query.

---

### `User.locale` (new column)

User's UI language preference. Backs FR-038, FR-039, FR-041 (US7).

```prisma
model User {
  // ...existing fields...
  locale    Locale  @default(AR)
  // ...existing fields...
}

enum Locale {
  AR  // Arabic, dir=rtl (default)
  EN  // English, dir=ltr
}
```

**Validation rules**:

1. Default `AR` for every existing and newly-created user. Migration backfills `AR` for all rows.
2. The frontend may transiently override the persisted value via `?lang=` query string (for share-link scenarios) without writing it; only an explicit toggle from the LocaleSwitcher persists.
3. Locale is **not** a content language — content stays in its original language regardless of `User.locale` (FR-041).

**Lifecycle**:

1. Set to `AR` on user create.
2. Updated by `PATCH /api/v1/me/locale`.
3. No deletion semantics — the column is non-nullable.

**Indexing**:

1. None. The column is read alongside the rest of the `User` row on session hydration; no analytical query is expected to filter by locale.

---

### `User.rememberMeUntil` (new column, nullable)

Records the absolute expiry of a "remember me" refresh-cookie session, so the server can re-issue refresh tokens with the matching long lifetime on rotation. Backs FR-001 + R-007.

```prisma
model User {
  // ...existing fields...
  rememberMeUntil DateTime?
  // ...existing fields...
}
```

**Validation rules**:

1. `null` means standard 7-day refresh cookie.
2. Non-null means 30-day refresh cookie, refreshed on each rotation up to this absolute deadline.
3. On `POST /api/v1/auth/login` with `rememberMe: true`, set to `now() + 30 days`. On any standard `POST /api/v1/auth/login`, set to `null`. On `POST /api/v1/auth/logout`, set to `null`.

**Lifecycle**:

1. Set / cleared by login flows; cleared on logout; expires naturally as the timestamp passes (rotation will then issue a 7-day refresh and clear the column on next login).
2. No delete semantics — column is nullable.

---

### Search index columns on indexed entities

Backs FR-019 + R-004. The columns store the canonical Arabic-normalized form of the entity's primary search field, populated on create/update via a Prisma client extension. Three entities receive the column.

```prisma
model Course {
  // ...existing fields (titleAr, titleEn, code, ...)...
  searchableNormalized String?
  @@index([searchableNormalized])
}

model Faculty {
  // ...existing fields (nameAr, nameEn, slug, ...)...
  searchableNormalized String?
  @@index([searchableNormalized])
}

model Lecture {
  // ...existing fields (title, ...)...
  searchableNormalized String?
  @@index([searchableNormalized])
}
```

A migration adds the columns, populates them by running each entity's primary search text through the canonical normalizer (`backend/src/modules/search/normalize.ts`), and creates a trigram GIN index per column:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX course_search_trgm    ON "Course"   USING gin (searchable_normalized gin_trgm_ops);
CREATE INDEX faculty_search_trgm   ON "Faculty"  USING gin (searchable_normalized gin_trgm_ops);
CREATE INDEX lecture_search_trgm   ON "Lecture"  USING gin (searchable_normalized gin_trgm_ops);
```

**Validation rules**:

1. The column is computed and never directly user-writable.
2. Always lowercased + NFC + diacritic-free + alif/hamza/yaa/taa-marbuta folded; see `contracts/search.md` for the canonical algorithm.
3. Populated transactionally with the source field — if any normalization step fails, the create/update fails.

**Lifecycle**:

1. Backfilled by migration.
2. Recomputed on every Prisma `create` / `update` of the entity via the client extension.

---

## Modifications

### `Notification` (existing model — no shape change)

The existing `Notification` model already covers `URGENT/ACADEMIC/SYSTEM/SOCIAL` categories with read tracking. No schema changes are needed; spec 011 only changes:

1. **Transport**: SSE stream replaces 60-second polling (R-006). No model column changes.
2. **Filtering**: delivery now respects `NotificationPreference.inApp`; if a preference row exists for the recipient with `inApp = false` for the matching category, the row is **not** persisted (and therefore not delivered).
3. **Categorization mapping**: existing `Notification.category` enum values map to the new `NotificationCategory` enum used by `NotificationPreference`. Mapping table is in `contracts/notifications.md`.

---

## Relationships

```
User ──1:N─→ NotificationPreference     (cascade delete)
User ──1:N─→ Notification                (existing)
User ──*1*─→ Locale                      (column, not relation)
User ──*0..1*─→ rememberMeUntil          (column, not relation)
Course   ──*1*─→ searchableNormalized    (column)
Faculty  ──*1*─→ searchableNormalized    (column)
Lecture  ──*1*─→ searchableNormalized    (column)
```

No new join tables. No new cross-domain relations. The schema delta is intentionally minimal.

---

## Migration plan

1. **Migration `011_user_locale_remember.sql`**: add `User.locale` (default `AR`, not null) and `User.rememberMeUntil` (nullable). Backfill `AR` for all existing rows. Both are `ALTER TABLE ADD COLUMN` operations safe for online migration.
2. **Migration `011_notification_preference.sql`**: create `NotificationPreference` table + `NotificationCategory` and `EmailDigestCadence` enums. No backfill — preferences are created lazily on first toggle.
3. **Migration `011_search_normalized.sql`**: add `searchable_normalized` columns to `Course`, `Faculty`, `Lecture`; enable `pg_trgm` extension; create three GIN indexes; backfill via a one-shot Node script (`backend/scripts/backfill-search-normalized.ts`) that pages through each entity in batches of 1,000, computing the normalized form. The script is idempotent and can be re-run.

All three migrations are additive and reversible. Each ships in its own commit so it can be reverted independently if needed.

---

## State transitions

The only new state in this feature is `User.rememberMeUntil`:

```
[null]  ──login(rememberMe=true)──→  [now + 30d]
[null]  ──login(rememberMe=false)──→ [null]   (no transition; remains null)
[T]     ──refresh-rotation──→        [T]      (preserved; cookie re-issued with same Max-Age)
[T]     ──logout──→                  [null]
[T]     ──time passes T──→           [null effectively] (refresh cookie expired; next login resets)
```

No other state machines are introduced.

---

## Constraints summary

| Constraint | Mechanism |
|---|---|
| One preference row per (user, category) | `@@unique` |
| Locale is `AR` for legacy users | Migration backfill |
| Search normalized column always in sync | Prisma client extension on create/update + idempotent backfill script |
| Remember-me lifetime cap | Cookie `Max-Age` + `User.rememberMeUntil` |
| Step-up auth window | `pwd_at` JWT claim, no schema change (R-007) |
| Public Oasis demo not persisted | Endpoint does not write to `AiConversation` (R-005) |

---

## What this feature does NOT change

1. The 60+ existing models including `Course`, `Faculty`, `Lecture`, `Enrollment`, `Assignment`, `Submission`, `Grade`, `Notification` shape, exam models, social models, library models, gamification, AI conversations, owner panel models — unchanged.
2. Existing enums (`Role`, exam statuses, attendance statuses, badge rarities, etc.) — unchanged.
3. Existing relations and foreign keys — unchanged.
4. Existing seed data — unchanged.
