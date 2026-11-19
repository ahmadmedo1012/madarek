---
description: "Task list for spec 013 — Heron Fidelity"
---

# Tasks: Heron Fidelity

**Input**: Design documents from `/specs/013-heron-fidelity/`

**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `contracts/measurement-law.md`, `checklists/requirements.md`, `quickstart.md`

**Authority**: the ordered task list in `docs/superpowers/plans/heron-fidelity-plan.md` (0–10) — each task's Files/Changes/Checks/Done-when/Dependencies/Rollback live THERE verbatim; this file tracks execution state only. Nothing here may widen or narrow a task.

**Organization**: tasks are sequential by measurement dependency (0 → 1 → 2 → 3…); within tasks 3/5/6, disjoint seat/page-family/role owners may run in separate worktrees after lead approval.

## Format: `[ID] [P?] [Status] Description`

- [T0] [P1] [DONE — `wip/r368-t0` @ `6ee606e3`] Repair the measurement instrument and establish the trustworthy baseline: pair-validity law, wheel-driven reference protocol, live-base position targets, T by `aggregateT`, ambient-excluded settle sampler, `footer@390:mid60` both-sides impossibility proof. Baseline: E 53.0 · T 98.3% (57/58) · Q 95; repeat 20/20 worst 0.2; validate exit 0.
- [T1] [P1] [DONE — closed @ this branch's LoAF/swipe closure commits; measurement foundation @ `2e7491a2`] Match shared scroll, transitions, preloader and pointer: per-family reveal lines in `frontend/src/lib/reveals.ts` per the tuning matrix (plan.md), focused Vitest motion tests, typecheck, mouse/touch/keyboard/reduced-motion traces (modality.mjs), the REAL touchscreen swipe trace (swipe.mjs: 343/340 px tracked + 49 px momentum, 2-frame settle), LoAF <50 ms on the pinned production build (loaf.mjs: 0 scroll-phase LoAF in 3/3 two-pass runs), `npm run build -w frontend` + `check-bundle-size.mjs` (762.6 KB ≤770), Q settle 100 (20/20), route/back/scroll-restoration tests 21/21. Residual onset drivers in seat files are named Task-3 handoffs.
- [T2] [P1] [DONE — `exec/r368-fidelity-v2`; one residual named] Owned raster asset system: eight authored media seats (hero 1368×643 / 340×388, usecase 724×880 / 374×254, platform 598×351 ×2 / 372×226 ×2) generated deterministically by `scripts/art/r368-original-media.py` (2× supersample → LANCZOS; 3.3–20.4 KB each; no reference pixel), provenance `docs/audit/evidence/media-provenance-r368.json`, `--check` stable 8/8. The four Task-2 webp twins (intro-courtyard, usecase-student, platform-floorplan, cta-frame; light+dark ≤60 KB) remain as committed with dimensions/alpha/bytes in `asset-provenance-r368.json`, but **no surface imports them** (grep over `frontend/src` finds no reference) — they are provenance-complete but unwired, and are recorded as a residual rather than counted as delivered artwork. The r368 reference-band CROPS are retired (spec §Excluded: no reference image or crop ships as a product asset).
- [T3] [P1] [IN PROGRESS — `exec/r368-fidelity-v2` @ `ed3f148a`] Rework the ten landing seats in ascending valid E. Wave-3 landed on this branch: the problem RTL sparse-placement diagonal root-caused and pinned (`grid-row: 1` — section 2494→840 px @1440; scoped seat E 72.6, 1440 mid60 74.8→83.2); instrument finding #5 fixed (settled-height protocol for the DYNAMIC reference why band — its wrap grows 698→2487 px with the scrub; state deltas now derive from the census's stage-end stable heights; why reference heights now match our frozen-spec-faithful design at every bp: 807/1882/1768/2487/3316); why scoped E 71.6 @1440 on the lawful protocol. Wave-2 baseline for comparison: E 55.0 · T 96.5 % · Q 100. The wave-3 full matrix (settled protocol + copy reduction tree) is re-capturing clean after a contaminated first run (lead edited mid-capture — HMR reset reveals; recorded in the progress ledger). REMAINING: per-seat convergence to ≥88 (floors NOT met), the cta/why/footer height gaps, mobile mid/exit regressions.
- [T4] [P1] [TODO] Unify color/typography/spacing tokens (token drift + raw-value gates pass; changed targets within 1 point or improved).
- [T5] [P1] [TODO] Extend the design language to other public web pages (route inventory; zero clipping/overlap/overflow; WCAG AA; Lighthouse ≥90 sampled).
- [T6] [P1] [TODO] Apply the visual system to every authenticated web role (inventory-derived; visual only; every role exercised; no route newly accessible).
- [T7] [P2] [TODO] Adapt the language to Expo mobile (native conventions; representative screens per role/size; APK-only).
- [T8] [P2] [MEASURED — landing reduction landed @ `54cedd00`; full-suite close at T10] Reduce copy ≥20% without lost meaning: baseline pinned 1 398 Arabic words (docs/audit/evidence/landing-copy-baseline.json, deterministic script); the T8-a proposal applied in full with per-edit meaning checks + pinned-string verification → **1 115 words (−20.24 %, bar ≤1 118)**; 218 pinned-string tests green, typecheck green, copy-budget CLEAN, stylelint-gate green. Remaining at T10: e2e journey suites + full vitest on the integration tree.
- [T9] [P2] [TODO] Consolidate and archive safely (CSS ≥10% below 668,169 bytes; callers/links proven; provenance preserved).
- [T10] [P1] [TODO] Full acceptance, scorecard and handoff (all gates re-run with real results; residuals listed; no historic copies).

## Verification (per task, mandatory)

Before/after measurement with the committed instrument; `node --test scripts/conformance/pairs.test.mjs scripts/conformance/gates.test.mjs` green after any instrument change; focused product tests per the task's Checks list; diff reviewed; separate commit; push to the task branch.
