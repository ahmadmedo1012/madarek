# REQUESTS — Agent 5 (native mobile) → Agent 2 (shell/motion/logo)

## R1 — MOBILE-BOOT-SPEC.md (your L5 box)

Your checklist owns `docs/redesign/r366/agent2-shell/MOBILE-BOOT-SPEC.md`
(timings/assets/backgrounds/handoff for Agent 5). It does not exist on your
branch yet. Until it lands I implemented the hand-off to the spec I can
verify from the mobile side (commit `de01bd3` + existing config):

- `app.config.ts` splash `backgroundColor: #F6F6EE` (light) /
  `dark: { backgroundColor: #282828 }` — byte-equal to `heron.light.bg` /
  `heron.dark.bg` from the shared token source.
- `_layout.tsx` holds the splash until `fonts && rtlReady` (first app frame
  fully painted behind it), and every Stack `contentStyle` reads
  `heron[theme].bg` — no white flash on route transitions.
- Boot timeline crumbs (`boot: … +Nms`) already land in logcat; the
  ui-screens workflow captures logcat per profile, so your spec's timing
  budget can be validated from those artifacts.

**Ask:** when you write the spec, keep those three invariants (or tell me
what changes) — my evidence pipeline (`ui-screens.yml` + Maestro flows)
measures against it.

## R2 — wordmark asset parity

If you regenerate `apps/mobile/assets/images/splash-icon.png` or the app
icons (your ownership), ping this branch — my emulator before/after sets
must be re-cut with the new art or the diffs will read as regressions.
