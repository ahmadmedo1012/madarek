# mk-ill — Illustration & State-Graphics Kit (Agent I handoff)

> Branch `redesign/illustrations` (from origin/main). The kit is
> **fully additive** — 18 new files + 1 CSS sheet + this doc; zero
> edits to any existing file. Nothing imports it yet by design: wiring
> is Agent Z's integration step, specified exactly below.

## 1) What ships

An original two-colour state-illustration family for the Superlist-era
redesign — React SVG components, tokens only, no text inside any
piece, every piece direction-neutral (composed centred or
mirror-symmetric, so RTL needs no mirroring logic anywhere).

**Family grammar** (what makes them read as one family):

| Axis | Rule |
|---|---|
| Canvas | square `viewBox="0 0 200 200"`, content inside a ~20u safe margin |
| Ink | `var(--ill-stroke)` — strokes only; weights **1.5** (detail) and **2** (hero outline), round caps + round joins |
| Signal | fills `var(--accent)` (always with an ink outline); signal-as-line uses `var(--accent-ink)` (luminous `#8E9BFF` on dark) |
| Tint | **at most one** per piece: `var(--accent-soft)` or `var(--ill-paper)` — never both hue-tinted beyond that |
| Ghost | one dotted vocabulary: `strokeDasharray="0.1 7"` + round caps + `strokeOpacity ≤ 0.55` — the kit's signature for «not there yet» |
| Motif | one four-point sparkle path (concave quadratics through centre) reused for insight/missing/break |
| Corners | rx 6/7/8/9/10/14 in-canvas, echoing the shipped radius ladder |
| Gold | `--gold`/`--gold-ink`/`--gold-soft` in **`achievement` only** (r197 gold discipline); that piece carries no ink/signal at all |
| Theme | zero raw colours; light/dark/`prefers-contrast: more` adapt purely via the token cascade (dark: strokes lighten via `--ill-stroke`, signal lines glow via `--accent-ink`) |
| Text | none — Arabic/Latin labels come from the UI around the piece |

## 2) Files (all new)

```
frontend/src/components/illustrations/
├── names.ts                  # MK_ILLUSTRATION_NAMES + MkIllustrationName
├── Illustration.tsx          # <Illustration> dispatcher (lazy per piece)
├── BrandLoader.tsx           # <BrandLoader> accessible loading mark
└── pieces/                   # 16 pieces, one default-exported component each
    ├── empty-list.tsx          ├── offline.tsx
    ├── empty-search.tsx        ├── forbidden.tsx
    ├── empty-notifications.tsx ├── not-found.tsx
    ├── empty-library.tsx       ├── success-submitted.tsx
    ├── empty-research.tsx      ├── exam-complete.tsx
    ├── empty-courses.tsx       ├── achievement.tsx        (gold)
    ├── empty-community.tsx     ├── welcome-first-run.tsx
    ├── error-generic.tsx       └── server-waking.tsx
frontend/src/styles/illustrations.css     # kit sheet (sizes + loader motion)
docs/redesign/handoff/illustrations.md    # this file
```

## 3) Exact usage

```tsx
import { Illustration } from '../../components/illustrations/Illustration';
import { BrandLoader } from '../../components/illustrations/BrandLoader';

<Illustration name="empty-library" />                        // decorative: aria-hidden
<Illustration name="not-found" size={180} />                 // explicit square edge
<Illustration name="server-waking" title="الخادم يستيقظ" />   // labelled: role="img"

<BrandLoader label="جارٍ التحميل…" />                          // role="status" + caller's Arabic label
<BrandLoader label="…نجهّز لوحتك" size={40} />
```

Props of `<Illustration>`:

| Prop | Type | Notes |
|---|---|---|
| `name` | `MkIllustrationName` | required; the 16 names in §5 |
| `size?` | `number` | square edge in px, sets `--mk-ill-size`; authored range **120–220** |
| `title?` | `string` | Arabic string; presence promotes the piece to `role="img"` |
| `decorative?` | `true` | default. `decorative={false}` **requires** `title` (type-level; an unnamed `role="img"` is a contract violation) |
| `className?` | `string` | appended after the kit classes |

The wrapper renders `<div class="mk-ill illustration" data-mk-ill={name}>`.
The **legacy `illustration` class is deliberate**: it keeps the
token-system's `prefers-contrast: more` stroke lift (tokens.css)
and `.state-illustration` slot sizing (components.css) applying to
kit pieces for free. It is safe to drop at integration — `mk-ill`
styles are self-sufficient — but keeping it costs nothing.

`<BrandLoader>` props: `label: string` (required), `size?: number`
(default 32; legible 20–64), `className?: string`. Motion: one
signal-arc orbit per `var(--t-cinema)` on `var(--ease-linear)` (the
sanctioned constant-speed easing), ink dot breathing on
`var(--t-slower)`/`var(--ease-soft)`; under reduced motion it rests
as its complete static frame (verified in a real browser: two frames
identical).

## 4) Wiring into EmptyState (the minimal change for Agent Z)

Current primitive (`components/primitives/States.tsx`) already has an
`illustration?: IllustrationName` slot, but its type points at the
**legacy 012 registry** (`lib/illustrations`). Two options:

**Option A — coexistence (zero-risk, recommended first step).**
Leave the legacy slot alone. Add a second optional prop that accepts a
rendered kit piece, and render it in the same `state-illustration`
well:

```tsx
// States.tsx — EmptyState props
mkIllustration?: React.ReactNode;
```
```tsx
{mkIllustration ? (
  <div className="state-illustration" aria-hidden>{mkIllustration}</div>
) : illustration ? ( /* legacy path unchanged */ ) : ( /* icon path unchanged */ )}
```
Call sites then pass:
```tsx
<EmptyState mkIllustration={<Illustration name="empty-library" />} … />
```
(For `ErrorState`/`PermissionDeniedState`, the same one-prop pattern
applies; the 403 branch should use `forbidden`, the 404 branch
`not-found`.)

**Option B — name-based (only after all legacy scenes retire).**
Re-point the `illustration?:` prop type to
`MkIllustrationName` (from `components/illustrations/names`) and swap
the inner `<Illustration>` import to the kit dispatcher
(`components/illustrations/Illustration`). The prop stays
string-keyed, so ~50 call-site names map 1:1 per §5. Do this in one
commit; the legacy registry dies with it.

**Do not import pieces directly.** The dispatcher is the public API;
it gives a11y, sizing, and per-piece lazy chunks for free.

## 5) Mapping table — routes/states → illustration names

| Surface / state (App.tsx family) | `name` | Notes |
|---|---|---|
| Any list/ledger empty (student/teacher/admin tables) | `empty-list` | generic honest-empty |
| Library filtered/no results (`/student/library`, `/teacher/library` — 4B) | `empty-search` | replaces legacy `empty-search` scene |
| Search-no-results (GlobalSearch palette, filter bars) | `empty-search` | |
| Notifications panel empty (`NotificationDropdown` — 1B) | `empty-notifications` | replaces legacy `empty-notifs` |
| Courses/catalog empty (`/student/courses`, `/student/catalog` — 4A) | `empty-courses` | |
| Research cycle empty (`/student/research`, `/teacher/research` — 4B) | `empty-research` | |
| Community/training empty (`/community`, `/training`, `/achievements` — 4E) | `empty-community` | |
| Generic section error, request failed (ErrorState default — all families) | `error-generic` | broken-connection motif |
| Network offline / fetch refused (ErrorState network branch) | `offline` | |
| 403 surfaces (`PermissionDeniedState`, quality guard — 4C/4D/4E) | `forbidden` | |
| 404 route (`/404`, catch-all `*` — 4E) + ErrorState 404 branch | `not-found` | replaces legacy `error-404` |
| Form/submission success (research submit, exam hand-in, settings saves) | `success-submitted` | |
| Exam attempt finished (`ExamTakerPage` completion — 4C) | `exam-complete` | |
| Badges/streaks/leaderboard moments (`/achievements`, gamification — 4E) | `achievement` | the ONLY gold piece |
| Onboarding first frame (`OnboardingFlow` frame 0 — 4A) | `welcome-first-run` | |
| Render cold-start (backend waking; slow first API response ≥ a few seconds) | `server-waking` | pair with `BrandLoader` while `/api/v1/health` is pending |

**BrandLoader belongs to**: `LoadingState` (minimal/inline variants),
page-level `Suspense` fallbacks, and the `server-waking` moment. Its
`label` is always the surface's own Arabic phrase — never a generic one.

## 6) Sizing, budget, measured impact

- Each piece loads as **its own Vite chunk** (dispatcher uses
  `lazy(() => import('./pieces/<name>'))`), so a page mounting one
  illustration downloads exactly one piece.
- Measured on the production build (`npm run build -w frontend`,
  gzip -9): pieces **437–541 B gz each (avg ≈ 0.48 KB)** — the whole
  16-piece set ≈ **7.7 KB gz**, inside the ≤30 KB budget with room to
  spare; kit CSS ≈ **0.4 KB gz**.
- Wired impact measured with the dispatcher temporarily imported into
  `NotFoundPage` (local-only experiment, reverted): total bundle
  643.2 KB gz vs 635.0 unwired (**+8.2 KB**, ceiling 650), entry
  chunk unchanged at 71.1 KB (ceiling 80). When Agent Z wires the
  dispatcher into the main chunk (via EmptyState), expect **≈ +2–3 KB
  on the entry** (dispatcher + CSS + lazy plumbing) and pieces
  staying in on-demand chunks.

## 7) Verification done

- **Visual**: every piece rendered at 120/160/220 px on card
  surfaces, light + dark, in a real Chromium (local harness, outside
  the repo, never committed); two weak pieces found and fixed
  (offline cloud re-drawn as a two-bump silhouette; achievement
  ribbons re-set as a rosette's 5/7-o'clock tails). Screenshots
  reviewed by the author agent.
- **Motion**: BrandLoader verified animated in-browser; with
  `reducedMotion: 'reduce'` two frames are byte-identical (static
  rest state).
- **Gates (all green)**: `npm run lint` (0 errors; the 19 documented
  warnings only) · `npm run typecheck` · `npm test` (frontend 1971 ✓,
  backend 1783 ✓) · `check-colors.sh --strict` ✓ (kit: zero literals,
  zero allow comments needed) · `check-motion-tokens.sh` ✓ ·
  `check-icons.sh` ✓ · `check-raw-css.sh --strict` ✓ ·
  `verify-parity-export.mjs` 190/190 ✓ · bundle gate ✓.
- **Icons-gate note**: each piece file's single `<svg` line carries
  the gate's own per-line override comment
  (`// allow-emoji: bespoke illustration scene … — not UI iconography`)
  because `components/illustrations/` is not yet in
  `scripts/check-icons.sh`'s ALLOWED regex. If preferred, Agent Z can
  add `frontend/src/components/illustrations/` to that regex (one
  line) and the comments become redundant — either state passes CI.

## 8) Deliberate limitations

- **No `dir` prop** — every piece is direction-neutral by design;
  if a future piece ever needs mirroring, add `dir` to
  `IllustrationBaseProps` and document the piece's flip in its header.
- **No entrance animations on pieces** — states should appear calm
  and instant; the only motion in the kit is BrandLoader's.
- **No per-role variants** — role accents stay the shell's business;
  pieces speak the platform's ink/signal, not a role's colour.
