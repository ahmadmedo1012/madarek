# Long-tail screens — public/root & community (R334 Round 2.5, task 4-b)

**Branch:** `r334/r3-sweep-pub` (worktree `/home/z/wt-sweep-pub`, base `feat/mobile-r334-pro` @ `595bde4`).
**Scope (ownership):** `app/{campus,community,about,help,contact}.tsx`, `app/colleges/**`, `app/competitions/**`, `app/training/**`, `app/legal/[doc].tsx`, `app/vision/**`, `app/+not-found.tsx`, `src/features/common/**`.
**Posture:** light-touch L2 sweep (the per-file checklist: errors → humanizeError · Arabic labels · six states · DataList for >20-row lists · token colors · RTL/a11y · expo-image · cheap motion/haptics). No redesigns; structural notes are TODOs.

**Verification labels (honesty):** `npm run typecheck` → **0 errors** · `npx jest --no-cache --runInBand src/test/render-net.test.tsx` → **113/113 green** · `npm run lint` → **0 errors, 18 warnings (all pre-existing, none in owned files; one new warning introduced mid-sweep was fixed before commit)**. No emulator/device in this sandbox (`/dev/kvm` absent) — scroll physics/recycling, expo-image fade frames, and haptic feel are **device-UNVERIFIED** (EAS preview is the owner's channel).

---

## Per-file status

| File | Status | What changed / verdict |
|---|---|---|
| `src/features/common/components.tsx` | **L2 ✅ (fixed)** | `apiMessage` now routes through `humanizeError` (Arabic passes verbatim, English/library fragments → Arabic map, caller `fallback` wins over the generic). This is the error boundary for ALL 10 common-surface consumers — the audit §6 raw-`e.message` class is dead here. No other exports touched. |
| `app/community.tsx` | **L2 ✅ (the big one)** | Posts feed (unbounded, the flagged one) → **DataList** (FlashList v2) as the tab's scroller: recycling, **pull-to-refresh**, skeleton/empty/error via slots (`SignInPrompt` for guests stays). Tab strip + compose door pinned above the list so navigation survives first-load states. `PostCard` is a module-scope `makeRow` with a `useCallback`-stable `onReact`. Raw `(error as ApiError).message` in publish/create sheets → `apiMessage`. Haptics: tab switch + RSVP (selection), publish/room-create/join (notify success). Announcements/events/rooms stay short ledgers on `Screen scroll` — **TODO(virtualize)** only if those feeds grow past ~20 rows. |
| ~~`app/campus.tsx`~~ | **RETIRED (master/D3)** — the university showcase screen is deleted from the product (the whole card system + the web gallery went with it). |
| `app/competitions/index.tsx` | **L2 ✅ (verify-only)** | Already had the full triad + `SignInPrompt` + Arabic labels; inherits the humanized `apiMessage` via the shared fix. No edit needed. |
| `app/competitions/[id].tsx` | **L2 ✅ (fixed)** | Raw `(enter.error as ApiError).message` in the entry sheet → `apiMessage` (Arabic-only); entry success → `haptics.notify("success")`. Triad + honest deep-link guards already present. |
| `app/training/index.tsx` | **L2 ✅ (verify-only)** | Full triad + category/level Arabic label maps; inherits humanized errors. Rows are bounded catalog rows — RowList is correct. |
| `app/training/[slug].tsx` | **L2 ✅ (verify-only)** | Full triad + honest enroll→jump flow; inherits humanized errors. |
| `app/training/[slug]/lesson/[lessonId].tsx` | **L2 ✅ (fixed)** | Lesson completion → `haptics.notify("success")` (the round's "moment" wiring); errors already via `apiMessage` (now Arabic-guaranteed). |
| `app/colleges/index.tsx`, `[id].tsx`, `leaderboard.tsx` | **L2 ✅ (verify-only)** | All three already carry skeleton/error/empty + honest guest-zeros rulings + Arabic a11y labels; inherit humanized `apiMessage`. Registry/leaderboard are bounded demo-registry lists — RowList stays. **TODO(virtualize)** if the registry ever exceeds ~20 rows. |
| `app/legal/[doc].tsx` | **L2 ✅ (verify-only)** | Static verbatim policy sheets by design (no data states needed); unknown-doc guard is honest. Untouched. |
| `app/about.tsx`, `app/contact.tsx` | **L2 ✅ (verify-only)** | Static identity/contact ports, honest single-channel copy; no data → no states. Untouched. |
| `app/help.tsx` | **L2 ✅ (fixed)** | FAQ accordion rows now tick `haptics.selection()` on expand/collapse (was motionless/feedbackless). |
| `app/vision/index.tsx` | **L2 ✅ (verify-only)** | Static gallery with honest framing; no data → no states. Untouched. |
| `app/vision/[slug].tsx` | **L2 ✅ (fixed)** | Prev/next arrows were hard-wired to RTL (ArrowLeft=next): now **direction-aware** (`I18nManager.isRTL`) — no silent mirror-wrong if layout direction flips. Honest «قريبًا» notification card kept verbatim. |
| `app/+not-found.tsx` | **L2 ✅ (verify-only)** | Honest two-exit treatment with BrandMark — acceptable per inventory; untouched. |
| `src/features/common/{helpData,legalData,visionData}.ts` | **L2 ✅ (verify-only)** | Read-through: Arabic MSA copy with correct hamza/taa-marbuta, no English leakage, no lorem/technical strings (the `probe` hit in legalData is a privacy-disclosure sentence — correct context). Untouched. |

## Cross-cutting findings

- **rgba literals:** 0 in owned files (grep-verified) — nothing to tokenize.
- **English leakage:** 0 user-facing; the only Latin strings are legitimate (license names, `PDF`-class mono badges, English course-name fields).
- **offline state:** data screens surface the transport's Arabic offline copy through `ErrorState`; no cached-data-offline split (OfflineState) is wired in this sweep — **TODO(lead)** alongside the Round-2 persistence adoption (resilience.md §adoption).
- **Honesty labels:** no emulator — pixel/scroll/haptics claims above are type- and render-verified only.

## Commits (this branch)

1. `02fd148` — fix(mobile-r334): community feed virtualized (DataList) + Arabic-only error boundary in common components
2. `8b97933` — fix(mobile-r334): campus real Commons imagery (expo-image) + long-tail L2 touches
3. `f61b0f8` — fix(mobile-r334): pin community tab strip above the virtualized feed; drop unused palette in vision arrows
