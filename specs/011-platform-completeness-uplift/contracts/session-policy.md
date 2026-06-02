# Contract — Session Policy: Remember-Me & Step-Up Re-Authentication

**Endpoint group**: `/api/v1/auth/*`
**Auth**: mixed — see per-endpoint notes.
**Backs**: FR-001 + Clarification 4 + R-007.

---

## Reconciliation summary

The existing JWT auth contract is preserved unchanged at the operational layer:

1. Access token: 15-minute lifetime, sent as `Authorization: Bearer`.
2. Refresh token: http-only cookie `mdrk_refresh`, scoped to `/api/v1/auth`, rotated on every refresh, `SameSite=Lax`.
3. Argon2id password hashing.
4. Account lockout after 5 failed logins for 15 minutes.

Spec 011 changes only:

1. Adds an opt-in `rememberMe` flag at login that sets the refresh-cookie `Max-Age` to 30 days instead of 7.
2. Adds a `pwd_at` claim to access tokens recording the epoch second of the last interactive password verification.
3. Adds a `POST /api/v1/auth/step-up` endpoint that re-runs password verification and re-issues the access+refresh pair with a fresh `pwd_at`.
4. Adds a `403 STEP_UP_REQUIRED` response code that sensitive routes return when `pwd_at` is older than 30 minutes.

---

## `POST /api/v1/auth/login`

**Body**:

```json
{
  "email": "student@uoz.edu.ly",
  "password": "***",
  "rememberMe": false
}
```

`rememberMe` is optional; default `false`.

**Response 200** (cookies set, body returned):

```json
{
  "data": {
    "user": { "id": "ckxxx", "email": "...", "role": "STUDENT", "locale": "AR" },
    "accessToken": "eyJ...",
    "expiresIn": 900,
    "rememberMe": false
  }
}
```

**Cookies set**:

```
Set-Cookie: mdrk_refresh=<token>;
            HttpOnly; Secure; SameSite=Lax;
            Path=/api/v1/auth;
            Max-Age=604800   ← if rememberMe=false
            Max-Age=2592000  ← if rememberMe=true
```

**Side effects**:

1. `User.rememberMeUntil` set to `now() + 30 days` if `rememberMe=true`, else `null`.
2. `LoginEvent` row written (existing behavior).
3. Access token JWT payload includes `pwd_at: <now epoch seconds>`.

**Errors** (existing behavior preserved): `INVALID_CREDENTIALS` 401, `ACCOUNT_LOCKED` 423, `RATE_LIMITED` 429.

---

## `POST /api/v1/auth/refresh`

Existing endpoint, augmented:

1. The new access token's `pwd_at` claim is **carried over** from the previous access token (not refreshed by token rotation). Only `POST /auth/login`, `POST /auth/step-up`, and `POST /auth/password/change` produce a fresh `pwd_at`.
2. The new refresh cookie's `Max-Age` is computed as: `min(7 days, User.rememberMeUntil - now())` if `rememberMeUntil` is set, else `7 days`. This means a 30-day remember-me session keeps issuing 30-day refreshes until the absolute deadline; a non-remember session always issues 7-day refreshes.

**Response shape**: unchanged.

---

## `POST /api/v1/auth/step-up`

New endpoint. Re-verify the user's password and re-issue auth tokens with a fresh `pwd_at`.

**Auth required**: yes (Bearer access token).

**Body**:

```json
{ "password": "***" }
```

**Response 200**:

```json
{
  "data": {
    "accessToken": "eyJ...",
    "expiresIn": 900,
    "pwdAt": 1717340000
  }
}
```

`Set-Cookie: mdrk_refresh=...` is also rotated.

**Errors**:

| Code | Meaning |
|---|---|
| `INVALID_CREDENTIALS` (401) | Password did not match. Counts toward the existing failed-login lockout. |
| `RATE_LIMITED` (429) | Capped at 5 step-up attempts/minute per user (defensive). |
| `ACCOUNT_LOCKED` (423) | Same lockout policy as login. |

**Side effects**:

1. `LoginEvent` row written with `kind = STEP_UP` (new enum value, additive).
2. `AuditLog` row `{ action: "STEP_UP", route: <originating route header>, success: true|false }`.

---

## `POST /api/v1/auth/logout`

Existing endpoint, augmented:

1. Sets `User.rememberMeUntil = null`.
2. Bumps `User.tokenVersion` (existing behavior — invalidates all refresh tokens for this user).
3. Clears the `mdrk_refresh` cookie.

---

## Step-up gate (server-side enforcement)

Sensitive routes are tagged in the route table with a `requiresStepUp: true` flag. The middleware that runs after the standard auth middleware checks:

```ts
if (route.requiresStepUp && (Date.now() / 1000 - decoded.pwd_at) > 1800) {
  return res.status(403).json({ error: { code: 'STEP_UP_REQUIRED' } });
}
```

**Sensitive route inventory** (v1):

| Method + path | Reason |
|---|---|
| `POST /api/v1/exams/attempts` (start an attempt) | Active exam page entry |
| `POST /api/v1/exams/attempts/:id/answer` | Mid-exam answer submission |
| `POST /api/v1/grades` (teacher) | Grade entry |
| `PATCH /api/v1/grades/:id` (teacher) | Grade revision |
| `POST /api/v1/auth/password/change` | Self-service password change |
| `PATCH /api/v1/me` (changing email or role-relevant fields) | Account-settings change |
| `DELETE /api/v1/me/sessions/:id` (future) | Active-session revocation |

The list is non-exhaustive and additive — new sensitive routes register the flag at definition time. The list is reviewed in code review whenever a new sensitive route is added.

---

## Step-up gate (client-side handling)

The axios response interceptor in `frontend/src/lib/api.ts` adds a branch:

```ts
if (response.status === 403 && response.data?.error?.code === 'STEP_UP_REQUIRED') {
  const password = await openStepUpModal();
  await api.post('/auth/step-up', { password });
  return api.request(originalConfig);  // retry once
}
```

The `<StepUpModal>` is a global, focus-trapping, Esc-dismissable dialog that captures the password, posts to `/auth/step-up`, and resolves the original request. On dismissal without entry, the original request resolves with the original 403 so the calling component can show its own error UI.

---

## Remember-me UX

The login form gains a single checkbox below the password field:

```
[ ] ابقني مسجَّل الدخول لمدة ٣٠ يومًا
[ ] Keep me signed in for 30 days
```

Default: unchecked. The label is keyed at `auth.remember_me` (see `locale.md`). Selecting it sends `rememberMe: true` on the next login post.

The user-perceived behavior:

1. **Without remember-me**: refresh cookie expires after 7 days of activity (rotated each refresh, but absolute lifetime preserved by reading `rememberMeUntil`). Closing the browser does **not** sign out — the cookie is persistent, not session.
2. **With remember-me**: refresh cookie expires 30 days after the last login or 7 days after the last activity, whichever is later, capped at the absolute `rememberMeUntil` deadline. After 30 days of total inactivity, re-login required.

---

## Test surface

1. Login without remember-me → cookie `Max-Age` is 604800.
2. Login with remember-me → cookie `Max-Age` is 2592000; `User.rememberMeUntil` set to now+30d.
3. Refresh after 1 day with remember-me active → new cookie `Max-Age` is `~29 days` (capped at 7d but enforced by `min(7d, rememberMeUntil - now)` = 7 days here; carry-over `rememberMeUntil` keeps cycle going).
4. Sensitive route 30 minutes after login → returns `403 STEP_UP_REQUIRED`.
5. Sensitive route within 30 minutes of login → succeeds.
6. `POST /auth/step-up` with correct password → sensitive route now succeeds for 30 more minutes.
7. `POST /auth/step-up` with wrong password 5 times in 15 minutes → `ACCOUNT_LOCKED`.
8. Logout → `rememberMeUntil = null`, `tokenVersion` bumped, `mdrk_refresh` cleared.
9. Step-up modal flow (frontend integration test): triggering a sensitive route opens the modal, password entry resolves the route's original promise.

---

## Backwards compatibility

1. Existing tokens issued before this feature ships do not carry `pwd_at`; the gate treats `pwd_at = undefined` as "infinitely stale" and forces step-up on first sensitive-route call after the deploy. Acceptable: the affected user simply re-enters their password once.
2. Existing refresh cookies remain valid; they simply do not have remember-me semantics until the user logs in again.
3. The existing `LoginEvent.kind` enum is additive (`STEP_UP` value added) — Prisma migration handles it as an enum value addition, no rewrites needed.
