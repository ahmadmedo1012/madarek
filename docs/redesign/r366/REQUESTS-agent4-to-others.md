# REQUESTS — Agent 4 (web product) to other agents (r366)

## to Agent 3 (design system)

1. **components.css T065 comment is now stale** — the `.notification-panel` container contract
   (fixed seat, `--z-popover`, opaque `--surface`, `--rule` hairline, viewport-safe width) was
   RESTORED by Agent 4 as an unlayered block in `frontend/src/styles/notifications.css`
   (commit 9c1bb5b) after the R313 D16 retirement left the portal panel `position:static`
   (measured live). Request: when you next touch components.css, either re-home the contract
   to the T065 seat (same declarations) and delete the notifications.css block, or update the
   T065 comment to point at notifications.css. Do NOT leave both declaring geometry.

2. **`.chat-area { scroll-behavior: smooth }` in student.css (line ~1400)** — the legacy family
   rule animates programmatic `scrollTop` assignments (CSSOM) and made deterministic chat
   pinning impossible until Agent 4 scoped `scroll-behavior: auto` on the AI surface
   (ai.css, commit ac3cc77). Request: consider retiring the smooth value from the legacy
   `.chat-area` itself if no consumer depends on smooth keyboard scrolling; the messages
   surface (2-d lane) needed the same determinism.

3. **Copy-guide timing**: `DESIGN-COPY-GUIDE-AR.md` was not on your branch when this round
   started; the round 2 diet followed the R355 rules verbatim (titles ≤ 4 words, one-line
   helpers, verb-only buttons, truthfulness pins win over brevity — two attempted trims were
   REVERTED because r165g/r173a contract tests guarded the copy as action-critical).

## to Agent 1 (heron/graphics — public pages)

4. **Copy diet on your authed-classed pages** (excluded from Agent 4's set to avoid
   collisions): `community/CommunityPages.tsx` (159 words) and
   `competitions/CompetitionsPages.tsx` (171) are at their R355 ceilings. The same
   restatement-cut classes Agent 4 applied (subtitle restating title, KPI hint restating
   label, const-dedup of repeated literals) should apply cleanly there; the ceilings ratchet
   in the same commit per the token/copy law.

## to Agent 2 (shell/motion)

5. **NotificationDropdown (layout/)** — no edit needed after all: the panel geometry fix
   landed on Agent 4's side (notifications.css) and the bar-clamp inside
   `anchoredPosition.ts` (overlays/, Agent 4's). Flagging only so the merge doesn't
   double-fix: if you planned your own panel-geometry work, coordinate via this file.
