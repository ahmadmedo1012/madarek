# Mobile Screens — المساعد الأكاديمي (AI chat, R334 3-f Round 2, branch `r334/r2-assistant`)

Owner: agent 3-f (A-Assistant). Scope: the full AI chat surface —
`apps/mobile/src/features/ai/*` (Assistant/Markdown/stream/logic/clipboard + the
two unit nets) and the three route wrappers `app/student/(tabs)/ai.tsx`,
`app/teacher/ai.tsx`, `app/owner/ai.tsx`. Everything below is
**typecheck-verified + jest-verified only** — no emulator/device in this sandbox,
so on-device runtime behavior (real XHR incremental reads, real haptics, sheet
snap) is `unverified` by the mission's honesty rule.

## Adoption counts (what the screen reuses vs. owns)

| Adopted | Where |
|---|---|
| `Markdown` (shared `ui/markdown`) | prose inside replies — already RTL-safe (logical `paddingStart`/`borderStartWidth`); NOT edited (no LEAD-REQUEST needed) |
| `AppSheet` / `ActionSheet` / `ConfirmSheet` | history ledger, per-message copy/share, delete/clear confirms — lazy-mounted on first open |
| `DataList` | conversation history rows (tri-state + pull-refresh for free) |
| `KeyboardToolbar` / `KeyboardAvoidingView` | keyboard-controller: «تم» dismiss on the single field («التالي» is only for multi-field forms — `ui/form.tsx` convention) |
| `PressableScale`, `Skeleton`, `useEntrance`, `useStaggerEntrance`, `slideInFromEnd` | chips, typing shimmer, bubble entrances |
| `haptics` (`selection`/`impact:light|medium`/`notify:success|warning|error`) | send/stop/chips/retry/delete |
| `humanizeError` (`src/lib/errors`, R334 Round 1) | every failure path, incl. stream failures |
| `toast` | «تم النسخ», open-history errors |

Owned new (feature-local, dependency-free): `logic.ts` (turn state machine +
suggestion pool + quota/citation model — 17-test net), `stream.ts` (SSE parser +
XHR transport — 11-test net), `Markdown.tsx` (code-fence splitter + LTR code
islands + citation chips), `clipboard.ts` (copy without a new dep).

## Streaming approach (no new dependency)

The backend serves `POST /ai/chat` in two grammars (`ai.routes.ts`, r323 B1.1):
JSON envelope, and `?stream=1` + `Accept: text/event-stream` → typed SSE frames
(`token`/`done`/`error`). RN's `fetch` has no `ReadableStream` body, but RN's
**XMLHttpRequest emits incremental `responseText`** — the same primitive
`react-native-sse` wraps. `stream.ts` mirrors the web client's contract
(`frontend/src/lib/ai-stream.ts`) over XHR:

- pure incremental parser (`createAiSseParser`) — chunk boundaries mean nothing;
  CRLF/`\r\r`/`\n\n` terminators, keep-alive comments, malformed frames skipped
  (never rendered as content); `end()` flushes a trailing frame;
- the `done` frame's reply **replaces** the accumulated buffer (a transport drop
  can never truncate the on-screen answer), and carries `conversationId`,
  `messageId`, engine/model, citations, quota;
- stop button → `AbortController` → XHR abort → `AbortError`-shaped rejection;
  the kept partial text is labeled «أُوقف الردّ — لم يُحفظ في السجلّ» (the server
  persists nothing for an aborted turn — honest);
- mid-stream `error` frame → its own Arabic message + code; a stream that ends
  without `done` → `STREAM_TRUNCATED`, never a truncated buffer dressed as a
  reply; a JSON-envelope reply is accepted (proxy rewrote the query) **only if
  zero tokens streamed**;
- 45s no-data stall ceiling, refreshed on every read;
- `canStreamAi()` capability probe: no XHR (jest's node env, old web) → the JSON
  grammar (`aiApi.chat`) takes over with the same typing shimmer — no streaming
  pretense. The parser net pins the wire grammar; the XHR transport itself is
  device-only verification (honesty label above).

Tokens render into an **inverted FlatList** turn buffer — newest at the visual
bottom by construction, zero `scrollTo` calls, rows recycle on long chats.

## Decisions

1. **No attach button** — `src/api/ai.ts` has no attachment endpoint; a dead
   button would violate the no-dead-buttons rule. Composer = input + send/stop.
2. **Owner `ai.tsx` is not a chat** — web parity: `/student/ai` + `/teacher/ai`
   are the chat pages; the owner page is the AI metrics/features dashboard. The
   wrapper keeps its existing shape (this round it adopted `humanizeError`).
   `AssistantRole = "student" | "teacher"` only.
3. **Clipboard via typed `require("react-native").Clipboard`** — deprecated but
   present in RN 0.88's runtime, absent from its public types; no new dep
   allowed (expo-clipboard). Fallback: system share sheet, with a toast that
   says what actually happened.
4. **Citations render only when `done`** — chips under the reply;
   `http(s)`-URL chips are links (expo-web-browser), others are informational
   Views — no dead links.
5. **Retry drops the failed bubble AND its question, then re-sends** — the
   transcript never shows a duplicated prompt; the retry target is the LAST
   error (a stopped turn is not a failure).
6. **The provider badge stays verbatim** — «مزوّد: …» + the local-provider
   disclosure line (template composer honesty).
7. **No floating overlays** — no FAB/bubble anywhere on the surface.

## The six states checklist

| State | Behavior |
|---|---|
| **Empty** | role-aware welcome («اسأل عن مقرّرك» / «مساعدك في التدريس») + 4 suggestion chips (PressableScale + `haptics.selection`), entrance stagger 80ms + 60ms/child, deterministic rotation per conversation (`pickSuggestions` offset) |
| **Loading** | config → badge simply absent until resolved; history sheet → `DataList` skeletons; no full-screen blocking state |
| **Ready** | transcript + composer; send enabled only when text ≠ ∅ and nothing is streaming; long-press a bubble → copy/share sheet; done assistant turns get 👍/👎 + model mono label |
| **Streaming** | tokens append live; zero tokens → typing shimmer (`Skeleton`, reduced-motion gated, UI thread); ≥1 token → text + trailing shimmer + «يكتب…»; send button becomes stop («إيقاف الردّ», `impact:medium`) |
| **Stopped** | partial text kept + «أُوقف الردّ — لم يُحفظ في السجلّ» honest label; composer re-enabled; not a retry target |
| **Error** | failed bubble shows `humanizeError` Arabic copy + «إعادة المحاولة» (`haptics.notify("error")` fired at failure); quota (429 / backend marker) additionally flips the «وصلت حدّ الأسئلة اليومي» card above the composer (`notify:warning`) |

## Wrappers

- `app/student/(tabs)/ai.tsx` — `<Assistant role="student" />` (tab seat).
- `app/teacher/ai.tsx` — `<Assistant role="teacher" stacked onBack={router.back} />` (pushed over the tabs shell, owns its bottom inset).
- `app/owner/ai.tsx` — metrics dashboard (not a chat), `humanizeError` adoption.

## Verification labels

- `npm run typecheck` → **0 errors**.
- `npx jest --no-cache --runInBand src/test/render-net.test.tsx src/features/ai` → **142/142 green** (render-net over all routes incl. the three ai routes, `logic.test.ts` ×17, `stream.test.ts` ×11).
- `npm run lint` → **0 errors**; the only 2 warnings are pre-existing in `src/brand/plan/usePlanDraw.ts` (not this scope). No new warnings introduced.
- Device/emulator: **none in sandbox** — on-device streaming, haptics, and sheet snap are `unverified` (honesty rule).
