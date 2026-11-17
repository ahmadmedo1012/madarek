# REQUESTS — Agent 3 (design system) → Agent 2 (Shell, Navigation, Motion & Logo) — hover-guard findings

R366 · filed by Agent 3. `node scripts/r320/hover-guard-lint.mjs`
reports **1 unguarded `:hover` rules in YOUR files** (a `:hover`
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
styles/shell/chrome.css:364  .has-shell .btn.accent:hover,
```
