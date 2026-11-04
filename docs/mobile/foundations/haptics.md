# R334 2-b — Haptics Foundation (`apps/mobile/src/haptics.ts`)

One gated door to the vibration engine. Call sites never import
`expo-haptics` directly — the module owns the three policies every call
site must not re-decide: **enabled gate · anti-spam throttle · platform
honesty**.

- Owner: task 2-b (branch `r334/haptics`) · Merged by the LEAD into `feat/mobile-r334-pro`
- Module: `apps/mobile/src/haptics.ts` · Unit net: `apps/mobile/src/haptics.test.ts` (24/24)
- Deps: none new — `expo-haptics` 58.0.7 + `@react-native-async-storage/async-storage` 2.2.0 (both already installed)

---

## 1. API surface

```ts
import { haptics } from "@/haptics";

haptics.selection();                    // tab / segment / filter change — the quiet tick
haptics.impact("light" | "medium" | "heavy");
haptics.notify("success" | "warning" | "error");

haptics.setEnabled(false);              // kill-switch (sync; persists in background)
haptics.isEnabled();                    // cached gate state
await haptics.hydrate();                // optional: await the persisted preference at startup
```

All feedback methods are **fire-and-forget `void`** — engine rejections
(`UnavailabilityError`, missing module, engine off) are swallowed; feedback
can never crash a flow. `__hapticsInternals` (same file) is test-only: an
injectable clock + platform and a `reset()` — it exists so the unit net
needs no fake timers or `Platform` mutation.

## 2. The three policies

### 2a. Enabled gate (persisted)
- **Storage:** AsyncStorage key `mdrk-mobile-haptics-enabled`, value `"1"`/`"0"` — the non-secret `mdrk-mobile-*` family (`auth/session.ts` precedent; SecureStore stays secrets-only per `lib/tokenStorage.ts` / `lib/biometric.tsx`).
- **Default ON**; a missing, unreadable, or `"1"` value never disables. Only an explicit `"0"` disables.
- `setEnabled()` applies **synchronously** and persists fire-and-forget (repo pattern). A hydrate read already in flight when the user flips the switch loses the race (`explicitSet` guard).
- The module kicks one cheap hydrate read at import; the shell may `await haptics.hydrate()` for exactness.

### 2b. Anti-spam throttle (no spam by design)
| Gate | Value |
|---|---|
| Global floor — min gap between **any** two feedbacks | **60 ms** |
| `selection` cooldown | 150 ms |
| `impact:light` cooldown | 100 ms |
| `impact:medium` cooldown | 150 ms |
| `impact:heavy` cooldown | 200 ms |
| `notify:*` cooldown (each kind) | 250 ms |

Both gates must pass (per-kind cooldown **and** the global floor). A
**blocked attempt never re-stamps** the window — spam during a cooldown can
never push it forward. A spent slot is spent even if the engine fails (no
refund). Cooldowns key the **public kind**: on Android a `notify("success")`
that vibrates like `impact("light")` does not eat `impact("light")`'s budget.

### 2c. Platform honesty
| Platform | Behavior |
|---|---|
| **iOS** | `selectionAsync` · `impactAsync` · `notificationAsync` (semantic `UINotificationFeedbackType`) |
| **Android** | `selectionAsync` · `impactAsync`; **`notify()` has no native equivalent** (`UINotificationFeedbackType` is iOS-only) → escalates through impacts: `success→light · warning→medium · error→heavy` |
| **Web** | **Full no-op** — the engine is never touched (no `navigator.vibrate`, no Safari switch-hack); timestamps never move |

## 3. Usage map (Round 2 wiring — the LEAD wires; nothing is wired yet)

| Interaction | Call | User-facing context (Arabic labels for the settings seat) |
|---|---|---|
| Tab / segment / filter-wheel change | `haptics.selection()` | تبويب، مقطع، فلتر |
| Primary button press | `haptics.impact("light")` | زر رئيسي (حفظ، إرسال، تسجيل الدخول) |
| Long-press · swipe/drag threshold | `haptics.impact("medium")` | ضغطة مطوّلة، عتبة السحب (إغلاق الورقة) |
| Submit success · exam submitted · grade posted | `haptics.notify("success")` | نجاح الإرسال، تسليم الامتحان، نشر الدرجة |
| Validation error · request failure | `haptics.notify("error")` | خطأ التحقق، فشل الطلب |
| Destructive confirm (logout, delete) | `haptics.notify("warning")` | تأكيد التدمير (تسجيل الخروج، الحذف) |

**Concrete Round-2 wiring points** (read-only findings from this task):
1. **Tab bar** — `src/components/shell/TabBar.tsx` calls `Haptics.impactAsync(Light)` inline on tab switch → replace with `haptics.selection()` (tab change is *selection* semantics, per the map above). The `if (active) return` guard already prevents same-tab spam — keep it.
2. **Buttons** — `src/components/ui/pressables.tsx` (`Button` + `IconButton`) call `Haptics.impactAsync(Light)` inline → replace with `haptics.impact("light")`. This automatically gives every button the kill-switch + throttle (a double-tap submit today fires twice).
3. **Forms (2-e's files)** — validation failure → `haptics.notify("error")`; successful submit → `haptics.notify("success")`.
4. **Exam submit** — `app/student/online-exams/[templateId].tsx` submit flow → `haptics.notify("success")` on accepted, `haptics.notify("error")` on rejection.
5. **Grading** — `app/teacher/grades.tsx` grade posted → `haptics.notify("success")`.
6. **Sheets (2-c's files)** — sheet open → `impact("light")`; drag-to-dismiss past threshold → `impact("medium")` (the throttle makes aggressive drag spam safe).
7. **Settings seat** — add a row in `app/settings.tsx` (قسم «التفاعل»): «ردود اللمس (الاهتزاز)» with مفعّل/معطّل, reading `haptics.isEnabled()` and calling `haptics.setEnabled(...)`. Suggested caption: «اهتزاز خفيف عند التفاعلات الرئيسة — يعمل على الجوال فقط.» (Arabic; web is always a no-op — hide or disable the row there).

## 4. Anti-spam policy (summary for reviewers)

Feedback is a **confirmation**, never a soundtrack. The 60 ms global floor
bounds worst-case density at ~16 events/s even if a screen miswires every
callback; per-kind cooldowns keep repeating interactions (segment wheels,
list taps) individually quiet. If a future screen needs denser feedback
(e.g. a slider), request a **kind review** here rather than bypassing the
module — direct `expo-haptics` imports in screens are the defect this
module exists to prevent (exactly what `TabBar`/`pressables` do today).

## 5. Verification labels (honesty)

| Claim | Label |
|---|---|
| Toggle gate, persistence, race guard, throttle math, platform mapping, failure swallowing | **jest-verified** — `npx jest --no-cache src/haptics` from `apps/mobile`, 24/24 |
| Type safety | **verified** — `npm run typecheck` exit 0 |
| Lint | **verified** — eslint clean on owned files (2 pre-existing warnings elsewhere untouched) |
| Feel/intensity on real Android/iOS hardware | **unverified** — no emulator/device in this sandbox (`/dev/kvm` absent); the Android impact escalation and iOS notification haptics need the owner's device pass on the EAS preview build |
| Web no-op | **jest-verified** at the module boundary (engine never called); RN-web runtime check pending Round 2 (`RN-web-verified` claim to be earned then) |

## 6. Non-goals (this round)

- No screen/component wiring (integration is Round 2 — see §3).
- No new npm deps; no native changes (fingerprint unchanged — JS-only).
- No changes to other agents' modules (`src/motion*`, `ui/sheet*`, `ui/data*`, `ui/states*` untouched and unimported).
