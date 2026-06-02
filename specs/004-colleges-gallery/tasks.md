---

description: "Task list for Colleges Gallery — Discoverable, Organized, Beautiful (004)"
---

# Tasks: Colleges Gallery — Discoverable, Organized, Beautiful

**Input**: Design documents from `/specs/004-colleges-gallery/`

**Prerequisites**: plan.md, spec.md, research.md (R-001..R-011), data-model.md, contracts/gallery-state.md, quickstart.md

**Tests**: Targeted unit tests on the pure filter function and the URL-state hook only — these are the parts where correctness matters and isolation is easy. UI states verified on Render.

**Organization**: Tasks are grouped by user story (US1–US7) so each is shippable on its own. P1 stories (US1, US2, US3, US6) form the MVP.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: parallelizable (different files, no blocking dependency)
- **[Story]**: US1..US7 — required for user-story tasks; absent for Setup, Foundational, Polish
- File paths repository-relative

## Path Conventions

Web app layout (existing).
- Frontend: `frontend/src/`
- Frontend hooks: `frontend/src/hooks/`
- Frontend tests: `frontend/tests/`
- Frontend pages: `frontend/src/pages/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the small scaffolding the gallery upgrade needs. No production behavior change.

- [X] T001 [P] Create `frontend/tests/gallery/` directory with a `.gitkeep` placeholder so subsequent unit tests have a home.
- [X] T002 [P] Create the empty file `frontend/src/hooks/useUrlQueryState.ts` with the documented public type signature from `contracts/gallery-state.md` (no implementation yet — keeps imports working in parallel tasks).
- [X] T003 [P] Create the empty file `frontend/src/pages/colleges/filter-colleges.ts` with the documented `filterColleges` signature, `FilterState`, `CityName`, `FilterResult` type exports from `contracts/gallery-state.md` (signature only, no body).

**Checkpoint**: Empty scaffolding in place. Build passes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement the filter pure function, the URL-state hook, and the CSS scaffolding for the toolbar and card accent. **Every user story depends on these.**

**⚠️ CRITICAL**: No user-story work begins until Phase 2 is complete.

- [X] T004 Implement `filterColleges` in `frontend/src/pages/colleges/filter-colleges.ts` per `contracts/gallery-state.md` and `data-model.md`: campus filter → query filter (Arabic NFD strip + tatweel removal + English lowercase + substring) → group by canonical campus order → drop empty groups → return `{ byCampus, total }`.
- [X] T005 [P] Add `frontend/tests/gallery/filter-colleges.test.ts`: empty input returns empty result; full list with no filter returns full list grouped; campus filter narrows to one campus; query "هندس" (no diacritics) matches "كلية الهندسة"; query "ENG" case-insensitively matches "Engineering"; combined filters AND; unknown campus normalizes to "مناطق أخرى".
- [X] T006 Implement `useUrlQueryState` in `frontend/src/hooks/useUrlQueryState.ts` per `contracts/gallery-state.md`: reads from `useSearchParams()`, exposes `{ state, setQuery, setCampus, clear }`. `setQuery` writes the URL via a 100 ms debounced effect (uses an internal `useDebouncedValue<string>` helper). Empty values strip the param. Round-trip safe.
- [X] T007 [P] Add `frontend/tests/gallery/useUrlQueryState.test.tsx`: initial state from URL with q + campus; setQuery debounces and eventually updates URL; setCampus updates URL immediately; clear strips both params; round-trip stability.
- [X] T008 [P] Add CSS scaffolding to `frontend/src/styles/colleges.css` (after the existing `.college-grid` rules): `.gallery-toolbar` (sticky on mobile, flex layout), `.gallery-search-input` (consumes `.input` + adds left-aligned search icon), `.gallery-chip-strip` (horizontal flex with scroll-snap), `.gallery-chip` + `.gallery-chip.on` (consumes `--state-card-*` tokens), `.college-card-accent` rule using `data-college-accent` attribute.
- [X] T009 [P] Add `.gallery-skeleton` rules in `frontend/src/styles/colleges.css` mirroring the gallery layout: 6 campus blocks × 6 card placeholders with the canonical card aspect.

**Checkpoint**: Pure function + hook implemented + tested; CSS scaffolding in place.

---

## Phase 3: User Story 1 — From homepage to "all colleges" in one tap (Priority: P1) 🎯 MVP

**Goal**: The "أكثر من 25 كلّيّة" badge on the homepage becomes a clickable link that loads the gallery in one tap.

**Independent Test**: From a fresh session, click the badge — confirm one tap → `/colleges` loads, focus ring is visible, hover state is unmistakable, RTL renders correctly.

### Implementation for User Story 1

- [ ] T010 [US1] Convert the static `<span className="landing-hero-eyebrow">أكثر من 25 كلّيّة</span>` in `frontend/src/pages/LandingPage.tsx` to `<Link to="/colleges" className="landing-hero-eyebrow landing-hero-eyebrow--linked">` containing the text and a trailing `<Icon icon={ArrowLeft} size={12} />`. Add the inline comment per R-011 documenting the marketing-friendly count.
- [ ] T011 [P] [US1] Add `.landing-hero-eyebrow--linked` modifier rules to `frontend/src/styles/landing.css`: cursor pointer, `transition` on `border-color`/`background` consuming `--motion-duration-short`, hover state with the canonical card-hover accent, focus-visible ring inherited from the universal rule (no override). Add a `gap` for the trailing icon.
- [ ] T012 [US1] Verify the badge: tab-focus on the homepage hits the badge with a visible focus ring; hover changes cursor + adds visual cue; tap navigates to `/colleges` via the existing `<PageTransition>` (no full reload). Repeat in RTL with the icon mirrored.

**Checkpoint**: Discovery anchor live on the homepage.

---

## Phase 4: User Story 2 — Gallery feels designed, not listed (Priority: P1)

**Goal**: Each campus group reveals once with the canonical motion; cards lift on hover; identity-profile accent stripes appear when configured.

**Independent Test**: Open `/colleges`. Confirm scroll-reveal cascade fires once per campus, hover lift uses canonical tokens, accent stripes appear on cards whose slug has an Identity Profile.

### Implementation for User Story 2

- [ ] T013 [US2] Wrap each campus `<section className="college-city-section">` in the existing `<Reveal>` primitive from `001-*` inside `frontend/src/pages/colleges/CollegePages.tsx`. Use `distance="medium"`. The grid of cards within each section can be a `<RevealGroup>` if the cards should stagger in; default to no stagger to keep the cascade calm.
- [ ] T014 [P] [US2] In `frontend/src/pages/colleges/CollegePages.tsx`, resolve the identity profile per card via `getCollegeIdentity(college.id)` (or `college.slug` if available). Apply `data-college-accent={accent ?? undefined}` and inline `style={accent ? { '--college-accent': accent } : undefined}` per `contracts/gallery-state.md`.
- [ ] T015 [P] [US2] Verify the card hover: existing `.college-card:hover` rules already use canonical hover treatment from `001-*`; confirm via grep for raw motion values in `colleges.css` and migrate any holdouts to `--state-card-*` tokens.

**Checkpoint**: Gallery feels curated rather than listed.

---

## Phase 5: User Story 3 — Find any college in seconds (Priority: P1)

**Goal**: Live search + campus chips + URL persistence + clear-filters action.

**Independent Test**: Open `/colleges`, type "هندس" — only matching colleges show. Tap "العجيلات" chip — only colleges in العجيلات show. Combine — intersection. Clear — full list returns. Filtered URL is shareable.

### Implementation for User Story 3

- [ ] T016 [US3] In `frontend/src/pages/colleges/CollegePages.tsx`, replace the existing inline city-grouping IIFE with a `useMemo(() => filterColleges(q.data, state), [q.data, state])` call. Wire `state` from `useUrlQueryState()`.
- [ ] T017 [US3] Render the toolbar above the campus sections in `CollegePages.tsx`: `<div className="gallery-toolbar" role="search">` containing the search input (with hidden label, controlled value, `onChange` updates `state.query` via the hook) and the chip strip (`role="tablist"`, one chip per CityName + an "all" chip). Each chip's `aria-selected` reflects `state.campus === chip.value`.
- [ ] T018 [P] [US3] Add a single visually-hidden `<div role="status" aria-live="polite" aria-atomic="true">` immediately after the toolbar that renders `${total} نتيجة`. Update happens automatically on every render.
- [ ] T019 [US3] Render the `clear filters` action visible only when `state.query !== '' || state.campus !== null`. Tapping calls `clear()` from the hook.
- [ ] T020 [US3] Manual verification: walk the journey above (search, filter, combine, clear, share-URL) on desktop. Confirm debounce feels instant; URL updates within 200 ms of typing-end; `aria-live` announces result count via VoiceOver.

**Checkpoint**: Search + filter functional. URL is shareable. P1 (MVP) at this point includes the discovery anchor + designed gallery + working search.

---

## Phase 6: User Story 6 — Mobile gallery is intentional, not compressed (Priority: P1)

**Goal**: 360 px viewport works as primary interface — no overflow, sticky toolbar, horizontal-scroll chip strip, single-column cards.

**Independent Test**: At 360 px, walk the gallery from top to bottom. Confirm zero horizontal scroll on document, chip strip scrolls within itself, toolbar sticks while content scrolls.

### Implementation for User Story 6

- [ ] T021 [US6] Add mobile-specific CSS to `frontend/src/styles/colleges.css`: `@media (max-width: 767px)` block that makes `.gallery-toolbar` `position: sticky; top: var(--topbar-h); z-index: var(--z-1)`, gives it a backdrop-blur background, and forces `.college-grid` to `grid-template-columns: 1fr`.
- [ ] T022 [P] [US6] Add `overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none` to `.gallery-chip-strip` on mobile so chips scroll inside the strip. Add `scroll-snap-align: start` to `.gallery-chip`. Add `-ms-overflow-style: none` and `&::-webkit-scrollbar { display: none }` to hide scrollbars.
- [ ] T023 [US6] Verify touch-target hit areas at 360 px: `.gallery-chip` ≥ 44×44 (bump padding if needed), `.college-card` is its own large hit area, search input ≥ 44 px tall. Confirm via DevTools device emulation.
- [ ] T024 [US6] Manual smoke at 360 px in DevTools: walk `/`, click the badge → `/colleges`, search, filter, tap a card. Confirm zero horizontal-scroll on document, sticky toolbar behaves, chip strip scrolls inside itself, all targets reachable with one thumb.

**Checkpoint**: Mobile is intentional. **MVP scope (P1: US1+US2+US3+US6) complete.**

---

## Phase 7: User Story 4 — Each campus is its own visual section (Priority: P2)

**Goal**: Campus boundaries are visually unambiguous from typography and spacing alone — no busy backgrounds.

**Independent Test**: Scroll the gallery; confirm each campus section reads as distinct without noisy borders or contrasting backgrounds.

### Implementation for User Story 4

- [ ] T025 [US4] Migrate `.college-city-name` in `frontend/src/styles/colleges.css` to consume `--type-headline-*` role tokens from `002-*` (not raw `--fs-*`). Pinned weight + line-height + letter-spacing.
- [ ] T026 [P] [US4] Migrate `.college-city-count` to consume `--type-label-*` role tokens.
- [ ] T027 [P] [US4] Apply `--section-pad-y-narrow` to `.college-city-section` for consistent vertical rhythm between groups.
- [ ] T028 [US4] Verify campus order rendering: load `/colleges`, confirm order is الزاوية → العجيلات → زوارة → أبو عيسى → ناصر → مناطق أخرى. The order comes from `filterColleges` (Phase 2), so this is verification only.

**Checkpoint**: Campus sections read as distinct sections.

---

## Phase 8: User Story 5 — College card surfaces just enough (Priority: P2)

**Goal**: Card hierarchy reads at a glance — Arabic name dominant, counts tabular, "—" for unknown vs "0" for verified zero, accent stripe from identity profile.

**Independent Test**: Compare two cards side-by-side. Confirm the Arabic name is the dominant element; counts use tabular figures; "—" appears for unknown counts.

### Implementation for User Story 5

- [ ] T029 [US5] Migrate `.college-card-name` in `frontend/src/styles/colleges.css` to consume `--type-headline-size-sm` + headline weight/line-height/letter-spacing tokens. The name MUST be the most prominent element on the card.
- [ ] T030 [P] [US5] Migrate `.college-card-stats` count values to consume `--type-metric-size` tokens with the existing `.tabular-nums` utility.
- [ ] T031 [US5] Update the count-rendering logic in `CollegeStatChip` (in `frontend/src/pages/colleges/CollegePages.tsx`): when the count is `null` or `undefined`, render "—"; when the count is exactly `0`, render "٠" (or "0" per locale). Document in a comment that this implements FR-010 (Principle III: never invent data).
- [ ] T032 [P] [US5] Add a "→ زيارة الصفحة" hover affordance using a hidden span that becomes visible on `:hover` of the card; uses `--motion-duration-short` and is suppressed on touch + reduced-motion.

**Checkpoint**: Card surface is calibrated.

---

## Phase 9: User Story 7 — Empty / loading / error states match the gallery's quality (Priority: P2)

**Goal**: Loading, error, and filtered-empty states all feel as intentional as the populated state.

**Independent Test**: Throttle network to 3G — skeleton matches layout. Force API failure — error state with retry. Search "xyzzy" — filtered-empty state with clear-filters action.

### Implementation for User Story 7

- [ ] T033 [US7] Replace the existing `<LoadingState />` placeholder in `frontend/src/pages/colleges/CollegePages.tsx` with a gallery-shaped skeleton: render the toolbar in its disabled state + 6 campus blocks each with a `<Skeleton variant="text" />` header and a 6-cell grid of `<Skeleton variant="kpi" />` placeholders. Use the existing `<Skeleton>` primitive from `001-*`.
- [ ] T034 [P] [US7] Differentiate the two empty states: when `q.data?.length === 0`, render the existing "no colleges yet" `<EmptyState>` (already in place); when `total === 0` after filtering, render a NEW filtered-empty state using `<EmptyState>` with `title="لم نعثر على نتائج"`, description that mentions the active filters, and an action button that calls `clear()`.
- [ ] T035 [US7] Verify the existing `<ErrorState onRetry={...} />` covers FR-020 — this is already in `CollegesIndexPage`; spot-check by simulating an API failure (DevTools network → "Offline").
- [ ] T036 [US7] Manual verification: throttle network to 3G, load `/colleges` — skeleton appears within 100ms and matches the gallery's grid. CLS measured ≤ 0.05.

**Checkpoint**: All states match the gallery's visual quality.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Verification, gates, follow-ups.

- [ ] T037 [P] Token discipline: `npm run check:motion-tokens` and `npm run check:icons` both pass.
- [ ] T038 [P] Bundle audit: `npm run -w frontend build` and confirm gallery route gzipped delta ≤ 6 KB vs. pre-004 baseline. If exceeded, identify offender (likely the new chip strip CSS or the hooks bundle) and tighten.
- [ ] T039 [P] Reduced-motion verification: emulate `prefers-reduced-motion: reduce` in DevTools, reload `/colleges` — confirm campus reveals render in final state on first paint, hover lift remains, no decorative motion plays.
- [ ] T040 [P] RTL parity sweep: switch to Arabic, walk the gallery on desktop and 360 px — confirm chip strip scrolls correctly, accent stripe is on the leading edge (right side in RTL), search icon mirrors, the trailing arrow on the homepage badge mirrors.
- [ ] T041 [P] Keyboard sweep: Tab from URL bar through homepage badge → gallery search → chips → first card → last card. Confirm visible focus ring at every step.
- [ ] T042 [P] Manual screen-reader smoke (NVDA / VoiceOver): announce filter count via aria-live polite when typing in search; ensure no announcement on every keystroke (debounced).
- [ ] T043 Update `DESIGN_POLISH_PLAN.md` to point readers to `specs/004-colleges-gallery/quickstart.md` for the gallery contribution flow.
- [ ] T044 Document any remaining drift as backlog tickets — do NOT block the rollout on items the audit shows are minor.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies. 3 [P] tasks all parallel.
- **Foundational (Phase 2)**: depends on Setup. **BLOCKS all user stories.**
  - T004 + T006 are sequential per file; T005, T007, T008, T009 are [P].
- **User Stories (Phases 3–9)**: all depend on Foundational.
  - US1 (homepage badge): independent.
  - US2 (designed gallery): independent.
  - US3 (search/filter): depends on T004 (filterColleges) + T006 (useUrlQueryState).
  - US6 (mobile): depends on US3 (toolbar must render before mobile-specific styles can be tested).
  - US4 (campus sections): independent of other stories; touches different CSS rules.
  - US5 (card surface): independent.
  - US7 (states): depends on T033 needing the existing toolbar from US3.
- **Polish (Phase N)**: depends on every in-scope user story complete.

### User Story Dependencies (visualized)

```
        Phase 2 (Foundational)
                |
   ┌────────────┼────────────┬────────────┬────────────┐
   ▼            ▼            ▼            ▼            ▼
  US1          US2          US3          US4          US5
(homepage)  (designed)   (search)    (campus)      (card)
                            |
                            ▼
                           US6
                         (mobile)
                            |
                            ▼
                           US7
                         (states)
```

### Parallel Opportunities

- All Phase 1 [P] tasks (T001–T003) parallel.
- Phase 2 after T004/T006 land: T005, T007, T008, T009 parallel.
- US1 toolbar work (T011) parallel with US2 accent (T014/T015).
- US4 typography migrations (T026, T027) parallel with US5 card migrations (T030, T032).
- All Polish tasks parallel.

---

## Parallel Example: Foundational Phase

```bash
# After T004 (filterColleges) and T006 (useUrlQueryState) land:
Task: T005 — filter-colleges.test.ts
Task: T007 — useUrlQueryState.test.tsx
Task: T008 — gallery-toolbar CSS scaffolding
Task: T009 — gallery-skeleton CSS scaffolding
# All [P] — different files / different tests / different CSS sections.
```

---

## Implementation Strategy

### MVP (Phases 1–6: Setup + Foundational + US1, US2, US3, US6)

The MVP is the four P1 stories. After MVP:
1. Homepage anchor → gallery in one tap.
2. Gallery feels designed (campus reveals + identity-accent stripes).
3. Live search + campus chips + shareable URL.
4. Mobile is intentional (no overflow, sticky toolbar, horizontal chip strip).

Stop. Demo on Render. Validate via the spec's acceptance scenarios. Then proceed to P2.

### Incremental Delivery

1. Phase 1 + 2 → tooling + foundation land (internal only).
2. + US1 → homepage anchor live (public).
3. + US2 → reveals + accents (public).
4. + US3 → search + filter functional (public).
5. + US6 → mobile excellence (public).
6. + US4 → campus visual rhythm (public).
7. + US5 → card surface calibrated (public).
8. + US7 → loading/empty/error consistency (public).

### Parallel Team Strategy

After Phase 2:
- Developer A: US1 (homepage badge) + US2 (gallery accent + reveals).
- Developer B: US3 (search/filter wiring) + US6 (mobile sticky/chip-scroll).
- Developer C (later): US4 (campus type) + US5 (card type) + US7 (states).

---

## Notes

- [P] = different files, no blocking dependency.
- [Story] maps each task to its user story for traceability.
- Don't introduce new motion or interaction tokens; consume `001-*` and `002-*`.
- Don't add a server-side filter param; client-side over the cached list is the contract.
- Don't paginate; ~26 colleges all visible.
- Don't replace the existing `CollegesIndexPage`; extend in place.
- Stop at any checkpoint to validate the story independently.
- Avoid: vague tasks, same-file conflicts in [P] groups, dependencies that break user-story independence.
