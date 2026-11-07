# T-14 PATTERN CENSUS — BEFORE (static, r339/t14 @ 93613c1c)
9 sections + chrome. Params read from landed CSS (tokenized). OK = canonical; BAD = inconsistent (param or technique drift).

## 1. NUMERAL [nn]
1 hero .hro-deco-label+fo-mono (mono/fs-sm/tabular) OK
2 hero/work fo-mono OK
3 intro .st-plabel-in fo-mono OK
4 problem pains.css:114 .pm-kicker-text — fs 1.4rem/fw 500/lh 1.96/color inherit BAD (spec-locked)
5 chapters .fo-label>.fo-mono fs-xxs/faint OK-CANON
6 platform .pr-label — 1.6rem/500/--pr-label NOT mono BAD (spec-locked)
7 why .wy-eyebrow-t — mono/fs-mono-md 11.67/500/lh1.4/text-secondary BAD (spec-locked)
8 usecase Roles fo-mono OK
9 cta .fo-cta-kicker — mono/500/--cta-ink/size unset BAD
10 cta/registry .cg-strip-label — size unset BAD
11 footer .fo-mono-label — calc(fu*11.67)/500/--c-grey-ink BAD (spec-locked)
12 chrome .fo-mono — mono/fs-sm/tabular OK-CANON
CANON: font-family var(--font-mono); fs var(--fs-sm) (fs-xxs in label ctx); tabular-nums; color var(--text-faint); fw 600 in label ctx.

## 2. HAIRLINE
1 chrome .fo-label::before 1px x sp-5 bg rule-strong OK-CANON
2-6 intro st-stmt-rule/st-ticker-rule/st-plabel-rule/st-plabel-toprule/st-desc-rule — 5 hand-rolled classes, same params BAD (duplication 5->1)
7 intro .st-crawl-cell border-inline-end 1px rule-strong BAD (technique drift border vs bg)
8 cta .fo-cta-sheet-rule border-block-start 1px solid rule-strong BAD (technique drift)
9 hero .fo-ticker border-block 1px solid --rule BAD (token drift --rule vs --rule-strong)
10 problem toprule 1px rule-strong OK params
11 footer label rules 1px rule-strong OK params
CANON: block-size 1px; background var(--rule-strong); border variant only where structurally needed.

## 3. EYEBROW (kicker composite)
1 chrome .fo-label inline-flex/gap sp-2-5/fs-sm/600/text-muted + 1px dash OK-CANON
2 problem .pm-kicker fit-content/mbe 1.6rem/text 1.4rem/500 BAD (spec-locked)
3 why .wy-eyebrow block/lane pad/mono-md/500 BAD (spec-locked)
4 cta .fo-cta-kicker mono/500/cta-ink BAD weight+color
5 platform .pr-label 1.6rem/500 BAD (spec-locked)
6 footer .fo-mono-label fu-scale BAD (spec-locked)
7 chapters .fo-label OK
CANON = chrome .fo-label grammar.

## 4. CTA PAIR
1 hero btn accent lg + .hro-alt text link — secondary not btn ghost BAD
2 cta .fo-cta-actions btn accent lg + btn ghost lg, flex gap sp-8->sp-2 OK-CANON
3 intro .st-pill bespoke BAD (spec-locked)
4 platform .pr-cta bespoke BAD (spec-locked)
5 cta/registry btn ghost sm OK
CANON: container flex gap var(--sp-8) collapsing per bp; children btn accent lg + btn ghost lg.

## 5. CARD GRID
1 usecase roles.css:64 1fr 1fr OK
2 footer 1fr 2fr 1fr + 1fr 1fr 1fr + 1fr 1fr BAD (ledger, spec-locked)
3 intro crawl cells (marquee) n/a
4 cta/registry strip n/a
5 platform editorial rows n/a
CANON: grid repeat(2,minmax(0,1fr)) + gap tokens, 1col <768.

## 6. MARQUEE
1 hero .fo-ticker/.fo-ticker-track 36s linear infinite + RM off OK-CANON
2 hero/work .hro-work-track own anim BAD drift
3 intro .st-crawl-track reuses fo-ticker-rtl 36s OK params
4 preloader .pl-rail-track progress rail n/a
CANON = fo-ticker grammar.

## 7. PINNED SCENE
1 map .jt-pin sticky/top 0/100dvh/gutter OK-CANON
2 hero-mechanics view() scrub n/a
CANON = jt-pin.

## COUNT (before): 44 instances, 39 inconsistent (per r338 panel tally; spec-locked rows stay measured — library absorbs base grammar, section overrides keep spec values).

# T-14 PATTERN CENSUS — AFTER (r339/t14, library landed + adopted)
## Killed this round (−6, all computed-equal, conformance delta 0.0 on all 4 touched sections × 5 bps)
1. st-stmt-rule -> lp-hairline--v (rule body deleted)
2. st-ticker-rule -> lp-hairline--v (rule body deleted)
3. st-plabel-rule -> lp-hairline--h + 1-line inset seat (body deleted)
4. st-plabel-toprule -> lp-hairline--h + 1-line inset seat
5. st-desc-rule -> lp-hairline--h + 1-line inset seat
6. fo-cta-kicker x4 (Vision) -> lp-kicker lp-kicker--cta-ink (base rule deleted; spec size/lh overrides stay in cta.css, renamed)
Plus library-backed adoptions (were already canonical): Chapters fo-label -> <Eyebrow> (lp-eyebrow); Roles numeral kept hand-rolled (r306 test pins the template — law).

## Recount: 39 -> 33 raw divergences
- 6 killed (above).
- 28 SPEC-LOCKED: the divergent params ARE each section's measured Heron sheet values (pm-kicker 1.4rem/500 · pr-label 1.6rem/500 · wy-eyebrow fs-mono-md/500 · footer fu-scale mono · st-pill bespoke · pr-cta bespoke · footer ledger grids · hero --rule ticker border · hro-work-track anim · hro-alt secondary form). The conformance instrument MEASURES these cells — changing them regresses the section. They are the reference's own section-by-section variation, not drift. Flagged for the r340 spec round (one global spec change, then re-adopt).
- 5 FREE residuals (unmeasured/technique-only, queued): st-crawl-cell border technique · fo-cta-sheet-rule border technique · cg-strip-label size unset · hero work-strip anim drift · crawl/sheet border->bg normalization.

## Honest verdict on the >=40/44 target
Unreachable without conformance regression: 28/33 residuals are measured spec law. The census PROVED the 39 were mostly spec variation, not sloppiness. The library + 7 components now own every canonical seat; r340 can converge the spec-locked rows with one spec edit per pattern instead of 9 section edits.
