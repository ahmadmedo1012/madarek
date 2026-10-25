# R319 leak rules — §E-10 authenticated leak scan (map for Agent D / gate:r319)

Author: Agent C (LEAKS), Task `c1-C`. Source of truth for the §E-10 gate
extension (`scripts/r319/gate.mjs`): the numeral convention, the
allowlists, the raw-code patterns and the bidi-isolation contract. The
runtime half lives in `frontend/src/utils/display-text.ts` (pure,
string-in/string-out, unit-pinned at `frontend/src/__tests__/r319/display-text.test.ts`
— 20/20) — the gate should IMPORT the same regexes, never re-type them.

The defect line this closes (§B2, owner's real iPhone, student dashboard
header): «مساء النور، J — كلية تقنية المعلومات · قسم اختبار · السنة 8 · r180»
plus «01/15 وينتهي 09/10» and «36% من الفصل».

## 1. The numeral convention: Latin 0-9 EVERYWHERE (decided, with evidence)

ONE numeral system platform-wide, including Arabic prose: **Latin
(Western) digits 0-9**. Mono/technical labels (course codes, `[01]`
indexes, `W09/15`, clocks) are Latin *by the same rule*, not an exception.

Evidence from the codebase (the decision follows the majority):
- `frontend/src/utils/numbers.ts` — `formatNum` pins the locale chain
  `ar-LY-u-nu-latn` with the doc line "ONE number convention
  platform-wide: Latin (Western) digits 0-9" (r197 §7, 15-h P1-3 /
  D16-2). `toWestern` exists solely to fold Arabic-Indic input back to
  Latin.
- `tests/unit/numbers.test.ts` pins "emits Latin digits only — never
  Arabic-Indic (D16-2)".
- `frontend/src/lib/format.ts` — `countAr` renders `` `${n}` `` Latin
  inside Arabic prose («3 كتب», pinned in `tests/unit/format.test.ts`):
  the majority prose shape.
- `formatDate('ar-LY')` renders Arabic month names with Latin digits
  («5 مارس 2026») — ar-LY's CLDR default numbering system IS latn.
- `formatPct` doc: "the digits stay latn (platform numeric convention)".

Gate rule §E-10 "one numeral system": flag any VISIBLE text node that
contains Arabic-Indic (`[\u0660-\u0669]`) or Persian (`[\u06F0-\u06F9]`)
digits. Latin digits are always allowed. Runtime fix:
`oneNumeralSystem()` (display-text.ts).

## 2. Raw codes / ids / junk — never rendered

Patterns to scan VISIBLE text for (regexes exported from
`frontend/src/utils/display-text.ts`):

| Leak | Pattern | Note |
|---|---|---|
| Revision codes | `REVISION_CODE_RE = /\br\d{2,3}\b/g` | `r19`, `r180`, `r305` — repo/seed bookkeeping. 4+ digits (`r3050`) is NOT a code (data-shaped), the letter `r` inside a word is never a code. |
| Stringified junk | exact strings `undefined` / `null` / `NaN` | Bad joins; `sanitizeVisibleText` also maps null/undefined input → `''`. |
| Orphaned joinery | a `·`/`—`/`|`/`•` glyph at a string EDGE | e.g. the photographed tail «… · r180» must not degrade to «… ·». |

Runtime fix: `sanitizeVisibleText()` — strips codes, collapses
whitespace, drops edge joinery, junk → `''`.

## 3. «اختبار» allowlist — a REAL word, not a leak by itself

«اختبار» (exam) is a legitimate Arabic word. It appears in honest exam
copy all over the app («يفتح باب الاختبار», «قاعة الاختبار», exam chips
«اختبار», `EXAM_KIND_LABEL` fallback, D17-1: اختبار, never امتحان).
A gate that flags the bare word would be unusable.

What IS a leak is «اختبار» (or a suffixed form) as an INSTITUTION NAME
value — the seed's placeholder department «قسم اختبار» from the owner's
screenshot. Scan for the specific placeholder NAME shapes:

```
PLACEHOLDER_INSTITUTION_RE = /^(?:(?:كلية|قسم)\s+)?اختبار$/
```

i.e. flag only:
- «قسم اختبار» / «كلية اختبار» (the seed placeholder faculty/department);
- a bare «اختبار» value in a faculty/department NAME slot.

Do NOT flag: «قاعة الاختبار», «اختبار النصفي», «الاختبار النهائي»,
«يفتح باب الاختبار», «أقرب اختبار», exam-kind labels, or the word in
any prose sentence. Recommendation: the gate scans the *rendered text*
of identity/name slots (dashboard header, profile fields) for the two
phrases «قسم اختبار»/«كلية اختبار», and separately scans ALL rendered
text for `REVISION_CODE_RE` + the junk strings (§2).

Runtime fix: `sanitizeInstitutionName()` — sanitizeVisibleText then drop
placeholder shapes to `''` (callers omit the segment entirely; segments
join listwise so no dangling « · » is possible).

## 4. Dates — real `Intl.DateTimeFormat('ar-LY')`, never numeric slash shapes

- Allowed shape: Arabic month names with Latin digits — «1 فبراير»,
  «24 مايو 2026», «الأحد، 15 مارس» (day first: Libya reads d/m).
- FORBIDDEN shape: `{ day: '2-digit', month: '2-digit' }` on ar-LY — it
  renders «01‏/02»: Latin digits in slash order carrying an INVISIBLE
  RLM (U+200F). This is the photographed «01/15 وينتهي 09/10» defect
  (odd order + direction glitch in an Arabic sentence). The gate should
  flag `\d{2}\u200F\/\d{2}` in rendered text.
- Runtime fix: `arDate(iso, opts)` — `Intl.DateTimeFormat('ar-LY')`
  with `calendar: 'gregory'` + `numberingSystem: 'latn'` PINNED so the
  output is deterministic across ICU builds. Applied to the student
  dashboard term dates.
- Allowed compact mono index: the week-ledger day label uses
  `{ day: 'numeric', month: 'numeric' }` inside `.font-mono`
  («15/3», d/m order, aria-hidden decorative index) — mono/technical
  label register, Latin digits, allowed under §1. (Note it too carries
  ICU's RLM; that is ICU's own output, not a hand-rolled direction hack.)

## 5. Bidi-isolation contract — which mixed runs need `<bdi>`

Mechanism: wrap the run in a plain `<bdi>` element in JSX. The UA
stylesheet already applies `unicode-bidi: isolate` — NO css needed (no
`.bdi` class, no wrapper component; `<bdi>{value}</bdi>` is the whole
contract). `dir="ltr"` is added ONLY for mono Latin codes/emails/ids
that must not flip (existing convention: `<bdi dir="ltr" className="font-mono">`).

NEEDS `<bdi>` (digits/Latin inside an Arabic sentence):
- numbers with a trailing symbol: «<bdi>36%</bdi> من الفصل مضى»;
- Latin codes/ids/clocks: «<bdi>CS-201</bdi>», «<bdi>19:00</bdi>»,
  «<bdi>09:00–10:30</bdi>»;
- date phrases inside a sentence: «يبدأ <bdi>1 فبراير</bdi> وينتهي
  <bdi>24 مايو</bdi>»;
- data values that may carry Latin inside Arabic: rooms «— <bdi>قاعة
  A2</bdi>», names, whole due-strings «تسليم <bdi>بعد 3 أيام · 5:00 م</bdi>».

Safe WITHOUT `<bdi>` (a single European-number token between Arabic
words — the bidi algorithm keeps these in flow): «السنة 3»,
«بعد 3 أيام», «المركز 12 من 180», «3 كتب» (countAr output). These are
prose counts, not direction-boundary runs.

Gate rule (§E-10 bidi): for every rendered text node that mixes Arabic
script with a digit+symbol/Latin run of the NEEDS-bdi shapes above,
require the run to sit inside a `<bdi>` (or `[dir]`) ancestor within
the node. Practical scan: flags on
`\d+\s*%` / `[A-Z]{2,}-?\d*` / `\d{1,2}:\d{2}` / `\d{1,2}\s+\S+`-month
runs whose DOM ancestor chain has no BDI/DIR isolation.

## 6. Where the fixes landed (cycle 1)

- `frontend/src/utils/display-text.ts` — the runtime layer (this
  document's §1–§5 as code).
- `frontend/src/pages/student/DashboardPage.tsx` — header identity line
  (sanitized, listwise-joined, year clamped to finite 1..8 int —
  medicine/pharmacy legitimately reach 8), meta line (ar-LY term dates,
  one-numeral percentage, bdi on every mixed run), room + due-string +
  track-progress runs bdi-wrapped. Text nodes only, zero css touched.
- `frontend/src/pages/student/ProfilePage.tsx` — faculty/department
  field values sanitized; «السنة الدراسية» year clamp (junk → «—»).
- `frontend/src/pages/student/PaymentPage.tsx` — faculty FactRow value
  sanitized.
- Hermetic proof: `frontend/tests/e2e/r319-leaks.e2e.ts` (poisoned
  `/me/dashboard` with `departmentName: 'قسم اختبار r180'` — the
  rendered header omits both; standard fixture renders «1 فبراير» /
  «24 مايو» ar-LY term dates).

## 7. Known open items (other agents' lanes)

- The single-letter seed name «J» (and «السنة 8» on a TEST student) are
  SEED-data problems — Agent B (c1-B) owns the Arabic seed corpus; the
  display layer now renders whatever sane data arrives.
- StatLine `hint` props are plain strings by pattern contract
  (`components/patterns/StatLine.tsx`) — their digit runs are the
  bidi-safe count shapes of §5, so no bdi there; if a hint ever needs a
  direction-boundary run, the pattern contract must widen first
  (Cycle-2 shared-shell scope, Agent C2).
- Other roles' pages (teacher/admin/owner) are Cycle 3–4 sweeps; the
  utils are role-agnostic and ready.
