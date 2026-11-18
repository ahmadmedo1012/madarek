# Heron-inspired product fidelity specification

**Status:** Proposed for review; implementation not started
**Audit:** [`docs/audit/project-audit.md`](../audit/project-audit.md)
**Evidence:** [`docs/audit/evidence/`](../audit/evidence/)
**Reference:** `heronaiapp.com`; frozen measurements in `docs/archive/redesign/r308/reference-observations.md` and `docs/redesign/r335/heron-spec/`

## Goal

Bring Madarek close to the measured visual and interaction quality of Heron's public experience: scroll feel, reveal and page transitions, cursor and loading sequence where appropriate, layered pre-rendered artwork, SVG geometry, color, typography, spacing, and responsive composition. Establish this language on the landing page and other public pages, then apply the same craft standard to every web application role and the Expo mobile app. Keep Madarek's Arabic-first identity, product meaning, and workflows; reduce unnecessary copy and simplify the implementation as work is accepted.

The reference informs visual and interaction craft only. Madarek keeps its own brand, Arabic educational content, and original artwork.

## Users

Visitors; students; teachers; administrators (`ADMIN`, `OWNER`); quality staff (`QUALITY`, `QUALITY_OFFICER`); and registrar/exam staff (`REGISTRAR_GENERAL`, `COLLEGE_REGISTRAR`, `EXAMS_CONTROLLER`). Role pages are in scope for visual treatment only. Preserve their existing permissions, data, routes, and tasks. Include keyboard, assistive-technology, reduced-motion, touch, and low-bandwidth users in acceptance.

## Scope

### Included

- Public landing seats: hero, intro, problem, why, use case, platform, map, CTA, footer, and shared chrome.
- Other public web pages, including features, about, help, contact, auth, and legal surfaces that exist in the route inventory.
- All existing authenticated web pages and role-specific shells, with no changes to role behavior.
- Existing Expo mobile screens and navigation, adapted to native interaction rather than copied pixel-for-pixel from web.
- Responsive and accessibility states: 320, 360, 390, 412, 600, 768, 820, 1024, 1280, 1440, 1920, 2560; 640×360 landscape; foldable; light/dark where supported; RTL; 200% zoom; reduced motion; and 4× CPU slowdown.
- Reproducible paired evidence and a shared fidelity scorecard for every comparable public landing section. For non-reference pages, judge hierarchy, consistency, usability, accessibility, and responsive quality against Madarek's own design system.
- Copy reduction and safe consolidation/archive recommendations after behavior and ownership are mapped.

### Excluded

- Any change to business logic, roles, permissions, API contracts, database schema/data, production environment, deployment, or existing user workflows.
- iOS push/release work; Android output remains APK only, and iOS remains “coming soon”.
- New product capabilities or route/field/model renames.
- Lowering conformance, accessibility, size, CSS, or other project gates; changing frozen reference baselines to improve scores.
- Heron's source, logo, text, fonts, images, illustrations, or other proprietary assets. Recreate the measured composition and motion using Madarek-owned copy and newly created/licensed assets.

## Decisions and constraints

1. **Measure before choosing technology.** Heron live inspection found Lenis 1.1.5, GSAP 3.12.5/ScrollTrigger, SplitText 3.13, Barba 2.10.3 and Swiper 11; 26–41 active triggers at five widths, and no canvas or WebGL was observed in the sampled DOM. Heron artwork is largely pre-rendered AVIF/WebP plus layered SVG and CSS transforms. These observations are evidence, not a mandate to install the same stack.
2. **Keep current architecture until a measured comparison proves otherwise.** Evaluate current `sheetLenis.ts`, motion conductor, route transitions, CSS and native Expo patterns against live reference traces. Adopt or replace a library only when the same-state traces show a meaningful fidelity gain, reduced-motion and touch behavior remain correct, and the full async bundle remains ≤770 KB gzip. Lazy loading does not reduce the aggregate gate by itself.
3. **Protect asset quality.** Use Madarek-owned artwork. Compare source dimensions, alpha, layer composition, crop, transfer size and high-DPR sharpness. The observed R366 examples save 27.3–75.1% bytes, but high-DPR quality was not tested; do not impose a universal 60 KB target where it creates visible softness.
4. **Use platform-native interaction.** On web, compare pointer and touch behavior and honor `prefers-reduced-motion`; on Expo, use native navigation/gesture facilities and equivalent visual timing rather than embedding a web scroll engine.
5. **Preserve design and ownership rules.** Use existing token sheets and component patterns. Respect `docs/redesign/r341/OWNERSHIP.md`, current route sources, Arabic RTL rules, icon policy, CSP and all test contracts. Shared gates, mappings, ceilings and workflows remain lead-owned.
6. **Simplify after parity is measured.** Remove duplicate rules/components/docs only after callers, ownership, generated references, tests and before/after behavior are identified. Archive historical records instead of deleting provenance.

| Decision | Rejected alternative | Evidence-based reason |
|---|---|---|
| Measure current Lenis/conductor and transition traces before changing libraries | Install Heron's full library stack immediately | Heron runtime names do not prove that a new dependency improves Madarek; aggregate bundle budget is already tight, and current Q lacks reference trigger samples. |
| Use Madarek-owned artwork, with per-asset quality exceptions | Copy Heron files or enforce ≤60 KB on every image | Originality is mandatory; four local examples show substantial byte savings but do not establish 2× sharpness or a universal quality/size tradeoff. |
| Keep web and Expo interactions platform-native while sharing visual tokens | Embed the web experience or smooth-scroll engine in mobile | It adds runtime weight and conflicts with native touch, navigation and accessibility behavior. |
| Keep copy changes measured and page-family specific | Apply a global text-trimming percentage to every route | Legal, help, auth and role instructions carry meaning that a blanket reduction can remove. |

## Fidelity scorecard

Score public landing sections individually: hero, intro, problem, why, usecase, platform, map, CTA, footer and chrome. Capture paired reference/local states at 390×844, 768×900, 1024×900, 1440×900 and 1920×1080; compare scroll states only when both sides have a valid, named coordinate/state protocol.

- **E — composition (0–100):** `100 × mean(SSIM)` over predeclared, aligned section regions and states. Preserve raw images, crop coordinates, masks and per-state values. Masks may cover only dynamic content approved before the run; never mask layout or artwork.
- **T — evidence coverage (0–100):** `100 × verified required matched state pairs / required pairs`. A pair counts only with both sides' same viewport, route/section, scroll or interaction state, capture coordinates and valid output. Presence of files alone does not count.
- **Q — motion parity (0–100):** `100 × passing verified motion samples / approved comparable samples`. For each sample require trigger position within ±2% of section scroll span, displacement/opacity/scale within ±5% of the reference, settle within two frames, and matching semantic order/direction. Keep scroll, reveal, route transition, cursor and touch families separate. Unknown reference values remain unscored.
- **F (optional):** `0.45E + 0.25T + 0.30Q`, shown only when all component minimums pass. F never hides a failed section or quality gate.

The current stored E=56.7 and Q=85 are diagnostic only; the current T=100% is a file-completeness result, not verified state coverage. Only 3/20 local/reference roots are aligned within ±2 px. Rebaseline E/T/Q after fixing capture coordinates and wheel-driven reference state mapping. The low current E is not proof that the target is unreachable.

## Acceptance criteria

1. **Reference landing match:** on all five comparison widths, each of the ten targets has named, coordinate-valid reference and local states. T ≥95% overall and ≥90% for every target; 100% of confirmed reference trigger families are mapped and tested. If the public reference no longer exposes a reproducible state, document the exact limitation and use reviewed frozen measurements; do not score a mismatched crop as a pass.
2. **Visual:** E ≥90 overall and ≥88 per target at each comparison width after valid alignment. No accepted target regresses >2 points without a recorded review decision. Inspect and sign off every comparison sheet.
3. **Motion:** Q ≥90 overall and ≥85 per measured family; all verified triggers, easing/timing checkpoints and semantic order match within the scorecard tolerances. No claim for unmeasured Barba, cursor or touch values.
4. **Whole-product responsive quality:** zero unintended overflow, clipping, overlap, unreachable primary action, or broken RTL layout across the 12 widths/orientations, foldable, 200% zoom, supported themes, reduced motion and 4× CPU. Authenticated role routes must be sampled for every role and page family, including empty/loading/error states.
5. **Performance:** Lighthouse mobile ≥90 on `/` and representative public, auth and app routes; record LCP, CLS and INP. Landing scroll trace has no >50 ms LoAF and no dropped-frame regression against pinned production-build baseline. Record browser, hardware, throttling and build. Do not substitute development-server timings.
6. **Accessibility:** WCAG 2.2 AA checks pass on representative routes; text contrast meets AA and record APCA readings for visual review. Keyboard, screen reader labels, touch targets, focus, reduced motion and non-color state cues remain usable. No content depends on animation.
7. **Text and maintainability:** reduce landing copy by at least 20% from the committed baseline without deleting meaning, required legal/help content, or role instructions; reduce landing stylesheet bytes by at least 10% from the audited 668,169-byte baseline and remove all lint errors, without increasing CSS/file gates. Record actual changed lines/files and rationale; do not optimize counts at the cost of readability or functionality.
8. **Existing project gates:** supported Node 20–24; typecheck, unit/backend tests, lint, design gates, graphics checks, CSS ratchets, bundle ≤770 KB gzip, e2e and relevant mobile checks pass. Resolve or classify existing failures before release; never weaken a gate.
9. **Behavior/originality:** routes, permissions, APIs, data and workflows are unchanged. No Heron-origin asset, text, logo or font is introduced; every new asset has a recorded source/license and Madarek ownership.
10. **Evidence:** commit manifests, raw per-target scores, paired sheets, motion traces, accessibility/performance outputs and all untested states with reasons. Repeated same-state E varies by at most one point.

## Risks

| Risk | Mitigation |
|---|---|
| The current capture protocol scores misaligned roots and a wheel-driven reference stage | Fix coordinate/state capture first; validator rejects invalid pairs; keep current values labeled diagnostic. |
| Similarity metrics may penalize legitimate Arabic copy and original artwork | Use constrained, preregistered dynamic masks, SSIM plus human review, and keep copy/brand ownership. |
| Current evidence does not verify all touch, cursor, preloader or route-transition details | Measure those families or leave them explicitly open; do not infer values from script names. |
| Reusing Heron assets or copy creates ownership risk | Build original Madarek assets and copy; keep provenance in the evidence/asset manifest. |
| Broad scope can disrupt routes and role workflows | Assign disjoint file owners, run route/role regression checks, and separate visual-only changes from behavior. |
| Asset compression may reduce detail at high DPR | Compare before/after at 1× and 2× with alpha and edge/detail inspection; restore quality when visible loss appears. |
| CSS cleanup may change responsive cascade | Capture computed-style snapshots and compare all affected viewports before deletion. |

## Success test checklist

- [ ] Valid paired capture/repeatability and section scorecard meet E/T/Q criteria.
- [ ] Trigger, scroll, reveal, transition, pointer/touch and reduced-motion families are measured and pass or are explicitly unverified.
- [ ] All listed viewports, role families and mobile screen families pass responsive and usability review.
- [ ] Lighthouse, Web Vitals, accessibility, bundle and repository gates pass on the pinned environment.
- [ ] Copy and CSS reductions meet targets without losing meaning or behavior.
- [ ] Provenance confirms original/licensed assets only; routes, permissions, API and data contracts are unchanged.
- [ ] Audit and evidence list every residual limitation; no score is claimed from missing or misaligned evidence.

**Review gate:** This document is a proposed specification. It authorizes no implementation; the owner reviews scope and thresholds before a separate implementation branch begins.
