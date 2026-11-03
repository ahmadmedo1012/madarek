# R334 · Round 2 — Student Home: Profile · Settings · Select-Institution

Branch `r334/r2-stu-home` (task 3-c). Owners: the files below; foundations live in
`docs/mobile/foundations/*.md`. Screens covered: student **dashboard**, **profile**,
**settings** (shared, every role), **select-institution**, and the **/report** sheet route.

| File | Role |
|---|---|
| `apps/mobile/app/student/(tabs)/dashboard.tsx` | «الخطوة التالية» hero + motion stats (commit 911cefe) |
| `apps/mobile/app/student/(tabs)/profile.tsx` | identity + preferences seat + menu hub |
| `apps/mobile/app/settings.tsx` | the SHARED settings surface (every role) |
| `apps/mobile/src/features/student/more.tsx` | label maps / counted nouns (no interactive primitives) |
| `apps/mobile/src/features/student/components.tsx` | learning kit: ScrollBody, GapList, nextStep… |
| `apps/mobile/app/(modals)/report.tsx` | «الإبلاغ عن مشكلة» as an AppSheet route (d6f922f) |
| `apps/mobile/app/select-institution.tsx` | multi-institution context gate |

## Decisions

1. **Profile owns the student's quick preferences; /settings is the shared surface.**
   The profile exposes appearance (`light/dark/system` Segmented + best-effort server sync),
   numerals (`useNumerals` + `NUMERALS_OPTIONS`, hint literally shows «١٢٣ / 123»), haptics
   («ردود اللمس» via `haptics.setEnabled`, with one `impact('light')` as a felt sample when
   re-enabled), app lock (biometric toggle that PROVES the sensor before saving), notification
   permission (value-shown seat: granted / denied / undetermined), «الإبلاغ عن مشكلة» → `/report`,
   and logout. `/settings` wires the **same toggles** (appearance · numerals · haptics) plus
   password change, account facts, app lock and session — both seats read/write the identical
   persisted state (zustand persist / AsyncStorage), so they can never disagree. The profile
   menu keeps linking «الإعدادات» → `/settings`; all existing routes work unchanged.
2. **Logout confirmation = ONE pattern app-wide**: destructive `ConfirmSheet` +
   `haptics.notify('warning')` on open, `unregisterPushDevices()` before session drop
   (R327 C3 — a handed-over phone must not keep pushing). /settings' old `ConfirmDialog`
   was migrated to the same sheet.
3. **ONE orange accent per screen.** `p.accent` is the only saturated brand hue (theming
   foundation). Dashboard → the «الخطوة التالية» hero card (border + accent CTA); profile and
   settings → the destructive logout button (`kind="danger"`); select-institution → none
   (a neutral picker). The dashboard's «اليوم» schedule chip was de-accented to bold ink —
   the hero owns the orange.
4. **Haptics policy per foundation**: `selection()` on every discrete choice (segments, menu
   rows, picker picks, quick actions), `notify('warning')` before destructive confirms,
   `impact('light')` only as the enable sample. `haptics.isEnabled()` is a synchronous cached
   read → both seats use a **lazy `useState` initialiser**, no effect-driven state (kills the
   `set-state-in-effect` lint class).
5. **Select-institution = searchable picker rows, not DataList.** Membership lists are 2–4
   rows — DataList (FlashList) is for long lists and needs a bounded-height parent; picker
   rows (PressableScale, BrandMark, role Badge, per-row busy state «جارٍ الدخول…») keep the
   geometry honest. Search matches Arabic + English names case-insensitively; session
   hydration shows `SkeletonList` rows with the picker's real 72px geometry; zero active
   memberships stages the **building** blueprint room with a logout action; failures run
   through `humanizeError` + `ErrorState` with the `/report` affordance.
6. **No raw enums leak to readers.** `gradeKindLabel` now falls back to «تقييم» instead of
   the wire kind; `classWhenLabel` already maps unknown flags to «لاحقًا». `more.tsx` is
   label-maps only (no interactive primitives — nothing to adopt); `components.tsx`'s
   interactive surfaces route through the shared `LedgerRow`/`Button`/`Sheet` primitives,
   which own their own press states. `CourseWell`'s hex tinting is API data (course colour),
   not theme bypass.
7. **Dashboard six-state honesty fix**: a failed agenda no longer renders the «استرح» empty
   note — it shows `ErrorState` (`humanizeError` + retry + report); the empty note only
   renders for a real empty agenda.

## Six-states checklist (per screen)

Legend: ✅ wired · ➖ not applicable by construction

| State | Dashboard | Profile | Settings | Select-institution | /report sheet |
|---|---|---|---|---|---|
| Skeleton | ✅ hero/stats/strip/gaps/agenda mirror real geometry | ✅ `SkeletonList` rows=4 while /me/profile loads (identity renders session-first, never waits) | ➖ local-only surface (no query) | ✅ `SkeletonList` rows=3 @72px while session hydrates | ✅ sheet fields mount instantly (local state) |
| Empty | ✅ `EmptyState room="lecture-hall"` when no courses; quiet notes for empty gaps/agenda | ✅ no student file → honest «تواصل مع شؤون الطلاب» empty card | ➖ account card renders facts with «—» fallbacks | ✅ `EmptyState room="building"` + logout action; search miss → «لا مؤسّسة تطابق بحثك» | ➖ form is never empty-stateful |
| Error | ✅ `ErrorState` (humanizeError + retry + report) on stats/gaps/**agenda** (R2 fix) | ✅ `ErrorState` on profile query | ✅ inline Arabic validation + `ApiError.message` on password change | ✅ `ErrorState` on pick failure (humanizeError + report) | ✅ humanized failure + `notify('error')` |
| Offline | ✅ fetch failure → humanizeError («تحقّق من اتصالك») with retry | ✅ same seat; identity card renders from the persisted session | ✅ theme/numerals/haptics are local — work offline | ✅ rows render from session; pick failure humanized | ✅ best-effort POST, failure stays in the sheet |
| Long text | ✅ `numberOfLines` on titles/sublines; chips cap at 220px | ✅ name/email single-line, membership list wraps | ✅ membership line joins with «·» and wraps | ✅ name/nameEn `numberOfLines=1` | ✅ multiline SheetTextInput |
| Large font | ✅ T variants scale; tap targets ≥44/48px | ✅ same + 44px rows | ✅ same + 44px rows | ✅ 72px rows, Badge not text-scaled | ✅ snap=lg scrollable sheet |
| RTL | ✅ Arabic-first, direction rtl | ✅ | ✅ | ✅ | ✅ |
| Dark | ✅ semantic palette only | ✅ | ✅ | ✅ | ✅ |
| Tablet | ✅ flex rows (stats trio, quick actions) stretch | ✅ avatar row + KPI pairs stretch | ✅ stacked cards | ✅ full-width rows | ✅ sheet caps width |

## Verification (Round 2 close-out)

- `npx tsc --noEmit` → **0 errors**
- `npx jest --no-cache --runInBand src/test/render-net.test.tsx` → **113/113 green**
- `npm run lint` → **0 errors**; 7 warnings, all pre-existing (`src/brand/plan/*`, `src/test/setup.ts`) —
  the two Round-2 `set-state-in-effect` warnings in owned files were eliminated via lazy state.
- Honesty: no emulator/simulator claims — states verified by code paths + the render net only.

## Known TODOs (out of ownership this round)

- Other screens still leak raw enums via `LABEL[x] ?? x` (e.g. `online-exams.tsx`, `research.tsx`,
  `jobs.tsx`) — their owners should adopt the `gradeKindLabel` fallback pattern.
- `Badge tone="copper"` chips outside the owned screens still compete with the one-accent rule.
- Push deep-linking from the notification prefs seat (currently value-shown only).
