# R362 — Agent 4 Delivery Record · Global Design System & Shared Components

Branch `agent/r362-design-system` · base `integration/r362-final-unification`
@ `e98d6a0b`. Worktree executed from an authenticated fresh clone (the
brief's `/home/rh2011/Projects/madarek-r362-design` path does not exist on
this host — same environment note the integrator recorded in
`INTEGRATION-RECORD.md` §4).

## 0 · Final SHA

| | |
|---|---|
| Branch head | see the commit that carries this record (HEAD of `agent/r362-design-system`) |
| Base | `e98d6a0b` (integration baseline) |
| Commits | `96eb14cd` tokens · `bf6d0748` recipe restores + de-dup · `1c3f64f2` DESIGN.md truth · `104cf812` contract belt · this record |
| Push target | `origin/agent/r362-design-system` only |

## 1 · The audit (what was actually wrong)

The token architecture is healthy and was **respected, not replaced**: one
source (`shared/design-tokens.json` → `tokens.generated.css`, drift-gated)
composed by hand-written `tokens.css` seats. The Heron reference palette in
the brief (Paper `#F3F2EC` · Ink `#282828` · Technical Gray `#B3B3AF` ·
Secondary `#72726F` · Accent `#F15534`) was analyzed against the canon: the
shipped values are the R313 owner-ordered live-measured set (paper
`#F6F6EE`, ink `#282828`, gray `#B3B3AF`, muted `#62625F`, signal
`#FA3600`/`#F15534`-rhyming danger) — close kin, measured provenance, so
**no approved semantic token was overridden**. The real defects found:

1. **Four shared rule families deleted by the r330/r333 purges while their
   contract comments and live consumers stayed** (same class as the table
   recipe the integrator repaired in `d3ab3ce1`): the checkbox/radio
   branded family, the disabled text-control recipe, `.table-row-actions`,
   `.table-pagination`. 5+ pages each rendered the markup with UA defaults.
2. **Duplicated declarations**: `#DB3A00` (the R318 AA action fill) ×5 in
   my sheets as allowlisted literals + light-theme override blocks; the
   `#ED4C1F` input-focus literal still raw in polish.css with a stale
   «token seat pending» note (the seat `--input-focus-signal` landed in
   R353 P4).
3. **Doc/token drift**: `--text-faint` comment + print remap quoted
   `#70706A` (which measures 4.34:1 on surface-2 — under AA) while the
   shipped value is `#666660` (5.04:1 worst ground); DESIGN.md §2 carried
   r304/r305-era values (retired `#F6F8FA` ground, banned-white
   `--accent-fg`, `#C8C8C8` rule, `#72726F` faint) and §9 documented the
   R353-retired parity-export pair as shipping.

## 2 · Token changes (tokens.css only — the generated contract untouched)

- **`--accent-fill-aa`** — the R318/R323 AA action-fill ruling tokenized:
  light `#DB3A00` (white label 4.548:1), dark `var(--accent)` (#FF5A1F,
  4.79:1), plus the print light-lock pin. One seat replaces five
  allowlisted literals and four `[data-theme='light']` override blocks.
- **The state seat map** (pure `var()` aliases, both themes resolve
  first-class, zero raw values): `--secondary`/`--secondary-fg` ·
  `--state-selected-{bg,ink,border}` · `--state-hover-bg` ·
  `--state-disabled-{bg,ink,border}`. Together with the existing seats
  (focus ring family, press-scale register, `*-disabled-opacity` rungs,
  `--state-card-selected-ring`) this completes the brief's semantic state
  coverage: backgrounds/surfaces/text/borders/borders-dividers from the
  generated roles; primary/secondary actions; success/warning/danger/info
  triads; disabled/selected/focus/active all seated.
- **Truth repairs**: `--text-faint` documentation now quotes the shipped
  `#666660`; the print remap aligns to it (was `#70706A`).

## 3 · Component changes

- `components.css` — four purged families restored (bodies verbatim from
  `a584543c^`, reconciled): checkbox/radio (18px square/circle,
  `--rule-strong` hairline, accent checked + drawn mark/dot, `--t-clean`),
  disabled text controls (opacity + not-allowed + `--state-disabled-bg`),
  `.table-row-actions` (hover/focus-within reveal, hover:none persistent),
  `.table-pagination` (rail + `--state-selected-*` current page +
  `--state-hover-bg` wash + 44px phone floors + the r151b RTL wrap).
- `.btn.primary/.accent/.gold` and the `.btn.outline` wipe ride
  `--accent-fill-aa` unconditionally — identical computed values in both
  themes, override blocks retired. `.btn.outline` consumes
  `--secondary/-fg`.
- `patterns.css` `.auth-submit` — wipe + hover border on the same seat.
- `polish.css` — the v15 input-focus twin (raw `#ED4C1F` + duplicate
  transition) deleted; `components.css` is the sole owner of the input
  focus language. Two stale halo comments corrected.

## 4 · Theme coverage

Light and dark are first-class on every change: the AA fill seat, the
selected/hover/disabled seats, and all restored recipes resolve through
theme-aware tokens (verified computed: `#DB3A00`/`#FF5A1F` fills,
`#FCE3DE`/`#432015` selected grounds, `#F0F0E6`/`#353535` hover+disabled
washes at every breakpoint). No `[data-theme]` forks were added — three
were removed.

## 5 · Responsive checks (measured, not asserted)

`vite preview` + Playwright on `/__design`: **120/120 checks green** — 9
breakpoints (360·375·390·430·768·1024·1280·1440·1920) × 2 themes × (AA
fill · checkbox accent · disabled lock · row-action reveal · pagination
selected · zero horizontal overflow · zero page errors) + touch-emulation
pass on the 4 phone widths (hover:none, actions persistent) + LTR logical
property spot checks at 390/1440. Evidence screenshots stay out of the
tree (the regen script rides this record's section 9).

## 6 · Accessibility checks

- Focus: no private focus rules added; the restored controls ride the
  universal `:focus-visible` ring (motion.css), and the row-action reveal
  keys on `:focus-within` so keyboard paths stay visible.
- Contrast: white on `#DB3A00` = 4.548:1 (AA) on every filled CTA in
  light; dark keeps 4.79:1. `--text-faint` now documented at its true
  5.32:1 (bg) / 4.99:1 (worst ground). Selected pagination: ink vs
  accent-soft ≥4.5 both themes (the r305 triad pins).
- Touch: 44px floors ride the restored pagination at ≤640; the coarse
  pointer floors for `.btn`/`.icon-btn` were already in place.
- The full a11y belts (r170/r305a7) ride the 3124-test unit suite and the
  CI e2e matrix — green.

## 7 · CSS gate results (all measured this round)

| Gate | Result |
|---|---|
| `check-colors.sh --strict` | PASS (allowlisted lines 86 → 80) |
| `check-raw-css.sh --strict` | PASS (37 documented spacing allows, unchanged) |
| `check-motion-tokens.sh` | PASS (3 brand-mark debts, unchanged) |
| `check-icons.sh` | PASS (Lucide-only holds) |
| `tokens/build.mjs --check` | PASS (web/mobile/brand parity) |
| `verify-parity-export.mjs` | PASS (self-reports RETIRED, R353 P4) |
| stylelint ratchet | GREEN — errors 40 ≤ 45 baseline; **rawHex 35 → 29**; importantDeclarations 41, rawZIndex 68 (both ≤ baseline) |

## 8 · Bundle measurement (re-measured as ordered)

`npm run build` + `check-bundle-size.mjs`: **753.9 KB gz total / 774.0
ceiling** (baseline 754.0 — the round is 0.1 KB lighter; the literal
deletions outweigh the restores). Entry 66.0/92 · pdf 95.7/110. The
brief's «15.6 KB headroom» referenced the Heron branch under the older
770 ceiling; the live ceiling is 774.0 (R353 E2's documented raise) →
**20.1 KB real headroom**.

## 9 · Tests

- New: `frontend/tests/unit/r362-shared-recipes.test.ts` — 11 pins
  (token seats, restored recipes, retired literals stay retired,
  print/generated alignment).
- Full frontend unit: **3124/3124** (baseline 3113 + 11 new).
- typecheck + typecheck:tests: 0 errors.
- CI on `104cf812`: **full matrix SUCCESS** — including E2E (browser +
  iOS WebKit), design gates, conformance gate, and the surface-drift job
  (the restored recipes' routes are outside the committed 72-capture
  baseline; all captured routes are computed-value identical).
- Responsive harness: section 5's 120 checks (regen: `npx vite preview
  --port 5304 --strictPort` in `frontend/`, then a Playwright script
  walking the 9 breakpoints × 2 themes over `/__design` asserting the
  computed seats — kept out of the tree per the evidence law).

## 10 · Coordination requests (for the integrator to route)

1. **Agent 3** (landing sheets): `styles/landing/nav.css:720` and
   `styles/landing/chrome.css:230` still carry the allowlisted `#DB3A00`
   — they can consume `var(--accent-fill-aa)` now and drop their
   color-gate comments (computed-identical).
2. **Agent 5** (domain sheets): `styles/admin.css:135,178` and the
   student.css focus comments still carry the raw `#ED4C1F` /
   «no token seat exists yet» notes — the seat is
   `var(--input-focus-signal)`; same one-line swap.
3. **Agent 2**: no requests — the shell chrome was untouched (sidebar/
   topbar/nav source files respected per ownership).

## 11 · Ownership compliance

Edited only Agent-4 files: `styles/tokens/`, `components.css`,
`patterns.css`, `polish.css`, `DESIGN.md` (the doc-truth fix AGENTS.md
mandates), and one new file under `tests/unit/` + this record. No
sidebar/nav/landing/illustration/mobile/backend source touched. No
ceilings raised, no ratchet lowered, no assertion weakened, no
`!important` added.
