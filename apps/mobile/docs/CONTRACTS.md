# Mobile implementation contracts (READ FIRST — for implementation agents)

This app is Arabic-first RTL, Heron-designed, wired to `https://madarek.onrender.com/api/v1`.
You own ONLY the files listed for you. Shared files are FROZEN — never edit anything under
`src/components/ui/**`, `src/components/shell/**`, `src/design/**`, `src/api/client.ts`,
`src/api/types.ts`, `src/auth/session.ts`, `src/lib/**`, `src/hooks/useNotifications.ts`,
`app/_layout.tsx`, or any `_layout.tsx` / `app/index.tsx` / `app/auth/**` / `app/settings.tsx`
/ `app/search.tsx` / `app/select-institution.tsx`. If a primitive is missing, build it locally
inside your own `src/features/<area>/components.tsx`.

## Hard rules

1. **RTL:** layouts must use logical flow. The app forces RTL: `flexDirection:"row"` starts at the
   right edge automatically. Use `start/end` (not left/right) for absolute positions; `paddingStart/End`,
   `marginStart/End` for asymmetry. Back arrows are `ArrowRight`. Never hardcode `left:` for sheet buttons.
2. **Digits:** every number rendered by users must go through `latn()`/`num()`/`pct()`/`dateTime()`/etc.
   from `@/lib/format` (Western glyphs, Africa/Tripoli).
3. **States:** every data screen must render SkeletonList while loading, EmptyState when empty,
   ErrorState with retry on failure — all from `@/components/ui`.
4. **Data:** TanStack Query with `useInstitutionScope()` appended to query keys for institution-scoped
   data: `useQuery({queryKey: ["me","dashboard", scope], ...})`. Mutations invalidate the keys they touch.
5. **API:** import from `@/api/client`: `get`, `post`, `patch`, `put`, `del`, `getPage`, `ApiError`.
   Response shapes: success `{data}` (paginated: `{data:[], meta:{page,limit,total,totalPages,unread?}}` —
   use `getPage`), error `{error:{code,message}}` → thrown as `ApiError` with an Arabic `.message`.
   Auth/refresh is fully handled by the client — never attach tokens manually.
6. **Types:** shared domain types live in `@/api/types` — import them; add area-specific types in your own
   `src/api/<family>.ts` (which you own) next to the endpoint functions.
7. **Honesty:** preserve «محاكاة» badges (`SimulatedBadge`) and «قيد التطوير» disclosures exactly where
   the web app has them. Never claim a feature works if the API says otherwise. Show the AI provider
   badge verbatim (`local` → disclose template composer).
8. **Touch floors:** ≥44px on all pressables; use `Card onPress`/`LedgerRow onPress`/`Button`/`IconButton`.
9. **Accessibility:** every pressable has `accessibilityRole` + `accessibilityLabel`; images have labels.
10. **Colors:** ONLY via `usePalette()`/`useTheme()`/`useStatusTones()`. NEVER hardcode hex except
    documented brand constants. Status mapping: PRESENT=mint, LATE=yellow, ABSENT=rose, EXCUSED=sky;
    notifications URGENT=rose, ACADEMIC=sky, SOCIAL=lavender, SYSTEM=grey (use `toneForNotificationType`).
11. **Icons:** `lucide-react-native` ONLY (import { X } from "lucide-react-native"), size 18–22 for rows.
12. **Radius 0. No shadows. No gradients.** Square corners everywhere; `radius.full` only for avatars/circles.
13. **Fonts:** use `<T variant weight>` from `@/components/ui/text` — never set fontFamily manually except
    through the provided components. Mono drafting labels via `MonoLabel`.
14. **Deep links:** routes mirror web paths (e.g. `/student/courses/:id`, `/teacher/exams/:templateId`).
    Navigate with typed `router.push` using the exact paths in your route list below.

## UI kit quick reference (`@/components/ui`)

- `T variant weight color align` — text (variants: display h1 h2 h3 h4 bodyLg body sm xs mono monoSm).
- `Screen scroll padded` — page frame (auto safe areas); `FormScreen` for auth-style centered layouts.
- `PageHeader title kicker mono compact right` — page title bar; `SectionBar index title action` — [01] sections.
- `Button label kind onPress loading disabled small icon` — kinds: primary charcoal / accent orange / ghost hairline / danger.
- `IconButton children onPress label tone` — 44px square icon pressable.
- `Card onPress style` + `Hairline` + `Badge label tone` + `SimulatedBadge` + `Sheet` + `ConfirmDialog` + `OptionSheet`.
- `Field label value onChangeText error hint` + `SecretField` + `SelectField` (opens OptionSheet) + `SearchBar` + `Segmented`.
- `StatLine label value hint tone` + `KpiCard label value suffix tone` + `ProgressBar ratio accent label` + `Avatar initials color size`.
- `RowList` + `LedgerRow onPress last` — bordered ledgers; `RowList > LedgerRow` for lists.
- `SkeletonList rows` + `EmptyState title message actionLabel onAction icon` + `ErrorState message onRetry compact` + `LoadingScreen` + `OfflineBanner visible`.
- `toast.info/success/error(message, title?)` — global feedback.
- `BrandMark size` — logo geometry.
- `StackHeader title kicker right onBack` (from `@/components/shell/AppTopBar`) — back header for pushed screens.
- `AppTopBar alertsPath` (from `@/components/shell/AppTopBar`) — top chrome on TAB screens (dashboard of your role).
- `Markdown source` — minimal markdown renderer (training lessons).
- Session: `useSession` from `@/auth/session` — `user` (AuthUser), role/memberships/currentInstitution;
  labels: `ROLE_LABELS`, `POSITION_LABELS`, `RANK_LABELS`.

## Component examples (copy these patterns)

```tsx
const scope = useInstitutionScope();
const qc = useQueryClient();
const feed = useQuery({
  queryKey: ["exams","me", scope],
  queryFn: () => get<ExamRow[]>("/exams/me"),
  placeholderData: (p) => p,
});
if (feed.isLoading) return <Screen scroll><SkeletonList rows={5}/></Screen>;
if (feed.isError) return <Screen scroll><ErrorState message={(feed.error as Error).message} onRetry={() => feed.refetch()}/></Screen>;
return <Screen scroll>… {rows.map(r => <LedgerRow key={r.id} onPress={…}>…</LedgerRow>)} …</Screen>;
```

```tsx
const m = useMutation({
  mutationFn: (payload: X) => post<Y>("/path", payload),
  onSuccess: () => { qc.invalidateQueries({queryKey: ["family"]}); toast.success("تم الحفظ."); },
  onError: (e) => toast.error((e as ApiError).message),
});
```

## Query conventions

- Institution-scoped keys end with the scope: `["me","matrix", scope]`.
- Paginated feeds: page state + `placeholderData: (prev) => prev` + `getPage<T>(path, {page, limit})`.
- Polls: `refetchInterval` (30s live sessions; 15s owner realtime — match the web numbers).
- Invalidate precisely (e.g. after checkpoint answer: `["me","gaps", scope]` + `["me","matrix", scope]`).

## API notes that matter to you

- Access token expires in 15 min — refresh is automatic; a hard 401 signs the user out.
- 403 `INSTITUTION_CONTEXT_REQUIRED` until an institution is chosen — gates handle it before your screens.
- Body limit 1MB for JSON; PDFs go ONLY through the raw-bytes contract (`application/pdf`, ≤20MB,
  `%PDF-` magic) — use `src/api/pdf.ts` helpers (`pickAndUploadPdf`, `downloadAuthenticated`).
- Uploads POST /files/papers rate limit: 10/min. AI chat: 20/min + daily quota (429 → Arabic quota message).
- `sizeBytes` arrives as a STRING (BigInt) — format via `sizeLabel()`.

## File-route map conventions

- Every pushed screen: `Screen` (or custom) + `StackHeader title` at top inside the body — headers are
  content, not native nav bars (headerShown:false everywhere).
- Tab screens (files inside `(tabs)/`): start with `AppTopBar alertsPath=…` (import from `@/components/shell/AppTopBar`)
  then the scrollable body. `alertsPath`: STUDENT `/student/alerts`, TEACHER `/teacher/alerts`,
  ADMIN `/admin/alerts`, QUALITY `/quality/alerts`, OWNER `/owner/alerts`.
- `useLocalSearchParams<{...}>()` for params; `router.push({pathname: "/…", params: {...}})` or `router.push("/path" as never)`.
- typedRoutes may complain on dynamic strings — cast `as never` where needed.

## Verification before you finish

Run `cd /home/z/madarek/apps/mobile && npx tsc --noEmit` — your work must typecheck clean.
Do NOT run expo start/export (the coordinator owns build verification). Do NOT commit — the
coordinator integrates and commits. Report which files you created and any contract mismatches you found.
