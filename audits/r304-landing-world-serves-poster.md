# r304 — «العالم يخدم الملصق» — the world serves the poster

Agent: Z.ai Code · Scope: `/` public landing — `frontend/src/components/landing/MadarekWorld.tsx`,
`frontend/src/pages/LandingPage.tsx`, `frontend/src/styles/landing.css`.
Trigger: the operator's live review of the deployed r303 page (1536px + 390px, 2026-10-21)
and its seven required corrections. Evidence: 27 curated before/after captures in
`audits/evidence/r304/` (before-1536/before-390 = pristine r303; after-1536/after-390/after-360 = r304;
both themes; live DOM probes for scrollWidth, canvas opacity, section offsets).

## The r303 defects (measured live, before-*.png)

| # | Observation (operator) | Live measurement (r303) |
|---|---|---|
| 1 | Sculpture competes with headings/paragraphs | statement: knot sat directly behind the display copy (the free left third empty); live: camera inside the knot, whole viewport = sculpture behind the ledger rows; cta/footer: knot centered behind buttons and every colophon column |
| 2 | Arabic reading areas fragile | eyebrow rode the knot edge + drafting grid; copper arc passed behind the colleges title; vision status pairs over near-fin shading |
| 3 | Mobile = scaled desktop scene | the only mobile treatment was `camPos × 1.18 + fov + 8` — at 390 the knot + gridlines sat behind ALL hero copy, chapter heads crossed copper fins, footer links over the knot body |
| 4 | Product proof small | minis: 96px video stage, fs-body labels, generic «عرض توضيحي» caption — demos read as footnotes next to the dominant background object |
| 5 | Dense storytelling | sections at sp-8/sp-9/sp-10 rhythm; 3 chapters visible per viewport with no breathing room |

## The r304 corrections (after-*.png)

1. **Authored per-chapter frame** — the CHAPTERS ledger now carries `veil` (canvas opacity)
   and `scale` per chapter, on top of camera endpoints: hero 0.95 poster beat; statement 0.48
   with the knot slid to the reading-end third (`t.x +1.9`); chapters 0.40 + 0.82 (a quiet
   specimen in the gutter); live 0.42 close-up pushed reading-end; roles/colleges 0.45–0.50
   horizon pullbacks; vision 0.55 passage; cta 0.72 resolve at the edge; footer 0.38 settle.
   The veil is written to the canvas element itself — **at source, no DOM overlay**.
2. **Reading protection** — two surgical feathered paper washes (`.st-lines`, `.vs-section`)
   where display copy still passes near the knot; hero gridlines 0.42→0.30 desktop and 0.12
   mobile with a top-band mask; the SVG poster twin retires once WebGL boots
   (`[data-world='live']`) so the page carries ONE sculpture.
3. **Mobile is a composed scene** — every chapter authors `mp/mt/mfov/mveil/mscale`:
   portrait keeps the knot small (×0.66–0.75), high (target below the knot ⇒ it rises),
   and dimmed (0.24–0.58) behind text chapters; the vision passage keeps the camera OUTSIDE
   the tunnel mouth (no near-fin banding); hero gridlines retreat to a whisper.
   scrollWidth 350 ≤ 360 and 380 ≤ 390 — **zero horizontal overflow** at both widths.
4. **Product proof** — the mini is the chapter's labeled proof: 168px video stage (140 mobile),
   fs-h3 question/course text, signal top rule, caption now names the capability
   («عرض توضيحي — مصفوفة الإتقان»).
5. **Breathing room** — statement/ledger/roles/colleges/vision at sp-13, chapters sp-11/sp-12,
   CTA sp-14; roles gain Lucide marks in signal-soft chips (5 tracks read at a glance).
6. References used as principles only — OPTIKKA's scroll-paced composition (authored states,
   no repeated card/text/background loop), Superlist's feature-to-interface linkage (one big
   labeled demo per beat) — with Madarek's Arabic-first identity, warm tokens, copper signal,
   and every honesty pin (r168b/r177/r188 copy) untouched.
7. **Verification performed**: 1536/390/360 sweeps at every `data-cam` chapter, dark theme
   (hero + live), college-chip interaction (`aria-pressed` + panel live region), mobile menu
   open, reduced-motion/no-WebGL paths unchanged (CSS-only static poster; conductor RM snap).
   Gates: check-raw-css PASS (0 findings), check-colors unchanged (5 pre-existing canvas
   literals), motion/icons OK, eslint 0 errors (18 pre-existing warnings, none in r304 files),
   `tsc -b` clean. **Landing-funnel (11), scrollspy-grain (7), r168b (10), r170d (6),
   r183 (8), r188 (5) all pass.**

## Pre-existing test debt since r303 (NOT introduced by r304 — verified on the pristine tree)

`landing-poster-refinement.test.ts` (reads the deleted `Constellation.tsx`), one r177 case,
two token-snapshot role-accent cases, one assets case — all 4 fail identically with r304
stashed. They pin the retired r198 poster structure; they need re-pointing to the r303/r304
world contract in a dedicated test round (out of scope here).
