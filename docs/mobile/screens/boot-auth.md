# R334 3-b — Boot & Auth screens (Round 2)

**Status:** implemented on `r334/r2-boot` · files: `app/index.tsx`, `app/auth/index.tsx`, `app/auth/login.tsx`, `app/auth/register.tsx`, `app/auth/forgot-password.tsx`, `app/auth/reset-password.tsx`, `src/components/ui/boot.tsx` (+ `boot.test.ts`), `src/lib/biometric.tsx`.
**Verification honesty:** `npm run typecheck` exit 0 **[typecheck-verified]** · `npx jest --no-cache --runInBand src/test/render-net.test.tsx src/test/role-session.test.tsx src/components/ui/boot.test.ts` → 113 + 46 + 6 green **[jest-verified]** · `npm run lint` 0 errors (2 pre-existing warnings in untouched `src/brand/plan/*`) **[lint-clean]**. **Not** device- or emulator-verified (no KVM in this sandbox) — keyboard-riding, splash cross-fade frame fidelity, and haptic feel need an EAS preview build.

## What changed (the decisions)

### `/` is now the Boot screen — the splash IS the first frame
- The native splash (icon `imageWidth: 120`, centred, paper ground — `app.config.ts`) cross-fades into `<Boot>` at the **same geometry**: `BootMark` renders the canonical mark at size 120, centred. The mark **is** the loader (squares converging in counter-phase) — one logo, at most one loader, never a second brand mark or generic spinner.
- Two honest Arabic labels: hydrating guest → «نستعد لتحميل مدارك…»; cached session → «جارٍ الدخول…». After 6s `Boot`'s slow state tells the truth about the sleeping Render free tier: «الخادم يستيقظ… قد يستغرق لحظات ثم يبدأ العمل.» (+ optional retry — `/` doesn't offer one; the `/auth/me` refresh resolves or the user cold-starts again).
- The handoff rule is **one pure function**, `resolveEntryDestination(user, continueParam, roleHome)` in `boot.tsx`, shared by cold start and fresh login, pinned by `boot.test.ts` (role homes, unknown→student, `?continue=` honored only with an institution context or OWNER, gate for context-less roles, ADMIN exemption, blank param ignored). No duplicated routing logic anywhere.
- A cached session routes **immediately** to its role home — the `/auth/me` refresh (60s stale window) rides along in the background; no dead wait on a cold server.
- Update/min-version states never render here by construction: below the server floor the root layout's `BlockingUpdateGate` replaces the navigator entirely (`_layout.tsx` — untouched).

### `/auth` is the Welcome — the signature moment
- The drafted facade **draws itself in** via the existing plan library (`PlanBuilding autoplay` — strokeDash reveal, ~900ms Heron ease-out, reduce-motion jumps to the finished drawing). Decisive Arabic display type («رحلة تعلم واحدة» / «من المحاضرة إلى الإتقان») over a faint drafting grid.
- **ONE orange CTA** («ابدأ الآن» → `/auth/login`) + **ONE quiet text link** («إنشاء حساب جديد» → `/auth/register`). No boxed cards; the paper is the design.
- Staggered entrance from `@/motion`: `useStaggerEntrance({ base: 120, step: 90 })` over 4 blocks (390ms total — under the 400ms rhythm cap). Reduced-motion lands instantly (hook-level gate; no layout properties animate).
- `?continue=` rides every action for post-auth return.

### Login/register/forgot/reset — the form foundation's first route-level adopters
- `FormScreen` (KeyboardAwareScrollView + `KeyboardToolbar` «السابق/التالي/تم» + return-key chaining + sticky primary action riding above the keyboard) wraps all four screens; `AppStatusBar` sits above each.
- `useFormValidation` Arabic inline errors on login (`identifier`/`password` zod schema), forgot (`ar.email()`), reset (`ar.password(12,72)` + confirm). **Register keeps its local per-field Arabic validation** — its step 2 is `SelectField`-driven with an invite-code interplay that doesn't fit the per-field zod adapter; documented compromise, same inline error seat.
- Secure toggle («إظهار»/«إخفاء») via `SecretField`; `purpose` maps `textContentType`/autoFill (username/password/newPassword/email/name).
- **Every** failure goes through `humanizeError` (`src/lib/errors`) — never raw `e.message`. Reset-password additionally swaps the generic bucket for its own honest sentence (expired/used link). Field errors = validation only; API refusals get the form-level summary under the button (R2 B4 honesty contract: a 429 lockout is a lockout).
- `haptics.notify("success" | "error")` on every submit outcome; `haptics.selection()` on register's role pick and as the biometric prompt appears. One orange accent per screen: the primary action (`submitKind="accent"`).
- Flows preserved: demo accounts (dev/preview builds only), invite-code check, institution select handoff (`/select-institution`), role routing (`ROLE_HOME`), `/auth/login` deep links (`madarek://auth/login` — previously an alias, now the real form).

### Biometric gate
- Arabic copy end-to-end; a clear cancel path: after a cancelled prompt the gate says «لم تُفتح بعد — اضغط «فتح القفل» للمحاولة مرة أخرى.» plus «تعمل البصمة أو رمز قفل الجهاز — لن تُحبس خارج حسابك أبدًا.» (device-PIN fallback is always offered).

### Test-infra note (disclosed exception)
`src/test/setup.ts`'s `react-native-keyboard-controller` stub predates FormScreen's full API — as route-level consumers landed, the render net crashed with "Element type is invalid" (no `KeyboardAwareScrollView`/`KeyboardStickyView`; a toolbar without `Prev/Next/Done` statics). The stub was extended to the full pass-through set mirroring `form.test.tsx`'s per-suite mock. Test infra only; no app code.

## Six-states checklist (boot + auth surfaces)

| State | Behavior |
|---|---|
| **Skeleton** | Boot/handoff: `BootMark` pulse IS the skeleton (never a spinner); role homes keep their own skeletons (untouched). |
| **Empty** | Welcome is content-complete by design; forgot/reset always-200 flows render their mint success note; no empty dead-ends. |
| **Error** | Form-level Arabic summary (alert role) via `humanizeError` — validation inline per field, API refusals under the action; boot slow-label covers the waking server; `?continue=` dropped when un-honorable. |
| **Offline** | Network failure → `humanizeError` maps to honest Arabic («تعذّر الاتصال…» class); no raw transport text; boot's 6s slow state + the `/auth/me` background refresh keep the handoff alive. |
| **Long text** | Dev-inbox reset link renders `monoSm` in its own row; all summaries wrap (`flex: 1`) with 320px max width on boot labels; display type has explicit line-height. |
| **Large font** | Boot label + form fields scale with the system font; `FormScreen`'s KeyboardAwareScrollView keeps fields visible; action rows are minHeight ≥44. |
| **RTL** | Arabic-first throughout; text alignment/`I18nManager` handled by the design system; `useStaggerEntrance` builders are RTL-aware; toolbar order «السابق/التالي/تم» reads correctly. |
| **Dark** | Boot/Welcome/biometric read the palette (`p.bg` paper/ink both appearances); splash has a dark background variant (`app.config.ts`); toolbar theme is dual-appearance. |
| **Tablet** | BootMark fixed 120 (splash parity) with centered column; Welcome grid + 78% facade scales; forms are single-column with 24px gutters — no fixed widths beyond tokens. |

## Ownership & follow-ups
- `_layout.tsx`, `updates.tsx`, `_layout`-level gates: **untouched** (read-only).
- TODO (owner, on device): EAS preview — splash cross-fade frame check, keyboard riding, haptics, Face ID prompt copy.
- TODO (lead): `states.tsx` `LoadingScreen` could re-export `Boot`'s mark for one loader vocabulary app-wide; RoleGate's unauthenticated redirect now lands on the Welcome (one tap to login) — confirm intent.
