# scripts/r319 — the extended defect gate (R319 §E)

**`npm run gate:r319` extends `gate:r318` — it never replaces it.** The
r318 gate stays the landing page's defect gate; this one owns the
AUTHENTICATED product (5 role surfaces) + the all-state contrast sweep
+ the ratchet. Same conventions as r318: viewport matrix, light/dark,
markdown evidence table, exit code contract.

```
node scripts/r319/gate.mjs [--viewports 390,768,1440]
  [--routes landing,student-dashboard,teacher-dashboard,admin-dashboard,quality-dashboard,owner-dashboard]
  [--only state-contrast,leaks,shell,material,paired] [--quick]
  [--base-url http://…] [--port 4215] [--max-elements 400]
  [--out audits/evidence/r319/gate.md]
  [--baseline scripts/r319/gate-baseline.json] [--update-baseline]
```

- **--quick** (verification default): landing + student-dashboard,
  390+1440, both themes, top-60 elements — ~70-125s.
- Full mode (default): the 5 role dashboards (student, teacher, admin,
  quality, owner) + landing, 390/768/1440, both themes, up to 400
  elements per route.
- The gate **spawns its own Vite dev server** (`--port`, strictPort —
  default 4215; never 5173) and kills it afterwards. `--base-url`
  audits an already-running server instead (e.g. Agent B's
  `dev:full` stack with the real seeded backend — the leak scan
  becomes fully meaningful then).
- Hermetic by default: it reuses the REAL e2e fixture transport
  (`frontend/tests/e2e/fixtures/mock-transport.ts` + `api-fixtures.ts`
  — `installMockApi`/`seedSession`, the same primitives `e2e.ts`
  wires), esbuild-bundled into a content-hashed tmp cache, so the 5
  role surfaces render with zero backend. Authed routes boot signed-in
  exactly like the journey suite (`mdrk-auth` persist seed; the
  TEACHER/ADMIN/QUALITY/OWNER dashboards render their honest hermetic states —
  data arms that have no fixture show their error/empty states, which
  the gate measures truthfully).

## The five check families (R319 BOARD §E 8–12)

| check | what it enforces | failure shape |
|---|---|---|
| `state-contrast` (E8) | every interactive element (a, button, [role=button\|tab\|menuitem\|option], input, select, summary, label) with **CDP `CSS.forcePseudoState`** forcing `:hover :active :focus :focus-visible :focus-within` (+ rest; all five verified supported in this chromium); effective fg vs effective backdrop (opaque-ancestor walk + alpha compositing + own-element z<0 state-wipe pseudos, the `.btn`/`.fo-nav-link` pattern — an ancestor walk alone cannot see those slabs); 4.5:1 <24px, 3:1 ≥24px and icon-only (svg-only content). ≤920px cells run hasTouch+isMobile with `hover:none/pointer:coarse` and sweep TWO passes — shell at rest AND drawer open (the B1 defect lives in the drawer rows); ≥921px runs hover fine. Decorative `aria-hidden` subtrees exempt (the r318 WCAG pattern). Node IDs are resolved once per pass (the marked nodes are stable across forced states); a state whose EVERY force call is refused counts as unknown, never a silent pass; rows behind ancestor gradients are measured but flagged `gradient-flagged` (r318 convention) | invisible-on-wash states (B1: `.nav-item:hover` 1.06:1) |
| `paired` (E9) | spawns `node scripts/r319/paired-state-lint.mjs` (Agent A c1-A) — `--_bg`+`--_fg` set together in every state rule. Missing script → **SKIPPED-with-reason** (the gate never crashes on a missing sibling check); the pre-push hook arms itself the moment the script lands | unpaired state tokens |
| `leaks/hard` `leaks/numerals` `leaks/bidi` (E10) | authed routes only: `document.body.innerText` vs the leak patterns — **the two data-shape regexes are IMPORTED from `frontend/src/utils/display-text.ts`** (esbuild-bundled with the transport; leak-rules.md: "never re-type"): `REVISION_CODE_RE` (`r19`/`r180`/`r305`), `PLACEHOLDER_INSTITUTION_RE` evaluated on innerText SEGMENTS (fails «قسم اختبار»/«كلية اختبار»; the bare word «اختبار» is legal — «قاعة الاختبار» is a real room), plus `/\btest\b/i`, `undefined/null/NaN`, and the forbidden RLM date shape `\d{2}\u200F/\d{2}` (leak-rules §4, the photographed «01/15» defect — mono index labels exempt). Written-reason allowlist `leak-allowlist.json`. `numerals`: ANY Arabic-Indic ٠-٩ / Persian ۰-۹ digit in visible text → **WARN** (leak-rules §1: the convention is Latin). `bidi`: Arabic text nodes carrying a NEEDS-bdi shape (percent `36%`, code-ish `A2`/`CS-201`, clocks `19:00`, day-month «1 فبراير» — leak-rules §5) without a `bdi`/`[dir]` isolate ancestor → **WARN** (bidi-safe prose counts «السنة 3» are NOT flagged) | seed/id leaks, mixed numeral systems, bidi glitches |
| `shell/*` (E11) | authed @390 touch only: `bar-opaque` (computed `.bottom-nav` bg alpha === 1), `bar-bleed` (text nodes behind the bar AND translucent bar = text visible through — an opaque bar cannot show anything through), `padding-reserve` (the measured tail padding — max of `.content`/`.content-inner`/`.page`, the elements the reserve actually lives on (base.css `.content-inner` calc(128px+safe-area) @≤920, polish `.page` 64px+safe+rung) — ≥ bar height + safe-area + 8, OR the bottom-clearance proof: scrolled to the end, no text leaf sits under the dock), `drawer-clip` (`.sidebar-nav` fits or scrolls AND the last visible `.nav-group` label's bbox fully inside `nav.sidebar` after `scrollIntoView`), `scrim-palette` (`.sidebar-backdrop` alpha ∈ [0.5,0.95] and NOT the retired `#8e8e8a` grey `rgb(142,142,138)`). The burger is addressed by aria-label («فتح القائمة», Topbar.tsx) with the class as fallback | B2/B1b shapes |
| `material/*` (E12) | per authed route: `frame` (`.sheet-frame`/`.auth-frame`, fixed, 7px inset), `grain` (`body.mdrk-grain`/`[class*=grain]`), `mono-index` (≥1 sampled element whose computed font-family resolves to the mono var — `.font-mono`, `.nav-section-label`, `[class*=index\|mono\|kicker]`), `indicator` (≥1 visible progress/gauge/chip/meter), `avatar-square` (every `.avatar` borderRadius 0), `chrome-radius` (buttons/cards/nav cells with radius > 0, minus `radius-allowlist.json`; **>50 offending sigs → WARN** — the sweep is Cycle-2+ work) | missing Heron sheet material (B2/C2) |

Today most `material/*` and `shell/*` rows FAIL **on purpose** — they
are the ratchet that Cycle-2 lands against; the board's tickets own
them (printed next to every FAIL row).

## The ratchet (baseline)

`--baseline scripts/r319/gate-baseline.json` (default). Keys are
`route|viewport|theme|check`:

- **first run** (file absent) → writes the baseline, exit 0;
- later runs → exit **1 only on regressions**: a FAIL row whose number
  is WORSE than baseline, or a FAIL row the baseline never saw. FAIL
  rows at their baseline numbers are the accepted ratchet → exit 0;
- `--update-baseline` re-seats (after fixing, or after widening scope:
  --quick and full runs share the key space, so moving quick → full
  discovers new rows — re-seat once, then ratchet);
- WARN-row numbers are tracked in the baseline for visibility but WARN
  regressions never block (numerals/bidi become blocking when Agent
  C's util lands).

## Pre-push wiring

`.githooks/pre-push` (fast checks only, ~10s): runs
`node scripts/r319/paired-state-lint.mjs` (loud SKIP if the script is
missing from a stale checkout) + `bash scripts/check-colors.sh`;
blocks on failure. Wired idempotently via root `package.json`
`"prepare": "git config core.hooksPath .githooks"` (runs on every
`npm install`/`ci`; the repo had no prepare before — verified). The
full browser gate is deliberately NOT in the push path — it is the
foreman's pre-merge ratchet.

## Files

- `gate.mjs` — the orchestrator (plain node ESM; no TS, no new deps —
  `playwright-core` + the repo's own `esbuild` for the fixture bundle).
- `leak-allowlist.json` / `radius-allowlist.json` — written-reason
  allowlists (the r318 collision-allowlist discipline).
- `gate-baseline.json` — the committed ratchet baseline (quick-mode
  scope; re-seat after widening).
- Evidence: `audits/evidence/r319/gate.md` + `gate.json` twin.

## Known measurement limits (documented, not hidden)

- E8 dedupes by selector signature (same classes → measured once) and
  caps elements per route (`--max-elements`, quick=60, full=400) — the
  §E-8 performance contract; the first occurrence in document order
  represents each signature.
- Own-element negative-z pseudo backdrops are composited (the state
  wipe pattern); ANCESTOR pseudo backdrops are not — a hover that
  paints an ancestor's pseudo under the element can still read as a
  false positive (none known on the current 6 surfaces).
- Ancestors' `background-image` gradients: the row is measured anyway
  and flagged `gradient-flagged` in the number column (r318 behavior)
  instead of guessing.
- The staff dashboards render hermetic error arms for endpoints the
  e2e corpus does not fixture (e.g. `/me/gaps` → 501) — honest
  surfaces, measured as they stand; point `--base-url` at Agent B's
  seeded stack for the full-fidelity leak scan.
