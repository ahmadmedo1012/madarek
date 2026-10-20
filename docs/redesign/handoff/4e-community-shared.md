# 4E — Community / Assistant / Notifications / Colleges / Shared — Handoff

> Agent 4E · branch `redesign/4e-community-shared` · final pushed SHA: **see git log** (r260–r268).
> Base: origin/main @ cabc3a3 (r197+r198). Merged `origin/redesign/shell` twice (r210 patterns + r211–r214 shell re-skin) at 552b866 and 927c4e9.
> Direction: every page = Superlist principles (list-first, quiet rows, detail attached to the item, calm surfaces, one signal accent). Homepage NOT mine.

## Adopted route list (published at r260, verified against App.tsx @ cabc3a3)

Per the team protocol Agent S owns auth/onboarding/404/error (`/auth`, `/auth/register`, `/404`, `*`) — subtracted from the BLUEPRINT §1 4E rows. Homepage is another agent's.

| Route(s) | Component (file) | Disposition |
|---|---|---|
| `/community` + `/teacher|admin|quality/community` | `CommunityPage` (`pages/community/CommunityPages.tsx`) | **REDESIGNED r262** on patterns |
| `/competitions`, `/competitions/:id` | `CompetitionsPages.tsx` | **index REDESIGNED r263**; detail kept (already hero + entry rows + leaderboard) |
| `/vision`, `/vision/:slug` | `VisionPages.tsx` | **gallery REDESIGNED r266**; detail kept (reading surface) |
| `/colleges`, `/colleges/leaderboard`, `/colleges/:id` | `CollegePages.tsx` | **index REDESIGNED r264**; detail + leaderboard kept (identity accents + sortable table are the right tools) |
| `/training`, `/training/:slug`, `/training/:slug/lesson/:lessonId` | `TrainingPages.tsx` | **catalog REDESIGNED r265**; track/lesson pages kept (already lesson rows) |
| `/achievements` | `AchievementsPage` (same file) | kept (StatStrip + tabs + badge tiles) |
| `/student/ai`, `/teacher/ai` | `AiAssistantPage.tsx` | **REDESIGNED r261** (focused surface + new `styles/ai.css`) |
| `/owner/ai` | `OwnerAiPage.tsx` (owner/ folder) | kept — already StatStrip + ChartFrame + table (ledger pattern); adopting RowList there buys nothing |
| `/student|teacher|admin/alerts`, `/quality/notifications`, `/owner/notifications` | `AlertsPage` (in `pages/student/MorePages.tsx` L367–560) | **REDESIGNED r261** (quiet management rows `.np-*` in notifications.css) |
| `components/messages/` | MessagesInbox + ComposeModal | kept — already day-grouped list-rows consuming components.css; no route edits possible (4A/4C wrappers) |
| `components/community/CommunitySocialPanels.tsx` | rooms + posts panels | **rooms REDESIGNED r262** (RowList); posts feed kept (body-first content doesn't fit the title-row contract; there is no replies API to attach — never invent capabilities) |

**Unclaimed-route sweep result:** every App.tsx route row maps to a family; BLUEPRINT's «zero unclaimed» holds. Boundary files adopted: `pages/owner/OwnerAiPage.tsx` (4E route), `AlertsPage` inside 4A's MorePages.tsx (component owner; host file untouched outside the AlertsPage function), `components/community/CommunitySocialPanels.tsx`.

**Settings/theme/preferences (honest scope):** no settings page exists in this family and I cannot add routes. The theme backend (`me.themePreference` + `useThemeProfileSync`) and ThemeToggle are 1B/shell-owned. The settings-rows pattern was applied to what my routes actually manage: AlertsPage (inline mark-read rows + mark-all + instant feedback) and the assistant's conversation management rows (two-step delete). A true «الإعدادات» page is net-new → needs a coordinator route decision (see Requests).

## Per-page layout decisions (one line each)

- **Community**: patterns PageHeader with the ARIA tablist inside it → StatLine (3 honest counts) → per-tab RowList/RowItem (announcements expandable with pinned default-open; competitions = title-as-door link rows; events = rows with RSVP trio in trailing that wraps to its own line ≤720px via `:has(.cp-rsvp)`; rooms = avatar rows with join/leave trailing). Posts tab keeps its feed anatomy.
- **Competitions index**: patterns PageHeader → StatLine → FilterBar (URL-synced status pills kept) → RowList of link rows (status/deadline/entries/prize in trailing, 2-line clamped description).
- **Colleges index**: patterns PageHeader (scene-paint SectionAccent retired) → sticky FilterBar (search + campus chips + reset) → per-campus Reveal sections of RowItem rows (emoji lead, name link, nameEn+count chips inline in meta, arrow trailing). Guest zero-suppression (A8 P2-6) preserved in the meta stats.
- **Training catalog**: StatStrip + level band + filter pills unchanged; track grid → RowList rows (stats inline in meta, enrolled progress bar owns the trailing, non-enrolled rows have none).
- **Assistant**: `.ai-layout` grid (surface + 320px side), `.ai-surface` clamp(440–780px) panel with header bar (awareness badge), `.chat-area` flex-fills (student.css 480px cap neutralized by higher specificity), `.ai-composer` pinned bottom (privacy line, honesty-gated chips, input+send, counter), `.ai-gaps` strip above the surface (horizontal scroll ≤760px). All tests-pinned contracts kept (.chat-area, aria-labels, .ai-conv-row[aria-current], .font-mono engine tags).
- **Notifications (AlertsPage)**: `.np-list`/`.np-row` quiet rows — tone well (soft status token bg + ink), strong title + «غير مقروء» badge when unread, inline mark-read button (variables-gated), read-mark check for read rows, mark-all in card actions (wraps under title ≤640px), server-truth unread meta + «آخر N من M» pagination footer unchanged.
- **Vision gallery**: StatLine summary → two sections («جرّبها الآن» / «قيد التطوير») of RowItem rows (ConceptChip lead, title link, status badge trailing). Honest-framing note kept.
- **MessagesInbox / OwnerAi / detail pages**: kept deliberately (already list-first; changing them costs bytes/merge surface without direction gain).

## Round log
- **r260** — setup: branch, stack booted (boot-pg.sh :5433 + backend :4000 + frontend :5173), 8 demo accounts verified, route map + adoption list published. Push: ff85d42.
- **r261** — AlertsPage quiet rows (`.np-*` in notifications.css) + assistant focused surface (`styles/ai.css` new, page-scoped) + gaps strip + pinned composer. Tests updated: AlertsPage-mark-read (`.alert.unread` → `.np-row.unread`). Push: bc1f1fe.
- **r262** — merge origin/redesign/shell (patterns r210). CommunityPage recomposed on PageHeader/StatLine/RowList/RowItem; rooms panel → RowList; `.cp-*` row utilities added (colleges.css then). Push: 07a5f29.
- **r263/r264** — competitions index → FilterBar + rows; colleges index → PageHeader + sticky FilterBar + campus rows (identity accents read on detail; index accent vars retired). Push: 5e1068d.
- **r265/r266/r267** — training catalog rows; vision rows + StatLine; **fixed r197 bug**: ProgressBar readout shipped a raw JSX comment to the screen (primitives/index.tsx — my file); `.cp-*` consolidated into components.css §CP ROWS inside `@layer components`; notifications card-header wrap ≤640px. Push: a5323b0.
- **r268** — merge origin/redesign/shell again (r211–r214 clean); dead-selector sweep in my sheets (gallery-toolbar/search, kpis-compact, comp-index-*, track-card* removed; track-grid kept — 4C consumes).

## Gates (final state, all run before last push)
lint **0 errors / 19 known warnings** · typecheck ✅ ×2 · frontend tests **1970/1971 (183 files)** — the single failure is **NOT mine**: `tests/unit/AuthPage-alignment.test.tsx` («the ambient wash is CSS-only…») pins the `.auth-meta` mono font stack that Agent S's own r212 art commit retired; the two files are byte-identical between `origin/redesign/shell` and my HEAD (`git diff` = 0 lines), i.e. the failure pre-exists on the shell branch tip and rode in with the merge — **for Agent S/Z to fix** (their test or their sheet, not 4E's). Backend tests untouched ✅ · parity **190/190** · colleges **25/25** · colors ✅ (16 sanctioned allows) · motion ✅ · icons ✅ · raw-css ✅ (strict) · CSP ✅ · bundle **636.8/650 KB gz, entry 71.1/80, pdf 95.7/110** ✅. My family's own tests: **all green** (Community ×17, Alerts ×21, AI ×46, Competitions ×9, filter-colleges, route-titles, notifications-envelope).

## Browser verification (per surface, agent-browser, seeded data)
- Viewports **390 / 1280** on: community (4 tabs), competitions index, colleges index, training catalog+track, vision, assistant, alerts. **Light + dark** both exercised via the app theme store (`madarek-theme`), not just prefers-color-scheme. 360/768 verified structurally (same responsive rules; 390 is the tighter bound and drives the breakpoints used: 640/720/760/980).
- Verified per surface: no horizontal scroll; loading skeletons shape-matched; honest empty/error states; 44px targets via the shared `.btn` mobile floor + pattern floor; Western digits via utils/numbers only; RTL correct (RowItem chevron rotates, back links use ChevronRight/ArrowLeft per RTL); mobile RSVP wrap, gaps horizontal-scroll strip, sticky FilterBar.
- **Reduced motion**: my additions declare transitions only through `var(--motion-duration-*)`/`var(--t-*)` (zeroed by motion.css belt) and contain **zero keyframes** — the reduced-motion path renders the complete static result by construction. The patterns sheet (Agent S) owns the only new animation (row-toggle rotation) and covers it.
- Not verified in browser: `/owner/ai` (OWNER login not exercised this round — page untouched), messages wrappers (4A/4C routes, files untouched), guest colleges funnel beyond index render (GuestJoinRow kept intact).

## Files changed (mine)
`pages/community/CommunityPages.tsx` · `pages/competitions/CompetitionsPages.tsx` · `pages/vision/VisionPages.tsx` · `pages/colleges/CollegePages.tsx` · `pages/student/TrainingPages.tsx` · `pages/student/AiAssistantPage.tsx` · `pages/student/MorePages.tsx` (AlertsPage fn only) · `components/community/CommunitySocialPanels.tsx` · `components/primitives/index.tsx` (ProgressBar comment fix) · **new** `styles/ai.css` · `styles/notifications.css` · `styles/colleges.css` · `styles/training.css` · `styles/components.css` (§CP ROWS + vision n/a) · `tests/unit/AlertsPage-mark-read.test.tsx` · `docs/redesign/handoff/4e-community-shared.md`.

## Selectors made obsolete (for Agent Z)
- **Deleted by me from my sheets** (this branch, r268): colleges.css `.gallery-toolbar`, `.gallery-search-wrap`, `.gallery-search-input`, `.kpis-compact` family (§1394 banner + media queries), `.comp-index-grid/-card` (+r165d pulse refs in colleges.css if any remain — grep confirms none); training.css `.track-card` family (kept `.track-grid` — TeacherLabs/TeacherIntelligence/TeacherProfile still consume).
- **Dead but NOT mine to delete** (zero tsx consumers verified): student.css `.announcement-card/.announcement-head/.announcement-icon/.announcement-title/.announcement-meta/.announcement-meta-item/.announcement-pin/.announcement-body` (4A's sheet — CommunityPage was the only consumer); polish.css `.vision-card`/`.vision-grid`/`.vision-card-foot` blocks (polish never edited by rule; VisionPages no longer renders them).
- **Still alive (do not touch)**: `.event-meta/.event-actions/.event-rsvp-fail` (colleges.css) — consumed by community rows + CollegePages detail; `.comp-grid/.comp-card` (CollegePages detail); `.gallery-chip*`, `.gallery-clear`, `.gallery-skeleton*`; `.track-grid`, `.filter-pill*`, `.lesson-*`, `.badge-*`, `.leaderboard-*`.

## Sheet import lines that may conflict (for Agent Z)
- `main.tsx`: Agent S added `import './styles/patterns.css';` after layout.css (came via merge 552b866) — keep.
- `AiAssistantPage.tsx` now imports `../../styles/ai.css` (new page-scoped sheet, after aiReplyFormat import).
- `CommunityPages.tsx` keeps `import '../../styles/training.css';` — comment now says the shared track family; the import also trains `.filter-pill`… actually only kept for safety; Z may drop it if grep proves zero training.css classes consumed by community (cheap win).
- `components.css` §CP ROWS sits at EOF inside `@layer components` (before the layer close) — if Z appends, insert above the closing brace.

## Requests for tokens / primitives / patterns
1. A **real settings route decision**: «الإعدادات» (theme + notifications prefs + profile links) needs a new route row (App.tsx is coordinator-only). Backend supports themePreference push/pull today; notification prefs need a backend contract first — do NOT ship without it.
2. patterns `RowItem`: a `to?: string` prop (title-as-door anchor built-in) would delete my `.cp-row-link` wrappers; and a `className`-free mobile-wrap escape (my `:has(.cp-rsvp)` works but is a coupling to patterns internals).
3. patterns `PageHeader.tabs` renders as-is — fine; when 1B Tabs gains icon support, Community/Achievements hand-rolled tablists should migrate.

## Incomplete / honest notes
- Posts tab (community) kept the social `.post` anatomy — the RowItem title-row contract doesn't fit body-first content, and there is no replies endpoint to attach; converting it would be theater.
- Competition/College **detail** pages and track/lesson/achievements: kept (already list-first, hero + rows + tables); a lighter hero re-skin is possible later but not required by the direction and each byte counts against the 650 KB ceiling.
- The r197 ProgressBar comment leak was a user-visible defect on main (English dev text under every progress readout) — fixed in my primitives file; consider a cross-family heads-up since ProgressBar is consumed by 4A/4C/4D pages too (visual improvement only, no API change).
- `git stash@{0}` «4e css surgery backup» in this clone is my own mid-round safety stash of superseded css edits — droppable after Z's review.
