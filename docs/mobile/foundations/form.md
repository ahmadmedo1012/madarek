# Form foundation (R334 — `src/components/ui/form.tsx` + upgraded `fields.tsx`)

## What this gives Round-2 screen owners
- **`FormScreen`** — keyboard-perfect form pattern on `react-native-keyboard-controller`:
  `KeyboardAwareScrollView` body + a bottom-anchored primary action that rides above the keyboard,
  with a `KeyboardToolbar` («التالي» / «السابق» / «تم») and field focus-order registration.
  Async submit gets loading/success/error states and an Arabic error summary.
- **Upgraded `Field` / `SecretField`** (same names, additive props): label + inline Arabic error + helper,
  secure toggle («إظهار»/«إخفاء»), `textContentType`/autoComplete mapping, `returnKeyType` chaining,
  masks (`digits` | `phone` | `username` via `applyFieldMask`), disabled/loading, focus ring from tokens,
  ≥44pt touch height, RTL-correct alignment, errors announced to screen readers.
- **`useFormValidation(schema)`** — zod adapter with Arabic messages (`AR_MESSAGES`, `arabizeIssue`,
  `ar.*`): «هذا الحقل مطلوب»، «بريد إلكتروني غير صالح»، «يجب أن يكون N على الأقل»… with
  `touched`/`onBlur` semantics. Works standalone or with `react-hook-form`.

## Usage (short)
```tsx
import { FormScreen, useFormValidation } from "@/components/ui/form";
import { Field } from "@/components/ui/fields";

<FormScreen
  title="تسجيل الدخول"
  submitLabel="دخول"
  onSubmit={async (evt) => { /* … */ }}
>
  {(field) => (
    <>
      <Field {...field("email", { purpose: "email" })} label="البريد الإلكتروني" required />
      <Field {...field("password", { purpose: "password" })} label="كلمة المرور" secure required />
    </>
  )}
</FormScreen>
```

## Round-2 migration map (priority)
1. `app/auth/login.tsx`, `register.tsx`, `forgot-password.tsx`, `reset-password.tsx` — first adopters.
2. `app/(modals)/report.tsx` (→ sheet + FormScreen combo), filters sheets.
3. Assistant composer + messages composer (keyboard toolbar matters most there).

## Verification
- `npm run typecheck` → exit 0 (all 47 existing `ui/fields` consumers compile unchanged) **[typecheck-verified]**
- `npx jest --no-cache --runInBand fields.test.tsx form.test.tsx` → 23/23 **[jest-verified]**
- Device keyboard behavior: **unverified** (no emulator in sandbox — owner verifies on EAS preview builds).
