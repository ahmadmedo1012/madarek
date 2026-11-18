# Heron fidelity — execution progress

Execution branch: `exec/r368-heron-fidelity` (from `origin/plan/r368-heron-fidelity` @ `84e0a0dd`).
One row per task: task → commit → measurement before → after. Numbers are measured on this
machine, never copied from earlier rounds.

| Task | Commit | Before | After | Verification (real output) |
|---|---|---|---|---|
| T1 conformance contract | `fe6b7614` | Artifact printed base floor 40 / cap 50 while the gate applied R347 re-keys; intro 38.2 % and map 35.4 % read as violations under a `PASS` verdict (`docs/audit/project-audit.md`, RC-2) | Gate unchanged and now self-describing: `summary.coverage.policy.effective` names the limit actually applied per section with its written reason; console prints `floor 37*/cap 50` for intro, `floor 30*` for map, `floor 20*/cap 65*` for platform | `node --test scripts/conformance/gates.test.mjs` → 10/10 pass. `run.mjs --gate` full 10×5 matrix → `gate PASS`, rate 94.4 %, `gateFailures []`, provenance carries `sha/node/browser/playwright/dpr`. Second full run reproduces 94.4 % with per-section coverage within 1 pt. |
| T2 evidence baseline | _this commit_ | No machine-readable fidelity evidence: four top-viewport PNGs, no E/T/Q | Two instruments run for real: `fidelity.mjs` (named-state capture, in-process SSIM, pixelmatch diff, T/Q, `manifest.json` + validator) and `stress.mjs` (7 sizes: overflow, clipping, text-on-text, reachability). 20/20 local primary crops at state `entry`, every scroll landed. Reference side BLOCKED (§B1) | `fidelity.mjs --validate` → 20/20 local pairs, `referenceUnavailable: true`, E/T/Q `null` with reason. `stress.mjs` → 0 px overflow at all 7 sizes, 1 clipped label, 3 text-on-text collisions. |

## Blocker ×3 (owner decision needed before Tasks 3–9 can score)

### B1 — the public reference no longer exposes addressable sections

Measured 2026-11-18, pinned profile (Chromium 156.0.8078.4, Playwright 1.60.0, Node 22.22.1):
reference returns HTTP 200; `documentElement.scrollHeight` = **900 / 844** (one viewport) while the
frozen spec `_page.1440.json` records **14144**; `div.home-why-wrap` measures 698.125 (spec says
699, so the section is really there); `window.scrollTo(0, 1000)` moves nothing; `mouse.wheel`
×6 ×700 px changes the render every step. The sections paint but live in a virtual scroll stage,
so any "scroll to section top" lands at 0 and a viewport clip shows the painted scene, not the
section. The first capture attempt did exactly that — it scored Heron's **hero artwork as the why
section** and produced E 75.9 overall. Those numbers were DISCARDED, not reported, and the
instrument now refuses such a capture. Under the spec's own rule (reference values only from
approved observation sources) a wheel-driven scene index is a new protocol and needs approval.

**Options:** (a) approve the wheel-driven scene protocol (drive wheel, detect the active scene per
target, store step index + crop; ~1 day to build and validate at two viewports); (b) approve the
frozen spec as the sole reference — E becomes unmeasurable and the program reduces to geometry and
motion checks; (c) supply reference captures from a scrollable environment.

### B2 — E ≥ 90 is unreachable by construction with original artwork

E is SSIM against the reference crop while the same spec bans copying Heron's assets,
illustrations, fonts and copy. Two different illustrations on the same grid do not reach 0.90.
The highest value in the discarded run (94.3, map) was 6 300 px of mostly empty stage — it was
measuring emptiness, not likeness. Either E needs a composition metric built from the frozen
element census (grid, scale, density, whitespace), or E must be declared a regression dial rather
than a target.

### B3 — the intro overlay remounts and blocks reachability probes

`div.pl[data-spec="preloader.overlay"]` is fixed, `z-index: 320`, `pointer-events: auto`, and
covers the viewport. It clears on its own (~6 s) and then REMOUNTS; `fidelity.mjs` dismisses it
through its own `تخطي` control before every shot (that is why 20/20 crops are clean), but
`stress.mjs` still measures reachability while it is up, so its `unreachable` rows
(`button.fo-burger`, `button.hi-marker` "covered by div.pl") are not product verdicts yet. `_chrome`
territory (Task 7): is a post-intro overlay meant to stay mounted and interactive?

## Measured now (no reference needed) — `docs/audit/evidence/stress.json`

| size | overflow | clipped | text-on-text | note |
|---|---:|---:|---:|---|
| 320 | 0 px | 0 | 1 | hero title lines overlap 100 % (`span.hro-line` × `span.hro-line`) |
| 360 / 390 / 412 | 0 px | 0 | 0 | clean |
| 640×360 | 0 px | 1 | 0 | `a.btn.accent` label 251 px in a 249 px box ("أنشئ حسابك الجامعي") |
| 844×390 | 0 px | 0 | 0 | clean |
| 1440 | 0 px | 0 | 2 | plate number/label pairs `01`×`محور`, `02`×`قياس` at 100 % overlap |

The 1440 collisions are the qualitative "denser plate" finding from the audit, now measured. They
belong to Task 4 (hero) / Task 6, which cannot close while B1–B2 are open. |
