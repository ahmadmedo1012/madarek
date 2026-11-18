# Heron fidelity program specification

**Status:** Proposed for review  
**Audit:** [`docs/audit/project-audit.md`](../audit/project-audit.md)  
**Reference sources:** frozen measurements in `docs/archive/redesign/r308/reference-observations.md` and `docs/redesign/r331/heron-program.json`; fresh comparison captures in `docs/audit/evidence/`  
**Implementation status:** not started

## Objective

Improve Madarek's public landing experience so its section composition, responsive geometry, and motion behavior reproduce the measured qualities of the Heron reference while retaining Madarek's Arabic-first content, original artwork, accessibility, and design-token rules.

This program uses three separately reported dimensions—image composition, measurement coverage, and motion behavior. The existing DOM/style conformance percentage remains a diagnostic and must not be described as a visual-fidelity percentage.

## Users and jobs

| User | Need |
|---|---|
| Prospective learner on desktop with a mouse | Understand the platform from a calm, legible technical landing page; inspect supported interactive details without losing page context |
| Prospective learner on a touch device | Get the same content hierarchy and clear actions with touch-appropriate layout and no pointer-only interaction requirement |
| Keyboard and assistive-technology user | Navigate the same sections and actions with visible focus, meaningful labels and equivalent non-motion content |
| User who prefers reduced motion | Read and operate the page with native, restrained movement and no essential information hidden behind animation |
| Designer/engineer/reviewer | Compare equivalent states with repeatable evidence and identify which fidelity dimension failed |

## Scope

### Included

- Public landing page section seats: hero, intro, problem, map, platform, why, use case, CTA and footer, plus shared landing chrome.
- Matched visual states at desktop 1440×900 and mobile 390×844, with responsive stress widths 320, 360, 412, 640×360 landscape and 844×390 landscape.
- Initial/settled state, section entry, representative scroll-linked state, pointer/touch behavior, keyboard operation, reduced motion, and light/dark themes where the product exposes them.
- A repeatable evidence manifest, visual comparison, trigger/coverage report, and motion trace for the same named states.
- Use of measured geometry, timing, easing and trigger information from approved frozen reference records.

### Excluded

- Reusing Heron source code, logos, text/copy, fonts, images, illustrations, or other copyrighted assets. Recreate the design language with Madarek-owned Arabic copy and original artwork.
- Rebuilding Heron's Webflow/GSAP/Barba stack or matching its implementation details for their own sake.
- Authenticated role pages, mobile-app screens, backend/API/schema work, new product features, or broad route redesign.
- Changing global tokens, raising bundle/style/conformance ceilings, lowering existing ratchets, weakening accessibility or behavior tests, or changing the frozen Heron baseline.
- Optimizing absolute FPS figures from a development server or an unpinned/shared browser environment.

## Product and technical decisions

1. **Keep three primary scores independent.** Report `E` (composition), `T` (trigger and evidence coverage), and `Q` (motion behavior). A weighted summary is useful only when every minimum gate passes.
2. **Use the current product architecture first.** Retain React/Vite, current route model, design tokens, original assets, and existing Lenis 1.1.5/conductor where appropriate. A library replacement requires a separate measured case and must preserve reduced-motion behavior.
3. **Treat frozen measurements as reference data, not reference code.** Source exact geometry/timing from the frozen observation JSON and note any value not actually verified there. New reference observations require dated evidence and a review record.
4. **Compare normalized states.** Use the same viewport, route, scroll progress, interaction, theme, motion preference, device-pixel ratio, browser build and font-ready condition on both captures. Wait for a named settled state; do not choose an arbitrary delay per screenshot.
5. **Use original content and owned assets.** Preserve Arabic-first wording and the Madarek identity. Compare composition, silhouette, whitespace, grid, contrast, scale and crop; never require copied reference text or files.
6. **Keep implementation local to the owned landing seat.** Section adjustments belong in their existing components/styles and mappings. Shared motion, conformance tooling, tokens, baselines, ceilings and workflows remain lead-owned under `AGENTS.md`.
7. **No implementation begins until the measurement gate is reconciled.** The stored result has intro/map coverage below its stated floor and a platform heuristic rate above its cap, while `gateFailures` is empty. Correctly explain or correct that contract before trusting the gate.

## Measurement model

### E — visual composition (0–100)

For each matched section and state, align viewport captures to the same crop and compare a named region using SSIM. Convert SSIM to a 0–100 score, then report per-target scores and the unweighted mean across target states. Exclusions are limited to preregistered dynamic text/data masks; masks may not hide section layout, artwork, illustration silhouettes, grids, controls, or whitespace. Use a stable browser/render profile and retain both images, masks and raw per-target values.

`E = 100 × mean(SSIM(target region, reference region))`

SSIM is a visual proxy, not a human judgment. If repeated capture noise exceeds one score point on the same state, fix the capture profile before scoring product changes.

### T — verified state and trigger coverage (0–100)

Each section/state pair in the signed matrix counts once. A pair is covered only when both reference and Madarek have a named state, capture or trace, viewport, trigger condition and recorded result. A skipped, heuristic-only, unmatched or undocumented state is uncovered.

`T = 100 × verified matched pairs / required pairs`

Report coverage per section and per state family; do not let high coverage in one section offset a missing counterpart in another.

### Q — motion behavior (0–100)

For each approved motion trace, compare matched samples at normalized scroll progress and input checkpoints. A sample passes when trigger position is within ±2% of the section's scroll span, normalized displacement/opacity/scale is within ±5% of the reference value, settle behavior is within two rendered frames of the measured target, and the sequence has the same semantic direction/order. Values marked unverified in frozen reference data are excluded until measured and approved.

`Q = 100 × passing approved samples / total approved samples`

Report scroll curve, reveal timing, page/route transition and interactive states separately. Reduced-motion states are an accessibility acceptance test, not a request to imitate reference motion.

### Optional composite

`F = 0.45E + 0.25T + 0.30Q`

Show `F` only when all minimum gates below pass. Always display E, T and Q beside it. A composite never overrides a failed per-section floor or accessibility failure.

## Acceptance criteria

1. **Evidence completeness:** T ≥95% overall; every one of the 9 content sections and shared chrome has a reference/local counterpart for both primary viewports. No section may have T <90%. The 6 stress widths are checked for clipping, collisions, focus/action reachability and text overflow even where no reference capture is available.
2. **Visual composition:** E ≥90 overall across the primary matrix, with E ≥88 for every section at both 1440×900 and 390×844. No target may regress by more than 2 points from its accepted baseline without an approved reason.
3. **Motion:** Q ≥90 overall and ≥85 for each measured motion family. No approved trigger sample may be missing. Values not confirmed from reference evidence remain explicitly marked unverified and cannot be used as passing samples.
4. **Responsive behavior:** zero unintended overlap, clipping, horizontal page overflow, or unreachable primary action across all 6 specified sizes. Technical-plate labels do not overlap at 640×360 or 844×390.
5. **Accessibility:** all content and actions remain available with reduced motion; keyboard focus is visible and ordered; pointer-only effects have non-pointer equivalents; no meaningful state relies on color or animation alone. Existing a11y tests remain unchanged or stronger.
6. **Performance:** preserve current bundle ceilings and do not worsen the accepted production-build INP p75/CLS baseline. Landing scroll trace must meet the project's declared frame/LoAF target before claiming motion completion; capture build, browser, CPU throttle and hardware details with each result. Do not substitute dev-server timing.
7. **Existing quality gates:** lint/typecheck/tests, design gates, bundle, CSS ratchet, graphics validation, conformance gate and focused browser checks pass on a supported Node version. Any pre-existing failure must be recorded and resolved or explicitly classified before release; no gate is weakened.
8. **Ownership and originality:** no Heron assets, text, logo, source, or fonts enter the product. Only task-owned landing files and approved shared-tool ownership are changed. No token, baseline, ceiling or workflow changes without explicit ownership in the task brief.
9. **Reporting:** publish the evidence manifest, per-section E/T/Q table, raw run outputs, failed/untested states and exact command/runtime details. Never report only the composite.

## Success tests

| Acceptance area | Success test / evidence |
|---|---|
| Comparison repeatability | Capture the same primary state twice on the pinned profile; E varies by ≤1 point. Confirm all target images and explicit masks are stored. |
| Section coverage | Validate the manifest contains 9 content seats × 2 primary viewports and shared chrome, with no missing pair; calculate T from actual evidence rows. |
| Composition | Run the approved SSIM comparison for all primary target pairs; verify aggregate and per-section thresholds and inspect every low-scoring region. |
| Motion parity | Capture matched reference/local traces at approved checkpoints; calculate Q from sample-level tolerance rules. Verify pointer/touch and navigation states separately. |
| Responsive stress | Inspect or automate the six stress dimensions; assert no page overflow, section collision, clipped control, or inaccessible primary action. |
| Reduced motion and keyboard | Run existing accessibility/browser checks with reduced-motion enabled and keyboard-only navigation; verify content order and actions without animation. |
| Runtime guardrails | Production build + bundle check + throttled scroll trace; record INP, CLS, LoAF, dropped frames, browser and hardware. |
| Regression | Run project lint, typecheck, unit suites, design gates, CSS ratchet, graphics verifier and conformance gate on supported Node. |
| Ownership/originality | Review changed-file list and asset/copy provenance; confirm only owned sources changed and no Heron-origin asset or copy was added. |

## Risks and open decisions

- **The current conformance result is internally inconsistent with its documented coverage rules.** Confirm whether reviewed exceptions explain it; otherwise fix the reporter/gate before using the result.
- **Historical R366 measurements disagree across reports and are not fresh.** Re-measure the chosen baseline under one pinned environment. Do not cite old Lighthouse numbers as current.
- **SSIM can penalize legitimate Arabic copy and owned artwork.** Keep masks narrowly scoped and preregistered, compare geometry and artwork rather than semantic glyph content, and include reviewer inspection. If a stable perceptual tool cannot be selected, do not invent an E score; resolve the metric before implementation.
- **Exact reference values may be absent or marked unverified.** Such states need a live observation record or remain outside Q until measured; do not infer timing from a minified bundle summary.
- **Existing local setup is not reproducible.** Current audit saw Node v26 outside the supported range, missing local `adm-zip`, an incomplete/stale Prisma client, one failing scroll-restoration test and a conformance path issue. Normalize setup before using full-gate status as proof.
- **Scope can expand across web, mobile and authenticated roles.** Keep this program to public landing seats; propose separate specs if evidence identifies material app/mobile parity work.
- **Effort depends on low-coverage sections and CSS ownership.** Do not promise a fixed percentage improvement until a stable baseline and section ownership are approved.

## Readiness

This is a testable product specification, but **not implementation-ready** until (1) the conformance threshold/result discrepancy is explained or fixed, (2) a supported, reproducible browser/runtime profile is selected, and (3) the visual-comparison tool and dynamic-mask policy are agreed. The implementation plan must put those decisions first and keep code work out of this documentation stage.
