# PUBLIC-SURFACE-SPEC — the craft law for Madarek's public pages (R366 L3, Agent 1)

The reference (heronaiapp.com) is a single-page site — /about, /contact and
every other secondary route 404 (measured: curl 200-checks, 2026-11-17). So
the public-surface spec is NOT a copy of secondary reference pages; it is the
HOME page's own measured language (the frozen census,
`docs/redesign/r335/heron-spec/`) applied to our secondary surfaces. The
standard is "the same craft level and design language as the
Heron-conformant landing" — measured rules, not taste.

## The measured language (from the frozen census, all breakpoints)

1. **Type ladder** (fluid rem root: 0.5787vw ≥992 · 1.199vw ≤991 · 2.5445vw
   ≤767): the display rung 5.6rem/700 (the h1 seat), the body rung 1.6rem
   (13.33px @1440) /500, the instrument rung 1rem (8.33px) /500 — the mono
   gutter indices ride `[nn]` fo-mono runs (dir=ltr). Arabic line-height
   floor `max(heronLh, 1.35×fs)` everywhere; letter-spacing 0 (cursive
   joins — never tracked Arabic).
2. **Hairlines**: 1px rules `var(--rule)` (rgb(224,224,218) on paper), the
   strong rules `var(--rule-strong)`; the 7px sheet inset (the frame's own
   gutter); content gutters 8px @390 (the measured wrap box), 33px h1
   gutter @1440 (3.96rem mirrored inline).
3. **The plate register**: paper `var(--bg)` / ink `var(--text)` / soft ink
   72% / one ember accent `var(--accent)` (the token IS the measured
   #FA3600). Zero radius (the R313 collapse). No gradients, no shadows on
   the public surface; the grain is the page's own (body.mdrk-grain).
4. **Mono gutter indices**: every ruled block opens with `[nn]` (or
   `PLATE K-·` on the authored constructs) in the mono face — the drafting
   table's row numbering.
5. **Motion** (the landing's own grammar, no GSAP): mask-line rises
   (translateY 103%→0, 0.8s power2.out, 0.02s stagger), block rises
   (3.2rem, 1s power3.out), 1s fades; scrub vars (`--wr-p` etc.) for
   scroll-linked ink; hover = colour/underline-sweep only (0.3s ease /
   cubic-bezier(0.625,0.05,0,1) — the measured seats). All collapses under
   `prefers-reduced-motion`.
6. **Layout rhythm**: the ruled column (1px column rules at the rail/mid
   boundaries), bands measured in rem rungs (9.6/27.6/21.6-type ladders —
   cta.css's own comment records the method), the closing band
   (`GuestClosingBand`) with the top/bottom 1px rules.
7. **Safe areas**: the sheet frame's 7px inset + the 8px mobile gutters;
   tap targets ≥ 44px (the a11y seat, `44px` pinned in tests); nothing
   under the in-flow masthead zone.

## Applying it to the public pages (the audit rules)

Every public page (mine: /about /help /contact /app /capabilities /colleges
/community /competitions /training /vision /legal/*; Agent 4's files:
/auth /404 /500 /403 /maintenance — REQUESTS only) is audited against:

- [ ] type: one display rung per page (≤4 words), body 1.6rem/500, helpers
      1 line, instrument labels 1rem mono;
- [ ] hairlines: the ruled rows use var(--rule)/1px; no boxed cards with
      radius/shadows (the radius collapse);
- [ ] colour: paper/ink/ember only (check-colors gate is the enforcement);
- [ ] RTL: logical properties only, Latin runs in dir=ltr spans;
- [ ] motion: GuestReveal (Agent 2's primitive) for entrances, no
      bespoke animations outside the token system (check-motion-tokens);
- [ ] gutters: 8px @390 content gutters, 7px sheet inset — no full-bleed
      text to the viewport edge (the edge390 law);
- [ ] tap targets ≥ 44px; focus-visible parity (r162 law);
- [ ] copy: the L4 budget (docs/QA/copy-budget.json — ratcheted this round).

The verifier for the whole surface remains the gate set:
`check-colors/raw-css/icons/motion-tokens` + `overlap.mjs` + the copy
budget + the page-ledger audits. This document is the ruling when a
question of taste arises: match the measured landing, not a new idea.
