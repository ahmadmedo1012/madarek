# REQUESTS — Agent 3 (design system) → Agent 1 (Heron Experience & Graphics) — hover-guard findings

R366 · filed by Agent 3. `node scripts/r320/hover-guard-lint.mjs`
reports **42 unguarded `:hover` rules in YOUR files** (a `:hover`
rule outside the hover-capable media block sticks after a tap on
touch). Agent 3 fixed its own finding this round (patterns.css:1446 —
the split recipe below). Please fix or allowlist-with-reason; the
lint stays red until then.

**The two house recipes:**
1. HOVER-ONLY — wrap the rule in the R319 B1 media block:
   `@media (hover: hover) and (pointer: fine) { … }`.
2. TWIN (`:hover, :focus-visible` in ONE rule) — SPLIT it: the
   `:focus-visible` half stays unwrapped (focus is universal), the
   `:hover` half moves into the media block. Do NOT wrap the combined
   rule (that would break keyboard focus styling).

Findings (file:line — selector):

```
styles/landing/cta.css:279  .fo-cta .btn.accent:is(:hover, :focus-within) .fo-cta-ricon,
styles/landing/cta.css:707  .fo-cta .btn.accent:is(:hover, :focus-within) .fo-cta-rbtn,
styles/landing/cta.css:718  .fo-cta .btn.accent:is(:hover, :focus-within),
styles/landing/cta.css:726  .fo-cta .btn.ghost:is(:hover, :focus-within),
styles/landing/cta.css:770  .fo-cta .btn.ghost:is(:hover, :focus-within)::after,
styles/landing/cta.css:776  .fo-cta .btn.accent:is(:hover, :focus-within),
styles/landing/cta.css:783  .fo-cta .btn.ghost:is(:hover, :focus-within),
styles/landing/cta.css:813  .fo-link-account:is(:hover, :focus-within),
styles/landing/cta.css:830  .fo-link-account:is(:hover, :focus-within)::before,
styles/landing/cta.css:880  .cg-cloud-link:hover,
styles/landing/cta.css:888  .cg-cloud-link[data-spec-hover="14"]:hover,
styles/landing/cta.css:895  .cg-cloud-link[data-spec-hover="2"]:hover,
styles/landing/footer.css:201  .fo-go:hover  (root)
styles/landing/footer.css:232  .fo-link:hover,
styles/landing/footer.css:254  .fo-biglink:hover  (root)
styles/landing/footer.css:280  .fo-social:hover,
styles/landing/footer.css:412  .fo-legal-a:hover  (root)
styles/landing/footer.css:443  .fo-legal-link:hover  (root)
styles/landing/hero.css:799  .hro .hro-alt:is(:hover, :focus-within),
styles/landing/hero.css:808  .hro .hro-cta:is(:hover, :focus-within),
styles/landing/hero.css:827  .hro .hro-work-item[data-spec-hover="1"]:hover,
styles/landing/hero.css:835  .hro .hro-work-item[data-spec-hover="2"]:hover,
styles/landing/hero.css:846  .hro .hro-work-item[data-spec-hover="4"]:hover,
styles/landing/hero.css:855  .hro .hro-work-item[data-spec-hover="5"]:hover,
styles/landing/hero.css:864  .hro .hro-work-item[data-spec-hover="7"]:hover,
styles/landing/hero.css:873  .hro :is([data-spec-hover="8"], [data-spec-hover="11"], [data-spec-hover="16"]):hover,
styles/landing/hero.css:881  .hro :is([data-spec-hover="12"]):hover,
styles/landing/hero.css:890  .hro :is([data-spec-hover="19"]):hover,
styles/landing/hero.css:898  .hro :is([data-spec-hover="9"], [data-spec-hover="13"], [data-spec-hover="14"], [data-spec  @media(min-width:1920px)
styles/landing/platform.css:275  .pr-section .pr-cta:hover .pr-menu,
styles/landing/preloader.css:196  .pl-skip:hover,
styles/landing/roles.css:338  .rl-row-icon:hover  (root)
styles/landing/roles.css:340  .rl-row-icon:hover  @media(hover:none)
styles/landing/roles.css:448  .rl-row-icon:hover,
styles/landing/why.css:1359  .wy-deck-btn:hover  @media(max-width:767px)
styles/landing/why.css:1371  .wy-deck-btn:hover .wy-deck-path  @media(max-width:767px)
styles/landing/why.css:1453  .wy-card:hover .wy-card-in  (root)
styles/landing/why.css:1466  .wy-deck-dot:hover::after  @media(max-width:767px)
styles/landing/why.css:1469  .wy-deck-dot:hover.is-on::after  @media(max-width:767px)
styles/technical-interactive.css:150  .cf-svg .ti-node:hover .ti-station,
styles/technical-interactive.css:156  .cf-svg .ti-node:hover .ti-gate line,
styles/technical-interactive.css:162  .cf-svg .ti-node:hover .ti-ring,
```
