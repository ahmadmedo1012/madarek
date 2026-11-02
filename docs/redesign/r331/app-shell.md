# R331 — App shell: the navigation restructure (A-App-Shell)

Date: 2026-11-02 · Branch: `wt/shell` (base `main@2faeeae8`)
Agent: **A-App-Shell** (task 4-b-resume — a previous run died mid-task with
substantial uncommitted work; this run reviewed, completed, verified and
committed it in 8 small steps). Scope: `apps/mobile/**` + this report.
**Nothing was pushed.**

## 1 — The defect and the fix

Every role screen wrapped itself in a per-screen `RoleTabFrame` (bar +
screen) over a plain `Stack`: the bottom bar **re-mounted and slid with
every screen transition**, losing the "the bar is furniture" feel, and the
pilot's floating feedback FAB sat over content on every screen.

The fix — a real navigator architecture, one per role:

```
app/_layout.tsx                      Root Stack (unchanged children)
└── app/<role>/_layout.tsx           RoleGate + ONE Stack; (tabs) declared first
    ├── app/<role>/(tabs)/_layout.tsx    expo-router Tabs — bar rendered ONCE
    │   ├── tabBar={(props) => <RoleTabBar {...props} role={ROLE} />}
    │   └── <Tabs.Screen> per ROLE_TABS entry (lazy, animation:"none")
    │       app/<role>/(tabs)/dashboard|courses|…|profile.tsx   ← moved verbatim
    └── app/<role>/<detail>.tsx / <dir>/…    pushed OVER the bar; back → living tab
```

- **The bar renders once** via the `tabBar` prop of the `(tabs)` layout —
  outside every screen. A tab switch only changes `state.index`; the bar
  instance (and every mounted tab screen below it) persists — scroll
  positions and query state survive, `lazy: true` mounts on first focus,
  `detachInactiveScreens` detaches unfocused tabs without dropping state.
- **URLs are unchanged**: the `(tabs)` group contributes no path segment —
  `/student/dashboard`, `madarek://student/dashboard`, deep links and the
  A2 role-session net all resolve exactly as before.
- **SDK-58 contract used as-is**: `BottomTabBarProps` = `{ state,
  navigateToTab(routeKey), insets }` (expo-router 58 / standard-navigation)
  — `RoleTabBar` mirrors it structurally so it stays unit-testable with the
  router mocked away.
- **Visual parity kept deliberately** (Heron discipline): paper surface,
  hairline top rule, ink icons, orange 2dp active underline, orange unread
  badge on the inbox tab, light haptics on switch, focused-tab press is a
  no-op. `ROLE_TABS` (`src/components/shell/roleTabs.ts`) is the single
  source of truth for names/paths/labels/icons/badge-flag; the bar chrome
  is `src/components/shell/TabBar.tsx`.

Per-role tab sets (web BottomNav parity):

| Role | Tabs |
|---|---|
| STUDENT | الرئيسية · مقرراتي · المساعد · الإشعارات (badge) · حسابي |
| TEACHER | اللوحة · الجدول · الطلاب · التحليلات · حسابي — `/teacher/ai` + `/teacher/alerts` are NOT tabs: they push over the shell (`stacked`/`onBack` props on `Assistant`/`NotificationsScreen`) |
| ADMIN | اللوحة · الكلّيات · الطلاب · الأساتذة · التقارير |
| QUALITY | اللوحة · المقررات · المناهج · التفاعل · التقارير |
| OWNER | اللوحة · المستخدمون · الحيّ · الإشعارات (badge) · الحوكمة |

The old architecture's stated reason to exist ("nested route groups are
unreliable in the web exporter" — TabFrame docblock) is **obsolete on
SDK 58**: the web export below is green WITH the groups.

## 2 — No floating clutter

- `FeedbackSheetHost` (52dp FAB rendered by the ROOT layout over every
  screen) **deleted**. `app/_layout.tsx` renders nothing over content.
- The report loop survives as a first-class route: **`/report`**
  (`app/(modals)/report.tsx` + `ReportProblemForm` → existing
  `POST /feedback`, kind BUG|IDEA, note, route auto-attached, role).
  Entries: student & teacher Profile menus («الإبلاغ عن مشكلة») + a
  settings card (admin/quality/owner reach it there). Mobile never had
  screenshot/console-tape capture — still disclosed in-form.

## 3 — Deps + versions (B0)

| Package | Version | Note |
|---|---|---|
| react-native-reanimated | **4.7.1** | foundation for A-App-Motion; **no consumer yet** |
| react-native-worklets | **0.13.0** | babel-preset-expo **auto-applies** `react-native-worklets/plugin` when installed (verified: `babel-preset-expo/build/configs/expo.js:104`) — no babel.config.js needed |
| react-native-keyboard-controller | **1.22.7** | available for composer/sheet polish |
| @gorhom/bottom-sheet | **5.2.14** | peer accepts reanimated ≥4 |

Jest: `jest.resolver.js` (reanimated 4 resolver → @react-native/jest-preset
fallback) wired into `jest.config.js` (transformIgnorePatterns + `@gorhom/.*`),
official reanimated/worklets mocks re-added in `src/test/setup.ts`.

## 4 — Arabic copy fixes

- **«الحواكمة» → «الحوكمة»** — the OWNER governance tab label (typo;
  web BottomNav parity). Fixed in `ROLE_TABS` (single source of truth) +
  pinned by a test (`ROLE_TABS` JSON must not contain the typo).
- Full shell-copy audit (roleTabs, TabBar, /report, ReportProblem,
  settings card, profile menus, Assistant/Notifications headers, all
  moved screen titles): **no other misspellings found**. Verified
  «مؤشرات الحوكمة» in the governance screen body was already correct.

## 5 — Verification (all green)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **0 errors** |
| `npx jest` (full) | **762/762**, 5 suites, ~12s (exit 0; one cosmetic worker-teardown warning — see §7) |
| `npx expo lint` | **0 errors**, 2 warnings, both pre-existing in untouched files (`src/brand/plan/*` — the rAF engine A-App-Motion replaces) |
| `npx expo export --platform web` | **green** — 126 chunks, 3.3MB JS, single-output; all 15 role-tab URL strings present in the bundle (route tree resolves them); `/report` chunk emitted |
| Deep links | group adds no segment — `madarek://student/dashboard` & friends resolve as before (scheme `madarek`, app.config.ts) |
| Intermediate commits | C2a (first role) verified green in isolation via stash: tsc 0 + 726/726; the remaining per-role commits repeat the identical mechanical pattern |
| Prior agent's breakage fixed | `role-session.test.tsx` still required the old flat module paths (32 failures) → re-pointed to `(tabs)/dashboard`; `navigation-stability.test.tsx` leaked an act() scope (unawaited RNTL v14 `unmount()` after a press → next test rendered an empty tree) → all `render/fireEvent/unmount/rerender` awaited |

Navigation-stability net (`src/test/navigation-stability.test.tsx`, 30
tests): FS shape per role ((tabs)/_layout drives a Tabs + RoleTabBar,
every ROLE_TABS entry has its file in the group, NO stale copy at the old
flat path, role Stack declares (tabs) first); no file under app/ imports
TabFrame or FeedbackFab; the bar renders one tablist with five Arabic
labels + badge, `navigateToTab` called exactly once per press, focused
press is a no-op, identity survives index changes; reanimated + worklets
import cleanly under jest.

## 6 — Safe areas / edge-to-edge

- The bar pads `max(insets.bottom, 6)`; `Screen` (used by every tab
  screen) pads `insets.top`/`insets.bottom` — no clipped screens.
- Pushed `Assistant` / `NotificationsScreen` now pad the status-bar inset
  at the header (the old per-screen frame never did — top-edge clipping)
  and, when `stacked`, own the home-indicator inset below composer/list.
- Known cosmetic leftover (pre-existing, kept for parity): tab screens
  double-pad the bottom inset (Screen's `paddingBottom` + the bar's) —
  content sits slightly higher than strictly needed. Safe for A-App-Motion
  to tune when polishing transitions.

## 7 — Handoff notes for A-App-Motion

1. **rAF engine replacement TODO**: the three loader loops still ride RN's
   built-in Animated + the `usePlanDraw` rAF engine
   (`src/brand/plan/usePlanDraw.ts` — carries the pre-existing
   `set-state-in-effect` lint warning at :55). Migrate to reanimated 4
   worklets; the deps, jest resolver and mocks are already in place, so
   motion components resolve under jest immediately (pinned by the
   navigation-stability suite).
2. **reactCompiler is ON** (`app.config.ts` experiments). The r327 M1.3
   crash suspect was *reanimated × compiler* — reanimated left the tree
   then. It is back as deps-only (no consumer → no transformed app code
   yet). **Re-validate the interaction on a device/simulator the moment a
   real motion component lands**; the documented rollback is that one
   flag.
3. **Bottom-sheet + keyboard-controller are installed but unused** —
   natural substrate for the report form as a sheet, the assistant
   composer keyboard avoidance, and tab-transition polish.
4. **Tab transition polish**: `(tabs)` layouts use `animation: "none"`
   (instant switch — the stable, non-sliding contract). Bottom-tabs
   offers `fade`/`shift` scene animations if motion wants them; keep the
   bar OUT of any animation (it must stay furniture).
5. **Jest quirks to keep in mind**: RNTL v14 — every
   `render/fireEvent/unmount/rerender` call must be awaited (unawaited
   calls leak act scopes and poison the next test with an empty render).
   Full-suite runs print one cosmetic worker-teardown warning (worklets
   mock leaves a handle); warning-only, exit 0 — worth silencing properly
   (e.g. `--forceExit` is NOT acceptable; find the handle) when touching
   the jest setup.
6. **Route paths are frozen** by the navigation-stability net — any new
   tab or route move must update `ROLE_TABS` + the group together.

## 8 — Commits (base 2faeeae8 → HEAD, not pushed)

| sha | one-liner |
|---|---|
| 70c562b4 | feat(r331-app): motion deps + jest resolver chain (A-App-Shell foundation) |
| 7513ab8a | refactor(r331-app): /student — the persistent (tabs) shell (bar renders ONCE) |
| 424e76f5 | refactor(r331-app): /teacher — persistent (tabs) shell; ai/alerts become pushed routes |
| 80c27497 | refactor(r331-app): /admin — persistent (tabs) shell (لوحة · كلّيات · طلاب · أساتذة · تقارير) |
| b89d8f1b | refactor(r331-app): /quality — persistent (tabs) shell (لوحة · مقررات · مناهج · تفاعل · تقارير) |
| 50b12122 | refactor(r331-app): /owner — persistent (tabs) shell + «الحواكمة» → «الحوكمة» |
| 176ff77e | test(r331-app): navigation-stability net; TabFrame (the per-screen bar) deleted |
| 929420c1 | refactor(r331-app): the floating feedback FAB is gone — «الإبلاغ عن مشكلة» becomes a route |

Net (rename-aware): **57 files, +1,036 / −689** — TabFrame/FeedbackFab
and 24 per-screen wrappers deleted, 25 tab screens moved into the groups
(git records them as renames), shell components + report route + tests
added. Every commit compiles and passes its suite (C2a verified in
isolation; the rest repeat the pattern).

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
