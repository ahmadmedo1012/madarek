# Contract — Onboarding & Milestone State Machines

**Phase**: 1 | **Branch**: `012-design-graphics-uplift`

## Surface

Two short-lived presentation flows that fire once per scope per user, backed by columns on `User` (see `data-model.md`):

1. **Onboarding** — single 4-frame illustrated flow (3 generic + 1 role-intro). Per Q3, runs once for every user including pre-existing ones, on first sign-in after release.
2. **Milestones** — three named events (`first-assignment-complete`, `first-course-complete`, `exam-window-opens`). Each fires once per user (the exam-window milestone is keyed per window).

This document defines the state machines, the trigger sources, and the three new backend endpoints.

---

## 1. Onboarding state machine

### States

```
[CompletedAtNull]            -- never run for this user
  │
  ├─ user lands on dashboard
  ▼
[Frame0 → Frame1 → Frame2 → Frame3]
  │      │       │       │
  │      └─ user clicks Skip on any frame ──────┐
  │                                              ▼
  └─ user finishes Frame3 ──────────────────→ POST /me/onboarding/complete
                                                 │
                                                 ▼
                                        [CompletedAtSet]   (terminal)
                                                 │
                                                 └─ replay-from-help re-renders the flow
                                                    WITHOUT any backend call
```

### Triggers

| Trigger | When | Action |
|---------|------|--------|
| Auto-mount | First authenticated dashboard render where `me.onboardingCompletedAt === null` | Mount `<OnboardingFlow />` after first paint |
| Skip | Skip button on any frame | Advance to terminal; call `complete` endpoint |
| Finish | Continue button on Frame 3 | Advance to terminal; call `complete` endpoint |
| Replay | Help / settings menu | Mount `<OnboardingFlow isReplay />` regardless of column |
| Sign-out | Any | Tear down (no state change) |

### Frame composition

| Frame | Illustration | Copy key | Has skip? |
|-------|--------------|----------|-----------|
| 0 | `onboarding-frame-1` | `onboarding.frame1.headline` + `…body` | yes |
| 1 | `onboarding-frame-2` | `onboarding.frame2.*` | yes |
| 2 | `onboarding-frame-3` | `onboarding.frame3.*` | yes |
| 3 | `onboarding-role-intro` (role-aware) | `onboarding.roleIntro.{role}.*` | yes |

The role-intro frame swaps illustration + copy by `me.role`. There are 7 copy variants (one per role).

---

## 2. Milestone state machine

### States per milestone id

```
[Absent in firedMilestones[]]
  │
  ├─ trigger condition observed by backend service hook
  ▼
[fireMilestone(userId, id)]      -- internal helper, atomic
  │
  ├─ id NOT yet present → array_append + return { fired: true, alreadyFired: false }
  └─ id already present → no-op + return { fired: false, alreadyFired: true }

[Present in firedMilestones[]]   (terminal per id)
  │
  └─ frontend mounts <MilestoneScene id=… /> ONCE for newly added id
```

### Triggers

| Milestone | Server-side condition | Hook location |
|-----------|----------------------|---------------|
| `first-assignment-complete` | `Submission.status` first transitions to `SUBMITTED` for this user | `submissions.service.submit()` |
| `first-course-complete` | `Enrollment.status` first transitions to `COMPLETED` for this user | `enrollments.service.complete()` |
| `exam-window-opens:<windowId>` | An `ExamWindow` enters its open period AND user is enrolled in its course offering AND `exam-window-opens:<windowId>` is not yet in `firedMilestones` | `exam-window.cron.tick()` (existing) |

### Frontend trigger detection

`useMilestone()` hook subscribes to `me.firedMilestones` updates from the existing `me` query. When the array gains a new ID and that ID has not been "presented" in this session (tracked in a Set in memory), the matching `<MilestoneScene id=… />` is mounted, plays once for `--dur-emphasized-in + 1000ms hold + --dur-standard-out`, then unmounts.

---

## 3. Backend endpoints

### `POST /api/v1/me/onboarding/complete`

Marks onboarding complete for the current user.

**Request body**: empty.

**Response 200**

```json
{
  "onboardingCompletedAt": "2026-06-02T17:42:00.000Z"
}
```

**Idempotent**: if `onboardingCompletedAt` is already set, returns the existing timestamp (no overwrite).

**Auth**: required. **Errors**: 401 if unauthenticated.

**Audit log**: `{ actor, action: 'onboarding.complete', resource: 'me', timestamp }`.

---

### `POST /api/v1/me/milestones/:id/fire`

Used by **internal service hooks only** — not exposed to client SPAs. Authentication is server-to-server (an internal service token is required; client requests with a user JWT receive 403).

**Path param**: `id` matches `^(first-assignment-complete|first-course-complete|exam-window-opens:[a-zA-Z0-9_-]+)$`.

**Request body**:

```json
{ "userId": "ckxyz..." }
```

**Response 200**

```json
{
  "fired": true,            // false if it was already in firedMilestones
  "firedMilestones": ["first-assignment-complete", "exam-window-opens:abc123"]
}
```

**Idempotent**: yes. Atomicity: `UPDATE "User" SET "firedMilestones" = array_append("firedMilestones", $1) WHERE id = $2 AND NOT ($1 = ANY("firedMilestones"))` returning the new array.

**Audit log**: `{ actor: 'service:<service>', action: 'milestone.fire', resource: 'user/<id>', timestamp, payload: { milestoneId } }`.

---

### `GET /api/v1/me` (existing — extended)

The existing `/me` payload is extended to include the four design-uplift fields:

```json
{
  "id": "...",
  "role": "STUDENT",
  // ...existing fields...
  "themePreference": "SYSTEM",
  "themePreferenceUpdatedAt": "...",
  "onboardingCompletedAt": null,
  "firedMilestones": []
}
```

This is the read source for the SPA — no separate read endpoint for these fields is added.

---

## 4. Frontend hooks

### `useOnboardingState()`

```ts
interface OnboardingHook {
  shouldAutoStart: boolean        // me.onboardingCompletedAt === null
  isOpen: boolean                 // currently mounted
  currentFrame: 0 | 1 | 2 | 3
  isReplay: boolean
  open(opts?: { replay?: boolean }): void
  next(): void
  skip(): void
  finish(): void
}
```

`skip()` and `finish()` both call `POST /me/onboarding/complete` (when `!isReplay`).

### `useMilestone()`

```ts
interface MilestoneHook {
  pendingScene: MilestoneId | null  // newly-added id not yet presented this session
  dismissPending(): void             // marks presented locally
}
```

The hook tracks a session Set of "already presented" IDs to prevent re-firing on remounts within the same session.

---

## 5. Failure / offline behaviour

| Condition | Behaviour |
|-----------|-----------|
| `complete` endpoint fails (5xx) | Local state advances to terminal; queued retry up to 3× with backoff. Onboarding will re-auto-start on next sign-in if all retries fail. |
| Service hook fails to fire a milestone | Queued for retry on next service tick; idempotent re-tries are safe. |
| User skips onboarding while offline | Local advance; queued `complete` request flushes on reconnect. |
| Milestone arrives while user is in onboarding | The milestone scene queues until onboarding is dismissed. |

---

## 6. Test surface

| Test | What it asserts |
|------|-----------------|
| `onboarding.contract.test.ts (backend)` | `complete` is idempotent; second call returns same timestamp. |
| `milestones.contract.test.ts (backend)` | `array_append` is atomic; concurrent fires of same id result in one entry. |
| `onboarding.test.tsx (frontend)` | Auto-mounts when `onboardingCompletedAt === null`; does NOT auto-mount when set. |
| `onboarding.test.tsx: replay does not call backend` | Replay flag bypasses the API call. |
| `onboarding.test.tsx: role-intro frame uses correct copy variant` | Mock role → asserts i18n key resolves to the role-specific bundle. |
| `milestones.test.tsx: pending scene fires once` | Two `me.firedMilestones` updates with same id → one scene mount. |
| `milestones.test.tsx: scenes queue while onboarding is open` | Combined flow integration. |
