# M-tasks — mobile (apps/mobile/** ONLY; no web files)

Gates after every batch (from `apps/mobile`): `npx tsc --noEmit` = 0 · `npm test` (jest) green · `npm run lint` 0 errors · contract-check + tokens:check if wired · `npx expo export --platform android` succeeds. Commit ≤5 min on `wip/m<N>`; `verify.sh --fast` at the repo root is NOT needed for mobile-only changes (CI's mobile job is the witness) — but jest+tsc are law. Report ≤10 lines.

## Tasks (R340 leftovers + parity)
- **M1 exams chip hierarchy** — the exams screens' chips/filters get a measured hierarchy (one primary chip tier, muted secondary; 44px targets; spacing rhythm).
- **M2 live CTA competition** — the live-session screen's CTAs compete; establish one primary + rest secondary (visual weight measured: size/color/position).
- **M3 settings grouping** — settings rows grouped by concern with section headers (the 30-row wall dies).
- **M4 profile grouping** — same for profile.
- **M5 transcript virtualization** — the player transcript panel virtualizes long lists (FlatList windowing; memory profile before/after).
- **M6 muted-ink AA audit** — every muted text ≥4.5:1 on its composited background (both themes); fix at the token level, not per-screen.
- **M7 parity group 1** — student dashboard/courses/catalog/calendar adopt the web's visual language: paper ground, ink text, orange accent, hairlines not shadows, `[nn]` numerals, type rungs.
- **M8 parity group 2** — exams/results/schedule/alerts/messages.
- **M9 parity group 3** — remaining student screens.
- **M10 teacher/registrar/quality/owner screens polish** (same language).
- **M11 native build + OTA** — `eas update` from the sandbox (token in /home/z/.madarek-env; record update ids in `docs/mobile/`); Android APK via EAS build if quota allows, else `scripts/build-android-local.sh` (see `docs/mobile/ANDROID-LOCAL.md`); the build must carry predictive-back + navigation-bar (T-M5 plugin).
- **M12 mobile review panel** — 3 independent judges, ≥9/10 average, blind (no r341 docs); rubric: language coherence, type hierarchy, spacing, motion, RTL craft, polish.
