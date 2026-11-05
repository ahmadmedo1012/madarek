# Blind A/B — A-QA-2F (final run) — R332 twin round, run-003, vp 1440

Reviewer: A-QA-2F (blind; pair files only — no site navigation, no key access).
Method: deterministic pixel-structure metrics (row/column edge-energy maps, full-length
hairline detection, ink/whitespace distribution, pair-wise rhythm correlation) plus a
vision-model structural read, cross-checked against each other. Text/brand blur treated
as harness state; content (Arabic RTL vs English LTR, artwork subjects) noted globally only.

## Bias-control findings (applied before any attribution)

- **Wash-outs flip sides.** Ink coverage (populated vs near-empty) is higher on B in
  hero/statement/why/footer but higher on A in pains/journey/roles/cta
  (e.g. pains 6.8% vs 1.9%; cta 6.3% vs 2.5%; hero 8.3% vs 19.9% the other way).
  A persistent "unfinished twin" would put wash-outs on one side only. → capture/reveal
  timing, not identity. (Prior-run "mid-reveal wash-out" failure mode; discarded as cue.)
- **Sticky-nav hairline flips sides.** Full-width rule at y≈62 present on A only in
  hero/footer, on B only in pains/journey/roles/cta, both in platform/why, neither in
  statement/journey-A. → capture state (prior-run "overlay-chrome asymmetry" failure
  mode; discarded as cue). cta-A's rule at y≈79 = same class.
- **Legible fragments appear on both sides** (English micro-labels on A in pains/roles;
  Arabic footer labels on B in cta). Blur coverage is inconsistent across files →
  legibility/polish is NOT evidence. All vision-model verdicts that leaned on "crisper/
  more finished" were overridden.
- **Shared chrome is symmetric:** all 18 captures carry the same 7px-inset page-frame
  hairlines (x≈7/1432, y≈7/892) — common design vocabulary, no signal either way.

## Per-section verdicts

| # | section | call | confidence | cue (the one that drove it) |
|---|---------|------|------------|------------------------------|
| 1 | cta | same structure — cannot tell | 75 | Twin full-width band rules at ≈34% and ≈76% height on BOTH sides (y≈300/690), and footer link-column starts align at the same x — same band skeleton; B's mid-band + big wordmark zone is a mid-reveal wash-out |
| 2 | footer | same structure — cannot tell | 60 | Matching anchor rules at ≈21%, ≈60% and ≈95% (bottom bar) on both sides; middle-band furniture genuinely differs (A: 5-thumbnail strip with full-width bounds; B: ruler-tick wordmark table) but carries no reference-side signature |
| 3 | hero | same family — cannot tell | 65 | B lacks the y≈62 nav rule → captured scrolled below the fold; headline+wide drawing zone overlaps A's; band-rule clusters in bottom third correspond (A 643/831/872 vs B 753/849/885) — proportions not comparable at this offset |
| 4 | journey | same structure (mirrored) — cannot tell | 70 | Both are full-bleed single floor-plan compositions with near-empty line maps (only global frame + nav on B); A's dark annotation card bottom-LEFT ↔ B's caption block bottom-RIGHT = the RTL mirror working as designed |
| 5 | pains | same skeleton at anchors — cannot tell | 60 | A shows the fully-rendered indexed 4-col grid (even dividers x=363/720/1077, rules y=191/233/534/742); B is washed mid-reveal (ink 1.9%) with only the top-right intro text and low rule (y=838) rendered — anchor points correspond; wash-outs flip sides across pairs, so not attributable |
| 6 | platform | same skeleton at anchors — cannot tell | 55 | Both share nav rule y≈62 and a major band rule at ≈59% height (A 528 / B 522); middle zones differ (A 3-col dividers x=367/968; B left rail x=33 + grid-texture panel) but B's lower band is partially washed — not comparable |
| 7 | roles | same skeleton at anchors — cannot tell | 60 | A populated (center rule x=720, plan right, overlay card, heading top-left); B washed (header band rule y=160, bottom rule y=809, heading top-right = mirrored); no counterpart check possible in B's empty body |
| 8 | statement | same structure (mirrored) — cannot tell | 80 | Strongest pair: full-height center vertical rule on BOTH sides (x≈720/722), bottom rule at y=723 on BOTH, drawing panel flips sides (A right, dense hatch x≈1230–1370 ↔ B left, x≈278–396) — clean RTL mirror, same rhythm |
| 9 | why | cannot tell | 50 | Both airy with one text block + one small drawing, but no shared internal anchors (A rules y=622/860; B rule y=268 + center vertical x=720) — reads as different scroll slices of a tall section, not a design difference |

## Substantive non-content differences (≤3 per section, side-tagged)

- cta: [A] coordinate-tick + dashed-grid annotation layer over the illustration; [B] nav band present (capture state); [A] giant wordmark bottom-left not verifiable in B (washed).
- footer: [A] 5-thumbnail image strip between grid and wordmark (full-width rules y≈694/726); [B] ruler-tick / registration-mark wordmark treatment instead; [A] one extra full-width rule (y≈584).
- hero: [A] left editorial rail + box text masses; [B] drawing rendered larger/centered — but offset capture invalidates proportion comparison; [B] no nav rule (capture state).
- journey: [A] dotted ruler strips top+bottom edges; [B] two full-height dotted verticals instead; [A] dark annotation card bottom-left ↔ [B] caption bottom-right (mirror, not a defect).
- pains: [A] per-cell index system [01]–[04] + dashed sub-rules; [B] mid-band wash-out (reveal state); [B] top-right intro block mirrors A's.
- platform: [A] two inner column dividers (x=367/968); [B] left rail at x=33 + denser grid-texture panel; [B] partial wash in lower band.
- roles: [A] center rule x=720 + drawing-right composition; [B] header rule y=160 with empty body; [B] heading mirrored to top-right.
- statement: none beyond the mirror — same center rule, same bottom rule, drawing side flipped.
- why: [A] bottom band with text at y≈860; [B] drawing sits mid-left rather than high; [B] center vertical x=720 not present on A in this slice.

## Global note

Content-level differences (Arabic RTL vs English LTR; artwork subjects) are noted but excluded
from calls per brief. Structurally the two sites share the same motion-model vocabulary
(scroll-reveal sections — wash-outs caught on BOTH sides — sticky nav, marquee/ticker family,
dotted-ruler and "+"-tick annotation kits) and the same page-frame chrome. Where captures are
comparable (statement, journey, cta, footer anchors), band proportions and hairline discipline
correspond, with the RTL mirror applied consistently. The residual deviations (footer middle
furniture, hero drawing proportion, why-section arrangement) are real but unattributable
blind: none carries a signature identifying which side is the reference, and the strongest
asymmetries (wash-outs, nav presence, legibility) provably flip sides and were discarded as
capture state. Vision-model calls that leaned on "crisper/more finished" (hero-B, statement-B,
pains-A) were overridden after the flip-side test showed those asymmetries are timing artifacts.

## Final judgment

**INDISTINGUISHABLE**
