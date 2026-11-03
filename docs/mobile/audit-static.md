# R334 — Static Audit (mobile)

**Branch:** `r334/audit-static` · **Base:** `feat/mobile-r334-pro` @ `d610a62` · **Scope:** `apps/mobile/app/**` + `apps/mobile/src/**` (207 TS/TSX files, excluding `*.generated.*`)
**Type:** documentation-only worktree — no code changed, nothing pushed to the mission branch.

---

## 0 · Method notes (what ran, what failed)

- All findings from `rg`/grep sweeps + targeted reads of `apps/mobile/{app,src}`. Counts verified with precise import-form greps (e.g. `from "react-native-svg`), not substring matches — comment-only mentions (e.g. `Logo.test.tsx` reanimated/svg comments) are excluded from "importing file" counts where the file has no actual import/require call. Two exceptions noted inline (reanimated test `jest.mock`/`require` — counted, since they exercise the module).
- `npx --yes knip --version` → **6.44.1 installed and ran**, but both the default run and a `NODE_OPTIONS=--max-old-space-size=3072` retry **crashed** in `oxc-parser` (`RangeError: Array buffer allocation failed` — sandbox memory cap during workspace plugin scan). No config files were added (per mission rules). **Fallback: manual dep pass** — every `package.json` dependency grepped against `app/`, `src/`, `app.config.ts`, `jest.resolver.js`, `scripts/` (§8).
- Arabic typo spot-check was grep-pattern based (common hamza/taa-marbuta error patterns) + read-through of key screens; no full linguistic review — flagged as a limitation, not a clean bill.

---

## 1 · Adoption baseline — the 7 "before" numbers (KPI baseline)

| # | Library | Files importing | Production files | Paths |
|---|---------|----------------:|-----------------:|-------|
| 1 | `react-native-reanimated` | **2** | **0** | `src/test/setup.ts:119` (jest mock), `src/test/navigation-stability.test.tsx:220` (require smoke-check) — test-only |
| 2 | `@shopify/flash-list` | **1** | 1 | `src/features/notifications/NotificationsScreen.tsx:3,131` |
| 3 | `@gorhom/bottom-sheet` | **0** | 0 | — (dep installed `^5.2.14`, zero use) |
| 4 | `expo-haptics` | **2** | 2 | `src/components/shell/TabBar.tsx:2`, `src/components/ui/pressables.tsx:9` |
| 5 | `expo-image` | **1** | 1 | `app/student/social.tsx:4` |
| 6 | `react-native-keyboard-controller` | **4** | 3 | `app/_layout.tsx:14`, `src/features/messages/MessagesUI.tsx:16`, `src/components/ui/screen.tsx:13` (+ `src/test/setup.ts` test mock) |
| 7 | `react-native-svg` | **8** | 8 | `app/index.tsx:3`, `src/brand/Logo.tsx:20`, `src/brand/plan/{PlanExamHall,PlanLectureHall,PlanLibrary,PlanBuilding,primitives}.tsx`, `src/components/ui/brand.tsx:1` |

**Read:** the arsenal is installed but dormant. Reanimated rides the bundle (~420 kB mapped JS per `boot.tsx` header note) for **zero** production animation value. The one FlashList use (notifications) proves the migration pattern already exists in-repo.

---

## 2 · Animation anti-patterns

| Finding | Location | Severity |
|---|---|---|
| Core `Animated` JS-API used for all app motion — deliberate, documented exception (native driver, transform/opacity only, reduced-motion aware). **Not** a violation; recorded so Round-2 doesn't "fix" it blindly | `src/components/ui/boot.tsx:51-103,164-168,244-246` | P3 (note) |
| `Skeleton` animates via `Animated.View` + `usePulseStyle` — fine, but every list screen mounts 5-6 skeletons × Animated.Value loops during load; on JS-thread-heavy screens this competes with data hydration | `src/components/ui/states.tsx:20-40` | P2 |
| 1 Hz `setInterval` → `setSecondsLeft` re-renders the entire exam attempt screen (questions + timer) every second for the whole exam duration | `app/student/online-exams/[templateId].tsx:297` | P1 |
| 10 s playback-report ticker — side-effect only, no setState; acceptable | `app/student/lectures/[lectureId].tsx:249` | P3 (note) |
| `LayoutAnimation` usage: **0**. Animations on layout props (width/height/margin): **0** (verified — all animated props are transform/opacity). setState-per-frame: **0** | — | clean |

---

## 3 · List anti-patterns

**Headline:** FlatList usage = **0**. FlashList = **1**. Every other list in the app is `<Screen scroll>` (ScrollView) + `rows.map(...)`. **32 screens** render `rows.map(...)` inside a ScrollView (verified list: teacher/grades, teacher/attendance, teacher/curriculum, teacher/(tabs)/intelligence, teacher/labs, teacher/materials, competitions/index, colleges/leaderboard, student/{library,jobs,mooc,ar,skills,catalog,labs,materials,(tabs)/courses}, quality/alerts, quality/professors, quality/(tabs)/courses, admin/{courses,invites,(tabs)/dashboard,(tabs)/students,(tabs)/teachers}, community, search, owner/{institutions,alerts,activity}, …).

| Finding | Location (evidence) | Severity |
|---|---|---|
| ScrollView+map for paginated 20–30-row ledgers (`PAGE_LIMIT` 20/30) — all rows mount at once; no virtualization, no recycling. Threshold ~20 rows is met or exceeded on: admin students/teachers/courses, owner users (20), owner activity/feedback, governance FeedbackInbox (30) | `app/admin/(tabs)/students.tsx:29,101`, `app/admin/(tabs)/teachers.tsx:31,122`, `app/admin/courses.tsx:31,198`, `app/owner/(tabs)/users.tsx:25,149`, `app/owner/activity.tsx:22`, `app/owner/feedback.tsx:25`, `src/features/governance/FeedbackInbox.tsx:27` | **P0** (systemic) |
| Messages inbox: ScrollView + `conversations.map` with client-side correspondent grouping over the raw feed (`useMemo` sort + Map) — recomputed per keystroke of the reply field (state in same component) | `src/features/messages/MessagesUI.tsx:162-223, 71-95` | P1 |
| "تحميل المزيد" replaces the page (query keyed by `page`) instead of accumulating — pagination model is replace-not-append, so users can't grow past one page; a FlashList `onEndReached` + accumulation would fix both UX and perf | `src/features/messages/MessagesUI.tsx:213-220`, `src/features/notifications/NotificationsScreen.tsx:145-150` | P1 |
| Unbounded candidate lists (no PAGE_LIMIT visible): student catalog/library/jobs/mooc/skills, colleges/leaderboard, community, search — if backend rows grow, all mount at once | `app/student/catalog.tsx`, `app/student/library.tsx`, `app/student/jobs.tsx`, `app/colleges/leaderboard.tsx`, `app/community.tsx`, `app/search.tsx` | P1 |
| Missing `keyExtractor`: only relevant to FlashList/FlatList — the single FlashList **has** `keyExtractor` (`NotificationsScreen.tsx:133`); ScrollView maps use stable `key={x.id}` on data rows (verified sweep). Index keys (`key={i}`) appear only on static/decorative sub-lists | `app/teacher/exams.tsx:361`, `app/quality/(tabs)/engagement.tsx:101`, et al. | P3 (note) |
| Inline closures in `renderItem` + inline `ItemSeparatorComponent` on the notifications FlashList — re-created per render (React Compiler mitigates; still ratchetable) | `src/features/notifications/NotificationsScreen.tsx:134-137` | P2 |
| Row components are module-scope (`LedgerRow`, `NotificationRow`, `LedgerRow` in data.tsx) — good; unmemoized rows only where inline map bodies exist (covered by systemic finding) | `src/components/ui/data.tsx:162` | clean |

---

## 4 · Hard-coded colors / sizes

| Finding | Location | Severity |
|---|---|---|
| ESLint hex rule **exists** (`eslint.config.mjs:27-51`, R327 C1): `no-restricted-syntax` on 6-digit hex literals, scoped `app/**`+`src/**` minus design/brand/test. Hex violations in scope: **0 in app/**; all 8 hex literals live in `src/brand/**` (Logo fixed tones + test assertions) — rule-compliant | `src/brand/Logo.tsx:55-59` | clean (rule works) |
| **rgba() literals escape the hex rule** — 7 instances of black-only alpha (`rgba(0,0,0,0.04-0.45)`) that are invisible/undefined on dark backgrounds: progress-bar tracks, skeleton borders, attendance cells, modal backdrop | `src/components/ui/surfaces.tsx:275`, `src/components/ui/states.tsx:52`, `app/teacher/attendance.tsx:67,85,218`, `app/teacher/(tabs)/dashboard.tsx:422`, `app/teacher/exams/[templateId].tsx:502` | **P0** (dark-mode breakage + rule gap) |
| Magic spacing numbers: **116** raw `gap/padding/margin: NN` values ≥ 8 (and 273 total incl. <8) in `app/**` where `sp[NN]` tokens exist — concentrated in `app/quality/**`, `app/admin/**`, `app/owner/**` (e.g. `gap: 16, paddingTop: 16` opening pattern on nearly every quality screen) | `app/quality/exam-moderation.tsx:92`, `app/quality/alerts.tsx:56`, `app/admin/digital.tsx:67`, + 113 more | P2 (systemic, mechanical fix) |
| Magic font sizes: raw `fontSize: 15` etc. in inline field styles (type scale exists in `src/components/ui/text.tsx`) | `src/features/teacher/components.tsx:385`, `src/components/ui/fields.tsx:210`, `app/document/[filename].tsx:221` | P2 |

---

## 5 · Accessibility

| Finding | Location | Severity |
|---|---|---|
| Icon-only touchables: **all 6 `IconButton` usages carry Arabic labels**; TabBar tabs have `accessibilityRole="tab"` + labels + unread-count labels; buttons enforce 44px floor (`touchFloor` token) | `src/components/ui/pressables.tsx:96-124`, `src/components/shell/TabBar.tsx:51-93` | clean |
| 6 `Pressable`s without `accessibilityLabel` — all have Arabic text children (accessible name derives from children) or `hitSlop`+44px: acceptable, but text-as-label is implicit; 4 also lack `accessibilityLabel` where the visible text is the only name (works today) | `app/index.tsx:87`, `app/auth/index.tsx:138,141,184`, `app/auth/register.tsx:152`, `app/document/[filename].tsx:168` | P3 (note) |
| `OfflineBanner` — labeled, but see §8: dead code | `src/components/ui/states.tsx:176-199` | — |
| Touch targets < 44pt: none found in shared pressables; demo-account chips use `paddingVertical: 6` (~36pt effective) but dev-build-only | `app/auth/index.tsx:171-180` | P3 |
| `accessibilityRole` coverage on interactive rows is strong (`LedgerRow` sets button role + label; FlashList rows labeled) | `src/components/ui/data.tsx:180-197`, `NotificationsScreen.tsx:159` | clean |

---

## 6 · Strings

| Finding | Location | Severity |
|---|---|---|
| Raw `(e as Error).message` piped into user-facing `ErrorState`/toasts **systemically** (~30+ screens, teacher/admin/owner modules heaviest). Network-layer errors ARE normalized to Arabic (`src/api/client.ts:94-184`), but server-side `error.message` strings pass through untranslated — backend messages are English → Arabic users can see raw English failures | `app/teacher/grades.tsx:153,163,175`, `app/teacher/attendance.tsx:150,166,204`, `app/teacher/exams.tsx:75,85,150,180,257`, `app/admin/(tabs)/students.tsx` (same pattern), + ~25 more | **P0** (systemic) |
| Sync statuses/categories fall back to raw enum codes when not in the label map (`?? latest.status` → English enum leaks like `RUNNING`, `USERS`) | `app/admin/sync.tsx:125,158,166` | P1 |
| English leakage in fixed copy: near-zero. Legitimate English: `PDF`/`SVG`/`LIVE` mono badges, English-name field placeholders (`CS101`, `Tripoli Academy of Sciences` — correct for their fields), `[DEMO]` MonoLabel (dev/preview-gated via `SHOW_DEMO = __DEV__ || EXPO_PUBLIC_SHOW_TEST_ACCOUNTS`) | `app/admin/courses.tsx:301-313`, `app/owner/institutions.tsx:255-262`, `app/student/(tabs)/dashboard.tsx:259`, `app/auth/index.tsx:24,152` | P3 (note) |
| Technical/test strings: `probe` appears only in a privacy disclosure sentence (legal copy, correct context); no `lorem`, no console-style text rendered | `src/features/common/legalData.ts:186` | clean |
| Arabic typo spot-check: no hits on common error patterns (الرئيسيه/انشاء/إستخدام/الى المنصة…); key-screen copy read-through (dashboard, auth, states, messages) is high-quality MSA with correct hamza/taa-marbuta. **Limitation:** pattern-based only, no full review | — | clean (with caveat) |

---

## 7 · RTL mirroring

| Finding | Location | Severity |
|---|---|---|
| Physical-direction style props are near-eliminated: **0** `paddingLeft/Right`, `marginLeft/Right` in scope. `src/lib/rtl.ts` (`ensureRTL`) is the one-shot native-reload bootstrap, consumed only by `app/_layout.tsx` — correct single-purpose use | `src/lib/rtl.ts:20-46`, `app/_layout.tsx` | clean |
| Password-eye toggle absolutely positioned at physical `left: 0` over an RTL input — sits at the visual END side (works today since input text starts right), but physical prop + no `start/end` means it silently mirrors wrong if direction ever flips | `src/components/ui/fields.tsx:91` | P2 |
| `textAlign` hardcodes: 8× `"right"` (Arabic text areas + `writingDirection: "rtl"` — correct but brittle: should be `textAlign: "auto"`/I18n-driven) and 1× `"left"` on a numeric input (defensible — digits are LTR) | `app/document/[filename].tsx:221`, `app/student/online-exams/[templateId].tsx:574`, `src/features/feedback/ReportProblem.tsx:94`, `src/features/ai/Assistant.tsx:232`, `src/lib/updates.tsx:210-211`, `src/components/ErrorBoundary.tsx:89-91`, `src/components/ui/fields.tsx:55,210`, `src/components/ui/text.tsx:113` (mono, ok), `src/features/teacher/components.tsx:385` (numeric) | P2 |
| Absolute corner dots use physical left/right symmetrically (mirrored by design) — safe; toast overlay pins both edges — safe | `src/components/ui/brand.tsx:59-60`, `src/components/ui/toast.tsx:56-57` | clean |
| `row-reverse` misuse: **0** | — | clean |

---

## 8 · Dead code / unused dependencies

**knip:** installed (6.44.1) but **crashed** twice in `oxc-parser` (`ArrayBuffer allocation failed` — sandbox memory; not a config problem). Manual pass below (dep → grep across `app/`, `src/`, `app.config.ts`, `jest.resolver.js`, `scripts/`):

| Status | Dependency | Evidence / caveat |
|---|---|---|
| **Unused — 0 imports anywhere** | `@gorhom/bottom-sheet` | Mission-known: adopted 0; `Sheet` is a hand-rolled modal (`src/components/ui/surfaces.tsx:122`) |
| **Unused — 0 imports** | `react-hook-form` + `@hookform/resolvers` | All forms are hand-rolled `Field`/`useState` — both ride the bundle for nothing |
| **Unused — 0 imports** | `@react-native-community/netinfo` | Worse: `states.tsx:175` comment claims "real connectivity state via NetInfo" but the component takes a `visible` prop — and **`OfflineBanner` has 0 consumers** (dead component + lying comment) |
| **Unused — 0 imports** | `expo-crypto`, `expo-linking`, `expo-system-ui` | `expo-linking`/`expo-system-ui` may be transitive peers of expo-router/system bars — verify with `expo-doctor` before removing |
| **Unused — 0 direct imports (likely peers, do NOT remove blindly)** | `react-native-gesture-handler` (peer of bottom-sheet/screens), `react-native-webview`, `react-native-worklets` (reanimated peer), `react-dom` + `react-native-web` (needed by `dev:web`/`export --platform web` scripts), `expo-dev-client` (dev workflow) | P2 — needs a runtime/`expo-doctor` confirmation pass, not a grep verdict |
| **Test-only** | `react-native-reanimated` (2 test files), `react-native-keyboard-controller` (1 test file) | If R334 adopts reanimated for production motion, status flips — do not remove |

---

## 9 · Fix plan — Round-2 workstreams

| Category | Workstream | Owner-map (per docs/mobile/route-inventory.md sections) | Priority |
|---|---|---|---|
| **Lists (§3)** | `DataList` (FlashList wrapper) migration: start with the 7 paginated ledgers at PAGE_LIMIT ≥ 20 (admin students/teachers/courses, owner users/activity/feedback, governance inbox), then messages inbox (accumulate + `onEndReached`), then unbounded student/colleges screens. Reuse `NotificationsScreen` as the reference implementation | lists → DataList migration owner (per-screen: admin/*, owner/*, student/* route owners) | P0 |
| **Strings (§6)** | (a) Error-envelope pass: map `ApiError.code` → Arabic copy at the `ErrorState`/toast boundary instead of rendering `.message` (one helper, ~30 call sites); (b) complete `SYNC_STATUS_LABEL`/`SYNC_CATEGORY_LABEL` maps so raw enums never render | strings → per-screen owners; boundary helper → shell/ui owner | P0 |
| **Colors (§4)** | (a) Replace 7 `rgba(0,0,0,*)` literals with palette seats (needs dark variants — add `track`/`scrim` tokens); (b) extend the ESLint hex rule to also match `rgba(` literals so the gap can't regress | design-system owner | P0 |
| **Animation (§2)** | Exam countdown: isolate timer text into a leaf component (or reanimated UI-thread clock) so 1 Hz updates stop re-rendering the question tree | exams route owner | P1 |
| **Tokens (§4)** | Mechanical `gap/padding/margin: NN` → `sp[NN]` codemod for the 116 raw values (quality/admin/owner screens first — they share the `gap: 16, paddingTop: 16` opening pattern) | design-system owner + codemod | P2 |
| **RTL (§7)** | Swap physical `left: 0` → logical positioning on the password-eye seat; consider `textAlign` audit (8 hardcodes → `auto`/theme) | ui/fields owner | P2 |
| **Dead code (§8)** | Remove `react-hook-form`, `@hookform/resolvers`, `@react-native-community/netinfo` (+ delete `OfflineBanner` or actually wire it with NetInfo — pick one); run `npx expo-doctor` on the peer-suspects list before touching gesture-handler/webview/web/worklets | shell owner + LEAD sign-off (dep removals) | P2 |
| **Adoption (§1)** | These are the "before" KPIs: reanimated 0 prod / flash-list 1 / bottom-sheet 0 / haptics 2 / expo-image 1 / keyboard-controller 3 prod / svg 8. Round-2 adoption targets should be measured against this table | mission LEAD (KPI tracking) | — |

---

*Audit produced by task 1-c (A-Audit-Static), R334. Every finding carries file:line evidence; severity: P0 = user-visible breakage or systemic perf/correctness debt, P1 = significant quality/perf debt, P2 = hygiene/drift, P3 = informational.*
