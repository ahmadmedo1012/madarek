# Madarek project audit: Heron fidelity

**Audit date:** 2026-11-18  
**Repository baseline:** `main` at `347e2508`  
**Working branch:** `plan/r368-heron-fidelity`  
**Scope:** evidence-led assessment of the current web experience and its ability to measure and improve fidelity to the frozen Heron reference. No application code was changed.

## Executive summary

Madarek has a capable visual-conformance harness, a substantial hand-built landing page, a measured Lenis scroll contract, and healthy build/bundle gates. The current **94.4% conformance pass rate is not a 94.4% visual-fidelity score**: the committed run reports 52.7% measurement coverage overall, only 38.2% for intro and 35.4% for map, and uses DOM/style checks rather than image similarity. The recorded run is from `localhost:5173` at `2026-11-18T00:24:32.932Z`; it was not reproduced during this audit.

Fresh paired top-of-page captures at 1440×900 and 390×844 show the intended structural cues—header, technical plate, title/action and spacious framing—but also a clear composition gap. The Heron plate is quieter, with a small centered architectural drawing and a large amount of open space; Madarek's plate is denser, with more labels, orange markers, grid detail and a different crop/scale. These are qualitative observations, not a pixel-difference measurement. Evidence: [desktop Heron](evidence/heron-1440-top.png), [desktop Madarek](evidence/madarek-1440-top.png), [mobile Heron](evidence/heron-390-top.png), [mobile Madarek](evidence/madarek-390-top.png).

The immediate bottleneck is evidence quality and traceability, followed by landing-page motion smoothness and CSS debt. Existing R366 scroll documentation reports interaction p75 ≤160 ms and CLS ≤0.032, but also reports landing-page long-animation frames and 72–104 dropped frames under its throttled trace. Those figures are historical evidence from the report, not fresh measurements here. Frontend tests have one reproducible failing scroll-restoration case; backend tests pass. Typecheck is blocked by a local generated-client/dependency mismatch. CSS lint reports 39 errors and 84 warnings, while its ratchet gate passes against an older error baseline of 45.

### Current scale and health snapshot

| Area | Measured snapshot | Interpretation |
|---|---:|---|
| Web source | 430 files under `frontend/src`; 79 page files | Broad UI surface; not all pages are visually audited |
| Mobile | 125 Expo route files | Mobile has a separate visual and release surface |
| Backend | 101 Prisma models; 48 migrations; 37 route files; 302 HTTP registrations | Significant product/data surface; route registrations are not unique product journeys |
| Landing CSS | 668,169 bytes across `styles/landing/*.css` | Large styling surface with cascade/debug cost |
| Raster assets | 56 assets, 2,471 KB under `frontend/public/media` | Verifier passes its budget/theme/name checks; size alone says nothing about composition fidelity |
| JS bundle | 762.5 KB gzip total; entry 66.2 KB; PDF chunk 95.7 KB | Passes the current checker (total ceiling 774 KB); only 11.5 KB headroom |
| Conformance run on disk | 65,614/69,537 checks pass (94.4%); coverage 52.7% | Existing artifact only; not run afresh in this audit |
| Focused frontend suite | 3,154/3,155 tests pass; one scroll-restoration case fails | Reproduced failure: throwing sessionStorage test expected 0, got 800 |
| Backend suite | 2,658 passed; 19 skipped | Passes locally |

Counts and bundle figures were read from the current checkout/tool output on the audit date. They are workspace observations, not CI badges or long-term guarantees.

## Tooling and verification

| Tool/check | Result | Evidence and limits |
|---|---|---|
| Firecrawl public-page scrape | Heron homepage and its public configuration/bundle were reachable | Establishes current public-page structure and asset formats; it does not reveal trustworthy exact motion timing/version details. Frozen local Heron measurements remain the specification source. |
| Paired browser captures | 1440×900 and 390×844, top viewport | Fresh visual evidence stored in this audit folder. Only top viewport; not a full-page, scroll, interaction, landscape, reduced-motion, or dark-theme comparison. |
| `agent-browser doctor` | Pass: system Chrome 157 launch, 11 checks | Browser availability only; not product QA coverage. |
| `npm run lint` | Pass, 0 errors and 19 warnings | Existing warnings span inbox, college, owner, AI assistant and teacher pages. |
| `npm run typecheck` | Fail in backend typecheck | `PrismaClient` lacks generated `aiInstitutionQuota` and `studentDocument` members despite both models existing in `schema.prisma`; `adm-zip` is declared but absent locally. Likely stale/incomplete local install or generated client; source/environment cause is not isolated. |
| `npm test` | 3,154/3,155 frontend tests pass | One reproducible case: `tests/unit/useScrollRestoration.test.tsx`, “throwing sessionStorage”; expected scrollTop 0, received 800. Root cause remains unconfirmed. |
| `npm run test -w backend` | Pass: 2,658 passed, 19 skipped | Local backend unit suite. |
| `npm run build -w frontend` | Pass | Vite 5.4.21 built 2,061 modules. Warned about malformed `[data-spec=footer.c2bottom]` selector and mixed static/dynamic imports of `toast.ts`. |
| Bundle check | Pass: 762.5 KB gzip total / current checker ceiling 774 KB | Entry 66.2/92 KB; PDF 95.7/110 KB. Project guide text says 770 KB; current checker and current R366 notes say 774 KB. Resolve this documentation/ceiling discrepancy before treating the limit as one source of truth. |
| CSS lint | 39 errors, 84 warnings | Direct Stylelint result. Ratchet passes because errors are below its baseline of 45; warning growth is not gated. |
| CSS debt ratchet | Pass | 81 sheets; 41 important declarations, 72 raw z-index values, 29 raw hex values, each below the recorded ratchet. A pass means no regression against the ratchet, not zero debt. |
| Design-token / icon / raw CSS / motion / CSP gates | Pass | Local commands: `tokens:check`, `check:icons`, `check:colors`, `check:raw-css`, `check:motion-tokens`, `check:csp-hash`. |
| Graphics verifier | Pass | 56 raster assets / 2,471 KB; budget, theme pairs, naming and dimensions pass. |
| Impeccable detector | 22 flags | Leads for review only, not confirmed defects. Flags included width transitions, gradient text, bounce easings, Geist Mono and side tabs. |
| Fresh conformance run | Not completed | Runner failed resolving dependencies from its hard-coded `/home/z/madarek/frontend` path. Current Node is v26.13.1, outside repo's supported `>=20 <25`; do not use the stored result as a fresh result. |
| Full `scripts/verify.sh` | Not run | Audit scoped to component checks; a full gate run was not necessary to document the current evidence, and the local environment has known typecheck/test blockers. |

## Section scorecard

The values below are transcribed from the committed `scripts/conformance/results.json`, generated 2026-11-18. Pass rate means checked DOM/style pairs meeting the frozen parameter rules. Coverage is the instrument's estimate of measured checks against measured plus off-book estimate. Neither is pixel similarity or a human visual-fidelity rating.

| Section | Pass rate | Coverage | Audit status |
|---|---:|---:|---|
| Chrome | — | 76.6% | Recorded coverage; no fresh cross-route review |
| Footer | — | 41.5% | Near measurement floor; off-book estimate 58.5% |
| Home CTA | — | 94.9% | Strongest measured coverage; needs visual and responsive confirmation |
| Home hero | — | 64.0% | Fresh top capture shows composition and density divergence |
| Home intro | — | 38.2% | Below documented 40% floor; recorded gate nevertheless says PASS |
| Home map | — | 35.4% | Below documented 40% floor; recorded gate nevertheless says PASS |
| Home platform | — | 41.1% | Heuristic share 58.5% exceeds the stored 50% threshold; recorded `gateFailures` is empty |
| Home problem | — | 56.2% | Partial measurement; needs matched state/scroll evidence |
| Home use case | — | 92.5% | High measured coverage; not a visual-quality guarantee |
| Home why | — | 52.8% | Partial measurement; needs matched state/scroll evidence |
| Overall | 94.4% pass | 52.7% | Stored gate says PASS vs 91.6 ratchet; 98 unmatched failures and 3,727 omitted unmatched checks are reported |

The apparent threshold mismatch is a release-blocking measurement question: verify whether this artifact intentionally carries reviewed exceptions or whether the result writer failed to record failures. Do not use its `PASS` alone as proof of visual fidelity. The five open report sections also need their per-section pass rates extracted from a reproducible fresh run.

## Motion comparison

| Dimension | Heron reference evidence | Madarek current evidence | Gap / proof needed |
|---|---|---|---|
| Smooth scroll | Frozen Heron notes identify Lenis 1.1.5 with GSAP/ScrollTrigger orchestration | `lenis` 1.1.5 is pinned; `sheetLenis.ts` drives the window from a shared conductor clock; reduced motion skips engine initialization | Same Lenis version is useful, but does not establish matching feel. Compare measured input-to-position curves on identical routes/viewports. |
| Scroll-linked motion | Heron public bundle scrape suggests GSAP and scroll interactions; exact values not independently verified | Madarek uses its own conductor, CSS custom properties, reveals and section-specific animation logic | Record trigger positions, easing, duration, displacement and settle behavior for each matched section. |
| Route transitions | Reference public site uses an animated page experience; exact trigger/timing not independently established from scrape | React Router app shell and CSS transitions; public guest page has Lenis | Compare route transition only where both experiences have equivalent navigation states; avoid inferring library parity from appearance. |
| Reduced motion | Needs current reference observation | Madarek explicitly uses native scroll and does not initialize Lenis under reduced motion | Define accessible behavior acceptance separately; never require motion where OS preference requests reduction. |
| Runtime performance | No fresh Heron trace captured | R366 report: INP p75 worst 160 ms and CLS worst 0.032; landing long-animation frames and dropped frames remain above stated target under 4× CPU trace | Recapture on pinned runtime/hardware and separate visual curve parity from frame-budget compliance. |

Exact Heron timing and trigger values must come from frozen measured records in `docs/archive/redesign/r308/reference-observations.md` and `docs/redesign/r331/heron-program.json`, not reverse engineering or copying reference source/assets.

## Asset inventory and visual defects

The verifier sees 56 raster files in `frontend/public/media` (2,471 KB) and passes its technical checks. The broader public asset tree has 71 image/vector files in the recorded inventory. The landing page also has substantial inline/SVG/DOM artwork. The visual comparison shows that Madarek's hero plate has more annotation and stronger accents than the reference. This is evidence of a composition difference, not proof that any individual image is low quality or oversized.

| Viewport/state | Observed difference | Confidence | Evidence |
|---|---|---|---|
| 1440×900, landing top | Madarek technical plate is denser; label/marker count and grid contrast compete with the architectural form; title begins near the lower crop. Heron has a smaller centered form and more open framing. | High for this capture/state | `heron-1440-top.png`, `madarek-1440-top.png` |
| 390×844, landing top | Both retain header → plate → title order. Madarek's plate occupies a more annotated, busier field; its hint and two-line title/action change the vertical rhythm. | High for this capture/state | `heron-390-top.png`, `madarek-390-top.png` |
| 640×360 landscape | R366 agent request records overlap among technical-plate registration labels. Historical report; not independently reproduced here. | Medium | `docs/redesign/r366/agent2-shell/REQUESTS-agent2-to-agent1.md` |
| Landing scroll, throttled desktop/mobile | R366 trace records 46–67 ms mobile and 95–114 ms desktop LoAF ranges; 72–90 and 87–104 dropped frames respectively. These are historical figures and the docs also note environment sensitivity. | Medium | `docs/SCROLL-ARCHITECTURE.md` and R366 evidence path referenced there |

No pixel-diff percentage, visual rating, current landscape capture, or fresh scroll trace was produced in this audit. Evidence files are captures, not Heron source material. Keep them as comparison artifacts; do not import reference assets or text into the product.

## Root-cause categories

1. **Metric mismatch:** a DOM/style conformance pass rate is presented too easily as “fidelity,” though image composition and motion perception are not measured by that percentage.
2. **Coverage and gate semantics:** recorded intro/map coverage is below the stated floor and platform heuristic share exceeds its cap, yet the artifact reports no gate failures. The acceptance contract and result generation need reconciliation.
3. **Incomplete evidence matrix:** the existing proof is fragmented across rounds; this audit adds only paired top captures at two widths. There is no single reproducible set spanning sections, scroll positions, interaction states, landscape, dark mode and reduced motion.
4. **Motion measured as implementation details, not parity:** sharing Lenis 1.1.5 is not sufficient; trigger, curve, duration, input response and settling behavior need comparable traces. Historical landing performance does not meet the documented frame target.
5. **Cascade debt and ratchet blind spots:** landing CSS is 668 KB; Stylelint has 39 errors/84 warnings, but the error ratchet permits up to 44 and does not gate warning growth. This makes section-specific adjustments harder to reason about.
6. **Composition/asset acceptance gap:** technical asset budgets and pairing pass, but there is no measured visual acceptance for scale, empty space, line weight, annotation density or crop. This is a verification gap, not a confirmed asset-pipeline defect.
7. **Environment reproducibility:** Node v26 is outside the declared range; local `adm-zip` is missing and generated Prisma client is stale or absent. Conformance runner resolves a different machine path. These block reliable verification independent of intended product behavior.
8. **Broad product surface:** web, mobile, public pages and role-based app screens exceed the evidence captured for this audit. Cross-surface parity lacks one current inventory and a prioritized test matrix.

## Simplification opportunities

Estimates below are planning ranges, not measured savings. Rebaseline them in the implementation task before claiming completion.

| Opportunity | Candidate simplification | Estimate / measurable target |
|---|---|---|
| One fidelity scorecard | Keep DOM conformance as a geometry/token subscore; add matched image regions and motion curve/trigger coverage with explicit weights | Replace one ambiguous headline with three independently reported scores; all 10 landing sections covered at 5 agreed breakpoints |
| Unify landing scroll-linked updates | Route section progress through the existing conductor and remove duplicate per-section listeners/writes after ownership review | Audit 8 landing seats; aim for 1 shared scroll clock and ≤1 progress write per active seat/frame |
| CSS cleanup after visual freeze | Consolidate duplicate selectors and obsolete overrides in landing sheets; retain scoped measured values | Reduce Stylelint errors from 39 to 0 and warnings from 84 to ≤57; keep all CSS count metrics at or below current values |
| Hero plate composition | Reduce decorative/annotation layers, then retune scale, crop and whitespace using owned assets | One approved desktop/mobile composition per hero state; label collisions = 0 at 320, 360, 390, 412, 640×360 and 844×390 |
| Evidence pipeline | Standardize capture route, viewport, state, wait/settle, screenshot name and run metadata | 10/10 landing sections × 5 widths plus desktop/mobile dark and reduced-motion states; reproducible manifest with zero missing counterparts |
| Release environment | Pin supported Node and generate Prisma client/dependencies in documented setup | Clean install reproduces typecheck + focused test results with no hidden machine path dependency |

## Verification outputs and limits

- Successful: lint, backend tests, frontend production build, bundle check, CSS debt ratchet, token/icon/color/raw-CSS/motion/CSP gates, graphics verifier, browser launch check.
- Failed: backend typecheck due local generated Prisma client/dependency mismatch; frontend suite due one reproducible `throwing sessionStorage` scroll-restoration case; direct CSS lint has 39 errors and 84 warnings.
- Not reproduced: conformance run, scroll-trace, E2E/browser product matrix, visual image diff, landscape overlap, dark mode, reduced motion, role-based page coverage, iOS Safari/WebKit, live API/database flows.
- Not run: full `scripts/verify.sh`, because its component coverage is heavier and existing environment blockers make its aggregate result misleading until setup is normalized.
- Scope boundary: no app code, reference asset, Heron copy, token, baseline, ceiling or gate was changed. The four PNGs in `docs/audit/evidence/` are the only new non-document assets.

## Recommended decision

Approve a measurement-first fidelity program. Before visual implementation, repair the conformance result/threshold contract, establish a pinned and reproducible browser/runtime baseline, then score composition, section geometry, motion curves and accessibility independently. Prioritize the landing hero/intro/map evidence gaps and the known landscape plate overlap; defer broad role-screen polish until the shared matrix can prove which surfaces materially diverge.
