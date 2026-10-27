# R321 §C — THE CLEAN BASELINE (r321-c1-C0): the ticket factory

Collected 2026-10-27/28 on the r321/wp-c0 worktree (tree = main c974302c + the three
CSS-comment repairs below) · harnesses + raw reports: `audits/evidence/r321/clean/raw/`
· **report-only** — deletions happen in the cycle-6 diet, each candidate verified per rule
before it dies. Every number names the command that produced it.

## 0 · Found-and-fixed DURING this census (real defects, fixed in this WP)

**F-1 · CSS banner comments ship as RAW CSS to production** — three banners contained
sequences that close a `/*` comment early, so their body text reached the dist as garbage
at-rule-ish bytes (benign to browsers, fatal to strict parsers, dead weight on every page):
- `styles/r305-research-pdf-ai.css` — the §C banner lost its `/* ═══` opening line entirely
  (restored at :769).
- `styles/r305-student.css:30,33` — the banner text contained `--fs-*/--r-*/--sp-*` and
  `--t-*/--motion-*`: the `*/` closes the comment mid-text (reworded with spaces).
- `styles/training.css:34` — same class: `.leaderboard-*/` (reworded).
Command: strict `postcss.parse` over all 47 `frontend/src/styles/*.css` → **0 failures**
after the fixes (2 before). `bash scripts/check-raw-css.sh --strict` PASS.

## 1 · Copy-paste (§C-2) — `npx jscpd frontend/src backend/src shared --min-tokens 40`

**980 exact clones · 9,299 duplicated lines (5.77 %) · 412 files.** By format:
css 516 · tsx 272 · ts 192. Top clusters (clone count · file pair):

| n | cluster | §C action |
|---|---|---|
| 47 | styles/landing.css ↔ itself | the vanishing-text class of bugs — one definition per selector/state |
| 34 | pages/admin/AdminPages.tsx ↔ pages/owner/OwnerInstitutionDetailPage.tsx | the admin↔owner twin — parametrise |
| 33 | styles/tokens.css ↔ styles/unified-parity.css | TOKEN duplication — the worst kind; unify at tokens.css |
| 24 | pages/teacher/ExamAuthorPages.tsx ↔ itself | intra-file clones |
| 23 | styles/components.css ↔ itself | |
| 22 | styles/student.css ↔ styles/teacher-quality.css | the r305 twin sheets — merge behind shared families |
| 20 | styles/polish.css ↔ itself | |
| 18 | styles/student.css ↔ itself | |
| 16 | components.css ↔ unified-parity.css · components.css ↔ student.css · components.css ↔ teacher-quality.css | |
| 14 | r305-research-pdf-ai.css ↔ r305-student.css | |

The known page families (verified by STUDENT-SWEEP.md): CommunityPage ×5 mounts
(pages/community/CommunityPages.tsx, 849 ln, zero sheet markers) · AlertsPage lives in
pages/student/MorePages.tsx (2,157 ln carrying 8+ routes — the merge candidate) ·
LibraryPage 1 definition (pages/student/LibraryPage.tsx). Raw: `raw/jscpd-report.json.gz`.

## 2 · Dead code census (§C-1) — knip BLOCKED, ts-prune + depcheck + grep used instead

- **knip 6.43.0/5.60.2 BLOCKED in this container** (oxc-parser `ArrayBuffer allocation
  failed` / TS-host mismatch — a tool bug, not repo state). Recorded as BLOCKED-with-reason;
  the §C-1 census therefore leans on:
- **ts-prune** (frontend 366 · backend 391 raw rows — `raw/tsprune-{fe,be}.txt`):
  MOSTLY FALSE POSITIVES by design (ts-prune does not see dynamic/e2e use; e.g.
  `shared/testAccounts.ts` rows are used by scripts+tests). Rows are the WORKLIST, not
  verdicts: every deletion needs the grep-verification pass. Highest-confidence families:
  whole-file unused candidates + "used in module" re-exports (App.tsx:324/718/788…).
- **depcheck** (per-tree): frontend 0 unused deps · backend 0 · root devDeps **candidates**:
  `clipper-lib`, `harfbuzzjs`, `opentype.js` (§H art/typography tools — verify a real
  consumer exists in scripts/ before §C keeps them); @axe-core/playwright flagged
  (used by tests/e2e — false positive). Lockfile-level "18 unused" at root were hoisting
  artifacts — verified used: zod (37 files), @tanstack/react-query (35), zustand (8),
  @hookform/resolvers (10). Verified NOT imported in src/tests: framer-motion, date-fns,
  uuid, @dnd-kit/*, react-markdown — **they are not in any package.json** (lock residue),
  so the only §C action is the lockfile audit at the next `npm install` refresh.

## 3 · CSS duplication + hover guards (in-repo lints — the standing baselines)

- `node scripts/r320/duplicate-selector-lint.mjs` → **65 cross-file selector conflicts**
  (the vanishing-text bug class; allowlist: scripts/r320/duplicate-selector-allowlist.json
  with reasoned keeps + `unloadedFiles` carve-outs). Top offenders: `.admin-faculty-card`,
  `.topbar` ×3 sheets, `.page-header`, `.auth-card` RM contexts, `select/textarea`.
- `node scripts/r320/hover-guard-lint.mjs` → **183 unguarded `:hover` rules** outside
  `@media (hover:hover) and (pointer:fine)` (styles/admin.css:377, auth.css:110/1213/1217,
  unified-parity.css:972, …). §E rule: every hover must be guarded or allowlisted.

## 4 · Unused-CSS candidates (§C-1) — Playwright CSS coverage over the production build

Harness: `raw/css-coverage-harness.mjs` — 28 routes (10 public + 3 roles × authed + 4
narrow @390), real logins, light+dark theme flips, ranges UNIONED per dist sheet.
Analyzer: `raw/css-coverage-analyze.mjs` — postcss walk of 24 dist sheets, **5,627 rules**:

| class | count | §C meaning |
|---|---|---|
| unused-static candidates | **2,230 (39.6 %)** | never applied on visited routes, state-free selectors — the diet pool (NOT deletable without per-rule verification: coverage only proves absence on the 28 visited routes) |
| unused-stateful (N/A) | 344 | hover/focus can't fire on a passive visit |
| unused-attr-state (hand) | 153 | [aria-]/[data-] toggles — hand-verify tier |
| sheets never loaded (N/A) | 10 | their routes weren't visited (LecturePlayer, Settings, campus, owner, Vision, AiAssistant, DocumentViewer, research-pdf, training) — covered in later sweeps |
| print/media-only | 219 | N/A |

Largest unused-static bytes by sheet (raw/css-usage-diff.json): r305-student 3,353 ·
r305-student-schedule 2,611 · AiAssistant 2,447 · VisionPages 2,118 · Settings 606 ·
r319-student 112 (rows) — the r305-* families are the diet's centre of mass.

## 5 · Copy census (§C-3)

- «بيانات العرض التجريبية»: **2 files** · "real-ui": **3** · "[LIVE]": **3** ·
  «مساعد الفهم»: **1 file** (landing — the 8 duplicate-text gate cells already
  baseline-pinned as the §C-3 marketing-repetition ticket: the landing repeats the same
  card grid in statement/problem/platform).
- The empty-state/skeleton/chip duplication shows in §1's tsx clones (272) — one
  EmptyCell/Skeleton/chip family per the shared patterns (frontend/src/components/patterns)
  is the §C-2 merge target.

## 6 · Bundle (§C-5) — caps must only go DOWN

`node scripts/check-bundle-size.mjs` on main c974302c: **total 736.0 / cap 736 PASS
(zero headroom)** · entry 80.8 / 82 · pdf 95.7 / 110 · 161 chunks · 2,383.8 KB raw.
§E targets (the cycle-6 diet): main ≤ 200 KB gz · each route chunk ≤ 150 KB gz (all
route chunks already < 37 KB except entry-family). The zero-headroom state is the diet's
forcing function: the next route-level growth breaks the gate — by design.

## 7 · The §C ticket list (prioritised; file:line evidence above)

| id | ticket | est. | risk |
|---|---|---|---|
| C-1 | CSS one-definition-per-selector: the 65-conflict set + landing.css intra-file 47 | M | the vanishing-text class — delete after the §4 coverage cross-check |
| C-2 | tokens.css ↔ unified-parity.css duplication (33 clones — token drift) | M | HIGH (state contracts) — pair with r320 paired-state lint |
| C-3 | landing «مساعد الفهم» ×6 + repeated card grid (statement/problem/platform) | S | copy-sensitive (no-copy rule) |
| C-4 | AdminPages ↔ OwnerInstitutionDetailPage twin (34) | M | behavior-preserving parametrise + belts |
| C-5 | CommunityPages ×5 dedupe + conversion (with §B B4) | M–L | see STUDENT-SWEEP T-5 |
| C-6 | MorePages.tsx 2,157 ln / 8 routes — split per family while keeping the r319 grammar | M | nav adjacency contracts |
| C-7 | hover-guard: 183 rules → guarded or allowlisted | M | mechanical, belt per file |
| C-8 | ts-prune worklist (757 rows → verified subset) + root devDeps consumers (clipper/harfbuzz/opentype) | L | false-positive mine — verify by grep before any delete |
| C-9 | the bundle diet: 736 → ≤ 200 entry/… targets via §1/§4/§8 (the caps NEVER rise) | L | the cycle-6 headline |
| C-10 | knip re-run at the cycle-6 tool refresh (blocked here) | S | tooling |
