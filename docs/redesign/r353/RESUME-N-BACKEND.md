# R353 LANE N — backend push record (Task 2-a, branch `wip/r353-n-push`, base 7268672)

Short English record of the decisions + evidence. The owner-facing page is
`docs/PUSH-FIREBASE-CHECKLIST.md` (Arabic). Mobile-side work is another
agent's lane (`apps/mobile/**` untouched here).

## What landed

1. **PUSH_ENABLED default TRUE** (`src/env.ts`) — `z.coerce.boolean()`
   semantics kept; the comment now documents the trap honestly: unset →
   true, any non-empty string ('false', '0') → also true; the
   dark-launch spelling is `PUSH_ENABLED=""`.
2. **Receipts processing** (`src/modules/notifications/push.ts`) — ok
   ticket ids are collected into a receipt→device map, then fetched via
   `expo.getPushNotificationReceiptsAsync` (chunked with
   `chunkPushNotificationReceiptIds`); a `DeviceNotRegistered` RECEIPT
   prunes the device (merged with ticket-stage finds, deduped); other
   receipt errors log a warning; the whole pass sits in its own
   try/catch — it never throws and never undoes ticket-stage pruning.
   Best-effort: receipts are fetched ONCE right after the send, so slow
   verdicts (Expo says receipts can lag) are missed — the next event's
   attempt covers them. No persistence, deliberately.
3. **Per-user push preferences + quiet hours**:
   - `prisma/schema.prisma`: `NotificationPreference` gains
     `pushEnabled Boolean @default(true)`, `quietStart Int?`,
     `quietEnd Int?` (UTC hours 0–23).
   - Migration **`20261116090000_r353_n_push_prefs`** — hand-written
     (the `20261114200000_r353_e2_staff_roles` style), additive, no
     backfill needed (absent row = ON). **NOT applied**: the ambient
     DATABASE_URL points at production Neon; only `npx prisma generate`
     was run (schema-only, safe).
   - `fanOutPush`: ONE batched `notificationPreference.findMany`
     (`userId in (…), category = payload.type`) before the send; a user
     is dropped when `pushEnabled=false` OR the current UTC hour is
     inside their quiet window. Absent row = ON. A failed preference
     read fails CLOSED (the outer catch aborts the fan-out — a DB hiccup
     must not push at users who asked for silence). The bell inbox row
     is the caller's write and is never affected.
4. **Quiet-hours semantics** (pure `isQuietHour` in `core.ts`):
   half-open `[start, end)` in UTC hours — `end` itself is NOT quiet;
   wrap-around (start > end, e.g. 22→6) covers start..23 and 0..end−1;
   `start === end` is an EMPTY window ([x, x) — muting is what
   `pushEnabled=false` is for); a half-set window (one end null) is
   inactive. Every branch is unit-pinned.
5. **Collapse keys, honestly**: the brief said expo-server-sdk lacks
   `collapseKey` (true — that is raw FCM's name) and prescribed
   subtitle+stable link instead. The installed **expo-server-sdk@8.0.0
   `ExpoPushMessage` actually HAS `collapseId`** (verified in
   `node_modules/expo-server-sdk/build/ExpoClient.d.ts`; Expo maps it to
   Android's collapse key / iOS `apns-collapse-id`). So messages now
   carry `collapseId: \`${type}:${link}\`` (the category+link dedupe
   key), `subtitle: payload.type`, `priority: 'high'` only for URGENT,
   and the stable `data.link`. `_contentAvailable` is deliberately NOT
   set — every message here is a visible notification, not a silent
   background update (documented in the code).
6. **GET/PUT `/me/push-preferences`** (`src/http/routes/push.routes.ts`)
   — same law as the mail twins in me.routes.ts (R350 E6): the 4
   categories (URGENT/ACADEMIC/SYSTEM/SOCIAL) with absent = ON; PUT is
   a strict body `{category, pushEnabled, quietStart?, quietEnd?}`
   (hours int 0–23), full-state semantics (an absent quiet field
   CLEARS it — the mail PUT's contract). No "essential" carve-out:
   push is the tap on the shoulder, never the surface of record — the
   bell inbox row is written regardless of any preference.
7. **Assignment-due reminders** (`src/scheduler.ts`): the sweep
   (`sendAssignmentDueReminders`) was MAIL-ONLY — no Notification rows,
   no push (the brief suspected a missing push call; in fact BOTH the
   bell row and the push were missing). Now every active unsatisfied
   student gets a `Notification` row (new
   `assignmentDueReminderPayload` in core.ts — 'تذكير بتسليم تكليف',
   ACADEMIC, link `/student/assignments`) + `fanOutPush([id], payload)`
   (best-effort, never throws, preference-gated inside), INCLUDING
   students without a deliverable email; the mail path is unchanged
   (own outbox dedupeKey). Dedupe for the bell: title+body are a pure
   function of (title, dueAt), so repeat sweeps (cold-start boots,
   overlapping ticks) collapse via a `findFirst` — same law as the
   mail's dedupeKey, expressed on the payload. The return shape grew
   to `{ assignments, queued, bells }`.
8. **`docs/PUSH-FIREBASE-CHECKLIST.md`** — the owner's Arabic ONE-pager
   (Firebase project → Android app `ly.madarek.mobile` →
   google-services.json → service-account JSON key → send both to the
   agent), built on the verified facts: no FCM v1 credentials on the
   Expo project (`androidFcm: null` via the Expo GraphQL API), no
   google-services.json in the repo, no `googleServicesFile` in
   app.config.ts.

## Evidence

- `tests/modules/notifications-push.test.ts` — NEW, **15 tests**
  (receipts fetch/prune/log/failure-never-undoes, ticket-stage law,
  one-batched-query, pushEnabled=false skip, quiet-hours skip +
  half-set-window + all-muted, message contract incl. collapseId,
  PUSH_ENABLED=false no-op, never-throws).
- `tests/modules/r326-client-errors-push.test.ts` — 15 → **22 tests**
  (GET/PUT /me/push-preferences: 401s, defaults, merge, upsert args,
  full-state clear, 6-refusal validation matrix).
- `tests/modules/notifications-core.test.ts` — 8 → **15 tests**
  (isQuietHour every branch, PUSH_CATEGORIES, reminder payload purity
  + truncation).
- `tests/modules/scheduler-mail.test.ts` — 7 → **9 tests** (bell rows +
  fanOutPush for email-less students, payload dedupe on repeat sweeps;
  existing expectations updated for `bells`).
- `npx tsc --noEmit -p tsconfig.json` → exit 0;
  `npx tsc --noEmit -p tsconfig.test.json` → exit 0.
- Full backend suite (`npx vitest run`): green — see the commit body
  for the exact count.

## Found already wired (vs the brief's assumptions)

- `/me/push-devices` (POST/GET/DELETE) existed since r326 — untouched.
- The reminder flow did NOT create Notification rows (the brief asked
  to "verify the flow creates Notification rows AND calls fanOutPush;
  if the push call is missing, wire it" — the rows were missing too);
  both are wired here.
- `collapseKey` is absent from the SDK, but `collapseId` is present —
  used the real field instead of subtitle-only.

## Deviations from the brief (with reasons)

- `src/scheduler.ts` edited (not on the scope list): requirement 6
  lives there; the change is the minimal wiring (payload builder +
  import + loop restructure) with everything else owned by the scoped
  files.
- Receipts are fetched immediately after the send (no delay/retry
  queue): the tick system stores only tick-slot bookkeeping; a receipt
  retry queue would be new infrastructure the brief did not ask for —
  documented as best-effort in push.ts.
- `expect(...)` on `fanOutPush` in scheduler tests uses the module
  mock (vi.mock of push.js) — keeps that suite focused on the
  scheduler's contract; the fan-out itself has its own suite.
