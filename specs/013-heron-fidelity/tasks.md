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
- [T2] [P1] [DONE — `exec/r368-fidelity-v2`] Owned raster asset system: eight authored media seats (hero 1368×643 / 340×388, usecase 724×880 / 374×254, platform 598×351 ×2 / 372×226 ×2) generated deterministically by `scripts/art/r368-original-media.py` (2× supersample → LANCZOS; 3.3–20.4 KB each; no reference pixel), provenance `docs/audit/evidence/media-provenance-r368.json`, `--check` stable 8/8. The Task-2 webp twins (light+dark ≤60 KB) remain as committed with dimensions/alpha/bytes in `asset-provenance-r368.json`. The r368 reference-band CROPS are retired (spec §Excluded: no reference image or crop ships as a product asset).
- [T3] [P1] [IN PROGRESS — `exec/r368-fidelity-v2`, from `wip/r368-t3` @ `2b226441`] Rework the ten landing seats in ascending valid E. Landed before this branch: intro/footer/hero/usecase/platform waves (`wip/r368-t3`). THIS BRANCH: instrument fix #3 (live masks bound and scaled in capture space) + the first full 10 targets × 5 viewports × 4 states × 2 sides re-capture → **E 57.2 · T 83.7 % · Q 100** before the originality swap (archived `docs/audit/evidence/waves/r368-w1-before-original-media.*`), then the reference-derived crops replaced by the authored media set (T2) and re-measured. REMAINING: the seat-height gaps measured in `capture.json` (390: intro +87 px, cta +409 px, usecase +32 px, platform +26 px, map −447 px; 1440: footer +192 px, cta +634 px, why +1343 px) and the per-seat convergence to ≥88 — the floors are NOT met.
- [T4] [P1] [TODO] Unify color/typography/spacing tokens (token drift + raw-value gates pass; changed targets within 1 point or improved).
- [T5] [P1] [TODO] Extend the design language to other public web pages (route inventory; zero clipping/overlap/overflow; WCAG AA; Lighthouse ≥90 sampled).
- [T6] [P1] [TODO] Apply the visual system to every authenticated web role (inventory-derived; visual only; every role exercised; no route newly accessible).
- [T7] [P2] [TODO] Adapt the language to Expo mobile (native conventions; representative screens per role/size; APK-only).
- [T8] [P2] [TODO] Reduce copy ≥20% without lost meaning (word-count script before/after; meaning check per deletion).
- [T9] [P2] [TODO] Consolidate and archive safely (CSS ≥10% below 668,169 bytes; callers/links proven; provenance preserved).
- [T10] [P1] [TODO] Full acceptance, scorecard and handoff (all gates re-run with real results; residuals listed; no historic copies).

## Verification (per task, mandatory)

Before/after measurement with the committed instrument; `node --test scripts/conformance/pairs.test.mjs scripts/conformance/gates.test.mjs` green after any instrument change; focused product tests per the task's Checks list; diff reviewed; separate commit; push to the task branch.
