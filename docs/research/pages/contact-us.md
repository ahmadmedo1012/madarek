# Heron — /contact-us (the sheet template Madarek /auth codes against)

**Crawl:** `contact-us-1440x900.json`, `contact-us-390x844.json` (2026-10-24). Title: «Heron AI | Get in touch with us». Page = **contact-hero 713.75 + shared footer 710.66 = docH 1424** @1440 (@390: 993.97 + 1239.11 = 2233). Live form-state probe (focus + fill + submit hover) ran in the same pass — `states.contactForm`.

**Frame / chrome:** identical on every Heron page — fixed `.main-deco` 1px #B3B3AF at the 6.66px inset (no plus marks), fixed 56.3px header, `.awwwards` edge tab, cookie banner. No page-level mono index/coordinate labels exist on this page (the mono indices in Madarek's /auth rebuild are an interpretation of the shared grammar, not a literal copy — see "mono labels" below).

## Layout @1440 — two half-sheets

```
section.contact-hero (0,0 1426.69×713.75)
├ [title band] (0,53.33 1426.69×137.95) — closed by hairline (713.34,190.28) / full-width rule at 190.28? (left half)
│   ├ div.contact-hero-title-wrap (0,53.33 713.34×137.95)      ← LEFT half
│   └ 3 info cells on the RIGHT (each 218.77–275.83 wide, 137.95 tall):
│       (713.34,53.33) «New business»      → business@bear.plus
│       (932.11,53.33)  «General inquiries»→ hello@bear.plus
│       (1150.88,53.33) «Address»          → 60 Martin Pl, Sydney, NSW 2000, Australia
│       cell grammar: mono label .txt-font-mono.txt-14 11.67/500 UPPER #B4B4B1 at (…,79.98)
│                     + link .txt-16 13.33 #282828 (title at y≈130–147)
├ [form+image band] (0,191.28 1426.69×522.47), vertical hairline at x=713.34 (713.34,190.28 → the split)
│   ├ LEFT 713.34: the FORM
│   └ RIGHT 713.34: div.contact-hero-image-inner.bg-global (713.84,191.28 712.34×522.47)
│       └ img.img-basic.img-abs.img-cover (705.72,185.33 728.59×534.38) — bleeds ~7.6px past the cell on all sides
```

## The form (LEFT half, 713.34 wide) — the ruled-sheet grammar

```
div.contact-hero-form-title (0,191.28 713.34×73.33)
└ h2.heading.h3.tb-h5 «Please fill out this form» (26.66,211.28 660.03×33.33)  BT Grotesk 33.3333/600 #282828
div.line.line-horizital.left (0,263.61 713.34×1) #B3B3AF        ← sheet opens with its rule
form#contact-form (0,264.61 713.34×449.14)
  row1: 2 × .contact-hero-form-input-group.item-50 (356.67×75) at x 0 / 356.67   [First name | Last name]
        vertical hairline between them: .line.line-vertical.left (356.67,264.61 1×75) #B3B3AF
  row2..4: .contact-hero-form-input-group (713.34×75)   [Email · Phone number · …]
  row5:   .contact-hero-form-input-group.input-area (713.34×137.48)   [Message]
  submit: button.contact-hero-form-input-submit (0,627.09 713.34×86.66)
```

**Row anatomy (75px rows):**

- `input.contact-hero-form-input` — **fills the whole row** (0,264.61 356.67×75), **transparent bg, border 0** (computed `0px solid`), BT Grotesk **18.3333px**/500, placeholder-color #333333, no padding box of its own.
- Label floats INSIDE the row, vertically centered: `label.heading.h6.tb-h20` (26.66,291.11 …×22) — **BT Grotesk 20px/700 UPPERCASE #B4B4B1** (the disabled-gray ink). Live label text: «Fisrt name» (sic — Heron's own typo), «Last name», «Email», «Phone number», «Message».
- Every row closes with TWO stacked hairlines at its bottom edge:
  - `div.line.line-horizital.left` **1px #B3B3AF** — the visible rest rule;
  - `div.line.line-horizital.bot.line-brand` **1px #FA3600** — parked OFF-SCREEN LEFT at rest (`x = −356.67` / `−713.34`).
- **Focus/fill ladder (live-verified in this crawl):** on focus or filled state the row's group gets class **`.active`** and the orange `.line-brand` slides to `x=0` (transform identity), covering the gray rule 1:1. That is the whole ladder: **hairline #B3B3AF → row rule #FA3600**. ⚠️ This is NOT the footer input ladder (#B3B3AF → #ED4C1F → #FA3600 border colors) — the contact sheet has no #ED4C1F step and no input borders at all; the borderless rows + sliding brand rule is the /contact-us grammar.
- Error chip: `div.contact-hero-form-error` **(607.11,~384 106.23×30.63) bg #FA3600**, white `.txt-16` «Wrong format» 13.33px (padding 10px), top-right inside the offending row, hidden until invalid.
- Textarea row (input-area 137.48): `textarea#Message` (0,521.27 686.69×85.83), label ABOVE the field at (26.66,514.61), same 20px/700 #B4B4B1.

**Submit row (86.66 tall, full 713.34):**

- `button.contact-hero-form-input-submit` carries **`.disable`** until the form is valid: dual mono labels «Submit» (26.66,637.09 666.7×22, Δ22 roll) render at **20px/700 UPPERCASE #B4B4B1** (gray) — the `.txt.txt-font-mono.txt-14` inherits the row's 20px display size here, not 11.67.
- `div.btn-fill` = the standard b76e variant (header-CTA grammar): `.btn-fill-bg` 720×180 #FA3600 parked; arrow pair 16.66×16.66 at (693.36,693.77) & translated twin. When enabled: hover/focus = orange fill wipe + white rolled labels + arrow slide (r313 btn grammar; disabled state ignores hover — probe confirmed no state change while `.disable`).
- Success swap: `.contact-hero-form-success` (0,264.61 713.34×449.14) — «Thanks for reaching out!» `heading.h5.mb-h5` **23.3333px/600 UPPER #282828** at (46.66,619.8 620.03×23.33) + `.txt-reg.txt-16` note (46.66,649.78 620.03×17.31) + closing hairline (20,692.75 673.34×1).

**Mono labels on this page:** only the 3 info-cell labels («New business», «General inquiries», «Address») — Geistmono 11.67/500 UPPER #B4B4B1. There are **no `[01]`-style indices and no X:Y coordinates** on the live page.

## @390 (mobile)

- Hero title band (0,43.66 374.13×165.06): the 3 info cells STACK full-width, 103.2 tall each (y 684.36 / 787.56 / 890.77), same mono-label + link grammar; then hairline 992.97.
- Form: `h2` «Please fill out this form» (0,208.72 374.13×73.81, 3 lines), rule 281.53, then rows **59.53px tall** — the item-50 pairs STACK (one field per row, full 374.13 width): First name 282.53 · Last name 342.06 · Email 401.59 · Phone 461.12 · Message (input-area) — same gray rule + parked orange line (x=−374.12) + `.active` slide. Labels 20px/700 #B4B4B1 at (11.91, ~y+20). Submit row full-width at the end.
- Footer stacks per the shared mobile footer grammar (see landing-chrome.md §6).

## Builder notes (for Madarek /auth parity)

1. Rows are borderless; the RULE is the row's bottom edge — never box the inputs.
2. The focus accent is a **full-row-width 1px #FA3600 line that slides in from the inline-start edge** (transform-only motion; RM-token compatible).
3. Labels sit INSIDE the rows, 20px/700 uppercase, gray #B4B4B1, x inset 26.66 (2rem) — they are not HTML `<label>`-positioned above.
4. Submit is a full-bleed 86.66px row that inherits the header-CTA btn-fill grammar; gray (`.disable`) until valid.
5. Keep the 2-column name row (356.67 splits with a vertical hairline) at ≥~700px sheet width; stack below.
6. Deltas vs r313 digest: digest carries only the footer-input ladder (#B3B3AF→#ED4C1F→#FA3600) — that ladder does NOT exist on /contact-us; this sheet's ladder is documented here for the first time (row-rule slide).
