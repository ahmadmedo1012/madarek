# Madarek Mobile — مدارك

Native Arabic-first (RTL) mobile app for the Madarek education platform,
built with **Expo SDK 58 / React Native 0.88.1 / expo-router / TypeScript**,
wired to the live production API.

```
API   https://madarek.onrender.com/api/v1
App   ly.madarek.mobile · slug madarek-mobile
EAS   project afc4265f-664e-4325-a0ff-b621b81fe1b0 (account: rh2011)
```

## Quick start

```bash
cd apps/mobile
npm ci                 # independent lockfile — NOT part of the root workspace
npm run start          # Expo dev server (dev-client build on device/emulator)
npm run typecheck      # tsc --noEmit (strict)
npm run lint           # expo lint
npm run contract-check # static API-parity gate vs ../../backend source
```

`.env` (all values are public config — no secrets ever live in the bundle):

```
EXPO_PUBLIC_API_BASE_URL=https://madarek.onrender.com/api/v1
```

## Where things live

| Area | Location |
|---|---|
| Routes (file-based, deep-linkable) | `app/**` — `app/(role)/**` role homes, `app/student/**`, `app/teacher/**`, `app/admin/**`, `app/quality/**`, `app/owner/**`, public pages at the root |
| Typed API layer (one file per backend family) | `src/api/*.ts` — `client.ts` is the transport (Bearer + manual `mdrk_refresh` cookie replay + single-flight refresh + normalized Arabic errors) |
| Auth & institution context | `src/auth/session.ts` (Zustand + SecureStore) |
| Design system | `src/design/{tokens,fonts,theme}.tsx` + primitives in `src/components/ui/**` (FROZEN — see `docs/CONTRACTS.md`) |
| App chrome | `src/components/shell/**` (top bars, tabs, feedback sheet host) |
| Feature surfaces | `src/features/**` (ai, messages, notifications, student, teacher, governance…) |
| Hooks | `src/hooks/**` (institution scope, notifications, query helpers) |
| Format utils (RTL digits, Africa/Tripoli dates) | `src/lib/format.ts` — every user-facing number goes through `latn()/num()/pct()` |
| Icons & splash | `assets/images/**` — regenerate from the brand mark via `npm run icons` |
| Docs | `docs/feature-parity.md` (the acceptance matrix), `docs/CONTRACTS.md` (agent file ownership), `docs/push-backend-proposal.md` |

## Roles & institution context

Five platform roles (STUDENT, TEACHER, ADMIN, QUALITY, OWNER) plus academic
positions (dean, associate dean, department head). `useSession()` exposes
the active institution; **every institution-scoped TanStack Query key is
suffixed via `useInstitutionScope()`** so switching institution never serves
cross-context caches. Route groups under `app/**` mirror the web paths so
`madarek://` deep links resolve to the same destinations as web routes.

## Backend contract

- Success `{ data, meta? }` · errors `{ error: { code, message, details? } }`
- `POST /auth/login|register|select-institution` respond with
  `Set-Cookie: mdrk_refresh=…` — the native client captures the value and
  replays it manually (httpOnly is a browser constraint, not a transport one).
- Access tokens are 15-min JWTs; refresh is single-flight; logout, password
  change, and reset bump `tokenVersion` → hard session clear on the client.

**Drift gate:** `npm run contract-check` statically extracts every endpoint the
app consumes and every route the backend source registers, then diffs them
(method + path, parameter-name agnostic). It caught 7 real drifts on its first
run (notifications path, theme verb, chapter mutations, a nonexistent
`GET /admin/users/:id`) — run it in CI or before any merge touching
`src/api/**` or `backend/src/http/routes/**`.

## EAS — build, update, and what needs a rebuild

`eas.json` (authoritative): profiles `development` (dev-client APK),
`preview` (internal-distribution **APK**, channel `preview`), and
`production` (AAB, channel `production`). All embed
`EXPO_PUBLIC_API_BASE_URL` from the profile env.

```bash
npx eas build -p android --profile preview   # installable APK
npx eas update --channel preview             # OTA (JS-only changes)
```

| Change | Delivery |
|---|---|
| JS/TS screens, styles, API wiring | EAS Update (OTA) is sufficient |
| New native module / `app.config.ts` plugin, icon, splash, permissions | **requires a new build** |
| `expo-notifications` wiring (still gated on the backend proposal) | **requires a new build** |

Never put `EXPO_TOKEN` (or any secret) in `EXPO_PUBLIC_*` — it is injected by
the CI/CLI environment, not the bundle.

## Synchronizing with `origin/main`

The website evolves continuously. Isolation rules:

1. `git fetch origin main` and merge into `feat/mobile-expo` — the merge is
   safe by construction because the mobile app owns `apps/mobile/**` and the
   web owns everything else; resolve conflicts **without** reverting upstream
   web/backend changes.
2. Re-run `npm run typecheck && npm run contract-check` in `apps/mobile`
   — the contract gate flags any endpoint/verb the backend removed or moved.
3. Check `docs/feature-parity.md` rows for features the backend changed and
   update statuses honestly (✅ / 🧩 / 🔗 / ⚠️ / 🚫 — never upgrade a status
   without evidence).
4. When a reconciliation needs a JS change only, ship it via
   `eas update --channel preview`; native-affecting changes need a preview
   rebuild before the production channel moves.

## Honest limits (current)

- Remote push is **not implemented** — the backend has no device-token
  model; see `docs/push-backend-proposal.md` for the additive contract.
- The AI assistant's "suggest" surfaces are the backend's own template
  simulation, disclosed in-app as «محاكاة».
- PDF review annotation parity is read/annotate via the built-in viewer;
  drawing-grade ink parity remains a web capability.
