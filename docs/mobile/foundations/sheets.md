# Sheets foundation (R334 2-c) — AppSheet + toast queue

Branch `r334/sheets`. Commits: `4095b9e` (AppSheet on `@gorhom/bottom-sheet` v5 + toast queue), `8be0817` (lazy native-graph load), `a6466f8` (RNTL nets).

AppSheet is the Heron bottom sheet for the mobile app: one engine, snap
presets, keyboard-aware inputs, RTL/Arabic-first, themed from the design
tokens, safe-area aware, reduced-motion fast path. The legacy RN-`Modal`
overlays (`Sheet` / `ConfirmDialog` / `OptionSheet` in `ui/surfaces.tsx`)
stay untouched — Round 2 migrates consumers onto AppSheet (map below).

## AppSheet — `src/components/ui/sheet.tsx`

```tsx
import { AppSheet, SheetTextInput } from "@/components/ui/sheet";

const [open, setOpen] = useState(false);

<AppSheet
  open={open}
  onClose={() => setOpen(false)}
  title="عنوان الورقة"
  snap="md"          // sm 40% · md 60% · lg 85% · full 96% من الشاشة
  dynamic            // ارتفاع المحتوى بحد أقصى «snap» (الافتراضي)
  scrollable={false} // true → BottomSheetScrollView + تذييل مثبّت
  footer={<Button label="حفظ" onPress={save} />}
>
  <SheetTextInput placeholder="اكتب هنا…" value={text} onChangeText={setText} />
</AppSheet>
```

| Prop | Default | What it does |
|---|---|---|
| `open` / `onClose` | — | Controlled present/dismiss; pan-down/backdrop/Android-back all funnel to `onClose`. |
| `title` | — | Header (h4) + `accessibilityLabel` on the sheet. |
| `snap` | `"md"` | `"sm" \| "md" \| "lg" \| "full"` fraction, or raw snap points `["40%","85%"]` (used when `dynamic={false}`). |
| `dynamic` | `true` | Content-sized, capped at the snap fraction (`maxDynamicContentSize`). |
| `scrollable` | `false` | `BottomSheetScrollView` body + `footerComponent` pinned under it. |
| `footer` | — | Rendered under the body (non-scroll: in-flow; scroll: sticky slot). |
| `showHandle` / `closable` / `closeOnBackdrop` | `true` | Drag handle · «إغلاق» header button · backdrop tap-to-close. |
| `durationMs` | `motion.durationNav` (240ms; 90ms مع تقليل الحركة) | Tunable present/dismiss duration (`SHEET_ANIMATION` exports the defaults). |

Keyboard: `keyboardBehavior="interactive"` + `keyboardBlurBehavior="restore"`
+ `android_keyboardInputMode="adjustResize"` — the sheet tracks the focused
field. **Inputs inside a sheet body must be `SheetTextInput`** (wraps
`BottomSheetTextInput`); a bare `TextInput` ignores the sheet's tracking.
RTL: rows are `flexDirection: "row"` (RTL-flipped by I18nManager), text
inputs are `textAlign: "right"`, the check mark in PickerSheet ends the row.

### Presets

```tsx
<ConfirmSheet open={del} onClose={close} title="حذف الإشعار"
  message="لا يمكن التراجع عن هذا الإجراء." confirmLabel="حذف" destructive
  onConfirm={doDelete} loading={busy} />

<ActionSheet open={act} onClose={close} title="إجراءات المقرر"
  actions={[
    { label: "مشاركة", onPress: share, icon: <ShareIcon /> },
    { label: "حذف", onPress: remove, destructive: true },
  ]} />

<FilterSheet open={flt} onClose={close} onApply={apply} onReset={reset}>
  {/* checkboxes / segmented controls */}
</FilterSheet>

<PickerSheet open={pk} onClose={close} title="اختر التخصص"
  options={[{ id: "cs", label: "علوم الحاسب", sub: "الكلية الأولى" }]}
  selectedId={sel} onSelect={setSel} loading={loading} />
```

- **ConfirmSheet** — «تأكيد»/«إلغاء», `destructive` → danger button, `loading` holds it.
- **ActionSheet** — icon+label rows over hairlines, «إلغاء» underneath; an action closes then runs.
- **FilterSheet** — `snap="lg"` fixed + scrollable + sticky «تطبيق»/«إعادة تعيين» footer.
- **PickerSheet** — single-select rows, `accessibilityState.selected`, check mark, honest «جارٍ التحميل…»/«لا توجد خيارات».

## Toast queue — `src/components/ui/toast.tsx`

Every R326 export and call signature is preserved — all 44 consumers
(`toast.info/success/error(message, title?)`) compile and run unchanged.
New, additive:

- Queue: **max 1 toast visible**, the rest wait (`MAX_QUEUE = 4`); each shows for
  its own `TOAST_DURATION_MS` (4200ms) or a custom third-arg duration.
- `toast.warning(message, title?, duration?)` — yellow tone variant.
- `toast.hide()` / `toast.hideAll()` — manual dismiss (tap-to-dismiss on the host too).
- `toast.onShow(cb)` — slot fired when a toast becomes visible; **the haptics
  branch (2-b) wires here** — this module never imports `src/haptics`.

## Test coverage + honesty labels (jest only, no emulator)

`sheet.test.tsx` (9) + `toast.test.tsx` (7), both green under
`npx jest --no-cache --runInBand`:

- Proven: controlled open/onClose wiring, preset Arabic copy («إغلاق», «تأكيد»,
  «إلغاء», «تطبيق», «إعادة تعيين», «جارٍ التحميل…», «لا توجد خيارات»),
  a11y marks (labels, `accessibilityState.selected`), select-then-close,
  queue max-1-visible/takeover/hide/hideAll/warning/onShow/bounded burst.
- **Jest mock, documented in the test header**: `@gorhom/bottom-sheet` is faked
  per-file — the real v5 engine cannot boot under the repo's reanimated jest
  mock (`makeMutable` is identity → `layoutState.get(...)` crashes in
  `useAnimatedDetents`); `react-native-gesture-handler` v3 schedules a native
  `installUIRuntimeBindings` task at import that crashes jest. The fakes
  reproduce exactly the ref-driven present/dismiss surface AppSheet uses.
- **Device-only (unverified without emulator)**: pixel snap positions, gesture
  tracking, keyboard tracking, portal layering, real haptics.

## Lazy native graph (why `require()` inside the component)

`ui/index.ts` re-exports `./sheet`, and every screen imports the barrel — a
static import put bottom-sheet → RNGH v3 into every screen's module graph, and
RNGH's import-time native install killed `src/test/render-net.test.tsx`
(admin dashboard route, 112/113 vs 113/113 at base). Since `8be0817` the
packages load on the **first AppSheet render** (Metro bundles the requires
statically; only execution is deferred). No consumer shipped yet, so this is
invisible on device today.

## Round-2 migration map (consumers → AppSheet)

| Surface today | File(s) | Migrate to |
|---|---|---|
| Report-a-problem modal route | `app/(modals)/report.tsx` + `src/features/feedback/ReportProblem.tsx` | Inline `AppSheet` `snap="lg"` `dynamic={false}` `scrollable` + `SheetTextInput` for the message (keyboard-aware, unlike the current modal). |
| Course/report filters | `app/admin/(tabs)/reports.tsx`, `app/teacher/exams.tsx` (تصفية) | `FilterSheet` («تطبيق»/«إعادة تعيين» sticky footer). |
| Exam question navigator | `app/student/online-exams/[templateId].tsx`, `app/quality/exam-moderation.tsx` | `AppSheet` `snap="lg"` `scrollable` — question grid + progress, `footer` = «انتقال إلى السؤال». |
| Pickers (`OptionSheet`, RN-Modal) | `src/components/ui/surfaces.tsx` via `src/components/ui/fields.tsx` (+ ~20 screens: users, invites, faculties, research, labs, social, lectures…) | `PickerSheet` — near drop-in (`options`/`selectedId`/`onSelect`/`loading`/`emptyLabel` identical; adds the check mark + selected state). |
| Confirm dialogs (`ConfirmDialog`) | same surfaces.tsx consumers | `ConfirmSheet` — note the rename: `onCancel` → `onClose`. |
| Share actions | `app/document/[filename].tsx`, `app/competitions/[id].tsx`, `src/features/common/components.tsx` | `ActionSheet` («مشاركة الرابط»/«نسخ»/«حفظ في الملفات»). |

Migration rule: mount the sheet at the ROOT of its screen (sibling of screen
content) so the hosting container covers the full screen; never inside a
card/row.

## Lead follow-ups (outside this branch's ownership)

1. Hoist `BottomSheetModalProvider` + `GestureHandlerRootView` to
   `app/_layout.tsx` (then drop the per-sheet local providers in sheet.tsx).
2. Haptics (2-b): `toast.onShow((t) => hapticsForToast(t.kind))`.
3. Optional: add RNGH's official `jestSetup` to `src/test/setup.ts` if a
   future test needs the REAL gesture stack.
