# R369 · Agent A — Integrator & Foundations · CHECKLIST

Branch: `agent/r369-integrate` (from `origin/exec/r368-fidelity-v2` @ `9d278577`) · Worktree: `/home/z/wt/r369-A`
Law: tick only with proof on the same line. "Pushed/written" ≠ done; "executed, measured, target met" = done.
Skipped items = `SKIPPED — reason — needs <owner decision/credential>`.

## Lane A1 — one green base

- [x] BRANCH-LEDGER.md: every R368 branch inventoried — `docs/redesign/r369/A/BRANCH-LEDGER.md` (merge t6/t5/t5-public; drop the 3 superseded first-gen heron-fidelity commits with reasons; t0–t3/t8 contained).
- [x] Merge `origin/wip/r368-t6` `--no-ff` (13a067e1, clean) + `origin/wip/r368-t5` (1eacf478, clean) + `origin/wip/r368-t5-public` (4b71f93d, one conflict in SPECS-REFERENCE.md resolved keeping both intents; the 013 numbering collision recorded).
- [x] Unique commits integrated per ledger (t5 8 + t5-public 1 merged; heron-fidelity 3 dropped-superseded with measured reasons).
- [x] Size gate fixed at the ROOT (acf79ac4): 471 heavy artifacts untracked in place (gitignored; tools keep their paths); docs/ tracked 75,006KB → 27,364KB ≤ 30,720KB; `.gitignore` R369 policy block + `scripts/gates/pre-push-guard.sh` + `.githooks/pre-push` (enable: `git config core.hooksPath .githooks`); stale allowlist entry retired. Proof: `bash scripts/gates/size-gate.sh` → GREEN rules 1+2+3; CI Size gate SUCCESS on b5159aaf, ca45d29f, 4279ec88.
- [x] Deadcode ratchet green + IMPROVED (7804f8e9): the auth guest-door frame extracted (`components/auth/AuthDoor.tsx`, 3 pages re-keyed, markup identical) + training.css §gamification orphaned comments → pointer; jscpd 183 → 180, baseline re-pinned 181→180 in the same commit. Proof: `bash scripts/deadcode/check.sh` → "9 at baseline, 1 improved, 0 regressed"; CI deadcode SUCCESS ×3 pushes.
- [x] Failing CI jobs fixed from actual job logs (GitHub API logs pulled for runs 44483262098/44500287870): E2E trio (c4eb4141 — preloader skip pointer-events root cause, concepts-band driver retune to the post-T8 geometry, both measured live; r308:57 6.7s + r309:550 6.5s + r308:204 5.7s green, were 46s timeouts/deterministic 1/15), R305-supplemental 19/19 (hex-in-comment + the single hover-guard band), rename-ledger-scan exit 0 (evidence json/csv excluded as machine echoes; prose .md still scanned), Test(frontend)/Design-gates/Conformance-gate reds all closed; overlap detector re-run on the merged tree: ALL counters zero (the t6 red was its stale fork point).
- [x] Gates green on the merged tree (ca45d29f + 4279ec88): tsc ✓ · frontend unit 3,163 passed (the one r168b red fixed → 13/13 re-verified) · backend 2,658/2,677 (0 failed, 19 skipped) · e2e 217 passed / 0 failed across 40 specs (3 foreground batches — CORRECTED: this count was one page off; CI on 4279ec88 caught the document-viewer phone-band red. Two roots, both fixed at the source in 0e84f542: the icon-only notes FAB measured 42px inline [min-block-size protected one axis] → min-inline-size 44px floor; the Sheet lookup still expected the pre-ca45d29f name «ملاحظات البحث» → tracks the shipped «ملاحظات». Spec re-verified 7/7 locally, chromium 1223) · mobile jest 51 suites 1,271/1,271 · bundle 762.9KB ≤ 774 (build + check-bundle-size PASS) · stylelint ratchet green · copy-budget CLEAN (six T5 pages cut to ceiling, every pinned string preserved — ca45d29f) · copy-style ENFORCE clean · identity-guard CLEAN 2,148 files · design gates (raw-css/colors/motion/icons/tokens/parity) PASS.
- [x] `docs/redesign/r369/BASE-READY.md` — written below with the CI proof for the final SHA.

## Lane A2 — truthful instruments & the new acceptance

- [x] Spec amended (owner decision 2026-11-19): criterion 2's E gate REPLACED by the paired-sheet judge ≥4/5 with the amendment block + recorded rationale (E diagnostic-only: SSIM vs English copy + original art caps it — measured wave-3 fact). Checklist line re-keyed. `docs/specs/heron-fidelity.md`.
- [x] `scripts/fidelity/judge-sheets.mjs` (4279ec88): deterministic triptych sheets from the committed capture; 50 sheets to `.local/judge/`; 30 primary (390/768/1440) committed at 1,457KB ≤ 1,536KB budget via progressive quantization; `docs/audit/evidence/judge-ledger.json` 50 rows (rating null — B fills).
- [x] `scripts/fidelity/accept.mjs` (4279ec88): the one-command acceptance table with provenance on every row; exit 1 on unmet criteria; measured now: 6 PASS · 3 OPEN (judge pending B / bundle needs dist / Lighthouse residual) · 2 FAIL (stress collision @1440 — B's lane; landing CSS 723,509B vs 601,352B — T9 open).
- [x] The 5 invalid T pairs root-caused (REQUESTS-A-to-B.md R1): instrument-side structural limits with both-sides evidence (reference stage ends before the mid-state offsets; footer ≤6/9, cta@1024 ≤13/15) — spec acceptance-#1 escape, carried with proof; B's height-gap work may bring the local side into reach.
- [x] results.json provenance: the instrument writes SHA/profile/dirty/gate-vs-scoped (`run.mjs:1461` provenance.profile — verified in code); the committed blob predates it and self-heals at the next full run (T10). Law tests 38/38.

## Lane A3 — tokens, hygiene, simplification

- [x] T4 token migration (4279ec88): `--sp-3-5: 14px` minted (the compact-control grade — 15 occurrences/8 sheets, in-source-acknowledged debt) in `shared/design-tokens.json` + regenerated (web+mobile parity: tokens:build --check PASS, verify-parity-export PASS); the 14px family migrated (7 sites across 5 sheets); heron-admin-owner.css's 17 unmarked spacing + 3 raw 13px type literals migrated to existing rungs; design gates all PASS after (raw-css --strict, colors, motion, icons, stylelint).
- [x] Bundle ceiling reconciled into ONE source: `check-bundle-size.mjs` LIMIT_TOTAL_KB=774.0 (full measured raise history in its comment line); AGENTS.md §3 + §5, docs/INDEX.md, CONTRIBUTING.md updated 770→774 (docs were stale from the R339 re-pin; code wins, doc fixed in the same change). No ceiling raised — the reconciliation documents what the gate already enforces.
- [x] `docs/FIDELITY-HOWTO.md` written (the one-page instrument guide: accept.mjs, judge pipeline, conformance, stress/overlap/loaf/swipe, the gate set, evidence policy, browser fallback).
- [x] docs/INDEX.md re-pointed to the live program (R368/R369 lead; R341 re-seated as closed-round record; r369 records + FIDELITY-HOWTO in the live table); archive sweep: r349 + r363-operations-readiness archived (grep-verified unreferenced; r343/r344/r347/r350/r366 stay live — referenced by scripts/gates/workflows).
- [x] `npm run typecheck` green (frontend+backend+tests, Node v24.22.3 in the >=20 <25 window); backend tests green; no schema changes.
- [ ] T4 residual: the 3px micro-gap rung-vs-collapse decision + the 64px dock-clearance semantic — SKIPPED — one-site/weak candidates per the inventory's own bar; the raw values carry reviewed allows — needs B/C REQUESTS (if their art/product work surfaces more sites, minting strengthens).

## Lane A4 — rolling support & closeout

- [x] COORDINATION.md written (state + merge/conflict forecast for C: AuthDoor extraction, heron-supplemental guard merge, training.css comment dedup; evidence-policy law for B).
- [x] REQUESTS-A-to-B.md written (R1 invalid-T pairs, R2 stress collision, R3 judge-ledger protocol, R4 token request channel).
- [x] C active (`agent/r369-product` @ 05cbc35f from t6 — before BASE-READY per the workflow); B not started (no branch); both told to merge `origin/agent/r369-integrate` when BASE-READY appears.
- [ ] Dry-run integration (`agent/r369-integrate-dryrun` + INTEGRATION-DRYRUN.md) — PENDING — needs B and C DELIVERY.md (or ~10h of A work; B has not started).
- [ ] DELIVERY.md + the final Arabic report — PENDING — at lane close.
