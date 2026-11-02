# R331 — Repo hygiene pass 1 (A-Repo, task 3-c)

Date: 2026-11-02 · Branch: `wt/repo` (base `main@fdc8bb27`, HEAD `d7fcac42`)
Agent: **A-Repo** · Scope: make the working tree lean + add gates. **No git
history was rewritten** (`.git` untouched at 359MB — blobs stay recoverable),
no CI job was modified, nothing was pushed.

## 1 — What was done (4 commits)

1. **Evidence out of the tree** — `audits/evidence/` (ALL of it: rounds
   r304-final…r327, 3,635 files, **271MB**) moved to the Release staging
   folder `/home/z/evidence-r331/removed-from-tree/audits/evidence/`, then
   `git rm -r` + `.gitignore` (`/audits/`). Nothing under `audits/` was ever
   read by CI (verified below); every reference in code is a comment, an
   opt-in write path, or a skip-gated e2e dir.
2. **Redesign rounds r312–r330 collapsed** into `docs/history/`:
   `redesign-rounds.tar.gz` (404KB — the full TEXT record: 50 md + 27 json;
   all 146 PNGs excluded → they are in the Release staging, full copies) +
   `INDEX.md` (one line per round r312…r330 with the decision/outcome).
   Full copies of every removed round file are ALSO in the Release staging
   (text included — the tar is the in-tree browse/archive copy).
3. **Size gate** — `scripts/gates/size-gate.sh` + `.size-gate-allowlist` +
   `.github/workflows/size-gate.yml` (new 10th job, push+PR, no install
   step, seconds to run, zero `continue-on-error`). Also wired as
   `npm run gate:size`.
4. This report.

### Live contracts deliberately KEPT in-tree (tiny, still read by CI/tests)

| File | Why it stays |
|---|---|
| `docs/redesign/r320/rename-keep.json` (8K) | READ by `frontend/tests/unit/r320-rename-belt.test.ts` (CI test-frontend) + `scripts/r320/rules-runtime.mjs` |
| `docs/redesign/r320/LEGAL-TODO.md` (16K) | READ by `frontend/tests/unit/legal-pages.test.tsx` (CI test-frontend) |
| `docs/redesign/r320/RENAME-LEDGER.md` (32K) | Active rename ledger — `backend/src/lib/roleLabels.ts` instructs updates here; rows in `scripts/r321/r321-rename-keep.json` |
| `docs/redesign/r323/brand/{BRAND,VARIANTS,AUDIT}.md` (32K) | Brand contract — linked from README.md / README.en.md; cited by `frontend/src/brand/*`, `apps/mobile/src/brand/*` |
| `docs/redesign/r313/{OVERRIDE-LEDGER,NOTES-D15}.md` (16K) | Design-provenance ledger linked from DESIGN.md + AGENTS.md (active rulebook) |

## 2 — Inventory: before → after

| Metric | Before (HEAD) | After (pass 1) |
|---|---|---|
| Tracked files | 5,907 | 2,063 |
| Tracked tree size | 324MB | **40.8MB** (−87%) |
| `docs/` tracked | 24.1MB / 477 files | 10.7MB / 189 files |
| `audits/` tracked | 271MB / 3,635 files | **0** (folder gone, ignored) |
| Tracked files >500KB | 63 (56 stale evidence + 7 legit) | 7 (all allowlisted) |
| Tracked `.md` files | 371 | 243 |
| Biggest remaining files | 5.1MB webm, 3.6MB png sheets | `sample.pdf` 996K · `se301-02-requirements.mp4` 916K · mobile `package-lock.json` 772K · `se301-01-intro.mp4` 804K · `schema.generated.ts` 684K · `openapi.json` 620K · `se301-03-design.mp4` 736K (all in `.size-gate-allowlist`) — then `surface-baseline.json` 468K, `assets/r306/*.png` ≤356K |

R330's claim that heavy evidence was removed checked out only for
`docs/redesign/` (r330 itself is clean, 136KB); rounds r312–r329 still
carried 14.4MB in-tree, and the REAL weight was `audits/evidence/`
(271MB, r304–r327) — never touched by R330.

## 3 — Evidence staged for Release `evidence-r331` (NOT committed)

`/home/z/evidence-r331/removed-from-tree/` — **3,858 files, 284.7MB**:
`audits/evidence/**` (271MB) + full copies of `docs/redesign/r312…r330/**`
(14.2MB, incl. the 8 kept contracts — Release copy is complete).
`MANIFEST.txt` (4 header lines + one row per file: bytes, sha256, path)
sits next to them. The lead uploads the folder verbatim. Recovery story
for any single file: the Release, or `git show <sha>:<path>` (history
untouched).

## 4 — Size-gate design

`scripts/gates/size-gate.sh` (bash + git + du only, ~1s, exit 1 on breach):

- **RULE 1** — any tracked (index) file >500KB not in `.size-gate-allowlist`
  (exact path or `dir/` prefix; every entry carries a reason).
- **RULE 2** — `docs/` tracked total >30MB.
- **RULE 3** — the change under test adds >5MB to `docs/`: base =
  `$SIZE_GATE_BASE` (workflow resolves `github.event.before` on push, base
  branch tip on PR; two-tree diff, no merge-base needed), else `HEAD~1`;
  first-commit-of-branch skips RULE 3 with a notice (RULES 1–2 still gate).
  Counts Added/Modified files under `docs/` + untracked files there (a fresh
  6MB PNG fails even before `git add`).

`.github/workflows/size-gate.yml`: push + PR + manual, `contents: read`,
per-ref concurrency, `timeout-minutes: 5`, no `continue-on-error`. The gate
is RED-blocking by design. Locally: `npm run gate:size`.

**Verified locally:** GREEN on the cleaned tree (docs 10.3MB, 7 allowlisted
big files, +410KB vs HEAD~1); synthetic tests: 600KB staged file → RULE 1
fail; 6MB untracked in docs → RULE 3 fail; 25MB staged → RULES 1+2+3 fail;
allowlist entries pass with a log line. The tar.gz (404KB) is deliberately
NOT allowlisted — the 500KB file ceiling now polices the archive's growth.

## 5 — Verification matrix (why CI stays green)

| Check | Result |
|---|---|
| `npm run lint` (root eslint, frontend/src + backend/src) | 0 errors, 15 warnings (pre-existing, warnings allowed) |
| `node -e require('./package.json')` | OK (`gate:size` wired) |
| `node scripts/r321/rename-ledger-scan.mjs` (CI design-gates step) | 1254 files scanned · 99 «الإدارة» · **0 OFF-LIST** |
| `node scripts/tokens/build.mjs --check` (CI design-gates) | PASS (byte-identical halves) |
| `bash scripts/check-csp-hash.sh` (CI design-gates) | OK (both pins) |
| `vitest run tests/unit/r320-rename-belt.test.ts tests/unit/legal-pages.test.tsx` (CI test-frontend readers of kept files) | **112/112 passed** |
| YAML parse `size-gate.yml` + `ci.yml` (python3 yaml) | OK |
| `bash scripts/gates/size-gate.sh` | GREEN |

Reference audit performed BEFORE any move (`git grep` over tracked files):
no CI-run script/test reads `audits/` or a collapsed round path at runtime.
The only runtime readers anywhere were the two r320 unit tests above (kept),
`scripts/r320/*` local harnesses (kept), and opt-in/skip-gated e2e write
paths. `.gitignore` additions (`/audits/`, `docs/redesign/**/{screens,shots,evidence}/`,
`*.har`, `**/heron-live/`) verified to newly ignore ZERO tracked files.
One pointer fixed: `DESIGN.md` r322/BRIEF.md reference now cites the
archive + Release. Historical narratives (CHANGELOG.md, docs/history/
worklog+branches, docs/releases/*) keep their old paths on purpose — they
are records, not links; targets live in the tar/Release.

## 6 — Deliberately NOT touched (risk call)

- **`specs/` (844KB, 57 files)** — referenced (as pointers) by live gates'
  error messages (`check-icons.sh`, `check-motion-tokens.sh`), CI echo text,
  and test headers (`specs/012…/contracts/audit-script.md` etc.). Small,
  load-bearing as the design-gate contract docs. Pass-2 can move it into
  `docs/history/legacy-root/` only together with updating those pointers.
- **`tools/` (3 files, 12KB)** — `boot-pg.sh` + intentionally-tracked
  `package.json` (embedded-postgres local dev flow documented in
  `.gitignore`); referenced by `scripts/r319/local-db.mjs` pattern notes.
  Tiny; leave.
- **`docs/redesign/{handoff,assets}/` + `r308/r310/r311/`** (7.4MB images +
  small contracts) — outside the instructed r312–r330 collapse window;
  referenced by landing-sheet tests (r306 spec md) and scripts comments.
  Pass-2 candidates (see below).
- **`scripts/` (209 files)** — pass-2 scope per the plan; only
  `scripts/gates/` was created here.
- **All 5 existing workflows** — untouched (the 9 jobs run unchanged); the
  size gate is an additive 10th workflow.
- **`.git` (359MB)** — history preserved by mandate; clone size stays big
  until the owner decides on a fresh root (out of scope, never silently).

## 7 — Pass-2 plan (riskiest first)

1. **[RISKIEST] `scripts/` collapse** — 209 files, r304–r327 round harnesses.
   Landmines: `scripts/r321/rename-ledger-scan.mjs` + `r321-rename-keep.json`
   are CI design-gates inputs (keep in-tree); root `package.json` exposes
   `gate:r318/r319/r320/r321/perf/clean/contrast/height` + `lint:r320`
   (drop or repoint each); several harnesses re-read Release evidence
   (documented in `docs/history/INDEX.md`). Do it round-by-round, re-running
   `npm run lint && node scripts/r321/rename-ledger-scan.mjs` after each.
2. **[HIGH] `docs/redesign/{handoff,assets}` → Release** (7.4MB of r305/r306
   images; `frontend/tests/unit/r306-landing-sheet.test.ts` cites the two
   spec .md files — keep those two, move the PNGs) + fold `r308/r310/r311`
   into the archive + extend INDEX.md.
3. **[MEDIUM] Workflow consolidation** — 6 workflows now (ci, size-gate,
   deploy-smoke, keep-warm, mobile, mobile-builds-ledger). Verify trigger +
   concurrency semantics per merge before merging any two; never while a
   release train is rolling.
4. **[MEDIUM] Dependency pruning** — root devDeps used only by round
   harnesses (`clipper-lib`, `harfbuzzjs`, `opentype.js`, `pixelmatch`,
   `pngjs`, `embedded-postgres`?) become removable after (1); each removal
   must re-run lint/typecheck/build/unit/e2e locally.
5. **[LOW] README reconciliation** — root `README.md` vs `README.en.md`
   (translation pair, keep both but diff them), 16 tracked `README.md`
   across workspaces/docs/scripts (index them, delete only stale ones);
   `docs/archive/` (28 files) + `docs/releases/` (8) collapse into
   `docs/history/`.
6. **[LOW] `specs/` → `docs/history/legacy-root/`** with the gate-message
   pointer updates (see §6).

Gate to add in pass 2 if the tree creeps again: cap on TOTAL tracked size
(40MB today) and a per-directory budget for `scripts/`.
