# Mobile auth (Expo / React Native) — bearer-token guide

Audience: the owner's **Expo mobile client**. Everything below is verified
against the live dev backend (`http://localhost:4000`, seeded
`madarek_dev` database) — every response block is a **real captured
response**, trimmed only by omitting long array contents.

The wire contract is **additive-only** for mobile clients: fields are never
renamed or removed; new fields may appear at any level of a response.
This is enforced by `backend/tests/contract/api-contract.test.ts` against
the committed snapshot, and published as machine-readable
[OpenAPI 3.1](./openapi.json) (`npm run api:openapi` at the repo root).

---

## 1. Base conventions

| Aspect | Value |
|---|---|
| Base path | `http://localhost:4000/api/v1` (dev) — every endpoint lives under `/api/v1` |
| Success envelope | `{ "data": … }` — list endpoints add `"meta"` (`{ page, limit, total, totalPages, … }`) |
| Error envelope | `{ "error": { "code", "message", "details?" } }` — `message` is human Arabic (render it verbatim), `code` is an UPPER_SNAKE machine discriminator you can branch on |
| Content type | `application/json` (except the AI stream — §7) |

## 2. Token model (exact, from `backend/src/modules/auth` + `src/lib/jwt.ts`)

| | Access token | Refresh token |
|---|---|---|
| Format | JWT **HS256** (algorithm pinned on both sides) | JWT **HS256** |
| TTL | **15 minutes** (`env.jwtAccessTtl`) | **7 days** (`env.jwtRefreshTtl`) |
| Claims | `{ sub: userId, role, inst: institutionId\|null, type: 'access' }` | `{ sub: userId, ver: tokenVersion, type: 'refresh' }` |
| Transport | JSON body (`data.accessToken`) **and** used via `Authorization: Bearer` | **`Set-Cookie` only** — `mdrk_refresh=<jwt>; Max-Age=604800; Path=/api/v1/auth; HttpOnly; SameSite=Strict` (+`Secure` in production) |

**The one thing a native client must know:** the refresh token is **not**
in the login/refresh JSON body. It arrives exclusively in the
`Set-Cookie` response header. Expo's `fetch` exposes it
(`response.headers.getSetCookie()`), so:

1. after every successful `login` / `refresh`, extract the `mdrk_refresh`
   cookie value from `Set-Cookie` and persist it (SecureStore / Keychain —
   it is a 7-day credential);
2. on `POST /api/v1/auth/refresh`, send it back yourself as a raw header:
   `Cookie: mdrk_refresh=<jwt>`.

There is **no body-field and no query-parameter fallback** for the refresh
token today — the endpoint reads `req.cookies.mdrk_refresh` and nothing
else (verified in `auth.routes.ts`). This is the main honest gap for
mobile; see §8.

## 3. Login — `POST /api/v1/auth/login`

Body: `{ "email": string, "password": string, "institutionSlug"?: string }`.

The `email` field accepts **either** an email address (contains `@`) **or**
a university registration number (e.g. `UZ-2024-00001`). A reg-number
registered in several institutions answers `400 REG_NUMBER_AMBIGUOUS`
until you pass `institutionSlug` (demo institution: `madarek-demo`) — both
behaviors verified live below. Failures are timing-equalized; 5 wrong
passwords lock the account for 15 minutes (`429`).

```bash
curl -s http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"student@test.ly","password":"12345678"}'
```

Real response (HTTP 200, trimmed):

```json
{
  "data": {
    "user": {
      "id": "cmvuov7m40025wigns9b44lcy",
      "email": "student@test.ly",
      "role": "STUDENT",
      "firstName": "…", "lastName": "…",
      "avatarColor": "…", "avatarInitials": "…",
      "themePreference": "light",
      "memberships": [ { "institutionId": "…", "slug": "madarek-demo", "role": "MEMBER", "isActive": true, "…": "…" } ],
      "currentInstitution": { "id": "…", "name": "جامعة مدارك التجريبية", "nameEn": "Madarek Demo University", "slug": "madarek-demo" },
      "membershipRole": "MEMBER"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ…"
  }
}
```

…plus the response header (exact, dev):

```
Set-Cookie: mdrk_refresh=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXZ1b3Y3bTQwMDI1d2lnbnM5YjQ0bGN5IiwidmVyIjowLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc5MzM2MzYyMiwiZXhwIjoxNzkzOTY4NDIyfQ.E0vWrwqYruqWr7DPlwRGEjWHfNFliBmNbXX8TNH3ZFc; Max-Age=604800; Path=/api/v1/auth; Expires=Fri, 06 Nov 2026 12:33:42 GMT; HttpOnly; SameSite=Strict
```

Reg-number variant (verified, HTTP 400 without the slug → then 200 with it):

```bash
# 400 first — the number is seeded in more than one institution:
curl -s http://localhost:4000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"UZ-2024-00001","password":"12345678"}'
# → {"error":{"code":"REG_NUMBER_AMBIGUOUS","message":"الرقم الجامعي مسجّل في أكثر من مؤسسة — سجّل الدخول بالبريد الإلكتروني أو حدّد المؤسسة"}}

# 200 with disambiguation:
curl -s http://localhost:4000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"UZ-2024-00001","password":"12345678","institutionSlug":"madarek-demo"}'
# → {"data":{ "user": { "email": "student@test.ly", "role": "STUDENT", "…": "…" }, "accessToken": "…" }}
```

## 4. Calling authenticated endpoints — `Authorization: Bearer`

Send `Authorization: Bearer <accessToken>` on every authenticated call.
Verified (`GET /api/v1/auth/me`, trimmed):

```bash
curl -s http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
# HTTP 200 → {"data":{ "id":"cmvuov7m40025wigns9b44lcy", "email":"student@test.ly",
#   "role":"STUDENT", "memberships":[…], "currentInstitution":{…}, "studentProfile":{…}, "…":"…" }}
```

**401 semantics — branch on `error.code`:**

| Code | Meaning | Client action |
|---|---|---|
| `TOKEN_EXPIRED` | access token passed its 15-min TTL | call `/auth/refresh` (§5), then retry once |
| `UNAUTHENTICATED` | missing/garbage token **or revoked session** | treat as hard logout → login screen |

Verified with a garbage token:

```bash
curl -s http://localhost:4000/api/v1/auth/me -H "Authorization: Bearer bogus.token.here"
# → {"error":{"code":"UNAUTHENTICATED","message":"جلسة غير صالحة — سجّل الدخول من جديد"}}  (HTTP 401)
```

(`TOKEN_EXPIRED` is wired in `src/http/middleware/auth.ts` — distinct code
so clients can auto-refresh; the wire example above shows the
`UNAUTHENTICATED` branch. The refresh endpoint itself answers
`UNAUTHENTICATED` for a revoked session — see §6.)

## 5. Refresh — `POST /api/v1/auth/refresh`

Sends **no body**; authenticates with the `mdrk_refresh` **cookie header**
you persisted. Auth-surface rate limit: 10 req / 15 min / IP, and
**successful refreshes are not counted** — only replay/abuse is.

Verified:

```bash
curl -s http://localhost:4000/api/v1/auth/refresh \
  -X POST \
  -H "Cookie: mdrk_refresh=<the-jwt-from-Set-Cookie>"
# HTTP 200 (trimmed):
# {"data":{ "user": { "id":"cmvuov7m40025wigns9b44lcy", "email":"student@test.ly", "role":"STUDENT", "…":"…" },
#           "accessToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6Ik…" }}
# …and a FRESH Set-Cookie: mdrk_refresh=… — persist it again.
```

### Rotation semantics — EXACTLY what the code does (D3 policy)

Read from `modules/auth/rotation.ts` + `auth.service.ts#refreshTokens`:

- **Sliding session, NOT one-time-use rotation.** A normal refresh re-issues
  access + refresh tokens at the **same `tokenVersion`** (`ver`). The
  refresh decision is: user exists → user active → `user.tokenVersion === ver`
  → issue; anything else → 401.
- **Why:** `tokenVersion` is a single user-level counter shared by all
  devices; bumping it on every refresh would kill every other device's
  7-day session within one access TTL. Multi-device survival wins.
- **The previous refresh token stays valid until its own 7-day expiry** —
  there is no blacklist / RefreshToken table (honest tradeoff documented in
  the code). Treat the newest cookie as canonical; nothing breaks if an old
  one replays within its TTL.
- **Revocation events bump `tokenVersion` atomically** (conditional
  `updateMany`): logout, password change, role change, deactivation. A
  refresh with a pre-bump token then fails with
  `UNAUTHENTICATED` / «انتهت صلاحية هذه الجلسة…» — verified in §7 (logout).
- The institution context (`inst` claim) is **re-resolved from the DB at
  every mint** (login/refresh): one active membership → auto-selected;
  zero or several → `null` and the client must call
  `POST /auth/select-institution` (bearer) to pick one.

## 6. Logout — `POST /api/v1/auth/logout`

Works with **either** credential: a Bearer access token, or just the
refresh cookie (for the expired-access case). Answers **204 No Content**,
clears the cookie, and revokes **every** refresh token of the user
(all devices) via the tokenVersion bump.

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" -o /dev/null -w '%{http_code}\n'
# → 204
```

Verified — after logout, the previously captured refresh cookie is dead:

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/refresh \
  -H "Cookie: mdrk_refresh=<cookie-captured-before-logout>"
# → {"error":{"code":"UNAUTHENTICATED","message":"انتهت صلاحية هذه الجلسة — سجّل الدخول من جديد"}}  (HTTP 401)
```

## 7. Streaming (SSE) — `POST /api/v1/ai/chat?stream=1`

The AI assistant streams Server-Sent Events. The SAME endpoint serves both
grammars: `?stream=1` (or `Accept: text/event-stream`) streams; without it
you get the historical JSON envelope. Auth is the standard
`Authorization: Bearer` header + JSON body `{ "message": string,
"conversationId"?: string }`.

**EventSource cannot be used on native** — it is GET-only, cannot set
headers, and cannot POST a body. There is **no query-param token
fallback** in the backend (the auth middleware reads the Authorization
header only — verified in `src/http/middleware/auth.ts`). The supported —
and web-frontend-proven — pattern is **`fetch` + ReadableStream reader**,
which works fine in Expo and happily sends Bearer headers:

```ts
const res = await fetch(`${API}/ai/chat?stream=1`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ message }),
});
const reader = res.body!.getReader(); // parse "event:|data:" frames incrementally
```

Verified live (trimmed — the frames arrived incrementally, `Content-Type:
text/event-stream; charset=utf-8`):

```
event: token
data: {"t":"سأساعدك بكل تأكيد. لكن "}

event: token
data: {"t":"قبل ذلك:\n\n"}
…
event: done
data: {"conversationId":"cmvuyepva002…","messageId":"…","reply":"…full text…","engine":"local","model":"gap-aware-composer","inputTokens":0,"outputTokens":0,"citations":[],"remaining":24}
```

Three frame kinds: `token` (`{"t": "…"}` text deltas), `done`
(`{ conversationId, messageId, reply, engine, model, inputTokens,
outputTokens, citations[], remaining? }` — `reply` is the server's own
accumulated full text: replace your buffer with it; `remaining` is the
quota left, omitted when the quota store was unavailable), and `error`
(UPPER_SNAKE code + Arabic message + `retryable` — emitted mid-stream
because SSE headers are already sent; no HTTP error status is possible
once streaming started).

**CORS note for native clients:** CORS is a *browser*-enforced mechanism —
the backend's `CORS_ORIGINS` allow-list (and `credentials: true`) only
constrains web views. A native Expo client (no browser origin) can send
`Authorization` / `Cookie` headers to `localhost:4000` without any CORS
pre-flight; nothing to configure server-side. (If the client ever renders
authed content in a WebView, that WebView DOES need the origin allow-listed
in `CORS_ORIGINS`.)

## 8. Honest gaps & coverage notes

- **Refresh token is cookie-only** (§2/§5). Workable on native (persist the
  `Set-Cookie` value, send `Cookie:` manually), but a body-field
  (`{ refreshToken }`) or `Refresh-Token:` header option would be more
  idiomatic for mobile. Not present in the code today.
- **No `TOKEN_EXPIRED` wire sample above** — the code path is verified in
  `src/http/middleware/auth.ts`, but minting a genuinely expired token
  requires the server's JWT secret; the captured 401 shows the
  `UNAUTHENTICATED` branch instead.
- **EventSource / EventSourcePolyfill**: unusable for `/ai/chat?stream=1`
  (POST + Bearer header + JSON body). Use fetch+reader (§7). No
  query-token fallback exists.
- **SSE route is NOT in the contract snapshot** — each call consumes the
  student's daily AI-question quota and writes conversation rows to the DB;
  the suite deliberately avoids that side effect. The JSON
  `POST /ai/chat` grammar IS covered by the OpenAPI document (247
  operations, 212 paths) even where the snapshot only pins 13 of them.
- **Role/capability gates are not modelled per-operation** in openapi.json
  (the generator's `x-generator.securityHeuristic` says exactly this) —
  for which endpoints a STUDENT may call, read
  `docs/API-REFERENCE.md` + the route sources (`requireRole` /
  `requireCapability` inline in `backend/src/http/routes/*.ts`).
- Rate limits a mobile client should respect: global **1000 req / 15 min /
  IP**; auth surface (**login, register, refresh, change-password**) and
  AI chat have their own tighter limiters (10 / 15 min / IP — failures
  only for the auth ones). Handle `429` with the envelope's Arabic
  message.

## 9. Quick checklist for the Expo client

1. Login → keep `data.accessToken` (memory) + `mdrk_refresh` cookie value (SecureStore).
2. Every call: `Authorization: Bearer <accessToken>`.
3. On `401 TOKEN_EXPIRED` → `POST /auth/refresh` with the persisted `Cookie:` header → persist the NEW cookie + token → retry the original call once.
4. On `401 UNAUTHENTICATED` (or refresh 401) → drop to login screen.
5. Multi-institution users: `data.currentInstitution === null` → call `POST /auth/select-institution` with the chosen `institutionId`.
6. Chat streaming: fetch + reader, never EventSource.
7. Never parse Arabic `error.message` for control flow — branch on `error.code`.
