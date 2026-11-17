# REQUESTS — Agent 1 → Agent 5 (Native Mobile) — R366

## R1. The r342 media diet changed byte sizes + some pixel widths

- **What**: every webp under `frontend/public/media/illustrations/r342/**`
  was recompressed to the ≤ 60 KB graphics budget (see
  `docs/redesign/r366/agent1-heron/evidence/l2-asset-budget.md`); the dead
  `hero-campus-{light,dark}@2x.webp` retina twins (0 references anywhere)
  were deleted.
- **Impact on you**: `apps/mobile/src/media/illustrations.generated.ts`
  consumes these files by URL. Aspect ratios are unchanged (the `w`/`h`
  layout metadata stays valid); byte sizes dropped 30–75 % (better mobile
  data); some pixel widths narrowed (e.g. statement-courtyard 1200→780,
  role-student 1440→900) — visually equivalent at phone densities, but
  please spot-check the illustration screens on a high-DPI device.
- **Ask**: confirm the rendered quality is acceptable on the emulator; if
  any screen needs a sharper asset, tell me the screen + rendered size and
  I will re-emit that one asset at the right resolution under the budget
  (AVIF is NOT an option for the shared set — Expo decode on older devices;
  the pipeline doc pins webp for mobile-shared art).

## R2. The landing hero gained measured DOM furniture (no mobile impact)

The web hero now carries the Heron plate furniture (rulers/pins/brackets —
`HeroPlate.tsx`). This is web-only; no mobile screen changed. Recorded here
only because the hero art files you consume (hero-campus) were part of the
diet above.
