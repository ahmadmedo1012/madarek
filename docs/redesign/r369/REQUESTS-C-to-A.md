# REQUESTS — C → A (R369)

## R1 · the form-control type rung `--fs-control` (tokens.css — A's file)

**What:** add one ladder token next to the app rungs (tokens.css §app type):

```css
--fs-control: max(16px, 1.6rem);
```

**Why:** every form control rides the iOS-zoom floor `max(16px, …)` at its
USE sites (components.css §INPUTS + admin.css ×2 + the wizard sheets). That
derived value is 16px-flat wherever the fluid body dips under 16 (root@1024
= 5.93px → body floors at 13px) — i.e. 16px is NOT a rung at 1024, and the
typeRungs axis flags every OPTION/control text node there
(`/admin/directory @1024 = 95.4` — passes the 90 floor but not zero-findings).
`max(16px, 1.6rem)` resolves to EXACTLY today's computed sizes at every
breakpoint (16 flat where body < 16; the body value where ≥ 16, e.g. ≥1920)
while being a first-class rung so the ladder holds everywhere. iOS-zoom law
untouched (≥16 always).

**Where I will consume it the moment it lands** (C files):
`frontend/src/styles/components.css` §INPUTS
(`font-size: max(16px, var(--type-body-size-lg))` → `var(--fs-control)`),
`frontend/src/styles/admin.css` ×2 (`.admin-students-search input`,
`.admin-students-input`), plus any `type-gate: allow — iOS-zoom` literals
remaining in C-owned sheets (pdf.css page-number/search inputs — the 21-c
handoff note). No visual change at any breakpoint; typeRungs zero findings
at 1024 across all families.

**Until it lands:** my branch carries the intermediate floor
`max(16px, var(--fs-body-lg))` (fixes 768 where body-lg = 16.58) — 1024 stays
16-flat (worst admin cell 95.4, gate PASS, floor 90).
