# Contract — Theme State (`useTheme` hook + persistence)

**Phase**: 1 | **Branch**: `012-design-graphics-uplift`

## Surface

`frontend/src/lib/theme.ts` exports a `useTheme()` hook backed by a Zustand store and a small persistence engine. It is the single source of truth for the active theme, the user's stored choice, the resolved value applied to `<html data-theme>`, and the contrast-more state.

---

## API

```ts
type ThemeChoice = 'light' | 'dark' | 'system'
type ThemeResolved = 'light' | 'dark'

interface ThemeAPI {
  /** what the user explicitly chose */
  choice: ThemeChoice
  /** what is currently applied to <html data-theme> */
  resolved: ThemeResolved
  /** OS-level prefers-contrast: more */
  prefersContrastMore: boolean
  /** set the user's choice; persists locally and (if authenticated) to the profile */
  setChoice(next: ThemeChoice): void
  /** internal — listens for OS changes to recompute resolved when choice === 'system' */
  _osWatcher(): void
}

declare function useTheme(): ThemeAPI
```

`setChoice` is synchronous to local effects (the `<html data-theme>` flip happens within the same animation frame); the profile sync is fire-and-forget — failures do not block the local update.

---

## Persistence engine

| Layer | Key / column | Trigger |
|-------|--------------|---------|
| In-memory (Zustand) | — | App lifetime |
| localStorage | `madarek.theme` ∈ `{light, dark, system}` | On every `setChoice` |
| Backend | `User.themePreference` enum + `User.themePreferenceUpdatedAt` | On `setChoice` if authenticated |

### Sync-on-sign-in algorithm (R-002)

```text
function syncOnSignIn(local: ThemeChoice, profile: ThemeChoice, profileTs: Date) {
  // local does not have its own timestamp; we treat 'changed locally just now' if it differs from profile
  const localTs = readLocalTs() // stored alongside madarek.theme as madarek.theme.ts

  if (profile === 'SYSTEM' && local !== 'system') {
    pushToProfile(local)
    return local
  }
  if (local === 'system' && profile !== 'SYSTEM') {
    pullToLocal(profile)
    return profile
  }
  if (local === profile.toLowerCase()) return local
  // last-write-wins
  return localTs > profileTs ? (pushToProfile(local), local)
                              : (pullToLocal(profile), profile)
}
```

`readLocalTs` reads `madarek.theme.ts` (Number timestamp). `setChoice` writes both keys atomically. Missing-timestamp legacy entries are treated as `0` — profile wins.

---

## OS watcher

```ts
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', () => {
    if (state.choice === 'system') recomputeResolved()
  })
window.matchMedia('(prefers-contrast: more)')
  .addEventListener('change', e => state.prefersContrastMore = e.matches)
```

The contrast watcher does NOT change `data-theme` — it only updates store state for any consumer that needs to know (e.g., `<Illustration>` may pick a heavier stroke variant).

---

## Backend endpoints

### `GET /api/v1/me/theme`

Returns the stored preference for the current authenticated user.

**Response 200**

```json
{
  "themePreference": "SYSTEM",        // "LIGHT" | "DARK" | "SYSTEM"
  "themePreferenceUpdatedAt": "2026-06-02T17:30:12.000Z"
}
```

**Auth**: required (any role). **Errors**: 401 if unauthenticated.

### `PUT /api/v1/me/theme`

**Request body**

```json
{ "themePreference": "DARK" }
```

Validation: `z.enum(['LIGHT', 'DARK', 'SYSTEM'])`.

**Response 200**

```json
{
  "themePreference": "DARK",
  "themePreferenceUpdatedAt": "2026-06-02T17:35:21.123Z"
}
```

**Side effects**: writes both columns atomically. Audit log entry: `{ actor, action: 'theme.update', resource: 'me', timestamp, payload: { themePreference } }`.

**Errors**:
- 400 — invalid enum value.
- 401 — unauthenticated.
- 500 — DB write failure (client retries up to 2× with backoff before surfacing).

---

## Failure / offline behaviour

| Condition | Behaviour |
|-----------|-----------|
| User toggles theme while offline | Local layer updates immediately; profile push is queued and retried by the `me` mutation queue on reconnect. |
| Profile push fails (5xx) | Toast: "Theme synced locally, will sync to your account shortly." Retried up to 2× with backoff; persisted in queue beyond that. |
| Profile fetch fails on sign-in | Local value remains canonical; profile sync deferred until next successful `me` request. |
| `localStorage` unavailable (private browsing) | Hook falls back to in-memory store; profile (if available) becomes canonical; toast informs user persistence is disabled. |

---

## Test surface

| Test | What it asserts |
|------|-----------------|
| `theme.test.ts: respects stored localStorage on init` | Pre-paint script + hook hydrate the same value. |
| `theme.test.ts: 'system' mirrors prefers-color-scheme` | OS toggle flips `data-theme` without explicit user action. |
| `theme.test.ts: setChoice updates html attribute synchronously` | Same animation frame as the call. |
| `theme.test.ts: sync-on-sign-in adopts profile when local is default` | The empty-local case from R-002. |
| `theme.test.ts: sync-on-sign-in pushes local when profile is SYSTEM` | The empty-profile case. |
| `theme.test.ts: sync-on-sign-in last-write-wins on conflict` | The conflict case using mock timestamps. |
| `theme.contract.test.ts (backend)` | `PUT /me/theme` rejects invalid enums; `GET /me/theme` returns 401 unauthenticated. |
