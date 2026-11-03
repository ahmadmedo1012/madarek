# R333 — Absolute Quality Rubric (Heron-calibrated, non-gameable)

Round: R333 · Status: binding · Supersedes: no prior rubric (first absolute rubric of the redesign).
Companion docs: `judge-protocol.md` (how to score), `scripts/r333/judge/make_sheets.py` (evidence sheets),
`scripts/r333/judge/record_first10s.py` (first-10-seconds recordings).

The Twin harness (`scripts/twin/`) remains a **geometry guard only**. This rubric is the
**production-value verdict**. It is designed so that no single stakeholder can pass it by
cherry-picking frames, hiding chrome on one side, or re-defining thresholds mid-round.

---

## 1. The 12 criteria (fixed order, fixed names — tooling depends on these exact keys)

| # | key | criterion |
|---|-----|-----------|
| 1 | `composition` | Composition |
| 2 | `typography_craft` | Typography craft |
| 3 | `spacing_rhythm` | Spacing rhythm |
| 4 | `imagery` | Imagery / illustration quality |
| 5 | `storytelling` | Product storytelling |
| 6 | `motion_quality` | Motion quality (timing / easing / choreography) |
| 7 | `scroll_feel` | Scroll feel |
| 8 | `micro_interactions` | Micro-interactions |
| 9 | `density_contrast_legibility` | Density / contrast / legibility |
| 10 | `consistency` | Consistency |
| 11 | `arabic_rtl_craft` | Arabic / RTL craft |
| 12 | `polish_finish` | Polish / finish (edges, states, no jank) |

Each is scored 0–10 (integers only; no halves from reviewers — the −0.5 tolerance is applied
mechanically by the lead at aggregation, never by hand).

### Anchors

Anchors are concrete, observable states — not adjectives. A reviewer locates the anchor that
best matches the evidence and scores accordingly. Between anchors, interpolate; the written
reason must name which anchors bracket the evidence.

**1. composition** — how the viewport is *staged*: focal point, scale hierarchy, negative space, direction of reading flow.
- Score 3: elements are placed but not staged — no single dominant focal point per viewport; blocks sit edge-to-edge or float with no deliberate negative space; at 390px the hero reads as a stacked list, not a composed scene.
- Score 6: every major viewport has one clear focal point and a deliberate secondary; negative space frames at least the hero and CTA; one viewport class (e.g. 768) degrades to stacked-without-tension.
- Score 9: focal hierarchy survives at 1920, 1440, 1024, 768, 390, 360 — each viewport could hang on a wall; scale jumps (≥2.5× between focal and supporting) are deliberate; negative space is directional (it points at the focal element), not leftover.

**2. typography craft** — type families, optical sizes, weight contrast, tracking/leading, numerals, line breaks, Arabic/Latin pairing quality (RTL-specific craft additionally scored in #11).
- Score 3: default-ish stack; one weight does everything; headings and body differ only by size; ragged widow/orphan lines in hero and statement; Arabic is set in the same font metrics as Latin with no size compensation.
- Score 6: two disciplined families/weights with clear roles; tracking tightened on display sizes; line length controlled (≤ ~75ch Latin); Arabic display sizes adjusted so x-height matches Latin optical weight; minor widows remain in mid-page sections.
- Score 9: a type *system* — optical scale that steps correctly at every viewport, weight contrast that reads instantly, numerals/tabbular figures where data appears, Arabic display type re-tuned (kashida/letter-spacing, line-height) per size, zero widows/orphans anywhere on the public site.

**3. spacing rhythm** — vertical rhythm, gap scale consistency, section breathing, alignment to a grid.
- Score 3: gaps are ad-hoc (visibly 13/22/34px mixes); sections breathe unevenly (cramped→airy randomly); mobile paddings shrink until text touches device edges.
- Score 6: one spacing scale governs ≥80% of gaps; sections alternate tension/release deliberately; mobile keeps ≥16px edge clearance; occasional one-off gaps inside long list sections.
- Score 9: measurable rhythm — gaps snap to a scale at every viewport (Twin `rhythmMedianGapDeltaPx` style check would pass by construction); section paddings form a visible cadence across the whole page; 390/360 keep full-scale breathing with no cramped band anywhere.

**4. imagery** — quality of photos/illustrations/3D/product media: art direction, resolution, treatment consistency, absence of filler.
- Score 3: placeholder-grade media (stock-looking, mismatched palettes), rasterized artifacts at 1440+, inconsistent crops/aspect ratios between sibling cards.
- Score 6: coherent art direction (palette/treatment match the brand), sharp at 1440 and acceptable at 1920, consistent aspect logic per component family; one or two filler-grade assets remain.
- Score 9: media looks *commissioned* — every asset on palette, on lighting, on subject; retina-crisp at 1920; product media (the plan scene, dashboards) reads as real screenshots of the real app, not decoration; zero filler.

**5. storytelling** — does the page *narrate* the product: problem → mechanism → proof → action; scene legibility; CTA logic.
- Score 3: sections are a feature list; a stranger cannot say what the product does after one scroll; the signature scene is decorative.
- Score 6: the scroll order tells a problem→solution story; the signature plan scene is legible and demonstrably the product; CTA follows logically from the last proof.
- Score 9: a stranger narrates the pitch back correctly after one unmetered scroll; the signature scene is legible & large at every viewport (no blank/tiny-plan frames on mobile) and is the emotional peak; each role's story is inferable from the page; the CTA closes the exact loop the story opened.

**6. motion quality** — timing, easing, choreography of entrance/exit/scroll-driven animation (judged on **frame sequences + video, never stills**).
- Score 3: linear or default-ease everything; elements animate independently with no order; durations feel random (100ms–1.5s mix); reveals re-trigger jankily.
- Score 6: one easing vocabulary; choreography has a readable order (stagger where it matters); durations in a disciplined band (~250–700ms); scroll-driven scenes track without popping.
- Score 9: choreography is *authored* — beats land (headline → support → media in ≤600ms total), easings express weight (decel for entrances, anticipative for exits), scroll-scrubbed scenes are frame-coherent in both directions, and the whole first viewport settles into rest in under 1.5s.

**7. scroll feel** — smoothing/lerp character, momentum, rubber-band behavior, pin economy, absence of fighting scrollbars.
- Score 3: scroll fights the user (double-scrollbar, jumpy pins, dead zones); pins last far past their content's interest; nothing responds continuously to input.
- Score 6: Lenis-grade smoothing with sane lerp; pins end when their story ends (pin length justified); scrub direction never reverses content confusingly; no dead zones at 1024/768.
- Score 9: scroll feels *instrument-grade* — identical character on Chromium and WebKit, at every viewport including 360; pins are strictly shorter than r332 and each is earned; velocity-aware effects (skew/parallax) are subtle and settle to exact rest; zero overscroll artifacts.

**8. micro-interactions** — hover/focus/press states, cursor/dialog/menu behaviors, toggles, form affordances.
- Score 3: links are plain underlines or nothing; buttons have no hover/active distinction; focus rings are browser-default or invisible; carousels/chips lack state feedback.
- Score 6: every interactive element has hover + focus-visible + active states from one vocabulary; transitions 120–200ms; disabled states are visually honest.
- Score 9: states are *delightful and informative* — hover reveals purpose (not just brightness), focus-visible is designed (ring + offset, RTL-mirrored), press states compress with the motion vocabulary, and every state survives keyboard-only and touch-only traversal.

**9. density / contrast / legibility** — information density fit, WCAG contrast, text legibility at every viewport, in light **and** dark.
- Score 3: body contrast below 4.5:1 somewhere prominent; dark mode inverts sloppily (pure #000/#fff flip, broken surfaces); text over media without scrims; 360px forces truncation or overflow.
- Score 6: body ≥4.5:1, large text ≥3:1 everywhere checked; dark mode is a designed palette (elevated surfaces, adjusted borders) with no orphan components; no overflow at 360.
- Score 9: contrast passes with headroom (≥5:1 body) in light and dark, verified at 1920/1440/1024/768/390/360; density self-adjusts (desktop tables/cards ≠ mobile stacks) without losing content; dark and light are equally *finished* (contrast+harmony both ≥8 — dark is judged only on these two axes but they gate).

**10. consistency** — one design language across sections, pages, states: color roles, radii, shadows, iconography, spacing, motion.
- Score 3: each section invents its own card style/radius/button; icons mix stroke weights; the landing page and inner pages feel like different products.
- Score 6: tokens govern the landing page end-to-end; inner public pages inherit ≥80% of the vocabulary; icon family is single-weight.
- Score 9: the vocabulary is inseparable — one radius family, one elevation ladder, one icon set, one motion vocabulary across landing + inner public pages + logged-in role dashboards; nothing in the product could be identified as "from another design".

**11. Arabic/RTL craft** — RTL mirroring correctness, Arabic typographic quality, bidi edge cases, numeral/date localization, RTL motion direction.
- Score 3: layout is LTR with `dir="rtl"` painted on — icons/caret/progress point the wrong way; mixed Arabic+Latin lines break bidi; Arabic text uses forced line-breaks or letter-spacing that breaks connections; numerals inconsistently Eastern/Arabic.
- Score 6: mirroring is correct for margins, icons, carets, scroll directions; bidi isolates used in mixed lines; Arabic line-height tuned (generally taller than Latin); date/number formats consistent.
- Score 9: RTL is *native-grade* — the mirror is exact down to entrance-motion direction and carousel travel; Arabic display type is optically corrected per size (see #2); bidi edge cases (punctuation, parens, embedded Latin brand terms) render correctly everywhere; localization of numerals is a deliberate, consistent choice; nothing reads as "translated LTR".

**12. polish / finish** — edges, states, no jank: 1px seams, focus/hover completeness, loading/empty/error states, frame pacing, AA behavior on odd viewports.
- Score 3: visible seams at section boundaries at some viewport; hover states missing on secondary controls; long-task jank during scroll (dropped frames visible in recordings); console warnings on load.
- Score 6: no seams at 1920/1440; jank rare and sub-100ms; loading/empty states exist for main async surfaces; zero console errors on the public page.
- Score 9: *pixel-final* at every viewport — no seams, no sub-pixel shimmer, no font-flash; recordings show steady frame pacing through the whole page at 1440 and 390 on Chromium **and** WebKit; every async surface has designed loading/empty/error states; console clean.

---

## 2. Pass rule (mechanical, applied by the lead post-unblind)

A criterion **passes** iff **Madarek ≥ Heron − 0.5** on that criterion, where both scores come
from the same reviewer's same-session blind sheet (A/B rows unblinded by the sealed key), and
the Heron calibration pass (§3.1) agrees with the blind Heron score within 1.5 points
(a larger gap flags the reviewer's session as miscalibrated — see protocol §7).

**Absolute gates (independent of Heron):** Madarek must score **≥ 9** on
`typography_craft`, `spacing_rhythm`, `polish_finish`.

**Round passes** iff ALL of:
1. all 12 criteria pass the ≥ (Heron − 0.5) rule for every reviewer (median across the 3 reviewers is the verdict per criterion; a criterion fails if ≥2 of 3 reviewers fail it);
2. the three absolute gates hold on the median;
3. dark-mode `contrast` and `harmony` ≥ 8 on the median (dark gates #9 and #10 but is not a 13th criterion);
4. no criterion has a deficit without a written reason + ticket ID (see §4).

**Every lost point needs a written reason + ticket ID.** "Lost point" = any criterion where the
median Madarek score is below the median Heron score, even inside the −0.5 tolerance, and any
absolute gate scored below 9. The reason goes in `REPORT.md`'s gap table with a ticket ID from
the round ledger (`docs/redesign/r333/HANDOFF.md` commit/wave ledger). A deficit without a
ticket is an automatic round FAIL regardless of the numbers.

---

## 3. Scoring policy (non-negotiable)

1. **Heron first (calibration).** Every reviewer scores Heron alone (open-label calibration
   sheets, `judge/run-<n>/calibration/`) before touching any A/B sheet. This fixes the anchor
   scale before Madarek can bias it.
2. **Sequences, not stills.** Motion criteria (#6, #7, #8) are scored from filmstrip *sequences*
   and the first-10-seconds recordings only. A still frame may never move a motion criterion.
3. **First-10-seconds recordings, both sides** (`judge/run-<n>/first10s/`, 1440 + 390, both
   sides, Chromium; WebKit recordings added for #7/#12 spot checks) — watched before scoring.
4. **Identical overlay policy both sides.** Consent banners, cookie chrome, award badges appear
   **as-is on BOTH sides** in the first10s recordings — no hiding on one side, no seeding away.
   (The Twin *geometry* capture masks chrome on both sides equally for structural diffing; that
   is a capture policy, not a judging one. Overlay parity is judged from first10s only.)
5. **Viewports:** 1920 / 1440 / 1024 / 768 / 390 / 360, light theme. Dark theme is scored **only
   on contrast/harmony** (see criterion #9). A viewport missing from the evidence is a FAIL for
   the criteria it would have informed — missing evidence is never silently dropped (sheets
   render `MISSING` placeholder cells, and `--verify` fails on incomplete sheets).
6. **Engines:** Chromium + WebKit. Chromium produces the primary sheets/recordings; WebKit
   spot-checks #7 scroll feel and #12 polish (recordings at 1440 + 390).
7. **3 independent reviewers** who never see each other's scores until all three forms are
   locked. Forms are collected by the lead; reviewers do not attend each other's sessions and
   do not discuss criteria between calibration and lock.

---

## 4. Deficit ledger rule

For every lost point (§2), `REPORT.md` must contain one row:

| criterion | heron (median) | madarek (median) | deficit | reason (≥1 sentence, evidence-referenced) | ticket |
|---|---|---|---|---|---|

Evidence references are sheet paths (`sheets/<vp>/<section>.png`), recording paths
(`first10s/<engine>-<vp>-<side>-first10s.webm`), or Twin report paths. Reasons of the form
"not implemented yet" are only valid with a ticket ID that the round plan schedules.

---

## 5. What this rubric explicitly forbids (anti-gaming summary)

- Changing anchors, tolerances, or the pass rule after any sheet has been scored.
- Scoring motion criteria from stills; scoring from cherry-picked progress steps (sheets use
  fixed, evenly-spaced steps rendered at generation time — reviewers cannot re-pick).
- Hiding/seeding overlays on one side only (first10s shows both sides' chrome as-is).
- Reviewers seeing each other's forms before lock; the lead seeing A/B→side mapping before lock.
- Generating sheets from anything other than a completed Twin capture run (frames-root is
  recorded in the sealed key and the manifest; a run missing sections fails `--verify`).
