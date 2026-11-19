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
- [T2] [P1] [TODO] Build the owned raster/SVG asset system (Madarek artwork, per-asset 1×/2× + alpha + byte evidence; E/T capture for affected sections; bundle ≤770 KB).
- [T3] [P1] [IN PROGRESS — wave 5 on wip/r368-t3] Rework the ten landing seats in ascending valid E. LANDED: mirror law + intro plate; footer wordmark/grid; hero stress fixes + the measured media plate (E 46.5→62.7 under the corrected instrument); usecase un-mirror + measured media plates (46.5→60.3); platform media plates (48.5→54.5). INSTRUMENT: settle veil ordering fixed (#4), live masks bounded/scaled on the right grid and re-baselined with a fresh paired capture (#3). WORKING BASELINE (`full-base`, fresh pair): E 59.0 · T 98.3% · Q 100 · stress 7/7; seats: problem 71.6, cta 65.2, why 64.0, hero 62.7, chrome 61.0, usecase 60.3, platform 54.5, map 52.0, footer 49.9 (T 75%), intro 48.4. REMAINING: per-seat convergence to ≥88 (plates + block profile), footer height/END seat (ours 844 vs 711, 119px trailing), map/why/problem mirror flips, intro ink-reveal scrub + copy mass, mid-state tonal work.
- [T4] [P1] [TODO] Unify color/typography/spacing tokens (token drift + raw-value gates pass; changed targets within 1 point or improved).
- [T5] [P1] [TODO] Extend the design language to other public web pages (route inventory; zero clipping/overlap/overflow; WCAG AA; Lighthouse ≥90 sampled).
- [T6] [P1] [TODO] Apply the visual system to every authenticated web role (inventory-derived; visual only; every role exercised; no route newly accessible).
- [T7] [P2] [TODO] Adapt the language to Expo mobile (native conventions; representative screens per role/size; APK-only).
- [T8] [P2] [TODO] Reduce copy ≥20% without lost meaning (word-count script before/after; meaning check per deletion).
- [T9] [P2] [TODO] Consolidate and archive safely (CSS ≥10% below 668,169 bytes; callers/links proven; provenance preserved).
- [T10] [P1] [TODO] Full acceptance, scorecard and handoff (all gates re-run with real results; residuals listed; no historic copies).

## Verification (per task, mandatory)

Before/after measurement with the committed instrument; `node --test scripts/conformance/pairs.test.mjs scripts/conformance/gates.test.mjs` green after any instrument change; focused product tests per the task's Checks list; diff reviewed; separate commit; push to the task branch.
